import { Injectable, NotFoundException } from '@nestjs/common';
import {
  EvidenceRequirementLinkStatus,
  MasterAdministrativeFileIntegrityStatus,
} from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { MasterFileCompletenessService } from '../../evidence-records/completeness/master-file-completeness.service';
import { type MasterFileCompletenessAssessment } from '../../evidence-records/completeness/master-file-completeness.types';

export interface AssessMasterFileCompletenessInput {
  masterAdministrativeFileId: string;
  requiredRequirementCodes: string[];
}

@Injectable()
export class MasterFileCompletenessAssessmentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly completeness: MasterFileCompletenessService,
  ) {}

  async assess(
    input: AssessMasterFileCompletenessInput,
  ): Promise<MasterFileCompletenessAssessment> {
    const masterFile = await this.prisma.masterAdministrativeFile.findUnique({
      where: { id: input.masterAdministrativeFileId },
      select: { id: true, integrityStatus: true },
    });

    if (!masterFile) {
      throw new NotFoundException(
        `Master administrative file "${input.masterAdministrativeFileId}" was not found`,
      );
    }

    const evidenceRecords = await this.prisma.evidenceRecord.findMany({
      where: { masterAdministrativeFileId: input.masterAdministrativeFileId },
      select: {
        id: true,
        status: true,
        requirementLinks: {
          include: { checklistItem: { select: { itemCode: true } } },
        },
      },
    });

    const integrityEvents = await this.prisma.recordIntegrityEvent.findMany({
      where: {
        recordType: 'MasterAdministrativeFile',
        recordId: input.masterAdministrativeFileId,
      },
      select: { eventType: true },
    });

    const safeHalted =
      masterFile.integrityStatus === MasterAdministrativeFileIntegrityStatus.INTEGRITY_COMPROMISED;

    return this.completeness.assess({
      masterAdministrativeFileId: input.masterAdministrativeFileId,
      requiredRequirementCodes: input.requiredRequirementCodes,
      evidenceRecords: evidenceRecords.map((record) => ({
        id: record.id,
        status: record.status,
        requirementLinks: record.requirementLinks.map((link) => ({
          requirementCode: link.checklistItem.itemCode,
          satisfied: link.status === EvidenceRequirementLinkStatus.SATISFIED,
        })),
      })),
      integrityEvents: integrityEvents.map((event) => ({
        eventType: event.eventType,
      })),
      safeHalted,
    });
  }
}
