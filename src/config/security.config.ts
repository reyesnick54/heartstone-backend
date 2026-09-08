import { registerAs } from '@nestjs/config';
import { SECURITY_CONFIG, SecurityConfig } from './config.constants';

function parseBoolean(
  value: string | undefined,
  defaultValue: boolean,
): boolean {
  if (value === undefined || value.trim() === '') {
    return defaultValue;
  }

  return value === 'true' || value === '1';
}

function resolveCorsOrigins(
  nodeEnv: string,
  origins: string | undefined,
): string[] | boolean {
  const trimmed = origins?.trim() ?? '';

  if (trimmed === '*') {
    if (nodeEnv === 'production') {
      throw new Error('CORS_ORIGINS=* is not allowed in production');
    }

    return true;
  }

  if (trimmed.length > 0) {
    return trimmed
      .split(',')
      .map((origin) => origin.trim())
      .filter((origin) => origin.length > 0);
  }

  if (nodeEnv === 'development' || nodeEnv === 'test') {
    return ['http://localhost:3000', 'http://127.0.0.1:3000'];
  }

  return false;
}

export default registerAs(SECURITY_CONFIG, (): SecurityConfig => {
  const nodeEnv = process.env.NODE_ENV ?? 'development';

  return {
    cors: {
      enabled: parseBoolean(process.env.CORS_ENABLED, true),
      origins: resolveCorsOrigins(nodeEnv, process.env.CORS_ORIGINS),
      credentials: parseBoolean(process.env.CORS_CREDENTIALS, false),
    },
    bodyLimit: process.env.JSON_BODY_LIMIT?.trim() || '100kb',
    swaggerEnabled: parseBoolean(
      process.env.SWAGGER_ENABLED,
      nodeEnv !== 'production',
    ),
    trustProxy: parseBoolean(process.env.TRUST_PROXY, nodeEnv === 'production'),
  };
});
