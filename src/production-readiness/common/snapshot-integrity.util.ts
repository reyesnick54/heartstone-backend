import { createHash } from 'node:crypto';

export function hashSnapshotIntegrity(payload: Record<string, unknown>): string {
  const canonical = JSON.stringify(payload, Object.keys(payload).sort());
  return createHash('sha256').update(canonical).digest('hex');
}

export function hashManifestVerification(payload: Record<string, unknown>): string {
  const canonical = JSON.stringify(payload, Object.keys(payload).sort());
  return createHash('sha256').update(canonical).digest('hex');
}
