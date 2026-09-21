import { Injectable } from '@nestjs/common';
import {
  ComplianceAlertStatus,
  ComplianceDashboardAudience,
  ComplianceMatterStatus,
  GovernmentServiceMaturityStatus,
  IntegrationOutageStatus,
  OfficialInstrumentStatus,
  RedressMatterStatus,
} from '@prisma/client';

import { PrismaService } from '../../../database/prisma.service';
import { type ActorContext } from '../../../identity/auth/context/actor-context.types';
import { DEPARTMENT_AGGREGATE_DISCLAIMER } from '../department-experience.constants';
import { DepartmentHomeResponseDto } from '../dto/department-home-response.dto';
import { DepartmentAccessService } from './department-access.service';
import { DepartmentCaseQueryService } from './department-case-query.service';
import { DepartmentMetricsFreshnessService } from './department-metrics-freshness.service';

@Injectable()
export class DepartmentHomeService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly accessService: DepartmentAccessService,
    private readonly caseQuery: DepartmentCaseQueryService,
    private readonly freshnessService: DepartmentMetricsFreshnessService,
  ) {}

  async buildHome(actor: ActorContext, departmentId: string): Promise<DepartmentHomeResponseDto> {
    const context = await this.accessService.resolveManagementContext(actor, departmentId);
    const calculatedAt = new Date();
    const renewalHorizon = new Date(calculatedAt.getTime() + 30 * 24 * 60 * 60 * 1000);

    const [
      applicationsReceived,
      openCases,
      casesCompleted,
      casesAwaitingReview,
      casesAwaitingApplicantAction,
      casesAwaitingExternalDependency,
      decisionReadyCases,
      casesApproachingSla,
      overdueCases,
      unassignedWorkload,
      officerWorkloadDistribution,
      inspectionBacklog,
      complianceMatters,
      correctiveActions,
      activeAppeals,
      expiringLicensesPermits,
      suspendedServices,
      integrationIssues,
      departmentalAlerts,
      complianceProjection,
    ] = await Promise.all([
      this.caseQuery.countApplicationsReceived(departmentId),
      this.caseQuery.countOpenCases(departmentId),
      this.caseQuery.countCompletedCases(departmentId),
      this.caseQuery.countCasesAwaitingReview(departmentId),
      this.caseQuery.countCasesAwaitingApplicantAction(departmentId),
      this.caseQuery.countCasesAwaitingExternalDependency(departmentId),
      this.caseQuery.countDecisionReadyCases(departmentId),
      this.caseQuery.countCasesApproachingSla(departmentId),
      this.caseQuery.countOverdueCases(departmentId),
      this.caseQuery.countUnassignedWorkload(departmentId),
      this.caseQuery.getOfficerWorkloadDistribution(departmentId),
      this.caseQuery.countInspectionBacklog(departmentId),
      this.prisma.complianceMatter.count({
        where: {
          responsibleDepartmentId: departmentId,
          status: ComplianceMatterStatus.OPEN,
        },
      }),
      this.prisma.complianceStatusProjection.findFirst({
        where: {
          audience: ComplianceDashboardAudience.DEPARTMENT_HEAD,
          subjectDepartmentId: departmentId,
        },
        orderBy: { lastDerivedAt: 'desc' },
        select: { openCorrectiveActionRefs: true },
      }),
      this.prisma.redressMatter.count({
        where: {
          case: { responsibleDepartmentId: departmentId },
          status: { notIn: [RedressMatterStatus.CLOSED, RedressMatterStatus.WITHDRAWN] },
        },
      }),
      this.prisma.officialInstrument.count({
        where: {
          issuerInstitutionId: context.institutionId,
          status: OfficialInstrumentStatus.ISSUED,
          effectiveUntil: { lte: renewalHorizon, gte: calculatedAt },
          case: { responsibleDepartmentId: departmentId },
        },
      }),
      this.prisma.governmentServiceVersion.count({
        where: {
          governmentService: { responsibleDepartmentId: departmentId },
          maturityStatus: GovernmentServiceMaturityStatus.SUSPENDED,
        },
      }),
      this.prisma.integrationOutage.count({
        where: {
          status: { in: [IntegrationOutageStatus.DETECTED, IntegrationOutageStatus.CONFIRMED] },
          integrationDefinition: { institutionId: context.institutionId },
        },
      }),
      this.prisma.complianceAlert.count({
        where: {
          status: ComplianceAlertStatus.OPEN,
          projection: {
            audience: ComplianceDashboardAudience.DEPARTMENT_HEAD,
            subjectDepartmentId: departmentId,
          },
        },
      }),
      this.prisma.complianceStatusProjection.findFirst({
        where: {
          audience: ComplianceDashboardAudience.DEPARTMENT_HEAD,
          subjectDepartmentId: departmentId,
        },
        orderBy: { lastDerivedAt: 'desc' },
        select: { lastDerivedAt: true, nextReviewAt: true },
      }),
    ]);

    const correctiveActionCount = Array.isArray(correctiveActions?.openCorrectiveActionRefs)
      ? correctiveActions.openCorrectiveActionRefs.length
      : 0;

    const serviceAvailability = await this.prisma.governmentServiceVersion.groupBy({
      by: ['publicAvailability'],
      where: {
        governmentService: { responsibleDepartmentId: departmentId },
        maturityStatus: {
          notIn: [
            GovernmentServiceMaturityStatus.RETIRED,
            GovernmentServiceMaturityStatus.SUPERSEDED,
          ],
        },
      },
      _count: { _all: true },
    });

    const metricsFreshness = this.freshnessService.buildFreshness(
      complianceProjection?.lastDerivedAt ?? calculatedAt,
    );

    return {
      generatedAt: calculatedAt.toISOString(),
      departmentId: context.departmentId,
      departmentName: context.departmentName,
      institutionId: context.institutionId,
      applicationsReceived,
      openCases,
      casesCompleted,
      casesAwaitingReview,
      casesAwaitingApplicantAction,
      casesAwaitingExternalDependency,
      decisionReadyCases,
      casesApproachingSla,
      overdueCases,
      unassignedWorkload,
      officerWorkloadDistribution,
      inspectionBacklog,
      complianceMatters,
      correctiveActions: correctiveActionCount,
      activeAppeals,
      expiringLicensesPermits,
      serviceAvailability: serviceAvailability.map((entry) => ({
        publicAvailability: entry.publicAvailability,
        count: entry._count._all,
      })),
      suspendedServices,
      integrationIssues,
      departmentalAlerts,
      metricsFreshness,
      aggregateDoesNotCreateCaseDisposition: true,
      dashboardVisibilityDoesNotCreateAuthority: true,
      aggregateDisclaimer: DEPARTMENT_AGGREGATE_DISCLAIMER,
      authorityDisclaimer: context.authorityDisclaimer,
    };
  }
}
