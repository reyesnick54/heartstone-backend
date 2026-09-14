import { Injectable, NotFoundException } from '@nestjs/common';
import {
  DigitalTwinMode,
  Prisma,
  SimulationRunStatus,
  SimulationScenarioStatus,
} from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { IntelligenceBoundaryService } from '../common/intelligence-boundary.service';

export interface CreateSimulationScenarioInput {
  scenarioCode: string;
  purpose: string;
  scenarioDescription: string;
  twinVersionId: string;
  inputSnapshotId?: string;
  modelVersionReference: string;
  parameters?: Prisma.InputJsonValue;
  scenarioDate: Date;
  limitations: string;
}

export interface StartSimulationRunInput {
  scenarioId: string;
  twinVersionId: string;
  inputSnapshotId: string;
  mode?: DigitalTwinMode;
}

export interface RecordSimulationOutputInput {
  simulationRunId: string;
  outputPayload: Prisma.InputJsonValue;
  outputType: string;
}

export interface RecordSimulationAssumptionInput {
  simulationRunId: string;
  assumptionText: string;
  assumptionCategory?: string;
}

export interface RecordSimulationUncertaintyInput {
  simulationRunId: string;
  uncertaintyDescription: string;
  uncertaintyLevel?: string;
}

export interface AttemptLiveMutationInput {
  target: string;
  action: string;
}

@Injectable()
export class SimulationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly boundary: IntelligenceBoundaryService,
  ) {}

  async createScenario(input: CreateSimulationScenarioInput) {
    this.boundary.assertScenarioNotPrediction(false);

    return this.prisma.simulationScenario.create({
      data: {
        scenarioCode: input.scenarioCode,
        purpose: input.purpose,
        scenarioDescription: input.scenarioDescription,
        twinVersionId: input.twinVersionId,
        inputSnapshotId: input.inputSnapshotId,
        modelVersionReference: input.modelVersionReference,
        parameters: input.parameters ?? {},
        scenarioDate: input.scenarioDate,
        limitations: input.limitations,
        isPrediction: false,
        status: SimulationScenarioStatus.DRAFT,
      },
    });
  }

  async startRun(input: StartSimulationRunInput) {
    const scenario = await this.prisma.simulationScenario.findUnique({
      where: { id: input.scenarioId },
    });

    if (!scenario) {
      throw new NotFoundException(`SimulationScenario ${input.scenarioId} not found`);
    }

    this.boundary.assertScenarioNotPrediction(scenario.isPrediction);

    const latestRun = await this.prisma.simulationRun.findFirst({
      where: { scenarioId: input.scenarioId },
      orderBy: { runNumber: 'desc' },
    });

    const runNumber = (latestRun?.runNumber ?? 0) + 1;

    return this.prisma.simulationRun.create({
      data: {
        scenarioId: input.scenarioId,
        runNumber,
        twinVersionId: input.twinVersionId,
        inputSnapshotId: input.inputSnapshotId,
        mode: input.mode ?? DigitalTwinMode.SIMULATION,
        status: SimulationRunStatus.RUNNING,
        startedAt: new Date(),
      },
    });
  }

  async recordInput(
    simulationRunId: string,
    inputSnapshotId: string,
    inputPayload: Prisma.InputJsonValue,
  ) {
    await this.ensureRunExists(simulationRunId);

    return this.prisma.simulationInput.create({
      data: {
        simulationRunId,
        inputSnapshotId,
        inputPayload,
      },
    });
  }

  async recordOutput(input: RecordSimulationOutputInput) {
    await this.ensureRunExists(input.simulationRunId);
    this.boundary.assertOutputNotPresentedAsPrediction(false);

    return this.prisma.simulationOutput.create({
      data: {
        simulationRunId: input.simulationRunId,
        outputPayload: input.outputPayload,
        outputType: input.outputType,
        isAdvisoryOnly: true,
        presentedAsPrediction: false,
      },
    });
  }

  async recordAssumption(input: RecordSimulationAssumptionInput) {
    await this.ensureRunExists(input.simulationRunId);

    return this.prisma.simulationAssumption.create({
      data: {
        simulationRunId: input.simulationRunId,
        assumptionText: input.assumptionText,
        assumptionCategory: input.assumptionCategory,
      },
    });
  }

  async recordUncertainty(input: RecordSimulationUncertaintyInput) {
    await this.ensureRunExists(input.simulationRunId);

    return this.prisma.simulationUncertainty.create({
      data: {
        simulationRunId: input.simulationRunId,
        uncertaintyDescription: input.uncertaintyDescription,
        uncertaintyLevel: input.uncertaintyLevel,
      },
    });
  }

  async completeRun(simulationRunId: string) {
    await this.ensureRunExists(simulationRunId);

    return this.prisma.simulationRun.update({
      where: { id: simulationRunId },
      data: {
        status: SimulationRunStatus.COMPLETED,
        completedAt: new Date(),
      },
    });
  }

  attemptLiveMutation(input: AttemptLiveMutationInput): never {
    this.boundary.assertSimulationCannotMutateLive(input.target);
    this.boundary.assertSimulationActionForbidden(input.action);
    throw new Error('unreachable');
  }

  async findScenarioById(id: string) {
    const scenario = await this.prisma.simulationScenario.findUnique({
      where: { id },
      include: { runs: { orderBy: { runNumber: 'desc' } } },
    });

    if (!scenario) {
      throw new NotFoundException(`SimulationScenario ${id} not found`);
    }

    this.boundary.assertScenarioNotPrediction(scenario.isPrediction);
    return scenario;
  }

  async findRunById(id: string) {
    const run = await this.prisma.simulationRun.findUnique({
      where: { id },
      include: {
        scenario: true,
        inputs: true,
        outputs: true,
        assumptions: true,
        uncertainties: true,
        reviews: true,
      },
    });

    if (!run) {
      throw new NotFoundException(`SimulationRun ${id} not found`);
    }

    return run;
  }

  private async ensureRunExists(simulationRunId: string) {
    const run = await this.prisma.simulationRun.findUnique({
      where: { id: simulationRunId },
    });

    if (!run) {
      throw new NotFoundException(`SimulationRun ${simulationRunId} not found`);
    }

    return run;
  }
}
