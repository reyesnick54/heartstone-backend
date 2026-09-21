import { Injectable } from '@nestjs/common';
import {
  ComplianceAlertStatus,
  ComplianceDashboardAudience,
  DashboardDataQuality,
  GovernmentServiceMaturityStatus,
  IntegrationOutageStatus,
} from '@prisma/client';

import { PrismaService } from '../../../database/prisma.service';
import { type ActorContext } from '../../../identity/auth/context/actor-context.types';
import {
  DEPARTMENT_ALERT_DISCLAIMER,
  DEPARTMENT_ALERT_TYPES,
} from '../department-experience.constants';
import { DepartmentAlertsResponseDto } from '../dto/department-alerts-response.dto';
import { DepartmentAccessService } from './department-access.service';
import { DepartmentCaseQueryService } from './department-case-query.service';
import { DepartmentMetricsFreshnessService } from './department-metrics-freshness.service';

@Injectable()
export class DepartmentAlertsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly accessService: DepartmentAccessService,
    private readonly caseQuery: DepartmentCaseQueryService,
    private readonly freshnessService: DepartmentMetricsFreshnessService,
  ) {}

  async buildAlertsView(
    actor: ActorContext,
    departmentId: string,
  ): Promise<DepartmentAlertsResponseDto> {
    const context = await this.accessService.resolveManagementContext(actor, departmentId);
    const calculatedAt = new Date();

    const [
      suspendedServices,
      integrationOutages,
      overdueCases,
      unassignedWorkload,
      complianceProjection,
      staleProjections,
    ] = await Promise.all([
      this.prisma.governmentServiceVersion.findMany({
        where: {
          maturityStatus: GovernmentServiceMaturityStatus.SUSPENDED,
          governmentService: { responsibleDepartmentId: departmentId },
        },
        include: {
          governmentService: { select: { id: true, publicName: true, code: true } },
        },
      }),
      this.prisma.integrationOutage.findMany({
        where: {
          status: { in: [IntegrationOutageStatus.DETECTED, IntegrationOutageStatus.CONFIRMED] },
          integrationDefinition: { institutionId: context.institutionId },
        },
        include: {
          integrationDefinition: { select: { id: true, code: true, name: true } },
        },
        take: 20,
      }),
      this.caseQuery.countOverdueCases(departmentId),
      this.caseQuery.countUnassignedWorkload(departmentId),
      this.prisma.complianceStatusProjection.findFirst({
        where: {
          audience: ComplianceDashboardAudience.DEPARTMENT_HEAD,
          subjectDepartmentId: departmentId,
        },
        orderBy: { lastDerivedAt: 'desc' },
        include: {
          alerts: {
            where: { status: ComplianceAlertStatus.OPEN },
          },
        },
      }),
      this.prisma.dashboardIndicatorProjection.findMany({
        where: {
          departmentId,
          dataQuality: DashboardDataQuality.STALE_CACHED,
        },
        take: 20,
      }),
    ]);

    const alerts: DepartmentAlertsResponseDto['items'] = [];

    for (const serviceVersion of suspendedServices) {
      alerts.push({
        alertType: DEPARTMENT_ALERT_TYPES.SERVICE_OUTAGE,
        severity: 'HIGH',
        title: `Service suspended: ${serviceVersion.governmentService.publicName}`,
        summary: `Government service ${serviceVersion.governmentService.code} version ${serviceVersion.version} is suspended.`,
        observedAt: calculatedAt.toISOString(),
        referenceId: serviceVersion.governmentService.id,
        isEnforcementFinding: false,
      });
    }

    for (const outage of integrationOutages) {
      alerts.push({
        alertType: DEPARTMENT_ALERT_TYPES.INTEGRATION_OUTAGE,
        severity: 'HIGH',
        title: `Integration outage: ${outage.integrationDefinition.name}`,
        summary:
          outage.impactSummary ??
          `Integration ${outage.integrationDefinition.code} is unavailable.`,
        observedAt: outage.detectedAt.toISOString(),
        referenceId: outage.id,
        isEnforcementFinding: false,
      });
    }

    if (overdueCases > 0) {
      alerts.push({
        alertType: DEPARTMENT_ALERT_TYPES.SLA_BREACH_RISK,
        severity: 'HIGH',
        title: 'SLA breach risk detected',
        summary: `${String(overdueCases)} case(s) have breached or delayed SLA milestones.`,
        observedAt: calculatedAt.toISOString(),
        referenceId: departmentId,
        isEnforcementFinding: false,
      });
    }

    if (unassignedWorkload >= 5) {
      alerts.push({
        alertType: DEPARTMENT_ALERT_TYPES.BACKLOG,
        severity: 'MEDIUM',
        title: 'Unassigned workload backlog',
        summary: `${String(unassignedWorkload)} open case(s) remain unassigned in the department pool.`,
        observedAt: calculatedAt.toISOString(),
        referenceId: departmentId,
        isEnforcementFinding: false,
      });
    }

    for (const complianceAlert of complianceProjection?.alerts ?? []) {
      alerts.push({
        alertType: DEPARTMENT_ALERT_TYPES.COMPLIANCE_BACKLOG,
        severity: complianceAlert.alertLevel,
        title: complianceAlert.title,
        summary: complianceAlert.summary,
        observedAt: complianceAlert.raisedAt.toISOString(),
        referenceId: complianceAlert.id,
        isEnforcementFinding: false,
      });
    }

    for (const projection of staleProjections) {
      alerts.push({
        alertType: DEPARTMENT_ALERT_TYPES.DATA_QUALITY,
        severity: 'LOW',
        title: 'Stale operational metric detected',
        summary: `Indicator projection ${projection.id} is marked ${projection.dataQuality}.`,
        observedAt: projection.calculatedAt.toISOString(),
        referenceId: projection.id,
        isEnforcementFinding: false,
      });
    }

    const pendingExternal = await this.caseQuery.countCasesAwaitingExternalDependency(departmentId);
    if (pendingExternal > 0) {
      alerts.push({
        alertType: DEPARTMENT_ALERT_TYPES.EXTERNAL_DEPENDENCY,
        severity: 'MEDIUM',
        title: 'Unresolved external dependencies',
        summary: `${String(pendingExternal)} case(s) are awaiting external dependency resolution.`,
        observedAt: calculatedAt.toISOString(),
        referenceId: departmentId,
        isEnforcementFinding: false,
      });
    }

    return {
      generatedAt: calculatedAt.toISOString(),
      departmentId: context.departmentId,
      departmentName: context.departmentName,
      items: alerts,
      totalCount: alerts.length,
      alertDisclaimer: DEPARTMENT_ALERT_DISCLAIMER,
      metricsFreshness: this.freshnessService.buildFreshness(calculatedAt),
      authorityDisclaimer: context.authorityDisclaimer,
    };
  }
}
