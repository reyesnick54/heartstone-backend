import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../database/prisma.service';
import { chainLedgerHash } from '../common/audit-ledger-hash.util';
import {
  type LedgerVerificationRangeInput,
  type LedgerVerificationResult,
} from './government-audit-ledger.types';

@Injectable()
export class GovernmentAuditLedgerVerificationService {
  constructor(private readonly prisma: PrismaService) {}

  async verifyStream(input: LedgerVerificationRangeInput): Promise<LedgerVerificationResult> {
    const entries = await this.prisma.governmentAuditLedgerEntry.findMany({
      where: {
        ledgerStreamKey: input.ledgerStreamKey,
        ...(input.fromSequence !== undefined || input.toSequence !== undefined
          ? {
              sequenceNumber: {
                ...(input.fromSequence !== undefined ? { gte: input.fromSequence } : {}),
                ...(input.toSequence !== undefined ? { lte: input.toSequence } : {}),
              },
            }
          : {}),
      },
      orderBy: { sequenceNumber: 'asc' },
    });

    let expectedPrevious: string | null = null;

    if (input.fromSequence !== undefined && input.fromSequence > BigInt(1)) {
      const prior = await this.prisma.governmentAuditLedgerEntry.findUnique({
        where: {
          ledgerStreamKey_sequenceNumber: {
            ledgerStreamKey: input.ledgerStreamKey,
            sequenceNumber: input.fromSequence - BigInt(1),
          },
        },
      });
      expectedPrevious = prior?.currentLedgerHash ?? null;
    }

    for (const entry of entries) {
      if (entry.previousLedgerHash !== expectedPrevious) {
        return {
          ledgerStreamKey: input.ledgerStreamKey,
          intact: false,
          entriesVerified: 0,
          firstBrokenSequence: entry.sequenceNumber,
          failureReason: 'PREVIOUS_HASH_MISMATCH',
        };
      }

      const expectedCurrent = chainLedgerHash({
        previousLedgerHash: entry.previousLedgerHash,
        payloadHash: entry.payloadHash,
        ledgerStreamKey: entry.ledgerStreamKey,
        sequenceNumber: entry.sequenceNumber,
        eventType: entry.eventType,
        occurredAt: entry.occurredAt,
      });

      if (expectedCurrent !== entry.currentLedgerHash) {
        return {
          ledgerStreamKey: input.ledgerStreamKey,
          intact: false,
          entriesVerified: 0,
          firstBrokenSequence: entry.sequenceNumber,
          failureReason: 'CURRENT_HASH_MISMATCH',
        };
      }

      expectedPrevious = entry.currentLedgerHash;
    }

    return {
      ledgerStreamKey: input.ledgerStreamKey,
      intact: true,
      entriesVerified: entries.length,
    };
  }

  async verifyInstitution(institutionId: string): Promise<LedgerVerificationResult> {
    return this.verifyStream({
      ledgerStreamKey: `institution:${institutionId}`,
    });
  }
}
