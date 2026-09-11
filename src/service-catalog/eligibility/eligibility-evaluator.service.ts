import { Injectable } from '@nestjs/common';
import {
  EligibilityGuidanceOutcome,
  RepresentativeAuthorityStatus,
  ServiceEligibilityRule,
  ServiceEligibilityRuleCategory,
  ServiceEligibilityRuleOperator,
} from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import {
  CATEGORY_FACT_KEYS,
  ELIGIBILITY_GUIDANCE_DISCLAIMER,
  ELIGIBILITY_REASON_CODES,
  FORBIDDEN_ELIGIBILITY_OUTCOMES,
  RECOMMENDED_ACTIONS,
} from '../service-catalog.constants';

export interface ApplicantFacts {
  applicantCategory?: string;
  entityType?: string;
  residencyStatus?: string;
  activity?: string;
  location?: string;
  geographicScope?: string;
  age?: number;
  ownershipAttributes?: string[];
  employerStatus?: string;
  prerequisiteStatuses?: Record<string, string>;
  attributes?: Record<string, unknown>;
  representativeContext?: {
    organizationId?: string;
    identityId?: string;
  };
}

export interface MatchedRuleSummary {
  ruleId: string;
  category: ServiceEligibilityRuleCategory;
  reasonCode: string;
}

export interface EligibilityGuidanceResult {
  outcome: EligibilityGuidanceOutcome;
  reasonCodes: string[];
  matchedRules: MatchedRuleSummary[];
  failedRules: MatchedRuleSummary[];
  missingFacts: string[];
  excludedActivity?: string;
  dependencies: string[];
  recommendedNextAction: string;
  disclaimer: string;
  governmentServiceId: string;
  governmentServiceVersionId: string;
  versionLabel: string;
  evaluatedAt: string;
}

interface RuleEvaluation {
  matched: boolean;
  missingFact: boolean;
  reasonCode: string;
  rule: ServiceEligibilityRule;
}

@Injectable()
export class EligibilityEvaluatorService {
  constructor(private readonly prisma: PrismaService) {}

  async evaluate(
    governmentServiceId: string,
    versionId: string,
    versionLabel: string,
    rules: ServiceEligibilityRule[],
    facts: ApplicantFacts,
    dependencyCodes: string[],
  ): Promise<EligibilityGuidanceResult> {
    const now = new Date();
    const activeRules = rules.filter(
      (rule) =>
        rule.status === 'ACTIVE' &&
        rule.effectiveFrom <= now &&
        (rule.effectiveUntil === null || rule.effectiveUntil > now),
    );

    const matchedRules: MatchedRuleSummary[] = [];
    const failedRules: MatchedRuleSummary[] = [];
    const missingFacts: string[] = [];
    const reasonCodes: string[] = [];
    let excludedActivity: string | undefined;

    for (const rule of activeRules) {
      const evaluation = await this.evaluateRule(rule, facts);

      if (evaluation.missingFact) {
        missingFacts.push(rule.attributeKey);
        reasonCodes.push(ELIGIBILITY_REASON_CODES.MISSING_FACT);
        continue;
      }

      const summary: MatchedRuleSummary = {
        ruleId: rule.id,
        category: rule.category,
        reasonCode: evaluation.reasonCode,
      };

      const isExclusionHit =
        rule.category === ServiceEligibilityRuleCategory.EXCLUSION && evaluation.matched;

      if (isExclusionHit) {
        failedRules.push(summary);
        excludedActivity = facts.activity;
        reasonCodes.push(ELIGIBILITY_REASON_CODES.EXCLUDED_ACTIVITY);
        reasonCodes.push(evaluation.reasonCode);
        continue;
      }

      if (evaluation.matched) {
        matchedRules.push(summary);
        reasonCodes.push(evaluation.reasonCode);
      } else {
        failedRules.push(summary);
        reasonCodes.push(evaluation.reasonCode);
      }
    }

    const outcome = this.determineOutcome(
      activeRules,
      matchedRules,
      failedRules,
      missingFacts,
      excludedActivity,
    );

    const result: EligibilityGuidanceResult = {
      outcome,
      reasonCodes: [...new Set(reasonCodes)],
      matchedRules,
      failedRules,
      missingFacts: [...new Set(missingFacts)],
      excludedActivity,
      dependencies: dependencyCodes,
      recommendedNextAction: RECOMMENDED_ACTIONS[outcome],
      disclaimer: ELIGIBILITY_GUIDANCE_DISCLAIMER,
      governmentServiceId,
      governmentServiceVersionId: versionId,
      versionLabel,
      evaluatedAt: now.toISOString(),
    };

    this.assertNoForbiddenOutcome(result);
    return result;
  }

  private async evaluateRule(
    rule: ServiceEligibilityRule,
    facts: ApplicantFacts,
  ): Promise<RuleEvaluation> {
    if (rule.category === ServiceEligibilityRuleCategory.REPRESENTATIVE_REQUIREMENT) {
      return this.evaluateRepresentativeRequirement(rule, facts);
    }

    const factValue = this.resolveFactValue(rule, facts);
    if (factValue === undefined) {
      return {
        matched: false,
        missingFact: true,
        reasonCode: ELIGIBILITY_REASON_CODES.MISSING_FACT,
        rule,
      };
    }

    const matched = this.applyOperator(rule.operator, factValue, rule.expectedValue);
    const reasonCode = matched ? rule.reasonCode : rule.reasonCode;

    return { matched, missingFact: false, reasonCode, rule };
  }

  private async evaluateRepresentativeRequirement(
    rule: ServiceEligibilityRule,
    facts: ApplicantFacts,
  ): Promise<RuleEvaluation> {
    const context = facts.representativeContext;
    if (!context?.organizationId || !context.identityId) {
      return {
        matched: false,
        missingFact: true,
        reasonCode: ELIGIBILITY_REASON_CODES.MISSING_FACT,
        rule,
      };
    }

    const now = new Date();
    const representative = await this.prisma.representativeAuthority.findFirst({
      where: {
        organizationId: context.organizationId,
        identityId: context.identityId,
        status: RepresentativeAuthorityStatus.ACTIVE,
        effectiveFrom: { lte: now },
        OR: [{ effectiveUntil: null }, { effectiveUntil: { gt: now } }],
      },
    });

    const matched = representative !== null;
    return {
      matched,
      missingFact: false,
      reasonCode: matched
        ? ELIGIBILITY_REASON_CODES.REPRESENTATIVE_PRESENT
        : ELIGIBILITY_REASON_CODES.REPRESENTATIVE_ABSENT,
      rule,
    };
  }

  private resolveFactValue(rule: ServiceEligibilityRule, facts: ApplicantFacts): unknown {
    const categoryKey = CATEGORY_FACT_KEYS[rule.category];
    if (!categoryKey) {
      return undefined;
    }

    const topLevel = (facts as Record<string, unknown>)[categoryKey];
    if (topLevel !== undefined) {
      if (
        rule.category === ServiceEligibilityRuleCategory.REQUIRED_ATTRIBUTE ||
        rule.category === ServiceEligibilityRuleCategory.OTHER_STRUCTURED_RULE
      ) {
        const attrs = topLevel as Record<string, unknown>;
        return attrs[rule.attributeKey];
      }
      if (rule.category === ServiceEligibilityRuleCategory.PREREQUISITE_STATUS) {
        const statuses = topLevel as Record<string, string>;
        return statuses[rule.attributeKey];
      }
      return topLevel;
    }

    if (facts.attributes && rule.attributeKey in facts.attributes) {
      return facts.attributes[rule.attributeKey];
    }

    return undefined;
  }

  applyOperator(
    operator: ServiceEligibilityRuleOperator,
    actual: unknown,
    expected: unknown,
  ): boolean {
    const expectedValue = this.unwrapExpected(expected);

    switch (operator) {
      case ServiceEligibilityRuleOperator.EQUALS:
        return String(actual) === String(expectedValue);
      case ServiceEligibilityRuleOperator.NOT_EQUALS:
        return String(actual) !== String(expectedValue);
      case ServiceEligibilityRuleOperator.IN:
        return Array.isArray(expectedValue) && expectedValue.map(String).includes(String(actual));
      case ServiceEligibilityRuleOperator.NOT_IN:
        return Array.isArray(expectedValue) && !expectedValue.map(String).includes(String(actual));
      case ServiceEligibilityRuleOperator.EXISTS:
        return actual !== undefined && actual !== null && actual !== '';
      case ServiceEligibilityRuleOperator.NOT_EXISTS:
        return actual === undefined || actual === null || actual === '';
      case ServiceEligibilityRuleOperator.GREATER_THAN:
        return Number(actual) > Number(expectedValue);
      case ServiceEligibilityRuleOperator.GREATER_THAN_OR_EQUAL:
        return Number(actual) >= Number(expectedValue);
      case ServiceEligibilityRuleOperator.LESS_THAN:
        return Number(actual) < Number(expectedValue);
      case ServiceEligibilityRuleOperator.LESS_THAN_OR_EQUAL:
        return Number(actual) <= Number(expectedValue);
      case ServiceEligibilityRuleOperator.CONTAINS:
        if (Array.isArray(actual)) {
          return actual.map(String).includes(String(expectedValue));
        }
        return String(actual).includes(String(expectedValue));
      default:
        return false;
    }
  }

  private unwrapExpected(expected: unknown): unknown {
    if (typeof expected === 'object' && expected !== null && 'value' in expected) {
      return expected.value;
    }
    return expected;
  }

  private determineOutcome(
    activeRules: ServiceEligibilityRule[],
    matchedRules: MatchedRuleSummary[],
    failedRules: MatchedRuleSummary[],
    missingFacts: string[],
    excludedActivity?: string,
  ): EligibilityGuidanceOutcome {
    if (excludedActivity) {
      return EligibilityGuidanceOutcome.OUTSIDE_PUBLISHED_SCOPE;
    }

    if (missingFacts.length > 0) {
      return EligibilityGuidanceOutcome.MORE_INFORMATION_REQUIRED;
    }

    const exclusionFailures = failedRules.filter(
      (r) => r.category === ServiceEligibilityRuleCategory.EXCLUSION,
    );
    if (exclusionFailures.length > 0) {
      return EligibilityGuidanceOutcome.OUTSIDE_PUBLISHED_SCOPE;
    }

    if (failedRules.length > 0) {
      const referOutcome = failedRules.some(
        (r) =>
          activeRules.find((rule) => rule.id === r.ruleId)?.onFailureOutcome ===
          EligibilityGuidanceOutcome.REFER_TO_OTHER_SERVICE,
      );
      if (referOutcome) {
        return EligibilityGuidanceOutcome.REFER_TO_OTHER_SERVICE;
      }
      return EligibilityGuidanceOutcome.LIKELY_INELIGIBLE;
    }

    if (activeRules.length === 0) {
      return EligibilityGuidanceOutcome.UNRESOLVED;
    }

    if (matchedRules.length === activeRules.length) {
      return EligibilityGuidanceOutcome.LIKELY_ELIGIBLE;
    }

    return EligibilityGuidanceOutcome.UNRESOLVED;
  }

  private assertNoForbiddenOutcome(result: EligibilityGuidanceResult): void {
    const outcomeStr = result.outcome as string;
    if ((FORBIDDEN_ELIGIBILITY_OUTCOMES as readonly string[]).includes(outcomeStr)) {
      throw new Error(`Forbidden eligibility outcome: ${outcomeStr}`);
    }
  }
}
