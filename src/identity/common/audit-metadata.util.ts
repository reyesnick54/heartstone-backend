const SENSITIVE_KEY_PATTERN =
  /(password|secret|token|bearer|authorization|credential|api[-_]?key)/i;

export function sanitizeAuditMetadata(
  metadata: Record<string, unknown> | undefined,
): Record<string, unknown> | undefined {
  if (!metadata) {
    return undefined;
  }

  const sanitized: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(metadata)) {
    if (SENSITIVE_KEY_PATTERN.test(key)) {
      sanitized[key] = '[REDACTED]';
      continue;
    }

    if (value && typeof value === 'object' && !Array.isArray(value)) {
      sanitized[key] = sanitizeAuditMetadata(value as Record<string, unknown>);
      continue;
    }

    sanitized[key] = value;
  }

  return sanitized;
}
