import { ForbiddenException } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import { DocumentAuthenticityStatus, MalwareScanStatus } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { InMemoryDocumentStorageAdapter } from '../adapters/in-memory-document-storage.adapter';
import { TestMalwareScanningAdapter } from '../adapters/test-malware-scanning.adapter';
import { DocumentAuditService } from '../audit/document-audit.service';
import { DOCUMENT_STORAGE_PORT } from '../ports/document-storage.port';
import { MALWARE_SCANNING_PORT } from '../ports/malware-scanning.port';
import { DocumentVersionsService } from './document-versions.service';

describe('DocumentVersionsService', () => {
  let service: DocumentVersionsService;
  let prisma: {
    documentRecord: {
      findUnique: jest.Mock;
      create: jest.Mock;
    };
    documentVersion: {
      create: jest.Mock;
      update: jest.Mock;
      findUnique: jest.Mock;
    };
  };
  let audit: { record: jest.Mock };
  let malwareScanner: TestMalwareScanningAdapter;

  beforeEach(async () => {
    audit = { record: jest.fn().mockResolvedValue({}) };
    prisma = {
      documentRecord: {
        findUnique: jest.fn(),
        create: jest.fn(),
      },
      documentVersion: {
        create: jest.fn(),
        update: jest.fn(),
        findUnique: jest.fn(),
      },
    };
    malwareScanner = new TestMalwareScanningAdapter();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DocumentVersionsService,
        InMemoryDocumentStorageAdapter,
        { provide: PrismaService, useValue: prisma },
        { provide: DocumentAuditService, useValue: audit },
        {
          provide: DOCUMENT_STORAGE_PORT,
          useExisting: InMemoryDocumentStorageAdapter,
        },
        {
          provide: MALWARE_SCANNING_PORT,
          useValue: malwareScanner,
        },
      ],
    }).compile();

    service = module.get(DocumentVersionsService);
  });

  it('rejects client-supplied storage keys', () => {
    expect(() => {
      service.rejectClientStorageFields({ storageObjectKey: 'evil/path' });
    }).toThrow(ForbiddenException);
  });

  it('does not mark uploaded content as authentic', async () => {
    prisma.documentRecord.findUnique.mockResolvedValue({
      id: 'record-1',
      versions: [],
    });
    prisma.documentVersion.create.mockImplementation(
      ({ data }: { data: Record<string, unknown> }) => ({
        id: 'version-1',
        ...data,
      }),
    );

    const version = await service.uploadVersion({
      documentRecordId: 'record-1',
      dto: {
        contentBase64: Buffer.from('test').toString('base64'),
        originalFilename: 'proof.pdf',
        contentType: 'application/pdf',
      },
      content: Buffer.from('test'),
      actorIdentityId: 'identity-1',
    });

    expect(version.authenticityStatus).toBe(DocumentAuthenticityStatus.NOT_EVALUATED);
    expect(version.sha256).toHaveLength(64);
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: 'DOCUMENT_UPLOADED',
      }),
    );
  });

  it('quarantines malicious uploads', async () => {
    malwareScanner.setScanBehavior(() => MalwareScanStatus.MALICIOUS);
    prisma.documentRecord.findUnique.mockResolvedValue({
      id: 'record-1',
      versions: [],
    });
    prisma.documentVersion.create.mockImplementation(
      ({ data }: { data: Record<string, unknown> }) => ({
        id: 'version-1',
        ...data,
      }),
    );
    prisma.documentVersion.update.mockResolvedValue({
      malwareScanStatus: MalwareScanStatus.QUARANTINED,
    });

    await service.uploadVersion({
      documentRecordId: 'record-1',
      dto: {
        contentBase64: Buffer.from('eicar').toString('base64'),
        originalFilename: 'bad.exe',
        contentType: 'application/octet-stream',
      },
      content: Buffer.from('eicar'),
      actorIdentityId: 'identity-1',
    });

    expect(prisma.documentVersion.update).toHaveBeenCalledWith({
      where: { id: 'version-1' },
      data: { malwareScanStatus: MalwareScanStatus.QUARANTINED },
    });
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({ eventType: 'DOCUMENT_QUARANTINED' }),
    );
  });
});
