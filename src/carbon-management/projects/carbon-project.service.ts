import { randomUUID } from 'node:crypto';

import { Injectable } from '@nestjs/common';
import { CarbonProjectStatus } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { CARBON_PROJECT_PREFIX } from '../carbon-management.constants';

export interface RegisterCarbonProjectInput {
  programmeId: string;
  organizationId: string;
  jurisdictionId?: string;
  strategicProjectProfileId?: string;
  projectCategoryCode: string;
}

@Injectable()
export class CarbonProjectService {
  constructor(private readonly prisma: PrismaService) {}

  async registerProject(input: RegisterCarbonProjectInput) {
    const projectReferenceNumber = `${CARBON_PROJECT_PREFIX}-${randomUUID().slice(0, 8).toUpperCase()}`;
    const project = await this.prisma.carbonProjectReference.create({
      data: {
        id: randomUUID(),
        projectReferenceNumber,
        programmeId: input.programmeId,
        organizationId: input.organizationId,
        jurisdictionId: input.jurisdictionId,
        strategicProjectProfileId: input.strategicProjectProfileId,
        projectCategoryCode: input.projectCategoryCode,
        status: CarbonProjectStatus.DRAFT,
        doesNotDuplicateOrganization: true,
        doesNotInferApprovalFromStrategicProject: true,
      },
      include: { organization: true, strategicProjectProfile: true },
    });

    return { project, organizationRecordsDuplicated: 0 };
  }

  async linkApplicationReference(input: {
    carbonProjectId: string;
    applicationId?: string;
    caseId?: string;
    serviceCode?: string;
  }) {
    return this.prisma.carbonApplicationReference.create({
      data: {
        id: randomUUID(),
        carbonProjectId: input.carbonProjectId,
        applicationId: input.applicationId,
        caseId: input.caseId,
        serviceCode: input.serviceCode,
      },
    });
  }
}
