export const NON_PRODUCTION_APPLICATIONS_FIXTURE_MARKER = 'NON_PRODUCTION-APP';

export const APPLICATION_NUMBER_PREFIX = 'APP';

export const SUBMISSION_RECEIPT_DISCLAIMER =
  'This acknowledgment confirms receipt of your submission only. Receipt does NOT establish completeness, eligibility, technical compliance, professional acceptance, approval, issuance, or project readiness.';

export const APPLICATION_EDITABLE_STATUSES = ['DRAFT', 'READY_FOR_SUBMISSION'] as const;

export const APPLICATION_SUBMITTABLE_STATUSES = ['DRAFT', 'READY_FOR_SUBMISSION'] as const;

export const APPLICATION_RESUBMITTABLE_STATUSES = ['CORRECTION_REQUESTED'] as const;

export const APPLICATION_WITHDRAWABLE_STATUSES = [
  'DRAFT',
  'READY_FOR_SUBMISSION',
  'CORRECTION_REQUESTED',
] as const;
