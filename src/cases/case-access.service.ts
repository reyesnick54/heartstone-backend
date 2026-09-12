import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { AppointmentStatus, Case, IdentityOfficeholderLinkStatus, Prisma } from '@prisma/client';

import { PrismaService } from '../database/prisma.service';
import { QueryCasesDto } from './dto/query-cases.dto';

@Injectable()
export class CaseAccessService {
  constructor(private readonly prisma: PrismaService) {}

  async assertCanView(caseId: string, identityId: string): Promise<Case> {
    const caseRecord = await this.findCaseOrThrow(caseId);

    if (await this.canView(caseRecord, identityId)) {
      return caseRecord;
    }

    throw new ForbiddenException('You are not authorized to access this case');
  }

  async assertCanManageStatus(caseId: string, identityId: string): Promise<Case> {
    const caseRecord = await this.findCaseOrThrow(caseId);

    if (this.isApplicant(caseRecord, identityId)) {
      throw new ForbiddenException('Applicants cannot manage case status');
    }

    if (
      await this.isResponsibleDepartmentOfficial(caseRecord.responsibleDepartmentId, identityId)
    ) {
      return caseRecord;
    }

    throw new ForbiddenException('You are not authorized to manage this case status');
  }

  async assertCanAssign(caseId: string, identityId: string): Promise<Case> {
    const caseRecord = await this.findCaseOrThrow(caseId);

    if (this.isApplicant(caseRecord, identityId)) {
      throw new ForbiddenException('Applicants cannot assign case managers');
    }

    if (
      await this.isResponsibleDepartmentOfficial(caseRecord.responsibleDepartmentId, identityId)
    ) {
      return caseRecord;
    }

    throw new ForbiddenException('You are not authorized to assign a case manager');
  }

  async assertCanCreateFromApplication(
    responsibleDepartmentId: string,
    identityId: string,
  ): Promise<void> {
    if (!(await this.isResponsibleDepartmentOfficial(responsibleDepartmentId, identityId))) {
      throw new ForbiddenException('You are not authorized to create a case for this application');
    }
  }

  async buildAccessibleCasesWhere(
    identityId: string,
    query: QueryCasesDto,
  ): Promise<Prisma.CaseWhereInput> {
    const departmentIds = await this.resolveAccessibleDepartmentIds(identityId);
    const managedCaseIds = await this.resolveManagedCaseIds(identityId);

    if (query.responsibleDepartmentId) {
      const canAccessDepartment =
        departmentIds.includes(query.responsibleDepartmentId) ||
        (managedCaseIds.length > 0 &&
          (await this.prisma.case.count({
            where: {
              id: { in: managedCaseIds },
              responsibleDepartmentId: query.responsibleDepartmentId,
            },
          })) > 0);

      if (!canAccessDepartment) {
        const applicantCasesInDepartment = await this.prisma.case.count({
          where: {
            applicantIdentityId: identityId,
            responsibleDepartmentId: query.responsibleDepartmentId,
          },
        });

        if (applicantCasesInDepartment === 0) {
          throw new ForbiddenException(
            'You are not authorized to list cases for the specified department',
          );
        }
      }
    }

    const visibilityClauses: Prisma.CaseWhereInput[] = [{ applicantIdentityId: identityId }];

    if (departmentIds.length > 0) {
      visibilityClauses.push({ responsibleDepartmentId: { in: departmentIds } });
    }

    if (managedCaseIds.length > 0) {
      visibilityClauses.push({ id: { in: managedCaseIds } });
    }

    const where: Prisma.CaseWhereInput = {
      OR: visibilityClauses,
    };

    if (query.caseStatus !== undefined) {
      where.caseStatus = query.caseStatus;
    }

    if (query.responsibleDepartmentId !== undefined) {
      where.responsibleDepartmentId = query.responsibleDepartmentId;
    }

    return where;
  }

  private async findCaseOrThrow(caseId: string): Promise<Case> {
    const caseRecord = await this.prisma.case.findUnique({ where: { id: caseId } });

    if (!caseRecord) {
      throw new NotFoundException(`Case "${caseId}" was not found`);
    }

    return caseRecord;
  }

  private isApplicant(caseRecord: Case, identityId: string): boolean {
    return caseRecord.applicantIdentityId === identityId;
  }

  private async canView(caseRecord: Case, identityId: string): Promise<boolean> {
    if (this.isApplicant(caseRecord, identityId)) {
      return true;
    }

    if (
      await this.isResponsibleDepartmentOfficial(caseRecord.responsibleDepartmentId, identityId)
    ) {
      return true;
    }

    return this.isAssignedCaseManager(caseRecord.currentCaseManagerOfficeholderId, identityId);
  }

  private async isResponsibleDepartmentOfficial(
    responsibleDepartmentId: string,
    identityId: string,
  ): Promise<boolean> {
    const now = new Date();

    const link = await this.prisma.identityOfficeholderLink.findFirst({
      where: {
        identityId,
        status: IdentityOfficeholderLinkStatus.ACTIVE,
        officeholder: {
          appointments: {
            some: {
              status: AppointmentStatus.ACTIVE,
              office: { departmentId: responsibleDepartmentId },
              effectiveFrom: { lte: now },
              OR: [{ effectiveUntil: null }, { effectiveUntil: { gte: now } }],
            },
          },
        },
      },
    });

    return link !== null;
  }

  private async isAssignedCaseManager(
    currentCaseManagerOfficeholderId: string | null,
    identityId: string,
  ): Promise<boolean> {
    if (!currentCaseManagerOfficeholderId) {
      return false;
    }

    const link = await this.prisma.identityOfficeholderLink.findFirst({
      where: {
        identityId,
        officeholderId: currentCaseManagerOfficeholderId,
        status: IdentityOfficeholderLinkStatus.ACTIVE,
      },
    });

    return link !== null;
  }

  private async resolveAccessibleDepartmentIds(identityId: string): Promise<string[]> {
    const now = new Date();

    const appointments = await this.prisma.appointment.findMany({
      where: {
        status: AppointmentStatus.ACTIVE,
        effectiveFrom: { lte: now },
        OR: [{ effectiveUntil: null }, { effectiveUntil: { gte: now } }],
        officeholder: {
          identityLinks: {
            some: {
              identityId,
              status: IdentityOfficeholderLinkStatus.ACTIVE,
            },
          },
        },
      },
      select: {
        office: {
          select: { departmentId: true },
        },
      },
    });

    return [...new Set(appointments.map((appointment) => appointment.office.departmentId))];
  }

  private async resolveManagedCaseIds(identityId: string): Promise<string[]> {
    const links = await this.prisma.identityOfficeholderLink.findMany({
      where: {
        identityId,
        status: IdentityOfficeholderLinkStatus.ACTIVE,
      },
      select: { officeholderId: true },
    });

    if (links.length === 0) {
      return [];
    }

    const managedCases = await this.prisma.case.findMany({
      where: {
        currentCaseManagerOfficeholderId: {
          in: links.map((link) => link.officeholderId),
        },
      },
      select: { id: true },
    });

    return managedCases.map((caseRecord) => caseRecord.id);
  }
}
