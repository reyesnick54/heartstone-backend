import { Injectable, NotFoundException } from '@nestjs/common';
import { DevelopmentOccupancyCertificateStatus } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { PlanningConstructionBoundaryService } from '../common/planning-construction-boundary.service';

export interface IssueOccupancyCertificateInput {
  developmentProjectId: string;
  certificateReference: string;
  governmentDecisionId: string;
  issuedByOfficeholderId: string;
  clientPayload?: Record<string, unknown>;
}

@Injectable()
export class DevelopmentOccupancyService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly boundary: PlanningConstructionBoundaryService,
  ) {}

  async issueCertificate(input: IssueOccupancyCertificateInput) {
    if (input.clientPayload) {
      this.boundary.rejectClientOccupancyFields(input.clientPayload);
    }
    this.boundary.assertOccupancyRequiresGovernedDecision(input);

    const existing = await this.prisma.developmentOccupancyCertificate.findFirst({
      where: { developmentProjectId: input.developmentProjectId },
      orderBy: { createdAt: 'desc' },
    });
    if (existing?.status === DevelopmentOccupancyCertificateStatus.ISSUED) {
      return existing;
    }

    return this.prisma.developmentOccupancyCertificate.create({
      data: {
        developmentProjectId: input.developmentProjectId,
        certificateReference: input.certificateReference,
        status: DevelopmentOccupancyCertificateStatus.ISSUED,
        governmentDecisionId: input.governmentDecisionId,
        issuedByOfficeholderId: input.issuedByOfficeholderId,
        issuedAt: new Date(),
      },
    });
  }

  async requestCertificate(developmentProjectId: string, certificateReference: string) {
    const project = await this.prisma.developmentProject.findUnique({
      where: { id: developmentProjectId },
    });
    if (!project) {
      throw new NotFoundException(`DevelopmentProject ${developmentProjectId} not found`);
    }

    return this.prisma.developmentOccupancyCertificate.create({
      data: {
        developmentProjectId,
        certificateReference,
        status: DevelopmentOccupancyCertificateStatus.REQUESTED,
      },
    });
  }
}
