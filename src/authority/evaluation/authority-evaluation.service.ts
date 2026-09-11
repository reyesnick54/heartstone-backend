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
  }
}
