import { Injectable } from '@nestjs/common';
import {
  DevelopmentApplicationStatus,
  DevelopmentExternalDependencyStatus,
  DevelopmentInspectionStatus,
  DevelopmentOccupancyCertificateStatus,
  DevelopmentPermitStatus,
  DevelopmentProjectStatus,
} from '@prisma/client';

import { PrismaService } from '../../../database/prisma.service';
import { DepartmentAccessService } from '../../../experience/department/services/department-access.service';
import { DepartmentMetricsFreshnessService } from '../../../experience/department/services/department-metrics-freshness.service';
import { type ActorContext } from '../../../identity/auth/context/actor-context.types';
import {
  PLANNING_CONSTRUCTION_RULE_ENVIRONMENT,
  PLANNING_METRICS_DISCLAIMER,
} from '../../planning-construction.constants';

@Injectable()
export class DepartmentPlanningConstructionMetricsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly accessService: DepartmentAccessService,
    private readonly freshnessService: DepartmentMetricsFreshnessService,
  ) {}

  async buildMetrics(actor: ActorContext, departmentId: string) {
    await this.accessService.resolveManagementContext(actor, departmentId);
    const calculatedAt = new Date();

    const projectFilter = { responsibleDepartmentId: departmentId };

    const [
      applicationsByType,
      permitBacklog,
      inspectionBacklog,
      slaRisk,
      reinspectionRateNumerator,
      reinspectionRateDenominator,
      unresolvedDependencies,
      permitsIssued,
      occupancyCertificatesIssued,
      activeDevelopmentProjects,
    ] = await Promise.all([
      this.prisma.developmentApplication.groupBy({
        by: ['serviceCode'],
        where: { developmentProject: projectFilter },
        _count: { _all: true },
      }),
      this.prisma.developmentPermit.count({
        where: {
          status: { in: [DevelopmentPermitStatus.SUBMITTED, DevelopmentPermitStatus.UNDER_REVIEW] },
          developmentProject: projectFilter,
        },
      }),
      this.prisma.developmentInspection.count({
        where: {
          status: DevelopmentInspectionStatus.SCHEDULED,
          developmentProject: projectFilter,
        },
      }),
      this.prisma.developmentApplication.count({
        where: {
          status: DevelopmentApplicationStatus.UNDER_REVIEW,
          submittedAt: { lte: new Date(Date.now() - 25 * 86400000) },
          developmentProject: projectFilter,
        },
      }),
      this.prisma.developmentInspection.count({
        where: {
          inspectionType: { contains: 'REINSPECTION' },
          developmentProject: projectFilter,
        },
      }),
      this.prisma.developmentInspection.count({
        where: { developmentProject: projectFilter },
      }),
      this.prisma.developmentExternalDependency.count({
        where: {
          status: { not: DevelopmentExternalDependencyStatus.RESOLVED },
          developmentProject: projectFilter,
        },
      }),
      this.prisma.developmentPermit.count({
        where: {
          status: DevelopmentPermitStatus.ISSUED,
          developmentProject: projectFilter,
        },
      }),
      this.prisma.developmentOccupancyCertificate.count({
        where: {
          status: DevelopmentOccupancyCertificateStatus.ISSUED,
          developmentProject: projectFilter,
        },
      }),
      this.prisma.developmentProject.count({
        where: {
          status: DevelopmentProjectStatus.ACTIVE,
          ...projectFilter,
        },
      }),
    ]);

    return {
      ruleEnvironment: PLANNING_CONSTRUCTION_RULE_ENVIRONMENT,
      metricsDisclaimer: PLANNING_METRICS_DISCLAIMER,
      applicationsByType: applicationsByType.map((row) => ({
        serviceCode: row.serviceCode,
        count: row._count._all,
      })),
      permitBacklog,
      inspectionBacklog,
      slaRisk,
      reinspectionRate:
        reinspectionRateDenominator === 0
          ? 0
          : Number((reinspectionRateNumerator / reinspectionRateDenominator).toFixed(4)),
      unresolvedDependencies,
      permitsIssued,
      occupancyCertificatesIssued,
      activeDevelopmentProjects,
      metricsFreshness: this.freshnessService.buildFreshness(calculatedAt),
    };
  }
}
