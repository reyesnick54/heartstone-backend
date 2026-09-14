import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, StrategicProjectRiskLevel } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { StrategicProjectBoundaryService } from '../common/strategic-project-boundary.service';

export interface CreateStrategicProjectRiskInput {
  profileId: string;
  title: string;
  description?: string;
  riskLevel?: StrategicProjectRiskLevel;
  riskScore?: number;
  methodologyVersion?: string;
  sourceDataRefs?: Prisma.InputJsonValue;
}

@Injectable()
export class StrategicProjectRiskService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly boundary: StrategicProjectBoundaryService,
  ) {}

  async createRisk(input: CreateStrategicProjectRiskInput) {
    const profile = await this.prisma.strategicProjectProfile.findUnique({
      where: { id: input.profileId },
    });

    if (!profile) {
      throw new NotFoundException(`StrategicProjectProfile ${input.profileId} not found`);
    }

    this.boundary.assertRiskScoreCannotChangeApproval(input.riskScore);

    const risk = await this.prisma.strategicProjectRisk.create({
      data: {
        profileId: input.profileId,
        title: input.title,
        description: input.description,
        riskLevel: input.riskLevel ?? StrategicProjectRiskLevel.MEDIUM,
        riskScore: input.riskScore,
        doesNotAffectApproval: true,
        methodologyVersion: input.methodologyVersion,
        sourceDataRefs: input.sourceDataRefs ?? [],
      },
    });

    this.boundary.assertRiskDoesNotAffectApproval(risk.doesNotAffectApproval);

    return risk;
  }
}
