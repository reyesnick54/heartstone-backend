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
    masterAdministrativeFileVersion: {
      findFirst: jest.fn(),
    },
    evidenceDocumentVersion: {
      findMany: jest.fn(),
    },
    evidenceItemStatusHistory: {
      findMany: jest.fn(),
    },
    evidenceReview: {
      findMany: jest.fn(),
    },
    governmentResponse: {
      findMany: jest.fn(),
    },
    professionalFinding: {
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
    prisma.masterAdministrativeFile.findUnique.mockResolvedValue({ id: 'maf-1' });
    prisma.masterAdministrativeFile.findUniqueOrThrow.mockResolvedValue({
      id: 'maf-1',
      versions: [{ id: 'maf-v2', versionNumber: 2 }],
      documents: [{ versions: [{ id: 'doc-v2', versionNumber: 2 }] }],
      evidenceItems: [{ id: 'item-1', status: 'VERIFIED' }],
      reviews: [],
      governmentResponses: [],
      professionalFindings: [],
      evidencePackets: [{ versions: [{ authorityReferences: ['auth-1'] }] }],
    });
    prisma.masterAdministrativeFileVersion.findFirst.mockResolvedValue({
      id: 'maf-v1',
      versionNumber: 1,
    });
    prisma.evidenceDocumentVersion.findMany.mockResolvedValue([{ id: 'doc-v1', versionNumber: 1 }]);
    prisma.evidenceItemStatusHistory.findMany.mockResolvedValue([
      { evidenceItemId: 'item-1', toStatus: 'PENDING' },
    ]);
    prisma.evidenceReview.findMany.mockResolvedValue([]);
    prisma.governmentResponse.findMany.mockResolvedValue([]);
    prisma.professionalFinding.findMany.mockResolvedValue([]);
    prisma.evidencePacketVersion.findMany.mockResolvedValue([]);
    prisma.case.findUniqueOrThrow.mockResolvedValue({
      workflowInstances: [
        {
          createdAt: new Date('2020-01-01'),
          workflowVersionReference: 'wf-1',
        },
      ],
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
    expect(historical.masterAdministrativeFile).toEqual({ id: 'maf-v1', versionNumber: 1 });
    expect(current.masterAdministrativeFile).toEqual({ id: 'maf-v2', versionNumber: 2 });
  });
});
