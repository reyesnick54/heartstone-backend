export const EXPERIENCE_ACTION_TYPES = {
  TASK: 'TASK',
  REVIEW: 'REVIEW',
  PAYMENT: 'PAYMENT',
  RESPONSE: 'RESPONSE',
  RENEWAL: 'RENEWAL',
  ACKNOWLEDGMENT: 'ACKNOWLEDGMENT',
  WORKFLOW: 'WORKFLOW',
  DECISION: 'DECISION',
} as const;

export type ExperienceActionType =
  (typeof EXPERIENCE_ACTION_TYPES)[keyof typeof EXPERIENCE_ACTION_TYPES];

export const EXPERIENCE_ACTION_STATUSES = {
  OPEN: 'OPEN',
  PENDING: 'PENDING',
  OVERDUE: 'OVERDUE',
  AVAILABLE: 'AVAILABLE',
  UNAVAILABLE: 'UNAVAILABLE',
} as const;

export type ExperienceActionStatus =
  (typeof EXPERIENCE_ACTION_STATUSES)[keyof typeof EXPERIENCE_ACTION_STATUSES];

export const EXPERIENCE_INBOX_ITEM_TYPES = {
  SECURE_GOVERNMENT_MESSAGE: 'secure_government_message',
  REQUEST_FOR_INFORMATION: 'request_for_information',
  PAYMENT_NOTICE: 'payment_notice',
  APPOINTMENT_UPDATE: 'appointment_update',
  DECISION_NOTICE: 'decision_notice',
  RENEWAL_NOTICE: 'renewal_notice',
  COMPLIANCE_MESSAGE: 'compliance_message',
  APPEAL_REDRESS_MESSAGE: 'appeal_redress_message',
} as const;

export type ExperienceInboxItemType =
  (typeof EXPERIENCE_INBOX_ITEM_TYPES)[keyof typeof EXPERIENCE_INBOX_ITEM_TYPES];
