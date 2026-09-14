import { GovernmentDecisionStatus, ReconsiderationReviewStandard } from '@prisma/client';

import { RedressBoundaryService } from '../common/redress-boundary.service';
import { ReviewRecordSnapshotService } from '../snapshot/review-record-snapshot.service';
import { InternalAdministrativeReviewService } from './internal-administrative-review.service';
import { ReconsiderationProceedingService } from './reconsideration-proceeding.service';

describe('Review proceeding services', () => {
  const prisma = {
    governmentDecision: { findUnique: jest.fn() },
    reconsiderationProceeding: { create: jest.fn(), count: jest.fn() },
    internalAdministrativeReview: { create: jest.fn(), count: jest.fn() },
  };
  const boundary = new RedressBoundaryService();
  const snapshotService = {
    createSnapshot: jest.fn().mockResolvedValue({
      id: 'snapshot-1',
      immutable: true,
      referenceManifest: { governmentDecisionId: 'decision-1' },
    }),
  };

  let reconsiderationService: ReconsiderationProceedingService;
  let internalReviewService: InternalAdministrativeReviewService;

  beforeEach(() => {
    jest.clearAllMocks();
    reconsiderationService = new ReconsiderationProceedingService(
      prisma as never,
      boundary,
      snapshotService as unknown as ReviewRecordSnapshotService,
    );
    internalReviewService = new InternalAdministrativeReviewService(
      prisma as never,
      boundary,
      snapshotService as unknown as ReviewRecordSnapshotService,
    );

    prisma.governmentDecision.findUnique.mockResolvedValue({
      id: 'decision-1',
      caseId: 'case-1',
      decisionStatus: GovernmentDecisionStatus.RECORDED,
      outcome: 'APPROVED',
    });
    prisma.reconsiderationProceeding.count.mockResolvedValue(0);
    prisma.internalAdministrativeReview.count.mockResolvedValue(0);
    prisma.reconsiderationProceeding.create.mockResolvedValue({
      id: 'recon-1',
      reviewStandard: ReconsiderationReviewStandard.ERROR_REVIEW,
    });
    prisma.internalAdministrativeReview.create.mockResolvedValue({
      id: 'iar-1',
      issues: [{ ground: 'PROCEDURAL_ERROR' }],
    });
  });

  it('keeps reconsideration and internal review distinct proceeding types', () => {
    expect(reconsiderationService.proceedingKind()).toBe('RECONSIDERATION');
    expect(internalReviewService.proceedingKind()).toBe('INTERNAL_ADMINISTRATIVE');
  });

  it('opening reconsideration does not alter original decision automatically', async () => {
    await reconsiderationService.openProceeding({
      challengedDecisionId: 'decision-1',
      reviewStandard: ReconsiderationReviewStandard.ERROR_REVIEW,
      functionAuthorityRecordId: 'far-1',
      jurisdictionId: 'jur-1',
      requiredReviewerLevel: 'L2',
    });

    expect(snapshotService.createSnapshot).toHaveBeenCalledWith('decision-1');
    expect(prisma.reconsiderationProceeding.create).toHaveBeenCalled();
    expect(prisma.governmentDecision.findUnique).toHaveBeenCalledTimes(2);
  });

  it('opening internal administrative review does not alter original decision automatically', async () => {
    await internalReviewService.openReview({
      challengedDecisionId: 'decision-1',
      functionAuthorityRecordId: 'far-1',
      jurisdictionId: 'jur-1',
      requiredReviewerLevel: 'L2',
      issues: [{ ground: 'PROCEDURAL_ERROR', description: 'Notice defect identified' }],
    });

    expect(snapshotService.createSnapshot).toHaveBeenCalledWith('decision-1');
    expect(prisma.internalAdministrativeReview.create).toHaveBeenCalled();
    expect(prisma.governmentDecision.findUnique).toHaveBeenCalledTimes(2);
  });
});
