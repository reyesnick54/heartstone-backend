import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CommunicationChannelType } from '@prisma/client';

import {
  NotificationChannelDispatchInput,
  NotificationChannelDispatchResult,
  NotificationChannelPort,
} from '../../../operational-support/communications/ports/notification-channel.port';
import {
  isOperationalProviderConfigured,
  type OperationalProvidersConfig,
  resolveOperationalReadinessState,
} from '../config/operational-providers.config';
import { OPERATIONAL_PROVIDERS_CONFIG_KEY } from '../config/operational-providers.config';
import { OPERATIONAL_PROVIDER_READINESS_CODES } from '../s19.constants';
import { OperationalProviderNotReadyError } from './configured-payment-provider.adapter';

@Injectable()
export class HttpEmailProviderAdapter implements NotificationChannelPort {
  readonly channel = CommunicationChannelType.EMAIL;
  readonly isProductionAdapter = true;

  constructor(private readonly configService: ConfigService) {}

  get operationalReadinessState(): 'READY' | 'BLOCKED' | 'TEST_ONLY' {
    const config = this.configService.getOrThrow<OperationalProvidersConfig>(
      OPERATIONAL_PROVIDERS_CONFIG_KEY,
    );
    return resolveOperationalReadinessState(config, 'email');
  }

  private assertReady(): void {
    const config = this.configService.getOrThrow<OperationalProvidersConfig>(
      OPERATIONAL_PROVIDERS_CONFIG_KEY,
    );
    if (!isOperationalProviderConfigured(config, 'email')) {
      throw new OperationalProviderNotReadyError(
        OPERATIONAL_PROVIDER_READINESS_CODES.EMAIL_PROVIDER_NOT_CONFIGURED,
      );
    }
  }

  async dispatch(input: NotificationChannelDispatchInput): Promise<NotificationChannelDispatchResult> {
    this.assertReady();
    const config = this.configService.getOrThrow<OperationalProvidersConfig>(
      OPERATIONAL_PROVIDERS_CONFIG_KEY,
    );

    const endpoint = config.emailProviderEndpoint ?? '';
    const response = await fetch(`${endpoint}/messages`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        channel: 'email',
        to: input.destinationReference,
        subject: input.subject,
        body: input.body,
        correlationReference: input.messageId,
        sender: config.emailSenderIdentity,
        deliveryId: input.deliveryId,
        attemptId: input.attemptId,
      }),
    });

    if (!response.ok) {
      throw new Error(`Email provider returned HTTP ${String(response.status)}`);
    }

    const body = (await response.json()) as { providerMessageId?: string };
    return {
      providerReference: body.providerMessageId ?? `email:${input.deliveryId}:${input.attemptId}`,
      queued: true,
    };
  }
}

@Injectable()
export class HttpSmsProviderAdapter implements NotificationChannelPort {
  readonly channel = CommunicationChannelType.SMS;
  readonly isProductionAdapter = true;

  constructor(private readonly configService: ConfigService) {}

  get operationalReadinessState(): 'READY' | 'BLOCKED' | 'TEST_ONLY' {
    const config = this.configService.getOrThrow<OperationalProvidersConfig>(
      OPERATIONAL_PROVIDERS_CONFIG_KEY,
    );
    return resolveOperationalReadinessState(config, 'sms');
  }

  private assertReady(): void {
    const config = this.configService.getOrThrow<OperationalProvidersConfig>(
      OPERATIONAL_PROVIDERS_CONFIG_KEY,
    );
    if (!isOperationalProviderConfigured(config, 'sms')) {
      throw new OperationalProviderNotReadyError(
        OPERATIONAL_PROVIDER_READINESS_CODES.SMS_PROVIDER_NOT_CONFIGURED,
      );
    }
  }

  async dispatch(input: NotificationChannelDispatchInput): Promise<NotificationChannelDispatchResult> {
    this.assertReady();
    const config = this.configService.getOrThrow<OperationalProvidersConfig>(
      OPERATIONAL_PROVIDERS_CONFIG_KEY,
    );

    const endpoint = config.smsProviderEndpoint ?? '';
    const response = await fetch(`${endpoint}/messages`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        channel: 'sms',
        to: input.destinationReference,
        body: input.body,
        correlationReference: input.messageId,
        sender: config.smsSenderIdentity,
        deliveryId: input.deliveryId,
        attemptId: input.attemptId,
      }),
    });

    if (!response.ok) {
      throw new Error(`SMS provider returned HTTP ${String(response.status)}`);
    }

    const body = (await response.json()) as { providerMessageId?: string };
    return {
      providerReference: body.providerMessageId ?? `sms:${input.deliveryId}:${input.attemptId}`,
      queued: true,
    };
  }
}
