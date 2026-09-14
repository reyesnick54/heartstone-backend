import { type INestApplication } from '@nestjs/common';
import {
  DashboardIndicatorStatus,
  MetricCalculationRunStatus,
  PerformanceClaimStatus,
} from '@prisma/client';
import { type App } from 'supertest/types';

import { type PrismaService } from '../src/database/prisma.service';
import { DashboardIndicatorService } from '../src/intelligence/dashboards/dashboard-indicator.service';
import { MetricCalculationService } from '../src/intelligence/metrics/metric-calculation.service';
import { PerformanceClaimService } from '../src/intelligence/metrics/performance-claim.service';
import { createIntegrationApp, resetAllTestData } from './helpers/integration-app';
import { buildProcessingTimeBreakdown, seedPhase12Fixture } from './helpers/phase-12-test-fixtures';

describe('Phase 12 intelligence (integration)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

  beforeAll(async () => {
    ({ app, prisma } = await createIntegrationApp());
  });

  beforeEach(async () => {
    await resetAllTestData(prisma);
  });

  afterAll(async () => {
    await app.close();
  });

  it('calculates service performance metric with ABSEZ/applicant/external time separation', async () => {
    const fixture = await seedPhase12Fixture(app, prisma);
    const metricCalculations = app.get(MetricCalculationService);
    const processingBreakdown = buildProcessingTimeBreakdown(48, 72, 24);

    const run = await metricCalculations.startCalculationRun({
      metricDefinitionVersionId: fixture.metricDefinitionVersionId,
      institutionId: fixture.institutionId,
      inputsSnapshot: {
        caseId: fixture.caseId,
        processingTimeBreakdown: processingBreakdown,
      },
      limitations: 'Processing time decomposition is observational only',
    });

    const completedRun = await metricCalculations.completeCalculationRun(run.id);
    expect(completedRun.status).toBe(MetricCalculationRunStatus.COMPLETED);

    const observation = await metricCalculations.recordObservation({
      metricDefinitionVersionId: fixture.metricDefinitionVersionId,
      institutionId: fixture.institutionId,
      metricCalculationRunId: completedRun.id,
      observedValue:
        processingBreakdown.ABSEZ +
        processingBreakdown.APPLICANT +
        processingBreakdown.EXTERNAL_DEPENDENCY,
      uncertaintyNotes: 'Components recorded separately in decision trace',
    });

    expect(observation.observedValue.toNumber()).toBe(144);

    const storedRun = await prisma.metricCalculationRun.findUniqueOrThrow({
      where: { id: completedRun.id },
    });
    const inputs = storedRun.inputsSnapshot as unknown as {
      processingTimeBreakdown: ReturnType<typeof buildProcessingTimeBreakdown>;
    };
    expect(inputs.processingTimeBreakdown.ABSEZ).toBe(48);
    expect(inputs.processingTimeBreakdown.APPLICANT).toBe(72);
    expect(inputs.processingTimeBreakdown.EXTERNAL_DEPENDENCY).toBe(24);
  });

  it('creates performance claim linked to metric observation without constituting a decision', async () => {
    const fixture = await seedPhase12Fixture(app, prisma);
    const metricCalculations = app.get(MetricCalculationService);
    const performanceClaims = app.get(PerformanceClaimService);

    const run = await metricCalculations.startCalculationRun({
      metricDefinitionVersionId: fixture.metricDefinitionVersionId,
      institutionId: fixture.institutionId,
    });
    await metricCalculations.completeCalculationRun(run.id);

    const observation = await metricCalculations.recordObservation({
      metricDefinitionVersionId: fixture.metricDefinitionVersionId,
      institutionId: fixture.institutionId,
      metricCalculationRunId: run.id,
      observedValue: 96,
    });

    const claim = await performanceClaims.createClaim({
      institutionId: fixture.institutionId,
      metricDefinitionId: fixture.metricDefinitionId,
      metricObservationId: observation.id,
      claimStatement: 'Median processing time improved compared to prior quarter baseline',
      claimedValue: 96,
      createdByIdentityId: fixture.officialIdentityId,
      limitations: 'Association does not establish causation',
      uncertaintyNotes: 'Baseline comparison pending independent review',
    });

    expect(claim.status).toBe(PerformanceClaimStatus.DRAFT);

    const submitted = await performanceClaims.submitClaim(claim.id);
    expect(submitted.status).toBe(PerformanceClaimStatus.SUBMITTED);
    expect(await prisma.governmentDecision.count({ where: { caseId: fixture.caseId } })).toBe(1);
  });

  it('projects dashboard indicator with drill-down references and blocks stale consequential use', async () => {
    const fixture = await seedPhase12Fixture(app, prisma);
    const dashboardIndicators = app.get(DashboardIndicatorService);

    const currentProjection = await dashboardIndicators.projectIndicator({
      dashboardIndicatorDefinitionId: fixture.servicePerformanceIndicatorId,
      institutionId: fixture.institutionId,
      computedValue: 144,
      displayValue: '144 minutes (median)',
      disclaimer: 'Indicator projection is informational only',
    });

    expect(currentProjection.status).toBe(DashboardIndicatorStatus.CURRENT);
    expect(currentProjection.isStale).toBe(false);

    const latest = await dashboardIndicators.getLatestProjection(
      fixture.servicePerformanceIndicatorId,
    );
    expect(latest.computedValue?.toNumber()).toBe(144);

    await expect(
      dashboardIndicators.projectIndicator({
        dashboardIndicatorDefinitionId: fixture.servicePerformanceIndicatorId,
        institutionId: fixture.institutionId,
        computedValue: 999,
        isStale: true,
        consequential: true,
      }),
    ).rejects.toThrow(/stale/i);

    const indicator = await prisma.dashboardIndicatorDefinition.findUniqueOrThrow({
      where: { id: fixture.servicePerformanceIndicatorId },
    });
    const config = indicator.config as { drillDownReferences?: unknown[]; drillable?: boolean };
    expect(config.drillable).toBe(true);
    expect(config.drillDownReferences?.length).toBeGreaterThan(0);
  });
});
