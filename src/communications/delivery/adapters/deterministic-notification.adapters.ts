import { Injectable } from '@nestjs/common';
import { CommunicationChannel, CommunicationProviderType } from '@prisma/client';

import {
  NotificationCallbackValidationResult,
  NotificationDeliveryStatusResult,
  NotificationProviderPort,
  NotificationSendInput,
  NotificationSendResult,
} from '../ports/notification-provider.port';

abstract class DeterministicNotificationAdapter implements NotificationProviderPort {
  abstract readonly providerType: CommunicationProviderType;
  abstract readonly supportedChannels: readonly CommunicationChannel[];

  send(input: NotificationSendInput): Promise<NotificationSendResult> {
    return Promise.resolve({
      providerReference: `${this.providerType.toLowerCase()}:${input.attemptId}`,
      queued: true,
    });
  }

  getDeliveryStatus(providerReference: string): Promise<NotificationDeliveryStatusResult> {
    return Promise.resolve({
      status: 'SENT',
      providerReference,
    });
  }

  validateCallback(payload: Record<string, unknown>): NotificationCallbackValidationResult {
    const idempotencyKey =
      typeof payload.idempotencyKey === 'string' ? payload.idempotencyKey : undefined;
    const deliveryId = typeof payload.deliveryId === 'string' ? payload.deliveryId : undefined;
    const attemptId = typeof payload.attemptId === 'string' ? payload.attemptId : undefined;
    const eventType =
      payload.eventType === 'DELIVERED' ||
      payload.eventType === 'FAILED' ||
      payload.eventType === 'BOUNCED' ||
      payload.eventType === 'REJECTED' ||
      payload.eventType === 'RECEIPT'
        ? payload.eventType
        : undefined;

    return {
      valid: Boolean(idempotencyKey && deliveryId),
      idempotencyKey,
      deliveryId,
      attemptId,
      eventType,
    };
  }
}

@Injectable()
export class DeterministicEmailNotificationAdapter extends DeterministicNotificationAdapter {
  readonly providerType = CommunicationProviderType.EMAIL;
  readonly supportedChannels = [CommunicationChannel.EMAIL] as const;
}

@Injectable()
export class DeterministicSmsNotificationAdapter extends DeterministicNotificationAdapter {
  readonly providerType = CommunicationProviderType.SMS;
  readonly supportedChannels = [CommunicationChannel.SMS] as const;
}

@Injectable()
export class DeterministicPushNotificationAdapter extends DeterministicNotificationAdapter {
  readonly providerType = CommunicationProviderType.PUSH;
  readonly supportedChannels = [CommunicationChannel.PUSH] as const;
}

@Injectable()
export class DeterministicPortalNotificationAdapter extends DeterministicNotificationAdapter {
  readonly providerType = CommunicationProviderType.PORTAL;
  readonly supportedChannels = [
    CommunicationChannel.PORTAL,
    CommunicationChannel.SECURE_MESSAGE,
    CommunicationChannel.GOVERNMENT_INTERFACE,
  ] as const;
}
