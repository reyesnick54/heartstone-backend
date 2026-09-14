import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { IntelligenceBoundaryService } from '../common/intelligence-boundary.service';
import { DECISION_TRACE_REFERENCE_PREFIX } from '../intelligence.constants';

export interface CreateDecisionTraceInput {
  institutionId: string;
  caseId?: string;
  governmentDecisionId?: string;
  officialInstrumentId?: string;
  evidencePacketId?: string;
  evidencePacketVersionId?: string;
  dashboardSnapshotId?: string;
  decisionTrace?: Record<string, unknown>;
  processingTimeBreakdown?: Record<string, unknown>;
}

@Injectable()
export class HistoricalReplayService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly boundary: IntelligenceBoundaryService,
  ) {}

  private generateReference(): string {
    return `${DECISION_TRACE_REFERENCE_PREFIX}-${String(Date.now())}`;
  }

  async createDecisionTrace(input: CreateDecisionTraceInput) {
    this.boundary.assertDecisionTraceNotSubstitutesDecision();
    this.boundary.rejectAnalyticsPatchTargets(input as unknown as Record<string, unknown>);
    return this.prisma.evidenceDashboardDecisionTrace.create({
      data: {
        institutionId: input.institutionId,
        caseId: input.caseId,
        governmentDecisionId: input.governmentDecisionId,
        officialInstrumentId: input.officialInstrumentId,
        evidencePacketId: input.evidencePacketId,
        evidencePacketVersionId: input.evidencePacketVersionId,
        dashboardSnapshotId: input.dashboardSnapshotId,
        traceReference: this.generateReference(),
        decisionTrace: (input.decisionTrace ?? {}) as Prisma.InputJsonValue,
        processingTimeBreakdown: (input.processingTimeBreakdown ?? {}) as Prisma.InputJsonValue,
      },
    });
  }

  async replayTrace(traceReference: string) {
    const trace = await this.prisma.evidenceDashboardDecisionTrace.findUnique({
      where: { traceReference },
    });
    if (!trace) {
      throw new NotFoundException(`Decision trace ${traceReference} not found`);
    }
    this.boundary.assertHistoricalReplayNotLiveDecision();
    return {
      trace,
      replayedAt: new Date(),
      disclaimer:
        'Historical replay reconstructs traceability context and does not substitute live government decisions.',
    };
  }
}
