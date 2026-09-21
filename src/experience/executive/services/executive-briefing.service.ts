import { Injectable } from '@nestjs/common';
import {
  CaseSlaClockStatus,
  CaseStatus,
  ComplianceDashboardAudience,
  ExternalDeterminationStatus,
  GovernmentServiceMaturityStatus,
  GovernmentServicePublicAvailability,
  IdentityType,
  IntelligenceAlertStatus,
  ProductionDefectStatus,
  ReviewAssignmentStatus,
  ReviewProceedingStatus,
} from '@prisma/client';

import { ComplianceDashboardService } from '../../../compliance/oversight/compliance-dashboard.service';
import { PrismaService } from '../../../database/prisma.service';
import {
  EXECUTIVE_COMPLIANCE_CATEGORIES,
  EXECUTIVE_DEPARTMENTS_CATEGORIES,
  EXECUTIVE_DIGITAL_GOVERNMENT_CATEGORIES,
  EXECUTIVE_GOVERNMENT_OPERATIONS_CATEGORIES,
  EXECUTIVE_INVESTMENT_CATEGORIES,
  EXECUTIVE_PROJECTS_CATEGORIES,
  EXECUTIVE_REDRESS_CATEGORIES,
  EXECUTIVE_RISK_CATEGORIES,
  EXECUTIVE_SERVICES_CATEGORIES,
  REPORTED_MILESTONE_STATUSES,
  VERIFIED_MILESTONE_STATUSES,
} from '../executive-experience.constants';
import { type ResolvedExecutiveContext } from '../types/executive-context.types';
import {
  type ExecutiveConsoleSnapshot,
  ExecutiveIndicatorService,
  type ExecutiveIndicatorView,
} from './executive-indicator.service';

@Injectable()
export class ExecutiveBriefingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly indicatorService: ExecutiveIndicatorService,
    private readonly complianceDashboardService: ComplianceDashboardService,
  ) {}

  async buildHome(context: ResolvedExecutiveContext) {
    const institutionId = context.primaryInstitutionId;
    const consoleSnapshot = await this.indicatorService.loadConsoleSnapshot(context);

    return {
      generatedAt: new Date().toISOString(),
      institutionId,
      briefingScopes: context.briefingScopes.map((scope) => ({
        dashboardDefinitionId: scope.dashboardDefinitionId,
        institutionId: scope.institutionId,
        dashboardCode: scope.dashboardCode,
        dashboardName: scope.dashboardName,
      })),
      governmentOperations: await this.buildGovernmentOperations(context, consoleSnapshot),
      economyInvestment: await this.buildInvestment(context, consoleSnapshot),
      compliance: await this.buildCompliance(context, consoleSnapshot),
      digitalGovernment: await this.buildDigitalGovernment(context, consoleSnapshot),
      risk: await this.buildRisk(context, consoleSnapshot),
      staleProjectionCount: consoleSnapshot.staleCount,
      hasStaleProjections: consoleSnapshot.staleCount > 0,
      authorityDisclaimer: context.authorityDisclaimer,
      visibilityDoesNotCreateAuthority: context.visibilityDoesNotCreateAuthority,
      executiveDashboardIsNotCommandAuthority: context.executiveDashboardIsNotCommandAuthority,
      metricIsNotVerifiedLegalFact: true,
      projectionIsNotGuarantee: true,
      riskScoreIsNotSanction: true,
    };
  }

  async buildGovernmentOperations(
    context: ResolvedExecutiveContext,
    consoleSnapshot?: ExecutiveConsoleSnapshot,
  ) {
    const institutionId = context.primaryInstitutionId;
    const snapshot = consoleSnapshot ?? (await this.indicatorService.loadConsoleSnapshot(context));
    const indicators = this.indicatorService.filterByCategories(
      snapshot,
      EXECUTIVE_GOVERNMENT_OPERATIONS_CATEGORIES,
    );

    const [applicationsReceived, openCases, completedCases, overdueCases, activeServices] =
      await Promise.all([
        this.prisma.application.count({
          where: { governmentService: { responsibleInstitutionId: institutionId } },
        }),
        this.prisma.case.count({
          where: {
            responsibleInstitutionId: institutionId,
            status: { notIn: [CaseStatus.CLOSED, CaseStatus.WITHDRAWN, CaseStatus.ARCHIVED] },
          },
        }),
        this.prisma.case.count({
          where: {
            responsibleInstitutionId: institutionId,
            status: CaseStatus.CLOSED,
          },
        }),
        this.prisma.caseSlaClock.count({
          where: {
            status: CaseSlaClockStatus.BREACHED,
            case: { responsibleInstitutionId: institutionId },
          },
        }),
        this.prisma.governmentServiceVersion.count({
          where: {
            maturityStatus: GovernmentServiceMaturityStatus.ACTIVE,
            governmentService: { responsibleInstitutionId: institutionId },
          },
        }),
      ]);

    const slaClocks = await this.prisma.caseSlaClock.findMany({
      where: { case: { responsibleInstitutionId: institutionId } },
      select: { targetDurationMs: true, elapsedMs: true, status: true },
    });

    const slaPerformance = this.summarizeSlaPerformance(slaClocks);
    const departmentWorkload = await this.summarizeDepartmentWorkload(institutionId);

    return {
      generatedAt: new Date().toISOString(),
      institutionId,
      summary: {
        applicationsReceived,
        openCases,
        completedCases,
        overdueCases,
        activeGovernmentServices: activeServices,
        medianProcessingTimeMs: slaPerformance.medianElapsedMs,
        averageProcessingTimeMs: slaPerformance.averageElapsedMs,
        slaPerformance,
      },
      departmentWorkload,
      indicators: this.mapIndicators(indicators),
      disclaimers: this.sectionDisclaimers(snapshot),
    };
  }

  async buildServices(context: ResolvedExecutiveContext) {
    const institutionId = context.primaryInstitutionId;
    const snapshot = await this.indicatorService.loadConsoleSnapshot(context);
    const indicators = this.indicatorService.filterByCategories(
      snapshot,
      EXECUTIVE_SERVICES_CATEGORIES,
    );

    const services = await this.prisma.governmentService.findMany({
      where: { responsibleInstitutionId: institutionId },
      include: {
        versions: {
          orderBy: { version: 'desc' },
          take: 1,
        },
      },
    });

    return {
      generatedAt: new Date().toISOString(),
      institutionId,
      activeServices: services.filter(
        (service) => service.versions[0]?.maturityStatus === GovernmentServiceMaturityStatus.ACTIVE,
      ).length,
      suspendedServices: services.filter(
        (service) =>
          service.versions[0]?.maturityStatus === GovernmentServiceMaturityStatus.SUSPENDED ||
          service.versions[0]?.publicAvailability === GovernmentServicePublicAvailability.SUSPENDED,
      ).length,
      serviceUsageIndicators: this.mapIndicators(indicators),
      services: services.map((service) => ({
        serviceId: service.id,
        slug: service.slug,
        name: service.publicName,
        maturityStatus: service.versions[0]?.maturityStatus ?? null,
        publicAvailability: service.versions[0]?.publicAvailability ?? null,
      })),
      disclaimers: this.sectionDisclaimers(snapshot),
    };
  }

  async buildDepartments(context: ResolvedExecutiveContext) {
    const institutionId = context.primaryInstitutionId;
    const snapshot = await this.indicatorService.loadConsoleSnapshot(context);
    const indicators = this.indicatorService.filterByCategories(
      snapshot,
      EXECUTIVE_DEPARTMENTS_CATEGORIES,
    );

    const departments = await this.prisma.department.findMany({
      where: { institutionId },
      select: { id: true, code: true, name: true },
    });

    const workload = await this.summarizeDepartmentWorkload(institutionId);

    return {
      generatedAt: new Date().toISOString(),
      institutionId,
      departments: departments.map((department) => ({
        ...department,
        openCases: workload.find((item) => item.departmentId === department.id)?.openCases ?? 0,
        overdueCases:
          workload.find((item) => item.departmentId === department.id)?.overdueCases ?? 0,
      })),
      indicators: this.mapIndicators(indicators),
      disclaimers: this.sectionDisclaimers(snapshot),
    };
  }

  async buildInvestment(
    context: ResolvedExecutiveContext,
    consoleSnapshot?: ExecutiveConsoleSnapshot,
  ) {
    const institutionId = context.primaryInstitutionId;
    const snapshot = consoleSnapshot ?? (await this.indicatorService.loadConsoleSnapshot(context));
    const indicators = this.indicatorService.filterByCategories(
      snapshot,
      EXECUTIVE_INVESTMENT_CATEGORIES,
    );

    const projects = await this.loadStrategicProjects(institutionId);

    return {
      generatedAt: new Date().toISOString(),
      institutionId,
      activeInvestorsOrProjects: projects.length,
      strategicProjectCount: projects.length,
      reportedCapitalValues: projects
        .map((project) => project.reportedCapitalValue)
        .filter((value): value is number => value !== null),
      verifiedMilestones: projects.flatMap((project) => project.verifiedMilestones),
      reportedMilestones: projects.flatMap((project) => project.reportedMilestones),
      employmentEvidence: projects.flatMap((project) => project.employmentEvidence),
      projectDependencies: projects.flatMap((project) => project.dependencies),
      projectsAtRisk: projects.filter((project) => project.atRisk),
      indicators: this.mapIndicators(indicators),
      disclaimers: {
        ...this.sectionDisclaimers(snapshot),
        reportedMilestoneIsNotVerifiedMilestone: true,
        reportedCapitalIsNotVerifiedCapital: true,
      },
    };
  }

  async buildProjects(context: ResolvedExecutiveContext) {
    const institutionId = context.primaryInstitutionId;
    const snapshot = await this.indicatorService.loadConsoleSnapshot(context);
    const indicators = this.indicatorService.filterByCategories(
      snapshot,
      EXECUTIVE_PROJECTS_CATEGORIES,
    );

    const projects = await this.loadStrategicProjects(institutionId);

    return {
      generatedAt: new Date().toISOString(),
      institutionId,
      projects,
      indicators: this.mapIndicators(indicators),
      disclaimers: {
        ...this.sectionDisclaimers(snapshot),
        reportedMilestoneIsNotVerifiedMilestone: true,
      },
    };
  }

  async buildCompliance(
    context: ResolvedExecutiveContext,
    consoleSnapshot?: ExecutiveConsoleSnapshot,
  ) {
    const institutionId = context.primaryInstitutionId;
    const snapshot = consoleSnapshot ?? (await this.indicatorService.loadConsoleSnapshot(context));
    const indicators = this.indicatorService.filterByCategories(
      snapshot,
      EXECUTIVE_COMPLIANCE_CATEGORIES,
    );

    const complianceAggregate =
      await this.complianceDashboardService.getExecutiveAggregate(institutionId);

    const complianceProjections = await this.prisma.complianceStatusProjection.findMany({
      where: {
        audience: ComplianceDashboardAudience.EXECUTIVE_OVERSIGHT,
        subjectInstitutionId: institutionId,
      },
      include: { indicators: true, alerts: true },
      orderBy: { lastDerivedAt: 'desc' },
      take: 20,
    });

    const inspectionsOverdue = complianceProjections.flatMap((projection) =>
      projection.indicators.filter((indicator) =>
        ['REINSPECTION_REQUIRED', 'UPCOMING_INSPECTIONS'].includes(indicator.indicatorType),
      ),
    );
    const unresolvedCorrectiveActions = complianceProjections.flatMap((projection) =>
      projection.indicators.filter(
        (indicator) => indicator.indicatorType === 'CORRECTIVE_ACTIONS_OVERDUE',
      ),
    );
    const seriousComplianceMatters = complianceProjections.flatMap((projection) =>
      projection.indicators.filter((indicator) => indicator.indicatorType === 'CRITICAL_FINDINGS'),
    );

    return {
      generatedAt: new Date().toISOString(),
      institutionId,
      inspectionsOverdue,
      unresolvedCorrectiveActions,
      seriousComplianceMatters,
      expiringRegulatedInstruments: complianceProjections.flatMap((projection) =>
        projection.indicators.filter((indicator) =>
          ['INSTRUMENT_EXPIRING', 'INSTRUMENT_RENEWAL_DUE'].includes(indicator.indicatorType),
        ),
      ),
      appealsRedressBacklog: complianceProjections.flatMap((projection) =>
        projection.indicators.filter((indicator) =>
          ['APPEALS_BACKLOG', 'REDRESS_BACKLOG'].includes(indicator.indicatorType),
        ),
      ),
      executiveAggregate: complianceAggregate,
      indicators: this.mapIndicators(indicators),
      disclaimers: this.sectionDisclaimers(snapshot),
    };
  }

  async buildRedress(context: ResolvedExecutiveContext) {
    const institutionId = context.primaryInstitutionId;
    const snapshot = await this.indicatorService.loadConsoleSnapshot(context);
    const indicators = this.indicatorService.filterByCategories(
      snapshot,
      EXECUTIVE_REDRESS_CATEGORIES,
    );

    const openProceedings = await this.prisma.reconsiderationProceeding.count({
      where: {
        status: ReviewProceedingStatus.OPEN,
        case: { responsibleInstitutionId: institutionId },
      },
    });

    const pendingAssignments = await this.prisma.reviewAssignment.count({
      where: {
        status: ReviewAssignmentStatus.ACTIVE,
        reconsiderationProceeding: {
          status: ReviewProceedingStatus.OPEN,
          case: { responsibleInstitutionId: institutionId },
        },
      },
    });

    return {
      generatedAt: new Date().toISOString(),
      institutionId,
      openProceedings,
      pendingAssignments,
      backlogIndicators: this.mapIndicators(indicators),
      disclaimers: this.sectionDisclaimers(snapshot),
    };
  }

  async buildDigitalGovernment(
    context: ResolvedExecutiveContext,
    consoleSnapshot?: ExecutiveConsoleSnapshot,
  ) {
    const institutionId = context.primaryInstitutionId;
    const snapshot = consoleSnapshot ?? (await this.indicatorService.loadConsoleSnapshot(context));
    const indicators = this.indicatorService.filterByCategories(
      snapshot,
      EXECUTIVE_DIGITAL_GOVERNMENT_CATEGORIES,
    );

    const [activeServices, suspendedServices, suspendedAiAgents, productionReadinessIssues] =
      await Promise.all([
        this.prisma.governmentServiceVersion.count({
          where: {
            maturityStatus: GovernmentServiceMaturityStatus.ACTIVE,
            governmentService: { responsibleInstitutionId: institutionId },
          },
        }),
        this.prisma.governmentServiceVersion.count({
          where: {
            OR: [
              { maturityStatus: GovernmentServiceMaturityStatus.SUSPENDED },
              { publicAvailability: GovernmentServicePublicAvailability.SUSPENDED },
            ],
            governmentService: { responsibleInstitutionId: institutionId },
          },
        }),
        this.prisma.identity.count({
          where: { type: IdentityType.SERVICE, displayName: { contains: 'suspended' } },
        }),
        this.prisma.productionDefect.count({
          where: { status: { not: ProductionDefectStatus.CLOSED } },
        }),
      ]);

    const continuityIssues = await this.prisma.continuityEvent.count({
      where: { status: { not: 'RESOLVED' } },
    });

    return {
      generatedAt: new Date().toISOString(),
      institutionId,
      activeServices,
      suspendedServices,
      serviceHealthIndicators: this.mapIndicators(indicators),
      integrationOutages: indicators.filter((indicator) =>
        indicator.label.toLowerCase().includes('integration'),
      ),
      identitySecurityAnomalies: indicators.filter((indicator) =>
        indicator.label.toLowerCase().includes('security'),
      ),
      aiAgentsActive: await this.prisma.identity.count({ where: { type: IdentityType.SERVICE } }),
      aiAgentsSuspended: suspendedAiAgents,
      productionReadinessIssues,
      continuityIssues,
      disclaimers: this.sectionDisclaimers(snapshot),
    };
  }

  async buildRisk(context: ResolvedExecutiveContext, consoleSnapshot?: ExecutiveConsoleSnapshot) {
    const institutionId = context.primaryInstitutionId;
    const snapshot = consoleSnapshot ?? (await this.indicatorService.loadConsoleSnapshot(context));
    const indicators = this.indicatorService.filterByCategories(
      snapshot,
      EXECUTIVE_RISK_CATEGORIES,
    );

    const riskAssessments = await this.prisma.riskAssessment.findMany({
      where: { definition: { institutionId } },
      include: { definition: true },
      orderBy: { assessedAt: 'desc' },
      take: 20,
    });

    const staleAnalytics = snapshot.indicators.filter((indicator) => indicator.staleness.isStale);
    const dataQualityIssues = snapshot.indicators.filter(
      (indicator) => indicator.dataQuality !== 'VERIFIED',
    );

    return {
      generatedAt: new Date().toISOString(),
      institutionId,
      operationalRiskIndicators: indicators.filter((indicator) =>
        ['EXECUTIVE_ESCALATION', 'AUTHORITY_QUESTIONS'].includes(indicator.category),
      ),
      dependencyRiskIndicators: indicators.filter(
        (indicator) => indicator.category === 'GOVERNMENT_DEPENDENCIES',
      ),
      dataQualityIssues: this.mapIndicators(dataQualityIssues),
      staleAnalytics: this.mapIndicators(staleAnalytics),
      unresolvedExternalNationalDeterminations:
        await this.prisma.externalDependencyDetermination.count({
          where: { determinationStatus: ExternalDeterminationStatus.PENDING },
        }),
      cybersecurityReadinessConditions: indicators.filter(
        (indicator) => indicator.category === 'EVIDENCE_DEFICIENCIES',
      ),
      riskAssessments: riskAssessments.map((assessment) => ({
        assessmentId: assessment.id,
        assessmentNumber: assessment.assessmentNumber,
        overallScore: assessment.overallScore,
        scoreLabel: assessment.scoreLabel,
        isSanction: false,
        riskScoreIsNotSanction: true,
        scoreIsMandatoryGateBypass: assessment.scoreIsMandatoryGateBypass,
        limitations: assessment.limitations,
      })),
      indicators: this.mapIndicators(indicators),
      disclaimers: {
        ...this.sectionDisclaimers(snapshot),
        riskScoreIsNotSanction: true,
        aiRecommendationIsNotDecision: true,
      },
    };
  }

  async buildAlerts(context: ResolvedExecutiveContext) {
    const institutionId = context.primaryInstitutionId;

    const alerts = await this.prisma.intelligenceMonitoringAlert.findMany({
      where: {
        rule: { institutionId },
      },
      include: {
        verifications: { orderBy: { verifiedAt: 'desc' }, take: 1 },
      },
      orderBy: { observedAt: 'desc' },
      take: 50,
    });

    return {
      generatedAt: new Date().toISOString(),
      institutionId,
      alerts: alerts.map((alert) => ({
        alertId: alert.id,
        alertNumber: alert.alertNumber,
        observedCondition: alert.observedCondition,
        status: alert.status,
        observedAt: alert.observedAt.toISOString(),
        isConfirmedViolation: false,
        isVerified: alert.status === IntelligenceAlertStatus.VERIFIED_EVENT,
        hasVerificationRecord: alert.verifications.length > 0,
        verificationNotes: alert.verifications[0]?.verificationNotes ?? null,
        recommendedReview: alert.recommendedReview,
        aiAlertIsNotConfirmedViolationWithoutVerification: true,
      })),
      disclaimers: {
        aiAlertIsNotConfirmedViolationWithoutVerification: true,
        visibilityDoesNotCreateAuthority: true,
      },
    };
  }

  private mapIndicators(indicators: ExecutiveIndicatorView[]) {
    return indicators.map((indicator) => ({
      id: indicator.id,
      label: indicator.label,
      category: indicator.category,
      count: indicator.count,
      score: indicator.score,
      dataQuality: indicator.dataQuality,
      status: indicator.status,
      staleness: indicator.staleness,
      isStale: indicator.staleness.isStale,
      staleDataFlagged: indicator.staleness.isStale,
      drilldown: indicator.drilldown,
      visibilityDoesNotCreateAuthority: true,
      metricIsNotVerifiedLegalFact: true,
    }));
  }

  private sectionDisclaimers(snapshot: ExecutiveConsoleSnapshot) {
    return {
      projection: snapshot.disclaimers.projection,
      status: snapshot.disclaimers.status,
      visibilityDoesNotCreateAuthority: snapshot.disclaimers.visibilityDoesNotCreateAuthority,
      statusDoesNotCreateAuthority: snapshot.disclaimers.statusDoesNotCreateAuthority,
      executiveDashboardIsNotCommandAuthority: true,
    };
  }

  private summarizeSlaPerformance(
    clocks: { targetDurationMs: number | null; elapsedMs: number | null; status: string }[],
  ) {
    const elapsedValues = clocks
      .map((clock) => clock.elapsedMs)
      .filter((value): value is number => value !== null && value >= 0);

    const onTrack = clocks.filter((clock) => clock.status === CaseSlaClockStatus.RUNNING).length;
    const breached = clocks.filter((clock) => clock.status === CaseSlaClockStatus.BREACHED).length;

    const sorted = [...elapsedValues].sort((a, b) => a - b);
    let medianElapsedMs: number | null = null;
    if (sorted.length > 0) {
      const mid = Math.floor(sorted.length / 2);
      medianElapsedMs =
        sorted.length % 2 === 0
          ? ((sorted[mid - 1] ?? 0) + (sorted[mid] ?? 0)) / 2
          : (sorted[mid] ?? null);
    }
    const averageElapsedMs =
      elapsedValues.length === 0
        ? null
        : elapsedValues.reduce((sum, value) => sum + value, 0) / elapsedValues.length;

    return {
      onTrack,
      breached,
      totalTracked: clocks.length,
      medianElapsedMs,
      averageElapsedMs,
      slaMetricIsOperationalProjection: true,
    };
  }

  private async summarizeDepartmentWorkload(institutionId: string) {
    const departments = await this.prisma.department.findMany({
      where: { institutionId },
      select: { id: true, code: true, name: true },
    });

    const results = await Promise.all(
      departments.map(async (department) => {
        const [openCases, overdueCases] = await Promise.all([
          this.prisma.case.count({
            where: {
              responsibleDepartmentId: department.id,
              status: { notIn: [CaseStatus.CLOSED, CaseStatus.WITHDRAWN, CaseStatus.ARCHIVED] },
            },
          }),
          this.prisma.caseSlaClock.count({
            where: {
              status: CaseSlaClockStatus.BREACHED,
              case: { responsibleDepartmentId: department.id },
            },
          }),
        ]);

        return {
          departmentId: department.id,
          departmentCode: department.code,
          departmentName: department.name,
          openCases,
          overdueCases,
        };
      }),
    );

    return results;
  }

  private async loadStrategicProjects(institutionId: string) {
    const profiles = await this.prisma.strategicProjectProfile.findMany({
      where: { sponsoringInstitutionId: institutionId },
      include: {
        milestones: true,
        dependencies: true,
        risks: true,
        capitalEvidence: { orderBy: { recordedAt: 'desc' }, take: 1 },
        employmentEvidence: true,
      },
    });

    return profiles.map((profile) => {
      const verifiedMilestones = profile.milestones
        .filter((milestone) => VERIFIED_MILESTONE_STATUSES.has(milestone.status))
        .map((milestone) => ({
          milestoneId: milestone.id,
          title: milestone.title,
          status: milestone.status,
          isVerified: true,
          isReportedOnly: false,
          verifiedDate: milestone.verifiedDate?.toISOString() ?? null,
        }));

      const reportedMilestones = profile.milestones
        .filter((milestone) => REPORTED_MILESTONE_STATUSES.has(milestone.status))
        .map((milestone) => ({
          milestoneId: milestone.id,
          title: milestone.title,
          status: milestone.status,
          isVerified: false,
          isReportedOnly: true,
          reportedDate: milestone.reportedDate?.toISOString() ?? null,
          reportedMilestoneIsNotVerifiedMilestone: true,
        }));

      const reportedCapital = profile.capitalEvidence[0];

      return {
        profileId: profile.id,
        projectCode: profile.projectCode,
        title: profile.title,
        currentStage: profile.currentStage,
        reportedCapitalValue:
          reportedCapital?.amount != null ? Number(reportedCapital.amount) : null,
        reportedCapitalClassification: reportedCapital?.classification ?? null,
        verifiedMilestones,
        reportedMilestones,
        employmentEvidence: profile.employmentEvidence.map((record) => ({
          recordId: record.id,
          classification: record.classification,
          headcount: record.headcount,
          isVerified: record.classification === 'ACTIVE_VERIFIED',
        })),
        dependencies: profile.dependencies.map((dependency) => ({
          dependencyId: dependency.id,
          dependencyType: dependency.dependencyType,
          ownerReference: dependency.ownerReference,
          statusSummary: dependency.statusSummary,
        })),
        atRisk: profile.risks.some(
          (risk) => risk.riskLevel === 'HIGH' || risk.riskLevel === 'CRITICAL',
        ),
      };
    });
  }
}
