import { Injectable, NotFoundException } from '@nestjs/common';
import {
  type MetricBaseline,
  MetricBaselineMethod,
  MetricBaselineQualityStatus,
  Prisma,
} from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { IntelligenceBoundaryService } from '../common/intelligence-boundary.service';
import { CreateMetricBaselineDto } from '../dto/create-metric-baseline.dto';
import { BASELINE_UNAVAILABLE_VALUE } from '../intelligence.constants';

@Injectable()
export class MetricBaselineService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly boundary: IntelligenceBoundaryService,
  ) {}

  async create(
    dto: CreateMetricBaselineDto,
    approvedByIdentityId?: string,
  ): Promise<MetricBaseline> {
    const version = await this.prisma.metricDefinitionVersion.findUnique({
      where: { id: dto.metricVersionId },
      include: { metricDefinition: true },
    });
    if (!version) {
      throw new NotFoundException(`Metric version ${dto.metricVersionId} not found`);
    }

    const qualityStatus = dto.qualityStatus ?? MetricBaselineQualityStatus.ACCEPTABLE;
    let value = dto.value;

    if (qualityStatus === MetricBaselineQualityStatus.BASELINE_UNAVAILABLE) {
      value = BASELINE_UNAVAILABLE_VALUE;
    }

    this.boundary.assertBaselineDisclosedWhenUnavailable(
      version.metricDefinition.baselineRequired,
      qualityStatus,
      value,
    );

    return this.prisma.metricBaseline.create({
      data: {
        metricVersionId: dto.metricVersionId,
        periodStart: dto.periodStart,
        periodEnd: dto.periodEnd,
        sourceRecords: (dto.sourceRecords ?? []) as Prisma.InputJsonValue,
        value,
        method: dto.method ?? MetricBaselineMethod.HISTORICAL_PERIOD,
        qualityStatus,
        limitations: dto.limitations,
        approvedByIdentityId,
        approvedAt: approvedByIdentityId ? new Date() : undefined,
      },
    });
  }

  async recordUnavailable(
    metricVersionId: string,
    periodStart: Date,
    periodEnd: Date,
  ): Promise<MetricBaseline> {
    return this.create({
      metricVersionId,
      periodStart,
      periodEnd,
      method: MetricBaselineMethod.BASELINE_UNAVAILABLE,
      qualityStatus: MetricBaselineQualityStatus.BASELINE_UNAVAILABLE,
      value: BASELINE_UNAVAILABLE_VALUE,
      limitations: 'Reliable baseline absent; disclosed as BASELINE_UNAVAILABLE',
    });
  }
}
