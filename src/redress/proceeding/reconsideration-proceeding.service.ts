import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ReconsiderationReviewStandard, ReviewProceedingKind } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import {
  RECONSIDERATION_PROCEEDING_NUMBER_PREFIX,
  REDRESS_REASON_CODES,
} from '../redress.constants';
import { RedressBoundaryService } from '../common/redress-boundary.service';
import { ReviewRecordSnapshotService } from '../snapshot/review-record-snapshot.service';

export interface OpenReconsiderationInput {
  challengedDecisionId: string;
  reviewStandard: ReconsiderationReviewStandard;
  functionAuthorityRecordId: string;
  jurisdictionId: string;
  requiredReviewerLevel: string;
  configurationReference?: string;
}

@Injectable()
export class ReconsiderationProceedingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly boundary: RedressBoundaryService,
    private readonly snapshotService: ReviewRecordSnapshotService,
  ) {}

  async openProceeding(input: OpenReconsiderationInput) {
    this.boundary.assertReviewStandardConfigured(input.reviewStandard);
    this.boundary.assertOpeningReviewDoesNotAlterDecision();

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
    const proceedingNumber = await this.generateProceedingNumber();

    const proceeding = await this.prisma.reconsiderationProceeding.create({
      data: {
        proceedingNumber,
        challengedDecisionId: input.challengedDecisionId,
        caseId: decision.caseId,
        reviewRecordSnapshotId: snapshot.id,
        reviewStandard: input.reviewStandard,
        functionAuthorityRecordId: input.functionAuthorityRecordId,
        jurisdictionId: input.jurisdictionId,
        requiredReviewerLevel: input.requiredReviewerLevel,
        configurationReference: input.configurationReference,
      },
      include: {
        reviewRecordSnapshot: true,
      },
    });

    const unchanged = await this.prisma.governmentDecision.findUnique({
      where: { id: input.challengedDecisionId },
      select: { decisionStatus: true, outcome: true },
    });

    if (unchanged?.decisionStatus !== priorStatus) {
      throw new BadRequestException(REDRESS_REASON_CODES.OPENING_REVIEW_DOES_NOT_ALTER_DECISION);
    }

    return proceeding;
  }

  proceedingKind(): ReviewProceedingKind {
    return ReviewProceedingKind.RECONSIDERATION;
  }

  private async generateProceedingNumber(): Promise<string> {
    const count = await this.prisma.reconsiderationProceeding.count();
    return `${RECONSIDERATION_PROCEEDING_NUMBER_PREFIX}-${String(count + 1).padStart(8, '0')}`;
  }
}
