import { Injectable } from '@nestjs/common';
import { StructuredApplicabilityRuleType } from '@prisma/client';

import { SERVICE_CHECKLIST_EXPLANATION_CODES } from '../services.constants';
import {
  type ApplicabilityFacts,
  type ApplicabilityRuleEvaluationOutcome,
  type ApplicabilityRuleEvaluationResult,
  type CompositeRuleConfiguration,
  type StructuredApplicabilityRuleRecord,
  type StructuredRuleLeafConfiguration,
} from './applicability-rule.types';

@Injectable()
export class StructuredApplicabilityRuleEvaluator {
  evaluate(
    rule: StructuredApplicabilityRuleRecord,
    facts: ApplicabilityFacts,
  ): ApplicabilityRuleEvaluationResult {
    if (rule.status !== 'ACTIVE') {
      return {
        outcome: 'UNRESOLVED',
        reasonCode: SERVICE_CHECKLIST_EXPLANATION_CODES.UNRESOLVED_CONDITIONAL_RULE,
      };
    }

    return this.evaluateRuleType(rule.ruleType, rule.configuration, facts);
  }

  private evaluateRuleType(
    ruleType: StructuredApplicabilityRuleType,
    configuration: unknown,
    facts: ApplicabilityFacts,
  ): ApplicabilityRuleEvaluationResult {
    const config = (configuration ?? {}) as StructuredRuleLeafConfiguration &
      CompositeRuleConfiguration;

    switch (ruleType) {
      case StructuredApplicabilityRuleType.FACT_EQUALS:
        return this.toBooleanResult(this.evaluateEquals(config, facts));
      case StructuredApplicabilityRuleType.FACT_NOT_EQUALS:
        return this.toBooleanResult(!this.evaluateEquals(config, facts));
      case StructuredApplicabilityRuleType.FACT_IN:
        return this.toBooleanResult(this.evaluateIn(config, facts));
      case StructuredApplicabilityRuleType.FACT_NOT_IN:
        return this.toBooleanResult(!this.evaluateIn(config, facts));
      case StructuredApplicabilityRuleType.FACT_PRESENT:
        return this.toBooleanResult(this.evaluatePresent(config, facts));
      case StructuredApplicabilityRuleType.FACT_NOT_PRESENT:
        return this.toBooleanResult(!this.evaluatePresent(config, facts));
      case StructuredApplicabilityRuleType.ALL_OF:
        return this.evaluateComposite(config.conditions ?? [], facts, 'ALL');
      case StructuredApplicabilityRuleType.ANY_OF:
        return this.evaluateComposite(config.conditions ?? [], facts, 'ANY');
      default:
        return {
          outcome: 'UNRESOLVED',
          reasonCode: SERVICE_CHECKLIST_EXPLANATION_CODES.UNKNOWN_RULE_OPERATOR,
        };
    }
  }

  private evaluateComposite(
    conditions: StructuredRuleLeafConfiguration[],
    facts: ApplicabilityFacts,
    mode: 'ALL' | 'ANY',
  ): ApplicabilityRuleEvaluationResult {
    if (conditions.length === 0) {
      return {
        outcome: 'UNRESOLVED',
        reasonCode: SERVICE_CHECKLIST_EXPLANATION_CODES.UNRESOLVED_CONDITIONAL_RULE,
      };
    }

    const outcomes: ApplicabilityRuleEvaluationOutcome[] = [];

    for (const condition of conditions) {
      const result = this.evaluateLeafCondition(condition, facts);
      if (result.outcome === 'UNRESOLVED') {
        return result;
      }
      outcomes.push(result.outcome);
    }

    if (mode === 'ALL') {
      return this.toBooleanResult(outcomes.every((outcome) => outcome === 'APPLIES'));
    }

    return this.toBooleanResult(outcomes.some((outcome) => outcome === 'APPLIES'));
  }

  private evaluateLeafCondition(
    condition: StructuredRuleLeafConfiguration,
    facts: ApplicabilityFacts,
  ): ApplicabilityRuleEvaluationResult {
    if (!condition.factKey) {
      return {
        outcome: 'UNRESOLVED',
        reasonCode: SERVICE_CHECKLIST_EXPLANATION_CODES.UNRESOLVED_CONDITIONAL_RULE,
      };
    }

    if (condition.values !== undefined) {
      return this.toBooleanResult(this.evaluateIn(condition, facts));
    }

    if (condition.value !== undefined) {
      return this.toBooleanResult(this.evaluateEquals(condition, facts));
    }

    return this.toBooleanResult(this.evaluatePresent(condition, facts));
  }

  private evaluateEquals(
    config: StructuredRuleLeafConfiguration,
    facts: ApplicabilityFacts,
  ): boolean | null {
    if (!config.factKey || !Object.prototype.hasOwnProperty.call(facts, config.factKey)) {
      return null;
    }

    return facts[config.factKey] === config.value;
  }

  private evaluateIn(
    config: StructuredRuleLeafConfiguration,
    facts: ApplicabilityFacts,
  ): boolean | null {
    if (!config.factKey || !Object.prototype.hasOwnProperty.call(facts, config.factKey)) {
      return null;
    }

    const values = config.values ?? [];
    return values.includes(facts[config.factKey]);
  }

  private evaluatePresent(
    config: StructuredRuleLeafConfiguration,
    facts: ApplicabilityFacts,
  ): boolean | null {
    if (!config.factKey) {
      return null;
    }

    if (!Object.prototype.hasOwnProperty.call(facts, config.factKey)) {
      return null;
    }

    const value = facts[config.factKey];
    if (value === null || value === undefined) {
      return false;
    }

    if (typeof value === 'string') {
      return value.trim().length > 0;
    }

    return true;
  }

  private toBooleanResult(value: boolean | null): ApplicabilityRuleEvaluationResult {
    if (value === null) {
      return {
        outcome: 'UNRESOLVED',
        reasonCode: SERVICE_CHECKLIST_EXPLANATION_CODES.UNRESOLVED_CONDITIONAL_RULE,
      };
    }

    return {
      outcome: value ? 'APPLIES' : 'DOES_NOT_APPLY',
    };
  }
}
