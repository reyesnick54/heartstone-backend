import { Injectable } from '@nestjs/common';
import { DevelopmentExternalDependencyStatus } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { PlanningConstructionBoundaryService } from '../common/planning-construction-boundary.service';

@Injectable()
export class DevelopmentExternalDependencyService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly boundary: PlanningConstructionBoundaryService,
  ) {}

  async assertPermitDecisionAllowed(developmentProjectId: string): Promise<void> {
    const dependencies = await this.prisma.developmentExternalDependency.findMany({
      where: { developmentProjectId },
    });
    this.boundary.assertExternalDependenciesResolved(dependencies);
  }

  async countUnresolved(developmentProjectId: string): Promise<number> {
    return this.prisma.developmentExternalDependency.count({
      where: {
        developmentProjectId,
        blocksPermitDecision: true,
        status: { not: DevelopmentExternalDependencyStatus.RESOLVED },
      },
    });
  }
}
