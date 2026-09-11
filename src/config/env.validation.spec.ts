import { envValidationSchema } from './env.validation';

describe('envValidationSchema', () => {
  it('accepts default test configuration without OIDC', () => {
    const result = envValidationSchema.validate({
      NODE_ENV: 'test',
    });

    expect(result.error).toBeUndefined();
    const value = result.value as { OIDC_ENABLED: string; SERVICE_CREDENTIAL_PEPPER: string };
    expect(value.OIDC_ENABLED).toBe('false');
    expect(value.SERVICE_CREDENTIAL_PEPPER).toBe('test-pepper-not-production');
  });

  it('requires OIDC_PROVIDERS_JSON when OIDC is enabled', () => {
    const result = envValidationSchema.validate({
      NODE_ENV: 'test',
      OIDC_ENABLED: 'true',
      OIDC_PROVIDERS_JSON: '',
    });

    expect(result.error).toBeDefined();
    const message =
      (result.error?.details[0]?.context as { message?: string } | undefined)?.message ??
      result.error?.message;
    expect(message).toContain('OIDC_PROVIDERS_JSON is required');
  });

  it('validates OIDC provider configuration shape', () => {
    const providers = JSON.stringify([
      {
        code: 'gov-idp',
        name: 'Government IdP',
        issuer: 'https://idp.example',
        audience: 'heartstone-api',
        jwksUri: 'https://idp.example/jwks',
        allowedAlgorithms: ['RS256'],
      },
    ]);

    const result = envValidationSchema.validate({
      NODE_ENV: 'test',
      OIDC_ENABLED: 'true',
      OIDC_PROVIDERS_JSON: providers,
    });

    expect(result.error).toBeUndefined();
    const value = result.value as { OIDC_PROVIDERS_JSON: string };
    expect(value.OIDC_PROVIDERS_JSON).toBe(providers);
  });

  it('rejects incomplete OIDC provider configuration', () => {
    const providers = JSON.stringify([{ code: 'incomplete' }]);

    const result = envValidationSchema.validate({
      NODE_ENV: 'test',
      OIDC_ENABLED: 'true',
      OIDC_PROVIDERS_JSON: providers,
    });

    expect(result.error).toBeDefined();
    const message =
      (result.error?.details[0]?.context as { message?: string } | undefined)?.message ??
      result.error?.message;
    expect(message).toContain('allowedAlgorithms');
  });
});
