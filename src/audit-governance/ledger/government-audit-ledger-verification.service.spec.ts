import { Test, type TestingModule } from '@nestjs/testing';

import { PrismaService } from '../../database/prisma.service';
import { chainLedgerHash, hashAuditPayload } from '../common/audit-ledger-hash.util';
import { GovernmentAuditLedgerVerificationService } from './government-audit-ledger-verification.service';

describe('GovernmentAuditLedgerVerificationService', () => {
  let service: GovernmentAuditLedgerVerificationService;

  const prisma = {
    governmentAuditLedgerEntry: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GovernmentAuditLedgerVerificationService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get(GovernmentAuditLedgerVerificationService);
    jest.clearAllMocks();
  });

  it('verifies an intact stream', async () => {
    const occurredAt = new Date('2026-09-27T12:00:00.000Z');
    const payloadHash = hashAuditPayload({ action: 'TEST' });
    const currentLedgerHash = chainLedgerHash({
      previousLedgerHash: null,
      payloadHash,
      ledgerStreamKey: 'platform',
      sequenceNumber: BigInt(1),
      eventType: 'TEST',
      occurredAt,
    });

    prisma.governmentAuditLedgerEntry.findMany.mockResolvedValue([
      {
        sequenceNumber: BigInt(1),
        previousLedgerHash: null,
        currentLedgerHash,
        payloadHash,
        ledgerStreamKey: 'platform',
        eventType: 'TEST',
        occurredAt,
      },
    ]);

    const result = await service.verifyStream({ ledgerStreamKey: 'platform' });
    expect(result.intact).toBe(true);
    expect(result.entriesVerified).toBe(1);
  });

  it('detects removed or altered history', async () => {
    prisma.governmentAuditLedgerEntry.findMany.mockResolvedValue([
      {
        sequenceNumber: BigInt(1),
        previousLedgerHash: 'unexpected',
        currentLedgerHash: 'broken',
        payloadHash: 'payload',
        ledgerStreamKey: 'platform',
        eventType: 'TEST',
        occurredAt: new Date(),
      },
    ]);

    const result = await service.verifyStream({ ledgerStreamKey: 'platform' });
    expect(result.intact).toBe(false);
    expect(result.firstBrokenSequence).toBe(BigInt(1));
  });
});
