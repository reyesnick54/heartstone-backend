export const APPLICATIONS_MODEL_NAMES = [
  'Application',
  'ApplicationSubmission',
  'CompletenessReview',
  'DeficiencyNotice',
  'ApplicantInformationRequest',
] as const;

export const WORKFLOW_MODEL_NAMES = [
  'WorkflowDefinition',
  'WorkflowVersion',
  'WorkflowStageDefinition',
  'WorkflowStepDefinition',
  'WorkflowTransitionDefinition',
  'CaseWorkflowInstance',
  'CaseWorkflowStepInstance',
] as const;

export const CASE_WORKFLOW_STAGES = [
  'SUBMITTED',
  'COMPLETENESS_REVIEW',
  'INCOMPLETE',
  'WAITING_APPLICANT',
  'RESUBMITTED',
  'ADMINISTRATIVELY_COMPLETE',
  'SUBSTANTIVE_REVIEW',
  'SAFE_HALTED',
] as const;

export const COMPLETENESS_REVIEW_STATUSES = [
  'PENDING',
  'IN_REVIEW',
  'INCOMPLETE',
  'COMPLETE',
  'UNRESOLVED',
  'SAFE_HALTED',
] as const;

export const COMPLETENESS_REVIEW_ITEM_STATUSES = [
  'PRESENT',
  'MISSING',
  'ILLEGIBLE',
  'CORRUPTED',
  'APPARENTLY_INCONSISTENT',
  'SUBSTITUTION_PENDING',
  'NOT_APPLICABLE',
  'UNRESOLVED',
] as const;

export const FORBIDDEN_COMPLETENESS_ITEM_STATUSES = ['VERIFIED'] as const;

export const CASE_WORKFLOW_INSTANCE_STATUSES = [
  'NOT_STARTED',
  'ACTIVE',
  'WAITING_APPLICANT',
  'WAITING_EXTERNAL',
  'WAITING_PROFESSIONAL',
  'PAUSED',
  'SAFE_HALTED',
  'SUSPENDED',
  'COMPLETED',
  'CANCELLED',
] as const;

export const CASE_WORKFLOW_STEP_INSTANCE_STATUSES = [
  'PENDING',
  'READY',
  'IN_PROGRESS',
  'WAITING',
  'BLOCKED',
  'COMPLETED',
  'SKIPPED_AUTHORIZED',
  'SAFE_HALTED',
  'CANCELLED',
] as const;

export const WORKFLOW_STEP_TYPES = [
  'ADMINISTRATIVE',
  'DECISION_GATE',
  'ISSUANCE_GATE',
  'PARALLEL_FORK',
  'PARALLEL_JOIN',
  'WAITING_APPLICANT',
  'WAITING_EXTERNAL',
  'WAITING_PROFESSIONAL',
] as const;

export const TERMINAL_CASE_WORKFLOW_INSTANCE_STATUSES = [
  'COMPLETED',
  'CANCELLED',
  'SAFE_HALTED',
] as const;

export const TERMINAL_CASE_WORKFLOW_STEP_INSTANCE_STATUSES = [
  'COMPLETED',
  'SKIPPED_AUTHORIZED',
  'SAFE_HALTED',
  'CANCELLED',
] as const;

export const NON_PRODUCTION_APPLICATIONS_FIXTURE_MARKER = 'NON_PRODUCTION_PHASE_6D';
