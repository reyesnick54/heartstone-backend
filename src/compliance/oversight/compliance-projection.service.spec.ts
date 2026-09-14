import { Test, type TestingModule } from '@nestjs/testing';
import {
  ComplianceDashboardAudience,
  ComplianceProjectionStatus,
  OfficialInstrumentStatus,
} from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { ComplianceProjectionService } from './compliance-projection.service';

describe('ComplianceProjectionService', () => {
  let service: ComplianceProjectionService;

  const prisma = {
    complianceStatusProjection: {
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      findUniqueOrThrow: jest.fn(),
      findMany: jest.fn(),
    },
    complianceIndicator: {
      deleteMany: jest.fn(),
      createMany: jest.fn(),
    },
    complianceMonitoringEvent: {
      create: jest.fn(),
    },
    inspectionRecord: { findMany: jest.fn() },
    decisionCondition: { findMany: jest.fn() },
    continuingObligation: { findMany: jest.fn() },
    officialInstrument: { findUnique: jest.fn() },
    evidenceRecord: { findMany: jest.fn() },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ComplianceProjectionService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = module.get(ComplianceProjectionService);
    jest.clearAllMocks();
  });

  it('derives suspended instrument status from official instrument status', async () => {
    prisma.complianceStatusProjection.findFirst.mockResolvedValue(null);
    prisma.inspectionRecord.findMany.mockResolvedValue([]);
    prisma.decisionCondition.findMany.mockResolvedValue([]);
    prisma.continuingObligation.findMany.mockResolvedValue([]);
    prisma.evidenceRecord.findMany.mockResolvedValue([]);
    prisma.officialInstrument.findUnique.mockResolvedValue({
      id: 'inst-1',
      status: OfficialInstrumentStatus.SUSPENDED,
      effectiveUntil: null,
    });
    prisma.complianceStatusProjection.create.mockResolvedValue({
      id: 'proj-1',
      projectionVersion: 1,
    });
    prisma.complianceStatusProjection.findUniqueOrThrow.mockResolvedValue({
      id: 'proj-1',
      status: ComplianceProjectionStatus.SUSPENDED_BY_SEPARATE_DECISION,
      indicators: [],
      alerts: [],
    });

    const result = await service.deriveProjection({
      audience: ComplianceDashboardAudience.HOLDER,
      officialInstrumentId: 'inst-1',
    });

    expect(result.status).toBe(ComplianceProjectionStatus.SUSPENDED_BY_SEPARATE_DECISION);
    const createCalls = prisma.complianceStatusProjection.create.mock.calls as [
      { data: { instrumentStatusSnapshot: string } },
    ][];
    const createCall = createCalls[0]?.[0];
    expect(createCall?.data.instrumentStatusSnapshot).toBe(OfficialInstrumentStatus.SUSPENDED);
  });

  it('reflects revoked issuance instrument status', async () => {
    prisma.complianceStatusProjection.findFirst.mockResolvedValue(null);
    prisma.inspectionRecord.findMany.mockResolvedValue([]);
    prisma.decisionCondition.findMany.mockResolvedValue([]);
    prisma.continuingObligation.findMany.mockResolvedValue([]);
    prisma.evidenceRecord.findMany.mockResolvedValue([]);
    prisma.officialInstrument.findUnique.mockResolvedValue({
      id: 'issued-1',
      status: OfficialInstrumentStatus.REVOKED,
      effectiveUntil: null,
    });
    prisma.complianceStatusProjection.create.mockResolvedValue({
      id: 'proj-2',
      projectionVersion: 1,
    });
    prisma.complianceStatusProjection.findUniqueOrThrow.mockResolvedValue({
      id: 'proj-2',
      status: ComplianceProjectionStatus.REVOKED_BY_SEPARATE_DECISION,
      indicators: [],
      alerts: [],
    });

    const result = await service.deriveProjection({
      audience: ComplianceDashboardAudience.OFFICIAL,
      officialInstrumentId: 'issued-1',
    });

    expect(result.status).toBe(ComplianceProjectionStatus.REVOKED_BY_SEPARATE_DECISION);
  });

  it('invalidates cache on instrument change', async () => {
    prisma.complianceStatusProjection.findMany.mockResolvedValue([
      {
        id: 'proj-3',
        audience: ComplianceDashboardAudience.HOLDER,
        projectionVersion: 2,
      },
    ]);
    prisma.officialInstrument.findUnique.mockResolvedValue({
      id: 'inst-2',
      status: OfficialInstrumentStatus.ISSUED,
      effectiveUntil: null,
    });
    prisma.complianceStatusProjection.findFirst.mockResolvedValue({
      id: 'proj-3',
      projectionVersion: 2,
    });
    prisma.inspectionRecord.findMany.mockResolvedValue([]);
    prisma.decisionCondition.findMany.mockResolvedValue([]);
    prisma.continuingObligation.findMany.mockResolvedValue([]);
    prisma.evidenceRecord.findMany.mockResolvedValue([]);
    prisma.complianceStatusProjection.update.mockResolvedValue({
      id: 'proj-3',
      projectionVersion: 3,
    });
    prisma.complianceStatusProjection.findUniqueOrThrow.mockResolvedValue({
      id: 'proj-3',
      projectionVersion: 3,
      indicators: [],
      alerts: [],
    });

    const refreshed = await service.invalidateOnInstrumentChange('inst-2');
    expect(refreshed).toHaveLength(1);

    const monitoringCalls = prisma.complianceMonitoringEvent.create.mock.calls as [
      { data: { eventType: string } },
    ][];
    expect(monitoringCalls[0]?.[0].data.eventType).toBe('CACHE_INVALIDATED');
  });
});
