import { createHash } from 'node:crypto';

export function checksumJson(value: unknown): string {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex');
}
