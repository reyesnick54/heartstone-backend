import { createHmac, timingSafeEqual } from 'node:crypto';

import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import {
  ParsedPaymentWebhookPayload,
  PaymentIntentCreateInput,
  PaymentIntentCreateResult,
  PaymentProviderPort,
  PaymentRefundInput,
  PaymentRefundResult,
  PaymentWebhookVerificationInput,
} from '../../../operational-support/financial/ports/payment-provider.port';
import {
  isOperationalProviderConfigured,
  type OperationalProvidersConfig,
  resolveOperationalReadinessState,
} from '../config/operational-providers.config';
import { OPERATIONAL_PROVIDERS_CONFIG_KEY } from '../config/operational-providers.config';
import { OPERATIONAL_PROVIDER_READINESS_CODES } from '../s19.constants';

export class OperationalProviderNotReadyError extends Error {
  constructor(public readonly reasonCode: string) {
    super(reasonCode);
    this.name = 'OperationalProviderNotReadyError';
  }
}

@Injectable()
export class ConfiguredPaymentProviderAdapter implements PaymentProviderPort {
  readonly providerCode = 'CONFIGURED';
  readonly isProductionAdapter = true;

  constructor(private readonly configService: ConfigService) {}

  get operationalReadinessState(): 'READY' | 'BLOCKED' | 'TEST_ONLY' {
    const config = this.configService.getOrThrow<OperationalProvidersConfig>(
      OPERATIONAL_PROVIDERS_CONFIG_KEY,
    );
    return resolveOperationalReadinessState(config, 'payment');
  }

  private assertReady(): void {
    const config = this.configService.getOrThrow<OperationalProvidersConfig>(
      OPERATIONAL_PROVIDERS_CONFIG_KEY,
    );
    if (!isOperationalProviderConfigured(config, 'payment')) {
      throw new OperationalProviderNotReadyError(
        OPERATIONAL_PROVIDER_READINESS_CODES.PAYMENT_PROVIDER_NOT_CONFIGURED,
      );
    }
  }

  verifyWebhookSignature(input: PaymentWebhookVerificationInput): boolean {
    this.assertReady();
    const secret =
      typeof input.configuration.webhookSecret === 'string'
        ? input.configuration.webhookSecret
        : '';
    if (!secret) {
      return false;
    }

    const expected = createHmac('sha256', secret).update(input.rawBody).digest('hex');
    const provided = input.signature.trim();

    if (expected.length !== provided.length) {
      return false;
    }

    return timingSafeEqual(Buffer.from(expected), Buffer.from(provided));
  }

  parseWebhookPayload(rawBody: string): ParsedPaymentWebhookPayload {
    this.assertReady();
    return JSON.parse(rawBody) as ParsedPaymentWebhookPayload;
  }

  async createPaymentIntent(input: PaymentIntentCreateInput): Promise<PaymentIntentCreateResult> {
    this.assertReady();
    const config = this.configService.getOrThrow<OperationalProvidersConfig>(
      OPERATIONAL_PROVIDERS_CONFIG_KEY,
    );
    if (!config.paymentProviderEndpoint) {
      throw new OperationalProviderNotReadyError(
        OPERATIONAL_PROVIDER_READINESS_CODES.PAYMENT_PROVIDER_NOT_CONFIGURED,
      );
    }

    const response = await fetch(`${config.paymentProviderEndpoint}/payment-intents`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'idempotency-key': input.idempotencyKey,
      },
      body: JSON.stringify({
        reference: input.paymentIntentReference,
        amountCents: input.amountCents,
        currency: input.currency,
        metadata: input.metadata ?? {},
      }),
    });

    if (!response.ok) {
      return {
        providerPaymentReference: `failed:${input.paymentIntentReference}`,
        status: 'FAILED',
      };
    }

    const body = (await response.json()) as {
      providerPaymentReference?: string;
      clientActionUrl?: string;
      status?: string;
    };

    return {
      providerPaymentReference:
        body.providerPaymentReference ?? `provider:${input.paymentIntentReference}`,
      clientActionUrl: body.clientActionUrl,
      status: body.status === 'REQUIRES_ACTION' ? 'REQUIRES_ACTION' : 'PENDING',
    };
  }

  initiateRefund(input: PaymentRefundInput): Promise<PaymentRefundResult> {
    this.assertReady();
    return Promise.resolve({
      providerRefundReference: `configured-refund:${input.providerTransactionReference}:${String(input.amountCents)}`,
    });
  }
}
