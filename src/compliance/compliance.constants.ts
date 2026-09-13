export const COMPLIANCE_MATTER_NUMBER_PREFIX = 'CM';

export const PROTECTED_OBLIGATION_STATUS_FIELDS = ['status'] as const;

export const HOLDER_ALLOWED_OBLIGATION_STATUSES = [
  'SUBMITTED',
  'DISPUTED',
] as const;

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
