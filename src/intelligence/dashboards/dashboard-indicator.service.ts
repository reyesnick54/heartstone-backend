import { Injectable, NotFoundException } from '@nestjs/common';
import { DashboardIndicatorStatus, Prisma } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

import { PrismaService } from '../../database/prisma.service';
import { IntelligenceBoundaryService } from '../common/intelligence-boundary.service';
import { IntelligenceSafeHaltService } from '../common/intelligence-safe-halt.service';

export interface CreateDashboardIndicatorInput {
  dashboardVersionId: string;
  metricDefinitionId?: string;
  indicatorCode: string;
  label: string;
  config?: Record<string, unknown>;
}

export interface ProjectIndicatorInput {
  dashboardIndicatorDefinitionId: string;
  institutionId: string;
  computedValue?: number;
  displayValue?: string;
  isStale?: boolean;
  disclaimer?: string;
  consequential?: boolean;
}

@Injectable()
export class DashboardIndicatorService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly boundary: IntelligenceBoundaryService,
    private readonly safeHalt: IntelligenceSafeHaltService,
  ) {}

  async createIndicator(input: CreateDashboardIndicatorInput) {
    this.boundary.assertIndicatorNotDecision();
    return this.prisma.dashboardIndicatorDefinition.create({
      data: {
        dashboardVersionId: input.dashboardVersionId,
        metricDefinitionId: input.metricDefinitionId,
        indicatorCode: input.indicatorCode,
        label: input.label,
        config: (input.config ?? {}) as Prisma.InputJsonValue,
      },
    });
  }

  async projectIndicator(input: ProjectIndicatorInput) {
    this.boundary.assertIndicatorNotDecision();
    this.boundary.assertStaleIndicatorBlocksConsequentialUse(
      input.isStale ?? false,
      input.consequential ?? false,
    );
    this.safeHalt.assertConsequentialPathAllowed({
      indicatorStale: input.isStale,
      consequential: input.consequential,
    });

    const status =
      input.isStale === true ? DashboardIndicatorStatus.STALE : DashboardIndicatorStatus.CURRENT;

    return this.prisma.dashboardIndicatorProjection.create({
      data: {
        dashboardIndicatorDefinitionId: input.dashboardIndicatorDefinitionId,
        institutionId: input.institutionId,
        status,
        computedValue:
          input.computedValue !== undefined ? new Decimal(input.computedValue) : undefined,
        displayValue: input.displayValue,
        isStale: input.isStale ?? false,
        disclaimer: input.disclaimer,
        sourceStaleAt: input.isStale ? new Date() : undefined,
      },
    });
  }

  async getLatestProjection(indicatorDefinitionId: string) {
    const projection = await this.prisma.dashboardIndicatorProjection.findFirst({
      where: { dashboardIndicatorDefinitionId: indicatorDefinitionId },
      orderBy: { computedAt: 'desc' },
    });
    if (!projection) {
      throw new NotFoundException(`No projection for indicator ${indicatorDefinitionId}`);
    }
    return projection;
  }
}
