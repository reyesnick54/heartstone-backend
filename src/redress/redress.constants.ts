export const COMPLAINT_NUMBER_PREFIX = 'CMP';
export const SUBSTANTIVE_APPEAL_NUMBER_PREFIX = 'APL';

export const OPEN_SUBSTANTIVE_APPEAL_STATUSES = [
  'LODGED',
  'ACKNOWLEDGED',
  'UNDER_ADJUDICATION',
] as const;

export const ACTIVE_COMPLAINT_STATUSES = [
  'RECEIVED',
  'ACKNOWLEDGED',
  'ASSIGNED',
  'UNDER_INVESTIGATION',
  'AWAITING_RESPONSE',
  'REMEDY_PENDING',
  'ESCALATED',
] as const;

export const PROFESSIONAL_CONDUCT_ESCALATION_TARGET = 'PROFESSIONAL_BODY' as const;
export const PRIVACY_ESCALATION_TARGET = 'PRIVACY_COMMISSIONER' as const;
export const SECURITY_ESCALATION_TARGET = 'SECURITY_INCIDENT_TEAM' as const;

export const RESTRICTED_EVIDENCE_ACCESS_LEVELS = ['RESTRICTED', 'INTERNAL'] as const;

export const FORBIDDEN_CLIENT_COMPLAINT_FIELDS = [
  'isFactualFinding',
  'mayReverseFinalDecision',
  'affectsRiskScore',
  'isSubstantiveAppealOutcome',
  'doesNotAlterDecisionAuthority',
  'evidencePreserved',
  'decisionHistoryPreserved',
] as const;
