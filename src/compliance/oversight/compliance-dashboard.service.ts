import { Injectable, NotFoundException } from '@nestjs/common';
import { ComplianceDashboardAudience } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { ComplianceProjectionService } from './compliance-projection.service';
import { HOLDER_DASHBOARD_RESTRICTED_FIELDS } from './compliance-status.constants';

@Injectable()
export class ComplianceDashboardService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly projectionService: ComplianceProjectionService,
  ) {}

  async getHolderDashboard(subjectIdentityId: string, caseId?: string) {
    const projection = await this.projectionService.deriveProjection({
      audience: ComplianceDashboardAudience.HOLDER,
      subjectIdentityId,
      caseId,
    });

    const obligations = projection.indicators.filter((indicator) =>
      ['OBLIGATIONS_DUE', 'OBLIGATIONS_OVERDUE'].includes(indicator.indicatorType),
    );
    const inspections = projection.indicators.filter((indicator) =>
      ['UPCOMING_INSPECTIONS', 'REINSPECTION_REQUIRED'].includes(indicator.indicatorType),
    );

    return {
      disclaimer: projection.projectionDisclaimer,
      status: projection.status,
      statusIsDerived: true,
      activeObligations: obligations,
      scheduledInspections: inspections,
      instrumentStatus: projection.instrumentStatusSnapshot,
      evidenceCutoffAt: projection.evidenceCutoffAt,
      indicators: projection.indicators.map((indicator) => ({
        type: indicator.indicatorType,
        label: indicator.displayLabel,
        count: indicator.countValue,
        drillDownReferences: indicator.drillDownReferences,
      })),
      restrictedFieldsExcluded: HOLDER_DASHBOARD_RESTRICTED_FIELDS,
    };
  }

  async getOfficialDashboard(subjectOfficeholderId: string, subjectDepartmentId?: string) {
    const projection = await this.projectionService.deriveProjection({
      audience: ComplianceDashboardAudience.OFFICIAL,
      subjectOfficeholderId,
      subjectDepartmentId,
    });

    const portfolioCases = subjectDepartmentId
      ? await this.prisma.case.findMany({
          where: { responsibleDepartmentId: subjectDepartmentId },
          select: { id: true, caseNumber: true, status: true },
        })
      : [];

    return {
      disclaimer: projection.projectionDisclaimer,
      status: projection.status,
      portfolio: portfolioCases,
      overdueObligations: projection.indicators.filter((item) =>
        item.indicatorType === 'OBLIGATIONS_OVERDUE',
      ),
      inspectionBacklog: projection.indicators.filter((item) =>
        ['UPCOMING_INSPECTIONS', 'REINSPECTION_REQUIRED'].includes(item.indicatorType),
      ),
      openFindings: projection.indicators.filter((item) => item.indicatorType === 'OPEN_FINDINGS'),
      criticalFindings: projection.indicators.filter((item) =>
        item.indicatorType === 'CRITICAL_FINDINGS',
      ),
      correctiveActions: projection.indicators.filter((item) =>
        item.indicatorType === 'CORRECTIVE_ACTIONS_OVERDUE',
      ),
      criticalEscalations: projection.alerts.filter((alert) => alert.alertLevel === 'CRITICAL'),
      externalReferrals: projection.indicators.filter((item) =>
        item.indicatorType === 'UNRESOLVED_EXTERNAL_DEPENDENCIES',
      ),
      instrumentLifecycleSignals: projection.instrumentStatusSnapshot,
      revalidationRequirements: await this.prisma.complianceRevalidationRecord.findMany({
        where: { projectionId: projection.id },
        orderBy: { recordedAt: 'desc' },
        take: 10,
      }),
      indicators: projection.indicators,
      alerts: projection.alerts.map((alert) => ({
        ...alert,
        isViolation: false,
        isEnforcementDecision: false,
      })),
    };
  }

  async getExecutiveAggregate(subjectInstitutionId: string) {
    const projections = await this.prisma.complianceStatusProjection.findMany({
      where: {
        audience: ComplianceDashboardAudience.EXECUTIVE_OVERSIGHT,
        subjectInstitutionId,
      },
      include: { indicators: true, alerts: true },
      orderBy: { lastDerivedAt: 'desc' },
      take: 100,
    });

    const aggregates = projections.map((projection) => ({
      projectionId: projection.id,
      status: projection.status,
      indicatorTotals: projection.indicators.reduce(
        (acc, indicator) => acc + indicator.countValue,
        0,
      ),
      criticalAlerts: projection.alerts.filter((alert) => alert.alertLevel === 'CRITICAL').length,
      evidenceLinks: {
        openFindingRefs: projection.openFindingRefs,
        openCorrectiveActionRefs: projection.openCorrectiveActionRefs,
        underlyingAssessmentId: projection.underlyingAssessmentId,
        evidenceCutoffAt: projection.evidenceCutoffAt,
      },
    }));

    return {
      institutionId: subjectInstitutionId,
      aggregateCount: aggregates.length,
      aggregates,
      disclaimer:
        'Executive aggregates link back to underlying evidence records via drill-down references.',
    };
  }

  async getProjectionById(projectionId: string) {
    const projection = await this.prisma.complianceStatusProjection.findUnique({
      where: { id: projectionId },
      include: { indicators: true, alerts: true, revalidationRecords: true },
    });

    if (!projection) {
      throw new NotFoundException(`ComplianceStatusProjection ${projectionId} not found`);
    }

    return projection;
  }
}
