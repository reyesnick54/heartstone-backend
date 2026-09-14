export const COMPLIANCE_MATTER_NUMBER_PREFIX = 'CM';
export const COMPLIANCE_SUBMISSION_NUMBER_PREFIX = 'CSUB';
export const COMPLIANCE_REVIEW_NUMBER_PREFIX = 'CREV';

export const FORBIDDEN_COMPLIANCE_SUBMISSION_CLIENT_FIELDS = [
  'status',
  'currentVersionId',
  'submittedAt',
] as const;

export const FORBIDDEN_COMPLIANCE_REVIEW_CLIENT_FIELDS = [
  'status',
  'finalizedAt',
  'isAiProposed',
  'authorityEvaluationRecordId',
] as const;

export const FORBIDDEN_AI_COMPLIANCE_ACTIONS = [
  'DECLARE_VIOLATION',
  'DECLARE_LEGAL_COMPLIANCE',
  'WAIVE_EVIDENCE',
  'CHANGE_DEADLINE',
  'INITIATE_ENFORCEMENT',
  'FINALIZE_REVIEW',
  'MARK_OBLIGATION_SATISFIED',
] as const;

export const CONSEQUENTIAL_REVIEW_STATUSES = [
  'SATISFACTORY_FOR_STATED_PURPOSE',
  'DEFICIENCY_IDENTIFIED',
] as const;

export const PHASE_9B_BOUNDARY_DISCLAIMER =
  'Compliance submission receipt records filing only; it does not constitute verification or a compliance determination.';

export const PROTECTED_OBLIGATION_STATUS_FIELDS = ['status'] as const;

export const HOLDER_ALLOWED_OBLIGATION_STATUSES = ['SUBMITTED', 'DISPUTED'] as const;

export const REVIEWER_ALLOWED_OBLIGATION_STATUSES = [
  'UNDER_REVIEW',
  'PARTIALLY_SATISFIED',
  'SATISFIED',
  'EXEMPTED_BY_AUTHORIZED_ACTION',
  'CLOSED',
] as const;

export const FORBIDDEN_CLIENT_OBLIGATION_FIELDS = [
  'status',
  'dueDate',
  'description',
  'approvedConditionText',
  'approvedConditionTextHash',
  'recurrenceConfiguration',
] as const;

export const ALLOWED_RECURRENCE_RULE_TYPES = [
  'ONE_TIME',
  'MONTHLY',
  'QUARTERLY',
  'ANNUAL',
  'BIENNIAL',
  'CUSTOM_INTERVAL_DAYS',
] as const;

export type RecurrenceRuleType = (typeof ALLOWED_RECURRENCE_RULE_TYPES)[number];

export interface ControlledRecurrenceConfiguration {
  ruleType: RecurrenceRuleType;
  intervalDays?: number;
  dayOfMonth?: number;
  monthOfYear?: number;
  occurrences?: number;
}
