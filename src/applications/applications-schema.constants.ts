export const APPLICATIONS_MODEL_NAMES = [
  'ApplicationCase',
  'ApplicationSubmission',
  'CaseWorkflowTransition',
  'CompletenessReview',
  'CompletenessReviewItem',
  'DeficiencyNotice',
  'DeficiencyNoticeItem',
  'ApplicantInformationRequest',
  'ApplicationCaseNotificationOutbox',
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
