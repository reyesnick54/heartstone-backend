import { BadRequestException, Injectable } from '@nestjs/common';
import { RecordIntegrityEvent, RecordIntegrityEventType } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { EVIDENCE_SYSTEM_COMPONENT } from '../evidence.constants';
import {
  RECORD_HASH_ALGORITHM,
  chainIntegrityHash,
  hashRecordContent,
} from '../common/record-hash.util';

export interface AppendIntegrityEventInput {
  recordType: string;
  recordId: string;
  recordVersionId?: string;
  eventType: RecordIntegrityEventType;
  content: Record<string, unknown>;
  actorIdentityId?: string;
  actorOfficeholderId?: string;
  systemComponent?: string;
  reason?: string;
  metadata?: Record<string, unknown>;
  occurredAt?: Date;
}

@Injectable()
export class RecordIntegrityService {
  constructor(private readonly prisma: PrismaService) {}

  async append(input: AppendIntegrityEventInput): Promise<RecordIntegrityEvent> {
    const occurredAt = input.occurredAt ?? new Date();
    const contentHash = hashRecordContent(input.content);

    const priorEvent = await this.prisma.recordIntegrityEvent.findFirst({
      where: { recordType: input.recordType, recordId: input.recordId },
      orderBy: { occurredAt: 'desc' },
    });

    const priorIntegrityEventHash = priorEvent?.contentHash ?? null;
    const chainedHash = chainIntegrityHash({
      priorHash: priorIntegrityEventHash,
      contentHash,
      eventType: input.eventType,
      occurredAt,
    });

    return this.prisma.recordIntegrityEvent.create({
      data: {
        recordType: input.recordType,
        recordId: input.recordId,
        recordVersionId: input.recordVersionId,
        eventType: input.eventType,
        hashAlgorithm: RECORD_HASH_ALGORITHM,
        contentHash: chainedHash,
        priorIntegrityEventHash,
        occurredAt,
        actorIdentityId: input.actorIdentityId,
        actorOfficeholderId: input.actorOfficeholderId,
        systemComponent: input.systemComponent ?? EVIDENCE_SYSTEM_COMPONENT,
        reason: input.reason,
        metadata: {
          payloadHash: contentHash,
          ...input.metadata,
        },
      },
    });
  }

  async verifyChain(recordType: string, recordId: string): Promise<boolean> {
    const events = await this.prisma.recordIntegrityEvent.findMany({
      where: { recordType, recordId },
      orderBy: { occurredAt: 'asc' },
    });

    let priorHash: string | null = null;

    for (const event of events) {
      if (event.priorIntegrityEventHash !== priorHash) {
        return false;
      }

      const metadata = event.metadata as { payloadHash?: string } | null;
      const payloadHash = metadata?.payloadHash;
      if (!payloadHash) {
        return false;
      }

      const expected = chainIntegrityHash({
        priorHash,
        contentHash: payloadHash,
        eventType: event.eventType,
        occurredAt: event.occurredAt,
      });

      if (expected !== event.contentHash) {
        return false;
      }

      priorHash = event.contentHash;
    }

    return true;
  }

  updateEvent(): Promise<never> {
    return Promise.reject(
      new BadRequestException('Record integrity events are append-only and cannot be updated'),
    );
  }

  deleteEvent(): Promise<never> {
    return Promise.reject(
      new BadRequestException('Record integrity events are append-only and cannot be deleted'),
    );
  }
}
