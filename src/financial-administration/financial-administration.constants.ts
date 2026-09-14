export const FEE_SCHEDULE_CODE_PREFIX = 'FS';
export const FEE_ASSESSMENT_NUMBER_PREFIX = 'FAS';
export const INVOICE_NUMBER_PREFIX = 'INV';

export const TECHNICAL_ADMIN_ROLE_MARKER = 'TECHNICAL_ADMIN';

export const PHASE_11A_BOUNDARY_DISCLAIMER =
  'Phase 11A records fee schedules, assessments, and invoices. Payment recording does not constitute application approval, instrument issuance, or compliance determination. Fee != Payment. Invoice PAID != substantive service approval.';

export const FORBIDDEN_CLIENT_FEE_SCHEDULE_FIELDS = [
  'status',
  'authorityEvaluationRecordId',
  'approvedAt',
  'approvedByOfficeholderId',
] as const;

export const FORBIDDEN_CLIENT_FEE_ASSESSMENT_FIELDS = [
  'subtotalCents',
  'totalCents',
  'adjustmentsCents',
  'calculatedItems',
  'integrityHash',
  'status',
] as const;

export const FORBIDDEN_CLIENT_INVOICE_FIELDS = [
  'subtotalCents',
  'totalCents',
  'adjustmentTotalCents',
  'amountPaidCents',
  'amountOutstandingCents',
  'status',
  'issuedAt',
] as const;

export const FORBIDDEN_CLIENT_INVOICE_LINE_FIELDS = [
  'unitAmountCents',
  'lineTotalCents',
  'feeScheduleItemId',
] as const;

export const FORBIDDEN_AI_FINANCIAL_ACTIONS = [
  'WAIVE_FEE',
  'APPROVE_FEE_SCHEDULE',
  'ACTIVATE_FEE_SCHEDULE',
  'SET_FEE_AMOUNT',
  'RECORD_PAYMENT',
  'APPROVE_REFUND',
] as const;

export const FINANCIAL_REASON_CODES = {
  INACTIVE_SCHEDULE: 'INACTIVE_SCHEDULE',
  SUPERSEDED_VERSION: 'SUPERSEDED_VERSION',
  CURRENCY_MISMATCH: 'CURRENCY_MISMATCH',
  FX_NOT_CONFIGURED: 'FX_NOT_CONFIGURED',
  CLIENT_AMOUNT_FORBIDDEN: 'CLIENT_AMOUNT_FORBIDDEN',
  ARBITRARY_FEE_FORBIDDEN: 'ARBITRARY_FEE_FORBIDDEN',
  ADMIN_OVERRIDE_FORBIDDEN: 'ADMIN_OVERRIDE_FORBIDDEN',
  ASSESSMENT_LOCKED: 'ASSESSMENT_LOCKED',
  MISSING_AUTHORITY: 'MISSING_AUTHORITY',
  SCHEDULE_NOT_ACTIVE: 'SCHEDULE_NOT_ACTIVE',
} as const;
