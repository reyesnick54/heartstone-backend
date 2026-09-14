import { Injectable, NotFoundException } from '@nestjs/common';
import {
  Prisma,
  ReportClaimStatus,
  ReportDefinitionStatus,
  ReportGenerationRunStatus,
} from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { IntelligenceBoundaryService } from '../common/intelligence-boundary.service';
import { IntelligenceSafeHaltService } from '../common/intelligence-safe-halt.service';
import { REPORT_GENERATION_REFERENCE_PREFIX } from '../intelligence.constants';

export interface CreateReportDefinitionInput {
  institutionId: string;
  code: string;
  name: string;
  description?: string;
}

export interface StartReportGenerationInput {
  reportDefinitionId: string;
  institutionId: string;
  inputsSnapshot?: Record<string, unknown>;
}

export interface CreateReportClaimInput {
  reportGenerationRunId: string;
  claimStatement: string;
  claimedValue?: string;
}

@Injectable()
export class ReportService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly boundary: IntelligenceBoundaryService,
    private readonly safeHalt: IntelligenceSafeHaltService,
  ) {}

  private generateReference(): string {
    return `${REPORT_GENERATION_REFERENCE_PREFIX}-${String(Date.now())}`;
  }

  async createDefinition(input: CreateReportDefinitionInput) {
    return this.prisma.reportDefinition.create({
      data: {
        institutionId: input.institutionId,
        code: input.code,
        name: input.name,
        description: input.description,
        status: ReportDefinitionStatus.DRAFT,
      },
    });
  }

  async startGeneration(input: StartReportGenerationInput) {
    return this.prisma.reportGenerationRun.create({
      data: {
        reportDefinitionId: input.reportDefinitionId,
        institutionId: input.institutionId,
        runReference: this.generateReference(),
        status: ReportGenerationRunStatus.GENERATING,
        startedAt: new Date(),
        inputsSnapshot: (input.inputsSnapshot ?? {}) as Prisma.InputJsonValue,
      },
    });
  }

  async createClaim(input: CreateReportClaimInput) {
    this.boundary.assertUnverifiedReportClaimNotPublishedFact(ReportClaimStatus.DRAFT);
    return this.prisma.reportClaim.create({
      data: {
        reportGenerationRunId: input.reportGenerationRunId,
        claimReference: `RCL-${String(Date.now())}`,
        claimStatement: input.claimStatement,
        claimedValue: input.claimedValue,
        status: ReportClaimStatus.DRAFT,
      },
    });
  }

  async approveReportRun(runId: string, approverIdentityId: string) {
    this.boundary.assertReportApprovalNotAuthorityAct();
    const run = await this.prisma.reportGenerationRun.findUnique({ where: { id: runId } });
    if (!run) {
      throw new NotFoundException(`Report generation run ${runId} not found`);
    }
    return this.prisma.reportApproval.create({
      data: {
        reportGenerationRunId: runId,
        approverIdentityId,
      },
    });
  }

  async publishReport(runId: string, publicationReference: string, audience?: string) {
    const run = await this.prisma.reportGenerationRun.findUnique({
      where: { id: runId },
      include: { claims: true },
    });
    if (!run) {
      throw new NotFoundException(`Report generation run ${runId} not found`);
    }
    this.safeHalt.assertConsequentialPathAllowed({
      reportGenerationStatus: run.status,
      consequential: true,
    });
    this.boundary.assertReportPublicationNotDecisionNotice();
    for (const claim of run.claims) {
      this.boundary.assertReportClaimNotVerifiedWithoutReview(claim.status);
    }
    return this.prisma.reportPublication.create({
      data: {
        reportGenerationRunId: runId,
        publicationReference,
        audience,
      },
    });
  }
}
