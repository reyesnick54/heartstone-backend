export const INVOICE_NUMBER_PREFIX = 'INV';
export const PAYMENT_INTENT_NUMBER_PREFIX = 'PINT';
export const PAYMENT_TRANSACTION_NUMBER_PREFIX = 'PTXN';
export const PAYMENT_RECEIPT_NUMBER_PREFIX = 'PRCP';

export const DETERMINISTIC_TEST_PROVIDER_CODE = 'DETERMINISTIC_TEST';

export const FORBIDDEN_CLIENT_PAYMENT_FIELDS = [
  'status',
  'paidAmountCents',
  'providerIntentReference',
  'providerTransactionReference',
  'settlementReference',
  'providerPayloadHash',
  'isManualConfirmation',
] as const;

export const FORBIDDEN_CLIENT_INVOICE_FIELDS = ['status', 'paidAmountCents', 'issuedAt'] as const;

export const FORBIDDEN_PROVIDER_CONFIG_RESPONSE_FIELDS = [
  'credentialReference',
] as const;

export const FORBIDDEN_PCI_FIELDS = ['pan', 'cvv', 'cvc', 'cardNumber', 'pin', 'magneticStripe'] as const;

export const FORBIDDEN_AI_PAYMENT_ACTIONS = [
  'CREATE_PAYMENT_INTENT',
  'CONFIRM_MANUAL_PAYMENT',
  'PROCESS_WEBHOOK',
  'MARK_SETTLED',
  'ISSUE_RECEIPT',
] as const;

export const PAYMENT_BOUNDARY_DISCLAIMER =
  'Payment receipt records financial collection only; it does not approve an application, issue an instrument, satisfy compliance, or waive evidence.';

export const WEBHOOK_TIMESTAMP_TOLERANCE_SECONDS = 300;

export const PAYMENT_REDIRECT_DISCLAIMER =
  'Client redirect callbacks are not proof of payment; settlement requires provider webhook or server reconciliation.';
