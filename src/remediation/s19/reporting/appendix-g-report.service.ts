import { Injectable, NotFoundException } from '@nestjs/common';

import { PrismaService } from '../../../database/prisma.service';
import { APPENDIX_G_REPORT_VERSION } from '../s19.constants';
import { APPENDIX_G_METRIC_DEFINITIONS } from './appendix-g-report.definitions';
import { ComputedMetricService } from './computed-metric.service';
import { ExecutiveReportScopeService } from './executive-report-scope.service';

export interface AppendixGReportInput {
  institutionId: string;
  periodStart: Date;
  periodEnd: Date;
  actorInstitutionIds: string[];
}

export interface AppendixGReportMetricRow {
  metricCode: string;
  label: string;
  description: string;
  value: string | null;
  inputCount: number;
  provenance: Record<string, unknown> | null;
  unsupported: boolean;
}

export interface AppendixGReportResult {
  institutionId: string;
  periodStart: string;
  periodEnd: string;
  reportVersion: string;
  metrics: AppendixGReportMetricRow[];
}

@Injectable()
export class AppendixGReportService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly computedMetrics: ComputedMetricService,
    private readonly executiveScope: ExecutiveReportScopeService,
  ) {}

  async generate(input: AppendixGReportInput): Promise<AppendixGReportResult> {
    this.executiveScope.assertInstitutionScope({
      targetInstitutionId: input.institutionId,
      actorInstitutionIds: input.actorInstitutionIds,
    });

    const institution = await this.prisma.institution.findUnique({
      where: { id: input.institutionId },
    });
    if (!institution) {
      throw new NotFoundException(`Institution ${input.institutionId} not found`);
    }

    const metrics: AppendixGReportMetricRow[] = [];

    for (const definition of APPENDIX_G_METRIC_DEFINITIONS) {
      const computed = await this.computedMetrics.compute({
        institutionId: input.institutionId,
        metricCode: definition.metricCode,
        periodStart: input.periodStart,
        periodEnd: input.periodEnd,
      });

      metrics.push({
        metricCode: definition.metricCode,
        label: definition.label,
        description: definition.description,
        value: computed?.value ?? null,
        inputCount: computed?.inputCount ?? 0,
        provenance: computed?.calculationTrace ?? null,
        unsupported: computed === null,
      });
    }

    return {
      institutionId: input.institutionId,
      periodStart: input.periodStart.toISOString(),
      periodEnd: input.periodEnd.toISOString(),
      reportVersion: APPENDIX_G_REPORT_VERSION,
      metrics,
    };
  }
}
