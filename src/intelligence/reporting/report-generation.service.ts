import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, ReportGenerationRunStatus } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { hashReportContent } from '../common/reporting-hash.util';
import { REPORT_RUN_PREFIX } from '../reporting.constants';

export interface CreateReportGenerationRunInput {
  reportDefinitionVersionId: string;
  initiatedByIdentityId: string;
  dataCutoffAt: Date;
  metricCalculationRunIds: string[];
  reportingDashboardIndicatorIds?: string[];
  reportingDashboardSnapshotIds?: string[];
  institutionalMetricClaimIds: string[];
  evidencePacketVersionIds?: string[];
  sourceVersions?: Record<string, unknown>;
  aiAssistanceRecord?: Record<string, unknown>;
  frozenContent: Record<string, unknown>;
}

@Injectable()
export class ReportGenerationService {
  constructor(private readonly prisma: PrismaService) {}

  async createRun(input: CreateReportGenerationRunInput) {
    const version = await this.prisma.reportDefinitionVersion.findUnique({
      where: { id: input.reportDefinitionVersionId },
    });
    if (!version) {
      throw new NotFoundException(
        `ReportDefinitionVersion "${input.reportDefinitionVersionId}" not found`,
      );
    }

    await this.assertMetricsCalculated(input.metricCalculationRunIds);
    await this.assertClaimsValidAtCutoff(input.institutionalMetricClaimIds, input.dataCutoffAt);

    const runNumber = `${REPORT_RUN_PREFIX}-${String(Date.now())}`;
    const contentHash = hashReportContent(input.frozenContent);

    const run = await this.prisma.$transaction(async (tx) => {
      const created = await tx.reportGenerationRun.create({
        data: {
          runNumber,
          reportDefinitionVersionId: input.reportDefinitionVersionId,
          status: ReportGenerationRunStatus.GENERATED,
          dataCutoffAt: input.dataCutoffAt,
          sourceVersions: (input.sourceVersions ?? {}) as Prisma.InputJsonValue,
          aiAssistanceRecord: (input.aiAssistanceRecord ?? {}) as Prisma.InputJsonValue,
          frozenContent: input.frozenContent as Prisma.InputJsonValue,
          contentHash,
          initiatedByIdentityId: input.initiatedByIdentityId,
          completedAt: new Date(),
        },
      });

      for (const metricId of input.metricCalculationRunIds) {
        await tx.reportGenerationRunMetricPin.create({
          data: { reportGenerationRunId: created.id, metricCalculationRunId: metricId },
        });
      }

      for (const claimId of input.institutionalMetricClaimIds) {
        await tx.reportGenerationRunClaimPin.create({
          data: { reportGenerationRunId: created.id, institutionalMetricClaimId: claimId },
        });
      }

      for (const indicatorId of input.reportingDashboardIndicatorIds ?? []) {
        await tx.reportGenerationRunDashboardPin.create({
          data: { reportGenerationRunId: created.id, reportingDashboardIndicatorId: indicatorId },
        });
      }

      for (const snapshotId of input.reportingDashboardSnapshotIds ?? []) {
        await tx.reportGenerationRunSnapshotPin.create({
          data: { reportGenerationRunId: created.id, reportingDashboardSnapshotId: snapshotId },
        });
      }

      for (const packetVersionId of input.evidencePacketVersionIds ?? []) {
        await tx.reportGenerationRunEvidencePin.create({
          data: { reportGenerationRunId: created.id, evidencePacketVersionId: packetVersionId },
        });
      }

      return created;
    });

    return {
      runId: run.id,
      runNumber: run.runNumber,
      contentHash: run.contentHash,
      dataCutoffAt: run.dataCutoffAt,
    };
  }

  async getImmutablePublishedContent(publicationId: string) {
    const publication = await this.prisma.reportPublication.findUnique({
      where: { id: publicationId },
      include: { reportGenerationRun: true },
    });
    if (!publication) {
      throw new NotFoundException(`ReportPublication "${publicationId}" not found`);
    }

    return {
      frozenContent: publication.frozenContent,
      frozenSnapshotHash: publication.frozenSnapshotHash,
      dataCutoffAt: publication.reportGenerationRun.dataCutoffAt,
      publishedAt: publication.publishedAt,
    };
  }

  private async assertMetricsCalculated(metricIds: string[]): Promise<void> {
    if (metricIds.length === 0) {
      throw new BadRequestException('Report generation requires at least one metric calculation run');
    }

    const runs = await this.prisma.metricCalculationRun.findMany({
      where: { id: { in: metricIds } },
    });

    if (runs.length !== metricIds.length) {
      throw new BadRequestException('One or more metric calculation runs were not found');
    }

    const unsupported = runs.filter((r) => r.status !== 'CALCULATED');
    if (unsupported.length > 0) {
      throw new BadRequestException('Report cannot include unsupported metric calculation runs');
    }
  }

  private async assertClaimsValidAtCutoff(
    claimIds: string[],
    dataCutoffAt: Date,
  ): Promise<void> {
    const claims = await this.prisma.institutionalMetricClaim.findMany({
      where: { id: { in: claimIds } },
    });

    for (const claim of claims) {
      if (claim.validUntil && claim.validUntil < dataCutoffAt) {
        throw new BadRequestException(
          `Institutional metric claim "${claim.claimNumber}" expired before report data cutoff`,
        );
      }
    }
  }
}
