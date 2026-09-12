import {
  EvidenceRecordStatus,
  EvidenceVerificationCategory,
  EvidenceVerificationMethod,
  EvidenceVerificationResult,
} from '@prisma/client';

import { EvidenceVerificationService } from './evidence-verification.service';

describe('EvidenceVerificationService (unit)', () => {
  const prisma = {
    evidenceVerification: {
      create: jest.fn(),
      findFirst: jest.fn(),
    },
    evidenceRecord: {
      update: jest.fn(),
    },
  };

  const evidenceRecords = {
    getById: jest.fn(),
  };

  let service: EvidenceVerificationService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new EvidenceVerificationService(prisma as never, evidenceRecords as never);
    evidenceRecords.getById.mockResolvedValue({
      id: 'evidence-1',
      status: EvidenceRecordStatus.RECEIVED,
    });
    prisma.evidenceVerification.create.mockResolvedValue({ id: 'verification-1' });
    prisma.evidenceRecord.update.mockResolvedValue({});
  });

  it('rejects unknown verification methods fail-closed', async () => {
    await expect(
      service.recordVerification('evidence-1', 'reviewer-1', {
        category: EvidenceVerificationCategory.INTEGRITY,
        whatWasVerified: 'File checksum',
        verificationMethod: EvidenceVerificationMethod.UNKNOWN,
        verificationSource: 'SYSTEM',
        result: EvidenceVerificationResult.CONFIRMED,
        performedAt: new Date().toISOString(),
      }),
    ).rejects.toThrow('Unknown verification method');
  });

  it('records integrity verification without implying content truth', async () => {
    await service.recordVerification('evidence-1', 'reviewer-1', {
      category: EvidenceVerificationCategory.INTEGRITY,
      whatWasVerified: 'SHA-256 checksum matched submitted bytes',
      verificationMethod: EvidenceVerificationMethod.CHECKSUM_MATCH,
      verificationSource: 'SYSTEM',
      result: EvidenceVerificationResult.CONFIRMED,
      performedAt: new Date().toISOString(),
    });

    expect(prisma.evidenceVerification.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          category: EvidenceVerificationCategory.INTEGRITY,
          verificationMethod: EvidenceVerificationMethod.CHECKSUM_MATCH,
        }) as Record<string, unknown>,
      }),
    );
    expect(prisma.evidenceRecord.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { status: EvidenceRecordStatus.PENDING_VERIFICATION },
      }),
    );
  });

  it('allows AI to propose but not finalize consequential authenticity verification', async () => {
    const proposal = await service.recordVerification(
      'evidence-1',
      'ai-identity',
      {
        category: EvidenceVerificationCategory.CONTENT_FACT,
        whatWasVerified: 'Claimed business address',
        verificationMethod: EvidenceVerificationMethod.VISUAL_INSPECTION,
        verificationSource: 'AI_ASSISTANT',
        result: EvidenceVerificationResult.INCONCLUSIVE,
        performedAt: new Date().toISOString(),
        isAiProposed: true,
      },
      { isAiActor: true },
    );

    expect(proposal).toEqual({ id: 'verification-1' });
    expect(prisma.evidenceRecord.update).not.toHaveBeenCalled();
    expect(prisma.evidenceVerification.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          isAiProposed: true,
          finalizedAt: null,
        }) as Record<string, unknown>,
      }),
    );
  });
});
