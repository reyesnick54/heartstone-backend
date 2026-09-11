import { Injectable } from '@nestjs/common';
import { AuthorityActionType, SodRuleType } from '@prisma/client';

import { AUTHORITY_EVALUATION_EXPLANATION_CODES } from '../authority.constants';
import { type AuthorityExplanationCode } from '../authority.constants';

interface SodRuleRecord {
  ruleType: SodRuleType;
  conflictingAction: AuthorityActionType | null;
  configuration: unknown;
}

@Injectable()
export class SegregationOfDutyEvaluator {
  evaluate(
    rules: SodRuleRecord[],
    context: {
      action: AuthorityActionType;
      priorActions?: AuthorityActionType[];
      isSelfApproval?: boolean;
      hasSecondApproval?: boolean;
    },
  ): AuthorityExplanationCode[] {
    const failures: AuthorityExplanationCode[] = [];
    const prior = context.priorActions ?? [];

    for (const rule of rules) {
      switch (rule.ruleType) {
        case SodRuleType.SELF_APPROVAL:
          if (context.isSelfApproval) {
            failures.push(AUTHORITY_EVALUATION_EXPLANATION_CODES.SELF_APPROVAL_PROHIBITED);
          }
          break;
        case SodRuleType.MISSING_SECOND_APPROVAL:
          if (!context.hasSecondApproval) {
            failures.push(AUTHORITY_EVALUATION_EXPLANATION_CODES.MISSING_SECOND_APPROVAL);
          }
          break;
        case SodRuleType.SEGREGATION_OF_DUTY:
          if (
            rule.conflictingAction &&
            prior.includes(rule.conflictingAction) &&
            (
              [AuthorityActionType.APPROVE, AuthorityActionType.DECIDE] as AuthorityActionType[]
            ).includes(context.action)
          ) {
            failures.push(AUTHORITY_EVALUATION_EXPLANATION_CODES.SOD_VIOLATION);
          }
          break;
        default:
          break;
      }
    }

    return failures;
  }
}
