import { createHash } from 'node:crypto';

export function hashDocumentContent(content: Buffer): string {
  return createHash('sha256').update(content).digest('hex');
}
