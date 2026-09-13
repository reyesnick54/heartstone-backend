export const PHASE_9E_MODEL_NAMES = [
  'ComplianceMatter',
  'InspectionFinding',
  'CorrectiveActionPlan',
  'CorrectiveActionItem',
  'CorrectiveActionSubmission',
  'CorrectiveActionSubmissionEvidence',
  'CorrectiveActionVerification',
  'CorrectiveActionVerificationEvidence',
  'ReinspectionRequirement',
  'ComplianceFindingClosure',
  'ComplianceFindingReopening',
] as const;

export const PHASE_9E_ENUM_NAMES = [
  'ComplianceMatterStatus',
  'ComplianceRiskLevel',
  'ComplianceImmediateActionRoute',
  'InspectionFindingStatus',
  'CorrectiveActionPlanStatus',
  'CorrectiveActionItemStatus',
  'CorrectiveActionSubmissionStatus',
  'CorrectiveActionVerificationResult',
  'ReinspectionRequirementStatus',
  'ComplianceFindingClosureStatus',
  'ComplianceFindingReopeningReason',
  'RootCauseAnalysisMethod',
] as const;

export const CORRECTIVE_ACTION_PLAN_STATUSES = [
  'PROPOSED',
  'REVIEW_REQUIRED',
  'APPROVED',
  'IN_PROGRESS',
  'EVIDENCE_SUBMITTED',
  'VERIFICATION_PENDING',
  'PARTIALLY_VERIFIED',
  'VERIFIED_COMPLETE',
  'OVERDUE',
  'FAILED',
  'ESCALATED',
  'SUPERSEDED',
  'CLOSED',
] as const;

export const CORRECTIVE_ACTION_VERIFICATION_RESULTS = [
  'VERIFIED',
  'PARTIALLY_VERIFIED',
  'NOT_VERIFIED',
  'UNRESOLVED',
  'REINSPECTION_REQUIRED',
] as const;
