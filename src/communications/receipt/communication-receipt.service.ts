import { Injectable } from '@nestjs/common';
import { type CommunicationReceipt, CommunicationReceiptMethod } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { DuplicateReceiptException } from '../common/communications.exceptions';
import { CommunicationDeliveryNotFoundException } from '../common/communications.exceptions';

export interface RecordCommunicationReceiptInput {
  deliveryId: string;
  attemptId?: string;
  recipientId: string;
  receivedAt: Date;
  method: CommunicationReceiptMethod;
  identityAssuranceLevel?: string;
  emailOpenPixel?: boolean;
  configuredLegalReceipt?: boolean;
  callbackIdempotencyKey?: string;
}

@Injectable()
export class CommunicationReceiptService {
  constructor(private readonly prisma: PrismaService) {}

  async recordReceipt(input: RecordCommunicationReceiptInput): Promise<CommunicationReceipt> {
    if (input.callbackIdempotencyKey) {
      const existing = await this.prisma.communicationReceipt.findUnique({
        where: { callbackIdempotencyKey: input.callbackIdempotencyKey },
      });
      if (existing) {
        throw new DuplicateReceiptException(input.callbackIdempotencyKey);
      }
    }

    const delivery = await this.prisma.communicationDelivery.findUnique({
      where: { id: input.deliveryId },
      include: { message: true },
    });

    if (!delivery) {
      throw new CommunicationDeliveryNotFoundException(input.deliveryId);
    }

    const isLegalReceipt =
      input.configuredLegalReceipt === true &&
      !input.emailOpenPixel &&
      input.method !== ('EMAIL_OPEN_PIXEL' as CommunicationReceiptMethod);

    return this.prisma.communicationReceipt.create({
      data: {
        deliveryId: input.deliveryId,
        attemptId: input.attemptId,
        recipientId: input.recipientId,
        receivedAt: input.receivedAt,
        method: input.method,
        identityAssuranceLevel: input.identityAssuranceLevel,
        isLegalReceipt,
        emailOpenPixel: input.emailOpenPixel ?? false,
        sourceDeliveryId: input.deliveryId,
        callbackIdempotencyKey: input.callbackIdempotencyKey,
      },
    });
  }

  async recordEmailOpenPixel(
    deliveryId: string,
    recipientId: string,
  ): Promise<CommunicationReceipt> {
    return this.recordReceipt({
      deliveryId,
      recipientId,
      receivedAt: new Date(),
      method: CommunicationReceiptMethod.OTHER,
      emailOpenPixel: true,
      configuredLegalReceipt: false,
    });
  }
}
