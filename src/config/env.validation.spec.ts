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
