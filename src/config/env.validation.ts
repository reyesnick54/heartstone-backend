import * as Joi from 'joi';

export const envValidationSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test')
    .default('development'),
  PORT: Joi.number().port().default(3000),
  APP_NAME: Joi.string().default('heartstone-backend'),
  API_VERSION: Joi.string().default('v1'),
  BUILD_VERSION: Joi.string().allow('').optional(),
});
