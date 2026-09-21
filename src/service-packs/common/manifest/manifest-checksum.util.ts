import { createHash } from 'node:crypto';

export function computeManifestChecksum(payload: unknown): string {
  const normalized = JSON.stringify(payload);
  return createHash('sha256').update(normalized).digest('hex');
}
