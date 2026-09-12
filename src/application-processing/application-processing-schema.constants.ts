export const APPLICATION_PROCESSING_MODEL_NAMES = [
  'Application',
  'ApplicationSubmission',
  'Case',
  'CaseStatusHistory',
  'WorkflowDefinition',
  'WorkflowVersion',
  'WorkflowStageDefinition',
  'WorkflowStepDefinition',
  'WorkflowTransitionDefinition',
  'CaseWorkflowInstance',
  'CaseWorkflowStepInstance',
  'CompletenessReview',
  'DeficiencyNotice',
  'ApplicantInformationRequest',
  'CaseAssignment',
  'CaseReferral',
  'CaseReferralResponse',
  'CaseSlaClock',
  'CaseEscalation',
  'CaseIssue',
  'CaseEvent',
  'CaseCommunication',
  'CaseCommunicationOutbox',
  'CaseMilestone',
  'CasePublicStatusProjection',
] as const;

export const CASE_EVENT_TYPES = [
  'APPLICATION_RECEIVED',
  'ACKNOWLEDGMENT_ISSUED',
  'CASE_CREATED',
  'CASE_OPENED',
  'CASE_ASSIGNED',
  'WORKFLOW_STARTED',
  'STEP_STARTED',
  'STEP_COMPLETED',
  'COMPLETENESS_REVIEW_STARTED',
  'COMPLETENESS_STARTED',
  'COMPLETENESS_REVIEW_COMPLETED',
  'COMPLETENESS_COMPLETED',
  'DEFICIENCY_ISSUED',
  'APPLICANT_CORRECTION_RECEIVED',
  'APPLICANT_RESPONSE_RECEIVED',
  'REFERRAL_CREATED',
  'REFERRAL_ACKNOWLEDGED',
  'REFERRAL_RESPONSE_RECEIVED',
  'REFERRED',
  'ASSIGNMENT_CREATED',
  'SLA_CLOCK_STARTED',
  'SAFE_HALT',
  'DECISION_PENDING',
  'WITHDRAWN',
  'CLOSED',
] as const;

export const CASE_COMMUNICATION_TYPES = [
  'APPLICANT_MESSAGE',
  'DEFICIENCY_NOTICE',
  'REQUEST_FOR_INFORMATION',
  'STATUS_UPDATE',
  'REFERRAL_NOTICE',
  'INTERNAL_NOTE',
  'EXTERNAL_CORRESPONDENCE',
  'SYSTEM_NOTICE',
] as const;

export const CASE_MILESTONE_STATUSES = [
  'UPCOMING',
  'IN_PROGRESS',
  'AT_RISK',
  'DELAYED',
  'COMPLETED',
  'CANCELLED',
] as const;

export const CASE_PUBLIC_STATUS_STAGES = [
  'RECEIVED',
  'CHECKING_SUBMISSION',
  'MORE_INFORMATION_NEEDED',
  'UNDER_REVIEW',
  'WAITING_ON_OTHER_AUTHORITY',
  'PROFESSIONAL_REVIEW',
  'INSPECTION',
  'DECISION_PENDING',
  'COMPLETED',
  'CLOSED',
] as const;

export const PUBLIC_STATUS_STAGE_LABELS: Record<string, string> = {
  RECEIVED: 'Received',
  CHECKING_SUBMISSION: 'Checking your submission',
  MORE_INFORMATION_NEEDED: 'More information needed',
  UNDER_REVIEW: 'Under review',
  WAITING_ON_OTHER_AUTHORITY: 'Waiting on another authority',
  PROFESSIONAL_REVIEW: 'Professional review',
  INSPECTION: 'Inspection',
  DECISION_PENDING: 'Decision pending',
  COMPLETED: 'Completed',
  CLOSED: 'Closed',
};

export const APPLICANT_STATUS_DISCLAIMER =
  'This status is informational only and does not constitute a government decision or approval.';

export const FORBIDDEN_CLIENT_SETTABLE_CASE_FIELDS = [
  'publicStage',
  'publicStageLabel',
  'publicStageDetail',
  'status',
  'legalStatus',
  'projectionVersion',
] as const;

export const FORBIDDEN_APPLICATION_AUTHORITY_FIELDS = [
  'hasAuthority',
  'authorityGranted',
  'decisionOutcome',
  'approvalStatus',
  'eligibilityStatus',
  'issuedLicenseId',
  'issuedPermitId',
] as const;

export const FORBIDDEN_CASE_CLIENT_MUTATION_FIELDS = [
  'decisionOutcome',
  'approvalStatus',
  'issuedAt',
  'refusalReason',
] as const;
