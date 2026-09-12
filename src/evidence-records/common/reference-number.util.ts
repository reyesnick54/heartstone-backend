import { createHash, randomBytes } from 'node:crypto';

export function generateEvidenceReferenceNumber(prefix: string): string {
  const year = String(new Date().getUTCFullYear());
  const suffix = randomBytes(4).toString('hex').toUpperCase();
  return `${prefix}-${year}-${suffix}`;
}

export function hashContent(content: string): string {
  return createHash('sha256').update(content).digest('hex');
}
