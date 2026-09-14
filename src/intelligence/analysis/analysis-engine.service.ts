import { Injectable, NotFoundException } from '@nestjs/common';
import { AnalysisRequestStatus, AnalysisRunStatus, Prisma } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { IntelligenceBoundaryService } from '../common/intelligence-boundary.service';
import { IntelligenceSafeHaltService } from '../common/intelligence-safe-halt.service';
import {
  ANALYSIS_REQUEST_REFERENCE_PREFIX,
  ANALYSIS_RUN_REFERENCE_PREFIX,
} from '../intelligence.constants';

export interface CreateAnalysisRequestInput {
  institutionId: string;
  caseId?: string;
  requestType: string;
  requestedByIdentityId: string;
  scope?: string;
  limitations?: string;
}

export interface StartAnalysisRunInput {
  analysisRequestId: string;
  institutionId: string;
  methodology?: string;
  inputsSnapshot?: Record<string, unknown>;
}

@Injectable()
export class AnalysisEngineService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly boundary: IntelligenceBoundaryService,
    private readonly safeHalt: IntelligenceSafeHaltService,
  ) {}

  private generateRequestReference(): string {
    return `${ANALYSIS_REQUEST_REFERENCE_PREFIX}-${String(Date.now())}`;
  }

  private generateRunReference(): string {
    return `${ANALYSIS_RUN_REFERENCE_PREFIX}-${String(Date.now())}`;
  }

  async createRequest(input: CreateAnalysisRequestInput) {
    this.boundary.assertAnalysisRequestNotDecisionRequest();
    this.boundary.assertCrossCaseRetrievalBlocked(input.caseId, input.caseId);
    return this.prisma.analysisRequest.create({
      data: {
        institutionId: input.institutionId,
        caseId: input.caseId,
        requestReference: this.generateRequestReference(),
        requestType: input.requestType,
        requestedByIdentityId: input.requestedByIdentityId,
        scope: input.scope,
        limitations: input.limitations,
        status: AnalysisRequestStatus.DRAFT,
      },
    });
  }

  async startRun(input: StartAnalysisRunInput) {
    const request = await this.prisma.analysisRequest.findUnique({
      where: { id: input.analysisRequestId },
    });
    if (!request) {
      throw new NotFoundException(`Analysis request ${input.analysisRequestId} not found`);
    }
    this.boundary.assertInstitutionBoundaryOnRetrieval(request.institutionId, input.institutionId);
    return this.prisma.analysisRun.create({
      data: {
        analysisRequestId: input.analysisRequestId,
        institutionId: input.institutionId,
        runReference: this.generateRunReference(),
        status: AnalysisRunStatus.RUNNING,
        startedAt: new Date(),
        methodology: input.methodology,
        inputsSnapshot: (input.inputsSnapshot ?? {}) as Prisma.InputJsonValue,
      },
    });
  }

  async recordFinding(
    analysisRunId: string,
    finding: { findingType: string; title: string; description: string; severity?: string },
  ) {
    this.boundary.assertAnalysisFindingNotFinalDetermination();
    this.boundary.assertCorrelationNotCausation();
    return this.prisma.analysisFinding.create({
      data: {
        analysisRunId,
        findingType: finding.findingType,
        title: finding.title,
        description: finding.description,
        severity: finding.severity,
      },
    });
  }

  async recordOption(
    analysisRunId: string,
    option: { optionLabel: string; description: string; tradeoffs?: string },
  ) {
    this.boundary.assertAnalysisOptionNotDecision();
    return this.prisma.analysisOption.create({
      data: {
        analysisRunId,
        optionLabel: option.optionLabel,
        description: option.description,
        tradeoffs: option.tradeoffs,
      },
    });
  }

  async completeRun(runId: string, consequential = false) {
    const run = await this.prisma.analysisRun.findUnique({ where: { id: runId } });
    if (!run) {
      throw new NotFoundException(`Analysis run ${runId} not found`);
    }
    this.safeHalt.assertConsequentialPathAllowed({
      analysisRunStatus: run.status,
      consequential,
    });
    this.boundary.assertCompletedAnalysisNotFinalOrder();
    return this.prisma.analysisRun.update({
      where: { id: runId },
      data: {
        status: AnalysisRunStatus.COMPLETED,
        completedAt: new Date(),
      },
    });
  }
}
