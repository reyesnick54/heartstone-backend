import { Injectable } from '@nestjs/common';
import { AuthorityActionType, AuthorityConditionType } from '@prisma/client';

import { AUTHORITY_EVALUATION_EXPLANATION_CODES } from '../authority.constants';
import { type AuthorityExplanationCode } from '../authority.constants';

export interface ConditionEvaluationContext {
  action: AuthorityActionType;
  evidenceProvided?: string[];
  qualificationCodes?: string[];
  transactionAmount?: number;
  scopeValue?: string;
  hasSecondApproval?: boolean;
  hasConsultation?: boolean;
  hasSupervision?: boolean;
  hasLiaison?: boolean;
  isSelfApproval?: boolean;
  isConflicted?: boolean;
  isRecused?: boolean;
  priorActions?: AuthorityActionType[];
}

interface ConditionRecord {
  conditionType: AuthorityConditionType;
  configuration: unknown;
  isRequired: boolean;
}

@Injectable()
export class AuthorityConditionEvaluator {
  evaluate(
    conditions: ConditionRecord[],
    context: ConditionEvaluationContext,
  ): AuthorityExplanationCode[] {
    const failures: AuthorityExplanationCode[] = [];

    for (const condition of conditions) {
      if (!condition.isRequired) {
        continue;
      }

      const config = (condition.configuration ?? {}) as Record<string, unknown>;
      const failure = this.evaluateOne(condition.conditionType, config, context);
      if (failure) {
        failures.push(failure);
      }
    }

    return failures;
  }

  private evaluateOne(
    type: AuthorityConditionType,
    config: Record<string, unknown>,
    context: ConditionEvaluationContext,
  ): AuthorityExplanationCode | null {
    switch (type) {
      case AuthorityConditionType.EVIDENCE_REQUIRED: {
        const required = (config.requiredEvidence as string[] | undefined) ?? [];
        const provided = context.evidenceProvided ?? [];
        const missing = required.filter((item) => !provided.includes(item));
        return missing.length > 0 ? AUTHORITY_EVALUATION_EXPLANATION_CODES.MISSING_EVIDENCE : null;
      }
      case AuthorityConditionType.QUALIFICATION_REQUIRED: {
        const required = (config.requiredQualifications as string[] | undefined) ?? [];
        const held = context.qualificationCodes ?? [];
        const missing = required.filter((item) => !held.includes(item));
        return missing.length > 0
          ? AUTHORITY_EVALUATION_EXPLANATION_CODES.MISSING_QUALIFICATION
          : null;
      }
      case AuthorityConditionType.TRANSACTION_LIMIT: {
        const limit = Number(config.maxAmount ?? 0);
        const amount = context.transactionAmount ?? 0;
        return amount > limit
          ? AUTHORITY_EVALUATION_EXPLANATION_CODES.TRANSACTION_LIMIT_EXCEEDED
          : null;
      }
      case AuthorityConditionType.SCOPE_LIMIT: {
        const allowed = (config.allowedScopes as string[] | undefined) ?? [];
        const scope = context.scopeValue ?? '';
        return allowed.length > 0 && !allowed.includes(scope)
          ? AUTHORITY_EVALUATION_EXPLANATION_CODES.SCOPE_LIMIT_EXCEEDED
          : null;
      }
      case AuthorityConditionType.SECOND_APPROVAL_REQUIRED:
        return context.hasSecondApproval
          ? null
          : AUTHORITY_EVALUATION_EXPLANATION_CODES.MISSING_SECOND_APPROVAL;
      case AuthorityConditionType.CONSULTATION_REQUIRED:
        if (context.action === AuthorityActionType.APPROVE && !context.hasConsultation) {
          return AUTHORITY_EVALUATION_EXPLANATION_CODES.CONSULTATION_NOT_CONCURRENCE;
        }
        return null;
      case AuthorityConditionType.SUPERVISION_REQUIRED:
        if (context.action === AuthorityActionType.APPROVE && !context.hasSupervision) {
          return AUTHORITY_EVALUATION_EXPLANATION_CODES.SUPERVISION_NOT_APPROVAL;
        }
        return null;
      case AuthorityConditionType.LIAISON_BOUNDARY:
        if (
          (
            [
              AuthorityActionType.DECIDE,
              AuthorityActionType.APPROVE,
              AuthorityActionType.ISSUE,
            ] as AuthorityActionType[]
          ).includes(context.action) &&
          context.hasLiaison
        ) {
          return AUTHORITY_EVALUATION_EXPLANATION_CODES.LIAISON_NOT_DELEGATION;
        }
        return null;
      case AuthorityConditionType.SELF_APPROVAL_PROHIBITED:
        return context.isSelfApproval
          ? AUTHORITY_EVALUATION_EXPLANATION_CODES.SELF_APPROVAL_PROHIBITED
          : null;
      case AuthorityConditionType.CONFLICT_CHECK:
        return context.isConflicted
          ? AUTHORITY_EVALUATION_EXPLANATION_CODES.CONFLICT_DETECTED
          : null;
      case AuthorityConditionType.RECUSAL_CHECK:
        return context.isRecused ? AUTHORITY_EVALUATION_EXPLANATION_CODES.RECUSAL_REQUIRED : null;
      default:
        return null;
    }
  }
}
