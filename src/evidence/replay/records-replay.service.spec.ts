import { Test, type TestingModule } from '@nestjs/testing';
import { RecordsReplayMode } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { RecordsReplayService } from './records-replay.service';

describe('RecordsReplayService', () => {
  let service: RecordsReplayService;

  const prisma = {
    masterAdministrativeFile: {
      findUnique: jest.fn(),
      findUniqueOrThrow: jest.fn(),
    },
    documentVersion: {
      findMany: jest.fn(),
    },
    evidenceRecord: {
      findMany: jest.fn(),
    },
    departmentalReviewRecord: {
      findMany: jest.fn(),
    },
    governmentCommunicationRecord: {
      findMany: jest.fn(),
    },
    professionalReviewRecord: {
      findMany: jest.fn(),
    },
    evidencePacketVersion: {
      findMany: jest.fn(),
    },
    case: {
      findUniqueOrThrow: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [RecordsReplayService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = module.get(RecordsReplayService);
    jest.clearAllMocks();
  });

  it('distinguishes historical replay from current view', async () => {
    prisma.masterAdministrativeFile.findUnique.mockResolvedValue({
      id: 'maf-1',
      openedAt: new Date('2020-01-01'),
    });
    prisma.masterAdministrativeFile.findUniqueOrThrow.mockResolvedValue({
      id: 'maf-1',
      openedAt: new Date('2020-01-01'),
      evidenceRecords: [{ id: 'item-1', status: 'VERIFIED' }],
      evidencePackets: [
        { versions: [{ authorityEvaluationRecordId: 'auth-1', status: 'FROZEN' }] },
      ],
    });
    prisma.documentVersion.findMany
      .mockResolvedValueOnce([{ id: 'doc-v1', versionNumber: 1 }])
      .mockResolvedValueOnce([{ id: 'doc-v2', versionNumber: 2 }])
      .mockResolvedValueOnce([{ id: 'doc-v2', versionNumber: 2 }]);
    prisma.evidenceRecord.findMany.mockResolvedValue([
      { evidenceItemId: 'item-1', status: 'RECEIVED' },
    ]);
    prisma.departmentalReviewRecord.findMany.mockResolvedValue([]);
    prisma.governmentCommunicationRecord.findMany.mockResolvedValue([]);
    prisma.professionalReviewRecord.findMany.mockResolvedValue([]);
    prisma.evidencePacketVersion.findMany.mockResolvedValue([]);
    prisma.case.findUniqueOrThrow.mockResolvedValue({
      openedAt: new Date('2020-01-01'),
      workflowVersion: { id: 'wf-1', version: 1 },
      workflowInstance: null,
    });

    const historical = await service.replay({
      caseId: 'case-1',
      asOf: new Date('2025-06-01'),
      mode: RecordsReplayMode.HISTORICAL_REPLAY,
    });

    const current = await service.replay({
      caseId: 'case-1',
      asOf: new Date('2026-01-01'),
      mode: RecordsReplayMode.CURRENT_VIEW,
    });

    expect(historical.mode).toBe(RecordsReplayMode.HISTORICAL_REPLAY);
    expect(current.mode).toBe(RecordsReplayMode.CURRENT_VIEW);
    expect(historical.documentVersions).toEqual([{ id: 'doc-v1', versionNumber: 1 }]);
    expect(current.documentVersions).toEqual([{ id: 'doc-v2', versionNumber: 2 }]);
  });
});
