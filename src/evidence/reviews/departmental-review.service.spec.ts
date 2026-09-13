import { ForbiddenException } from '@nestjs/common';
import { AuthorityEvaluationOutcome, DepartmentalReviewStatus } from '@prisma/client';

import { type AuthorityEvaluationService } from '../../authority/evaluation/authority-evaluation.service';
import { DepartmentalReviewService } from './departmental-review.service';

describe('DepartmentalReviewService', () => {
  const prisma = {
    case: { findUnique: jest.fn().mockResolvedValue({ id: 'case-1' }) },
    departmentalReviewRecord: {
      findFirst: jest.fn().mockResolvedValue(null),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      findMany: jest.fn(),
    },
  };

  const authorityEvaluation = {
    evaluate: jest.fn(),
  };

  let service: DepartmentalReviewService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new DepartmentalReviewService(
      prisma as never,
      authorityEvaluation as unknown as AuthorityEvaluationService,
    );
  });

  it('requires authority evaluation to complete consequential review', async () => {
    prisma.departmentalReviewRecord.findUnique.mockResolvedValue({
      id: 'review-1',
      reviewerIdentityId: 'identity-1',
      reviewerOfficeholderId: 'officeholder-1',
      functionAuthorityRecordId: 'far-1',
      evidenceConsidered: [],
    });

    authorityEvaluation.evaluate.mockResolvedValue({
      outcome: AuthorityEvaluationOutcome.DENY,
      evaluationId: null,
    });

    await expect(
      service.completeReview({
        reviewId: 'review-1',
        reviewerIdentityId: 'identity-1',
        reviewerOfficeholderId: 'officeholder-1',
        findings: 'Department findings',
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('stores authority evaluation on successful completion', async () => {
    prisma.departmentalReviewRecord.findUnique.mockResolvedValue({
      id: 'review-1',
      reviewerIdentityId: 'identity-1',
      reviewerOfficeholderId: 'officeholder-1',
      functionAuthorityRecordId: 'far-1',
      evidenceConsidered: [{ evidenceRecordId: 'ev-1' }],
    });

    authorityEvaluation.evaluate.mockResolvedValue({
      outcome: AuthorityEvaluationOutcome.ALLOW,
      evaluationId: 'eval-1',
    });

    prisma.departmentalReviewRecord.update.mockResolvedValue({
      id: 'review-1',
      status: DepartmentalReviewStatus.COMPLETED,
      authorityEvaluationRecordId: 'eval-1',
    });

    const result = await service.completeReview({
      reviewId: 'review-1',
      reviewerIdentityId: 'identity-1',
      reviewerOfficeholderId: 'officeholder-1',
      findings: 'Findings remain attributable to department',
    });

    expect(result.authorityEvaluationRecordId).toBe('eval-1');
    expect(authorityEvaluation.evaluate).toHaveBeenCalled();
  });

  it('exposes historical review versions per department', async () => {
    prisma.departmentalReviewRecord.findMany.mockResolvedValue([
      { reviewVersion: 1 },
      { reviewVersion: 2 },
    ]);

    const versions = await service.getHistoricalVersions('case-1', 'dept-1');
    expect(versions).toHaveLength(2);
  });
});
