import { BadRequestException, Injectable } from '@nestjs/common';
import { IdentityType, ReviewProceedingKind, ReviewRecommendationType } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { REDRESS_REASON_CODES, REVIEW_RECOMMENDATION_NUMBER_PREFIX } from '../redress.constants';
import { RedressBoundaryService } from '../common/redress-boundary.service';

export interface RecordReviewRecommendationInput {
  proceedingKind: ReviewProceedingKind;
  reconsiderationProceedingId?: string;
  internalAdministrativeReviewId?: string;
  recommendationType: ReviewRecommendationType;
  contentReference: string;
  summary?: string;
  recommendedByIdentityId: string;
  recommendedByIdentityType: IdentityType;
  aiGenerated?: boolean;
  isFinal?: boolean;
}

@Injectable()
export class ReviewRecommendationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly boundary: RedressBoundaryService,
  ) {}

  async recordRecommendation(input: RecordReviewRecommendationInput) {
    this.boundary.assertRecommendationNonFinal(input.isFinal);

    this.boundary.assertAiCannotIssueDispositionRecommendation(
      input.recommendedByIdentityType,
      input.recommendationType,
    );

    const recommendationNumber = await this.generateRecommendationNumber();

    const recommendation = await this.prisma.reviewRecommendation.create({
      data: {
        recommendationNumber,
        proceedingKind: input.proceedingKind,
        reconsiderationProceedingId: input.reconsiderationProceedingId,
        internalAdministrativeReviewId: input.internalAdministrativeReviewId,
        recommendationType: input.recommendationType,
        isFinal: false,
        aiGenerated: input.aiGenerated ?? input.recommendedByIdentityType === IdentityType.SERVICE,
        contentReference: input.contentReference,
        summary: input.summary,
        recommendedByIdentityId: input.recommendedByIdentityId,
      },
    });

    if (recommendation.isFinal) {
      throw new BadRequestException(REDRESS_REASON_CODES.RECOMMENDATION_CANNOT_BE_FINAL);
    }

    return recommendation;
  }

  private async generateRecommendationNumber(): Promise<string> {
    const count = await this.prisma.reviewRecommendation.count();
    return `${REVIEW_RECOMMENDATION_NUMBER_PREFIX}-${String(count + 1).padStart(8, '0')}`;
  }
}
