import { SENSITIVE_AUDIT_METADATA_KEY_PATTERN } from '../audit-governance.constants';

export function sanitizeAuditMetadata(
  metadata: Record<string, unknown> | undefined,
): Record<string, unknown> {
  if (!metadata) {
    return {};
  }

  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(metadata)) {
    if (SENSITIVE_AUDIT_METADATA_KEY_PATTERN.test(key)) {
      result[key] = '[REDACTED]';
      continue;
    }

    if (value && typeof value === 'object' && !Array.isArray(value)) {
      result[key] = sanitizeAuditMetadata(value as Record<string, unknown>);
      continue;
    }

    result[key] = value;
  }

  return result;
}
