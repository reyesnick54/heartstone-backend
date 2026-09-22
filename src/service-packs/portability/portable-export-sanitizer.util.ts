import { createHash } from 'node:crypto';

import { canonicalizeJson } from '../../service-catalog/service-packs/canonical-json.util';
import {
  PORTABLE_EXPORT_DATA_SECTION_KEYS,
  PORTABLE_EXPORT_FORBIDDEN_KEY_FRAGMENTS,
  PORTABLE_SECRET_REFERENCE_PREFIX,
} from '../service-packs.constants';

function isForbiddenKey(key: string): boolean {
  const normalized = key.toLowerCase();
  return PORTABLE_EXPORT_FORBIDDEN_KEY_FRAGMENTS.some((fragment) =>
    normalized.includes(fragment.toLowerCase()),
  );
}

function toSecretReference(path: string): string {
  const digest = createHash('sha256').update(path).digest('hex').slice(0, 16);
  return `${PORTABLE_SECRET_REFERENCE_PREFIX}${digest}`;
}

export function sanitizePortableExportPayload<T>(value: T, path = '$'): T {
  if (Array.isArray(value)) {
    const sanitizedItems: unknown[] = [];
    for (let index = 0; index < value.length; index += 1) {
      sanitizedItems.push(sanitizePortableExportPayload(value[index], `${path}[${String(index)}]`));
    }
    return sanitizedItems as T;
  }

  if (value !== null && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    const sanitized: Record<string, unknown> = {};

    for (const [key, nested] of Object.entries(record)) {
      if (
        PORTABLE_EXPORT_DATA_SECTION_KEYS.includes(
          key as (typeof PORTABLE_EXPORT_DATA_SECTION_KEYS)[number],
        )
      ) {
        continue;
      }

      if (isForbiddenKey(key)) {
        sanitized[key] = toSecretReference(`${path}.${key}`);
        continue;
      }

      sanitized[key] = sanitizePortableExportPayload(nested, `${path}.${key}`);
    }

    return sanitized as T;
  }

  if (typeof value === 'string' && value.length > 0) {
    if (/^-----BEGIN (RSA |EC )?PRIVATE KEY-----/.test(value)) {
      return toSecretReference(path) as T;
    }
  }

  return value;
}

export function assertPortableExportContainsNoForbiddenData(payload: unknown): void {
  const serialized = JSON.stringify(payload).toLowerCase();
  for (const fragment of PORTABLE_EXPORT_FORBIDDEN_KEY_FRAGMENTS) {
    if (serialized.includes(`"${fragment.toLowerCase()}"`)) {
      // Keys are stripped; values may still mention words in descriptions — only block obvious secret shapes.
      if (
        fragment.includes('password') ||
        fragment.includes('secret') ||
        fragment.includes('credential')
      ) {
        if (/"password"\s*:\s*"[^"]+"/i.test(serialized)) {
          throw new Error('Portable export contains forbidden credential material');
        }
      }
    }
  }

  for (const section of PORTABLE_EXPORT_DATA_SECTION_KEYS) {
    if (new RegExp(`"${section}"\\s*:\\s*\\[`).test(serialized)) {
      throw new Error(`Portable export contains forbidden data section "${section}"`);
    }
  }
}

export function computePortablePackageFingerprint(payload: unknown): string {
  return createHash('sha256').update(canonicalizeJson(payload)).digest('hex');
}
