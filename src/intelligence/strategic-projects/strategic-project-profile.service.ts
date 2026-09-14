import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, StrategicProjectLifecycleStage } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { StrategicProjectBoundaryService } from '../common/strategic-project-boundary.service';

export interface CreateStrategicProjectProfileInput {
  projectCode: string;
  title: string;
  description?: string;
  sponsoringInstitutionId: string;
  responsibleDepartmentId: string;
  caseId?: string;
  sectorCode?: string;
  attributionMetadata: Prisma.InputJsonValue;
  externalFactorNotes?: string;
  announcementDate?: Date;
}

@Injectable()
export class StrategicProjectProfileService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly boundary: StrategicProjectBoundaryService,
  ) {}

  async createProfile(input: CreateStrategicProjectProfileInput) {
    this.boundary.assertAttributionMetadataPresent(
      input.attributionMetadata as Record<string, unknown>,
    );

    const profile = await this.prisma.strategicProjectProfile.create({
      data: {
        projectCode: input.projectCode,
        title: input.title,
        description: input.description,
        sponsoringInstitutionId: input.sponsoringInstitutionId,
        responsibleDepartmentId: input.responsibleDepartmentId,
        caseId: input.caseId,
        sectorCode: input.sectorCode,
        currentStage: StrategicProjectLifecycleStage.INQUIRY,
        attributionMetadata: input.attributionMetadata,
        externalFactorNotes: input.externalFactorNotes,
        announcementDate: input.announcementDate,
      },
    });

    if (input.announcementDate) {
      this.boundary.assertAnnouncementIsNotOperational(profile.currentStage, true);
    }

    return profile;
  }

  async getProfile(profileId: string) {
    const profile = await this.prisma.strategicProjectProfile.findUnique({
      where: { id: profileId },
      include: {
        stageHistory: { orderBy: { effectiveFrom: 'desc' } },
        milestones: true,
        dependencies: true,
        risks: true,
        economicClaims: { include: { performanceClaim: true } },
        capitalEvidence: true,
        employmentEvidence: true,
        infrastructureRecords: true,
        statusProjections: true,
      },
    });

    if (!profile) {
      throw new NotFoundException(`StrategicProjectProfile ${profileId} not found`);
    }

    return profile;
  }

  async preserveAdverseStatus(profileId: string) {
    return this.prisma.strategicProjectProfile.update({
      where: { id: profileId },
      data: { adverseStatusPreserved: true },
    });
  }
}
