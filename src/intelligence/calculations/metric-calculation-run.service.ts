import { Injectable, NotFoundException } from '@nestjs/common';
import { type MetricCalculationRun, MetricDefinitionVersionStatus, Prisma } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { hashCalculationIntegrity } from '../common/integrity-hash.util';
import { IntelligenceBoundaryService } from '../common/intelligence-boundary.service';
import { RecordMetricCalculationRunDto } from '../dto/record-metric-calculation-run.dto';

@Injectable()
export class MetricCalculationRunService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly boundary: IntelligenceBoundaryService,
  ) {}

  async recordRun(
    dto: RecordMetricCalculationRunDto,
    softwareVersion: string,
  ): Promise<MetricCalculationRun> {
    const version = await this.prisma.metricDefinitionVersion.findUnique({
      where: { id: dto.metricVersionId },
    });
    if (!version) {
      throw new NotFoundException(`Metric version ${dto.metricVersionId} not found`);
    }
    if (version.status !== MetricDefinitionVersionStatus.ACTIVE) {
      throw new NotFoundException('Calculation runs require an active metric version');
    }

    const excludedRecords = dto.excludedRecords ?? [];
    const exclusionReasons = dto.exclusionReasons ?? [];
    this.boundary.assertExclusionsDocumented(excludedRecords, exclusionReasons);

    const integrityHash = hashCalculationIntegrity({
      metricVersionId: dto.metricVersionId,
      periodStart: dto.periodStart.toISOString(),
      periodEnd: dto.periodEnd.toISOString(),
      inputCount: dto.inputCount,
      excludedRecords,
      calculationTrace: dto.calculationTrace,
      resultValue: dto.resultValue,
      softwareVersion,
    });

    return this.prisma.metricCalculationRun.create({
      data: {
        metricVersionId: dto.metricVersionId,
        periodStart: dto.periodStart,
        periodEnd: dto.periodEnd,
        inputRecordReferences: (dto.inputRecordReferences ?? []) as Prisma.InputJsonValue,
        inputCount: dto.inputCount,
        excludedRecords: excludedRecords as Prisma.InputJsonValue,
        exclusionReasons: exclusionReasons as Prisma.InputJsonValue,
        calculationTrace: dto.calculationTrace as Prisma.InputJsonValue,
        resultValue: dto.resultValue,
        qualityFindings: (dto.qualityFindings ?? []) as Prisma.InputJsonValue,
        softwareVersion,
        integrityHash,
        dataQualityAssessments: dto.qualityAssessments
          ? {
              create: dto.qualityAssessments.map((assessment) => ({
                dimension: assessment.dimension,
                result: assessment.result,
                findings: assessment.findings,
              })),
            }
          : undefined,
      },
    });
  }

  async findById(id: string): Promise<MetricCalculationRun> {
    const run = await this.prisma.metricCalculationRun.findUnique({
      where: { id },
      include: { dataQualityAssessments: true },
    });
    if (!run) {
      throw new NotFoundException(`Calculation run ${id} not found`);
    }
    return run;
  }
}
