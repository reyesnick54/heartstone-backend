import { registerAs } from '@nestjs/config';

import { OIDC_CONFIG, type OidcConfig, type OidcProviderConfig } from './config.constants';

function parseOidcProviders(raw: string | undefined): OidcProviderConfig[] {
  if (!raw?.trim()) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw) as OidcProviderConfig[];
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed;
  } catch {
    return [];
  }
}

export default registerAs(OIDC_CONFIG, (): OidcConfig => ({
  enabled: process.env.OIDC_ENABLED === 'true' || process.env.OIDC_ENABLED === '1',
  providers: parseOidcProviders(process.env.OIDC_PROVIDERS_JSON),
}));
