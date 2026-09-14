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

export const PHASE_9C_BOUNDARY_DISCLAIMER =
  'Phase 9C governs inspection planning, assignment, and scheduling. Scheduling does not establish a violation, sanction, or enforcement outcome.';

export const INSPECTION_NUMBER_PREFIX = 'INSP';

export const FORBIDDEN_AI_INSPECTION_ACTIONS = [
  'ORDER_INSPECTION',
  'APPROVE_INSPECTION_PLAN',
  'ASSIGN_INSPECTOR',
  'AUTHORIZE_UNANNOUNCED',
] as const;

export const INSPECTION_COMPLIANCE_REASON_CODES = {
  ASSIGNMENT_NOT_AUTHORITY: 'ASSIGNMENT_NOT_AUTHORITY',
  WRONG_JURISDICTION: 'WRONG_JURISDICTION',
  EXPIRED_APPOINTMENT: 'EXPIRED_APPOINTMENT',
  EXPIRED_QUALIFICATION: 'EXPIRED_QUALIFICATION',
  CONFLICTED_INSPECTOR: 'CONFLICTED_INSPECTOR',
  UNANNOUNCED_NOT_CONFIGURED: 'UNANNOUNCED_NOT_CONFIGURED',
  RISK_SCORE_ALONE_INSUFFICIENT: 'RISK_SCORE_ALONE_INSUFFICIENT',
  AI_CANNOT_ORDER_INSPECTION: 'AI_CANNOT_ORDER_INSPECTION',
  SCOPE_SILENT_EXPANSION: 'SCOPE_SILENT_EXPANSION',
  TRIGGER_REFERENCE_REQUIRED: 'TRIGGER_REFERENCE_REQUIRED',
  TECHNICAL_ADMIN_SELF_ASSIGN: 'TECHNICAL_ADMIN_SELF_ASSIGN',
  SCHEDULING_NOT_VIOLATION: 'SCHEDULING_NOT_VIOLATION',
  INSPECTION_TYPE_INACTIVE: 'INSPECTION_TYPE_INACTIVE',
  NOTICE_REQUIREMENTS_NOT_MET: 'NOTICE_REQUIREMENTS_NOT_MET',
} as const;

export const NOTICE_DETAIL_FIELDS = [
  'authority',
  'scope',
  'time',
  'place',
  'documentsRequested',
  'accessRequested',
  'recipient',
  'delivery',
  'rights',
  'obligations',
  'contact',
  'confidentiality',
] as const;
