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
  SESSION_TOKEN_BYTES: Joi.number().integer().min(16).max(64).default(32),
  OIDC_ENABLED: Joi.string().valid('true', 'false', '1', '0', '').default('false'),
  OIDC_PROVIDERS_JSON: Joi.string().allow('').default(''),
  SERVICE_CREDENTIAL_PEPPER: Joi.when('NODE_ENV', {
    is: 'production',
    then: Joi.string().min(16).required(),
    otherwise: Joi.string().min(16).default('test-pepper-not-production'),
  }),
  SESSION_RENEWAL_THRESHOLD_SECONDS: Joi.number().integer().min(0).max(43200).default(900),
  AUTH_LOCAL_PASSWORD_ENABLED: Joi.string().valid('true', 'false', '1', '0', '').optional(),
}).custom((value, helpers) => {
  const env = value as ValidatedEnvironment;
  const nodeEnv = env.NODE_ENV;
  const corsOrigins = env.CORS_ORIGINS?.trim() ?? '';
  const corsEnabled = env.CORS_ENABLED === 'true' || env.CORS_ENABLED === '1';

  if (nodeEnv === 'production' && corsEnabled && corsOrigins === '*') {
    return helpers.error('any.custom', {
      message: 'CORS_ORIGINS=* is not allowed when NODE_ENV=production',
    });
  }

  const oidcEnabled = env.OIDC_ENABLED === 'true' || env.OIDC_ENABLED === '1';
  const oidcProvidersJson = env.OIDC_PROVIDERS_JSON?.trim() ?? '';

  if (oidcEnabled) {
    if (!oidcProvidersJson) {
      return helpers.error('any.custom', {
        message: 'OIDC_PROVIDERS_JSON is required when OIDC_ENABLED=true',
      });
    }

    try {
      const providers = JSON.parse(oidcProvidersJson) as OidcProviderEnvShape[];
      if (!Array.isArray(providers) || providers.length === 0) {
        return helpers.error('any.custom', {
          message: 'OIDC_PROVIDERS_JSON must be a non-empty JSON array',
        });
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
          return helpers.error('any.custom', {
            message:
              'Each OIDC provider requires code, issuer, audience, jwksUri, and allowedAlgorithms',
          });
        }
      }
    } catch {
      return helpers.error('any.custom', {
        message: 'OIDC_PROVIDERS_JSON must be valid JSON',
      });
    }
  const localPasswordEnabled =
    env.AUTH_LOCAL_PASSWORD_ENABLED === 'true' || env.AUTH_LOCAL_PASSWORD_ENABLED === '1';

  if (nodeEnv === 'production' && localPasswordEnabled) {
    return helpers.error('any.custom', {
      message: 'AUTH_LOCAL_PASSWORD_ENABLED=true is not allowed when NODE_ENV=production',
    });
  }

  return value as ValidatedEnvironment;
});
