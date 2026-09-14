import { createHash } from 'node:crypto';

export function hashCalculationIntegrity(payload: Record<string, unknown>): string {
  const canonical = JSON.stringify(payload, Object.keys(payload).sort());
  return createHash('sha256').update(canonical).digest('hex');
}
