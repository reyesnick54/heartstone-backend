import { enforcesProductionProviderGates, resolveDeploymentTier } from './deployment-tier';
import { envValidationSchema } from './env.validation';

function validationMessage(env: Record<string, string>): string {
  const { error } = envValidationSchema.validate(env);
  const context = error?.details[0]?.context as { message?: string } | undefined;
  return context?.message ?? error?.message ?? '';
}

describe('deployment tier', () => {
  it('defaults to production under NODE_ENV=production and local otherwise', () => {
    expect(resolveDeploymentTier({ NODE_ENV: 'production' })).toBe('production');
    expect(resolveDeploymentTier({ NODE_ENV: 'development' })).toBe('local');
    expect(
      resolveDeploymentTier({ NODE_ENV: 'production', HEARTSTONE_DEPLOYMENT_TIER: 'staging' }),
    ).toBe('staging');
  });

  it('ignores unknown tier values rather than relaxing gates', () => {
    expect(
      resolveDeploymentTier({ NODE_ENV: 'production', HEARTSTONE_DEPLOYMENT_TIER: 'demo' }),
    ).toBe('production');
  });

  it('enforces provider gates only for the production tier', () => {
    expect(
      enforcesProductionProviderGates({ nodeEnv: 'production', deploymentTier: 'production' }),
    ).toBe(true);
    expect(enforcesProductionProviderGates({ nodeEnv: 'production' })).toBe(true);
    expect(
      enforcesProductionProviderGates({ nodeEnv: 'production', deploymentTier: 'staging' }),
    ).toBe(false);
    expect(
      enforcesProductionProviderGates({ nodeEnv: 'development', deploymentTier: 'local' }),
    ).toBe(false);
  });

  it('rejects a staging or production tier outside NODE_ENV=production', () => {
    expect(
      validationMessage({ NODE_ENV: 'development', HEARTSTONE_DEPLOYMENT_TIER: 'staging' }),
    ).toContain('requires NODE_ENV=production');
  });

  it('keeps production security rules in staging', () => {
    expect(
      validationMessage({
        NODE_ENV: 'production',
        HEARTSTONE_DEPLOYMENT_TIER: 'staging',
        AUTH_LOCAL_PASSWORD_ENABLED: 'true',
        SERVICE_CREDENTIAL_PEPPER: 'a-very-long-pepper-value',
      }),
    ).toContain('AUTH_LOCAL_PASSWORD_ENABLED=true is not allowed');
  });
});
