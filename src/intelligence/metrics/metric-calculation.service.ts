import { Injectable, NotFoundException } from '@nestjs/common';
import { MetricCalculationRunStatus, Prisma } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

import { PrismaService } from '../../database/prisma.service';
import { IntelligenceBoundaryService } from '../common/intelligence-boundary.service';
import { IntelligenceSafeHaltService } from '../common/intelligence-safe-halt.service';
import { METRIC_CALCULATION_REFERENCE_PREFIX } from '../intelligence.constants';

export interface StartMetricCalculationInput {
  metricDefinitionVersionId: string;
  institutionId: string;
  inputsSnapshot?: Record<string, unknown>;
  limitations?: string;
}

export interface RecordMetricObservationInput {
  metricDefinitionVersionId: string;
  institutionId: string;
  metricCalculationRunId?: string;
  observedValue: number;
  observedAt?: Date;
  periodStart?: Date;
  periodEnd?: Date;
  uncertaintyNotes?: string;
}

@Injectable()
export class MetricCalculationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly boundary: IntelligenceBoundaryService,
    private readonly safeHalt: IntelligenceSafeHaltService,
  ) {}

  private generateReference(): string {
    return `${METRIC_CALCULATION_REFERENCE_PREFIX}-${String(Date.now())}`;
  }

  async startCalculationRun(input: StartMetricCalculationInput) {
    this.boundary.rejectClientMetricFields(input as unknown as Record<string, unknown>);
    return this.prisma.metricCalculationRun.create({
      data: {
        metricDefinitionVersionId: input.metricDefinitionVersionId,
        institutionId: input.institutionId,
        runReference: this.generateReference(),
        status: MetricCalculationRunStatus.PENDING,
        inputsSnapshot: (input.inputsSnapshot ?? {}) as Prisma.InputJsonValue,
        limitations: input.limitations,
      },
    });
  }

  async completeCalculationRun(runId: string, consequential = false) {
    const run = await this.prisma.metricCalculationRun.findUnique({ where: { id: runId } });
    if (!run) {
      throw new NotFoundException(`Metric calculation run ${runId} not found`);
    }
    this.boundary.assertCalculationRunFailureSafeHalt(run.status);
    this.safeHalt.assertConsequentialPathAllowed({
      metricCalculationStatus: run.status,
      consequential,
    });
    return this.prisma.metricCalculationRun.update({
      where: { id: runId },
      data: {
        status: MetricCalculationRunStatus.COMPLETED,
        completedAt: new Date(),
      },
    });
  }

  async recordObservation(input: RecordMetricObservationInput) {
    this.boundary.rejectClientMetricFields(input as unknown as Record<string, unknown>);
    this.boundary.assertMetricObservationNotPerformanceVerdict();
    return this.prisma.metricObservation.create({
      data: {
        metricDefinitionVersionId: input.metricDefinitionVersionId,
        institutionId: input.institutionId,
        metricCalculationRunId: input.metricCalculationRunId,
        observedValue: new Decimal(input.observedValue),
        observedAt: input.observedAt ?? new Date(),
        periodStart: input.periodStart,
        periodEnd: input.periodEnd,
        uncertaintyNotes: input.uncertaintyNotes,
      },
    });
  }
}
