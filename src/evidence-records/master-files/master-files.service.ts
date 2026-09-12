import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  MasterAdministrativeFileSectionType,
  MasterAdministrativeFileStatus,
} from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { EvidenceRecordsBoundaryService } from '../common/evidence-records-boundary.service';
import { generateEvidenceReferenceNumber } from '../common/reference-number.util';
import { MasterFileCompletenessService } from '../completeness/master-file-completeness.service';
import { MASTER_FILE_REFERENCE_PREFIX } from '../evidence-records.constants';

@Injectable()
export class MasterFilesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly boundary: EvidenceRecordsBoundaryService,
    private readonly completeness: MasterFileCompletenessService,
  ) {}

  async openForCase(input: {
    caseId: string;
    actorIdentityId: string;
    title?: string;
    institutionId?: string;
  }) {
    const caseRecord = await this.prisma.case.findUnique({
      where: { id: input.caseId },
      include: { masterAdministrativeFile: true },
    });

    if (!caseRecord) {
      throw new NotFoundException('Case not found');
    }

    this.boundary.assertMasterFileRequiresCase(input.caseId);
    await this.boundary.assertOfficialIdentity(input.actorIdentityId);

    if (caseRecord.masterAdministrativeFile) {
      throw new ConflictException('Master administrative file already exists for case');
    }

    const institutionId = input.institutionId ?? caseRecord.responsibleInstitutionId;
    if (!institutionId) {
      throw new ForbiddenException('Master administrative file requires institutional owner');
    }

    const masterFile = await this.prisma.masterAdministrativeFile.create({
      data: {
        fileReference: generateEvidenceReferenceNumber(MASTER_FILE_REFERENCE_PREFIX),
        caseId: input.caseId,
        institutionId,
        departmentId: caseRecord.responsibleDepartmentId,
        title: input.title ?? `Master File for ${caseRecord.caseNumber}`,
        status: MasterAdministrativeFileStatus.OPEN,
        sections: {
          create: [
            {
              sectionKey: 'intake',
              title: 'Intake',
              sectionType: MasterAdministrativeFileSectionType.INTAKE,
              displayOrder: 1,
            },
            {
              sectionKey: 'evidence',
              title: 'Evidence',
              sectionType: MasterAdministrativeFileSectionType.EVIDENCE,
              displayOrder: 2,
            },
          ],
        },
      },
      include: { sections: true },
    });

    await this.prisma.case.update({
      where: { id: input.caseId },
      data: { masterAdministrativeFileReference: masterFile.fileReference },
    });

    return masterFile;
  }

  async findById(id: string, actorIdentityId: string, isOfficial = false) {
    const masterFile = await this.prisma.masterAdministrativeFile.findUnique({
      where: { id },
      include: {
        case: true,
        sections: true,
        documents: true,
        evidenceRecords: true,
        packets: true,
      },
    });

    if (!masterFile) {
      throw new NotFoundException('Master administrative file not found');
    }

    if (!isOfficial) {
      await this.boundary.assertApplicantCanAccessMasterFile(id, actorIdentityId);
    }

    return masterFile;
  }

  async assessCompleteness(masterFileId: string, requiredRequirementCodes: string[]) {
    const masterFile = await this.prisma.masterAdministrativeFile.findUnique({
      where: { id: masterFileId },
      include: {
        evidenceRecords: { include: { requirementLinks: true } },
      },
    });

    if (!masterFile) {
      throw new NotFoundException('Master administrative file not found');
    }

    const integrityEvents = await this.prisma.recordIntegrityEvent.findMany({
      where: {
        targetRecordType: 'MasterAdministrativeFile',
        targetRecordId: masterFileId,
      },
    });

    const workflow = masterFile.caseId
      ? await this.prisma.caseWorkflowInstance.findUnique({
          where: { caseId: masterFile.caseId },
        })
      : null;

    return this.completeness.assess({
      masterAdministrativeFileId: masterFileId,
      requiredRequirementCodes,
      evidenceRecords: masterFile.evidenceRecords.map((record) => ({
        id: record.id,
        status: record.status,
        requirementLinks: record.requirementLinks.map((link) => ({
          requirementCode: link.requirementCode,
          satisfied: link.satisfied,
        })),
      })),
      integrityEvents,
      safeHalted: workflow?.status === 'SAFE_HALTED',
    });
  }

  async assertAccess(
    masterFileId: string,
    actorIdentityId: string,
    isOfficial: boolean,
  ): Promise<void> {
    if (isOfficial) {
      return;
    }
    await this.boundary.assertApplicantCanAccessMasterFile(masterFileId, actorIdentityId);
  }

  async close(masterFileId: string) {
    const masterFile = await this.prisma.masterAdministrativeFile.findUnique({
      where: { id: masterFileId },
    });

    if (!masterFile) {
      throw new NotFoundException('Master administrative file not found');
    }

    if (masterFile.status === MasterAdministrativeFileStatus.CLOSED) {
      throw new ConflictException('Master administrative file is already closed');
    }

    return this.prisma.masterAdministrativeFile.update({
      where: { id: masterFileId },
      data: {
        status: MasterAdministrativeFileStatus.CLOSED,
        closedAt: new Date(),
      },
    });
  }
}
