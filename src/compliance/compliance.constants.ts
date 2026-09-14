export const COMPLIANCE_MATTER_NUMBER_PREFIX = 'CM';
export const INSPECTION_PLAN_NUMBER_PREFIX = 'IP';
export const INSPECTION_SESSION_NUMBER_PREFIX = 'IS';
export const CORRECTIVE_ACTION_PLAN_NUMBER_PREFIX = 'CAP';

export const NON_PRODUCTION_COMPLIANCE_FIXTURE_MARKER = 'NON_PRODUCTION_PHASE_9_TEST_ONLY';

export const PHASE_9_BOUNDARY_DISCLAIMER =
  'Phase 9 records compliance monitoring, inspection execution, findings, and corrective action. It does not create suspension decisions or directly mutate official instrument lifecycle status.';

export const FORBIDDEN_CLIENT_COMPLIANCE_FIELDS = [
  'obligationSatisfied',
  'isViolation',
  'status',
  'closedAt',
  'verified',
  'projectedStatus',
] as const;

export const COMPLIANCE_EXPLANATION_CODES = {
  OBLIGATION_NOT_SUBMISSION: 'OBLIGATION_NOT_SUBMISSION',
  SUBMISSION_NOT_VERIFICATION: 'SUBMISSION_NOT_VERIFICATION',
  RECEIPT_NOT_OBLIGATION_SATISFACTION: 'RECEIPT_NOT_OBLIGATION_SATISFACTION',
  OBSERVATION_NOT_FINDING: 'OBSERVATION_NOT_FINDING',
  FINDING_NOT_VIOLATION: 'FINDING_NOT_VIOLATION',
  HOLDER_CANNOT_CLOSE_FINDING: 'HOLDER_CANNOT_CLOSE_FINDING',
  HOLDER_CANNOT_VERIFY_CORRECTIVE_ACTION: 'HOLDER_CANNOT_VERIFY_CORRECTIVE_ACTION',
  PHASE_9_CANNOT_CREATE_SUSPENSION_DECISION: 'PHASE_9_CANNOT_CREATE_SUSPENSION_DECISION',
  PHASE_9_CANNOT_PATCH_INSTRUMENT_STATUS: 'PHASE_9_CANNOT_PATCH_INSTRUMENT_STATUS',
  INSPECT_AUTHORITY_REQUIRED: 'INSPECT_AUTHORITY_REQUIRED',
  CLIENT_CANNOT_SET_OBLIGATION_SATISFIED: 'CLIENT_CANNOT_SET_OBLIGATION_SATISFIED',
  CLIENT_CANNOT_SET_VIOLATION: 'CLIENT_CANNOT_SET_VIOLATION',
  CLIENT_CANNOT_SELF_CLOSE: 'CLIENT_CANNOT_SELF_CLOSE',
  CLIENT_CANNOT_SELF_VERIFY: 'CLIENT_CANNOT_SELF_VERIFY',
} as const;

export interface Phase9HInvariant {
  id: number;
  category: string;
  description: string;
}

export const PHASE_9H_INVARIANTS: readonly Phase9HInvariant[] = [
  {
    id: 1,
    category: 'boundary',
    description: 'Continuing obligation is distinct from compliance submission',
  },
  {
    id: 2,
    category: 'boundary',
    description: 'Compliance submission is distinct from compliance review verification',
  },
  {
    id: 3,
    category: 'boundary',
    description: 'Receipt acknowledgment alone never satisfies continuing obligation',
  },
  {
    id: 4,
    category: 'boundary',
    description: 'Inspection observation is distinct from institutional inspection finding',
  },
  {
    id: 5,
    category: 'boundary',
    description: 'Inspection finding is distinct from noncompliance violation determination',
  },
  {
    id: 6,
    category: 'boundary',
    description: 'Phase 7 inspection record reuse does not duplicate inspection stack',
  },
  {
    id: 7,
    category: 'boundary',
    description: 'Phase 9 cannot create suspension government decisions',
  },
  {
    id: 8,
    category: 'boundary',
    description: 'Phase 9 cannot PATCH official instrument lifecycle status',
  },
  {
    id: 9,
    category: 'boundary',
    description: 'Emergency interim action does not suspend instrument by default',
  },
  {
    id: 10,
    category: 'boundary',
    description: 'Compliance projection is informational and not legal status',
  },
  {
    id: 11,
    category: 'boundary',
    description: 'Compliance assessment does not equal enforcement referral',
  },
  {
    id: 12,
    category: 'boundary',
    description: 'Corrective action plan assignment does not equal verification',
  },
  {
    id: 13,
    category: 'boundary',
    description: 'Inspection plan scheduling does not execute inspection session',
  },
  {
    id: 14,
    category: 'boundary',
    description: 'Inspection assignment requires INSPECT authority evaluation',
  },
  {
    id: 15,
    category: 'boundary',
    description: 'Access to compliance matter does not equal authority to inspect',
  },
  {
    id: 16,
    category: 'client',
    description: 'Client cannot set obligationSatisfied on submission payloads',
  },
  {
    id: 17,
    category: 'client',
    description: 'Client cannot set isViolation on observation payloads',
  },
  {
    id: 18,
    category: 'client',
    description: 'Client cannot set compliance matter status directly',
  },
  { id: 19, category: 'client', description: 'Client cannot set finding closed status directly' },
  {
    id: 20,
    category: 'client',
    description: 'Client cannot set corrective action verified outcome directly',
  },
  {
    id: 21,
    category: 'client',
    description: 'Client cannot set projected compliance status directly',
  },
  {
    id: 22,
    category: 'client',
    description: 'Client cannot bypass institutional review for obligation satisfaction',
  },
  {
    id: 23,
    category: 'holder',
    description: 'Instrument holder cannot self-close inspection finding',
  },
  {
    id: 24,
    category: 'holder',
    description: 'Instrument holder cannot verify own corrective action',
  },
  {
    id: 25,
    category: 'holder',
    description: 'Instrument holder cannot reopen finding without authorized actor',
  },
  {
    id: 26,
    category: 'holder',
    description: 'Instrument holder submission receipt does not close finding',
  },
  {
    id: 27,
    category: 'inspection',
    description: 'Observation classification cannot auto-create violation finding',
  },
  {
    id: 28,
    category: 'inspection',
    description: 'Inspection session completion does not auto-create findings',
  },
  {
    id: 29,
    category: 'inspection',
    description: 'Phase 7 NON_COMPLIANCE classification blocked at observation layer',
  },
  {
    id: 30,
    category: 'inspection',
    description: 'Finding requires explicit institutional determination',
  },
  {
    id: 31,
    category: 'inspection',
    description: 'Violation flag requires separate noncompliance finding record',
  },
  {
    id: 32,
    category: 'corrective',
    description: 'Corrective action item completion requires independent verification',
  },
  {
    id: 33,
    category: 'corrective',
    description: 'Corrective action verification cannot be performed by assignee alone',
  },
  {
    id: 34,
    category: 'corrective',
    description: 'Finding closure requires authorized officeholder actor',
  },
  {
    id: 35,
    category: 'corrective',
    description: 'Finding reopening preserves prior closure record',
  },
  {
    id: 36,
    category: 'escalation',
    description: 'Compliance escalation does not equal enforcement decision',
  },
  {
    id: 37,
    category: 'escalation',
    description: 'Enforcement referral is distinct from compliance escalation',
  },
  {
    id: 38,
    category: 'escalation',
    description: 'Escalation referral does not auto-suspend instrument',
  },
  {
    id: 39,
    category: 'monitoring',
    description: 'Monitoring event append-only semantics enforced',
  },
  {
    id: 40,
    category: 'monitoring',
    description: 'Compliance alert does not mutate obligation status',
  },
  {
    id: 41,
    category: 'monitoring',
    description: 'Revalidation outcome does not auto-reinstate instrument',
  },
  {
    id: 42,
    category: 'authority',
    description: 'INSPECT authority required for inspection assignment',
  },
  {
    id: 43,
    category: 'authority',
    description: 'Authority evaluation denial blocks inspection session start',
  },
  {
    id: 44,
    category: 'authority',
    description: 'Technical permission does not create inspection finding authority',
  },
  {
    id: 45,
    category: 'ai',
    description: 'AI assistance cannot independently verify corrective action',
  },
  { id: 46, category: 'ai', description: 'AI assistance cannot close compliance findings' },
  {
    id: 47,
    category: 'segregation',
    description: 'Inspector determining finding cannot verify same corrective action',
  },
  {
    id: 48,
    category: 'segregation',
    description: 'Submission reviewer cannot be sole submission submitter without SOD check',
  },
  {
    id: 49,
    category: 'records',
    description: 'Compliance matter links preserve master file and case references',
  },
  {
    id: 50,
    category: 'records',
    description: 'Inspection session optional Phase 7 inspectionRecordId link preserved',
  },
];
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
