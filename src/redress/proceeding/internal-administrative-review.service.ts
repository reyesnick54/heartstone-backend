import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import {
  InternalAdministrativeReviewGround,
  ReviewProceedingKind,
  ReviewProceedingStatus,
} from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { RedressBoundaryService } from '../common/redress-boundary.service';
import {
  INTERNAL_ADMINISTRATIVE_REVIEW_NUMBER_PREFIX,
  REDRESS_REASON_CODES,
} from '../redress.constants';
import { ReviewRecordSnapshotService } from '../snapshot/review-record-snapshot.service';

export interface OpenInternalReviewInput {
  challengedDecisionId: string;
  functionAuthorityRecordId: string;
  jurisdictionId: string;
  requiredReviewerLevel: string;
  configurationReference?: string;
  issues: {
    ground: InternalAdministrativeReviewGround;
    description: string;
  }[];
}

@Injectable()
export class InternalAdministrativeReviewService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly boundary: RedressBoundaryService,
    private readonly snapshotService: ReviewRecordSnapshotService,
  ) {}

  async openReview(input: OpenInternalReviewInput) {
    this.boundary.assertOpeningReviewDoesNotAlterDecision();

    if (input.issues.length === 0) {
      throw new BadRequestException('Internal administrative review requires at least one issue');
    }

    const decision = await this.prisma.governmentDecision.findUnique({
      where: { id: input.challengedDecisionId },
    });

    if (!decision) {
      throw new NotFoundException(REDRESS_REASON_CODES.DECISION_NOT_FOUND);
    }

    if (!decision.caseId) {
      throw new BadRequestException('Challenged decision must be linked to a case');
    }

    const priorStatus = decision.decisionStatus;
    const snapshot = await this.snapshotService.createSnapshot(input.challengedDecisionId);
    const reviewNumber = await this.generateReviewNumber();

    const review = await this.prisma.internalAdministrativeReview.create({
      data: {
        reviewNumber,
        challengedDecisionId: input.challengedDecisionId,
        caseId: decision.caseId,
        reviewRecordSnapshotId: snapshot.id,
        functionAuthorityRecordId: input.functionAuthorityRecordId,
        jurisdictionId: input.jurisdictionId,
        requiredReviewerLevel: input.requiredReviewerLevel,
        configurationReference: input.configurationReference,
        status: ReviewProceedingStatus.OPEN,
        issues: {
          create: input.issues.map((issue) => ({
            ground: issue.ground,
            description: issue.description,
          })),
        },
      },
      include: {
        reviewRecordSnapshot: true,
        issues: true,
      },
    });

    const unchanged = await this.prisma.governmentDecision.findUnique({
      where: { id: input.challengedDecisionId },
      select: { decisionStatus: true, outcome: true },
    });

    if (unchanged?.decisionStatus !== priorStatus) {
      throw new BadRequestException(REDRESS_REASON_CODES.OPENING_REVIEW_DOES_NOT_ALTER_DECISION);
    }

    return review;
  }

  proceedingKind(): ReviewProceedingKind {
    return ReviewProceedingKind.INTERNAL_ADMINISTRATIVE;
  }

  private async generateReviewNumber(): Promise<string> {
    const count = await this.prisma.internalAdministrativeReview.count();
    return `${INTERNAL_ADMINISTRATIVE_REVIEW_NUMBER_PREFIX}-${String(count + 1).padStart(8, '0')}`;
  }
}
