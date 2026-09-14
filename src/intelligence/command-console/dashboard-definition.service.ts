import { Injectable, NotFoundException } from '@nestjs/common';
import {
  DashboardConsoleType,
  DashboardDefinitionStatus,
  DashboardFilterDimension,
  type DashboardIndicatorCategory,
  DashboardVersionStatus,
  type Prisma,
} from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { DASHBOARD_PROJECTION_DISCLAIMER } from '../intelligence.constants';
import { DashboardBoundaryService } from './dashboard-boundary.service';

export interface CreateDashboardDefinitionInput {
  code: string;
  name: string;
  description?: string;
  consoleType: DashboardConsoleType;
  institutionId?: string;
  departmentId?: string;
  filterDimensions: DashboardFilterDimension[];
}

export interface CreateIndicatorDefinitionInput {
  code: string;
  label: string;
  category: DashboardIndicatorCategory;
  statusDictionaryEntryId: string;
  calculationRuleRef: string;
  sourceRequirements?: Prisma.InputJsonValue;
  requiresEvidencePacket?: boolean;
  drilldownRequired?: boolean;
}

export interface CreateWidgetDefinitionInput {
  code: string;
  title: string;
  widgetType:
    | 'INDICATOR_TILE'
    | 'INDICATOR_LIST'
    | 'FILTER_PANEL'
    | 'SUMMARY_TABLE'
    | 'TREND_CHART'
    | 'DRILLDOWN_PANEL';
  indicatorDefinitionId?: string;
  displayOrder?: number;
  filterConfig?: Prisma.InputJsonValue;
}

@Injectable()
export class DashboardDefinitionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly boundaryService: DashboardBoundaryService,
  ) {}

  async createDefinition(input: CreateDashboardDefinitionInput) {
    const definition = await this.prisma.dashboardDefinition.create({
      data: {
        code: input.code,
        name: input.name,
        description: input.description,
        consoleType: input.consoleType,
        institutionId: input.institutionId,
        departmentId: input.departmentId,
        status: DashboardDefinitionStatus.DRAFT,
      },
    });

    const version = await this.prisma.dashboardVersion.create({
      data: {
        dashboardDefinitionId: definition.id,
        versionNumber: 1,
        status: DashboardVersionStatus.DRAFT,
        filterDimensions: input.filterDimensions,
        projectionDisclaimer: DASHBOARD_PROJECTION_DISCLAIMER,
      },
    });

    return { definition, version };
  }

  async publishVersion(dashboardVersionId: string) {
    const version = await this.prisma.dashboardVersion.findUnique({
      where: { id: dashboardVersionId },
      include: { widgets: { include: { indicatorDefinition: true } } },
    });

    if (!version) {
      throw new NotFoundException(`Dashboard version "${dashboardVersionId}" was not found`);
    }

    const statusCodes = version.widgets
      .map((widget) => widget.indicatorDefinition?.statusDictionaryEntryId)
      .filter(Boolean) as string[];

    if (statusCodes.length > 0) {
      const entries = await this.prisma.dashboardStatusDictionaryEntry.findMany({
        where: { id: { in: statusCodes } },
        select: { code: true },
      });
      this.boundaryService.assertStatusCodesNotCollapsed(entries.map((entry) => entry.code));
    }

    return this.prisma.dashboardVersion.update({
      where: { id: dashboardVersionId },
      data: {
        status: DashboardVersionStatus.PUBLISHED,
        effectiveFrom: new Date(),
      },
      include: { widgets: true },
    });
  }

  async createIndicatorDefinition(input: CreateIndicatorDefinitionInput) {
    const statusEntry = await this.prisma.dashboardStatusDictionaryEntry.findUniqueOrThrow({
      where: { id: input.statusDictionaryEntryId },
    });

    this.boundaryService.assertStatusDoesNotCreateAuthority(statusEntry.meaning);

    return this.prisma.dashboardIndicatorDefinition.create({
      data: {
        code: input.code,
        label: input.label,
        category: input.category,
        statusDictionaryEntryId: input.statusDictionaryEntryId,
        calculationRuleRef: input.calculationRuleRef,
        sourceRequirements: input.sourceRequirements ?? [],
        requiresEvidencePacket: input.requiresEvidencePacket ?? false,
        drilldownRequired: input.drilldownRequired ?? true,
      },
    });
  }

  async addWidget(dashboardVersionId: string, input: CreateWidgetDefinitionInput) {
    if (input.indicatorDefinitionId) {
      const indicator = await this.prisma.dashboardIndicatorDefinition.findUniqueOrThrow({
        where: { id: input.indicatorDefinitionId },
        include: { statusDictionaryEntry: true },
      });

      const supportedCodes = [indicator.statusDictionaryEntry.code];
      this.boundaryService.assertWidgetUsesSupportedStatus(
        indicator.statusDictionaryEntry.code,
        supportedCodes,
      );
    }

    return this.prisma.dashboardWidgetDefinition.create({
      data: {
        dashboardVersionId,
        code: input.code,
        title: input.title,
        widgetType: input.widgetType,
        indicatorDefinitionId: input.indicatorDefinitionId,
        displayOrder: input.displayOrder ?? 0,
        filterConfig: input.filterConfig ?? {},
      },
    });
  }

  async getPublishedVersion(dashboardDefinitionId: string) {
    const version = await this.prisma.dashboardVersion.findFirst({
      where: {
        dashboardDefinitionId,
        status: DashboardVersionStatus.PUBLISHED,
      },
      orderBy: { versionNumber: 'desc' },
      include: {
        widgets: { include: { indicatorDefinition: { include: { statusDictionaryEntry: true } } } },
      },
    });

    if (!version) {
      throw new NotFoundException(
        `No published dashboard version for definition "${dashboardDefinitionId}"`,
      );
    }

    return version;
  }
}
