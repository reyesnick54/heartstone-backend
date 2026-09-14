import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, SimulationOutputType, SimulationRunStatus } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { IntelligenceBoundaryService } from '../common/intelligence-boundary.service';
import { IntelligenceSafeHaltService } from '../common/intelligence-safe-halt.service';
import { SIMULATION_RUN_REFERENCE_PREFIX } from '../intelligence.constants';

export interface CreateSimulationScenarioInput {
  digitalTwinVersionId: string;
  scenarioCode: string;
  title: string;
  description?: string;
  parameters?: Record<string, unknown>;
}

export interface StartSimulationRunInput {
  simulationScenarioId: string;
  institutionId: string;
  runConfig?: Record<string, unknown>;
}

@Injectable()
export class SimulationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly boundary: IntelligenceBoundaryService,
    private readonly safeHalt: IntelligenceSafeHaltService,
  ) {}

  private generateReference(): string {
    return `${SIMULATION_RUN_REFERENCE_PREFIX}-${String(Date.now())}`;
  }

  async createScenario(input: CreateSimulationScenarioInput) {
    this.boundary.assertTwinNotRealObject();
    return this.prisma.simulationScenario.create({
      data: {
        digitalTwinVersionId: input.digitalTwinVersionId,
        scenarioCode: input.scenarioCode,
        title: input.title,
        description: input.description,
        parameters: (input.parameters ?? {}) as Prisma.InputJsonValue,
      },
    });
  }

  async startRun(input: StartSimulationRunInput) {
    this.boundary.assertSimulationCannotUpdateLiveCase(false);
    return this.prisma.simulationRun.create({
      data: {
        simulationScenarioId: input.simulationScenarioId,
        institutionId: input.institutionId,
        runReference: this.generateReference(),
        status: SimulationRunStatus.RUNNING,
        startedAt: new Date(),
        runConfig: (input.runConfig ?? {}) as Prisma.InputJsonValue,
      },
    });
  }

  async recordOutput(
    simulationRunId: string,
    outputType: SimulationOutputType,
    outputData: Record<string, unknown>,
  ) {
    this.boundary.assertSimulationOutputNotLiveState(false);
    if (outputType === SimulationOutputType.RECOMMENDATION) {
      this.boundary.assertRecommendationNotWaiver();
    }
    if (outputType === SimulationOutputType.SCENARIO_COMPARISON) {
      this.boundary.assertScenarioComparisonNotMandate();
    }
    if (outputType === SimulationOutputType.SENSITIVITY_ANALYSIS) {
      this.boundary.assertSensitivityAnalysisNotApproval();
    }
    return this.prisma.simulationOutput.create({
      data: {
        simulationRunId,
        outputType,
        outputData: outputData as Prisma.InputJsonValue,
      },
    });
  }

  applyToLiveCase(mutatingLiveCase: boolean): void {
    this.boundary.assertSimulationCannotUpdateLiveCase(mutatingLiveCase);
    this.boundary.assertSimulationOutputNotLiveState(mutatingLiveCase);
  }

  async transitionToLive(
    simulationRunId: string,
    digitalTwinVersionId: string,
    consequentialUseApproved: boolean,
    transitionedByIdentityId?: string,
  ) {
    this.boundary.assertSimulationToLiveRequiresApprovedReview(consequentialUseApproved);
    const run = await this.prisma.simulationRun.findUnique({ where: { id: simulationRunId } });
    if (!run) {
      throw new NotFoundException(`Simulation run ${simulationRunId} not found`);
    }
    this.safeHalt.assertConsequentialPathAllowed({
      simulationRunStatus: run.status,
      consequential: true,
    });
    return this.prisma.simulationToLiveTransitionRecord.create({
      data: {
        simulationRunId,
        digitalTwinVersionId,
        transitionedByIdentityId,
        liveConfigSnapshot: run.runConfig as Prisma.InputJsonValue,
      },
    });
  }
}
