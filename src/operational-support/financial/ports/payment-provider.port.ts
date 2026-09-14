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

export interface PaymentProviderPort {
  readonly providerCode: string;
  verifyWebhookSignature(input: PaymentWebhookVerificationInput): boolean;
  parseWebhookPayload(rawBody: string): ParsedPaymentWebhookPayload;
  initiateRefund(input: PaymentRefundInput): Promise<PaymentRefundResult>;
}
