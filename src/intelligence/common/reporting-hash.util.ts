import { createHash } from 'node:crypto';

function sortKeys<T extends object>(obj: T): T {
  const sorted = Object.keys(obj)
    .sort()
    .reduce<Record<string, unknown>>((acc, key) => {
      acc[key] = (obj as Record<string, unknown>)[key];
      return acc;
    }, {});
  return sorted as T;
}

export function canonicalizeReportContent(content: Record<string, unknown>): string {
  return JSON.stringify(sortKeys(content));
}

export function hashReportContent(content: Record<string, unknown>): string {
  return createHash('sha256').update(canonicalizeReportContent(content)).digest('hex');
}
