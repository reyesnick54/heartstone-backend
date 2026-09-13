export const NON_PRODUCTION_INSPECTION_COMPLIANCE_FIXTURE_MARKER =
  'NON_PRODUCTION_INSPECTION_COMPLIANCE_TEST_ONLY';

export const COMPLIANCE_MATTER_NUMBER_PREFIX = 'CM';
export const INSPECTION_FINDING_NUMBER_PREFIX = 'IF';
export const CORRECTIVE_ACTION_PLAN_NUMBER_PREFIX = 'CAP';
export const COMPLIANCE_FINDING_CLOSURE_NUMBER_PREFIX = 'CFC';
export const COMPLIANCE_FINDING_REOPENING_NUMBER_PREFIX = 'CFR';

export const TECHNICAL_ADMIN_ROLE_MARKER = 'TECHNICAL_ADMIN';
export const AI_ACTOR_ROLE_MARKER = 'AI_ASSISTANT';
export const HOLDER_ROLE_MARKER = 'LICENSE_HOLDER';

export const IMMEDIATE_ACTION_ROUTES = [
  'IMMEDIATE_RESTRICTION',
  'PHASE_8_SUSPENSION',
  'PHASE_8_REVOCATION',
  'RETAINED_NATIONAL_REFERRAL',
  'EMERGENCY_ACTION',
] as const;

export const CORRECTIVE_ACTION_TERMINAL_STATUSES = [
  'VERIFIED_COMPLETE',
  'CLOSED',
] as const;

export const PHASE_9E_BOUNDARY_DISCLAIMER =
  'Corrective action supports remediable compliance deficiencies. It is not punishment and does not substitute for immediate protective action when risk requires suspension, revocation, or emergency measures.';
