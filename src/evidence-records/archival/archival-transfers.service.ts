import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ArchivalTransferStatus, LegalHoldTargetType, Prisma } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { hashRecordsPayload } from '../common/records-hash.util';

export interface CreateArchivalTransferInput {
  transferNumber: string;
  sourceRepositoryId: string;
  destinationRepositoryId: string;
  items: {
    targetType: LegalHoldTargetType;
    targetReference: string;
    versionReference: string;
    integrityHash: string;
    metadata?: Record<string, unknown>;
  }[];
  integrityVerification: string;
  metadataCompleteness: string;
  restrictions?: string;
  sendingCustodianIdentityId?: string;
}

export interface AcknowledgeArchivalTransferInput {
  receivingCustodianIdentityId: string;
  acknowledgedAt?: Date;
}

@Injectable()
export class ArchivalTransfersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(input: CreateArchivalTransferInput) {
    const manifest = input.items.map((item) => ({
      targetType: item.targetType,
      targetReference: item.targetReference,
      versionReference: item.versionReference,
      integrityHash: item.integrityHash,
      metadata: item.metadata ?? {},
    }));

    return this.prisma.archivalTransfer.create({
      data: {
        transferNumber: input.transferNumber,
        sourceRepositoryId: input.sourceRepositoryId,
        destinationRepositoryId: input.destinationRepositoryId,
        manifest: manifest as Prisma.InputJsonValue,
        manifestHash: hashRecordsPayload(manifest),
        integrityVerification: input.integrityVerification,
        metadataCompleteness: input.metadataCompleteness,
        restrictions: input.restrictions,
        sendingCustodianIdentityId: input.sendingCustodianIdentityId,
        status: ArchivalTransferStatus.MANIFEST_PREPARED,
        items: {
          create: input.items.map((item) => ({
            targetType: item.targetType,
            targetReference: item.targetReference,
            versionReference: item.versionReference,
            integrityHash: item.integrityHash,
            metadata: (item.metadata ?? {}) as Prisma.InputJsonValue,
          })),
        },
      },
      include: { items: true },
    });
  }

  async markInTransit(id: string, transferDate: Date) {
    const transfer = await this.getTransfer(id);
    if (transfer.status !== ArchivalTransferStatus.MANIFEST_PREPARED) {
      throw new BadRequestException('Transfer must have a prepared manifest before transit');
    }

    return this.prisma.archivalTransfer.update({
      where: { id },
      data: {
        status: ArchivalTransferStatus.IN_TRANSIT,
        transferDate,
      },
      include: { items: true },
    });
  }

  async acknowledgeReceipt(id: string, input: AcknowledgeArchivalTransferInput) {
    const transfer = await this.getTransfer(id);
    if (transfer.status !== ArchivalTransferStatus.IN_TRANSIT) {
      throw new BadRequestException('Transfer must be in transit before receipt acknowledgment');
    }

    return this.prisma.archivalTransfer.update({
      where: { id },
      data: {
        status: ArchivalTransferStatus.ACKNOWLEDGED,
        receivingCustodianIdentityId: input.receivingCustodianIdentityId,
        receivingAcknowledgedAt: input.acknowledgedAt ?? new Date(),
      },
      include: { items: true },
    });
  }

  async isTransferComplete(id: string): Promise<boolean> {
    const transfer = await this.getTransfer(id);
    return transfer.status === ArchivalTransferStatus.ACKNOWLEDGED;
  }

  private async getTransfer(id: string) {
    const transfer = await this.prisma.archivalTransfer.findUnique({
      where: { id },
      include: { items: true },
    });
    if (!transfer) {
      throw new NotFoundException(`ArchivalTransfer "${id}" was not found`);
    }
    return transfer;
  }
}
