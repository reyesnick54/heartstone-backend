export const OFFICIAL_EXPERIENCE_API_TAG = 'Official Experience';

export const OFFICIAL_AUTHORITY_DISCLAIMER =
  'Authentication and institutional assignment do not confer universal government authority. Each consequential action requires separate authority evaluation at execution time.';

export const TECHNICAL_ADMIN_ROLE_MARKER = 'TECHNICAL_ADMIN';

export const OFFICIAL_ACTION_KEYS = {
  REVIEW_APPLICATION: 'review-application',
  REQUEST_ADDITIONAL_INFORMATION: 'request-additional-information',
  COMPLETE_WORKFLOW_STEP: 'complete-workflow-step',
  CREATE_REFERRAL: 'create-referral',
  REVIEW_EVIDENCE: 'review-evidence',
  PREPARE_DECISION: 'prepare-decision',
  APPROVE_DECISION: 'approve-decision',
  REFUSE_DECISION: 'refuse-decision',
  ISSUE_INSTRUMENT: 'issue-instrument',
  SCHEDULE_INSPECTION: 'schedule-inspection',
  RECORD_INSPECTION: 'record-inspection',
} as const;

export type OfficialActionKey = (typeof OFFICIAL_ACTION_KEYS)[keyof typeof OFFICIAL_ACTION_KEYS];

export const OFFICIAL_QUEUE_ITEM_TYPES = {
  ASSIGNED_CASE: 'assigned-case',
  DEPARTMENT_UNASSIGNED_CASE: 'department-unassigned-case',
  AWAITING_REVIEW: 'awaiting-review',
  COMPLETENESS_ISSUE: 'completeness-issue',
  INFORMATION_REQUEST: 'information-request',
  PENDING_REFERRAL: 'pending-referral',
  DECISION_READY: 'decision-ready',
  SLA_RISK: 'sla-risk',
  INSPECTION_TASK: 'inspection-task',
  APPEALS_ASSIGNMENT: 'appeals-assignment',
  INSTRUMENT_RENEWAL: 'instrument-renewal',
  GOVERNMENT_MESSAGE: 'government-message',
  INTELLIGENCE_ALERT: 'intelligence-alert',
} as const;

export type OfficialQueueItemType =
  (typeof OFFICIAL_QUEUE_ITEM_TYPES)[keyof typeof OFFICIAL_QUEUE_ITEM_TYPES];
