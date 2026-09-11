import { Injectable } from '@nestjs/common';

import { type AuthorityEvaluationContext } from '../domain/authority-evaluation-context';
import { type SegregationOfDutiesViolation } from '../domain/authority-evaluation-result';
import {
  getSegregationRule,
  SEGREGATION_OF_DUTIES_RULES,
  type SegregationOfDutiesRuleCode,
} from './segregation-of-duties.rules';

@Injectable()
export class SegregationOfDutiesService {
  evaluateRule(
    ruleCode: SegregationOfDutiesRuleCode,
    context: AuthorityEvaluationContext,
  ): SegregationOfDutiesViolation | null {
    const rule = getSegregationRule(ruleCode);
    if (!rule) {
      return {
        ruleCode,
        reason: `Unknown segregation-of-duties rule: ${ruleCode}`,
      };
    }

    const satisfied = rule.evaluate(context);
    if (satisfied) {
      return null;
    }

    return {
      ruleCode: rule.code,
      reason: rule.description,
    };
  }

  evaluateAllApplicableRules(
    context: AuthorityEvaluationContext,
    ruleCodes?: SegregationOfDutiesRuleCode[],
  ): SegregationOfDutiesViolation[] {
    const codesToEvaluate = ruleCodes ?? SEGREGATION_OF_DUTIES_RULES.map((r) => r.code);
    const violations: SegregationOfDutiesViolation[] = [];

    for (const code of codesToEvaluate) {
      const violation = this.evaluateRule(code, context);
      if (violation) {
        violations.push(violation);
      }
    }

    return violations;
  }
}
