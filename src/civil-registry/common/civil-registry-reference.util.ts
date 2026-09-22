import { randomBytes } from 'node:crypto';

export function buildCivilReference(prefix: string): string {
  const suffix = randomBytes(5).toString('hex').toUpperCase();
  return `${prefix}-${suffix}`;
}
