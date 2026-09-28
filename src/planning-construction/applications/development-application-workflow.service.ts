import { randomUUID } from 'node:crypto';

import { Injectable } from '@nestjs/common';
import {
  DevelopmentAccessActorKind,
  DevelopmentApplicationStatus,
  IdentityType,
} from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { PlanningConstructionAccessService } from '../common/planning-construction-access.service';
import { DevelopmentPermitService } from '../permits/development-permit.service';

const DEV_APP_REFERENCE_PREFIX = 'DEV-APP';

@Injectable()
export class DevelopmentApplicationWorkflowService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: PlanningConstructionAccessService,
    private readonly permitService: DevelopmentPermitService,
  ) {}

  async createApplication(input: {
    developmentProjectId: string;
    serviceCode: string;
    serviceName: string;
    accessorIdentityId: string;
    actorKind: DevelopmentAccessActorKind;
    organizationId?: string;
  }) {
    await this.access.assertProjectAccess({
      accessorIdentityId: input.accessorIdentityId,
      developmentProjectId: input.developmentProjectId,
      actorKind: input.actorKind,
      endpoint: 'POST development-applications',
      organizationId: input.organizationId,
    });

    const applicationReference = `${DEV_APP_REFERENCE_PREFIX}-${randomUUID().slice(0, 8).toUpperCase()}`;
    return this.prisma.developmentApplication.create({
      data: {
        id: randomUUID(),
        developmentProjectId: input.developmentProjectId,
        applicationReference,
        serviceCode: input.serviceCode,
        serviceName: input.serviceName,
        status: DevelopmentApplicationStatus.DRAFT,
      },
    });
  }

  async submitApplication(input: {
    developmentApplicationId: string;
    accessorIdentityId: string;
    actorKind: DevelopmentAccessActorKind;
    organizationId?: string;
  }) {
    const application = await this.prisma.developmentApplication.findUniqueOrThrow({
      where: { id: input.developmentApplicationId },
      include: { developmentProject: true },
    });

    await this.access.assertProjectAccess({
      accessorIdentityId: input.accessorIdentityId,
      developmentProjectId: application.developmentProjectId,
      actorKind: input.actorKind,
      endpoint: 'POST development-applications/submit',
      organizationId: input.organizationId,
    });

    return this.prisma.developmentApplication.update({
      where: { id: application.id },
      data: {
        status: DevelopmentApplicationStatus.SUBMITTED,
        submittedAt: new Date(),
      },
    });
  }

  async advanceToReview(developmentApplicationId: string) {
    return this.prisma.developmentApplication.update({
      where: { id: developmentApplicationId },
      data: { status: DevelopmentApplicationStatus.UNDER_REVIEW },
    });
  }

  async issuePermitForProject(input: {
    developmentProjectId: string;
    permitType: string;
    issuerIdentityId: string;
    issuedByOfficeholderId: string;
    appointmentId?: string;
  }) {
    return this.permitService.issuePermit({
      developmentProjectId: input.developmentProjectId,
      permitType: input.permitType,
      actorKind: DevelopmentAccessActorKind.PLANNING_OFFICER,
      actorIdentityType: IdentityType.INDIVIDUAL,
      issuedByOfficeholderId: input.issuedByOfficeholderId,
      issuerIdentityId: input.issuerIdentityId,
      appointmentId: input.appointmentId,
    });
  }
}
