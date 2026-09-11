import { EligibilityGuidanceOutcome } from '@prisma/client';

export const NON_PRODUCTION_SERVICE_CATALOG_FIXTURE_MARKER =
  'NON_PRODUCTION_SERVICE_CATALOG_TEST_ONLY';

export const ELIGIBILITY_GUIDANCE_DISCLAIMER =
  'This result is preliminary eligibility guidance only. It is based on information you supplied or that is currently available to the system. ' +
  'It does not establish completeness of your submission, does not waive any statutory or regulatory requirements, does not guarantee approval, ' +
  'does not bind the authorized decision-maker, and may change if facts or controlling requirements change. ' +
  'Eligibility guidance is not an eligibility determination, approval, exercise of authority, or case decision.';

export const FORBIDDEN_ELIGIBILITY_OUTCOMES = ['APPROVED'] as const;

export const ELIGIBILITY_REASON_CODES = {
  APPLICANT_CATEGORY_MATCH: 'APPLICANT_CATEGORY_MATCH',
  APPLICANT_CATEGORY_MISMATCH: 'APPLICANT_CATEGORY_MISMATCH',
  EXCLUDED_ACTIVITY: 'EXCLUDED_ACTIVITY',
  MISSING_FACT: 'MISSING_FACT',
  REPRESENTATIVE_PRESENT: 'REPRESENTATIVE_PRESENT',
  REPRESENTATIVE_ABSENT: 'REPRESENTATIVE_ABSENT',
  REPRESENTATIVE_NOT_ELIGIBILITY: 'REPRESENTATIVE_NOT_ELIGIBILITY',
  RULE_MATCHED: 'RULE_MATCHED',
  RULE_FAILED: 'RULE_FAILED',
  UNKNOWN_RULE: 'UNKNOWN_RULE',
  UNKNOWN_OPERATOR: 'UNKNOWN_OPERATOR',
  OUTSIDE_SCOPE: 'OUTSIDE_SCOPE',
  ALL_RULES_SATISFIED: 'ALL_RULES_SATISFIED',
  REFER_TO_DEPENDENCY: 'REFER_TO_DEPENDENCY',
} as const;

export const CATEGORY_FACT_KEYS: Record<string, string> = {
  APPLICANT_CATEGORY: 'applicantCategory',
  ENTITY_TYPE: 'entityType',
  RESIDENCY_STATUS: 'residencyStatus',
  ACTIVITY: 'activity',
  LOCATION: 'location',
  GEOGRAPHIC_SCOPE: 'geographicScope',
  AGE_OR_THRESHOLD: 'age',
  OWNERSHIP_ATTRIBUTE: 'ownershipAttributes',
  EMPLOYER_STATUS: 'employerStatus',
  PREREQUISITE_STATUS: 'prerequisiteStatuses',
  REPRESENTATIVE_REQUIREMENT: 'representativeContext',
  EXCLUSION: 'activity',
  REQUIRED_ATTRIBUTE: 'attributes',
  OTHER_STRUCTURED_RULE: 'attributes',
};

export const OPERATORS_REQUIRING_VALUE = new Set([
  'EQUALS',
  'NOT_EQUALS',
  'IN',
  'NOT_IN',
  'GREATER_THAN',
  'GREATER_THAN_OR_EQUAL',
  'LESS_THAN',
  'LESS_THAN_OR_EQUAL',
  'CONTAINS',
]);

export const OPERATORS_REQUIRING_NUMERIC = new Set([
  'GREATER_THAN',
  'GREATER_THAN_OR_EQUAL',
  'LESS_THAN',
  'LESS_THAN_OR_EQUAL',
]);

export const RECOMMENDED_ACTIONS: Record<EligibilityGuidanceOutcome, string> = {
  [EligibilityGuidanceOutcome.LIKELY_ELIGIBLE]:
    'You may wish to review official requirements and proceed to pre-application preparation when ready.',
  [EligibilityGuidanceOutcome.LIKELY_INELIGIBLE]:
    'Review the listed reasons and consider whether a different service or additional information may apply.',
  [EligibilityGuidanceOutcome.MORE_INFORMATION_REQUIRED]:
    'Provide the missing facts listed below and run the check again.',
  [EligibilityGuidanceOutcome.OUTSIDE_PUBLISHED_SCOPE]:
    'This service does not appear to cover the described activity. Consider alternative services.',
  [EligibilityGuidanceOutcome.REFER_TO_OTHER_SERVICE]:
    'A related service may be more appropriate. Review the recommended services.',
  [EligibilityGuidanceOutcome.UNRESOLVED]:
    'The system could not produce reliable guidance. Contact the administering institution for assistance.',
};

export const IMMUTABLE_PUBLISHED_MATURITY_STATUSES = [
  'RECOGNIZED',
  'APPROVED',
  'CONFIGURED',
  'TESTED',
  'ACCEPTED',
  'ACTIVE',
  'SUSPENDED',
  'SUPERSEDED',
  'RETIRED',
] as const;
