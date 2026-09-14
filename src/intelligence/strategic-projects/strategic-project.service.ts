import { Injectable, NotFoundException } from '@nestjs/common';
import { StrategicProjectMilestoneStatus } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

import { PrismaService } from '../../database/prisma.service';
import { IntelligenceBoundaryService } from '../common/intelligence-boundary.service';

export interface CreateStrategicProjectInput {
  institutionId: string;
  sponsorInstitutionId?: string;
  projectCode: string;
  title: string;
  description?: string;
}

export interface ReportMilestoneInput {
  strategicProjectProfileId: string;
  milestoneCode: string;
  title: string;
  description?: string;
}

@Injectable()
export class StrategicProjectService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly boundary: IntelligenceBoundaryService,
  ) {}

  async findById(id: string) {
    const project = await this.prisma.strategicProjectProfile.findUnique({
      where: { id },
      include: { milestones: true, statusProjections: true },
    });
    if (!project) {
      throw new NotFoundException(`Strategic project ${id} not found`);
    }
    return project;
  }

  async createProject(input: CreateStrategicProjectInput) {
    this.boundary.assertStrategicProjectNotAuthorityProgram();
    return this.prisma.strategicProjectProfile.create({
      data: {
        institutionId: input.institutionId,
        sponsorInstitutionId: input.sponsorInstitutionId,
        projectCode: input.projectCode,
        title: input.title,
        description: input.description,
      },
    });
  }

  async reportMilestone(input: ReportMilestoneInput) {
    return this.prisma.strategicProjectMilestone.create({
      data: {
        strategicProjectProfileId: input.strategicProjectProfileId,
        milestoneCode: input.milestoneCode,
        title: input.title,
        description: input.description,
        status: StrategicProjectMilestoneStatus.REPORTED,
        reportedAt: new Date(),
      },
    });
  }

  async verifyMilestone(milestoneId: string) {
    const milestone = await this.prisma.strategicProjectMilestone.findUnique({
      where: { id: milestoneId },
    });
    if (!milestone) {
      throw new NotFoundException(`Milestone ${milestoneId} not found`);
    }
    return this.prisma.strategicProjectMilestone.update({
      where: { id: milestoneId },
      data: {
        status: StrategicProjectMilestoneStatus.VERIFIED,
        verifiedAt: new Date(),
      },
    });
  }

  async treatReportedAsVerified(milestoneId: string) {
    const milestone = await this.prisma.strategicProjectMilestone.findUnique({
      where: { id: milestoneId },
    });
    if (!milestone) {
      throw new NotFoundException(`Milestone ${milestoneId} not found`);
    }
    this.boundary.assertSponsorReportNotVerifiedMilestone(milestone.status);
    return milestone;
  }

  async projectStatus(
    strategicProjectProfileId: string,
    institutionId: string,
    projectedStatus: string,
  ) {
    this.boundary.assertProjectStatusProjectionNotVerdict();
    return this.prisma.projectStatusProjection.create({
      data: {
        strategicProjectProfileId,
        institutionId,
        projectedStatus,
        disclaimer: 'Project status projection is not an institutional verdict.',
      },
    });
  }

  async recordCapitalEvidence(
    strategicProjectProfileId: string,
    institutionId: string,
    evidenceType: string,
    amount?: number,
  ) {
    this.boundary.assertCapitalEvidenceNotAuditedFact();
    return this.prisma.capitalEvidenceRecord.create({
      data: {
        strategicProjectProfileId,
        institutionId,
        evidenceType,
        amount: amount !== undefined ? new Decimal(amount) : undefined,
      },
    });
  }
}
