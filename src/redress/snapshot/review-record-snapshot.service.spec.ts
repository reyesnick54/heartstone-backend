import { GovernmentDecisionStatus } from '@prisma/client';

import { ReviewRecordSnapshotService } from './review-record-snapshot.service';

describe('ReviewRecordSnapshotService', () => {
  const prisma = {
    governmentDecision: { findUnique: jest.fn() },
    reviewRecordSnapshot: { create: jest.fn(), count: jest.fn() },
  };

  let service: ReviewRecordSnapshotService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new ReviewRecordSnapshotService(prisma as never);
  });

  it('preserves historic original record references in immutable snapshot', async () => {
    prisma.governmentDecision.findUnique.mockResolvedValue({
      id: 'decision-1',
      caseId: 'case-1',
      decisionReadinessAssessmentId: 'readiness-1',
      evidencePacketVersionId: 'packet-1',
      decisionStatus: GovernmentDecisionStatus.RECORDED,
      case: {
        application: { submissions: [{ id: 'submission-1' }] },
        departmentalReviews: [{ id: 'dept-review-1' }],
        professionalReviews: [{ id: 'prof-review-1' }],
        inspectionRecords: [{ id: 'inspection-1' }],
        decisionPreparationRecords: [{ id: 'prep-1', aiAssistanceMetadata: { model: 'assistant' } }],
      },
      decisionReadinessAssessment: { id: 'readiness-1' },
      evidencePacketVersion: { id: 'packet-1', status: 'FROZEN' },
      reasonsReference: 'reason-ref-1',
      officialInstruments: [{ versions: [{ id: 'version-1' }] }],
    });
    prisma.reviewRecordSnapshot.count.mockResolvedValue(0);
    prisma.reviewRecordSnapshot.create.mockImplementation(({ data }) => data);

    const snapshot = await service.createSnapshot('decision-1');
    const manifest = snapshot.referenceManifest as {
      applicationSubmissionIds: string[];
      governmentDecisionId: string;
      reasonsReferences: string[];
      evidencePacketVersionId: string;
      postDecisionEventReferences: string[];
    };

    expect(snapshot.immutable).toBe(true);
    expect(manifest.applicationSubmissionIds).toContain('submission-1');
    expect(manifest.governmentDecisionId).toBe('decision-1');
    expect(manifest.reasonsReferences).toContain('reason-ref-1');
    expect(manifest.evidencePacketVersionId).toBe('packet-1');
    expect(manifest.postDecisionEventReferences).toEqual([]);
    expect(snapshot.snapshotHash).toBeTruthy();
  });
});
