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
