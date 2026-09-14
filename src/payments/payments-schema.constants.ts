export const PHASE_11A_MODEL_NAMES = ['Invoice', 'InvoiceLine'] as const;

export const PHASE_11A_ENUM_NAMES = ['InvoiceStatus'] as const;

export const PHASE_11B_MODEL_NAMES = [
  'PaymentChannelDefinition',
  'PaymentProviderConfiguration',
  'PaymentIntent',
  'PaymentTransaction',
  'PaymentTransactionEvent',
  'PaymentAllocation',
  'PaymentReceipt',
  'PaymentProviderWebhookEvent',
] as const;

export const PHASE_11B_ENUM_NAMES = [
  'PaymentChannelCode',
  'PaymentChannelDefinitionStatus',
  'PaymentProviderConfigurationStatus',
  'PaymentIntentStatus',
  'PaymentTransactionType',
  'PaymentTransactionStatus',
  'PaymentReceiptStatus',
  'PaymentWebhookProcessingStatus',
  'ManualPaymentSource',
] as const;

export const PAYMENT_CHANNEL_CODES = [
  'ONLINE_CARD',
  'BANK_TRANSFER',
  'GOVERNMENT_PAYMENT_GATEWAY',
  'MOBILE_PAYMENT',
  'COUNTER_PAYMENT',
  'INTERNAL_TRANSFER',
  'OTHER_APPROVED_CHANNEL',
] as const;

export const PAYMENT_INTENT_STATUSES = [
  'CREATED',
  'PENDING',
  'REQUIRES_ACTION',
  'AUTHORIZED',
  'PROCESSING',
  'SETTLED',
  'FAILED',
  'CANCELLED',
  'EXPIRED',
] as const;

export const PAYMENT_TRANSACTION_TYPES = [
  'AUTHORIZATION',
  'CAPTURE',
  'PAYMENT',
  'SETTLEMENT',
  'REVERSAL',
  'REFUND_REFERENCE',
  'CHARGEBACK_REFERENCE',
  'MANUAL_CONFIRMED_PAYMENT',
] as const;

export const INVOICE_STATUSES = [
  'DRAFT',
  'ISSUED',
  'PARTIALLY_PAID',
  'PAID',
  'OVERDUE',
  'CANCELLED',
  'WRITTEN_OFF',
] as const;
