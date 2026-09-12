import { Injectable } from '@nestjs/common';
import { CaseCommunicationChannel, type CaseCommunicationOutbox } from '@prisma/client';
import { type Prisma } from '@prisma/client';

import { PrismaService } from '../../../database/prisma.service';

@Injectable()
export class CaseCommunicationOutboxService {
  constructor(private readonly prisma: PrismaService) {}

  async enqueue(
    communicationId: string,
    channel: CaseCommunicationChannel,
    payload: Prisma.InputJsonValue,
  ): Promise<CaseCommunicationOutbox> {
    return this.prisma.caseCommunicationOutbox.create({
      data: {
        communicationId,
        channel,
        payload,
        status: 'QUEUED',
      },
    });
  }

  async listQueued(limit = 100): Promise<CaseCommunicationOutbox[]> {
    return this.prisma.caseCommunicationOutbox.findMany({
      where: { status: 'QUEUED' },
      orderBy: { queuedAt: 'asc' },
      take: limit,
    });
  }
}
