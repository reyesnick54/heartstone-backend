import { Injectable } from '@nestjs/common';
import {
  CommunicationChannel,
  type CommunicationFailureRecord,
  CommunicationFailureRetryState,
} from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { CommunicationDeliveryNotFoundException } from '../common/communications.exceptions';

export interface RecordCommunicationFailureInput {
  deliveryId: string;
  failureReason: string;
  retryState?: CommunicationFailureRetryState;
  alternateChannel?: CommunicationChannel;
  escalationReference?: string;
  affectsLegalStatus?: boolean;
}

@Injectable()
export class CommunicationFailureService {
  constructor(private readonly prisma: PrismaService) {}

  async recordFailure(input: RecordCommunicationFailureInput): Promise<CommunicationFailureRecord> {
    const delivery = await this.prisma.communicationDelivery.findUnique({
      where: { id: input.deliveryId },
    });

    if (!delivery) {
      throw new CommunicationDeliveryNotFoundException(input.deliveryId);
    }

    return this.prisma.communicationFailureRecord.create({
      data: {
        deliveryId: input.deliveryId,
        failureReason: input.failureReason,
        retryState: input.retryState ?? CommunicationFailureRetryState.PENDING_RETRY,
        alternateChannel: input.alternateChannel,
        escalationReference: input.escalationReference,
        affectsLegalStatus: input.affectsLegalStatus,
      },
    });
  }

  async resolveFailure(
    failureId: string,
    resolutionNotes: string,
  ): Promise<CommunicationFailureRecord> {
    return this.prisma.communicationFailureRecord.update({
      where: { id: failureId },
      data: {
        resolutionNotes,
        resolvedAt: new Date(),
        retryState: CommunicationFailureRetryState.RESOLVED,
      },
    });
  }
}
