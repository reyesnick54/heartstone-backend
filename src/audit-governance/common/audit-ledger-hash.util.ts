import { createHash } from 'node:crypto';

import { AUDIT_LEDGER_HASH_ALGORITHM } from '../audit-governance.constants';

export function stableJsonStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    return `[${value.map((item) => stableJsonStringify(item)).join(',')}]`;
  }

  const record = value as Record<string, unknown>;
  const keys = Object.keys(record).sort();
  return `{${keys.map((key) => `${JSON.stringify(key)}:${stableJsonStringify(record[key])}`).join(',')}}`;
}

export function hashAuditPayload(payload: Record<string, unknown>): string {
  return createHash('sha256').update(stableJsonStringify(payload)).digest('hex');
}

export function chainLedgerHash(input: {
  previousLedgerHash: string | null;
  payloadHash: string;
  ledgerStreamKey: string;
  sequenceNumber: bigint;
  eventType: string;
  occurredAt: Date;
}): string {
  const material = {
    algorithm: AUDIT_LEDGER_HASH_ALGORITHM,
    previousLedgerHash: input.previousLedgerHash,
    payloadHash: input.payloadHash,
    ledgerStreamKey: input.ledgerStreamKey,
    sequenceNumber: input.sequenceNumber.toString(),
    eventType: input.eventType,
    occurredAt: input.occurredAt.toISOString(),
  };

  return hashAuditPayload(material);
}
