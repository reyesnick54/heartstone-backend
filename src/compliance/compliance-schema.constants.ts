export const PHASE_9A_MODEL_NAMES = [
  'ComplianceMatter',
  'ContinuingObligation',
  'ObligationSchedule',
  'ObligationStatusHistory',
] as const;

export const PHASE_9A_ENUM_NAMES = [
  'ComplianceMatterStatus',
  'ContinuingObligationSourceType',
  'ContinuingObligationType',
  'ContinuingObligationStatus',
  'ObligationScheduleStatus',
  'ObligationStatusChangeActor',
] as const;

export const COMPLIANCE_MATTER_STATUSES = [
  'OPEN',
  'MONITORING',
  'AWAITING_REPORT',
  'UNDER_REVIEW',
  'INSPECTION_REQUIRED',
  'CORRECTIVE_ACTION',
  'ESCALATED',
  'REFERRED_EXTERNALLY',
  'SAFE_HALTED',
  'CLOSED',
] as const;

export const CONTINUING_OBLIGATION_STATUSES = [
  'NOT_YET_DUE',
  'DUE',
  'SUBMITTED',
  'UNDER_REVIEW',
  'SATISFIED',
  'PARTIALLY_SATISFIED',
  'OVERDUE',
  'DISPUTED',
  'EXEMPTED_BY_AUTHORIZED_ACTION',
  'SUPERSEDED',
  'CLOSED',
] as const;
