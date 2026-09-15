import { createHash } from 'node:crypto';

export function hashDossierContent(content: Record<string, unknown>): string {
  const normalized = JSON.stringify(content, Object.keys(content).sort());
  return createHash('sha256').update(normalized).digest('hex');
}
