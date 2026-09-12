import { Injectable, NotFoundException } from '@nestjs/common';
import {
  type Application,
  ApplicationStatus,
  type Case,
  CaseEventPublicVisibility,
  CaseEventType,
  CaseStatus,
} from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { CaseEventService } from './timeline/case-event.service';
import { CasePublicStatusProjectionService } from './timeline/case-public-status-projection.service';

export interface OpenCaseFromApplicationInput {
  applicationId: string;
  actorIdentityId?: string;
  correlationId?: string;
}

@Injectable()
export class CaseFoundationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly caseEventService: CaseEventService,
    private readonly projectionService: CasePublicStatusProjectionService,
  ) {}

  async openCaseFromApplication(input: OpenCaseFromApplicationInput): Promise<Case> {
    const application = await this.prisma.application.findUnique({
      where: { id: input.applicationId },
      include: {
        governmentService: {
          select: {
            responsibleInstitutionId: true,
            responsibleDepartmentId: true,
          },
        },
      },
    });

    if (!application) {
      throw new NotFoundException(`Application "${input.applicationId}" was not found`);
    }

    const existingCase = await this.prisma.case.findUnique({
      where: { applicationId: application.id },
    });

    if (existingCase) {
      return existingCase;
    }

    const caseNumber = await this.generateCaseNumber();

    const caseRecord = await this.prisma.$transaction(async (tx) => {
      await tx.application.update({
        where: { id: application.id },
        data: { status: ApplicationStatus.RECEIVED },
      });

      return tx.case.create({
        data: {
          caseNumber,
          applicationId: application.id,
          applicantIdentityId: application.applicantIdentityId,
          governmentServiceId: application.governmentServiceId,
          governmentServiceVersionId: application.governmentServiceVersionId,
          responsibleInstitutionId: application.governmentService.responsibleInstitutionId,
          responsibleDepartmentId: application.governmentService.responsibleDepartmentId,
          status: CaseStatus.RECEIVED,
        },
      });
    });

    await this.caseEventService.append({
      caseId: caseRecord.id,
      eventType: CaseEventType.APPLICATION_RECEIVED,
      occurredAt: new Date(),
      actorIdentityId: input.actorIdentityId,
      correlationId: input.correlationId,
      publicVisibility: CaseEventPublicVisibility.APPLICANT_VISIBLE,
    });

    const openedEvent = await this.caseEventService.append({
      caseId: caseRecord.id,
      eventType: CaseEventType.CASE_OPENED,
      occurredAt: new Date(),
      actorIdentityId: input.actorIdentityId,
      correlationId: input.correlationId,
      publicVisibility: CaseEventPublicVisibility.APPLICANT_VISIBLE,
    });

    await this.projectionService.deriveFromEvent(caseRecord.id, openedEvent);

    return caseRecord;
  }

  async getCase(caseId: string): Promise<Case> {
    const caseRecord = await this.prisma.case.findUnique({ where: { id: caseId } });
    if (!caseRecord) {
      throw new NotFoundException(`Case "${caseId}" was not found`);
    }
    return caseRecord;
  }

  async createApplication(input: {
    applicationNumber: string;
    applicantIdentityId: string;
    governmentServiceId: string;
    governmentServiceVersionId: string;
  }): Promise<Application> {
    return this.prisma.application.create({
      data: {
        applicationNumber: input.applicationNumber,
        applicantIdentityId: input.applicantIdentityId,
        governmentServiceId: input.governmentServiceId,
        governmentServiceVersionId: input.governmentServiceVersionId,
        status: ApplicationStatus.SUBMITTED,
      },
    });
  }

  private async generateCaseNumber(): Promise<string> {
    const count = await this.prisma.case.count();
    const year = new Date().getFullYear();
    return `CASE-${String(year)}-${String(count + 1).padStart(6, '0')}`;
  }
}
