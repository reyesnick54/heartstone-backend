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
export const OBSERVATION_IS_NOT_VIOLATION_MESSAGE =
  'Inspection observation cannot contain an automatic legal conclusion or violation determination';

export const FINDING_IS_NOT_SANCTION_MESSAGE =
  'Inspection finding severity and disposition do not constitute a sanction; enforcement requires separate authorized action';

export const AI_CANNOT_CONFIRM_VIOLATION_MESSAGE =
  'AI assistance cannot confirm an inspection finding or violation determination';

export const FINDING_REQUIRES_REQUIREMENT_SOURCE_MESSAGE =
  'Inspection finding must reference an applicable requirement or governing source';

export const SUBJECT_RESPONSE_PRESERVATION_MESSAGE =
  'Subject responses are recorded separately and must not overwrite original observations or findings';

export const SCOPE_AMENDMENT_REQUIRES_APPROVAL_MESSAGE =
  'Inspection scope expansion requires a controlled amendment with explicit approval';

export const INSPECTOR_OUTSIDE_AUTHORITY_MESSAGE =
  'Inspector cannot make consequential inspection decisions outside evaluated institutional authority';

export const COMPLETION_IS_NOT_COMPLIANCE_CERTIFICATION_MESSAGE =
  'Inspection completion does not constitute compliance certification unless separately authorized';

export const COMPLETION_DOES_NOT_SUSPEND_INSTRUMENT_MESSAGE =
  'Inspection completion does not automatically suspend or revoke an official instrument';

export const ADVERSE_EVIDENCE_PRESERVATION_MESSAGE =
  'Adverse evidence and unfavorable observations must be preserved and cannot be overwritten';
