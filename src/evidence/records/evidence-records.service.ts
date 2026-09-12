import { Injectable } from '@nestjs/common';
import { EvidenceRecordStatus } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import {
  generateAdministrativeFileReference,
  generateEvidenceNumber,
} from '../common/evidence-reference.util';
import { EvidenceRecordNotFoundException } from '../common/exceptions/evidence.exceptions';
import { ReceiveEvidenceDto } from './dto/receive-evidence.dto';

@Injectable()
export class EvidenceRecordsService {
  constructor(private readonly prisma: PrismaService) {}

  async receiveEvidence(submitterIdentityId: string, dto: ReceiveEvidenceDto) {
    const caseRecord = await this.prisma.case.findUnique({
      where: { id: dto.caseId },
      include: { masterAdministrativeFile: true },
    });

    if (!caseRecord) {
      throw new EvidenceRecordNotFoundException(dto.caseId);
    }

    const evidenceCount = await this.prisma.evidenceRecord.count();
    const evidenceNumber = generateEvidenceNumber(evidenceCount + 1);

    return this.prisma.$transaction(async (tx) => {
      let masterAdministrativeFileId = caseRecord.masterAdministrativeFile?.id;

      if (!masterAdministrativeFileId) {
        const fileCount = await tx.masterAdministrativeFile.count();
        const masterFile = await tx.masterAdministrativeFile.create({
          data: {
            fileReference: generateAdministrativeFileReference(fileCount + 1),
            caseId: caseRecord.id,
          },
        });
        masterAdministrativeFileId = masterFile.id;
      }

      return tx.evidenceRecord.create({
        data: {
          evidenceNumber,
          masterAdministrativeFileId,
          caseId: dto.caseId,
          documentVersionId: dto.documentVersionId,
          externalRecordReference: dto.externalRecordReference,
          title: dto.title,
          description: dto.description,
          evidenceType: dto.evidenceType,
          source: dto.source,
          submittingParty: dto.submittingParty,
          authorOrIssuingBody: dto.authorOrIssuingBody,
          dateCreated: dto.dateCreated ? new Date(dto.dateCreated) : undefined,
          dateReceived: new Date(dto.dateReceived),
          periodCovered: dto.periodCovered,
          status: EvidenceRecordStatus.RECEIVED,
          validFrom: dto.validFrom ? new Date(dto.validFrom) : undefined,
          validUntil: dto.validUntil ? new Date(dto.validUntil) : undefined,
          confidentialityClassification: dto.confidentialityClassification,
          integrityReference: dto.integrityReference,
          limitations: dto.limitations,
          retentionRuleReference: dto.retentionRuleReference,
        },
      });
    });
  }

  async getById(evidenceId: string) {
    const record = await this.prisma.evidenceRecord.findUnique({
      where: { id: evidenceId },
      include: {
        verifications: { orderBy: { performedAt: 'asc' } },
        requirementLinks: { include: { checklistItem: true } },
        purposeAcceptances: { orderBy: { decidedAt: 'asc' } },
        qualityAssessments: { orderBy: { assessedAt: 'asc' } },
        supersededEvidence: true,
        supersededByEvidence: true,
      },
    });

    if (!record) {
      throw new EvidenceRecordNotFoundException(evidenceId);
    }

    return record;
  }

  async markStatus(evidenceId: string, status: EvidenceRecordStatus, reason?: string) {
    await this.getById(evidenceId);

    return this.prisma.evidenceRecord.update({
      where: { id: evidenceId },
      data: {
        status,
        limitations: reason ? `${reason}${reason.endsWith('.') ? '' : '.'}` : undefined,
      },
    });
  }

  async supersedeEvidence(evidenceId: string, supersedingEvidenceId: string) {
    await this.getById(evidenceId);
    await this.getById(supersedingEvidenceId);

    const [withdrawn, superseding] = await this.prisma.$transaction([
      this.prisma.evidenceRecord.update({
        where: { id: evidenceId },
        data: {
          status: EvidenceRecordStatus.SUPERSEDED,
          supersededByEvidenceId: supersedingEvidenceId,
        },
      }),
      this.prisma.evidenceRecord.update({
        where: { id: supersedingEvidenceId },
        data: { status: EvidenceRecordStatus.RECEIVED },
      }),
    ]);

    return { withdrawn, superseding };
  }

  async withdrawEvidence(evidenceId: string, reason: string) {
    return this.markStatus(evidenceId, EvidenceRecordStatus.WITHDRAWN, reason);
  }

  async disputeEvidence(evidenceId: string, reason: string) {
    return this.markStatus(evidenceId, EvidenceRecordStatus.DISPUTED, reason);
  }

  isExpired(record: { validUntil: Date | null; status: EvidenceRecordStatus }): boolean {
    if (!record.validUntil) {
      return false;
    }
    return record.validUntil.getTime() < Date.now();
  }

  async refreshCurrencyStatus(evidenceId: string) {
    const record = await this.getById(evidenceId);
    if (!this.isExpired(record)) {
      return record;
    }

    if (
      record.status === EvidenceRecordStatus.EXPIRED ||
      record.status === EvidenceRecordStatus.SUPERSEDED ||
      record.status === EvidenceRecordStatus.WITHDRAWN
    ) {
      return record;
    }

    return this.prisma.evidenceRecord.update({
      where: { id: evidenceId },
      data: { status: EvidenceRecordStatus.EXPIRED },
    });
  }
}
