import { Injectable } from '@nestjs/common';
import {
  PaymentIntentStatus,
  PaymentTransactionStatus,
} from '@prisma/client';

import { DETERMINISTIC_TEST_PROVIDER_CODE } from '../payments.constants';
import {
  type CancelPaymentInput,
  type CapturePaymentInput,
  type CreatePaymentIntentInput,
  type CreatePaymentIntentResult,
  type PaymentProviderPort,
  type RetrievePaymentInput,
  type RetrievePaymentResult,
  type RetrieveSettlementReferenceInput,
  type VerifyWebhookInput,
  type VerifyWebhookResult,
} from '../ports/payment-provider.port';

const TEST_WEBHOOK_SECRET = 'NON_PRODUCTION_DETERMINISTIC_TEST_WEBHOOK_SECRET';

@Injectable()
export class DeterministicTestPaymentProviderAdapter implements PaymentProviderPort {
  readonly providerCode = DETERMINISTIC_TEST_PROVIDER_CODE;

  private readonly intents = new Map<
    string,
    {
      amountCents: number;
      currency: string;
      status: PaymentIntentStatus;
      invoiceId: string;
    }
  >();

  createPaymentIntent(input: CreatePaymentIntentInput): Promise<CreatePaymentIntentResult> {
    const providerIntentReference = `test-intent-${input.invoiceId}-${String(input.amountCents)}`;
    this.intents.set(providerIntentReference, {
      amountCents: input.amountCents,
      currency: input.currency,
      status: PaymentIntentStatus.PENDING,
      invoiceId: input.invoiceId,
    });

    return Promise.resolve({
      providerIntentReference,
      providerStatusRaw: 'pending',
      canonicalStatus: PaymentIntentStatus.PENDING,
      expiresAt: new Date(Date.now() + 3_600_000),
    });
  }

  retrievePayment(input: RetrievePaymentInput): Promise<RetrievePaymentResult> {
    const intent = this.intents.get(input.providerIntentReference);
    if (!intent) {
      throw new Error(`Unknown test intent ${input.providerIntentReference}`);
    }

    return Promise.resolve({
      providerIntentReference: input.providerIntentReference,
      providerTransactionReference: `${input.providerIntentReference}-txn`,
      providerStatusRaw: intent.status.toLowerCase(),
      canonicalStatus: intent.status,
      amountCents: intent.amountCents,
      currency: intent.currency,
    });
  }

  cancelPayment(input: CancelPaymentInput): Promise<{
    providerStatusRaw: string;
    canonicalStatus: PaymentIntentStatus;
  }> {
    const intent = this.intents.get(input.providerIntentReference);
    if (intent) {
      intent.status = PaymentIntentStatus.CANCELLED;
    }
    return Promise.resolve({
      providerStatusRaw: 'cancelled',
      canonicalStatus: PaymentIntentStatus.CANCELLED,
    });
  }

  capturePayment(input: CapturePaymentInput): Promise<{
    providerTransactionReference: string;
    providerStatusRaw: string;
    canonicalStatus: PaymentIntentStatus;
    settlementReference?: string;
  }> {
    const intent = this.intents.get(input.providerIntentReference);
    if (!intent) {
      throw new Error(`Unknown test intent ${input.providerIntentReference}`);
    }
    intent.status = PaymentIntentStatus.SETTLED;
    return Promise.resolve({
      providerTransactionReference: `${input.providerIntentReference}-capture`,
      providerStatusRaw: 'settled',
      canonicalStatus: PaymentIntentStatus.SETTLED,
      settlementReference: `settlement-${input.providerIntentReference}`,
    });
  }

  verifyWebhook(input: VerifyWebhookInput): Promise<VerifyWebhookResult> {
    const externalEventId = this.readPayloadString(input.payload.externalEventId);
    const expectedSignature = this.computeSignature(input.rawBody, input.timestamp);
    const signatureValid = input.signature === expectedSignature;
    const timestampValid = this.validateTimestamp(input.timestamp);
    const fallbackEventType = this.readPayloadString(input.payload.eventType) || 'unknown';

    if (!signatureValid) {
      return Promise.resolve({
        valid: false,
        signatureValidationResult: 'INVALID',
        timestampValidation: timestampValid,
        externalEventId,
        eventType: fallbackEventType,
      });
    }

    if (timestampValid !== 'VALID') {
      return Promise.resolve({
        valid: false,
        signatureValidationResult: 'VALID',
        timestampValidation: timestampValid,
        externalEventId,
        eventType: fallbackEventType,
      });
    }

    const providerIntentReference = this.readPayloadString(input.payload.providerIntentReference);
    const intent = this.intents.get(providerIntentReference);
    if (intent) {
      intent.status = PaymentIntentStatus.SETTLED;
    }

    return Promise.resolve({
      valid: true,
      signatureValidationResult: 'VALID',
      timestampValidation: 'VALID',
      externalEventId,
      eventType: this.readPayloadString(input.payload.eventType) || 'payment.settled',
      providerIntentReference,
      providerTransactionReference: this.readPayloadString(input.payload.providerTransactionReference),
      amountCents: this.readPayloadNumber(input.payload.amountCents, intent?.amountCents ?? 0),
      currency:
        this.readPayloadString(input.payload.currency) || (intent?.currency ?? 'XCD'),
      canonicalIntentStatus: PaymentIntentStatus.SETTLED,
      canonicalTransactionStatus: PaymentTransactionStatus.COMPLETED,
      providerStatusRaw: 'settled',
      settlementReference:
        this.readPayloadString(input.payload.settlementReference) ||
        `settlement-${providerIntentReference}`,
    });
  }

  retrieveSettlementReference(
    input: RetrieveSettlementReferenceInput,
  ): Promise<{ settlementReference: string }> {
    return Promise.resolve({
      settlementReference: `settlement-${input.providerTransactionReference}`,
    });
  }

  private computeSignature(rawBody: string, timestamp?: string): string {
    return `sig:${Buffer.from(`${TEST_WEBHOOK_SECRET}:${timestamp ?? ''}:${rawBody}`).toString('base64url')}`;
  }

  private validateTimestamp(timestamp?: string): string {
    if (!timestamp) {
      return 'NOT_PROVIDED';
    }
    const eventTime = Number.parseInt(timestamp, 10);
    if (Number.isNaN(eventTime)) {
      return 'INVALID_FORMAT';
    }
    const ageSeconds = Math.abs(Date.now() / 1000 - eventTime);
    return ageSeconds <= 300 ? 'VALID' : 'REPLAY_REJECTED';
  }

  /** Test helper to compute valid webhook signature. */
  computeTestSignature(rawBody: string, timestamp: string): string {
    return this.computeSignature(rawBody, timestamp);
  }

  private readPayloadString(value: unknown): string {
    if (typeof value === 'string') {
      return value;
    }
    if (typeof value === 'number' || typeof value === 'boolean') {
      return String(value);
    }
    return '';
  }

  private readPayloadNumber(value: unknown, fallback: number): number {
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }
    if (typeof value === 'string' && value.trim() !== '') {
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : fallback;
    }
    return fallback;
  }
}
