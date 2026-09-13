import { Injectable, NotFoundException } from '@nestjs/common';
import {
  ComplianceReviewOutcome,
  ContinuingObligationStatus,
} from '@prisma/client';

import { PrismaService } from '../database/prisma.service';
import { ComplianceBoundaryService } from './compliance-boundary.service';

export interface ReviewComplianceSubmissionInput {
  complianceSubmissionId: string;
  reviewerIdentityId: string;
  reviewerOfficeholderId: string;
  outcome: ComplianceReviewOutcome;
  notes?: string;
}

@Injectable()
export class ComplianceReviewService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly boundary: ComplianceBoundaryService,
  ) {}

  async reviewSubmission(input: ReviewComplianceSubmissionInput) {
    const submission = await this.prisma.complianceSubmission.findUnique({
      where: { id: input.complianceSubmissionId },
      include: { continuingObligation: true },
    });
    if (!submission) {
      throw new NotFoundException(`Compliance submission "${input.complianceSubmissionId}" was not found`);
    }

    this.boundary.assertReviewIsNotSubmission({ treatingReviewAsSubmission: false });

    this.boundary.assertReceiptDoesNotSatisfyObligation({
      receiptOnly: Boolean(submission.receiptAcknowledgedAt),
      obligationSatisfied: input.outcome === ComplianceReviewOutcome.OBLIGATION_SATISFIED,
    });

    const review = await this.prisma.complianceReview.create({
      data: {
        complianceSubmissionId: input.complianceSubmissionId,
        reviewerIdentityId: input.reviewerIdentityId,
        reviewerOfficeholderId: input.reviewerOfficeholderId,
        outcome: input.outcome,
        reviewedAt: new Date(),
        notes: input.notes,
        obligationSatisfied: input.outcome === ComplianceReviewOutcome.OBLIGATION_SATISFIED,
      },
    });

    if (input.outcome === ComplianceReviewOutcome.OBLIGATION_SATISFIED) {
      await this.prisma.continuingObligation.update({
        where: { id: submission.continuingObligationId },
        data: { status: ContinuingObligationStatus.SATISFIED },
      });
    }

    return review;
  }
}
