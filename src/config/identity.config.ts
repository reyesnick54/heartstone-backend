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
    sessionAbsoluteTtlSeconds: parseInt(process.env.SESSION_ABSOLUTE_TTL_SECONDS ?? '43200', 10),
    sessionIdleTimeoutSeconds: parseInt(process.env.SESSION_IDLE_TIMEOUT_SECONDS ?? '1800', 10),
    sessionTokenBytes: parseInt(process.env.SESSION_TOKEN_BYTES ?? '32', 10),
    sessionRenewalThresholdSeconds: parseInt(
      process.env.SESSION_RENEWAL_THRESHOLD_SECONDS ?? '900',
      10,
    ),
    maxActiveSessionsPerAccount: parseInt(process.env.MAX_ACTIVE_SESSIONS_PER_ACCOUNT ?? '10', 10),
    localPasswordAuthEnabled: parseBoolean(
      process.env.AUTH_LOCAL_PASSWORD_ENABLED,
      localPasswordDefault,
    ),
    lockoutMaxAttempts: parseInt(process.env.AUTH_LOCKOUT_MAX_ATTEMPTS ?? '5', 10),
    lockoutDurationSeconds: parseInt(process.env.AUTH_LOCKOUT_DURATION_SECONDS ?? '900', 10),
    stepUpMaxAuthenticationAgeSeconds: parseInt(
      process.env.STEP_UP_MAX_AUTHENTICATION_AGE_SECONDS ?? '900',
      10,
    ),
    serviceCredentialPepper:
      process.env.SERVICE_CREDENTIAL_PEPPER ??
      (nodeEnv === 'production' ? '' : 'test-pepper-not-production'),
  };
});
