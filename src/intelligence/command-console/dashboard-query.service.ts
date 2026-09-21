import { BadRequestException, Injectable } from '@nestjs/common';
import { DashboardConsoleType, type DashboardFilterDimension } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { type AuthenticatedPrincipal } from '../../identity/auth/domain/authenticated-principal';
import {
  DASHBOARD_PROJECTION_DISCLAIMER,
  DASHBOARD_STATUS_DISCLAIMER,
} from '../intelligence.constants';
import {
  DashboardAccessPolicyService,
  type EvaluateDashboardAccessInput,
} from './dashboard-access-policy.service';
import { DashboardDefinitionService } from './dashboard-definition.service';
import { DashboardIndicatorProjectionService } from './dashboard-indicator-projection.service';

export interface DashboardQueryInput {
  actor: AuthenticatedPrincipal;
  dashboardDefinitionId: string;
  institutionId?: string;
  departmentId?: string;
  purpose: EvaluateDashboardAccessInput['purpose'];
  sensitivityScope: EvaluateDashboardAccessInput['sensitivityScope'];
  securityClearanceLevel?: string;
  caseAssignmentId?: string;
  filters?: Partial<Record<DashboardFilterDimension, string>>;
}

@Injectable()
export class DashboardQueryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly definitionService: DashboardDefinitionService,
    private readonly accessPolicyService: DashboardAccessPolicyService,
    private readonly projectionService: DashboardIndicatorProjectionService,
  ) {}

  async queryExecutiveConsole(input: DashboardQueryInput) {
    await this.accessPolicyService.evaluateAccess({
      actor: input.actor,
      dashboardDefinitionId: input.dashboardDefinitionId,
      institutionId: input.institutionId,
      departmentId: input.departmentId,
      purpose: input.purpose,
      sensitivityScope: input.sensitivityScope,
      securityClearanceLevel: input.securityClearanceLevel,
      caseAssignmentId: input.caseAssignmentId,
      queryFilters: input.filters,
    });

    const definition = await this.prisma.dashboardDefinition.findUniqueOrThrow({
      where: { id: input.dashboardDefinitionId },
    });

    if (definition.consoleType !== DashboardConsoleType.EXECUTIVE_COMMAND) {
      throw new BadRequestException('Dashboard is not an executive command console');
    }

    const version = await this.definitionService.getPublishedVersion(input.dashboardDefinitionId);

    const projections = await this.prisma.dashboardIndicatorProjection.findMany({
      where: {
        dashboardVersionId: version.id,
        institutionId: input.institutionId,
      },
      include: {
        drilldownReferences: true,
        statusDictionaryEntry: true,
        indicatorDefinition: true,
      },
    });

    return this.buildConsoleResponse('executive', version, projections, input.filters);
  }

  async queryDepartmentalConsole(input: DashboardQueryInput) {
    await this.accessPolicyService.evaluateAccess({
      actor: input.actor,
      dashboardDefinitionId: input.dashboardDefinitionId,
      institutionId: input.institutionId,
      departmentId: input.departmentId,
      purpose: input.purpose,
      sensitivityScope: input.sensitivityScope,
      securityClearanceLevel: input.securityClearanceLevel,
      caseAssignmentId: input.caseAssignmentId,
      queryFilters: input.filters,
    });

    const definition = await this.prisma.dashboardDefinition.findUniqueOrThrow({
      where: { id: input.dashboardDefinitionId },
    });

    if (definition.consoleType !== DashboardConsoleType.DEPARTMENTAL) {
      throw new BadRequestException('Dashboard is not a departmental console');
    }

    const version = await this.definitionService.getPublishedVersion(input.dashboardDefinitionId);

    const projections = await this.prisma.dashboardIndicatorProjection.findMany({
      where: {
        dashboardVersionId: version.id,
        departmentId: input.departmentId,
      },
      include: {
        drilldownReferences: true,
        statusDictionaryEntry: true,
        indicatorDefinition: true,
      },
    });

    return this.buildConsoleResponse('departmental', version, projections, input.filters);
  }

  private buildConsoleResponse(
    consoleKind: 'executive' | 'departmental',
    version: {
      id: string;
      filterDimensions: DashboardFilterDimension[];
      projectionDisclaimer: string;
    },
    projections: Parameters<DashboardIndicatorProjectionService['formatProjectionResponse']>[0][],
    filters?: Partial<Record<DashboardFilterDimension, string>>,
  ) {
    const formattedIndicators = projections.map((projection) =>
      this.projectionService.formatProjectionResponse(projection),
    );

    const distinctStatusCodes = [...new Set(projections.map((p) => p.statusDictionaryEntry.code))];

    return {
      consoleKind,
      dashboardVersionId: version.id,
      filters: filters ?? {},
      supportedFilterDimensions: version.filterDimensions,
      indicators: formattedIndicators,
      distinctStatusCodes,
      disclaimers: {
        projection: version.projectionDisclaimer || DASHBOARD_PROJECTION_DISCLAIMER,
        status: DASHBOARD_STATUS_DISCLAIMER,
        visibilityDoesNotCreateAuthority: true,
        statusDoesNotCreateAuthority: true,
      },
      metadata: {
        indicatorCount: formattedIndicators.length,
        staleCount: formattedIndicators.filter((i) => i.staleness.isStale).length,
        dataQualityBreakdown: this.summarizeDataQuality(formattedIndicators),
      },
    };
  }

  private summarizeDataQuality(
    indicators: ReturnType<DashboardIndicatorProjectionService['formatProjectionResponse']>[],
  ) {
    const breakdown: Record<string, number> = {};
    for (const indicator of indicators) {
      breakdown[indicator.dataQuality] = (breakdown[indicator.dataQuality] ?? 0) + 1;
    }
    return breakdown;
  }
}
