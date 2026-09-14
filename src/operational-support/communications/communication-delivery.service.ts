import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import {
  CommunicationChannelType,
  CommunicationDelivery,
  CommunicationDeliveryStatus,
  CommunicationMessage,
  CommunicationMessageStatus,
  MandatoryCommunicationRuleStatus,
} from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { ALTERNATE_CHANNEL_MAP } from '../operational-support.constants';
import { TestEmailAdapter } from './adapters/test-email.adapter';
import { TestSmsAdapter } from './adapters/test-sms.adapter';
import { NotificationChannelPort } from './ports/notification-channel.port';

export interface DeliverMessageInput {
  messageId: string;
  mandatoryRuleCode?: string;
  actorIdentityId?: string;
}

@Injectable()
export class CommunicationDeliveryService {
  private readonly channelPorts: Map<CommunicationChannelType, NotificationChannelPort>;

  constructor(
    private readonly prisma: PrismaService,
    testEmailAdapter: TestEmailAdapter,
    testSmsAdapter: TestSmsAdapter,
  ) {
    this.channelPorts = new Map<CommunicationChannelType, NotificationChannelPort>([
      [testEmailAdapter.channel, testEmailAdapter],
      [testSmsAdapter.channel, testSmsAdapter],
    ]);
  }

  async deliverMessage(input: DeliverMessageInput): Promise<CommunicationDelivery[]> {
    const message = await this.prisma.communicationMessage.findUnique({
      where: { id: input.messageId },
      include: { recipients: true },
    });

    if (!message) {
      throw new NotFoundException(`CommunicationMessage ${input.messageId} not found`);
    }

    if (
      message.status !== CommunicationMessageStatus.APPROVED &&
      message.status !== CommunicationMessageStatus.QUEUED
    ) {
      throw new BadRequestException('Only approved or queued messages may be delivered');
    }

    const mandatoryDelivery = await this.isMandatoryDelivery(input.mandatoryRuleCode);
    const deliveries: CommunicationDelivery[] = [];

    await this.prisma.communicationMessage.update({
      where: { id: message.id },
      data: { status: CommunicationMessageStatus.DELIVERING },
    });

    for (const recipient of message.recipients) {
      const delivery = await this.deliverToRecipient(message, recipient, mandatoryDelivery);
      deliveries.push(delivery);
    }

    const deliveredCount = deliveries.filter(
      (delivery) => delivery.status === CommunicationDeliveryStatus.DELIVERED,
    ).length;

    const aggregateStatus = this.deriveMessageStatus(deliveredCount, deliveries.length);

    await this.prisma.communicationMessage.update({
      where: { id: message.id },
      data: { status: aggregateStatus },
    });

    return deliveries;
  }

  private async deliverToRecipient(
    message: CommunicationMessage & {
      recipients: {
        id: string;
        recipientReference: string;
        recipientIdentityId: string | null;
      }[];
    },
    recipient: {
      id: string;
      recipientReference: string;
      recipientIdentityId: string | null;
    },
    mandatoryDelivery: boolean,
  ): Promise<CommunicationDelivery> {
    const channelAllowed = await this.isChannelAllowed(
      message.channelType,
      recipient.recipientIdentityId,
      mandatoryDelivery,
    );

    const channel = message.channelType;
    if (!channelAllowed && !mandatoryDelivery) {
      throw new BadRequestException(
        `Recipient has disabled channel ${message.channelType} and delivery is not mandatory`,
      );
    }

    let delivery = await this.createDelivery(message.id, recipient.id, channel);
    let result = await this.attemptDelivery(message, recipient, delivery, channel, mandatoryDelivery);

    if (
      result.status === CommunicationDeliveryStatus.FAILED &&
      !mandatoryDelivery
    ) {
      const alternate = ALTERNATE_CHANNEL_MAP[channel];
      if (alternate && this.channelPorts.has(alternate)) {
        delivery = await this.createDelivery(message.id, recipient.id, alternate);
        result = await this.attemptDelivery(
          message,
          recipient,
          delivery,
          alternate,
          mandatoryDelivery,
        );
      }
    }

    if (
      result.status === CommunicationDeliveryStatus.FAILED &&
      mandatoryDelivery
    ) {
      const alternate = ALTERNATE_CHANNEL_MAP[channel];
      if (alternate && this.channelPorts.has(alternate)) {
        delivery = await this.markDeliverySuperseded(delivery.id);
        delivery = await this.createDelivery(message.id, recipient.id, alternate);
        result = await this.attemptDelivery(
          message,
          recipient,
          delivery,
          alternate,
          mandatoryDelivery,
        );
      }
    }

    return result.delivery;
  }

  private async attemptDelivery(
    message: CommunicationMessage,
    recipient: { recipientReference: string },
    delivery: CommunicationDelivery,
    channel: CommunicationChannelType,
    mandatoryDelivery: boolean,
  ): Promise<{ delivery: CommunicationDelivery; status: CommunicationDeliveryStatus }> {
    const adapter = this.channelPorts.get(channel);
    const attemptNumber = 1;
    const startedAt = new Date();

    await this.prisma.communicationDelivery.update({
      where: { id: delivery.id },
      data: { status: CommunicationDeliveryStatus.IN_PROGRESS, startedAt },
    });

    const attempt = await this.prisma.communicationDeliveryAttempt.create({
      data: {
        communicationDeliveryId: delivery.id,
        attemptNumber,
        status: CommunicationDeliveryStatus.IN_PROGRESS,
        attemptedAt: startedAt,
      },
    });

    if (!adapter) {
      const failed = await this.markDeliveryFailed(
        delivery.id,
        attempt.id,
        `No adapter registered for channel ${channel}`,
      );
      return { delivery: failed, status: CommunicationDeliveryStatus.FAILED };
    }

    try {
      const providerResult = await adapter.dispatch({
        deliveryId: delivery.id,
        attemptId: attempt.id,
        messageId: message.id,
        channel,
        destinationReference: recipient.recipientReference,
        subject: message.subject,
        body: message.body,
        mandatoryDelivery,
      });

      const completedAt = new Date();
      await this.prisma.communicationDeliveryAttempt.update({
        where: { id: attempt.id },
        data: {
          status: CommunicationDeliveryStatus.DELIVERED,
          providerReference: providerResult.providerReference,
        },
      });

      const updated = await this.prisma.communicationDelivery.update({
        where: { id: delivery.id },
        data: {
          status: CommunicationDeliveryStatus.DELIVERED,
          completedAt,
        },
      });

      return { delivery: updated, status: CommunicationDeliveryStatus.DELIVERED };
    } catch (error) {
      const reason = error instanceof Error ? error.message : 'Delivery failed';
      const failed = await this.markDeliveryFailed(delivery.id, attempt.id, reason);
      return { delivery: failed, status: CommunicationDeliveryStatus.FAILED };
    }
  }

  private async isMandatoryDelivery(mandatoryRuleCode?: string): Promise<boolean> {
    if (!mandatoryRuleCode) {
      return false;
    }

    const rule = await this.prisma.mandatoryCommunicationRule.findUnique({
      where: { ruleCode: mandatoryRuleCode },
    });

    return rule?.status === MandatoryCommunicationRuleStatus.ACTIVE;
  }

  private async isChannelAllowed(
    channelType: CommunicationChannelType,
    recipientIdentityId: string | null,
    mandatoryDelivery: boolean,
  ): Promise<boolean> {
    if (mandatoryDelivery) {
      return true;
    }

    if (!recipientIdentityId) {
      return true;
    }

    const preference = await this.prisma.communicationPreference.findFirst({
      where: {
        identityId: recipientIdentityId,
        channelType,
      },
    });

    if (!preference) {
      return true;
    }

    return preference.isEnabled;
  }

  private async createDelivery(
    messageId: string,
    recipientId: string,
    channelType: CommunicationChannelType,
  ): Promise<CommunicationDelivery> {
    return this.prisma.communicationDelivery.create({
      data: {
        communicationMessageId: messageId,
        communicationRecipientId: recipientId,
        channelType,
        status: CommunicationDeliveryStatus.PENDING,
      },
    });
  }

  private async markDeliverySuperseded(deliveryId: string): Promise<CommunicationDelivery> {
    return this.prisma.communicationDelivery.update({
      where: { id: deliveryId },
      data: { status: CommunicationDeliveryStatus.SUPERSEDED },
    });
  }

  private async markDeliveryFailed(
    deliveryId: string,
    attemptId: string,
    failureReason: string,
  ): Promise<CommunicationDelivery> {
    await this.prisma.communicationDeliveryAttempt.update({
      where: { id: attemptId },
      data: {
        status: CommunicationDeliveryStatus.FAILED,
        failureReason,
      },
    });

    return this.prisma.communicationDelivery.update({
      where: { id: deliveryId },
      data: { status: CommunicationDeliveryStatus.FAILED },
    });
  }

  private deriveMessageStatus(
    deliveredCount: number,
    totalCount: number,
  ): CommunicationMessageStatus {
    if (deliveredCount === 0) {
      return CommunicationMessageStatus.FAILED;
    }
    if (deliveredCount < totalCount) {
      return CommunicationMessageStatus.PARTIALLY_DELIVERED;
    }
    return CommunicationMessageStatus.DELIVERED;
  }
}
