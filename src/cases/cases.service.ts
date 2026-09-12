import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ApplicationStatus, Case, CaseLegalStatus, CaseStatus } from '@prisma/client';

import { PrismaService } from '../database/prisma.service';
import { CaseAccessService } from './case-access.service';
import { CaseStatusService } from './case-status.service';
import { generateCaseNumber } from './common/case-number.util';
import { AssignCaseManagerDto } from './dto/assign-case-manager.dto';
import { CaseResponseDto } from './dto/case-response.dto';
import { CaseStatusHistoryResponseDto } from './dto/case-status-history-response.dto';
import { QueryCasesDto } from './dto/query-cases.dto';
import { UpdateCaseStatusDto } from './dto/update-case-status.dto';

@Injectable()
export class CasesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: CaseAccessService,
    private readonly caseStatus: CaseStatusService,
  ) {}

  async createFromApplication(
    applicationId: string,
    actorIdentityId: string,
  ): Promise<CaseResponseDto> {
    const application = await this.prisma.application.findUnique({
      where: { id: applicationId },
      include: {
        governmentService: true,
        case: true,
        submissions: {
          orderBy: { submissionSequence: 'desc' },
          take: 1,
        },
      },
    });

    if (!application) {
      throw new NotFoundException(`Application "${applicationId}" was not found`);
    }

    await this.access.assertCanCreateFromApplication(
      application.governmentService.responsibleDepartmentId,
      actorIdentityId,
    );

    if (application.case) {
      throw new ConflictException('A case already exists for this application');
    }

    if (application.currentStatus !== ApplicationStatus.RECEIVED) {
      throw new BadRequestException('Application must be in RECEIVED status to create a case');
    }

    const latestSubmission = application.submissions[0];

    if (!latestSubmission) {
      throw new BadRequestException('Application has no submission to transfer into a case');
    }

    const createdCase = await this.prisma.$transaction(async (tx) => {
      const caseRecord = await tx.case.create({
        data: {
          caseNumber: generateCaseNumber(),
          applicationId: application.id,
          applicationSubmissionId: latestSubmission.id,
          governmentServiceId: application.governmentServiceId,
          governmentServiceVersionId: application.governmentServiceVersionId,
          responsibleInstitutionId: application.governmentService.responsibleInstitutionId,
          responsibleDepartmentId: application.governmentService.responsibleDepartmentId,
          applicantIdentityId: application.applicantIdentityId,
          caseStatus: CaseStatus.RECEIVED,
          legalStatus: CaseLegalStatus.NONE,
        },
      });

      await tx.caseStatusHistory.create({
        data: {
          caseId: caseRecord.id,
          previousStatus: null,
          newStatus: CaseStatus.RECEIVED,
          previousLegalStatus: null,
          newLegalStatus: CaseLegalStatus.NONE,
          actorIdentityId,
        },
      });

      await tx.application.update({
        where: { id: application.id },
        data: { currentStatus: ApplicationStatus.TRANSFERRED_TO_CASE },
      });

      return caseRecord;
    });

    return this.mapCase(createdCase);
  }

  async findOne(caseId: string, identityId: string): Promise<CaseResponseDto> {
    const caseRecord = await this.access.assertCanView(caseId, identityId);
    return this.mapCase(caseRecord);
  }

  async findAll(query: QueryCasesDto, identityId: string): Promise<CaseResponseDto[]> {
    const where = await this.access.buildAccessibleCasesWhere(identityId, query);

    const cases = await this.prisma.case.findMany({
      where,
      orderBy: [{ createdAt: 'desc' }],
    });

    return cases.map((caseRecord) => this.mapCase(caseRecord));
  }

  async updateStatus(
    caseId: string,
    dto: UpdateCaseStatusDto,
    identityId: string,
  ): Promise<CaseResponseDto> {
    const caseRecord = await this.access.assertCanManageStatus(caseId, identityId);
    const updated = await this.caseStatus.updateStatus(caseRecord, dto, identityId);
    return this.mapCase(updated);
  }

  async assignManager(
    caseId: string,
    dto: AssignCaseManagerDto,
    identityId: string,
  ): Promise<CaseResponseDto> {
    const caseRecord = await this.access.assertCanAssign(caseId, identityId);

    if (dto.caseManagerOfficeholderId) {
      const officeholder = await this.prisma.officeholder.findUnique({
        where: { id: dto.caseManagerOfficeholderId },
      });

      if (!officeholder) {
        throw new NotFoundException(
          `Officeholder "${dto.caseManagerOfficeholderId}" was not found`,
        );
      }
    }

    if (dto.assignedOfficeId) {
      const office = await this.prisma.office.findUnique({
        where: { id: dto.assignedOfficeId },
      });

      if (!office) {
        throw new NotFoundException(`Office "${dto.assignedOfficeId}" was not found`);
      }

      if (office.departmentId !== caseRecord.responsibleDepartmentId) {
        throw new BadRequestException('Assigned office must belong to the responsible department');
      }
    }

    const updated = await this.prisma.case.update({
      where: { id: caseId },
      data: {
        currentCaseManagerOfficeholderId: dto.caseManagerOfficeholderId ?? null,
        currentAssignedOfficeId: dto.assignedOfficeId ?? null,
      },
    });

    return this.mapCase(updated);
  }

  async getHistory(caseId: string, identityId: string): Promise<CaseStatusHistoryResponseDto[]> {
    await this.access.assertCanView(caseId, identityId);

    const history = await this.prisma.caseStatusHistory.findMany({
      where: { caseId },
      orderBy: [{ createdAt: 'asc' }],
    });

    return history.map((entry) => this.mapHistory(entry));
  }

  private mapCase(caseRecord: Case): CaseResponseDto {
    return {
      id: caseRecord.id,
      caseNumber: caseRecord.caseNumber,
      applicationId: caseRecord.applicationId,
      applicationSubmissionId: caseRecord.applicationSubmissionId,
      governmentServiceId: caseRecord.governmentServiceId,
      governmentServiceVersionId: caseRecord.governmentServiceVersionId,
      responsibleInstitutionId: caseRecord.responsibleInstitutionId,
      responsibleDepartmentId: caseRecord.responsibleDepartmentId,
      caseStatus: caseRecord.caseStatus,
      legalStatus: caseRecord.legalStatus,
      priority: caseRecord.priority,
      openedAt: caseRecord.openedAt.toISOString(),
      closedAt: caseRecord.closedAt?.toISOString() ?? null,
      currentCaseManagerOfficeholderId: caseRecord.currentCaseManagerOfficeholderId,
      currentAssignedOfficeId: caseRecord.currentAssignedOfficeId,
      applicantIdentityId: caseRecord.applicantIdentityId,
      createdAt: caseRecord.createdAt.toISOString(),
      updatedAt: caseRecord.updatedAt.toISOString(),
    };
  }

  private mapHistory(entry: {
    id: string;
    caseId: string;
    previousStatus: CaseStatus | null;
    newStatus: CaseStatus;
    previousLegalStatus: CaseLegalStatus | null;
    newLegalStatus: CaseLegalStatus;
    actorIdentityId: string;
    officeholderId: string | null;
    reason: string | null;
    correlationId: string | null;
    createdAt: Date;
  }): CaseStatusHistoryResponseDto {
    return {
      id: entry.id,
      caseId: entry.caseId,
      previousStatus: entry.previousStatus,
      newStatus: entry.newStatus,
      previousLegalStatus: entry.previousLegalStatus,
      newLegalStatus: entry.newLegalStatus,
      actorIdentityId: entry.actorIdentityId,
      officeholderId: entry.officeholderId,
      reason: entry.reason,
      correlationId: entry.correlationId,
      createdAt: entry.createdAt.toISOString(),
    };
  }
}
