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
  'CaseMilestone',
  'CasePublicStatusProjection',
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
