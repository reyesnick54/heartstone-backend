import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { IdentityType, ReviewProceedingKind, ReviewRecommendationType } from '@prisma/client';

import { RedressBoundaryService } from '../common/redress-boundary.service';
import { ReviewRecommendationService } from './review-recommendation.service';

describe('ReviewRecommendationService', () => {
  const prisma = {
    reviewRecommendation: { create: jest.fn(), count: jest.fn() },
  };
  const boundary = new RedressBoundaryService();
  let service: ReviewRecommendationService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new ReviewRecommendationService(prisma as never, boundary);
    prisma.reviewRecommendation.count.mockResolvedValue(0);
    prisma.reviewRecommendation.create.mockImplementation(
      ({ data }: { data: Record<string, unknown> }) => data,
    );
  });

  it('keeps AI recommendation non-final', async () => {
    const recommendation = await service.recordRecommendation({
      proceedingKind: ReviewProceedingKind.RECONSIDERATION,
      reconsiderationProceedingId: 'proceeding-1',
      recommendationType: ReviewRecommendationType.OTHER_NON_FINAL,
      contentReference: 'ref/ai-draft',
      recommendedByIdentityId: 'service-1',
      recommendedByIdentityType: IdentityType.SERVICE,
      aiGenerated: true,
    });

    expect(recommendation.isFinal).toBe(false);
    expect(recommendation.aiGenerated).toBe(true);
  });

  it('rejects client attempt to mark recommendation final', async () => {
    await expect(
      service.recordRecommendation({
        proceedingKind: ReviewProceedingKind.INTERNAL_ADMINISTRATIVE,
        internalAdministrativeReviewId: 'review-1',
        recommendationType: ReviewRecommendationType.AFFIRM,
        contentReference: 'ref/staff',
        recommendedByIdentityId: 'reviewer-1',
        recommendedByIdentityType: IdentityType.INDIVIDUAL,
        isFinal: true,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('blocks AI service identity from issuing disposition-like recommendation', async () => {
    await expect(
      service.recordRecommendation({
        proceedingKind: ReviewProceedingKind.RECONSIDERATION,
        reconsiderationProceedingId: 'proceeding-1',
        recommendationType: ReviewRecommendationType.SET_ASIDE,
        contentReference: 'ref/ai',
        recommendedByIdentityId: 'service-1',
        recommendedByIdentityType: IdentityType.SERVICE,
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});
