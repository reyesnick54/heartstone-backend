import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  type MasterAdministrativeFile,
  MasterAdministrativeFileLifecycleStatus,
  MasterAdministrativeFilePrivacyClassification,
  type MasterAdministrativeFileSection,
  MasterAdministrativeFileSecurityClassification,
  StructuralLifecycleStatus,
} from '@prisma/client';

import { PrismaService } from '../database/prisma.service';
import {
  assertActorMayInitializeMasterFile,
  assertInstitutionalOfficeEligible,
} from './common/master-administrative-file-ownership.validation';
import {
  MASTER_FILE_NUMBER_PREFIX,
  MASTER_FILE_SECTION_DEFINITIONS,
} from './records.constants';

export interface InitializeMasterFileInput {
  caseId: string;
  actorIdentityId?: string;
  administrativeOwnerOfficeId?: string;
  recordsCustodianOfficeId?: string;
}

export type MasterAdministrativeFileWithSections = MasterAdministrativeFile & {
  sections: MasterAdministrativeFileSection[];
};

@Injectable()
export class MasterAdministrativeFileService {
  constructor(private readonly prisma: PrismaService) {}

  async initializeForCase(input: InitializeMasterFileInput): Promise<MasterAdministrativeFileWithSections> {
    if (input.actorIdentityId) {
      const actor = await this.prisma.identity.findUnique({
        where: { id: input.actorIdentityId },
        select: { type: true },
      });
      assertActorMayInitializeMasterFile({ actorIdentityType: actor?.type });
    }

    const existing = await this.prisma.masterAdministrativeFile.findUnique({
      where: { caseId: input.caseId },
      include: { sections: { orderBy: { sectionNumber: 'asc' } } },
    });

    if (existing) {
      return existing;
    }

    const caseRecord = await this.prisma.case.findUnique({
      where: { id: input.caseId },
      include: {
        application: true,
        workflowInstances: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    if (!caseRecord) {
      throw new NotFoundException(`Case "${input.caseId}" was not found`);
    }

    const administrativeOwnerOfficeId =
      input.administrativeOwnerOfficeId ??
      (await this.resolveDefaultAdministrativeOwnerOffice(caseRecord.responsibleDepartmentId));
    const recordsCustodianOfficeId =
      input.recordsCustodianOfficeId ??
      (await this.resolveDefaultRecordsCustodianOffice(
        caseRecord.responsibleDepartmentId,
        administrativeOwnerOfficeId,
      ));

    await this.assertOfficeOwnership({
      administrativeOwnerOfficeId,
      recordsCustodianOfficeId,
      responsibleDepartmentId: caseRecord.responsibleDepartmentId,
      responsibleInstitutionId: caseRecord.responsibleInstitutionId,
    });

    const workflowVersionId = caseRecord.workflowInstances[0]?.workflowVersionReference ?? null;
    const fileNumber = await this.generateFileNumber();

    return this.prisma.$transaction(async (tx) => {
      const file = await tx.masterAdministrativeFile.create({
        data: {
          fileNumber,
          caseId: caseRecord.id,
          applicationId: caseRecord.applicationId,
          governmentServiceId: caseRecord.governmentServiceId,
          governmentServiceVersionId: caseRecord.governmentServiceVersionId,
          responsibleInstitutionId: caseRecord.responsibleInstitutionId,
          responsibleDepartmentId: caseRecord.responsibleDepartmentId,
          administrativeOwnerOfficeId,
          recordsCustodianOfficeId,
          workflowVersionId,
          lifecycleStatus: MasterAdministrativeFileLifecycleStatus.OPEN,
          securityClassification: MasterAdministrativeFileSecurityClassification.OFFICIAL,
          privacyClassification: MasterAdministrativeFilePrivacyClassification.STANDARD,
          authoritativeRecordLocationReference: `records://master-file/${fileNumber}`,
          sections: {
            create: MASTER_FILE_SECTION_DEFINITIONS.map((section) => ({
              sectionType: section.sectionType,
              sectionNumber: section.sectionNumber,
              title: section.title,
              isRestricted: ['RECOMMENDATION_AND_DECISION', 'ISSUANCE', 'SUPPORTING_EVIDENCE'].includes(
                section.sectionType,
              ),
            })),
          },
        },
        include: { sections: { orderBy: { sectionNumber: 'asc' } } },
      });

      await tx.case.update({
        where: { id: caseRecord.id },
        data: { masterAdministrativeFileReference: file.id },
      });

      return file;
    });
  }

  async findById(id: string): Promise<MasterAdministrativeFileWithSections> {
    const file = await this.prisma.masterAdministrativeFile.findUnique({
      where: { id },
      include: { sections: { orderBy: { sectionNumber: 'asc' } } },
    });

    if (!file) {
      throw new NotFoundException(`Master Administrative File "${id}" was not found`);
    }

    return file;
  }

  async findByCaseId(caseId: string): Promise<MasterAdministrativeFileWithSections> {
    const file = await this.prisma.masterAdministrativeFile.findUnique({
      where: { caseId },
      include: { sections: { orderBy: { sectionNumber: 'asc' } } },
    });

    if (!file) {
      throw new NotFoundException(`No Master Administrative File exists for case "${caseId}"`);
    }

    return file;
  }

  async assertFileNumberImmutable(fileId: string, attemptedFileNumber: string): Promise<void> {
    const file = await this.findById(fileId);
    if (file.fileNumber !== attemptedFileNumber) {
      throw new ConflictException('Master Administrative File number is immutable');
    }
  }

  private async resolveDefaultAdministrativeOwnerOffice(departmentId: string): Promise<string> {
    const office = await this.prisma.office.findFirst({
      where: {
        departmentId,
        status: StructuralLifecycleStatus.ACTIVE,
        code: { not: { startsWith: 'VENDOR' } },
      },
      orderBy: { code: 'asc' },
    });

    if (!office) {
      throw new NotFoundException('No eligible administrative owner office found for department');
    }

    return office.id;
  }

  private async resolveDefaultRecordsCustodianOffice(
    departmentId: string,
    administrativeOwnerOfficeId: string,
  ): Promise<string> {
    const office = await this.prisma.office.findFirst({
      where: {
        departmentId,
        status: StructuralLifecycleStatus.ACTIVE,
        id: { not: administrativeOwnerOfficeId },
        code: { contains: 'RECORDS' },
      },
      orderBy: { code: 'asc' },
    });

    if (office) {
      return office.id;
    }

    const fallback = await this.prisma.office.findFirst({
      where: {
        departmentId,
        status: StructuralLifecycleStatus.ACTIVE,
        id: { not: administrativeOwnerOfficeId },
      },
      orderBy: { code: 'desc' },
    });

    if (!fallback) {
      return administrativeOwnerOfficeId;
    }

    return fallback.id;
  }

  private async assertOfficeOwnership(input: {
    administrativeOwnerOfficeId: string;
    recordsCustodianOfficeId: string;
    responsibleDepartmentId: string;
    responsibleInstitutionId: string;
  }): Promise<void> {
    const offices = await this.prisma.office.findMany({
      where: {
        id: { in: [input.administrativeOwnerOfficeId, input.recordsCustodianOfficeId] },
      },
      include: { department: true },
    });

    const expectedCount =
      input.administrativeOwnerOfficeId === input.recordsCustodianOfficeId ? 1 : 2;

    if (offices.length !== expectedCount) {
      throw new NotFoundException('Specified institutional offices were not found');
    }

    for (const office of offices) {
      assertInstitutionalOfficeEligible(office);

      if (office.departmentId !== input.responsibleDepartmentId) {
        throw new ConflictException('Master file offices must belong to the responsible department');
      }

      if (office.department.institutionId !== input.responsibleInstitutionId) {
        throw new ConflictException('Master file offices must belong to the responsible institution');
      }
    }
  }

  private async generateFileNumber(): Promise<string> {
    const count = await this.prisma.masterAdministrativeFile.count();
    const year = new Date().getFullYear();
    return `${MASTER_FILE_NUMBER_PREFIX}-${String(year)}-${String(count + 1).padStart(6, '0')}`;
  }
}
