import { Injectable } from '@nestjs/common';
import {
  LoadTestRunStatus,
  PerformanceTestRunStatus,
  PerformanceTestScenarioType,
  StressTestRunStatus,
} from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { CorrelationIdService } from '../common/correlation-id.service';
import { ProductionReliabilityBoundaryService } from '../common/production-reliability-boundary.service';
import { RELIABILITY_NUMBER_PREFIXES } from '../production-reliability.constants';

export interface PerformanceTestInput {
  reliabilityDefinitionId: string;
  scenarioType: PerformanceTestScenarioType;
  targetEnvironment: string;
  usesProductionData?: boolean;
  productionDataApproved?: boolean;
}

export interface LoadTestInput extends PerformanceTestInput {
  isProductionTarget?: boolean;
  productionTestAuthorized?: boolean;
  virtualUsers?: number;
  durationSeconds?: number;
}

export interface StressTestInput extends PerformanceTestInput {
  isProductionTarget?: boolean;
  productionTestAuthorized?: boolean;
  peakMultiplier?: number;
}

@Injectable()
export class PerformanceTestService {
  private performanceCounter = 0;
  private loadCounter = 0;
  private stressCounter = 0;

  constructor(
    private readonly prisma: PrismaService,
    private readonly boundary: ProductionReliabilityBoundaryService,
    private readonly correlationIdService: CorrelationIdService,
  ) {}

  async planPerformanceRun(input: PerformanceTestInput) {
    this.boundary.assertProductionDataApproved(
      input.usesProductionData ?? false,
      input.productionDataApproved ?? false,
    );
    this.boundary.assertLoadPreservesAuthorityChecks(false);

    this.performanceCounter += 1;
    const runNumber = `${RELIABILITY_NUMBER_PREFIXES.PERFORMANCE_RUN}-${String(this.performanceCounter).padStart(6, '0')}`;
    const correlationId = this.correlationIdService.getCorrelationId();

    return this.prisma.performanceTestRun.create({
      data: {
        reliabilityDefinitionId: input.reliabilityDefinitionId,
        runNumber,
        scenarioType: input.scenarioType,
        targetEnvironment: input.targetEnvironment,
        usesProductionData: input.usesProductionData ?? false,
        productionDataApproved: input.productionDataApproved ?? false,
        status: PerformanceTestRunStatus.PLANNED,
        correlationId,
      },
    });
  }

  async planLoadTest(input: LoadTestInput) {
    const isProduction = input.isProductionTarget ?? false;
    const authorized = input.productionTestAuthorized ?? false;

    this.boundary.assertProductionDataApproved(
      input.usesProductionData ?? false,
      input.productionDataApproved ?? false,
    );
    this.boundary.assertLoadPreservesAuthorityChecks(false);

    if (isProduction && !authorized) {
      this.loadCounter += 1;
      const runNumber = `${RELIABILITY_NUMBER_PREFIXES.LOAD_RUN}-${String(this.loadCounter).padStart(6, '0')}`;
      return this.prisma.loadTestRun.create({
        data: {
          reliabilityDefinitionId: input.reliabilityDefinitionId,
          runNumber,
          scenarioType: input.scenarioType,
          targetEnvironment: input.targetEnvironment,
          isProductionTarget: true,
          productionTestAuthorized: false,
          status: LoadTestRunStatus.BLOCKED_UNSAFE_TARGET,
          virtualUsers: input.virtualUsers,
          durationSeconds: input.durationSeconds,
        },
      });
    }

    this.boundary.assertProductionLoadAuthorized(isProduction, authorized);

    this.loadCounter += 1;
    const runNumber = `${RELIABILITY_NUMBER_PREFIXES.LOAD_RUN}-${String(this.loadCounter).padStart(6, '0')}`;
    const correlationId = this.correlationIdService.getCorrelationId();

    return this.prisma.loadTestRun.create({
      data: {
        reliabilityDefinitionId: input.reliabilityDefinitionId,
        runNumber,
        scenarioType: input.scenarioType,
        targetEnvironment: input.targetEnvironment,
        isProductionTarget: isProduction,
        productionTestAuthorized: authorized,
        virtualUsers: input.virtualUsers,
        durationSeconds: input.durationSeconds,
        status: LoadTestRunStatus.PLANNED,
        correlationId,
      },
    });
  }

  async planStressTest(input: StressTestInput) {
    const isProduction = input.isProductionTarget ?? false;
    const authorized = input.productionTestAuthorized ?? false;

    this.boundary.assertPerformanceDegradationNotApproval();

    if (isProduction && !authorized) {
      this.stressCounter += 1;
      const runNumber = `${RELIABILITY_NUMBER_PREFIXES.STRESS_RUN}-${String(this.stressCounter).padStart(6, '0')}`;
      return this.prisma.stressTestRun.create({
        data: {
          reliabilityDefinitionId: input.reliabilityDefinitionId,
          runNumber,
          scenarioType: input.scenarioType,
          targetEnvironment: input.targetEnvironment,
          isProductionTarget: true,
          productionTestAuthorized: false,
          status: StressTestRunStatus.BLOCKED_UNSAFE_TARGET,
          peakMultiplier: input.peakMultiplier,
        },
      });
    }

    this.boundary.assertProductionLoadAuthorized(isProduction, authorized);

    this.stressCounter += 1;
    const runNumber = `${RELIABILITY_NUMBER_PREFIXES.STRESS_RUN}-${String(this.stressCounter).padStart(6, '0')}`;
    const correlationId = this.correlationIdService.getCorrelationId();

    return this.prisma.stressTestRun.create({
      data: {
        reliabilityDefinitionId: input.reliabilityDefinitionId,
        runNumber,
        scenarioType: input.scenarioType,
        targetEnvironment: input.targetEnvironment,
        isProductionTarget: isProduction,
        productionTestAuthorized: authorized,
        peakMultiplier: input.peakMultiplier,
        status: StressTestRunStatus.PLANNED,
        correlationId,
      },
    });
  }

  assertIdempotencyOnRetry(alreadyProcessed: boolean): void {
    this.boundary.assertIdempotencyPreserved(alreadyProcessed);
  }
}
