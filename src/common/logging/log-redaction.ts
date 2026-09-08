const SENSITIVE_KEY_PATTERN =
  /(password|secret|token|authorization|api[_-]?key|cookie|credential|private[_-]?key)/i;

export const PINO_REDACT_PATHS = [
  'req.headers.authorization',
  'req.headers.cookie',
  'req.headers["x-api-key"]',
  'req.headers["x-auth-token"]',
  'req.headers["set-cookie"]',
  'res.headers["set-cookie"]',
  'password',
  'secret',
  'token',
  'authorization',
  'apiKey',
  'api_key',
  'accessToken',
  'refreshToken',
  '*.password',
  '*.secret',
  '*.token',
  '*.authorization',
  '*.apiKey',
  '*.api_key',
  '*.accessToken',
  '*.refreshToken',
] as const;

export const REDACTED_VALUE = '[REDACTED]';

export function redactSensitiveValue(key: string, value: unknown): unknown {
  if (value === null || value === undefined) {
    return value;
  }

  if (SENSITIVE_KEY_PATTERN.test(key)) {
    return REDACTED_VALUE;
  }

  if (typeof value === 'string' && looksLikeSecretValue(value)) {
    return REDACTED_VALUE;
  }

  if (Array.isArray(value)) {
    return value.map((item, index) =>
      redactSensitiveValue(`${key}[${index}]`, item),
    );
  }

  if (typeof value === 'object') {
    return redactSensitiveObject(value as Record<string, unknown>);
  }

  return value;
}

export function redactSensitiveObject(
  input: Record<string, unknown>,
): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(input).map(([key, value]) => [
      key,
      redactSensitiveValue(key, value),
    ]),
  );
}

function looksLikeSecretValue(value: string): boolean {
  const trimmed = value.trim();

  if (trimmed.length === 0) {
    return false;
  }

  if (/^Bearer\s+/i.test(trimmed)) {
    return true;
  }

  if (/^Basic\s+/i.test(trimmed)) {
    return true;
  }

  return trimmed.length >= 24 && /^[A-Za-z0-9._\-+/=]+$/.test(trimmed);
}
