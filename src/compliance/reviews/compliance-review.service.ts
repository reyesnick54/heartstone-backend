import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { ComplianceReviewStatus, ComplianceSubmissionStatus, Prisma } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { ComplianceBoundaryService } from '../common/compliance-boundary.service';
import { COMPLIANCE_REVIEW_NUMBER_PREFIX } from '../compliance.constants';
import { FinalizeComplianceReviewDto } from '../dto/finalize-compliance-review.dto';

@Injectable()
export class ComplianceReviewService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly boundary: ComplianceBoundaryService,
  ) {}

  async openReview(
    reviewerIdentityId: string,
    submissionId: string,
    submissionVersionId: string,
    criteria: unknown[] = [],
  ) {
    const submission = await this.prisma.complianceSubmission.findUnique({
      where: { id: submissionId },
      include: { continuingObligation: true },
    });
    if (!submission) {
      throw new NotFoundException(`ComplianceSubmission ${submissionId} not found`);
    }

    const version = await this.prisma.complianceSubmissionVersion.findUnique({
      where: { id: submissionVersionId },
    });
    if (version?.submissionId !== submissionId) {
      throw new NotFoundException('Submission version not found for submission');
    }

    const count = await this.prisma.complianceReview.count();
    const reviewNumber = `${COMPLIANCE_REVIEW_NUMBER_PREFIX}-${String(count + 1).padStart(8, '0')}`;

    const review = await this.prisma.complianceReview.create({
      data: {
        reviewNumber,
        reviewerIdentityId,
        continuingObligationId: submission.continuingObligationId,
        complianceSubmissionId: submissionId,
        submissionVersionId,
        criteria: criteria as Prisma.InputJsonValue,
        status: ComplianceReviewStatus.PENDING,
      },
    });

    await this.prisma.complianceSubmission.update({
      where: { id: submissionId },
      data: { status: ComplianceSubmissionStatus.UNDER_REVIEW },
    });

    return review;
  }

  async finalizeReview(
    reviewerIdentityId: string,
    dto: FinalizeComplianceReviewDto,
    options?: { isAiActor?: boolean },
  ) {
    this.boundary.assertAiCannotFinalize('FINALIZE_REVIEW', options?.isAiActor);
    this.boundary.assertAuthorizedReviewerPresent(dto.reviewerOfficeholderId, dto.status);

    if (
      dto.status === ('VERIFIED_COMPLIANT' as ComplianceReviewStatus) ||
      dto.status === ('LEGALLY_COMPLIANT' as ComplianceReviewStatus)
    ) {
      throw new BadRequestException('Compliance review may not use unauthorized compliance determination statuses');
    }

    const review = await this.prisma.complianceReview.findUnique({
      where: { id: dto.reviewId },
    });
    if (!review) {
      throw new NotFoundException(`ComplianceReview ${dto.reviewId} not found`);
    }

    if (review.reviewerIdentityId !== reviewerIdentityId && !options?.isAiActor) {
      throw new ForbiddenException('Only the assigned reviewer may finalize this compliance review');
    }

    if (options?.isAiActor) {
      throw new ForbiddenException('AI assistance cannot finalize substantive compliance review');
    }

    const findings = dto.findings ?? [];
    const unresolvedIssues = dto.unresolvedIssues ?? [];

    if (dto.status === ComplianceReviewStatus.MORE_INFORMATION_REQUIRED) {
      if (findings.length === 0 && !dto.deficiencySummary) {
        return this.prisma.complianceReview.update({
          where: { id: dto.reviewId },
          data: {
            status: ComplianceReviewStatus.MORE_INFORMATION_REQUIRED,
            findings: [{ note: 'Additional information required; no findings invented' }] as Prisma.InputJsonValue,
            unresolvedIssues: (unresolvedIssues.length
              ? unresolvedIssues
              : [{ issue: 'Insufficient information to assess stated criteria' }]) as Prisma.InputJsonValue,
            reviewDate: new Date(),
            reviewerOfficeholderId: dto.reviewerOfficeholderId,
            finalizedAt: new Date(),
            isAiProposed: false,
          },
        });
      }
    }

    const expiredEvidence = await this.findExpiredEvidenceForObligation(review.continuingObligationId);
    const mergedUnresolved = [
      ...unresolvedIssues,
      ...expiredEvidence.map((e) => ({
        type: 'EXPIRED_EVIDENCE_VISIBLE',
        evidenceRecordId: e.id,
        validUntil: e.validUntil,
      })),
    ];

    return this.prisma.complianceReview.update({
      where: { id: dto.reviewId },
      data: {
        status: dto.status,
        findings: findings as Prisma.InputJsonValue,
        unresolvedIssues: mergedUnresolved as Prisma.InputJsonValue,
        reviewDate: new Date(),
        reviewerOfficeholderId: dto.reviewerOfficeholderId,
        finalizedAt: new Date(),
        isAiProposed: false,
      },
    });
  }

  async proposeAiReviewSummary(reviewId: string, summary: string) {
    const review = await this.prisma.complianceReview.findUnique({ where: { id: reviewId } });
    if (!review) {
      throw new NotFoundException(`ComplianceReview ${reviewId} not found`);
    }

    return this.prisma.complianceReview.update({
      where: { id: reviewId },
      data: {
        findings: [
          ...(Array.isArray(review.findings) ? review.findings : []),
          { aiProposedSummary: summary, nonFinal: true },
        ],
        isAiProposed: true,
        status: ComplianceReviewStatus.IN_REVIEW,
      },
    });
  }

  private async findExpiredEvidenceForObligation(obligationId: string) {
    const links = await this.prisma.obligationEvidenceLink.findMany({
      where: { continuingObligationId: obligationId },
      include: { evidenceRecord: true },
    });

    const now = new Date();
    return links
      .map((l) => l.evidenceRecord)
      .filter((e) => e.validUntil !== null && e.validUntil < now);
  }
}
