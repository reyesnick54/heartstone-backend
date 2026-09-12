import { Test } from '@nestjs/testing';
import type { LegalHoldTargetType } from '@prisma/client';

import { PrismaService } from '../database/prisma.service';
import { ArchivalTransfersService } from './archival/archival-transfers.service';
import { hashRecordsPayload } from './common/records-hash.util';
import { ExternalRecordsRepositoriesService } from './external-repositories/external-records-repositories.service';
import { RetentionSchedulesService } from './retention/retention-schedules.service';

describe('ArchivalTransfersService (Phase 7G)', () => {
  let service: ArchivalTransfersService;
  let prisma: {
    archivalTransfer: {
      create: jest.Mock;
      findUnique: jest.Mock;
      update: jest.Mock;
    };
  };

  beforeEach(async () => {
    prisma = {
      archivalTransfer: {
        create: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
    };

    const moduleRef = await Test.createTestingModule({
      providers: [ArchivalTransfersService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = moduleRef.get(ArchivalTransfersService);
  });

  it('preserves manifest hash on transfer creation', async () => {
    const items = [
      {
        targetType: 'DOCUMENT' as LegalHoldTargetType,
        targetReference: 'DOC-ARCH-1',
        versionReference: 'v1',
        integrityHash: 'abc123',
      },
    ];
    prisma.archivalTransfer.create.mockResolvedValue({ id: 'transfer-1' });

    await service.create({
      transferNumber: 'AT-001',
      sourceRepositoryId: 'repo-1',
      destinationRepositoryId: 'repo-2',
      items,
      integrityVerification: 'verified',
      metadataCompleteness: 'complete',
    });

    expect(prisma.archivalTransfer.create).toHaveBeenCalledTimes(1);
    const [[createArgs]] = prisma.archivalTransfer.create.mock.calls as [
      [{ data: { manifestHash: string } }],
    ];

    expect(createArgs.data.manifestHash).toBe(
      hashRecordsPayload(
        items.map((item) => ({
          ...item,
          metadata: {},
        })),
      ),
    );
  });

  it('does not complete transfer until receiving acknowledgment is recorded', async () => {
    prisma.archivalTransfer.findUnique.mockResolvedValue({
      id: 'transfer-2',
      status: 'IN_TRANSIT',
      items: [],
    });

    expect(await service.isTransferComplete('transfer-2')).toBe(false);

    prisma.archivalTransfer.findUnique.mockResolvedValue({
      id: 'transfer-2',
      status: 'ACKNOWLEDGED',
      items: [],
    });

    expect(await service.isTransferComplete('transfer-2')).toBe(true);
  });
});

describe('RetentionSchedulesService history (Phase 7G)', () => {
  it('preserves version history for reconstruction', async () => {
    const prisma = {
      recordsClassification: { findUnique: jest.fn().mockResolvedValue({ id: 'class-1' }) },
      governingSource: { findUnique: jest.fn().mockResolvedValue({ id: 'source-1' }) },
      retentionSchedule: {
        findFirst: jest.fn().mockResolvedValue({ versionNumber: 1 }),
        create: jest.fn(),
        findMany: jest.fn().mockResolvedValue([
          { code: 'SCHED-1', versionNumber: 1, scheduleSnapshotHash: 'hash-v1' },
          { code: 'SCHED-1', versionNumber: 2, scheduleSnapshotHash: 'hash-v2' },
        ]),
        update: jest.fn(),
      },
    };

    const moduleRef = await Test.createTestingModule({
      providers: [RetentionSchedulesService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    const service = moduleRef.get(RetentionSchedulesService);
    const history = await service.getVersionHistory('SCHED-1');

    expect(history).toHaveLength(2);
    expect(history[0]?.scheduleSnapshotHash).toBe('hash-v1');
    expect(history[1]?.scheduleSnapshotHash).toBe('hash-v2');
  });
});

describe('ExternalRecordsRepositoriesService (Phase 7G)', () => {
  it('asserts institutional schedule overrides vendor defaults', async () => {
    const prisma = {
      externalRecordsRepository: {
        findUnique: jest.fn().mockResolvedValue({
          code: 'CLOUD-1',
          institutionalScheduleOverridesVendor: true,
          vendorDefaultDeletionPolicy: 'delete-after-30-days',
        }),
      },
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        ExternalRecordsRepositoriesService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    const service = moduleRef.get(ExternalRecordsRepositoriesService);

    await expect(service.assertInstitutionalRetentionControls('CLOUD-1')).resolves.toBe(true);
  });
});
