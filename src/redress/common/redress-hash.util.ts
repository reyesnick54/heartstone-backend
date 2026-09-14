import { createHash } from 'node:crypto';

export function hashRedressDecisionSnapshot(input: Record<string, unknown>): string {
  return createHash('sha256').update(JSON.stringify(input), 'utf8').digest('hex');
}
