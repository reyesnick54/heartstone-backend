import { Injectable } from '@nestjs/common';
import {
  CommunicationChannel,
  type CommunicationDelivery,
  type CommunicationDeliveryAttempt,
  CommunicationDeliveryStatus,
  CommunicationProviderType,
} from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { CommunicationDeliveryNotFoundException } from '../common/communications.exceptions';
import { CommunicationsBoundaryService } from '../common/communications-boundary.service';
import { MAX_DELIVERY_RETRY_ATTEMPTS } from '../communications.constants';
import { CommunicationFailureService } from '../failure/communication-failure.service';
import { CommunicationMafIndexService } from '../maf/communication-maf-index.service';
import { CommunicationMessageService } from '../messages/communication-message.service';
import { CommunicationPreferenceService } from '../preferences/communication-preference.service';
import { CommunicationRecipientService } from '../recipients/communication-recipient.service';
import {
  DeterministicEmailNotificationAdapter,
  DeterministicPortalNotificationAdapter,
  DeterministicPushNotificationAdapter,
  DeterministicSmsNotificationAdapter,
} from './adapters/deterministic-notification.adapters';
import { NotificationProviderPort } from './ports/notification-provider.port';

export interface PrepareCommunicationDeliveryInput {
  messageId: string;
  recipientId: string;
  channel: CommunicationChannel;
  destinationReference?: string;
  requiredOrOptional?: boolean;
  idempotencyKey?: string;
}

@Injectable()
export class CommunicationDeliveryService {
  private readonly providerPorts: Map<CommunicationProviderType, NotificationProviderPort>;

  constructor(
    private readonly prisma: PrismaService,
    private readonly boundary: CommunicationsBoundaryService,
    private readonly messageService: CommunicationMessageService,
    private readonly recipientService: CommunicationRecipientService,
    private readonly preferenceService: CommunicationPreferenceService,
    private readonly failureService: CommunicationFailureService,
    private readonly mafIndexService: CommunicationMafIndexService,
    emailAdapter: DeterministicEmailNotificationAdapter,
    smsAdapter: DeterministicSmsNotificationAdapter,
    pushAdapter: DeterministicPushNotificationAdapter,
    portalAdapter: DeterministicPortalNotificationAdapter,
  ) {
    this.providerPorts = new Map<CommunicationProviderType, NotificationProviderPort>([
      [emailAdapter.providerType, emailAdapter],
      [smsAdapter.providerType, smsAdapter],
      [pushAdapter.providerType, pushAdapter],
      [portalAdapter.providerType, portalAdapter],
    ]);
  }

  resolveProvider(channel: CommunicationChannel): CommunicationProviderType {
    switch (channel) {
      case CommunicationChannel.EMAIL:
        return CommunicationProviderType.EMAIL;
      case CommunicationChannel.SMS:
        return CommunicationProviderType.SMS;
      case CommunicationChannel.PUSH:
        return CommunicationProviderType.PUSH;
      case CommunicationChannel.PORTAL:
      case CommunicationChannel.SECURE_MESSAGE:
      case CommunicationChannel.GOVERNMENT_INTERFACE:
        return CommunicationProviderType.PORTAL;
      default:
        return CommunicationProviderType.OTHER;
    }
  }

  async prepareDelivery(input: PrepareCommunicationDeliveryInput): Promise<CommunicationDelivery> {
    const message = await this.messageService.assertReadyForDelivery(input.messageId);
    const recipient = await this.recipientService.assertRecipientEligible(input.recipientId);

    this.boundary.assertChannelApprovedForClassification(input.channel, message.classification);

    if (message.templateVersionId) {
      const version = await this.prisma.communicationTemplateVersion.findUnique({
        where: { id: message.templateVersionId },
      });
      if (version && !version.allowedChannels.includes(input.channel)) {
        this.boundary.assertChannelApprovedForClassification(input.channel, message.classification);
      }
    }

    if (recipient.recipientIdentityId) {
      await this.preferenceService.assertDeliveryAllowed({
        identityId: recipient.recipientIdentityId,
        channel: input.channel,
        mandatoryCategory: message.mandatoryCategory,
        requiredOrOptional: input.requiredOrOptional ?? true,
      });
    }

    const provider = this.resolveProvider(input.channel);
    const preparedAt = new Date();

    return this.prisma.communicationDelivery.create({
      data: {
        messageId: input.messageId,
        recipientId: input.recipientId,
        channel: input.channel,
        provider,
        destinationReference: input.destinationReference ?? recipient.channelReference ?? undefined,
        requiredOrOptional: input.requiredOrOptional ?? true,
        preparedAt,
        status: CommunicationDeliveryStatus.PREPARED,
        idempotencyKey: input.idempotencyKey,
      },
    });
  }

  async sendDelivery(
    deliveryId: string,
  ): Promise<{ delivery: CommunicationDelivery; attempt: CommunicationDeliveryAttempt }> {
    const delivery = await this.prisma.communicationDelivery.findUnique({
      where: { id: deliveryId },
      include: {
        message: true,
        recipient: true,
      },
    });

    if (!delivery) {
      throw new CommunicationDeliveryNotFoundException(deliveryId);
    }

    await this.messageService.assertReadyForDelivery(delivery.messageId);
    await this.recipientService.assertRecipientEligible(delivery.recipientId);

    this.boundary.assertChannelApprovedForClassification(
      delivery.channel,
      delivery.message.classification,
    );

    const attemptCount = await this.prisma.communicationDeliveryAttempt.count({
      where: { deliveryId },
    });

    if (attemptCount >= MAX_DELIVERY_RETRY_ATTEMPTS) {
      await this.failureService.recordFailure({
        deliveryId,
        failureReason: 'Maximum retry attempts exceeded',
        retryState: 'RETRY_EXHAUSTED',
      });
      throw new CommunicationDeliveryNotFoundException(deliveryId);
    }

    const provider = this.providerPorts.get(delivery.provider);
    const attemptNumber = attemptCount + 1;
    const queuedAt = new Date();

    const attempt = await this.prisma.communicationDeliveryAttempt.create({
      data: {
        deliveryId,
        attemptNumber,
        channel: delivery.channel,
        provider: delivery.provider,
        destinationReference: delivery.destinationReference ?? undefined,
        status: CommunicationDeliveryStatus.QUEUED,
        queuedAt,
        callbackIdempotencyKey: delivery.idempotencyKey
          ? `${delivery.idempotencyKey}:attempt:${String(attemptNumber)}`
          : undefined,
      },
    });

    const providerResult = provider
      ? await provider.send({
          deliveryId,
          attemptId: attempt.id,
          messageId: delivery.messageId,
          channel: delivery.channel,
          destinationReference: delivery.destinationReference ?? undefined,
          subject: delivery.message.subject,
          bodyReference:
            delivery.message.canonicalNoticeReference ??
            `${delivery.message.sourceRecordType}:${delivery.message.sourceRecordId}`,
          classification: delivery.message.classification,
        })
      : { providerReference: `manual:${attempt.id}`, queued: true };

    const sentAt = new Date();
    const updatedAttempt = await this.prisma.communicationDeliveryAttempt.update({
      where: { id: attempt.id },
      data: {
        sentAt,
        status: CommunicationDeliveryStatus.SENT,
        providerReference: providerResult.providerReference,
      },
    });

    const updatedDelivery = await this.prisma.communicationDelivery.update({
      where: { id: deliveryId },
      data: {
        sentAt,
        status: CommunicationDeliveryStatus.SENT,
        providerReference: providerResult.providerReference,
      },
    });

    return { delivery: updatedDelivery, attempt: updatedAttempt };
  }

  async markDelivered(
    deliveryId: string,
    attemptId: string,
    providerReference?: string,
  ): Promise<CommunicationDelivery> {
    const deliveredAt = new Date();

    await this.prisma.communicationDeliveryAttempt.update({
      where: { id: attemptId },
      data: {
        deliveredAt,
        status: CommunicationDeliveryStatus.DELIVERED,
        providerReference,
      },
    });

    const delivery = await this.prisma.communicationDelivery.update({
      where: { id: deliveryId },
      data: {
        deliveredAt,
        status: CommunicationDeliveryStatus.DELIVERED,
        providerReference,
      },
      include: { message: true },
    });

    await this.mafIndexService.indexDeliveredCommunication({
      masterAdministrativeFileId: delivery.message.masterAdministrativeFileId,
      messageId: delivery.messageId,
      templateVersionId: delivery.message.templateVersionId,
      deliveredVersionReference:
        providerReference ??
        delivery.providerReference ??
        `${delivery.message.sourceRecordType}:${delivery.message.sourceRecordId}`,
    });

    return delivery;
  }

  async markFailed(
    deliveryId: string,
    attemptId: string,
    failureReason: string,
  ): Promise<CommunicationDelivery> {
    const failedAt = new Date();

    await this.prisma.communicationDeliveryAttempt.update({
      where: { id: attemptId },
      data: {
        failedAt,
        status: CommunicationDeliveryStatus.FAILED,
        failureReason,
      },
    });

    const delivery = await this.prisma.communicationDelivery.update({
      where: { id: deliveryId },
      data: {
        failedAt,
        status: CommunicationDeliveryStatus.FAILED,
      },
    });

    await this.failureService.recordFailure({
      deliveryId,
      failureReason,
      retryState: 'PENDING_RETRY',
    });

    return delivery;
  }

  async retryDelivery(deliveryId: string, idempotencyKey?: string): Promise<CommunicationDelivery> {
    const existing = await this.prisma.communicationDelivery.findUnique({
      where: { id: deliveryId },
    });

    if (!existing) {
      throw new CommunicationDeliveryNotFoundException(deliveryId);
    }

    if (idempotencyKey && existing.idempotencyKey === idempotencyKey) {
      return existing;
    }

    await this.sendDelivery(deliveryId);
    const retried = await this.prisma.communicationDelivery.findUnique({
      where: { id: deliveryId },
    });
    if (!retried) {
      throw new CommunicationDeliveryNotFoundException(deliveryId);
    }
    return retried;
  }

  async processProviderCallback(payload: Record<string, unknown>): Promise<void> {
    const provider = this.providerPorts.get(CommunicationProviderType.EMAIL);
    if (!provider) {
      return;
    }

    const validation = provider.validateCallback(payload);
    if (!validation.valid || !validation.deliveryId) {
      return;
    }

    const delivery = await this.prisma.communicationDelivery.findUnique({
      where: { id: validation.deliveryId },
    });

    if (!delivery) {
      throw new CommunicationDeliveryNotFoundException(validation.deliveryId);
    }
  }
}
