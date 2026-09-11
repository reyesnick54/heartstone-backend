import { Injectable } from '@nestjs/common';
import {
  type AuthorityCondition,
  AuthorityConditionStatus,
  AuthorityConditionType,
  ConditionFailureBehavior,
} from '@prisma/client';

import { type AuthorityEvaluationContext } from '../domain/authority-evaluation-context';
import { AuthorityEvaluationOutcome } from '../domain/authority-evaluation-outcome.enum';
import { type ConditionEvaluationDetail } from '../domain/authority-evaluation-result';
import {
  type ActivationRequiredConfiguration,
  type AuthorityConditionConfiguration,
  type ConflictCheckConfiguration,
  type InformationClassificationConfiguration,
  type JurisdictionLimitConfiguration,
  type OtherStructuredRequirementConfiguration,
  type RecusalCheckConfiguration,
  type RequiredConcurrenceConfiguration,
  type RequiredEvidenceConfiguration,
  type RequiredQualificationConfiguration,
  type SecondApprovalConfiguration,
  type SegregationOfDutiesConfiguration,
  type SubjectMatterLimitConfiguration,
  type TransactionLimitConfiguration,
} from '../domain/condition-configuration.types';
import { ConflictStatus, RecusalStatus } from '../domain/conflict-recusal-status.enum';
import { EvidenceRequirementStatus } from '../domain/evidence-requirement-status.enum';
import { QualificationVerificationStatus } from '../domain/qualification-verification-status.enum';
import { SegregationOfDutiesService } from '../segregation/segregation-of-duties.service';

@Injectable()
export class AuthorityConditionEvaluationService {
  constructor(private readonly segregationOfDuties: SegregationOfDutiesService) {}

  isConditionEffective(condition: AuthorityCondition, evaluatedAt: Date): boolean {
    if (condition.status !== AuthorityConditionStatus.ACTIVE) {
      return false;
    }
    if (condition.effectiveFrom > evaluatedAt) {
      return false;
    }
    if (condition.effectiveUntil && condition.effectiveUntil < evaluatedAt) {
      return false;
    }
    return true;
  }

  evaluateCondition(
    condition: AuthorityCondition,
    context: AuthorityEvaluationContext,
  ): ConditionEvaluationDetail {
    if (!this.isConditionEffective(condition, context.evaluatedAt)) {
      return this.buildDetail(condition, true, AuthorityEvaluationOutcome.ALLOW, 'Condition not effective');
    }

    const config = condition.configuration as unknown as AuthorityConditionConfiguration;
    const result = this.evaluateByType(condition.conditionType, config, context);

    const outcome = result.satisfied
      ? AuthorityEvaluationOutcome.ALLOW
      : this.mapFailureBehavior(condition.failureBehavior);

    return this.buildDetail(condition, result.satisfied, outcome, result.reason);
  }

  private evaluateByType(
    type: AuthorityConditionType,
    config: AuthorityConditionConfiguration,
    context: AuthorityEvaluationContext,
  ): { satisfied: boolean; reason: string } {
    switch (type) {
      case AuthorityConditionType.REQUIRED_EVIDENCE:
        return this.evaluateRequiredEvidence(config as RequiredEvidenceConfiguration, context);
      case AuthorityConditionType.REQUIRED_QUALIFICATION:
        return this.evaluateRequiredQualification(
          config as RequiredQualificationConfiguration,
          context,
        );
      case AuthorityConditionType.REQUIRED_CONCURRENCE:
        return this.evaluateRequiredConcurrence(
          config as RequiredConcurrenceConfiguration,
          context,
        );
      case AuthorityConditionType.TRANSACTION_LIMIT:
        return this.evaluateTransactionLimit(config as TransactionLimitConfiguration, context);
      case AuthorityConditionType.JURISDICTION_LIMIT:
        return this.evaluateJurisdictionLimit(config as JurisdictionLimitConfiguration, context);
      case AuthorityConditionType.SUBJECT_MATTER_LIMIT:
        return this.evaluateSubjectMatterLimit(
          config as SubjectMatterLimitConfiguration,
          context,
        );
      case AuthorityConditionType.INFORMATION_CLASSIFICATION:
        return this.evaluateInformationClassification(
          config as InformationClassificationConfiguration,
          context,
        );
      case AuthorityConditionType.CONFLICT_CHECK:
        return this.evaluateConflictCheck(config as ConflictCheckConfiguration, context);
      case AuthorityConditionType.RECUSAL_CHECK:
        return this.evaluateRecusalCheck(config as RecusalCheckConfiguration, context);
      case AuthorityConditionType.SEGREGATION_OF_DUTIES:
        return this.evaluateSegregationOfDuties(
          config as SegregationOfDutiesConfiguration,
          context,
        );
      case AuthorityConditionType.SECOND_APPROVAL:
        return this.evaluateSecondApproval(config as SecondApprovalConfiguration, context);
      case AuthorityConditionType.ACTIVATION_REQUIRED:
        return this.evaluateActivationRequired(
          config as ActivationRequiredConfiguration,
          context,
        );
      case AuthorityConditionType.OTHER_STRUCTURED_REQUIREMENT:
        return this.evaluateOtherStructuredRequirement(
          config as OtherStructuredRequirementConfiguration,
          context,
        );
      default:
        return { satisfied: false, reason: `Unsupported condition type: ${String(type)}` };
    }
  }

  private evaluateRequiredEvidence(
    config: RequiredEvidenceConfiguration,
    context: AuthorityEvaluationContext,
  ): { satisfied: boolean; reason: string } {
    const evidence = context.evidenceStatuses.find((e) => e.evidenceId === config.evidenceId);
    if (!evidence) {
      return {
        satisfied: false,
        reason: `Mandatory evidence "${config.evidenceId}" is missing`,
      };
    }
    if (evidence.status === EvidenceRequirementStatus.EXPIRED) {
      return {
        satisfied: false,
        reason: `Evidence "${config.evidenceId}" has expired`,
      };
    }
    if (evidence.status === EvidenceRequirementStatus.MISSING) {
      return {
        satisfied: false,
        reason: `Mandatory evidence "${config.evidenceId}" is missing`,
      };
    }
    if (evidence.status !== config.requiredStatus) {
      return {
        satisfied: false,
        reason: `Evidence "${config.evidenceId}" has status ${evidence.status}, required ${config.requiredStatus}`,
      };
    }
    return { satisfied: true, reason: 'Evidence requirement satisfied' };
  }

  private evaluateRequiredQualification(
    config: RequiredQualificationConfiguration,
    context: AuthorityEvaluationContext,
  ): { satisfied: boolean; reason: string } {
    const qualification = context.qualificationStatuses.find(
      (q) => q.qualificationCode === config.qualificationCode,
    );
    if (!qualification || qualification.status === QualificationVerificationStatus.MISSING) {
      return {
        satisfied: false,
        reason: `Required qualification "${config.qualificationCode}" is missing`,
      };
    }
    if (qualification.status === QualificationVerificationStatus.EXPIRED) {
      return {
        satisfied: false,
        reason: `Qualification "${config.qualificationCode}" has expired`,
      };
    }
    if (qualification.status !== config.requiredStatus) {
      return {
        satisfied: false,
        reason: `Qualification "${config.qualificationCode}" has status ${qualification.status}, required ${config.requiredStatus}`,
      };
    }
    return { satisfied: true, reason: 'Qualification requirement satisfied' };
  }

  private evaluateRequiredConcurrence(
    config: RequiredConcurrenceConfiguration,
    context: AuthorityEvaluationContext,
  ): { satisfied: boolean; reason: string } {
    const concurrence = context.concurrenceStatuses.find(
      (c) => c.concurrenceKey === config.concurrenceKey,
    );
    if (!concurrence || concurrence.approvalCount < config.minApprovals) {
      return {
        satisfied: false,
        reason: `Required concurrence "${config.concurrenceKey}" has insufficient approvals (${String(concurrence?.approvalCount ?? 0)}/${String(config.minApprovals)})`,
      };
    }
    return { satisfied: true, reason: 'Concurrence requirement satisfied' };
  }

  private evaluateTransactionLimit(
    config: TransactionLimitConfiguration,
    context: AuthorityEvaluationContext,
  ): { satisfied: boolean; reason: string } {
    if (context.transactionAmount === undefined) {
      return { satisfied: true, reason: 'No transaction amount provided; limit not applicable' };
    }
    if (config.currency && context.transactionCurrency && config.currency !== context.transactionCurrency) {
      return { satisfied: true, reason: 'Currency mismatch; limit not applicable to this transaction' };
    }
    if (context.transactionAmount > config.maxAmount) {
      return {
        satisfied: false,
        reason: `Transaction amount ${String(context.transactionAmount)} exceeds limit ${String(config.maxAmount)}`,
      };
    }
    return { satisfied: true, reason: 'Transaction within limit' };
  }

  private evaluateJurisdictionLimit(
    config: JurisdictionLimitConfiguration,
    context: AuthorityEvaluationContext,
  ): { satisfied: boolean; reason: string } {
    if (!context.jurisdictionId) {
      return { satisfied: false, reason: 'Jurisdiction not specified in evaluation context' };
    }
    if (!config.jurisdictionIds.includes(context.jurisdictionId)) {
      return {
        satisfied: false,
        reason: `Jurisdiction "${context.jurisdictionId}" is not within authorized scope`,
      };
    }
    return { satisfied: true, reason: 'Jurisdiction requirement satisfied' };
  }

  private evaluateSubjectMatterLimit(
    config: SubjectMatterLimitConfiguration,
    context: AuthorityEvaluationContext,
  ): { satisfied: boolean; reason: string } {
    if (!context.subjectMatterCode) {
      return { satisfied: false, reason: 'Subject matter not specified in evaluation context' };
    }
    if (!config.subjectMatterCodes.includes(context.subjectMatterCode)) {
      return {
        satisfied: false,
        reason: `Subject matter "${context.subjectMatterCode}" is outside authorized scope`,
      };
    }
    return { satisfied: true, reason: 'Subject matter requirement satisfied' };
  }

  private evaluateInformationClassification(
    config: InformationClassificationConfiguration,
    context: AuthorityEvaluationContext,
  ): { satisfied: boolean; reason: string } {
    const requiredLevel = config.requiredClassification;
    const actorLevel = context.actorClearanceLevel ?? config.actorClearanceLevel;
    if (!actorLevel) {
      return { satisfied: false, reason: 'Actor clearance level not established' };
    }
    if (actorLevel !== requiredLevel) {
      return {
        satisfied: false,
        reason: `Actor clearance "${actorLevel}" does not meet required classification "${requiredLevel}"`,
      };
    }
    return { satisfied: true, reason: 'Information classification requirement satisfied' };
  }

  private evaluateConflictCheck(
    config: ConflictCheckConfiguration,
    context: AuthorityEvaluationContext,
  ): { satisfied: boolean; reason: string } {
    if (
      config.blockOnActiveConflict &&
      context.conflictStatus === ConflictStatus.ACTIVE_DISQUALIFYING
    ) {
      return {
        satisfied: false,
        reason: 'Actor has an active disqualifying conflict of interest',
      };
    }
    return { satisfied: true, reason: 'No disqualifying conflict' };
  }

  private evaluateRecusalCheck(
    config: RecusalCheckConfiguration,
    context: AuthorityEvaluationContext,
  ): { satisfied: boolean; reason: string } {
    if (config.blockOnActiveRecusal && context.recusalStatus === RecusalStatus.FORMALLY_RECUSED) {
      return {
        satisfied: false,
        reason: 'Actor is formally recused from this matter',
      };
    }
    return { satisfied: true, reason: 'No active recusal' };
  }

  private evaluateSegregationOfDuties(
    config: SegregationOfDutiesConfiguration,
    context: AuthorityEvaluationContext,
  ): { satisfied: boolean; reason: string } {
    const violation = this.segregationOfDuties.evaluateRule(config.ruleCode, context);
    if (violation) {
      return { satisfied: false, reason: violation.reason };
    }
    return { satisfied: true, reason: 'Segregation of duties requirement satisfied' };
  }

  private evaluateSecondApproval(
    config: SecondApprovalConfiguration,
    context: AuthorityEvaluationContext,
  ): { satisfied: boolean; reason: string } {
    const approvers = context.secondApprovalIdentityIds ?? [];
    const distinctApprovers = new Set(approvers.filter((id) => id !== context.actor.identityId));
    if (distinctApprovers.size < config.minApprovals) {
      return {
        satisfied: false,
        reason: `Second approval missing: ${String(distinctApprovers.size)}/${String(config.minApprovals)} required independent approvers`,
      };
    }
    if (config.requiredApproverIdentityIds) {
      const missing = config.requiredApproverIdentityIds.filter(
        (id) => !distinctApprovers.has(id),
      );
      if (missing.length > 0) {
        return {
          satisfied: false,
          reason: `Required approver(s) missing: ${missing.join(', ')}`,
        };
      }
    }
    return { satisfied: true, reason: 'Second approval requirement satisfied' };
  }

  private evaluateActivationRequired(
    config: ActivationRequiredConfiguration,
    context: AuthorityEvaluationContext,
  ): { satisfied: boolean; reason: string } {
    if (context.activationStatus !== config.requiredActivationStatus) {
      return {
        satisfied: false,
        reason: `Activation status is "${context.activationStatus ?? 'undefined'}", required "${config.requiredActivationStatus}"`,
      };
    }
    return { satisfied: true, reason: 'Activation requirement satisfied' };
  }

  private evaluateOtherStructuredRequirement(
    config: OtherStructuredRequirementConfiguration,
    context: AuthorityEvaluationContext,
  ): { satisfied: boolean; reason: string } {
    const attribute = context.approvedAttributes.find((a) => a.key === config.requirementKey);
    if (attribute?.value !== config.expectedValue) {
      return {
        satisfied: false,
        reason: `Structured requirement "${config.requirementKey}" not satisfied`,
      };
    }
    return { satisfied: true, reason: 'Structured requirement satisfied' };
  }

  private mapFailureBehavior(behavior: ConditionFailureBehavior): AuthorityEvaluationOutcome {
    switch (behavior) {
      case ConditionFailureBehavior.REQUIRE_REVIEW:
        return AuthorityEvaluationOutcome.REQUIRES_REVIEW;
      case ConditionFailureBehavior.SAFE_HALT:
        return AuthorityEvaluationOutcome.SAFE_HALT;
      case ConditionFailureBehavior.BLOCK:
      default:
        return AuthorityEvaluationOutcome.BLOCKED;
    }
  }

  private buildDetail(
    condition: AuthorityCondition,
    satisfied: boolean,
    outcome: AuthorityEvaluationOutcome,
    reason: string,
  ): ConditionEvaluationDetail {
    return {
      conditionId: condition.id,
      conditionType: condition.conditionType,
      mandatory: condition.mandatory,
      satisfied,
      outcome,
      failureBehavior: condition.failureBehavior,
      reason,
    };
  }
}
