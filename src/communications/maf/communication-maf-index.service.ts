import { Injectable } from '@nestjs/common';
import { type CommunicationMafIndexEntry } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';

export interface IndexDeliveredCommunicationInput {
  masterAdministrativeFileId: string;
  messageId: string;
  templateVersionId?: string | null;
  deliveredVersionReference: string;
}

@Injectable()
export class CommunicationMafIndexService {
  constructor(private readonly prisma: PrismaService) {}

  async indexDeliveredCommunication(
    input: IndexDeliveredCommunicationInput,
  ): Promise<CommunicationMafIndexEntry> {
    return this.prisma.communicationMafIndexEntry.upsert({
      where: {
        masterAdministrativeFileId_messageId_deliveredVersionReference: {
          masterAdministrativeFileId: input.masterAdministrativeFileId,
          messageId: input.messageId,
          deliveredVersionReference: input.deliveredVersionReference,
        },
      },
      create: {
        masterAdministrativeFileId: input.masterAdministrativeFileId,
        messageId: input.messageId,
        templateVersionId: input.templateVersionId ?? undefined,
        deliveredVersionReference: input.deliveredVersionReference,
      },
      update: {
        templateVersionId: input.templateVersionId ?? undefined,
        indexedAt: new Date(),
      },
    });
  }

  async listForMasterFile(
    masterAdministrativeFileId: string,
  ): Promise<CommunicationMafIndexEntry[]> {
    return this.prisma.communicationMafIndexEntry.findMany({
      where: { masterAdministrativeFileId },
      orderBy: { indexedAt: 'asc' },
    });
  }
}
