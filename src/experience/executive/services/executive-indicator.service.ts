import { Injectable } from '@nestjs/common';
import { DashboardAccessPurpose, type DashboardIndicatorCategory } from '@prisma/client';

import { PrismaService } from '../../../database/prisma.service';
import { DashboardIndicatorProjectionService } from '../../../intelligence/command-console/dashboard-indicator-projection.service';
import { DashboardQueryService } from '../../../intelligence/command-console/dashboard-query.service';
import { type ResolvedExecutiveContext } from '../types/executive-context.types';

export interface ExecutiveIndicatorView {
  id: string;
  label: string;
  category: DashboardIndicatorCategory;
  count: number;
  score: number | null;
  dataQuality: string;
  status: {
    code: string;
    label: string;
    meaning: string;
    colorSemantic: string;
  };
  staleness: {
    isStale: boolean;
    staleDataVisible: boolean;
    neverPresentedAsLive: boolean;
    currentStaleness: string;
  };
  drilldown: {
    type: string;
    id: string;
    label: string;
    evidencePacketId: string | null;
  }[];
  disclaimers: {
    projection: string;
    statusIsDerived: boolean;
    visibilityDoesNotCreateAuthority: boolean;
  };
}

export interface ExecutiveConsoleSnapshot {
  dashboardVersionId: string;
  indicators: ExecutiveIndicatorView[];
  staleCount: number;
  disclaimers: {
    projection: string;
    status: string;
    visibilityDoesNotCreateAuthority: boolean;
    statusDoesNotCreateAuthority: boolean;
  };
  metadata: {
    indicatorCount: number;
    staleCount: number;
  };
}

@Injectable()
export class ExecutiveIndicatorService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly dashboardQueryService: DashboardQueryService,
    private readonly projectionService: DashboardIndicatorProjectionService,
  ) {}

  async loadConsoleSnapshot(context: ResolvedExecutiveContext): Promise<ExecutiveConsoleSnapshot> {
    const primaryScope = context.briefingScopes[0];
    if (!primaryScope) {
      return this.emptySnapshot();
    }

    const consoleResult = await this.dashboardQueryService.queryExecutiveConsole({
      actor: context.actor,
      dashboardDefinitionId: primaryScope.dashboardDefinitionId,
      institutionId: primaryScope.institutionId,
      purpose: DashboardAccessPurpose.EXECUTIVE_BRIEFING,
      sensitivityScope: primaryScope.sensitivityLevel,
    });

    const projectionIds = consoleResult.indicators.map((indicator) => indicator.id);
    const categoriesById = await this.loadCategoriesByProjectionId(projectionIds);

    const indicators: ExecutiveIndicatorView[] = consoleResult.indicators.map((indicator) => ({
      id: indicator.id,
      label: indicator.label,
      category:
        categoriesById.get(indicator.id) ??
        ('INSTITUTIONAL_PERFORMANCE'),
      count: indicator.count,
      score: indicator.score,
      dataQuality: indicator.dataQuality,
      status: indicator.status,
      staleness: indicator.staleness,
      drilldown: indicator.drilldown,
      disclaimers: indicator.disclaimers,
    }));

    return {
      dashboardVersionId: consoleResult.dashboardVersionId,
      indicators,
      staleCount: consoleResult.metadata.staleCount,
      disclaimers: consoleResult.disclaimers,
      metadata: consoleResult.metadata,
    };
  }

  filterByCategories(
    snapshot: ExecutiveConsoleSnapshot,
    categories: DashboardIndicatorCategory[],
  ): ExecutiveIndicatorView[] {
    const categorySet = new Set(categories);
    return snapshot.indicators.filter((indicator) => categorySet.has(indicator.category));
  }

  private async loadCategoriesByProjectionId(
    projectionIds: string[],
  ): Promise<Map<string, DashboardIndicatorCategory>> {
    if (projectionIds.length === 0) {
      return new Map();
    }

    const projections = await this.prisma.dashboardIndicatorProjection.findMany({
      where: { id: { in: projectionIds } },
      include: { indicatorDefinition: { select: { category: true } } },
    });

    return new Map(
      projections.map((projection) => [projection.id, projection.indicatorDefinition.category]),
    );
  }

  private emptySnapshot(): ExecutiveConsoleSnapshot {
    return {
      dashboardVersionId: '',
      indicators: [],
      staleCount: 0,
      disclaimers: {
        projection: '',
        status: '',
        visibilityDoesNotCreateAuthority: true,
        statusDoesNotCreateAuthority: true,
      },
      metadata: { indicatorCount: 0, staleCount: 0 },
    };
  }
}
