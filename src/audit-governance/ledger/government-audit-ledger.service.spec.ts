import { BadRequestException } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import { GovernmentAuditActorType } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { chainLedgerHash, hashAuditPayload } from '../common/audit-ledger-hash.util';
import { GovernmentAuditLedgerService } from './government-audit-ledger.service';

describe('GovernmentAuditLedgerService', () => {
  let service: GovernmentAuditLedgerService;

  const tx = {
    $executeRaw: jest.fn(),
    governmentAuditLedgerEntry: {
      findFirst: jest.fn(),
      create: jest.fn(),
    },
  };

  const prisma = {
    governmentAuditLedgerEntry: {
      findUnique: jest.fn(),
    },
    $transaction: jest.fn(async (callback: (client: typeof tx) => Promise<unknown>) =>
      callback(tx),
    ),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [GovernmentAuditLedgerService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = module.get(GovernmentAuditLedgerService);
    jest.clearAllMocks();
  });

  it('rejects update and delete through the service surface', async () => {
    await expect(service.updateEntry()).rejects.toBeInstanceOf(BadRequestException);
    await expect(service.deleteEntry()).rejects.toBeInstanceOf(BadRequestException);
  });

  it('appends with chained hashes and monotonic sequence numbers', async () => {
    const occurredAt = new Date('2026-09-27T12:00:00.000Z');
    tx.governmentAuditLedgerEntry.findFirst.mockResolvedValue({
      sequenceNumber: BigInt(4),
      currentLedgerHash: 'prior-chain-hash',
    });
    tx.governmentAuditLedgerEntry.create.mockResolvedValue({ id: 'ledger-entry-1' });

    await service.append({
      ledgerStreamKey: 'institution:inst-1',
      eventType: 'SECURITY_EVENT',
      occurredAt,
      actorType: GovernmentAuditActorType.HUMAN_IDENTITY,
      action: 'AUTHENTICATION_SUCCESS',
      outcome: 'RECORDED',
    });

    expect(tx.$executeRaw).toHaveBeenCalled();
    expect(tx.governmentAuditLedgerEntry.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          sequenceNumber: BigInt(5),
          previousLedgerHash: 'prior-chain-hash',
        }) as Record<string, unknown>,
      }),
    );
  });

  it('changes verification outcome when payload hash is tampered', () => {
    const occurredAt = new Date('2026-09-27T12:00:00.000Z');
    const payloadHash = hashAuditPayload({
      eventType: 'TEST',
      occurredAt: occurredAt.toISOString(),
      action: 'A',
    });
    const valid = chainLedgerHash({
      previousLedgerHash: null,
      payloadHash,
      ledgerStreamKey: 'platform',
      sequenceNumber: BigInt(1),
      eventType: 'TEST',
      occurredAt,
    });
    const tampered = chainLedgerHash({
      previousLedgerHash: null,
      payloadHash: hashAuditPayload({ mutated: true }),
      ledgerStreamKey: 'platform',
      sequenceNumber: BigInt(1),
      eventType: 'TEST',
      occurredAt,
    });

    expect(valid).not.toBe(tampered);
  });
});
