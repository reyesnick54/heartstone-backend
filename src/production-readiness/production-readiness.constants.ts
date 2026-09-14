export const NON_PRODUCTION_PHASE_13G_FIXTURE_MARKER = 'NON_PRODUCTION_PHASE_13G_TEST_ONLY';

export const PRODUCTION_READINESS_BOUNDARY_DISCLAIMER =
  'Institutional acceptance, residual-risk acceptance, and production activation are distinct institutional controls. Technical readiness, passed tests, vendor delivery, payment milestones, and training completion do not constitute institutional acceptance or production activation.';

export const FORBIDDEN_CLIENT_ACCEPTANCE_FIELDS = [
  'institutionallyAccepted',
  'frozenAt',
  'submittedForFinalAcceptanceAt',
  'acceptanceDecision',
  'residualRiskAccepted',
  'productionActivated',
  'operationallyAvailable',
] as const;

export const FORBIDDEN_ACCEPTANCE_BASIS_TYPES = [
  'VENDOR_DELIVERY',
  'PAYMENT_MILESTONE',
  'TRAINING_COMPLETION',
  'PASSED_TESTS',
  'TECHNICAL_PRODUCTION_ACCEPTANCE',
  'DEVELOPER_SELF_ACCEPTANCE',
] as const;

export const INSTITUTIONAL_ACCEPTANCE_LEVELS = ['INSTITUTIONAL', 'OPERATIONAL_ACTIVATION'] as const;

export const TECHNICAL_ACCEPTANCE_LEVELS = [
  'RECEIPT',
  'ADMINISTRATIVE_COMPLETENESS',
  'DISCOVERY',
  'DESIGN',
  'PROTOTYPE',
  'TEST',
  'PILOT',
  'TECHNICAL_PRODUCTION',
] as const;

export const ACCEPTANCE_LEVEL_ORDER: Record<string, number> = {
  RECEIPT: 1,
  ADMINISTRATIVE_COMPLETENESS: 2,
  DISCOVERY: 3,
  DESIGN: 4,
  PROTOTYPE: 5,
  TEST: 6,
  PILOT: 7,
  TECHNICAL_PRODUCTION: 8,
  OPERATIONAL: 9,
  DEPARTMENTAL: 10,
  WORKFLOW: 11,
  INTEGRATION: 12,
  AI_AGENT: 13,
  ISSUANCE: 14,
  INSTITUTIONAL: 15,
  OPERATIONAL_ACTIVATION: 16,
  REVALIDATION: 17,
};

export const ACCEPTANCE_REVIEW_CLASSES = [
  'INSTITUTIONAL',
  'OPERATIONAL',
  'TECHNICAL',
  'SECURITY',
  'PRIVACY',
  'RECORDS',
  'CONTINUITY',
  'LEGAL',
  'PROFESSIONAL',
  'INTEGRATION',
  'AI_GOVERNANCE',
  'ACCESSIBILITY',
  'FINANCIAL',
  'OTHER_CONFIGURED',
] as const;

export const PRODUCTION_ACTIVATION_APPROVED_OUTCOMES = [
  'APPROVED',
  'APPROVED_WITH_RESTRICTIONS',
] as const;
