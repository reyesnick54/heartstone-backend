import { Test, type TestingModule } from '@nestjs/testing';
import { CasePublicStatusStage, CaseStatus } from '@prisma/client';

import { PrismaService } from '../../../database/prisma.service';
import { CasePublicStatusProjectionService } from './case-public-status-projection.service';

describe('CasePublicStatusProjectionService', () => {
  let service: CasePublicStatusProjectionService;

  const prisma = {
    case: { findUnique: jest.fn() },
    casePublicStatusProjection: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CasePublicStatusProjectionService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = module.get(CasePublicStatusProjectionService);
    jest.clearAllMocks();
  });

  it('maps decision pending without exposing decision result', () => {
    const stage = service.mapCaseStatusToPublicStage(CaseStatus.DECISION_PENDING);
    expect(stage).toBe(CasePublicStatusStage.DECISION_PENDING);
  });

  it('derives projection from authoritative case status', async () => {
    prisma.casePublicStatusProjection.findUnique.mockResolvedValue(null);
    prisma.casePublicStatusProjection.create.mockResolvedValue({
      publicStage: CasePublicStatusStage.RECEIVED,
      sourceCaseStatus: CaseStatus.RECEIVED,
    });

    const caseRecord = {
      id: 'case-1',
      caseStatus: CaseStatus.RECEIVED,
      legalStatus: 'NONE',
    };

    const projection = await service.deriveFromCase(caseRecord as never);

    expect(projection.publicStage).toBe(CasePublicStatusStage.RECEIVED);
    expect(prisma.casePublicStatusProjection.create).toHaveBeenCalled();
  });
});
