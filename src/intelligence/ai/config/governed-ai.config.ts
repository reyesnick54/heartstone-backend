import { registerAs } from '@nestjs/config';

import { GOVERNED_AI_CONFIG_KEY } from '../governed-ai.constants';

export interface GovernedAiConfig {
  externalProviderEnabled: boolean;
  externalProviderCode: string | null;
  externalProviderSecretEnvKey: string | null;
  defaultPromptRetentionClass: string;
}

export default registerAs(GOVERNED_AI_CONFIG_KEY, (): GovernedAiConfig => {
  const enabled =
    process.env.AI_EXTERNAL_PROVIDER_ENABLED === 'true' ||
    process.env.AI_EXTERNAL_PROVIDER_ENABLED === '1';

  return {
    externalProviderEnabled: enabled,
    externalProviderCode: process.env.AI_EXTERNAL_PROVIDER_CODE?.trim() ?? null,
    externalProviderSecretEnvKey: process.env.AI_EXTERNAL_PROVIDER_SECRET_ENV_KEY?.trim() ?? null,
    defaultPromptRetentionClass:
      process.env.AI_PROMPT_RETENTION_CLASS?.trim() ?? 'GOVERNED_AUDIT_STANDARD',
  };
});
