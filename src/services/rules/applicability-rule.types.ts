import { type StructuredApplicabilityRuleType } from '@prisma/client';

export type ApplicabilityFacts = Record<string, unknown>;

export type ApplicabilityRuleEvaluationOutcome = 'APPLIES' | 'DOES_NOT_APPLY' | 'UNRESOLVED';

export interface ApplicabilityRuleEvaluationResult {
  outcome: ApplicabilityRuleEvaluationOutcome;
  reasonCode?: string;
}

export interface StructuredApplicabilityRuleRecord {
  id: string;
  ruleType: StructuredApplicabilityRuleType;
  configuration: unknown;
  status: string;
}

export interface CompositeRuleConfiguration {
  conditions?: StructuredRuleLeafConfiguration[];
}

export interface StructuredRuleLeafConfiguration {
  factKey?: string;
  value?: unknown;
  values?: unknown[];
}
