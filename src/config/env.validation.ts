import * as Joi from 'joi';

interface ValidatedEnvironment {
  NODE_ENV: string;
  CORS_ORIGINS?: string;
  CORS_ENABLED?: string;
}

export const envValidationSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test')
    .default('development'),
  PORT: Joi.number().port().default(3000),
  APP_NAME: Joi.string().default('heartstone-backend'),
  API_VERSION: Joi.string().default('v1'),
  BUILD_VERSION: Joi.string().allow('').optional(),
  CORS_ENABLED: Joi.string()
    .valid('true', 'false', '1', '0', '')
    .default('true'),
  CORS_ORIGINS: Joi.string().allow('').default(''),
  CORS_CREDENTIALS: Joi.string()
    .valid('true', 'false', '1', '0', '')
    .default('false'),
  JSON_BODY_LIMIT: Joi.string()
    .pattern(/^\d+(b|kb|mb|gb)$/i)
    .default('100kb'),
  SWAGGER_ENABLED: Joi.string().valid('true', 'false', '1', '0', '').optional(),
  TRUST_PROXY: Joi.string().valid('true', 'false', '1', '0', '').optional(),
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

  return value as ValidatedEnvironment;
});
