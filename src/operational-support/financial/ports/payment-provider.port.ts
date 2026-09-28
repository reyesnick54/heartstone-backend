export const PAYMENT_PROVIDER_PORT = Symbol('PAYMENT_PROVIDER_PORT');

export interface PaymentWebhookVerificationInput {
  rawBody: string;
  signature: string;
  configuration: Record<string, unknown>;
}

export interface ParsedPaymentWebhookPayload {
  eventType: string;
  externalEventId: string;
  providerTransactionReference: string;
  paymentIntentReference: string;
  amountCents: number;
  currency: string;
  succeeded: boolean;
  failureReason?: string;
}

export interface PaymentRefundInput {
  providerTransactionReference: string;
  amountCents: number;
  currency: string;
  reason: string;
  configuration: Record<string, unknown>;
}

export interface PaymentRefundResult {
  providerRefundReference: string;
}

export interface PaymentIntentCreateInput {
  paymentIntentReference: string;
  amountCents: number;
  currency: string;
  idempotencyKey: string;
  configuration: Record<string, unknown>;
  metadata?: Record<string, string>;
}

export interface PaymentIntentCreateResult {
  providerPaymentReference: string;
  clientActionUrl?: string;
  status: 'PENDING' | 'REQUIRES_ACTION' | 'FAILED';
}

export interface PaymentProviderPort {
  readonly providerCode: string;
  /** When false, production startup must fail if this adapter is bound for settlement. */
  readonly isProductionAdapter: boolean;
  readonly operationalReadinessState: 'READY' | 'BLOCKED' | 'TEST_ONLY';
  verifyWebhookSignature(input: PaymentWebhookVerificationInput): boolean;
  parseWebhookPayload(rawBody: string): ParsedPaymentWebhookPayload;
  createPaymentIntent?(input: PaymentIntentCreateInput): Promise<PaymentIntentCreateResult>;
  initiateRefund(input: PaymentRefundInput): Promise<PaymentRefundResult>;
}
