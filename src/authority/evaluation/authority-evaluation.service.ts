import { Injectable } from '@nestjs/common';
import {
  AppointmentStatus,
  AuthorityEvaluationResult,
  AuthorityFunctionStatus,
  AuthorityGoverningSourceStatus,
  AuthorityRevalidationState,
  DelegationStatus,
  Prisma,
  SecurityAuditEventType,
} from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { isAppointmentCurrent } from '../../government/common/appointment-current.util';
import { AuthorityAuditService } from '../audit/authority-audit.service';
import {
  AUTHORITY_ENGINE_VERSION,
  AUTHORITY_RULESET_VERSION,
  AuthorityReasonCode,
} from '../common/authority.constants';
import {
  AuthorityEvaluationRequest,
  ConditionEvaluation,
  DependencyOutcome,
  EffectiveAuthorityState,
  EvaluationReplaySnapshot,
  GoverningSourceReference,
} from '../common/authority.types';
import { isDelegationCurrent } from '../common/delegation-current.util';
import { sanitizeContextReference,sanitizeEvaluationData } from '../common/sanitize-evaluation-data.util';
import { AuthorityEvaluationRecordRepository } from './authority-evaluation-record.repository';

interface SafeHaltAssessment {
  safeHalt: boolean;
  reasonCodes: AuthorityReasonCode[];
  conditionsEvaluated: ConditionEvaluation[];
  dependencyOutcomes: DependencyOutcome[];
  effectiveAuthorityState: EffectiveAuthorityState;
  governingSourceRefs: GoverningSourceReference[];
}
import { Injectable, NotFoundException } from '@nestjs/common';
import {
  AuthorityActionType,
  AuthorityClassification,
  AuthorityDependencyBlockingStatus,
  AuthorityDependencyType,
  AuthorityEvaluationOutcome,
  FunctionAssignmentStatus,
  FunctionAuthorityLifecycleStatus,
  GoverningSourceRelationshipType,
  GoverningSourceStatus,
  IdentityType,
  Prisma,
} from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { AUTHORITY_EVALUATION_EXPLANATION_CODES } from '../authority.constants';
import { type AuthorityExplanationCode } from '../authority.constants';
import { hashEvaluationRequest } from '../common/authority-hash.util';
import { isEffectiveAt } from '../common/effective-period.util';
import { AuthorityConditionEvaluator } from '../conditions/authority-condition-evaluator.service';
import { AuthorityDependencyEvaluator } from '../dependencies/authority-dependency-evaluator.service';
import { AuthorityExplanationService } from '../explanation/authority-explanation.service';
import { InstitutionalActorResolver } from '../institutional-actor/institutional-actor-resolver.service';
import { deriveEvaluationStatus } from '../policy/derive-evaluation-status.util';
import { SegregationOfDutyEvaluator } from '../sod/segregation-of-duty-evaluator.service';
import { type AuthorityEvaluationRequest } from './authority-evaluation.types';
import { AuthorityEvaluationResponseDto } from './dto/authority-evaluation-response.dto';

@Injectable()
export class AuthorityEvaluationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly records: AuthorityEvaluationRecordRepository,
    private readonly audit: AuthorityAuditService,
  ) {}

  async evaluate(request: AuthorityEvaluationRequest): Promise<{
    recordId: string;
    result: AuthorityEvaluationResult;
    reasonCodes: AuthorityReasonCode[];
    evaluatedAt: Date;
  }> {
    const evaluatedAt = request.evaluatedAt ?? new Date();
    const assessment = await this.assess(request, evaluatedAt);

    const functionRecord = await this.prisma.authorityFunction.findUnique({
      where: { code: request.functionCode },
    });

    if (!functionRecord) {
      throw new Error(`Function "${request.functionCode}" not found during evaluation persistence`);
    }

    const replaySnapshot: EvaluationReplaySnapshot = sanitizeEvaluationData({
      evaluatedAt: evaluatedAt.toISOString(),
      actorIdentityId: request.actorIdentityId ?? null,
      officeholderId: request.officeholderId ?? null,
      functionId: functionRecord.id,
      functionCode: request.functionCode,
      requestedAction: request.requestedAction,
      assignmentId: request.assignmentId ?? null,
      appointmentId: request.appointmentId ?? null,
      delegationId: request.delegationId ?? null,
      governingSourceRefs: assessment.governingSourceRefs,
      conditionsEvaluated: assessment.conditionsEvaluated,
      dependencyOutcomes: assessment.dependencyOutcomes,
      effectiveAuthorityState: assessment.effectiveAuthorityState,
      reasonCodes: assessment.reasonCodes,
      result: assessment.safeHalt
        ? AuthorityEvaluationResult.SAFE_HALT
        : assessment.reasonCodes.includes(AuthorityReasonCode.ALL_CONDITIONS_SATISFIED)
          ? AuthorityEvaluationResult.ALLOWED
          : AuthorityEvaluationResult.NOT_AUTHORIZED,
      engineVersion: AUTHORITY_ENGINE_VERSION,
      rulesetVersion: AUTHORITY_RULESET_VERSION,
    });

    const result = replaySnapshot.result;

    const record = await this.records.create({
      evaluatedAt,
      actorIdentityId: request.actorIdentityId,
      officeholderId: request.officeholderId,
      function: { connect: { id: functionRecord.id } },
      requestedAction: request.requestedAction,
      result,
      reasonCodes: assessment.reasonCodes,
      governingSourceRefs: assessment.governingSourceRefs as unknown as Prisma.InputJsonValue,
      assignment: request.assignmentId ? { connect: { id: request.assignmentId } } : undefined,
      appointmentId: request.appointmentId,
      delegationId: request.delegationId,
      conditionsEvaluated: assessment.conditionsEvaluated as unknown as Prisma.InputJsonValue,
      dependencyOutcomes: assessment.dependencyOutcomes as unknown as Prisma.InputJsonValue,
      effectiveAuthorityState: assessment.effectiveAuthorityState as unknown as Prisma.InputJsonValue,
      engineVersion: AUTHORITY_ENGINE_VERSION,
      rulesetVersion: AUTHORITY_RULESET_VERSION,
      correlationId: request.correlationId,
      contextReference: request.contextReference
        ? sanitizeContextReference(request.contextReference)
        : undefined,
      revalidationState: assessment.effectiveAuthorityState.assignmentRevalidationState,
      replaySnapshot: replaySnapshot as unknown as Prisma.InputJsonValue,
    });

    await this.audit.record({
      eventType:
        result === AuthorityEvaluationResult.SAFE_HALT
          ? SecurityAuditEventType.AUTHORITY_SAFE_HALT_TRIGGERED
          : SecurityAuditEventType.AUTHORITY_EVALUATION_PERFORMED,
      actorIdentityId: request.actorIdentityId,
      metadata: sanitizeEvaluationData({
        evaluationId: record.id,
        functionCode: request.functionCode,
        requestedAction: request.requestedAction,
        result,
        reasonCodes: assessment.reasonCodes,
        correlationId: request.correlationId,
      }),
    });

    return {
      recordId: record.id,
      result,
      reasonCodes: assessment.reasonCodes,
      evaluatedAt,
    };
  }

  private async assess(
    request: AuthorityEvaluationRequest,
    evaluatedAt: Date,
  ): Promise<SafeHaltAssessment> {
    const reasonCodes: AuthorityReasonCode[] = [];
    const conditionsEvaluated: ConditionEvaluation[] = [];
    const dependencyOutcomes: DependencyOutcome[] = [];
    let safeHalt = false;

    const functionRecord = await this.prisma.authorityFunction.findUnique({
      where: { code: request.functionCode },
    });

    if (!functionRecord) {
      return this.haltAssessment(reasonCodes, conditionsEvaluated, dependencyOutcomes, {
        functionStatus: 'NOT_FOUND',
        assignmentRevalidationState: AuthorityRevalidationState.REQUIRES_REVALIDATION,
        appointmentCurrent: null,
        delegationCurrent: null,
        governingSourcesAuthenticated: false,
      }, [], [AuthorityReasonCode.FUNCTION_NOT_FOUND], true);
    }

    if (functionRecord.status === AuthorityFunctionStatus.SUSPENDED) {
      safeHalt = true;
      reasonCodes.push(AuthorityReasonCode.FUNCTION_SUSPENDED);
      conditionsEvaluated.push({
        code: 'FUNCTION_ACTIVE',
        description: 'Function must not be suspended',
        satisfied: false,
      });
    } else if (functionRecord.status !== AuthorityFunctionStatus.ACTIVE) {
      reasonCodes.push(AuthorityReasonCode.FUNCTION_NOT_ACTIVE);
      conditionsEvaluated.push({
        code: 'FUNCTION_ACTIVE',
        description: 'Function must be active',
        satisfied: false,
      });
    } else {
      conditionsEvaluated.push({
        code: 'FUNCTION_ACTIVE',
        description: 'Function must be active',
        satisfied: true,
      });
    }

    const assignment = request.assignmentId
      ? await this.prisma.authorityAssignment.findUnique({
          where: { id: request.assignmentId },
          include: { governingSource: true },
        })
      : await this.prisma.authorityAssignment.findFirst({
          where: {
            functionId: functionRecord.id,
            officeholderId: request.officeholderId ?? undefined,
          },
          include: { governingSource: true },
        });

    const governingSourceRefs: GoverningSourceReference[] = [];
    let governingSourcesAuthenticated = true;

    if (!assignment) {
      reasonCodes.push(AuthorityReasonCode.ASSIGNMENT_NOT_FOUND);
      conditionsEvaluated.push({
        code: 'ASSIGNMENT_PRESENT',
        description: 'An authority assignment must exist',
        satisfied: false,
      });
    } else {
      conditionsEvaluated.push({
        code: 'ASSIGNMENT_PRESENT',
        description: 'An authority assignment must exist',
        satisfied: true,
      });

      if (assignment.revalidationState === AuthorityRevalidationState.REQUIRES_REVALIDATION) {
        reasonCodes.push(AuthorityReasonCode.ASSIGNMENT_REQUIRES_REVALIDATION);
      }

      const source = assignment.governingSource;
      governingSourceRefs.push({
        sourceId: source.id,
        code: source.code,
        version: source.version,
        status: source.status,
        isControlling: source.isControlling,
      });

      if (!source.authenticatedAt) {
        safeHalt = true;
        governingSourcesAuthenticated = false;
        reasonCodes.push(AuthorityReasonCode.SOURCE_NOT_AUTHENTICATED);
      }

      if (source.status === AuthorityGoverningSourceStatus.REVOKED) {
        safeHalt = true;
        reasonCodes.push(AuthorityReasonCode.SOURCE_REVOKED);
      }

      if (source.status === AuthorityGoverningSourceStatus.AMENDED) {
        safeHalt = true;
        reasonCodes.push(AuthorityReasonCode.SOURCE_AMENDMENT_NOT_IMPLEMENTED);
      }

      const conflictingSources = await this.prisma.authorityGoverningSource.count({
        where: {
          code: source.code,
          isControlling: true,
          status: AuthorityGoverningSourceStatus.ACTIVE,
          id: { not: source.id },
        },
      });

      if (conflictingSources > 0) {
        safeHalt = true;
        reasonCodes.push(AuthorityReasonCode.SOURCE_CONFLICT);
      }

      if (source.isControlling && source.status === AuthorityGoverningSourceStatus.SUPERSEDED) {
        safeHalt = true;
        reasonCodes.push(AuthorityReasonCode.NATIONAL_AUTHORITY_SUBSTITUTION);
      }
    }

    let appointmentCurrent: boolean | null = null;
    if (request.appointmentId) {
      const appointment = await this.prisma.appointment.findUnique({
        where: { id: request.appointmentId },
      });

      if (!appointment) {
        safeHalt = true;
        reasonCodes.push(AuthorityReasonCode.APPOINTMENT_MISSING);
        appointmentCurrent = false;
      } else if (
        appointment.status === AppointmentStatus.REVOKED ||
        appointment.status === AppointmentStatus.ENDED
      ) {
        safeHalt = true;
        reasonCodes.push(AuthorityReasonCode.APPOINTMENT_REVOKED);
        appointmentCurrent = false;
      } else if (!isAppointmentCurrent(appointment, evaluatedAt)) {
        safeHalt = true;
        reasonCodes.push(
          appointment.effectiveUntil && appointment.effectiveUntil <= evaluatedAt
            ? AuthorityReasonCode.APPOINTMENT_EXPIRED
            : AuthorityReasonCode.APPOINTMENT_NOT_CURRENT,
        );
        appointmentCurrent = false;
      } else {
        appointmentCurrent = true;
      }

      conditionsEvaluated.push({
        code: 'APPOINTMENT_CURRENT',
        description: 'Appointment must be current at evaluation time',
        satisfied: appointmentCurrent,
      });
    }

    let delegationCurrent: boolean | null = null;
    if (request.delegationId) {
      const delegation = await this.prisma.delegation.findUnique({
        where: { id: request.delegationId },
      });

      if (!delegation) {
        safeHalt = true;
        reasonCodes.push(AuthorityReasonCode.DELEGATION_MISSING);
        delegationCurrent = false;
      } else if (
        delegation.status === DelegationStatus.REVOKED ||
        delegation.status === DelegationStatus.ENDED
      ) {
        safeHalt = true;
        reasonCodes.push(AuthorityReasonCode.DELEGATION_REVOKED);
        delegationCurrent = false;
      } else if (!isDelegationCurrent(delegation, evaluatedAt)) {
        safeHalt = true;
        reasonCodes.push(
          delegation.effectiveUntil && delegation.effectiveUntil <= evaluatedAt
            ? AuthorityReasonCode.DELEGATION_EXPIRED
            : AuthorityReasonCode.DELEGATION_NOT_CURRENT,
        );
        delegationCurrent = false;
      } else {
        delegationCurrent = true;
      }

      conditionsEvaluated.push({
        code: 'DELEGATION_CURRENT',
        description: 'Delegation must be current at evaluation time',
        satisfied: delegationCurrent,
      });
    }

    const mandatoryDependency = {
      code: 'PROFESSIONAL_DEPENDENCY',
      description: 'Mandatory professional dependency must be satisfied',
      mandatory: true,
    };

    const dependencySatisfied = assignment !== null && governingSourcesAuthenticated && !safeHalt;
    dependencyOutcomes.push({
      ...mandatoryDependency,
      satisfied: dependencySatisfied,
    });

    if (!dependencySatisfied && assignment) {
      safeHalt = true;
      reasonCodes.push(AuthorityReasonCode.MANDATORY_DEPENDENCY_MISSING);
    }

    if (request.officeholderId && request.actorIdentityId) {
      const link = await this.prisma.identityOfficeholderLink.findFirst({
        where: {
          identityId: request.actorIdentityId,
          officeholderId: request.officeholderId,
          status: 'ACTIVE',
        },
      });

      if (!link) {
        reasonCodes.push(AuthorityReasonCode.OFFICEHOLDER_NOT_LINKED);
        conditionsEvaluated.push({
          code: 'OFFICEHOLDER_LINKED',
          description: 'Actor must be linked to officeholder',
          satisfied: false,
        });
      } else {
        conditionsEvaluated.push({
          code: 'OFFICEHOLDER_LINKED',
          description: 'Actor must be linked to officeholder',
          satisfied: true,
        });
      }
    }

    const effectiveAuthorityState: EffectiveAuthorityState = {
      functionStatus: functionRecord.status,
      assignmentRevalidationState:
        assignment?.revalidationState ?? AuthorityRevalidationState.REQUIRES_REVALIDATION,
      appointmentCurrent,
      delegationCurrent,
      governingSourcesAuthenticated,
    };

    if (safeHalt) {
      if (!reasonCodes.includes(AuthorityReasonCode.UNAUTHORIZED_OFFICIAL_ACT)) {
        reasonCodes.push(AuthorityReasonCode.UNAUTHORIZED_OFFICIAL_ACT);
      }
      return this.haltAssessment(
        reasonCodes,
        conditionsEvaluated,
        dependencyOutcomes,
        effectiveAuthorityState,
        governingSourceRefs,
        reasonCodes,
        true,
      );
    }

    const blockingReasons = reasonCodes.filter(
      (code) => code !== AuthorityReasonCode.ALL_CONDITIONS_SATISFIED,
    );

    if (blockingReasons.length === 0) {
      reasonCodes.push(AuthorityReasonCode.ALL_CONDITIONS_SATISFIED);
    }

    return {
      safeHalt: false,
      reasonCodes,
      conditionsEvaluated,
      dependencyOutcomes,
      effectiveAuthorityState,
      governingSourceRefs,
    };
  }

  private haltAssessment(
    reasonCodes: AuthorityReasonCode[],
    conditionsEvaluated: ConditionEvaluation[],
    dependencyOutcomes: DependencyOutcome[],
    effectiveAuthorityState: EffectiveAuthorityState,
    governingSourceRefs: GoverningSourceReference[],
    codes: AuthorityReasonCode[],
    safeHalt: boolean,
  ): SafeHaltAssessment {
    return {
      safeHalt,
      reasonCodes: [...new Set([...reasonCodes, ...codes])],
      conditionsEvaluated,
      dependencyOutcomes,
      effectiveAuthorityState,
      governingSourceRefs,
    };
    private readonly actorResolver: InstitutionalActorResolver,
    private readonly conditionEvaluator: AuthorityConditionEvaluator,
    private readonly dependencyEvaluator: AuthorityDependencyEvaluator,
    private readonly sodEvaluator: SegregationOfDutyEvaluator,
    private readonly explanationService: AuthorityExplanationService,
  ) {}

  async evaluate(request: AuthorityEvaluationRequest): Promise<AuthorityEvaluationResponseDto> {
    const at = request.at ?? new Date();
    const codes: AuthorityExplanationCode[] = [];

    const functionRecord = await this.prisma.functionAuthorityRecord.findUnique({
      where: { id: request.functionAuthorityRecordId },
      include: {
        governingSources: {
          include: {
            governingSource: {
              include: { outgoingRelationships: true },
            },
          },
        },
        assignments: true,
        actionRights: true,
        conditions: true,
        dependencies: true,
        sodRules: true,
      },
    });

    if (!functionRecord) {
      throw new NotFoundException(
        `FunctionAuthorityRecord "${request.functionAuthorityRecordId}" was not found`,
      );
    }

    if (functionRecord.classification === AuthorityClassification.PROHIBITED_OR_UNAUTHORIZED) {
      codes.push(AUTHORITY_EVALUATION_EXPLANATION_CODES.PROHIBITED_FUNCTION);
      return this.finalize(request, codes, AuthorityEvaluationOutcome.DENY, null, at);
    }

    if (functionRecord.lifecycleStatus === FunctionAuthorityLifecycleStatus.SUSPENDED) {
      codes.push(AUTHORITY_EVALUATION_EXPLANATION_CODES.SUSPENDED_FUNCTION);
      return this.finalize(request, codes, AuthorityEvaluationOutcome.DENY, null, at);
    }

    if (functionRecord.lifecycleStatus !== FunctionAuthorityLifecycleStatus.ACTIVE) {
      codes.push(AUTHORITY_EVALUATION_EXPLANATION_CODES.INACTIVE_FUNCTION);
      return this.finalize(request, codes, AuthorityEvaluationOutcome.DENY, null, at);
    }

    const sourceFailure = this.evaluateGoverningSources(functionRecord.governingSources, at);
    if (sourceFailure) {
      codes.push(sourceFailure);
      const outcome =
        sourceFailure === AUTHORITY_EVALUATION_EXPLANATION_CODES.SOURCE_CONFLICT
          ? AuthorityEvaluationOutcome.SAFE_HALT
          : AuthorityEvaluationOutcome.DENY;
      return this.finalize(request, codes, outcome, null, at);
    }

    const actorResolution = await this.actorResolver.resolve({
      identityId: request.identityId,
      officeholderId: request.officeholderId,
      officeId: request.officeId ?? functionRecord.officeId ?? undefined,
      appointmentId: request.appointmentId,
      delegationId: request.delegationId,
      functionAuthorityRecordId: functionRecord.id,
      requestedAction: request.action,
      requiresDelegation: functionRecord.requiresDelegation,
      at,
    });

    if ('failure' in actorResolution) {
      codes.push(actorResolution.failure.code as AuthorityExplanationCode);
      return this.finalize(request, codes, AuthorityEvaluationOutcome.DENY, null, at);
    }

    const actor = actorResolution.actor;

    if (functionRecord.requiresDelegation && !actor.delegation) {
      codes.push(AUTHORITY_EVALUATION_EXPLANATION_CODES.MISSING_DELEGATION);
      return this.finalize(request, codes, AuthorityEvaluationOutcome.DENY, actor, at);
    }

    const assignment = functionRecord.assignments.find((item) => {
      if (item.status !== FunctionAssignmentStatus.ACTIVE) {
        return false;
      }
      if (
        !isEffectiveAt(
          { effectiveFrom: item.effectiveFrom, effectiveUntil: item.effectiveUntil },
          at,
        )
      ) {
        return false;
      }
      if (item.officeholderId && item.officeholderId !== actor.officeholderId) {
        return false;
      }
      if (item.officeId && item.officeId !== actor.appointment?.officeId) {
        return false;
      }
      return true;
    });

    if (!assignment) {
      codes.push(AUTHORITY_EVALUATION_EXPLANATION_CODES.MISSING_ASSIGNMENT);
      return this.finalize(request, codes, AuthorityEvaluationOutcome.DENY, actor, at);
    }

    const actionRight = functionRecord.actionRights.find((item) => item.action === request.action);
    if (!actionRight?.permitted) {
      codes.push(AUTHORITY_EVALUATION_EXPLANATION_CODES.MISSING_ACTION_RIGHT);
      return this.finalize(request, codes, AuthorityEvaluationOutcome.DENY, actor, at);
    }

    if (
      functionRecord.classification === AuthorityClassification.TECHNOLOGY_ASSISTED &&
      actionRight.requiresHumanActor &&
      !this.actorResolver.isHumanActor(actor.identityType)
    ) {
      codes.push(AUTHORITY_EVALUATION_EXPLANATION_CODES.AI_CANNOT_DECIDE);
      return this.finalize(request, codes, AuthorityEvaluationOutcome.DENY, actor, at);
    }

    if (
      functionRecord.classification === AuthorityClassification.RESERVED_PROFESSIONAL &&
      !this.actorResolver.isHumanActor(actor.identityType)
    ) {
      codes.push(AUTHORITY_EVALUATION_EXPLANATION_CODES.AI_CANNOT_SATISFY_PROFESSIONAL);
      return this.finalize(request, codes, AuthorityEvaluationOutcome.DENY, actor, at);
    }

    if (
      request.action === AuthorityActionType.DECIDE &&
      !functionRecord.actionRights.some(
        (item) => item.action === AuthorityActionType.DECIDE && item.permitted,
      ) &&
      functionRecord.actionRights.some(
        (item) => item.action === AuthorityActionType.SIGN && item.permitted,
      )
    ) {
      codes.push(AUTHORITY_EVALUATION_EXPLANATION_CODES.SIGN_NOT_DECIDE);
      return this.finalize(request, codes, AuthorityEvaluationOutcome.DENY, actor, at);
    }

    if (
      request.action === AuthorityActionType.ISSUE &&
      functionRecord.actionRights.some(
        (item) => item.action === AuthorityActionType.DECIDE && item.permitted,
      ) &&
      !functionRecord.actionRights.some(
        (item) => item.action === AuthorityActionType.ISSUE && item.permitted,
      )
    ) {
      codes.push(AUTHORITY_EVALUATION_EXPLANATION_CODES.DECIDE_NOT_ISSUE);
      return this.finalize(request, codes, AuthorityEvaluationOutcome.DENY, actor, at);
    }

    if (functionRecord.classification === AuthorityClassification.EXPRESSLY_RETAINED_NATIONAL) {
      const dependencyFailures = await this.dependencyEvaluator.evaluate(
        functionRecord.id,
        functionRecord.dependencies,
        {
          identityType: actor.identityType,
          attestationSource: request.attestationSource,
          at,
        },
      );
      if (dependencyFailures.length > 0) {
        codes.push(...dependencyFailures);
        const outcome = this.resolveDependencyOutcome(
          functionRecord.dependencies,
          dependencyFailures,
        );
        return this.finalize(request, codes, outcome, actor, at);
      }

      const decidingActions: AuthorityActionType[] = [
        AuthorityActionType.DECIDE,
        AuthorityActionType.APPROVE,
        AuthorityActionType.ISSUE,
      ];
      if (decidingActions.includes(request.action)) {
        codes.push(AUTHORITY_EVALUATION_EXPLANATION_CODES.ABSEZ_CANNOT_SUBSTITUTE_RETAINED_NATIONAL);
        return this.finalize(
          request,
          codes,
          AuthorityEvaluationOutcome.REQUIRES_EXTERNAL_DETERMINATION,
          actor,
          at,
        );
      }
    }

    const conditionFailures = this.conditionEvaluator.evaluate(functionRecord.conditions, {
      action: request.action,
      evidenceProvided: request.evidenceProvided,
      qualificationCodes: request.qualificationCodes,
      transactionAmount: request.transactionAmount,
      scopeValue: request.scopeValue,
      hasSecondApproval: request.hasSecondApproval,
      hasConsultation: request.hasConsultation,
      hasSupervision: request.hasSupervision,
      hasLiaison: request.hasLiaison,
      isSelfApproval: request.isSelfApproval,
      isConflicted: request.isConflicted,
      isRecused: request.isRecused,
      priorActions: request.priorActions,
    });
    if (conditionFailures.length > 0) {
      codes.push(...conditionFailures);
      return this.finalize(request, codes, AuthorityEvaluationOutcome.DENY, actor, at);
    }

    const sodFailures = this.sodEvaluator.evaluate(functionRecord.sodRules, {
      action: request.action,
      priorActions: request.priorActions,
      isSelfApproval: request.isSelfApproval,
      hasSecondApproval: request.hasSecondApproval,
    });
    if (sodFailures.length > 0) {
      codes.push(...sodFailures);
      return this.finalize(request, codes, AuthorityEvaluationOutcome.DENY, actor, at);
    }

    const dependencyFailures = await this.dependencyEvaluator.evaluate(
      functionRecord.id,
      functionRecord.dependencies,
      {
        identityType: actor.identityType,
        externalDataAccessOnly: request.externalDataAccessOnly,
        attestationSource: request.attestationSource,
        at,
      },
    );
    if (dependencyFailures.length > 0) {
      codes.push(...dependencyFailures);
      const outcome = this.resolveDependencyOutcome(
        functionRecord.dependencies,
        dependencyFailures,
      );
      return this.finalize(request, codes, outcome, actor, at);
    }

    if (actor.identityType === IdentityType.SERVICE) {
      const decidingActions: AuthorityActionType[] = [
        AuthorityActionType.DECIDE,
        AuthorityActionType.SIGN,
        AuthorityActionType.ISSUE,
        AuthorityActionType.APPROVE,
      ];
      if (decidingActions.includes(request.action)) {
        codes.push(AUTHORITY_EVALUATION_EXPLANATION_CODES.AI_CANNOT_DECIDE);
        return this.finalize(request, codes, AuthorityEvaluationOutcome.DENY, actor, at);
      }
    }

    codes.push(AUTHORITY_EVALUATION_EXPLANATION_CODES.ALLOW);
    return this.finalize(request, codes, AuthorityEvaluationOutcome.ALLOW, actor, at);
  }

  private resolveDependencyOutcome(
    dependencies: {
      dependencyType: AuthorityDependencyType;
      blockingStatus: AuthorityDependencyBlockingStatus;
    }[],
    failureCodes: AuthorityExplanationCode[],
  ): AuthorityEvaluationOutcome {
    if (
      failureCodes.includes(
        AUTHORITY_EVALUATION_EXPLANATION_CODES.MISSING_RETAINED_NATIONAL_DETERMINATION,
      )
    ) {
      return AuthorityEvaluationOutcome.REQUIRES_EXTERNAL_DETERMINATION;
    }

    if (
      failureCodes.includes(AUTHORITY_EVALUATION_EXPLANATION_CODES.AI_CANNOT_SATISFY_PROFESSIONAL) ||
      failureCodes.includes(
        AUTHORITY_EVALUATION_EXPLANATION_CODES.ADMINISTRATOR_CANNOT_SATISFY_PROFESSIONAL,
      ) ||
      failureCodes.includes(AUTHORITY_EVALUATION_EXPLANATION_CODES.MISSING_PROFESSIONAL_REVIEW)
    ) {
      return AuthorityEvaluationOutcome.BLOCKED;
    }

    if (this.dependencyEvaluator.hasBlockingFailures(dependencies, failureCodes)) {
      const requiresExternal = failureCodes.some((code) =>
        [
          AUTHORITY_EVALUATION_EXPLANATION_CODES.MISSING_GOVERNMENT_CONCURRENCE,
          AUTHORITY_EVALUATION_EXPLANATION_CODES.UNAUTHENTICATED_EXTERNAL_DETERMINATION,
        ].includes(code as typeof AUTHORITY_EVALUATION_EXPLANATION_CODES.MISSING_GOVERNMENT_CONCURRENCE),
      );
      return requiresExternal
        ? AuthorityEvaluationOutcome.REQUIRES_EXTERNAL_DETERMINATION
        : AuthorityEvaluationOutcome.BLOCKED;
    }

    return AuthorityEvaluationOutcome.DENY;
  }

  private evaluateGoverningSources(
    links: {
      governingSource: {
        status: GoverningSourceStatus;
        effectiveFrom: Date;
        effectiveUntil: Date | null;
        outgoingRelationships: { relationshipType: GoverningSourceRelationshipType }[];
      };
    }[],
    at: Date,
  ): AuthorityExplanationCode | null {
    if (links.length === 0) {
      return AUTHORITY_EVALUATION_EXPLANATION_CODES.UNAUTHENTICATED_SOURCE;
    }

    for (const link of links) {
      const source = link.governingSource;

      if (source.status === GoverningSourceStatus.CONFLICT_DETECTED) {
        return AUTHORITY_EVALUATION_EXPLANATION_CODES.SOURCE_CONFLICT;
      }

      if (source.status === GoverningSourceStatus.REVOKED) {
        return AUTHORITY_EVALUATION_EXPLANATION_CODES.REVOKED_SOURCE;
      }

      if (source.status !== GoverningSourceStatus.AUTHENTICATED) {
        return AUTHORITY_EVALUATION_EXPLANATION_CODES.UNAUTHENTICATED_SOURCE;
      }

      if (source.effectiveFrom > at) {
        return AUTHORITY_EVALUATION_EXPLANATION_CODES.FUTURE_SOURCE;
      }

      if (source.effectiveUntil !== null && source.effectiveUntil <= at) {
        return AUTHORITY_EVALUATION_EXPLANATION_CODES.EXPIRED_SOURCE;
      }

      const hasConflict = source.outgoingRelationships.some(
        (rel) => rel.relationshipType === GoverningSourceRelationshipType.CONFLICTS_WITH,
      );
      if (hasConflict) {
        return AUTHORITY_EVALUATION_EXPLANATION_CODES.SOURCE_CONFLICT;
      }
    }

    return null;
  }

  private async finalize(
    request: AuthorityEvaluationRequest,
    codes: AuthorityExplanationCode[],
    outcome: AuthorityEvaluationOutcome,
    actor: {
      officeholderId: string;
      appointment: { id: string } | null;
      delegation: { id: string } | null;
    } | null,
    at: Date,
  ): Promise<AuthorityEvaluationResponseDto> {
    const uniqueCodes = [...new Set(codes)];
    const explanation = this.explanationService.buildExplanation(outcome, uniqueCodes);

    const requestHash = hashEvaluationRequest({
      identityId: request.identityId,
      functionAuthorityRecordId: request.functionAuthorityRecordId,
      action: request.action,
      at: at.toISOString(),
      outcome,
    });

    const record = await this.prisma.authorityEvaluationRecord.create({
      data: {
        functionAuthorityRecordId: request.functionAuthorityRecordId,
        identityId: request.identityId,
        officeholderId: actor?.officeholderId ?? null,
        appointmentId: actor?.appointment?.id ?? null,
        delegationId: actor?.delegation?.id ?? null,
        action: request.action,
        outcome,
        evaluatedAt: at,
        contextSnapshot: {
          request: {
            identityId: request.identityId,
            functionAuthorityRecordId: request.functionAuthorityRecordId,
            action: request.action,
            officeholderId: request.officeholderId,
            officeId: request.officeId,
            appointmentId: request.appointmentId,
            delegationId: request.delegationId,
          },
          outcome,
          codes: uniqueCodes,
        } satisfies Prisma.InputJsonObject,
        explanationCodes: uniqueCodes,
        requestHash,
      },
    });

    return {
      evaluationId: record.id,
      functionAuthorityRecordId: request.functionAuthorityRecordId,
      identityId: request.identityId,
      action: request.action,
      outcome,
      status: deriveEvaluationStatus(outcome, uniqueCodes),
      explanationCodes: uniqueCodes,
      summary: explanation.summary,
      safeHalt: explanation.safeHalt,
      requiresRevalidation: explanation.requiresRevalidation,
      evaluatedAt: record.evaluatedAt,
    };
  }

  async getEvaluationRecord(id: string) {
    const record = await this.prisma.authorityEvaluationRecord.findUnique({ where: { id } });
    if (!record) {
      throw new NotFoundException(`AuthorityEvaluationRecord "${id}" was not found`);
    }
    return record;
  }
}
