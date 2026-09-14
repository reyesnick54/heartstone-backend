import { type INestApplication } from '@nestjs/common';
import {
  AIModelStatus,
  AIUseCaseStatus,
  DashboardDefinitionStatus,
  MetricDefinitionStatus,
  MonitoringRuleStatus,
  MonitoringRuleType,
} from '@prisma/client';
import { type App } from 'supertest/types';

import { type PrismaService } from '../../src/database/prisma.service';
import { AiModelRegistryService } from '../../src/intelligence/ai/ai-model-registry.service';
import { AiUseCaseService } from '../../src/intelligence/ai/ai-use-case.service';
import { DashboardDefinitionService } from '../../src/intelligence/dashboards/dashboard-definition.service';
import { DashboardIndicatorService } from '../../src/intelligence/dashboards/dashboard-indicator.service';
import { MetricDefinitionService } from '../../src/intelligence/metrics/metric-definition.service';
import { PerformanceFrameworkService } from '../../src/intelligence/metrics/performance-framework.service';
import { StrategicProjectService } from '../../src/intelligence/strategic-projects/strategic-project.service';
import { type Phase8FixtureContext, seedPhase8Fixture } from './phase-8-test-fixtures';

export const NON_PRODUCTION_PHASE_12_FIXTURE_MARKER = 'NON_PRODUCTION_PHASE_12_INTEL';

export interface ProcessingTimeBreakdown {
  ABSEZ: number;
  APPLICANT: number;
  EXTERNAL_DEPENDENCY: number;
}

export interface Phase12FixtureContext extends Phase8FixtureContext {
  performanceFrameworkId: string;
  metricDefinitionId: string;
  metricDefinitionVersionId: string;
  servicePerformanceMetricCode: string;
  dashboardDefinitionId: string;
  dashboardVersionId: string;
  executiveDashboardCode: string;
  servicePerformanceIndicatorId: string;
  aiModelDefinitionId: string;
  aiModelVersionId: string;
  aiUseCaseId: string;
  aiUseCaseVersionId: string;
  strategicProjectProfileId: string;
  monitoringRuleId: string;
}

export const EXECUTIVE_INDICATOR_CODES = [
  'CASE_VOLUMES',
  'PENDING_DECISIONS',
  'DEADLINES',
  'RISK',
  'COMPLIANCE',
  'REDRESS',
  'SERVICE_HEALTH',
] as const;

export function buildProcessingTimeBreakdown(
  absezMinutes: number,
  applicantMinutes: number,
  externalMinutes: number,
): ProcessingTimeBreakdown {
  return {
    ABSEZ: absezMinutes,
    APPLICANT: applicantMinutes,
    EXTERNAL_DEPENDENCY: externalMinutes,
  };
}

export async function seedPhase12Fixture(
  app: INestApplication<App>,
  prisma: PrismaService,
): Promise<Phase12FixtureContext> {
  const marker = NON_PRODUCTION_PHASE_12_FIXTURE_MARKER;
  const phase8 = await seedPhase8Fixture(app, prisma, { includePreRecordedDecision: true });

  const performanceFrameworks = app.get(PerformanceFrameworkService);
  const metricDefinitions = app.get(MetricDefinitionService);
  const dashboardDefinitions = app.get(DashboardDefinitionService);
  const dashboardIndicators = app.get(DashboardIndicatorService);
  const aiModels = app.get(AiModelRegistryService);
  const aiUseCases = app.get(AiUseCaseService);
  const strategicProjects = app.get(StrategicProjectService);

  const framework = await performanceFrameworks.createFramework({
    institutionId: phase8.institutionId,
    code: `${marker}-PF`,
    name: 'Phase 12 Service Performance Framework',
    description: 'Institutional performance measurement for intelligence tests',
    effectiveFrom: new Date('2020-01-01'),
  });

  const servicePerformanceMetricCode = `${marker}-SERVICE-PERF`;
  const metricDefinition = await metricDefinitions.createDefinition({
    performanceFrameworkId: framework.id,
    institutionId: phase8.institutionId,
    code: servicePerformanceMetricCode,
    name: 'Median service processing time',
    description: 'ABSEZ, applicant, and external dependency time separation',
    unit: 'minutes',
  });

  const metricVersion = await metricDefinitions.createVersion({
    metricDefinitionId: metricDefinition.id,
    definitionConfig: {
      components: ['ABSEZ', 'APPLICANT', 'EXTERNAL_DEPENDENCY'],
      aggregation: 'median',
    },
    methodology: 'Processing time decomposition per case decision trace',
    limitations: 'Observations are informational and not performance verdicts',
  });

  await prisma.metricDefinition.update({
    where: { id: metricDefinition.id },
    data: {
      currentVersionId: metricVersion.id,
      status: MetricDefinitionStatus.ACTIVE,
    },
  });

  const executiveDashboardCode = `${marker}-EXEC`;
  const dashboard = await dashboardDefinitions.createDefinition({
    institutionId: phase8.institutionId,
    code: executiveDashboardCode,
    name: 'Executive oversight dashboard',
    description: 'Drillable executive indicators without command authority',
  });

  const dashboardVersion = await dashboardDefinitions.createVersion({
    dashboardDefinitionId: dashboard.id,
    layoutConfig: {
      viewType: 'executive',
      actionsUnlocked: false,
    },
  });

  await prisma.dashboardDefinition.update({
    where: { id: dashboard.id },
    data: { status: DashboardDefinitionStatus.ACTIVE },
  });

  await prisma.dashboardVersion.update({
    where: { id: dashboardVersion.id },
    data: { status: DashboardDefinitionStatus.ACTIVE, publishedAt: new Date('2020-01-01') },
  });

  const servicePerformanceIndicator = await dashboardIndicators.createIndicator({
    dashboardVersionId: dashboardVersion.id,
    metricDefinitionId: metricDefinition.id,
    indicatorCode: 'SERVICE_PERFORMANCE',
    label: 'Service processing time',
    config: {
      drillDownReferences: [{ type: 'MetricObservation', field: 'observedValue' }],
      drillable: true,
    },
  });

  for (const indicatorCode of EXECUTIVE_INDICATOR_CODES) {
    await dashboardIndicators.createIndicator({
      dashboardVersionId: dashboardVersion.id,
      indicatorCode,
      label: indicatorCode.replace(/_/g, ' '),
      config: {
        drillDownReferences: [{ type: 'Case', id: phase8.caseId }],
        drillable: true,
        actionsUnlocked: false,
      },
    });
  }

  const aiModel = await aiModels.registerModel({
    institutionId: phase8.institutionId,
    code: `${marker}-MODEL`,
    name: 'Phase 12 Decision Support Model',
    description: 'Deterministic recommendatory model for intelligence tests',
    provider: 'TEST',
  });

  const aiModelVersion = await aiModels.createVersion({
    aiModelDefinitionId: aiModel.id,
    modelIdentifier: `${marker}-MODEL-v1`,
    limitations: 'Recommendatory only; human review required',
    uncertaintyNotes: 'Outputs must not be treated as decisions',
    capabilitySummary: 'Evidence summarization with source traceability',
  });

  await prisma.aIModelVersion.update({
    where: { id: aiModelVersion.id },
    data: { status: AIModelStatus.ACTIVE },
  });

  const aiUseCase = await aiUseCases.createUseCase({
    institutionId: phase8.institutionId,
    aiModelDefinitionId: aiModel.id,
    code: `${marker}-USE-CASE`,
    name: 'Decision support summarization',
    description: 'Summarize evidence for official review',
  });

  const aiUseCaseVersion = await aiUseCases.createVersion({
    aiUseCaseId: aiUseCase.id,
    purpose: 'Evidence summary with sources and limitations',
    scope: 'Single-case decision support',
    limitations: 'Cannot approve, refuse, or decide',
    humanOversightRequired: true,
  });

  await prisma.aIUseCaseVersion.update({
    where: { id: aiUseCaseVersion.id },
    data: { status: AIUseCaseStatus.ACTIVE },
  });

  const strategicProject = await strategicProjects.createProject({
    institutionId: phase8.institutionId,
    sponsorInstitutionId: phase8.institutionId,
    projectCode: `${marker}-PROJECT`,
    title: 'Phase 12 Strategic Infrastructure Project',
    description: 'Milestone verification workflow test project',
  });

  const monitoringRule = await prisma.monitoringRule.create({
    data: {
      code: `${marker}-THRESHOLD`,
      name: 'Phase 12 backlog threshold',
      description: 'Raises informational alerts when backlog exceeds threshold',
      ruleType: MonitoringRuleType.DUE_DATE_WARNING,
      status: MonitoringRuleStatus.ACTIVE,
      institutionId: phase8.institutionId,
      structuredConfig: {
        threshold: 10,
        metricCode: servicePerformanceMetricCode,
        comparison: 'GREATER_THAN',
      },
      warningDaysBefore: 5,
      effectiveFrom: new Date('2020-01-01'),
    },
  });

  return {
    ...phase8,
    performanceFrameworkId: framework.id,
    metricDefinitionId: metricDefinition.id,
    metricDefinitionVersionId: metricVersion.id,
    servicePerformanceMetricCode,
    dashboardDefinitionId: dashboard.id,
    dashboardVersionId: dashboardVersion.id,
    executiveDashboardCode,
    servicePerformanceIndicatorId: servicePerformanceIndicator.id,
    aiModelDefinitionId: aiModel.id,
    aiModelVersionId: aiModelVersion.id,
    aiUseCaseId: aiUseCase.id,
    aiUseCaseVersionId: aiUseCaseVersion.id,
    strategicProjectProfileId: strategicProject.id,
    monitoringRuleId: monitoringRule.id,
  };
}
