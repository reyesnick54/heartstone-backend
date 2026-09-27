import * as Joi from 'joi';

interface OidcProviderEnvShape {
  code: string;
  name: string;
  issuer: string;
  audience: string;
  jwksUri: string;
  allowedAlgorithms: string[];
  clockToleranceSeconds?: number;
}

interface ValidatedEnvironment {
  NODE_ENV: string;
  CORS_ORIGINS?: string;
  CORS_ENABLED?: string;
  OIDC_ENABLED?: string;
  OIDC_PROVIDERS_JSON?: string;
  SERVICE_CREDENTIAL_PEPPER?: string;
  AUTH_LOCAL_PASSWORD_ENABLED?: string;
}

function parseBooleanEnv(value: string | undefined): boolean {
  return value === 'true' || value === '1';
}

function validateOidcProvidersJson(oidcProvidersJson: string): string | null {
  try {
    const providers = JSON.parse(oidcProvidersJson) as OidcProviderEnvShape[];
    if (!Array.isArray(providers) || providers.length === 0) {
      return 'OIDC_PROVIDERS_JSON must be a non-empty JSON array';
    }

    for (const provider of providers) {
      if (
        !provider.code ||
        !provider.issuer ||
        !provider.audience ||
        !provider.jwksUri ||
        !Array.isArray(provider.allowedAlgorithms) ||
        provider.allowedAlgorithms.length === 0
      ) {
        return 'Each OIDC provider requires code, issuer, audience, jwksUri, and allowedAlgorithms';
      }
    }

    return null;
  } catch {
    return 'OIDC_PROVIDERS_JSON must be valid JSON';
  }
}

export const envValidationSchema = Joi.object({
  NODE_ENV: Joi.string().valid('development', 'production', 'test').default('development'),
  PORT: Joi.number().port().default(3000),
  APP_NAME: Joi.string().default('heartstone-backend'),
  API_VERSION: Joi.string().default('v1'),
  BUILD_VERSION: Joi.string().allow('').optional(),
  CORS_ENABLED: Joi.string().valid('true', 'false', '1', '0', '').default('true'),
  CORS_ORIGINS: Joi.string().allow('').default(''),
  CORS_CREDENTIALS: Joi.string().valid('true', 'false', '1', '0', '').default('false'),
  JSON_BODY_LIMIT: Joi.string()
    .pattern(/^\d+(b|kb|mb|gb)$/i)
    .default('100kb'),
  SWAGGER_ENABLED: Joi.string().valid('true', 'false', '1', '0', '').optional(),
  TRUST_PROXY: Joi.string().valid('true', 'false', '1', '0', '').optional(),
  SESSION_TTL_SECONDS: Joi.number().integer().min(60).max(86400).default(3600),
  SESSION_ABSOLUTE_TTL_SECONDS: Joi.number().integer().min(60).max(604800).default(43200),
  SESSION_IDLE_TIMEOUT_SECONDS: Joi.number().integer().min(60).max(86400).default(1800),
  SESSION_TOKEN_BYTES: Joi.number().integer().min(16).max(64).default(32),
  SESSION_RENEWAL_THRESHOLD_SECONDS: Joi.number().integer().min(0).max(43200).default(900),
  MAX_ACTIVE_SESSIONS_PER_ACCOUNT: Joi.number().integer().min(1).max(100).default(10),
  AUTH_LOCKOUT_MAX_ATTEMPTS: Joi.number().integer().min(1).max(50).default(5),
  AUTH_LOCKOUT_DURATION_SECONDS: Joi.number().integer().min(60).max(86400).default(900),
  STEP_UP_MAX_AUTHENTICATION_AGE_SECONDS: Joi.number().integer().min(60).max(86400).default(900),
  OIDC_ENABLED: Joi.string().valid('true', 'false', '1', '0', '').default('false'),
  OIDC_PROVIDERS_JSON: Joi.string().allow('').default(''),
  SERVICE_CREDENTIAL_PEPPER: Joi.when('NODE_ENV', {
    is: 'production',
    then: Joi.string().min(16).required(),
    otherwise: Joi.string().min(16).empty('').default('test-pepper-not-production'),
  }),
  AUTH_LOCAL_PASSWORD_ENABLED: Joi.string().valid('true', 'false', '1', '0', '').optional(),
}).custom((value, helpers) => {
  const env = value as ValidatedEnvironment;
  const nodeEnv = env.NODE_ENV;
  const corsOrigins = env.CORS_ORIGINS?.trim() ?? '';
  const corsEnabled = parseBooleanEnv(env.CORS_ENABLED);

  if (nodeEnv === 'production' && corsEnabled && corsOrigins === '*') {
    return helpers.error('any.custom', {
      message: 'CORS_ORIGINS=* is not allowed when NODE_ENV=production',
    });
  }

  const localPasswordEnabled = parseBooleanEnv(env.AUTH_LOCAL_PASSWORD_ENABLED);

  if (nodeEnv === 'production' && localPasswordEnabled) {
    return helpers.error('any.custom', {
      message: 'AUTH_LOCAL_PASSWORD_ENABLED=true is not allowed when NODE_ENV=production',
    });
  }

  const oidcEnabled = parseBooleanEnv(env.OIDC_ENABLED);
  const oidcProvidersJson = env.OIDC_PROVIDERS_JSON?.trim() ?? '';

  if (oidcEnabled) {
    if (!oidcProvidersJson) {
      return helpers.error('any.custom', {
        message: 'OIDC_PROVIDERS_JSON is required when OIDC_ENABLED=true',
      });
    }

    const providerError = validateOidcProvidersJson(oidcProvidersJson);
    if (providerError) {
      return helpers.error('any.custom', { message: providerError });
    }
  }

  if (nodeEnv === 'production' && !oidcEnabled) {
    return helpers.error('any.custom', {
      message: 'OIDC_ENABLED=true is required when NODE_ENV=production',
    });
  }

  if (nodeEnv === 'production' && oidcEnabled && !oidcProvidersJson) {
    return helpers.error('any.custom', {
      message: 'OIDC_PROVIDERS_JSON is required in production when OIDC is enabled',
    });
  }

  if (nodeEnv !== 'production') {
    const pepper = env.SERVICE_CREDENTIAL_PEPPER?.trim() ?? '';
    if (!pepper) {
      (
        env as ValidatedEnvironment & { SERVICE_CREDENTIAL_PEPPER: string }
      ).SERVICE_CREDENTIAL_PEPPER = 'test-pepper-not-production';
    }
  }

  return value as ValidatedEnvironment;
});
