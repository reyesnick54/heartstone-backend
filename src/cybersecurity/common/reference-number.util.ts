import { randomBytes } from 'node:crypto';

export function generateCybersecurityReference(prefix: string): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const entropy = randomBytes(3).toString('hex').toUpperCase();
  return `${prefix}-${timestamp}-${entropy}`;
}
