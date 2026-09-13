import { ForbiddenException } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import {
  AuthorityEvaluationOutcome,
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
    documentVersion: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      findUniqueOrThrow: jest.fn(),
    },
    documentRecord: {
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
    prisma.documentVersion.findUnique.mockResolvedValue({ id: 'version-1' });
    prisma.recordCorrection.create.mockResolvedValue({
      id: 'corr-1',
      targetRecordType: 'DocumentVersion',
      targetRecordId: 'doc-1',
      targetVersionId: 'version-1',
      requestedBy: 'identity-1',
      status: RecordCorrectionStatus.REQUESTED,
    });

    await service.requestCorrection({
      targetRecordType: 'DocumentVersion',
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
        }) as Record<string, unknown>,
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
    prisma.documentVersion.findUnique.mockResolvedValue({ id: 'version-1' });

    await expect(
      service.requestCorrection({
        targetRecordType: 'DocumentVersion',
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
      targetRecordType: 'DocumentVersion',
      targetRecordId: 'doc-1',
      targetVersionId: 'version-1',
      reason: 'Clerical correction',
    });

    prisma.$transaction.mockImplementation(async (callback: (tx: unknown) => Promise<unknown>) =>
      callback({
        documentVersion: {
          findUniqueOrThrow: jest.fn().mockResolvedValue({
            id: 'version-1',
            documentRecordId: 'doc-1',
            versionNumber: 1,
            originalFilename: 'cert.pdf',
            contentType: 'application/pdf',
            sizeBytes: 100,
            storageProvider: 'test',
            storageObjectKey: 'old-key',
            storageVersionId: null,
            sha256: 'old-hash',
            dateCreated: null,
            language: null,
            signatureStatus: 'NOT_EVALUATED',
            sealStatus: 'NOT_EVALUATED',
            authenticityStatus: 'NOT_EVALUATED',
            securityClassification: 'INTERNAL',
            privacyClassification: 'NOT_APPLICABLE',
            confidentialityOrPrivilegeStatus: 'NOT_EVALUATED',
            malwareScanStatus: 'NOT_SCANNED',
          }),
          findFirst: jest.fn().mockResolvedValue({ versionNumber: 1 }),
          create: jest.fn().mockResolvedValue({ id: 'version-2' }),
          update: jest.fn().mockResolvedValue({ id: 'version-1', supersededById: 'version-2' }),
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
    prisma.documentVersion.findUnique.mockResolvedValue({ id: 'version-1' });
    prisma.recordCorrection.create.mockResolvedValue({
      id: 'corr-2',
      reassessmentRequired: true,
    });

    await service.requestCorrection({
      targetRecordType: 'DocumentVersion',
      targetRecordId: 'doc-1',
      targetVersionId: 'version-1',
      requestedBy: 'identity-1',
      errorOrDisputeDescription: 'Material factual error',
      reassessmentRequired: true,
    });

    expect(prisma.recordCorrection.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ reassessmentRequired: true }) as Record<string, unknown>,
      }),
    );
  });

  it('preserves original record retrieval after correction request', async () => {
    prisma.recordCorrection.findUnique.mockResolvedValue({
      id: 'corr-1',
      targetRecordType: 'DocumentVersion',
      targetRecordId: 'doc-1',
      targetVersionId: 'version-1',
    });
    prisma.documentVersion.findUnique.mockResolvedValue({
      id: 'version-1',
      supersededById: 'version-2',
    });

    const original = await service.getOriginalRecord('corr-1');
    expect(original).toEqual(
      expect.objectContaining({
        id: 'version-1',
        supersededById: 'version-2',
      }),
    );
  });
});
