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

export const PHASE_9C_MODEL_NAMES = [
  'InspectionTypeDefinition',
  'InspectionPlan',
  'InspectionAssignment',
  'InspectorQualificationSnapshot',
  'InspectionScheduleEvent',
] as const;

export const INSPECTION_PLAN_TRIGGER_TYPES = [
  'SCHEDULED_PERIODIC',
  'CONDITION_REQUIRED',
  'RENEWAL',
  'CORRECTIVE_ACTION_FOLLOW_UP',
  'INCIDENT',
  'COMPLAINT',
  'RISK_BASED',
  'RANDOMIZED_APPROVED_PROGRAM',
  'GOVERNMENT_REFERRAL',
  'PROFESSIONAL_REFERRAL',
  'OTHER_AUTHORIZED',
export const PHASE_9B_MODEL_NAMES = [
  'ComplianceSubmission',
  'ComplianceSubmissionVersion',
  'ObligationEvidenceLink',
  'ComplianceReview',
  'ComplianceReviewItem',
] as const;

export const PHASE_9B_ENUM_NAMES = [
  'ComplianceSubmissionStatus',
  'ObligationEvidenceLinkRole',
  'ComplianceReviewStatus',
] as const;

export const COMPLIANCE_SUBMISSION_STATUSES = [
  'RECEIVED',
  'INCOMPLETE',
  'COMPLETE_FOR_REVIEW',
  'UNDER_REVIEW',
  'CORRECTION_REQUESTED',
  'WITHDRAWN',
  'SUPERSEDED',
] as const;

export const COMPLIANCE_REVIEW_STATUSES = [
  'PENDING',
  'IN_REVIEW',
  'SATISFACTORY_FOR_STATED_PURPOSE',
  'DEFICIENCY_IDENTIFIED',
  'MORE_INFORMATION_REQUIRED',
  'DISPUTED',
  'SAFE_HALTED',
] as const;

export const FORBIDDEN_COMPLIANCE_REVIEW_STATUSES = [
  'VERIFIED_COMPLIANT',
  'LEGALLY_COMPLIANT',
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
