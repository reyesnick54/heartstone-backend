export const PHASE_11A_MODEL_NAMES = [
  'FeeSchedule',
  'FeeScheduleVersion',
  'FeeScheduleItem',
  'FeeAssessment',
  'Invoice',
  'InvoiceLine',
  'FinancialAccountReference',
  'FinancialAuditEvent',
] as const;

export const PHASE_11A_ENUM_NAMES = [
  'FeeScheduleLifecycleStatus',
  'FeeCalculationMethod',
  'FeeRefundabilityRule',
  'FeeAssessmentStatus',
  'InvoiceStatus',
  'FinancialAuditEventType',
] as const;

export const FEE_SCHEDULE_LIFECYCLE_STATUSES = [
  'DRAFT',
  'UNDER_REVIEW',
  'APPROVED',
  'ACTIVE',
  'SUSPENDED',
  'SUPERSEDED',
  'RETIRED',
] as const;

export const FEE_CALCULATION_METHODS = [
  'FIXED',
  'QUANTITY',
  'PERCENTAGE',
  'TIERED',
  'FORMULA_FROM_APPROVED_RULE',
  'MANUAL_AUTHORIZED_CALCULATION',
] as const;

export const INVOICE_STATUSES = [
  'DRAFT',
  'ISSUED',
  'PARTIALLY_PAID',
  'PAID',
  'OVERDUE',
  'DISPUTED',
  'CANCELLED_BY_AUTHORIZED_ACTION',
  'SUPERSEDED',
  'CLOSED',
] as const;

export const FEE_ASSESSMENT_STATUSES = [
  'CALCULATED',
  'SUPERSEDED',
  'LOCKED_FOR_INVOICE',
  'CANCELLED',
] as const;
