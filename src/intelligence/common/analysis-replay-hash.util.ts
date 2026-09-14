import { createHash } from 'node:crypto';

export function computeAnalysisReplayHash(payload: Record<string, unknown>): string {
  const normalized = JSON.stringify(payload, Object.keys(payload).sort());
  return createHash('sha256').update(normalized).digest('hex');
}
