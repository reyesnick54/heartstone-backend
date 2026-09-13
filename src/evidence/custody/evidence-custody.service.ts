import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { EvidenceCustodyEventType, EvidenceIntegrityState } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';

export interface AppendCustodyEventInput {
  eventType: EvidenceCustodyEventType;
  evidenceRecordId?: string;
  documentRecordId?: string;
  inspectionEvidenceItemId?: string;
  custodianIdentityId: string;
  custodianOfficeholderId?: string;
  occurredAt?: Date;
  fromLocation?: string;
  toLocation?: string;
  reason?: string;
  integrityState?: EvidenceIntegrityState;
  witnessIdentityId?: string;
  witnessOfficeholderId?: string;
}

@Injectable()
export class EvidenceCustodyService {
  constructor(private readonly prisma: PrismaService) {}

  async appendEvent(input: AppendCustodyEventInput) {
    if (!input.evidenceRecordId && !input.documentRecordId && !input.inspectionEvidenceItemId) {
      throw new BadRequestException(
        'Custody event must reference evidence, document, or inspection evidence item',
      );
    }

    if (input.evidenceRecordId) {
      await this.assertEvidenceExists(input.evidenceRecordId);
    }

    return this.prisma.evidenceCustodyEvent.create({
      data: {
        eventType: input.eventType,
        evidenceRecordId: input.evidenceRecordId,
        documentRecordId: input.documentRecordId,
        inspectionEvidenceItemId: input.inspectionEvidenceItemId,
        custodianIdentityId: input.custodianIdentityId,
        custodianOfficeholderId: input.custodianOfficeholderId,
        occurredAt: input.occurredAt ?? new Date(),
        fromLocation: input.fromLocation,
        toLocation: input.toLocation,
        reason: input.reason,
        integrityState: input.integrityState ?? EvidenceIntegrityState.UNKNOWN,
        witnessIdentityId: input.witnessIdentityId,
        witnessOfficeholderId: input.witnessOfficeholderId,
      },
    });
  }

  async listChainForEvidence(evidenceRecordId: string) {
    return this.prisma.evidenceCustodyEvent.findMany({
      where: { evidenceRecordId },
      orderBy: { occurredAt: 'asc' },
    });
  }

  rejectMutation(eventId: string): never {
    throw new BadRequestException(
      `Evidence custody event "${eventId}" is append-only and cannot be modified or deleted`,
    );
  }

  assertDoesNotClaimScientificValidity(eventType: EvidenceCustodyEventType) {
    if (eventType === EvidenceCustodyEventType.ANALYZED) {
      return {
        claimsScientificValidity: false,
        note: 'Chain of custody documents handling only; it does not establish scientific validity',
      };
    }
    return null;
  }

  private async assertEvidenceExists(evidenceRecordId: string) {
    const record = await this.prisma.evidenceRecord.findUnique({ where: { id: evidenceRecordId } });
    if (!record) {
      throw new NotFoundException('Evidence record not found');
    }
  }
}
