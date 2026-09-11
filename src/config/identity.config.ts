import { registerAs } from '@nestjs/config';

import { IDENTITY_CONFIG, type IdentityConfig } from './config.constants';

function parseBoolean(value: string | undefined, defaultValue: boolean): boolean {
  if (value === undefined || value === '') {
    return defaultValue;
  }

  return value === 'true' || value === '1';
}

export default registerAs(IDENTITY_CONFIG, (): IdentityConfig => {
  const nodeEnv = process.env.NODE_ENV ?? 'development';
  const localPasswordDefault = nodeEnv === 'development' || nodeEnv === 'test';

  return {
    sessionTtlSeconds: parseInt(process.env.SESSION_TTL_SECONDS ?? '3600', 10),
    sessionTokenBytes: parseInt(process.env.SESSION_TOKEN_BYTES ?? '32', 10),
    sessionRenewalThresholdSeconds: parseInt(
      process.env.SESSION_RENEWAL_THRESHOLD_SECONDS ?? '900',
      10,
    ),
    localPasswordAuthEnabled: parseBoolean(
      process.env.AUTH_LOCAL_PASSWORD_ENABLED,
      localPasswordDefault,
    ),
  };
});
