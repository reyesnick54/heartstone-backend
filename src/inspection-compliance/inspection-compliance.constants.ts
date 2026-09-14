export const COMPLIANCE_ASSESSMENT_NUMBER_PREFIX = 'CAS';
export const NONCOMPLIANCE_FINDING_NUMBER_PREFIX = 'NCF';
export const ENFORCEMENT_REFERRAL_NUMBER_PREFIX = 'ENR';
export const PROTECTIVE_ACTION_NUMBER_PREFIX = 'PAR';
export const EMERGENCY_INTERIM_ACTION_NUMBER_PREFIX = 'EIA';

export const NON_PRODUCTION_PHASE_9F_FIXTURE_MARKER = 'NON_PRODUCTION_PHASE_9F_TEST_ONLY';

export const PHASE_9F_BOUNDARY_DISCLAIMER =
  'Phase 9F records compliance assessments, noncompliance findings, escalations, enforcement referrals, protective action recommendations, and emergency interim actions. Compliance signals are not violations. Referrals are not prosecutions. Recommendations do not change legal instrument status. Actual suspension or revocation requires Phase 8 controlled lifecycle machinery.';

export const OVERDUE_OBLIGATION_NOT_VIOLATION_MESSAGE =
  'An overdue obligation is a compliance signal and does not automatically create a noncompliance finding';

export const AI_ALERT_NOT_VIOLATION_MESSAGE =
  'AI risk flags and alerts do not constitute confirmed noncompliance findings';

export const RISK_SCORE_NOT_VIOLATION_MESSAGE =
  'A risk score or monitoring signal does not equal a legal violation finding';

export const FINDING_REQUIRES_AUTHORIZED_HUMAN_MESSAGE =
  'Noncompliance findings require authorized human confirmation; AI cannot confirm violations';

export const REFERRAL_NOT_PROSECUTION_MESSAGE =
  'An enforcement referral coordinates with competent authority; it is not prosecution or a sanction';

export const REFERRAL_NOT_GOVERNMENT_DECISION_MESSAGE =
  'An enforcement referral does not constitute a government decision or enforcement action taken';

export const RETAINED_NATIONAL_AUTHORITY_MESSAGE =
  'Retained criminal, regulatory, border, customs, or judicial authority remains with the competent national authority; HeartStone coordinates only';

export const PROTECTIVE_RECOMMENDATION_NO_INSTRUMENT_CHANGE_MESSAGE =
  'Protective action recommendations do not change official instrument status';

export const PHASE_8_REQUIRED_FOR_INSTRUMENT_CHANGE_MESSAGE =
  'Actual suspension, revocation, amendment, restriction, or reinstatement must use Phase 8 controlled lifecycle machinery';

export const EMERGENCY_INTERIM_NOT_FINAL_MESSAGE =
  'Emergency interim action is time-limited and does not constitute a final determination';

export const EMERGENCY_REVIEW_REQUIRED_MESSAGE =
  'Emergency interim action requires post-action review by the configured review deadline';

export const TECHNICAL_ADMIN_CANNOT_SANCTION_MESSAGE =
  'Technical administrative authority cannot impose sanctions or confirm noncompliance findings';

export const CASE_ASSIGNMENT_NO_ENFORCEMENT_AUTHORITY_MESSAGE =
  'Case assignment does not create enforcement authority';

export const FORBIDDEN_AI_COMPLIANCE_ACTIONS = [
  'CONFIRM_FINDING',
  'IMPOSE_PENALTY',
  'SUSPEND',
  'REVOKE',
  'ORDER_CLOSURE',
  'REFER_FOR_PROSECUTION',
] as const;

export const RETAINED_ENFORCEMENT_AUTHORITY_CLASSES = [
  'CRIMINAL',
  'NATIONAL_REGULATORY',
  'BORDER_CUSTOMS',
  'JUDICIAL',
  'OTHER_RETAINED',
] as const;
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
