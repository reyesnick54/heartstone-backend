import { AUTHORITY_SECRET_FIELD_NAMES } from './authority.constants';

function isSecretKey(key: string): boolean {
  const normalized = key.toLowerCase();
  return AUTHORITY_SECRET_FIELD_NAMES.some((field) => normalized.includes(field.toLowerCase()));
}

export function sanitizeContextReference(contextReference: string): string {
  try {
    const parsed: unknown = JSON.parse(contextReference);
    return JSON.stringify(sanitizeEvaluationData(parsed));
  } catch {
    return contextReference;
  }
}

export function sanitizeEvaluationData<T>(value: T): T {
  if (value === null || value === undefined) {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map((item: unknown) => sanitizeEvaluationData(item)) as T;
  }

  if (typeof value !== 'object') {
    return value;
  }

  const sanitized: Record<string, unknown> = {};
  for (const [key, nestedValue] of Object.entries(value as Record<string, unknown>)) {
    if (isSecretKey(key)) {
      sanitized[key] = '[REDACTED]';
      continue;
    }
    sanitized[key] = sanitizeEvaluationData(nestedValue);
  }

  return sanitized as T;
}
