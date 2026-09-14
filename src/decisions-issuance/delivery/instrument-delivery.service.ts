import { Injectable } from '@nestjs/common';
import {
  InstrumentDelivery,
  InstrumentDeliveryAttempt,
  InstrumentDeliveryChannel,
  InstrumentDeliveryClassification,
  InstrumentDeliveryStatus,
} from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { InstrumentDeliveryAuditService } from '../audit/instrument-delivery-audit.service';
import {
  InstrumentDeliveryChannelForbiddenException,
  InstrumentDeliveryNotFoundException,
  InstrumentNotFoundException,
} from '../common/exceptions/decisions-issuance.exceptions';
import {
  RESTRICTED_DELIVERY_CLASSIFICATIONS,
  UNAPPROVED_CHANNELS_FOR_RESTRICTED,
} from '../decisions-issuance.constants';
import {
  ControlledDownloadDeliveryAdapter,
  PortalDeliveryAdapter,
} from './adapters/delivery-channel.adapters';
import { DeliveryChannelPort } from './ports/delivery-channel.port';

export interface PrepareInstrumentDeliveryInput {
  officialInstrumentId: string;
  instrumentVersionId: string;
  recipientIdentityId?: string;
  recipientOrganizationId?: string;
  recipientReference?: string;
  deliveryChannel: InstrumentDeliveryChannel;
  destinationReference?: string;
  classification?: InstrumentDeliveryClassification;
  actorIdentityId?: string;
}

@Injectable()
export class InstrumentDeliveryService {
  private readonly channelPorts: Map<InstrumentDeliveryChannel, DeliveryChannelPort>;

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: InstrumentDeliveryAuditService,
    portalAdapter: PortalDeliveryAdapter,
    controlledDownloadAdapter: ControlledDownloadDeliveryAdapter,
  ) {
    this.channelPorts = new Map<InstrumentDeliveryChannel, DeliveryChannelPort>([
      [portalAdapter.channel, portalAdapter],
      [controlledDownloadAdapter.channel, controlledDownloadAdapter],
    ]);
  }

  assertChannelApprovedForClassification(
    channel: InstrumentDeliveryChannel,
    classification: InstrumentDeliveryClassification,
  ): void {
    const adapter = this.channelPorts.get(channel);
    if (!adapter?.supportsClassification(classification)) {
      throw new InstrumentDeliveryChannelForbiddenException(channel, classification);
    }

    if (
      RESTRICTED_DELIVERY_CLASSIFICATIONS.includes(
        classification as (typeof RESTRICTED_DELIVERY_CLASSIFICATIONS)[number],
      ) &&
      UNAPPROVED_CHANNELS_FOR_RESTRICTED.includes(
        channel as (typeof UNAPPROVED_CHANNELS_FOR_RESTRICTED)[number],
      )
    ) {
      throw new InstrumentDeliveryChannelForbiddenException(channel, classification);
    }
  }

  async prepareDelivery(input: PrepareInstrumentDeliveryInput): Promise<InstrumentDelivery> {
    const instrument = await this.prisma.officialInstrument.findUnique({
      where: { id: input.officialInstrumentId },
      include: { instrumentTypeVersion: true },
    });

    if (!instrument) {
      throw new InstrumentNotFoundException(input.officialInstrumentId);
    }

    const version = await this.prisma.officialInstrumentVersion.findFirst({
      where: {
        id: input.instrumentVersionId,
        officialInstrumentId: input.officialInstrumentId,
      },
    });

    if (!version) {
      throw new InstrumentNotFoundException(input.instrumentVersionId);
    }

    if (!instrument.instrumentTypeVersion) {
      throw new InstrumentNotFoundException(input.officialInstrumentId);
    }

    const classification =
      input.classification ??
      (instrument.instrumentTypeVersion.restrictedClassification
        ? InstrumentDeliveryClassification.RESTRICTED
        : InstrumentDeliveryClassification.OFFICIAL);

    this.assertChannelApprovedForClassification(input.deliveryChannel, classification);

    const preparedAt = new Date();

    const delivery = await this.prisma.instrumentDelivery.create({
      data: {
        officialInstrumentId: input.officialInstrumentId,
        instrumentVersionId: input.instrumentVersionId,
        recipientIdentityId: input.recipientIdentityId,
        recipientOrganizationId: input.recipientOrganizationId,
        recipientReference: input.recipientReference,
        deliveryChannel: input.deliveryChannel,
        destinationReference: input.destinationReference,
        preparedAt,
        status: InstrumentDeliveryStatus.PREPARED,
        classification,
      },
    });

    await this.audit.record({
      officialInstrumentId: delivery.officialInstrumentId,
      instrumentVersionId: delivery.instrumentVersionId,
      instrumentDeliveryId: delivery.id,
      eventType: 'DELIVERY_PREPARED',
      actorIdentityId: input.actorIdentityId,
      metadata: {
        deliveryChannel: delivery.deliveryChannel,
        classification: delivery.classification,
      },
    });

    return delivery;
  }

  async sendDelivery(
    deliveryId: string,
    actorIdentityId?: string,
  ): Promise<{ delivery: InstrumentDelivery; attempt: InstrumentDeliveryAttempt }> {
    const delivery = await this.prisma.instrumentDelivery.findUnique({
      where: { id: deliveryId },
    });

    if (!delivery) {
      throw new InstrumentDeliveryNotFoundException(deliveryId);
    }

    this.assertChannelApprovedForClassification(delivery.deliveryChannel, delivery.classification);

    const attemptCount = await this.prisma.instrumentDeliveryAttempt.count({
      where: { instrumentDeliveryId: deliveryId },
    });

    const adapter = this.channelPorts.get(delivery.deliveryChannel);
    const attemptNumber = attemptCount + 1;
    const queuedAt = new Date();

    const attempt = await this.prisma.instrumentDeliveryAttempt.create({
      data: {
        instrumentDeliveryId: deliveryId,
        attemptNumber,
        deliveryChannel: delivery.deliveryChannel,
        destinationReference: delivery.destinationReference ?? undefined,
        queuedAt,
        status: InstrumentDeliveryStatus.QUEUED,
      },
    });

    const providerResult = adapter
      ? await adapter.dispatch({
          deliveryId,
          attemptId: attempt.id,
          officialInstrumentId: delivery.officialInstrumentId,
          instrumentVersionId: delivery.instrumentVersionId,
          channel: delivery.deliveryChannel,
          destinationReference: delivery.destinationReference ?? undefined,
          classification: delivery.classification,
        })
      : { providerReference: `manual:${attempt.id}`, queued: true };

    const sentAt = new Date();
    const updatedAttempt = await this.prisma.instrumentDeliveryAttempt.update({
      where: { id: attempt.id },
      data: {
        sentAt,
        status: InstrumentDeliveryStatus.SENT,
        deliveryEvidenceReference: providerResult.providerReference,
      },
    });

    const updatedDelivery = await this.prisma.instrumentDelivery.update({
      where: { id: deliveryId },
      data: {
        sentAt,
        status: InstrumentDeliveryStatus.SENT,
        deliveryEvidenceReference: providerResult.providerReference,
      },
    });

    await this.audit.record({
      officialInstrumentId: delivery.officialInstrumentId,
      instrumentVersionId: delivery.instrumentVersionId,
      instrumentDeliveryId: delivery.id,
      eventType: attemptNumber > 1 ? 'DELIVERY_REDELIVERY' : 'DELIVERY_SENT',
      actorIdentityId,
      metadata: {
        attemptNumber,
        deliveryChannel: delivery.deliveryChannel,
      },
    });

    return { delivery: updatedDelivery, attempt: updatedAttempt };
  }

  async markDelivered(
    deliveryId: string,
    attemptId: string,
    evidenceReference?: string,
    actorIdentityId?: string,
  ): Promise<InstrumentDelivery> {
    const deliveredAt = new Date();

    await this.prisma.instrumentDeliveryAttempt.update({
      where: { id: attemptId },
      data: {
        deliveredAt,
        status: InstrumentDeliveryStatus.DELIVERED,
        deliveryEvidenceReference: evidenceReference,
      },
    });

    const delivery = await this.prisma.instrumentDelivery.update({
      where: { id: deliveryId },
      data: {
        deliveredAt,
        status: InstrumentDeliveryStatus.DELIVERED,
        deliveryEvidenceReference: evidenceReference,
      },
    });

    await this.audit.record({
      officialInstrumentId: delivery.officialInstrumentId,
      instrumentVersionId: delivery.instrumentVersionId,
      instrumentDeliveryId: delivery.id,
      eventType: 'DELIVERY_DELIVERED',
      actorIdentityId,
    });

    return delivery;
  }

  async markFailed(
    deliveryId: string,
    attemptId: string,
    failureReason: string,
    actorIdentityId?: string,
  ): Promise<InstrumentDelivery> {
    const failedAt = new Date();

    await this.prisma.instrumentDeliveryAttempt.update({
      where: { id: attemptId },
      data: {
        failedAt,
        status: InstrumentDeliveryStatus.FAILED,
        failureReason,
      },
    });

    const delivery = await this.prisma.instrumentDelivery.update({
      where: { id: deliveryId },
      data: {
        failedAt,
        status: InstrumentDeliveryStatus.FAILED,
      },
    });

    await this.audit.record({
      officialInstrumentId: delivery.officialInstrumentId,
      instrumentVersionId: delivery.instrumentVersionId,
      instrumentDeliveryId: delivery.id,
      eventType: 'DELIVERY_FAILED',
      actorIdentityId,
      metadata: { failureReason },
    });

    return delivery;
  }

  async getDelivery(deliveryId: string): Promise<InstrumentDelivery | null> {
    return this.prisma.instrumentDelivery.findUnique({ where: { id: deliveryId } });
  }

  async listDeliveriesForInstrument(officialInstrumentId: string): Promise<InstrumentDelivery[]> {
    return this.prisma.instrumentDelivery.findMany({
      where: { officialInstrumentId },
      orderBy: { createdAt: 'asc' },
    });
  }
}
