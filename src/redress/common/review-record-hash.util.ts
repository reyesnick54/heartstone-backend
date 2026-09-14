import { createHash } from 'node:crypto';

export function hashReviewRecordManifest(manifest: Record<string, unknown>): string {
  const serialized = JSON.stringify(manifest, Object.keys(manifest).sort());
  return createHash('sha256').update(serialized).digest('hex');
}
