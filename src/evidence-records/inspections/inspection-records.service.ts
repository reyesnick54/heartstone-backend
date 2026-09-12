import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { EvidenceCustodyEventType, InspectionRecordStatus } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { EvidenceRecordsBoundaryService } from '../common/evidence-records-boundary.service';
import { generateEvidenceReferenceNumber } from '../common/reference-number.util';
import { INSPECTION_REFERENCE_PREFIX } from '../evidence-records.constants';

@Injectable()
export class InspectionRecordsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly boundary: EvidenceRecordsBoundaryService,
  ) {}

  async schedule(input: {
    masterAdministrativeFileId: string;
    inspectorOfficeholderId?: string;
    scheduledAt?: Date;
  }) {
    return this.prisma.inspectionRecord.create({
      data: {
        inspectionReference: generateEvidenceReferenceNumber(INSPECTION_REFERENCE_PREFIX),
        masterAdministrativeFileId: input.masterAdministrativeFileId,
        inspectorOfficeholderId: input.inspectorOfficeholderId,
        status: InspectionRecordStatus.SCHEDULED,
        scheduledAt: input.scheduledAt ?? new Date(),
      },
    });
  }

  async recordCustodyTransfer(input: {
    evidenceRecordId: string;
    actorIdentityId: string;
    actorOfficeholderId?: string;
    fromLocationRef: string;
    toLocationRef: string;
    occurredAt?: Date;
  }) {
    const occurredAt = input.occurredAt ?? new Date();
    this.boundary.assertCustodyEventNotBackdated(occurredAt);

    const priorEvents = await this.prisma.evidenceCustodyEvent.findMany({
      where: { evidenceRecordId: input.evidenceRecordId },
      orderBy: { occurredAt: 'desc' },
      take: 1,
    });

    if (priorEvents.length === 0) {
      throw new BadRequestException({
        message: 'Inspection custody chain must be maintained',
        code: 'CUSTODY_CHAIN_REQUIRED',
      });
    }

    return this.prisma.evidenceCustodyEvent.create({
      data: {
        evidenceRecordId: input.evidenceRecordId,
        eventType: EvidenceCustodyEventType.TRANSFERRED,
        actorIdentityId: input.actorIdentityId,
        actorOfficeholderId: input.actorOfficeholderId,
        fromLocationRef: input.fromLocationRef,
        toLocationRef: input.toLocationRef,
        occurredAt,
        notes: 'Inspection custody transfer',
      },
    });
  }

  async linkEvidence(input: {
    inspectionRecordId: string;
    evidenceRecordId: string;
    notes?: string;
  }) {
    const inspection = await this.prisma.inspectionRecord.findUnique({
      where: { id: input.inspectionRecordId },
    });
    if (!inspection) {
      throw new NotFoundException('Inspection record not found');
    }

    return this.prisma.inspectionEvidenceItem.create({
      data: {
        inspectionRecordId: input.inspectionRecordId,
        evidenceRecordId: input.evidenceRecordId,
        notes: input.notes,
      },
    });
  }
}
