export const PAYMENT_PROVIDER_PORT = Symbol('PAYMENT_PROVIDER_PORT');

export interface PaymentProviderRefundInput {
  originalProviderReference: string;
  amountCents: number;
  currency: string;
  reason: string;
}

export interface PaymentProviderRefundResult {
  success: boolean;
  providerReference?: string;
  errorMessage?: string;
}

export interface PaymentProviderPort {
  readonly providerName: string;
  readonly supportsRefunds: boolean;

  refund(input: PaymentProviderRefundInput): Promise<PaymentProviderRefundResult>;
import {
  type PaymentChannelCode,
  type PaymentIntentStatus,
  type PaymentTransactionStatus,
} from '@prisma/client';

export const PAYMENT_PROVIDER_PORT = Symbol('PAYMENT_PROVIDER_PORT');

export interface CreatePaymentIntentInput {
  invoiceId: string;
  amountCents: number;
  currency: string;
  channel: PaymentChannelCode;
  payerReference: string;
  metadata?: Record<string, string>;
}

export interface CreatePaymentIntentResult {
  providerIntentReference: string;
  providerStatusRaw: string;
  canonicalStatus: PaymentIntentStatus;
  expiresAt?: Date;
}

export interface RetrievePaymentInput {
  providerIntentReference: string;
}

export interface RetrievePaymentResult {
  providerIntentReference: string;
  providerTransactionReference?: string;
  providerStatusRaw: string;
  canonicalStatus: PaymentIntentStatus;
  amountCents: number;
  currency: string;
}

export interface CancelPaymentInput {
  providerIntentReference: string;
}

export interface CapturePaymentInput {
  providerIntentReference: string;
  amountCents: number;
}

export interface VerifyWebhookInput {
  signature: string;
  timestamp?: string;
  payload: Record<string, unknown>;
  rawBody: string;
}

export interface VerifyWebhookResult {
  valid: boolean;
  signatureValidationResult: string;
  timestampValidation: string;
  externalEventId: string;
  eventType: string;
  providerIntentReference?: string;
  providerTransactionReference?: string;
  amountCents?: number;
  currency?: string;
  canonicalIntentStatus?: PaymentIntentStatus;
  canonicalTransactionStatus?: PaymentTransactionStatus;
  providerStatusRaw?: string;
  settlementReference?: string;
}

export interface RetrieveSettlementReferenceInput {
  providerTransactionReference: string;
}

export interface PaymentProviderPort {
  readonly providerCode: string;
  createPaymentIntent(input: CreatePaymentIntentInput): Promise<CreatePaymentIntentResult>;
  retrievePayment(input: RetrievePaymentInput): Promise<RetrievePaymentResult>;
  cancelPayment(input: CancelPaymentInput): Promise<{ providerStatusRaw: string; canonicalStatus: PaymentIntentStatus }>;
  capturePayment?(input: CapturePaymentInput): Promise<{
    providerTransactionReference: string;
    providerStatusRaw: string;
    canonicalStatus: PaymentIntentStatus;
    settlementReference?: string;
  }>;
  verifyWebhook(input: VerifyWebhookInput): Promise<VerifyWebhookResult>;
  retrieveSettlementReference(
    input: RetrieveSettlementReferenceInput,
  ): Promise<{ settlementReference: string }>;
}
