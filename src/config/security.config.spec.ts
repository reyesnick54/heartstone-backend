import securityConfig from './security.config';

describe('security.config', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('uses localhost defaults for CORS in development', () => {
    process.env.NODE_ENV = 'development';
    delete process.env.CORS_ORIGINS;

    const config = securityConfig();

    expect(config.cors.enabled).toBe(true);
    expect(config.cors.origins).toEqual([
      'http://localhost:3000',
      'http://127.0.0.1:3000',
    ]);
  });

  it('disables swagger by default in production', () => {
    process.env.NODE_ENV = 'production';
    delete process.env.SWAGGER_ENABLED;

    const config = securityConfig();

    expect(config.swaggerEnabled).toBe(false);
  });

  it('parses comma-separated CORS origins', () => {
    process.env.NODE_ENV = 'production';
    process.env.CORS_ORIGINS =
      'https://app.example.gov, https://admin.example.gov';

    const config = securityConfig();

    expect(config.cors.origins).toEqual([
      'https://app.example.gov',
      'https://admin.example.gov',
    ]);
  });
});
