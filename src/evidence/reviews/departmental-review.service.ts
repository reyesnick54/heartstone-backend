import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import {
  AuthorityActionType,
  AuthorityEvaluationOutcome,
  DepartmentalReviewStatus,
} from '@prisma/client';

import { AuthorityEvaluationService } from '../../authority/evaluation/authority-evaluation.service';
import { PrismaService } from '../../database/prisma.service';

export interface CreateDepartmentalReviewInput {
  caseId: string;
  departmentId: string;
  reviewerIdentityId: string;
  reviewerOfficeholderId: string;
  reviewQuestion: string;
  functionAuthorityRecordId: string;
  evidenceRecordIds?: string[];
  findings?: string;
  limitations?: string;
  recommendationIfPermitted?: string;
}

export interface CompleteDepartmentalReviewInput {
  reviewId: string;
  reviewerIdentityId: string;
  reviewerOfficeholderId: string;
  findings: string;
  limitations?: string;
  recommendationIfPermitted?: string;
  evidenceRecordIds?: string[];
}

@Injectable()
export class DepartmentalReviewService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authorityEvaluation: AuthorityEvaluationService,
  ) {}

  async createDraft(input: CreateDepartmentalReviewInput) {
    await this.assertCaseExists(input.caseId);

    const latestVersion = await this.prisma.departmentalReviewRecord.findFirst({
      where: { caseId: input.caseId, departmentId: input.departmentId },
      orderBy: { reviewVersion: 'desc' },
    });

    const reviewVersion = (latestVersion?.reviewVersion ?? 0) + 1;

    return this.prisma.departmentalReviewRecord.create({
      data: {
        caseId: input.caseId,
        departmentId: input.departmentId,
        reviewerIdentityId: input.reviewerIdentityId,
        reviewerOfficeholderId: input.reviewerOfficeholderId,
        reviewQuestion: input.reviewQuestion,
        functionAuthorityRecordId: input.functionAuthorityRecordId,
        reviewVersion,
        findings: input.findings ?? '',
        limitations: input.limitations,
        recommendationIfPermitted: input.recommendationIfPermitted,
        status: DepartmentalReviewStatus.DRAFT,
        evidenceConsidered: input.evidenceRecordIds
          ? {
              create: input.evidenceRecordIds.map((evidenceRecordId) => ({
                evidenceRecordId,
              })),
            }
          : undefined,
      },
      include: { evidenceConsidered: true, department: true },
    });
  }

  async completeReview(input: CompleteDepartmentalReviewInput) {
    const review = await this.prisma.departmentalReviewRecord.findUnique({
      where: { id: input.reviewId },
      include: { evidenceConsidered: true },
    });

    if (!review) {
      throw new NotFoundException('Departmental review record not found');
    }

    if (
      review.reviewerIdentityId !== input.reviewerIdentityId ||
      review.reviewerOfficeholderId !== input.reviewerOfficeholderId
    ) {
      throw new ForbiddenException('Departmental review completion must remain attributable to the assigned reviewer');
    }

    const evaluation = await this.authorityEvaluation.evaluate({
      identityId: input.reviewerIdentityId,
      officeholderId: input.reviewerOfficeholderId,
      functionAuthorityRecordId: review.functionAuthorityRecordId,
      action: AuthorityActionType.REVIEW,
      evidenceProvided: input.evidenceRecordIds ?? review.evidenceConsidered.map((e) => e.evidenceRecordId),
    });

    if (evaluation.outcome !== AuthorityEvaluationOutcome.ALLOW) {
      throw new ForbiddenException(
        'Consequential departmental review completion requires explicit authority evaluation; case assignment is insufficient',
      );
    }

    return this.prisma.departmentalReviewRecord.update({
      where: { id: input.reviewId },
      data: {
        findings: input.findings,
        limitations: input.limitations,
        recommendationIfPermitted: input.recommendationIfPermitted,
        authorityEvaluationRecordId: evaluation.evaluationId,
        status: DepartmentalReviewStatus.COMPLETED,
        completedAt: new Date(),
      },
      include: { department: true, evidenceConsidered: true },
    });
  }

  async listByCase(caseId: string) {
    return this.prisma.departmentalReviewRecord.findMany({
      where: { caseId },
      include: { department: true, evidenceConsidered: true },
      orderBy: [{ departmentId: 'asc' }, { reviewVersion: 'asc' }],
    });
  }

  async getHistoricalVersions(caseId: string, departmentId: string) {
    return this.prisma.departmentalReviewRecord.findMany({
      where: { caseId, departmentId },
      orderBy: { reviewVersion: 'asc' },
    });
  }

  assertDepartmentsMayDisagree(
    reviews: { departmentId: string; findings: string; status: DepartmentalReviewStatus }[],
  ) {
    const completed = reviews.filter((r) => r.status === DepartmentalReviewStatus.COMPLETED);
    const uniqueFindings = new Set(completed.map((r) => `${r.departmentId}:${r.findings}`));
    if (completed.length > 1 && uniqueFindings.size < completed.length) {
      throw new BadRequestException('Departmental reviews must not be merged into false unanimity');
    }
  }

  private async assertCaseExists(caseId: string) {
    const caseRecord = await this.prisma.case.findUnique({ where: { id: caseId } });
    if (!caseRecord) {
      throw new NotFoundException(`Case "${caseId}" was not found`);
    }
  }
}
