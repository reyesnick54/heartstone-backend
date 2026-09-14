import { ForbiddenException } from '@nestjs/common';
import { IdentityType, ReviewerIndependenceOutcome } from '@prisma/client';

import { RedressBoundaryService } from '../common/redress-boundary.service';
import { ReviewerIndependenceService } from './reviewer-independence.service';

describe('ReviewerIndependenceService', () => {
  const prisma = {
    reviewerIndependenceAssessment: { create: jest.fn() },
  };
  const boundary = new RedressBoundaryService();
  let service: ReviewerIndependenceService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new ReviewerIndependenceService(prisma as never, boundary);
  });

  it('blocks original decision-maker where independence required', async () => {
    prisma.reviewerIndependenceAssessment.create.mockResolvedValue({
      outcome: ReviewerIndependenceOutcome.REQUIRES_RECUSAL,
    });

    const assessment = await service.assessIndependence({
      reviewAssignmentId: 'assignment-1',
      reviewerIdentityId: 'decision-maker-1',
      reviewerIdentityType: IdentityType.INDIVIDUAL,
      originalDecisionMakerIdentityId: 'decision-maker-1',
    });

    expect(assessment.outcome).toBe(ReviewerIndependenceOutcome.REQUIRES_RECUSAL);
    expect(() => {
      service.assertAssignmentPermitted(assessment.outcome);
    }).toThrow(ForbiddenException);
  });

  it('blocks materially involved reviewer', async () => {
    prisma.reviewerIndependenceAssessment.create.mockResolvedValue({
      outcome: ReviewerIndependenceOutcome.PRIOR_INVOLVEMENT_IDENTIFIED,
    });

    const assessment = await service.assessIndependence({
      reviewAssignmentId: 'assignment-1',
      reviewerIdentityId: 'reviewer-1',
      reviewerIdentityType: IdentityType.INDIVIDUAL,
      originalDecisionMakerIdentityId: 'decision-maker-1',
      priorAdvisoryInvolvement: true,
    });

    expect(assessment.outcome).toBe(ReviewerIndependenceOutcome.PRIOR_INVOLVEMENT_IDENTIFIED);
    expect(() => {
      service.assertAssignmentPermitted(assessment.outcome);
    }).toThrow(ForbiddenException);
  });

  it('blocks system role from satisfying independence', async () => {
    await expect(
      service.assessIndependence({
        reviewAssignmentId: 'assignment-1',
        reviewerIdentityId: 'service-1',
        reviewerIdentityType: IdentityType.SERVICE,
        originalDecisionMakerIdentityId: 'decision-maker-1',
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('does not allow system administrator override', async () => {
    await expect(
      service.assessIndependence({
        reviewAssignmentId: 'assignment-1',
        reviewerIdentityId: 'reviewer-1',
        reviewerIdentityType: IdentityType.INDIVIDUAL,
        originalDecisionMakerIdentityId: 'decision-maker-1',
        adminOverrideRequested: true,
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});
