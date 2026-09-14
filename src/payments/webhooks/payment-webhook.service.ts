import { BadRequestException, Injectable } from '@nestjs/common';
import { PaymentWebhookProcessingStatus } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { PaymentProviderRegistryService } from '../adapters/payment-provider-registry.service';
import { hashPaymentPayload } from '../common/payment-hash.util';
import { PaymentsBoundaryService } from '../common/payments-boundary.service';
import { PaymentIntentService } from '../intents/payment-intent.service';

export interface ProcessWebhookInput {
  providerCode: string;
  signature: string;
  timestamp?: string;
  payload: Record<string, unknown>;
  rawBody: string;
}

@Injectable()
export class PaymentWebhookService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly boundary: PaymentsBoundaryService,
    private readonly providerRegistry: PaymentProviderRegistryService,
    private readonly paymentIntents: PaymentIntentService,
  ) {}

  async process(input: ProcessWebhookInput) {
    this.boundary.rejectPciFields(input.payload);

    const payloadHash = hashPaymentPayload(input.payload);
    const externalEventId = this.readPayloadString(input.payload.externalEventId);

    const existing = await this.prisma.paymentProviderWebhookEvent.findUnique({
      where: {
        provider_externalEventId: {
          provider: input.providerCode,
          externalEventId,
        },
      },
    });
    if (existing) {
      await this.prisma.paymentProviderWebhookEvent.update({
        where: { id: existing.id },
        data: { processingStatus: PaymentWebhookProcessingStatus.DUPLICATE },
      });
      return { status: 'DUPLICATE' as const, webhookEvent: existing };
    }

    const provider = this.providerRegistry.resolve(input.providerCode);
    const verification = await provider.verifyWebhook({
      signature: input.signature,
      timestamp: input.timestamp,
      payload: input.payload,
      rawBody: input.rawBody,
    });

    const webhookEvent = await this.prisma.paymentProviderWebhookEvent.create({
      data: {
        provider: input.providerCode,
        externalEventId,
        signatureValidationResult: verification.signatureValidationResult,
        timestampValidation: verification.timestampValidation,
        payloadHash,
        eventType: verification.eventType,
        processingStatus: verification.valid
          ? PaymentWebhookProcessingStatus.VALIDATED
          : PaymentWebhookProcessingStatus.REJECTED,
        failureReason: verification.valid
          ? undefined
          : this.failureReason(verification.signatureValidationResult, verification.timestampValidation),
      },
    });

    if (!verification.valid) {
      return { status: 'REJECTED' as const, webhookEvent };
    }

    if (
      !verification.providerIntentReference ||
      verification.amountCents === undefined ||
      !verification.currency
    ) {
      throw new BadRequestException('Webhook missing settlement fields');
    }

    const intent = await this.prisma.paymentIntent.findFirst({
      where: { providerIntentReference: verification.providerIntentReference },
    });
    if (!intent) {
      await this.markFailed(webhookEvent.id, 'Payment intent not found');
      throw new BadRequestException('Payment intent not found for webhook');
    }

    try {
      const result = await this.paymentIntents.settleFromWebhook({
        providerCode: input.providerCode,
        providerIntentReference: verification.providerIntentReference,
        providerTransactionReference:
          verification.providerTransactionReference ?? `${verification.providerIntentReference}-webhook`,
        amountCents: verification.amountCents,
        currency: verification.currency,
        providerStatusRaw: verification.providerStatusRaw ?? 'settled',
        settlementReference: verification.settlementReference,
        payload: input.payload,
        channel: intent.channel,
      });

      const updatedWebhook = await this.prisma.paymentProviderWebhookEvent.update({
        where: { id: webhookEvent.id },
        data: {
          processingStatus: result.duplicate
            ? PaymentWebhookProcessingStatus.DUPLICATE
            : PaymentWebhookProcessingStatus.PROCESSED,
          processedAt: new Date(),
          relatedTransactionId: result.transaction.id,
        },
      });

      return {
        status: result.duplicate ? ('DUPLICATE' as const) : ('PROCESSED' as const),
        webhookEvent: updatedWebhook,
        settlement: result,
      };
    } catch (error) {
      await this.markFailed(
        webhookEvent.id,
        error instanceof Error ? error.message : 'Settlement failed',
      );
      throw error;
    }
  }

  private async markFailed(webhookEventId: string, failureReason: string) {
    await this.prisma.paymentProviderWebhookEvent.update({
      where: { id: webhookEventId },
      data: {
        processingStatus: PaymentWebhookProcessingStatus.FAILED,
        failureReason,
      },
    });
  }

  private failureReason(signature: string, timestamp: string): string {
    if (signature !== 'VALID') {
      return 'Invalid webhook signature';
    }
    if (timestamp === 'REPLAY_REJECTED') {
      return 'Replayed webhook rejected';
    }
    return 'Webhook validation failed';
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
}
