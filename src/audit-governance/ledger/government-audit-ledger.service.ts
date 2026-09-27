import { BadRequestException, Injectable } from '@nestjs/common';
import {
  GovernmentAuditActorType,
  type GovernmentAuditLedgerEntry,
  type Prisma,
} from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { chainLedgerHash, hashAuditPayload } from '../common/audit-ledger-hash.util';
import { resolveLedgerStreamKey } from '../common/resolve-ledger-stream.util';
import { sanitizeAuditMetadata } from '../common/sanitize-audit-metadata.util';
import {
  type AppendGovernmentAuditLedgerInput,
  type GovernmentAuditLedgerClient,
} from './government-audit-ledger.types';

@Injectable()
export class GovernmentAuditLedgerService {
  constructor(private readonly prisma: PrismaService) {}

  async append(input: AppendGovernmentAuditLedgerInput): Promise<GovernmentAuditLedgerEntry> {
    const ledgerStreamKey =
      input.ledgerStreamKey ??
      resolveLedgerStreamKey({ institutionId: input.institutionId ?? null });

    if (input.sourceDomainEventType && input.sourceDomainEventId) {
      const existing = await this.prisma.governmentAuditLedgerEntry.findUnique({
        where: {
          sourceDomainEventType_sourceDomainEventId: {
            sourceDomainEventType: input.sourceDomainEventType,
            sourceDomainEventId: input.sourceDomainEventId,
          },
        },
      });

      if (existing) {
        return existing;
      }
    }

    return this.prisma.$transaction(async (tx) => {
      return this.appendWithinTransaction(tx, input, ledgerStreamKey);
    });
  }

  async appendWithinTransaction(
    tx: GovernmentAuditLedgerClient,
    input: AppendGovernmentAuditLedgerInput,
    ledgerStreamKey: string,
  ): Promise<GovernmentAuditLedgerEntry> {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${ledgerStreamKey}))`;

    const prior = await tx.governmentAuditLedgerEntry.findFirst({
      where: { ledgerStreamKey },
      orderBy: { sequenceNumber: 'desc' },
      select: {
        sequenceNumber: true,
        currentLedgerHash: true,
      },
    });

    const sequenceNumber = prior ? prior.sequenceNumber + BigInt(1) : BigInt(1);
    const previousLedgerHash = prior?.currentLedgerHash ?? null;
    const occurredAt = input.occurredAt ?? new Date();
    const metadata = sanitizeAuditMetadata(input.metadata);

    const payloadForHash = {
      eventType: input.eventType,
      occurredAt: occurredAt.toISOString(),
      actorType: input.actorType ?? GovernmentAuditActorType.HUMAN_IDENTITY,
      actorIdentityId: input.actorIdentityId ?? null,
      actorOfficeholderId: input.actorOfficeholderId ?? null,
      sessionId: input.sessionId ?? null,
      jurisdictionId: input.jurisdictionId ?? null,
      institutionId: input.institutionId ?? null,
      departmentId: input.departmentId ?? null,
      officeId: input.officeId ?? null,
      resourceType: input.resourceType ?? null,
      resourceId: input.resourceId ?? null,
      action: input.action,
      outcome: input.outcome ?? null,
      authorityEvaluationRecordId: input.authorityEvaluationRecordId ?? null,
      permissionDecisionReference: input.permissionDecisionReference ?? null,
      priorStateHash: input.priorStateHash ?? null,
      newStateHash: input.newStateHash ?? null,
      metadata,
      correlationId: input.correlationId ?? null,
      traceId: input.traceId ?? null,
    };

    const payloadHash = hashAuditPayload(payloadForHash);
    const currentLedgerHash = chainLedgerHash({
      previousLedgerHash,
      payloadHash,
      ledgerStreamKey,
      sequenceNumber,
      eventType: input.eventType,
      occurredAt,
    });

    return tx.governmentAuditLedgerEntry.create({
      data: {
        ledgerStreamKey,
        sequenceNumber,
        eventType: input.eventType,
        occurredAt,
        actorType: input.actorType ?? GovernmentAuditActorType.HUMAN_IDENTITY,
        actorIdentityId: input.actorIdentityId,
        actorOfficeholderId: input.actorOfficeholderId,
        sessionId: input.sessionId,
        jurisdictionId: input.jurisdictionId,
        institutionId: input.institutionId,
        departmentId: input.departmentId,
        officeId: input.officeId,
        resourceType: input.resourceType,
        resourceId: input.resourceId,
        action: input.action,
        outcome: input.outcome,
        authorityEvaluationRecordId: input.authorityEvaluationRecordId,
        permissionDecisionReference: input.permissionDecisionReference,
        priorStateHash: input.priorStateHash,
        newStateHash: input.newStateHash,
        metadata: metadata as Prisma.InputJsonObject,
        correlationId: input.correlationId,
        traceId: input.traceId,
        previousLedgerHash,
        currentLedgerHash,
        payloadHash,
        sourceDomainEventType: input.sourceDomainEventType,
        sourceDomainEventId: input.sourceDomainEventId,
      },
    });
  }

  updateEntry(): Promise<never> {
    return Promise.reject(
      new BadRequestException(
        'Government audit ledger entries are append-only and cannot be updated',
      ),
    );
  }

  deleteEntry(): Promise<never> {
    return Promise.reject(
      new BadRequestException(
        'Government audit ledger entries are append-only and cannot be deleted',
      ),
    );
  }
}
