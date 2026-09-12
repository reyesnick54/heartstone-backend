import { BadRequestException } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import { RecordIntegrityEventType } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { chainIntegrityHash, hashRecordContent } from '../common/record-hash.util';
import { RecordIntegrityService } from './record-integrity.service';

describe('RecordIntegrityService', () => {
  let service: RecordIntegrityService;

  const prisma = {
    recordIntegrityEvent: {
      findFirst: jest.fn(),
      create: jest.fn(),
      findMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [RecordIntegrityService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = module.get(RecordIntegrityService);
    jest.clearAllMocks();
  });

  it('appends integrity events with hash chain linkage', async () => {
    prisma.recordIntegrityEvent.findFirst.mockResolvedValue({
      contentHash: 'prior-hash',
    });
    prisma.recordIntegrityEvent.create.mockResolvedValue({ id: 'event-1' });

    await service.append({
      recordType: 'EvidenceDocumentVersion',
      recordId: 'doc-1',
      eventType: RecordIntegrityEventType.HASHED,
      content: { version: 1 },
    });

    expect(prisma.recordIntegrityEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          priorIntegrityEventHash: 'prior-hash',
          hashAlgorithm: 'SHA-256',
        }),
      }),
    );
  });

  it('rejects update and delete through ordinary API surface', async () => {
    await expect(service.updateEvent()).rejects.toBeInstanceOf(BadRequestException);
    await expect(service.deleteEvent()).rejects.toBeInstanceOf(BadRequestException);
  });

  it('changes integrity hash when content changes', () => {
    const first = hashRecordContent({ version: 1, body: 'original' });
    const second = hashRecordContent({ version: 2, body: 'corrected' });
    expect(first).not.toBe(second);
  });

  it('verifies an intact hash chain', async () => {
    const occurredAt = new Date('2026-01-01T00:00:00.000Z');
    const payloadHash = hashRecordContent({ version: 1 });
    const contentHash = chainIntegrityHash({
      priorHash: null,
      contentHash: payloadHash,
      eventType: RecordIntegrityEventType.CREATED,
      occurredAt,
    });

    prisma.recordIntegrityEvent.findMany.mockResolvedValue([
      {
        priorIntegrityEventHash: null,
        contentHash,
        eventType: RecordIntegrityEventType.CREATED,
        occurredAt,
        metadata: { payloadHash },
      },
    ]);

    const result = await service.verifyChain('EvidenceItem', 'item-1');
    expect(result).toBe(true);
  });
});
