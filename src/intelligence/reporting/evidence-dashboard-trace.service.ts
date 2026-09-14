import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { TRACE_NUMBER_PREFIX } from '../reporting.constants';

export interface CreateTraceInput {
  sourceRecordType: string;
  sourceRecordId: string;
  evidenceRecordId?: string;
  metricCalculationRunId?: string;
  institutionalMetricClaimId?: string;
  reportingDashboardIndicatorId?: string;
  reportGenerationRunId?: string;
  reportClaimId?: string;
  reportReviewId?: string;
  governmentDecisionId?: string;
  traceSnapshot?: Record<string, unknown>;
}

@Injectable()
export class EvidenceDashboardTraceService {
  constructor(private readonly prisma: PrismaService) {}

  async createTrace(input: CreateTraceInput) {
    const traceNumber = `${TRACE_NUMBER_PREFIX}-${String(Date.now())}`;
    return this.prisma.evidenceDashboardDecisionTrace.create({
      data: {
        traceNumber,
        sourceRecordType: input.sourceRecordType,
        sourceRecordId: input.sourceRecordId,
        evidenceRecordId: input.evidenceRecordId,
        metricCalculationRunId: input.metricCalculationRunId,
        institutionalMetricClaimId: input.institutionalMetricClaimId,
        reportingDashboardIndicatorId: input.reportingDashboardIndicatorId,
        reportGenerationRunId: input.reportGenerationRunId,
        reportClaimId: input.reportClaimId,
        reportReviewId: input.reportReviewId,
        governmentDecisionId: input.governmentDecisionId,
        traceSnapshot: (input.traceSnapshot ?? {}) as Prisma.InputJsonValue,
      },
    });
  }

  async buildFullTraceChain(reportClaimId: string) {
    const claim = await this.prisma.reportClaim.findUnique({
      where: { id: reportClaimId },
      include: {
        institutionalMetricClaim: {
          include: { metricCalculationRun: true },
        },
        reportGenerationRun: {
          include: {
            metricPins: { include: { metricCalculationRun: true } },
            dashboardPins: { include: { reportingDashboardIndicator: true } },
          },
        },
        decisionTraces: true,
      },
    });

    if (!claim) {
      return null;
    }

    const metricRun = claim.institutionalMetricClaim.metricCalculationRun;
    const indicator = claim.reportGenerationRun.dashboardPins[0]?.reportingDashboardIndicator;

    return {
      reportClaimId: claim.id,
      institutionalMetricClaimId: claim.institutionalMetricClaimId,
      metricCalculationRunId: metricRun.id,
      methodologyVersion: metricRun.methodologyVersion,
      dataCutoffAt: metricRun.dataCutoffAt,
      reportingDashboardIndicatorId: indicator?.id,
      dashboardNumber: indicator?.displayValue ?? indicator?.countValue,
      drillDownReferences: indicator?.drillDownReferences,
      traces: claim.decisionTraces,
    };
  }

  async linkDashboardToEvidence(
    reportingDashboardIndicatorId: string,
    evidenceRecordId: string,
    metricCalculationRunId: string,
    institutionalMetricClaimId: string,
  ) {
    const indicator = await this.prisma.reportingDashboardIndicator.findUnique({
      where: { id: reportingDashboardIndicatorId },
    });

    return this.createTrace({
      sourceRecordType: 'ReportingDashboardIndicator',
      sourceRecordId: reportingDashboardIndicatorId,
      evidenceRecordId,
      metricCalculationRunId,
      institutionalMetricClaimId,
      reportingDashboardIndicatorId,
      traceSnapshot: {
        indicatorCode: indicator?.indicatorCode,
        displayValue: indicator?.displayValue,
        countValue: indicator?.countValue,
        drillDownReferences: indicator?.drillDownReferences,
      },
    });
  }
}
