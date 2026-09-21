import { BadRequestException, Injectable } from '@nestjs/common';
import {
  AnalysisFunctionType,
  AnalysisRequestStatus,
  AnalysisRunStatus,
  AnalysisSourceStatus,
  Prisma,
} from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { computeAnalysisReplayHash } from '../common/analysis-replay-hash.util';
import { IntelligenceBoundaryService } from '../common/intelligence-boundary.service';
import {
  ANALYSIS_OUTPUT_DISCLAIMER,
  ANALYSIS_REQUEST_NUMBER_PREFIX,
  ANALYSIS_RUN_NUMBER_PREFIX,
} from '../intelligence.constants';

export interface CreateAnalysisRequestInput {
  question: string;
  functionType: AnalysisFunctionType;
  requestedByIdentityId: string;
  institutionId?: string;
  caseId?: string;
}

export interface StartAnalysisRunInput {
  requestId: string;
  method: string;
  assumptions: Prisma.InputJsonValue;
  limitations: string;
  executedByIdentityId?: string;
  conflictResolutionMethod?: string;
}

export interface RecordAnalysisSourceInput {
  runId: string;
  sourceReference: string;
  sourceLabel: string;
  sourceStatus: AnalysisSourceStatus;
  exactValue: Prisma.InputJsonValue;
  retrievedAt?: Date;
  conflictGroupId?: string;
  preservedConflict?: boolean;
}

export interface RecordAnalysisFindingInput {
  runId: string;
  findingText: string;
  conclusionScope: string;
  isDecisionLike?: boolean;
}

export interface RecordAnalysisOptionInput {
  runId: string;
  optionLabel: string;
  description: string;
  tradeoffs?: string;
}

export interface RecordAnalysisUncertaintyInput {
  runId: string;
  uncertaintyText: string;
  severity?: string;
}

export interface RecordAnalysisHumanReviewInput {
  runId: string;
  reviewerIdentityId: string;
  reviewNotes?: string;
  professionalReviewRequired?: boolean;
}

@Injectable()
export class AnalysisService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly boundary: IntelligenceBoundaryService,
  ) {}

  async findRequestById(requestId: string) {
    const request = await this.prisma.analysisRequest.findUnique({
      where: { id: requestId },
    });
    if (!request) {
      throw new BadRequestException('Analysis request not found');
    }
    return request;
  }

  async findRunById(runId: string) {
    const run = await this.prisma.analysisRun.findUnique({
      where: { id: runId },
      include: {
        request: {
          include: {
            case: true,
          },
        },
      },
    });
    if (!run) {
      throw new BadRequestException('Analysis run not found');
    }
    return run;
  }

  async createRequest(input: CreateAnalysisRequestInput) {
    const count = await this.prisma.analysisRequest.count();
    const requestNumber = `${ANALYSIS_REQUEST_NUMBER_PREFIX}-${String(count + 1).padStart(8, '0')}`;

    return this.prisma.analysisRequest.create({
      data: {
        requestNumber,
        question: input.question,
        functionType: input.functionType,
        requestedByIdentityId: input.requestedByIdentityId,
        institutionId: input.institutionId,
        caseId: input.caseId,
        status: AnalysisRequestStatus.DRAFT,
      },
    });
  }

  async startRun(input: StartAnalysisRunInput) {
    this.boundary.rejectAveragedConflictResolution(input.conflictResolutionMethod);

    const request = await this.prisma.analysisRequest.findUnique({
      where: { id: input.requestId },
    });
    if (!request) {
      throw new BadRequestException('Analysis request not found');
    }

    const count = await this.prisma.analysisRun.count();
    const runNumber = `${ANALYSIS_RUN_NUMBER_PREFIX}-${String(count + 1).padStart(8, '0')}`;

    const run = await this.prisma.analysisRun.create({
      data: {
        runNumber,
        requestId: input.requestId,
        method: input.method,
        assumptions: input.assumptions,
        limitations: input.limitations,
        executedByIdentityId: input.executedByIdentityId,
        status: AnalysisRunStatus.RUNNING,
        startedAt: new Date(),
      },
    });

    await this.prisma.analysisRequest.update({
      where: { id: input.requestId },
      data: { status: AnalysisRequestStatus.IN_PROGRESS },
    });

    return run;
  }

  async recordSource(input: RecordAnalysisSourceInput) {
    if (input.sourceStatus === AnalysisSourceStatus.STALE && !input.retrievedAt) {
      throw new BadRequestException('Stale sources must record retrieval timing');
    }

    return this.prisma.analysisSource.create({
      data: {
        runId: input.runId,
        sourceReference: input.sourceReference,
        sourceLabel: input.sourceLabel,
        sourceStatus: input.sourceStatus,
        exactValue: input.exactValue,
        retrievedAt: input.retrievedAt,
        stalenessNotedAt:
          input.sourceStatus === AnalysisSourceStatus.STALE ? new Date() : undefined,
        conflictGroupId: input.conflictGroupId,
        preservedConflict: input.preservedConflict ?? Boolean(input.conflictGroupId),
      },
    });
  }

  async recordFinding(input: RecordAnalysisFindingInput) {
    this.boundary.assertAnalysisNotDecision({
      isDecisionLike: input.isDecisionLike,
      presentationText: input.findingText,
    });

    return this.prisma.analysisFinding.create({
      data: {
        runId: input.runId,
        findingText: `${ANALYSIS_OUTPUT_DISCLAIMER} ${input.findingText}`,
        conclusionScope: input.conclusionScope,
        isDecisionLike: false,
      },
    });
  }

  async recordOption(input: RecordAnalysisOptionInput) {
    this.boundary.assertAnalysisNotDecision({ presentationText: input.description });

    return this.prisma.analysisOption.create({
      data: {
        runId: input.runId,
        optionLabel: input.optionLabel,
        description: input.description,
        tradeoffs: input.tradeoffs,
      },
    });
  }

  async recordUncertainty(input: RecordAnalysisUncertaintyInput) {
    return this.prisma.analysisUncertainty.create({
      data: {
        runId: input.runId,
        uncertaintyText: input.uncertaintyText,
        severity: input.severity,
      },
    });
  }

  async recordHumanReview(input: RecordAnalysisHumanReviewInput) {
    this.boundary.assertHumanReviewerPresent(input.reviewerIdentityId);

    return this.prisma.analysisHumanReview.create({
      data: {
        runId: input.runId,
        reviewerIdentityId: input.reviewerIdentityId,
        reviewNotes: input.reviewNotes,
        professionalReviewRequired: input.professionalReviewRequired ?? false,
      },
    });
  }

  async completeRun(runId: string) {
    const run = await this.prisma.analysisRun.findUnique({
      where: { id: runId },
      include: {
        sources: true,
        findings: true,
        options: true,
        uncertainties: true,
        humanReviews: true,
        request: true,
      },
    });
    if (!run) {
      throw new BadRequestException('Analysis run not found');
    }

    const conflictSources = run.sources.flatMap((s) => {
      if (!s.conflictGroupId) {
        return [];
      }
      return [
        {
          conflictGroupId: s.conflictGroupId,
          exactValue: s.exactValue,
          sourceReference: s.sourceReference,
        },
      ];
    });
    this.boundary.assertSourceConflictsPreserved(conflictSources);

    const replayHash = computeAnalysisReplayHash({
      question: run.request.question,
      method: run.method,
      assumptions: run.assumptions,
      limitations: run.limitations,
      sources: run.sources,
      findings: run.findings,
      options: run.options,
      uncertainties: run.uncertainties,
      humanReviews: run.humanReviews.map((r) => ({
        reviewerIdentityId: r.reviewerIdentityId,
        reviewedAt: r.reviewedAt,
      })),
    });

    const updated = await this.prisma.analysisRun.update({
      where: { id: runId },
      data: {
        status: AnalysisRunStatus.COMPLETED,
        completedAt: new Date(),
        outputReplayHash: replayHash,
      },
    });

    await this.prisma.analysisRequest.update({
      where: { id: run.requestId },
      data: { status: AnalysisRequestStatus.COMPLETED },
    });

    return updated;
  }

  async getReplayableOutput(runId: string) {
    const run = await this.prisma.analysisRun.findUnique({
      where: { id: runId },
      include: {
        sources: true,
        findings: true,
        options: true,
        uncertainties: true,
        humanReviews: { include: { reviewer: true } },
        request: true,
      },
    });
    if (!run) {
      throw new BadRequestException('Analysis run not found');
    }

    const payload = {
      question: run.request.question,
      method: run.method,
      assumptions: run.assumptions,
      limitations: run.limitations,
      sources: run.sources,
      findings: run.findings,
      options: run.options,
      uncertainties: run.uncertainties,
      humanReviews: run.humanReviews,
      outputClassification: run.request.outputClassification,
      disclaimer: ANALYSIS_OUTPUT_DISCLAIMER,
      outputReplayHash: run.outputReplayHash,
    };

    const computedHash = computeAnalysisReplayHash({
      question: run.request.question,
      method: run.method,
      assumptions: run.assumptions,
      limitations: run.limitations,
      sources: run.sources,
      findings: run.findings,
      options: run.options,
      uncertainties: run.uncertainties,
      humanReviews: run.humanReviews.map((r) => ({
        reviewerIdentityId: r.reviewerIdentityId,
        reviewedAt: r.reviewedAt,
      })),
    });

    return {
      ...payload,
      replayVerified: run.outputReplayHash === computedHash,
    };
  }
}
