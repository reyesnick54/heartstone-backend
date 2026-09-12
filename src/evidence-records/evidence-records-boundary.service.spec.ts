import { IdentityType } from '@prisma/client';

import { PrismaService } from '../database/prisma.service';
import { EvidenceRecordsBoundaryService } from './common/evidence-records-boundary.service';

describe('EvidenceRecordsBoundaryService', () => {
  const prisma = {
    identity: { findUnique: jest.fn() },
  } as unknown as PrismaService;

  const service = new EvidenceRecordsBoundaryService(prisma);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('rejects Phase 7 decision creation', () => {
    expect(() => service.assertPhase7CannotCreateDecision()).toThrow();
  });

  it('rejects service identities from official operations', async () => {
    prisma.identity.findUnique = jest.fn().mockResolvedValue({
      id: 'svc-1',
      type: IdentityType.SERVICE,
      displayName: 'Vendor Integration',
    });

    await expect(service.assertOfficialIdentity('svc-1')).rejects.toThrow();
  });

  it('rejects client-set verified status', () => {
    expect(() => service.assertClientCannotSetVerified({ verified: true })).toThrow();
  });
});
