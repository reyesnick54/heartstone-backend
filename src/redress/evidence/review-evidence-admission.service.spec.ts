import { BadRequestException } from '@nestjs/common';
import { ReviewEvidenceClassification, ReviewProceedingKind } from '@prisma/client';

import { ReviewEvidenceAdmissionService } from './review-evidence-admission.service';

describe('ReviewEvidenceAdmissionService', () => {
  const prisma = {
    reviewEvidenceAdmission: { create: jest.fn(), count: jest.fn() },
  };

  let service: ReviewEvidenceAdmissionService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new ReviewEvidenceAdmissionService(prisma as never);
    prisma.reviewEvidenceAdmission.count.mockResolvedValue(0);
    prisma.reviewEvidenceAdmission.create.mockImplementation(({ data }) => data);
  });

  it('clearly separates later evidence with POST_DECISION_EVIDENCE label', async () => {
    const admission = await service.admitEvidence({
      proceedingKind: ReviewProceedingKind.RECONSIDERATION,
      reconsiderationProceedingId: 'proceeding-1',
      evidenceReference: 'evidence/post-decision-1',
      classification: ReviewEvidenceClassification.POST_DECISION_EVIDENCE,
      admittedByIdentityId: 'reviewer-1',
      isPostDecision: true,
    });

    expect(admission.classification).toBe(ReviewEvidenceClassification.POST_DECISION_EVIDENCE);
  });

  it('requires post-decision evidence to be explicitly labeled', async () => {
    await expect(
      service.admitEvidence({
        proceedingKind: ReviewProceedingKind.RECONSIDERATION,
        reconsiderationProceedingId: 'proceeding-1',
        evidenceReference: 'evidence/post-decision-1',
        classification: ReviewEvidenceClassification.ORIGINAL_RECORD,
        admittedByIdentityId: 'reviewer-1',
        isPostDecision: true,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
