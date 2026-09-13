import { createHash } from 'node:crypto';

export const RECORD_HASH_ALGORITHM = 'SHA-256';

export function hashRecordContent(payload: Record<string, unknown>): string {
  return createHash('sha256').update(JSON.stringify(payload)).digest('hex');
}

export function chainIntegrityHash(input: {
  priorHash: string | null;
  contentHash: string;
  eventType: string;
  occurredAt: Date;
}): string {
  const payload = {
    priorHash: input.priorHash,
    contentHash: input.contentHash,
    eventType: input.eventType,
    occurredAt: input.occurredAt.toISOString(),
  };

  return hashRecordContent(payload);
}
