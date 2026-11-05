import { envValidationSchema } from './env.validation';

describe('envValidationSchema production identity fail-closed', () => {
  it('rejects production without OIDC enabled', () => {
    const { error } = envValidationSchema.validate({
      NODE_ENV: 'production',
      OIDC_ENABLED: 'false',
      SERVICE_CREDENTIAL_PEPPER: 'production-pepper-value',
    });

    expect(error).toBeDefined();
    expect(JSON.stringify(error)).toContain('OIDC_ENABLED=true is required');
  });

  it('rejects local password auth in production', () => {
    const { error } = envValidationSchema.validate({
      NODE_ENV: 'production',
      OIDC_ENABLED: 'true',
      OIDC_PROVIDERS_JSON: JSON.stringify([
        {
          code: 'idp',
          name: 'IdP',
          issuer: 'https://issuer.example',
          audience: 'api',
          jwksUri: 'https://issuer.example/jwks',
          allowedAlgorithms: ['RS256'],
        },
      ]),
      AUTH_LOCAL_PASSWORD_ENABLED: 'true',
      SERVICE_CREDENTIAL_PEPPER: 'production-pepper-value',
    });

    expect(error).toBeDefined();
    expect(JSON.stringify(error)).toContain('AUTH_LOCAL_PASSWORD_ENABLED=true is not allowed');
  });
});

describe('envValidationSchema OIDC provisioning settings', () => {
  const baseProvider = {
    code: 'idp',
    name: 'IdP',
    issuer: 'https://issuer.example',
    audience: 'api',
    jwksUri: 'https://issuer.example/jwks',
    allowedAlgorithms: ['RS256'],
  };

  function validateWith(provider: Record<string, unknown>) {
    return envValidationSchema.validate({
      NODE_ENV: 'test',
      OIDC_ENABLED: 'true',
      OIDC_PROVIDERS_JSON: JSON.stringify([provider]),
    });
  }

  it('accepts providers without a provisioning block', () => {
    expect(validateWith(baseProvider).error).toBeUndefined();
  });

  it('accepts citizen self-service provisioning', () => {
    const { error } = validateWith({
      ...baseProvider,
      provisioning: { citizenSelfService: true },
    });
    expect(error).toBeUndefined();
  });

  it('rejects a non-boolean citizenSelfService', () => {
    const { error } = validateWith({
      ...baseProvider,
      provisioning: { citizenSelfService: 'true' },
    });
    expect(JSON.stringify(error)).toContain('provisioning.citizenSelfService must be a boolean');
  });

  it('rejects unknown provisioning settings so officials cannot be auto-provisioned by typo', () => {
    const { error } = validateWith({
      ...baseProvider,
      provisioning: { officialSelfService: true },
    });
    expect(JSON.stringify(error)).toContain('provisioning.officialSelfService is not a recognised');
  });

  it('rejects a provisioning value that is not an object', () => {
    const { error } = validateWith({ ...baseProvider, provisioning: true });
    expect(JSON.stringify(error)).toContain('provisioning must be an object');
  });
});
