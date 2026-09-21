import { Injectable } from '@nestjs/common';
import {
  ComplianceDashboardAudience,
  ComplianceMatterStatus,
  ContinuingObligationStatus,
} from '@prisma/client';

import { COMPLIANCE_PROJECTION_DISCLAIMER } from '../../../compliance/oversight/compliance-status.constants';
import { PrismaService } from '../../../database/prisma.service';
import { type ActorContext } from '../../../identity/auth/context/actor-context.types';
import { DepartmentComplianceResponseDto } from '../dto/department-compliance-response.dto';
import { DepartmentAccessService } from './department-access.service';
import { DepartmentMetricsFreshnessService } from './department-metrics-freshness.service';

@Injectable()
export class DepartmentComplianceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly accessService: DepartmentAccessService,
    private readonly freshnessService: DepartmentMetricsFreshnessService,
  ) {}

  async buildComplianceView(
    actor: ActorContext,
    departmentId: string,
  ): Promise<DepartmentComplianceResponseDto> {
    const context = await this.accessService.resolveManagementContext(actor, departmentId);
    const calculatedAt = new Date();

    const [openMatters, overdueObligations, projection] = await Promise.all([
      this.prisma.complianceMatter.findMany({
        where: {
          responsibleDepartmentId: departmentId,
          status: ComplianceMatterStatus.OPEN,
        },
        select: {
          id: true,
          complianceMatterNumber: true,
          status: true,
          openedAt: true,
          caseId: true,
        },
        orderBy: { openedAt: 'desc' },
        take: 100,
      }),
      this.prisma.continuingObligation.count({
        where: {
          complianceMatter: { responsibleDepartmentId: departmentId },
          status: ContinuingObligationStatus.OVERDUE,
        },
      }),
      this.prisma.complianceStatusProjection.findFirst({
        where: {
          audience: ComplianceDashboardAudience.DEPARTMENT_HEAD,
          subjectDepartmentId: departmentId,
        },
        orderBy: { lastDerivedAt: 'desc' },
        include: { indicators: true, alerts: true },
      }),
    ]);

    const correctiveActionCount = Array.isArray(projection?.openCorrectiveActionRefs)
      ? projection.openCorrectiveActionRefs.length
      : 0;

    return {
      generatedAt: calculatedAt.toISOString(),
      departmentId: context.departmentId,
      departmentName: context.departmentName,
      openMatters: openMatters.map((matter) => ({
        complianceMatterId: matter.id,
        complianceMatterNumber: matter.complianceMatterNumber,
        status: matter.status,
        openedAt: matter.openedAt.toISOString(),
        caseId: matter.caseId,
      })),
      overdueObligations,
      correctiveActions: correctiveActionCount,
      indicators:
        projection?.indicators.map((indicator) => ({
          indicatorType: indicator.indicatorType,
          displayLabel: indicator.displayLabel,
          countValue: indicator.countValue,
        })) ?? [],
      complianceAlerts:
        projection?.alerts.map((alert) => ({
          alertId: alert.id,
          alertLevel: alert.alertLevel,
          title: alert.title,
          summary: alert.summary,
          isEnforcementFinding: false,
        })) ?? [],
      restrictedInternalRecordsScoped: true,
      projectionDisclaimer: projection?.projectionDisclaimer ?? COMPLIANCE_PROJECTION_DISCLAIMER,
      metricsFreshness: this.freshnessService.buildFreshness(
        projection?.lastDerivedAt ?? calculatedAt,
      ),
      authorityDisclaimer: context.authorityDisclaimer,
    };
  }
}
