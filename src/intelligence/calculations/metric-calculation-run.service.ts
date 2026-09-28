import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { MetricCalculationMethodType } from '@prisma/client';
import { type MetricCalculationRun, MetricDefinitionVersionStatus, Prisma } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { ComputedMetricService } from '../../remediation/s19/reporting/computed-metric.service';
import { S19_REASON_CODES } from '../../remediation/s19/s19.constants';
import { hashCalculationIntegrity } from '../common/integrity-hash.util';
import { IntelligenceBoundaryService } from '../common/intelligence-boundary.service';
import { RecordMetricCalculationRunDto } from '../dto/record-metric-calculation-run.dto';

@Injectable()
export class MetricCalculationRunService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly boundary: IntelligenceBoundaryService,
    private readonly computedMetrics: ComputedMetricService,
  ) {}

  async recordRun(
    dto: RecordMetricCalculationRunDto,
    softwareVersion: string,
  ): Promise<MetricCalculationRun> {
    const version = await this.prisma.metricDefinitionVersion.findUnique({
      where: { id: dto.metricVersionId },
      include: { metricDefinition: true },
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

    const definition = version.metricDefinition;
    let resultValue = dto.resultValue;
    let inputCount = dto.inputCount;
    let inputRecordReferences = dto.inputRecordReferences ?? [];
    let calculationTrace = dto.calculationTrace;

    if (
      definition.calculationMethod !== MetricCalculationMethodType.MANUAL_AUTHORIZED_CALCULATION
    ) {
      if (dto.resultValue !== undefined) {
        throw new ForbiddenException(S19_REASON_CODES.AUTHORITATIVE_KPI_SUBMISSION_FORBIDDEN);
      }

      const computed = await this.computedMetrics.compute({
        institutionId: definition.ownerInstitutionId,
        metricCode: definition.code,
        periodStart: dto.periodStart,
        periodEnd: dto.periodEnd,
      });

      if (!computed) {
        throw new ForbiddenException(S19_REASON_CODES.COMPUTED_METRIC_VALUE_REQUIRED);
      }

      resultValue = computed.value;
      inputCount = computed.inputCount;
      inputRecordReferences = computed.inputRecordReferences;
      calculationTrace = computed.calculationTrace;
    }

    const integrityHash = hashCalculationIntegrity({
      metricVersionId: dto.metricVersionId,
      periodStart: dto.periodStart.toISOString(),
      periodEnd: dto.periodEnd.toISOString(),
      inputCount,
      excludedRecords,
      calculationTrace,
      resultValue,
      softwareVersion,
    });

    return this.prisma.metricCalculationRun.create({
      data: {
        metricVersionId: dto.metricVersionId,
        periodStart: dto.periodStart,
        periodEnd: dto.periodEnd,
        inputRecordReferences: inputRecordReferences as Prisma.InputJsonValue,
        inputCount,
        excludedRecords: excludedRecords as Prisma.InputJsonValue,
        exclusionReasons: exclusionReasons as Prisma.InputJsonValue,
        calculationTrace: calculationTrace as Prisma.InputJsonValue,
        resultValue,
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
