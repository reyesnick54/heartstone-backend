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
        codes.push(
          AUTHORITY_EVALUATION_EXPLANATION_CODES.ABSEZ_CANNOT_SUBSTITUTE_RETAINED_NATIONAL,
        );
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
      failureCodes.includes(
        AUTHORITY_EVALUATION_EXPLANATION_CODES.AI_CANNOT_SATISFY_PROFESSIONAL,
      ) ||
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
        ].includes(
          code as typeof AUTHORITY_EVALUATION_EXPLANATION_CODES.MISSING_GOVERNMENT_CONCURRENCE,
        ),
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
