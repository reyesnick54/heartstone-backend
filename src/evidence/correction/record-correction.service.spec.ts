import { ForbiddenException } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import {
  AuthorityEvaluationOutcome,
  EvidenceDocumentVersionStatus,
  RecordCorrectionStatus,
  RecordIntegrityEventType,
} from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { RecordIntegrityService } from '../integrity/record-integrity.service';
import { RecordCorrectionService } from './record-correction.service';

describe('RecordCorrectionService', () => {
  let service: RecordCorrectionService;

  const prisma = {
    recordCorrection: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    evidenceDocumentVersion: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      findUniqueOrThrow: jest.fn(),
    },
    evidenceDocument: {
      findUnique: jest.fn(),
    },
    authorityEvaluationRecord: {
      findUnique: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  const integrityService = {
    append: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RecordCorrectionService,
        { provide: PrismaService, useValue: prisma },
        { provide: RecordIntegrityService, useValue: integrityService },
      ],
    }).compile();

    service = module.get(RecordCorrectionService);
    jest.clearAllMocks();
  });

  it('records who, why, and when a correction is requested', async () => {
    prisma.evidenceDocumentVersion.findUnique.mockResolvedValue({ id: 'version-1' });
    prisma.recordCorrection.create.mockResolvedValue({
      id: 'corr-1',
      targetRecordType: 'EvidenceDocumentVersion',
      targetRecordId: 'doc-1',
      targetVersionId: 'version-1',
      requestedBy: 'identity-1',
      status: RecordCorrectionStatus.REQUESTED,
    });

    await service.requestCorrection({
      targetRecordType: 'EvidenceDocumentVersion',
      targetRecordId: 'doc-1',
      targetVersionId: 'version-1',
      requestedBy: 'identity-1',
      errorOrDisputeDescription: 'Incorrect date on certificate',
      reason: 'Clerical error',
    });

    expect(prisma.recordCorrection.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          requestedBy: 'identity-1',
          errorOrDisputeDescription: 'Incorrect date on certificate',
          reason: 'Clerical error',
        }),
      }),
    );
    expect(integrityService.append).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: RecordIntegrityEventType.CREATED,
        actorIdentityId: 'identity-1',
      }),
    );
  });

  it('rejects unauthorized AI correction requests', async () => {
    prisma.evidenceDocumentVersion.findUnique.mockResolvedValue({ id: 'version-1' });

    await expect(
      service.requestCorrection({
        targetRecordType: 'EvidenceDocumentVersion',
        targetRecordId: 'doc-1',
        targetVersionId: 'version-1',
        requestedBy: 'ai-assistant:bot-1',
        errorOrDisputeDescription: 'Auto fix',
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('implements correction by creating a new version and superseding the original', async () => {
    prisma.recordCorrection.findUnique.mockResolvedValue({
      id: 'corr-1',
      status: RecordCorrectionStatus.APPROVED,
      targetRecordType: 'EvidenceDocumentVersion',
      targetRecordId: 'doc-1',
      targetVersionId: 'version-1',
      reason: 'Clerical correction',
    });

    prisma.$transaction.mockImplementation(async (callback: (tx: unknown) => Promise<unknown>) =>
      callback({
        evidenceDocumentVersion: {
          findUniqueOrThrow: jest.fn().mockResolvedValue({
            id: 'version-1',
            documentId: 'doc-1',
            versionNumber: 1,
          }),
          findFirst: jest.fn().mockResolvedValue({ versionNumber: 1 }),
          create: jest.fn().mockResolvedValue({ id: 'version-2' }),
          update: jest.fn().mockResolvedValue({
            id: 'version-1',
            status: EvidenceDocumentVersionStatus.SUPERSEDED,
          }),
        },
        recordCorrection: {
          update: jest.fn().mockResolvedValue({
            id: 'corr-1',
            status: RecordCorrectionStatus.IMPLEMENTED,
            replacementRecordReference: 'version-2',
          }),
        },
      }),
    );

    const result = await service.implementCorrection({
      correctionId: 'corr-1',
      actorIdentityId: 'identity-2',
      correctedContentReference: 'ref-v2',
      correctedContent: { field: 'corrected-value' },
    });

    expect(result.newVersionId).toBe('version-2');
    expect(integrityService.append).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: RecordIntegrityEventType.CORRECTED,
        recordVersionId: 'version-2',
      }),
    );
  });

  it('requires authority evaluation for approval', async () => {
    prisma.recordCorrection.findUnique.mockResolvedValue({
      id: 'corr-1',
      status: RecordCorrectionStatus.REQUESTED,
    });
    prisma.authorityEvaluationRecord.findUnique.mockResolvedValue({
      outcome: AuthorityEvaluationOutcome.DENY,
    });

    await expect(
      service.approveCorrection({
        correctionId: 'corr-1',
        approvedByIdentityId: 'identity-2',
        authorityEvaluationRecordId: 'eval-1',
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('can trigger reassessment flag on correction request', async () => {
    prisma.evidenceDocumentVersion.findUnique.mockResolvedValue({ id: 'version-1' });
    prisma.recordCorrection.create.mockResolvedValue({
      id: 'corr-2',
      reassessmentRequired: true,
    });

    await service.requestCorrection({
      targetRecordType: 'EvidenceDocumentVersion',
      targetRecordId: 'doc-1',
      targetVersionId: 'version-1',
      requestedBy: 'identity-1',
      errorOrDisputeDescription: 'Material factual error',
      reassessmentRequired: true,
    });

    expect(prisma.recordCorrection.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ reassessmentRequired: true }),
      }),
    );
  });

  it('preserves original record retrieval after correction request', async () => {
    prisma.recordCorrection.findUnique.mockResolvedValue({
      id: 'corr-1',
      targetRecordType: 'EvidenceDocumentVersion',
      targetRecordId: 'doc-1',
      targetVersionId: 'version-1',
    });
    prisma.evidenceDocumentVersion.findUnique.mockResolvedValue({
      id: 'version-1',
      status: EvidenceDocumentVersionStatus.SUPERSEDED,
    });

    const original = await service.getOriginalRecord('corr-1');
    expect(original).toEqual(
      expect.objectContaining({
        id: 'version-1',
        status: EvidenceDocumentVersionStatus.SUPERSEDED,
      }),
    );
  });
});
