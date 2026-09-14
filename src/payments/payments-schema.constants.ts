export const PHASE_11_PREREQUISITE_MODEL_NAMES = [
  'FeeSchedule',
  'FeeScheduleVersion',
  'Invoice',
  'PaymentTransaction',
  'Receipt',
  'ChargebackEvent',
] as const;

export const PHASE_11C_MODEL_NAMES = [
  'FeeAdjustmentRequest',
  'FeeAdjustmentDecision',
  'RefundRequest',
  'RefundAuthorization',
  'RefundTransaction',
  'ReconciliationBatch',
  'ReconciliationItem',
  'ReconciliationException',
  'FinancialDispute',
  'ArrearsRecord',
  'FinancialApprovalRecord',
  'FinancialReversalRecord',
] as const;

export const PHASE_11C_ENUM_NAMES = [
  'FeeAdjustmentType',
  'FeeAdjustmentRequestStatus',
  'FeeScheduleVersionStatus',
  'InvoiceStatus',
  'PaymentTransactionStatus',
  'RefundRequestStatus',
  'RefundAuthorizationStatus',
  'ReconciliationBatchSource',
  'ReconciliationBatchStatus',
  'ReconciliationMatchStatus',
  'ReconciliationExceptionStatus',
  'ArrearsRecordStatus',
  'FinancialDisputeSubject',
  'FinancialDisputeStatus',
  'FinancialApprovalDecision',
  'FinancialReversalReason',
] as const;
