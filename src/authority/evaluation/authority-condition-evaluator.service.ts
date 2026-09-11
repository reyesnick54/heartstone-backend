import { Injectable } from '@nestjs/common';
import { type AuthorityCondition, AuthorityConditionStatus } from '@prisma/client';

import { type AuthorityEvaluationContext } from '../domain/authority-evaluation-context';
import { AuthorityEvaluationOutcome } from '../domain/authority-evaluation-outcome.enum';
import { type AuthorityEvaluationResult } from '../domain/authority-evaluation-result';
import { AuthorityConditionEvaluationService } from './authority-condition-evaluation.service';

@Injectable()
export class AuthorityConditionEvaluatorService {
  constructor(
    private readonly conditionEvaluation: AuthorityConditionEvaluationService,
  ) {}

  /**
   * Evaluates all applicable authority conditions against the provided context.
   * Fails closed: any unsatisfied mandatory condition blocks progression.
   */
  evaluateConditions(
    conditions: AuthorityCondition[],
    context: AuthorityEvaluationContext,
  ): AuthorityEvaluationResult {
    const activeConditions = conditions.filter((c) =>
      this.conditionEvaluation.isConditionEffective(c, context.evaluatedAt),
    );

    const conditionDetails = activeConditions.map((condition) =>
      this.conditionEvaluation.evaluateCondition(condition, context),
    );

    const segregationViolations = conditionDetails
      .filter((d) => !d.satisfied && d.conditionType === 'SEGREGATION_OF_DUTIES')
      .map((d) => {
        const condition = activeConditions.find((c) => c.id === d.conditionId);
        const config = condition?.configuration as { ruleCode?: string } | undefined;
        return {
          ruleCode: config?.ruleCode ?? d.conditionId,
          reason: d.reason,
        };
      });

    const failedMandatory = conditionDetails.filter((d) => !d.satisfied && d.mandatory);
    const reasons = failedMandatory.map((d) => d.reason);

    if (failedMandatory.length === 0) {
      return {
        outcome: AuthorityEvaluationOutcome.ALLOW,
        allowed: true,
        conditionDetails,
        segregationViolations: [],
        reasons: [],
      };
    }

    const worstOutcome = this.resolveWorstOutcome(failedMandatory.map((d) => d.outcome));

    return {
      outcome: worstOutcome,
      allowed: false,
      conditionDetails,
      segregationViolations,
      reasons,
    };
  }

  filterApplicableConditions(
    conditions: AuthorityCondition[],
    context: AuthorityEvaluationContext,
  ): AuthorityCondition[] {
    return conditions.filter((condition) => {
      if (condition.status !== AuthorityConditionStatus.ACTIVE) {
        return false;
      }
      if (condition.requiredAction && condition.requiredAction !== context.requestedAction) {
        return false;
      }
      return this.conditionEvaluation.isConditionEffective(condition, context.evaluatedAt);
    });
  }

  private resolveWorstOutcome(outcomes: AuthorityEvaluationOutcome[]): AuthorityEvaluationOutcome {
    const priority: AuthorityEvaluationOutcome[] = [
      AuthorityEvaluationOutcome.SAFE_HALT,
      AuthorityEvaluationOutcome.BLOCKED,
      AuthorityEvaluationOutcome.REQUIRES_REVIEW,
      AuthorityEvaluationOutcome.NOT_AUTHORIZED,
      AuthorityEvaluationOutcome.ALLOW,
    ];

    for (const outcome of priority) {
      if (outcomes.includes(outcome)) {
        return outcome;
      }
    }
    return AuthorityEvaluationOutcome.BLOCKED;
  }
}
