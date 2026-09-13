import { randomBytes } from 'node:crypto';

export function generateReferenceNumber(prefix: string): string {
  const year = String(new Date().getUTCFullYear());
  const suffix = randomBytes(4).toString('hex').toUpperCase();
  return `${prefix}-${year}-${suffix}`;
}
