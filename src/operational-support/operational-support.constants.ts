import { CommunicationChannelType, IntegrationAcceptanceStatus } from '@prisma/client';

export const OPERATIONAL_SUPPORT_BOUNDARY_DISCLAIMER =
  'Operational support services administer fees, payments, communications, and integrations. ' +
  'Technical delivery and payment processing do not constitute legal authority or official decisions.';

export const DEFAULT_INTEGRATION_REQUEST_TIMEOUT_MS = 30_000;
export const DEFAULT_INTEGRATION_MAX_PAYLOAD_BYTES = 1_048_576;

export const TEMPLATE_INJECTION_PATTERNS: readonly RegExp[] = [
  /\{\{\{/,
  /\}\}\}/,
  /<script\b/i,
  /javascript:/i,
  /onerror\s*=/i,
  /<\/?iframe\b/i,
];

export const ALLOWED_TEMPLATE_VARIABLE_PATTERN = /^[a-zA-Z][a-zA-Z0-9_.]*$/;

export const ALTERNATE_CHANNEL_MAP: Partial<
  Record<CommunicationChannelType, CommunicationChannelType>
> = {
  [CommunicationChannelType.EMAIL]: CommunicationChannelType.SMS,
  [CommunicationChannelType.SMS]: CommunicationChannelType.EMAIL,
  [CommunicationChannelType.PORTAL]: CommunicationChannelType.EMAIL,
};

export const INTEGRATION_ACCEPTANCE_STATUS_ORDER: Record<IntegrationAcceptanceStatus, number> = {
  [IntegrationAcceptanceStatus.TECHNICALLY_CONNECTED]: 1,
  [IntegrationAcceptanceStatus.TESTED]: 2,
  [IntegrationAcceptanceStatus.TECHNICALLY_READY]: 3,
  [IntegrationAcceptanceStatus.INSTITUTIONALLY_ACCEPTED]: 4,
  [IntegrationAcceptanceStatus.OPERATIONALLY_ACTIVE]: 5,
  [IntegrationAcceptanceStatus.SUSPENDED]: 0,
  [IntegrationAcceptanceStatus.REVALIDATION_REQUIRED]: 0,
};

export const PROGRESSIVE_ACCEPTANCE_STATUSES = [
  IntegrationAcceptanceStatus.TECHNICALLY_CONNECTED,
  IntegrationAcceptanceStatus.TESTED,
  IntegrationAcceptanceStatus.TECHNICALLY_READY,
  IntegrationAcceptanceStatus.INSTITUTIONALLY_ACCEPTED,
  IntegrationAcceptanceStatus.OPERATIONALLY_ACTIVE,
] as const;

export const REDRESS_REFUND_LIFECYCLE_SERVICE = 'OperationalSupportRefundService';

export const CIRCUIT_BREAKER_FAILURE_THRESHOLD = 5;
export const CIRCUIT_BREAKER_RECOVERY_PROBE_LIMIT = 3;

export const FEE_ASSESSMENT_REFERENCE_PREFIX = 'FA';
export const INVOICE_NUMBER_PREFIX = 'INV';
export const PAYMENT_INTENT_REFERENCE_PREFIX = 'PI';
export const PAYMENT_RECEIPT_NUMBER_PREFIX = 'PR';
export const REFUND_AUTHORIZATION_REFERENCE_PREFIX = 'RA';
export const RECONCILIATION_BATCH_REFERENCE_PREFIX = 'RCB';

export const PHASE_11A_BOUNDARY_DISCLAIMER =
  'Phase 11A records fee schedules, assessments, and invoices. Payment obligation does not constitute approval of an application or case disposition.';

export const PHASE_11B_BOUNDARY_DISCLAIMER =
  'Phase 11B records payment intents, transactions, and receipts. Payment success does not alter case status or GovernmentDecision outcomes.';

export const FORBIDDEN_PAYMENT_CARD_STORAGE_FIELDS = [
  'pan',
  'primaryAccountNumber',
  'cardNumber',
  'cvv',
  'cvc',
  'securityCode',
  'cardVerificationValue',
  'trackData',
  'magneticStripeData',
] as const;

export const FORBIDDEN_CLIENT_FEE_SCHEDULE_FIELDS = [
  'status',
  'approvedAt',
  'approvedByIdentityId',
  'effectiveFrom',
  'effectiveUntil',
] as const;

export const FORBIDDEN_CLIENT_FEE_ASSESSMENT_FIELDS = [
  'status',
  'totalAmountCents',
  'currency',
  'calculatedAt',
  'waivedAt',
] as const;

export const FORBIDDEN_CLIENT_INVOICE_FIELDS = [
  'status',
  'totalAmountCents',
  'amountPaidCents',
  'currency',
  'issuedAt',
  'cancelledAt',
] as const;

export const FORBIDDEN_CLIENT_PAYMENT_INTENT_FIELDS = [
  'status',
  'amountCents',
  'currency',
  'completedAt',
] as const;

export const FORBIDDEN_CLIENT_PAYMENT_TRANSACTION_FIELDS = [
  'status',
  'amountCents',
  'currency',
  'authorizedAt',
  'settledAt',
] as const;

export const FORBIDDEN_CLIENT_REFUND_FIELDS = [
  'status',
  'authorizedAmountCents',
  'authorizedAt',
] as const;

export const FORBIDDEN_CLIENT_FINANCIAL_APPROVAL_FIELDS = [
  'status',
  'approvedAt',
  'approvedByIdentityId',
  'rejectionReason',
] as const;

export const FORBIDDEN_PAYMENT_SIDE_EFFECT_FIELDS = [
  'caseStatus',
  'decisionStatus',
  'governmentDecisionId',
  'outcome',
  'approvalStatus',
] as const;

export const IMMUTABLE_ISSUED_INVOICE_FIELDS = ['totalAmountCents', 'currency', 'lines'] as const;

export const OPERATIONAL_SUPPORT_REASON_CODES = {
  PAYMENT_NOT_APPROVAL: 'PAYMENT_NOT_APPROVAL',
  RECEIPT_NOT_DECISION: 'RECEIPT_NOT_DECISION',
  PAN_CVV_STORAGE_FORBIDDEN: 'PAN_CVV_STORAGE_FORBIDDEN',
  CLIENT_TOTALS_FORBIDDEN: 'CLIENT_TOTALS_FORBIDDEN',
  ISSUED_INVOICE_IMMUTABLE: 'ISSUED_INVOICE_IMMUTABLE',
  FEE_SCHEDULE_APPROVAL_REQUIRED: 'FEE_SCHEDULE_APPROVAL_REQUIRED',
  WEBHOOK_SIGNATURE_INVALID: 'WEBHOOK_SIGNATURE_INVALID',
  WEBHOOK_DUPLICATE: 'WEBHOOK_DUPLICATE',
  WEBHOOK_AMOUNT_MISMATCH: 'WEBHOOK_AMOUNT_MISMATCH',
  WEBHOOK_CURRENCY_MISMATCH: 'WEBHOOK_CURRENCY_MISMATCH',
  PAYMENT_DOES_NOT_ALTER_CASE: 'PAYMENT_DOES_NOT_ALTER_CASE',
  PAYMENT_DOES_NOT_ALTER_DECISION: 'PAYMENT_DOES_NOT_ALTER_DECISION',
  REFUND_EXCEEDS_SETTLED: 'REFUND_EXCEEDS_SETTLED',
  REFUND_SEGREGATION_REQUIRED: 'REFUND_SEGREGATION_REQUIRED',
  RECONCILIATION_CLOSURE_APPROVAL_REQUIRED: 'RECONCILIATION_CLOSURE_APPROVAL_REQUIRED',
  ACTIVE_FEE_SCHEDULE_REQUIRED: 'ACTIVE_FEE_SCHEDULE_REQUIRED',
} as const;

export type OperationalSupportReasonCode =
  (typeof OPERATIONAL_SUPPORT_REASON_CODES)[keyof typeof OPERATIONAL_SUPPORT_REASON_CODES];
