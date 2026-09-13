import { randomBytes } from 'node:crypto';

export function generateDocumentNumber(prefix: string): string {
  const suffix = randomBytes(6).toString('hex').toUpperCase();
  const timestamp = Date.now().toString(36).toUpperCase();
  return `${prefix}-${timestamp}-${suffix}`;
}
