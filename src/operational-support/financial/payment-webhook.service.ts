import { createHash } from 'node:crypto';

import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  PaymentIntentStatus,
  PaymentWebhookProcessingStatus,
  Prisma,
} from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { OperationalSupportBoundaryService } from '../common/operational-support-boundary.service';
import { OPERATIONAL_SUPPORT_REASON_CODES } from '../operational-support.constants';
import { PaymentTransactionService } from './payment-transaction.service';
import {
  PAYMENT_PROVIDER_PORT,
  PaymentProviderPort,
} from './ports/payment-provider.port';

export interface ProcessPaymentWebhookInput {
  paymentProviderConfigurationId: string;
  rawBody: string;
  signature: string;
}

export interface ReceivePaymentWebhookInput {
  paymentProviderConfigurationId: string;
  eventType: string;
  externalEventId: string;
  payload: Record<string, unknown>;
  signature: string;
}

@Injectable()
export class PaymentWebhookService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly boundary: OperationalSupportBoundaryService,
    private readonly paymentTransaction: PaymentTransactionService,
    @Inject(PAYMENT_PROVIDER_PORT)
    private readonly paymentProvider: PaymentProviderPort,
  ) {}

  async receiveWebhook(input: ReceivePaymentWebhookInput) {
    const rawBody = JSON.stringify({
      ...input.payload,
      eventType: input.eventType,
      externalEventId: input.externalEventId,
    });

    return this.processWebhook({
      paymentProviderConfigurationId: input.paymentProviderConfigurationId,
      rawBody,
      signature: input.signature,
    });
  }

  async processWebhook(input: ProcessPaymentWebhookInput) {
    this.boundary.rejectPaymentCardStorageFields(
      JSON.parse(input.rawBody) as Record<string, unknown>,
    );

    const providerConfig = await this.prisma.paymentProviderConfiguration.findUnique({
      where: { id: input.paymentProviderConfigurationId },
    });

    if (!providerConfig) {
      throw new NotFoundException(
        `PaymentProviderConfiguration ${input.paymentProviderConfigurationId} not found`,
      );
    }

    const configuration = providerConfig.configuration as Record<string, unknown>;
    const signatureValid = this.paymentProvider.verifyWebhookSignature({
      rawBody: input.rawBody,
      signature: input.signature,
      configuration,
    });

    if (!signatureValid) {
      await this.recordRejectedEvent(providerConfig.id, input.rawBody, 'Invalid webhook signature');
      throw new ForbiddenException(OPERATIONAL_SUPPORT_REASON_CODES.WEBHOOK_SIGNATURE_INVALID);
    }

    const payload = this.paymentProvider.parseWebhookPayload(input.rawBody);

    const existing = await this.prisma.paymentProviderWebhookEvent.findUnique({
      where: {
        paymentProviderConfigurationId_externalEventId: {
          paymentProviderConfigurationId: providerConfig.id,
          externalEventId: payload.externalEventId,
        },
      },
    });

    if (existing) {
      if (existing.processingStatus === PaymentWebhookProcessingStatus.PROCESSED) {
        return {
          status: PaymentWebhookProcessingStatus.DUPLICATE,
          event: existing,
          idempotent: true,
        };
      }

      throw new BadRequestException(OPERATIONAL_SUPPORT_REASON_CODES.WEBHOOK_DUPLICATE);
    }

    const paymentIntent = await this.prisma.paymentIntent.findUnique({
      where: { intentReference: payload.paymentIntentReference },
      include: { invoice: true },
    });

    if (!paymentIntent) {
      await this.recordRejectedEvent(
        providerConfig.id,
        input.rawBody,
        `Unknown payment intent ${payload.paymentIntentReference}`,
        payload.externalEventId,
        payload.eventType,
      );
      throw new NotFoundException(`PaymentIntent ${payload.paymentIntentReference} not found`);
    }

    this.boundary.assertWebhookAmountMatches(paymentIntent.amountCents, payload.amountCents);
    this.boundary.assertWebhookCurrencyMatches(paymentIntent.currency, payload.currency);

    const webhookEvent = await this.prisma.paymentProviderWebhookEvent.create({
      data: {
        paymentProviderConfigurationId: providerConfig.id,
        eventType: payload.eventType,
        externalEventId: payload.externalEventId,
        payload: JSON.parse(input.rawBody) as Prisma.InputJsonValue,
        processingStatus: PaymentWebhookProcessingStatus.AUTHENTICATED,
      },
    });

    if (!payload.succeeded) {
      const failed = await this.prisma.paymentProviderWebhookEvent.update({
        where: { id: webhookEvent.id },
        data: {
          processingStatus: PaymentWebhookProcessingStatus.PROCESSED,
          processedAt: new Date(),
          failureReason: payload.failureReason ?? 'Provider reported failure',
        },
      });

      await this.prisma.paymentIntent.update({
        where: { id: paymentIntent.id },
        data: {
          status: PaymentIntentStatus.FAILED,
          failureReason: payload.failureReason,
          completedAt: new Date(),
        },
      });

      return { status: PaymentWebhookProcessingStatus.PROCESSED, event: failed, idempotent: false };
    }

    const settlement = await this.paymentTransaction.settlePayment({
      paymentIntentId: paymentIntent.id,
      paymentProviderConfigurationId: providerConfig.id,
      providerTransactionReference: payload.providerTransactionReference,
      amountCents: payload.amountCents,
      currency: payload.currency,
      rawResponse: JSON.parse(input.rawBody) as Prisma.InputJsonValue,
    });

    const processed = await this.prisma.paymentProviderWebhookEvent.update({
      where: { id: webhookEvent.id },
      data: {
        processingStatus: PaymentWebhookProcessingStatus.PROCESSED,
        processedAt: new Date(),
      },
    });

    return {
      status: PaymentWebhookProcessingStatus.PROCESSED,
      event: processed,
      settlement,
      idempotent: false,
    };
  }

  private async recordRejectedEvent(
    paymentProviderConfigurationId: string,
    rawBody: string,
    failureReason: string,
    externalEventId?: string,
    eventType?: string,
  ) {
    const parsed = JSON.parse(rawBody) as { externalEventId?: string; eventType?: string };
    const eventId =
      externalEventId ?? parsed.externalEventId ?? createHash('sha256').update(rawBody).digest('hex');
    const type = eventType ?? parsed.eventType ?? 'UNKNOWN';

    await this.prisma.paymentProviderWebhookEvent.create({
      data: {
        paymentProviderConfigurationId,
        eventType: type,
        externalEventId: eventId,
        payload: JSON.parse(rawBody) as Prisma.InputJsonValue,
        processingStatus: PaymentWebhookProcessingStatus.REJECTED,
        processedAt: new Date(),
        failureReason,
      },
    });
  }
}
