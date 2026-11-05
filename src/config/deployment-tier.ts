/**
 * Where this backend is deployed. Separate from NODE_ENV, which selects security behaviour.
 *
 * - `local`: developer machines and CI.
 * - `staging`: production security settings (OIDC only, no password login) with synthetic data.
 *   Sandbox providers for payments, email, SMS, signing, malware scanning and AI are allowed and
 *   reported as test-only. Nothing issued in staging is authoritative.
 * - `production`: every provider gate is enforced at startup.
 */
export type DeploymentTier = 'local' | 'staging' | 'production';

export const DEPLOYMENT_TIERS: readonly DeploymentTier[] = ['local', 'staging', 'production'];

export function resolveDeploymentTier(env: NodeJS.ProcessEnv = process.env): DeploymentTier {
  const explicit = env.HEARTSTONE_DEPLOYMENT_TIER?.trim();
  if (explicit && (DEPLOYMENT_TIERS as readonly string[]).includes(explicit)) {
    return explicit as DeploymentTier;
  }
  return env.NODE_ENV === 'production' ? 'production' : 'local';
}

/** True only when provider startup gates must refuse sandbox adapters. */
export function enforcesProductionProviderGates(app: {
  nodeEnv: string;
  deploymentTier?: DeploymentTier;
}): boolean {
  return app.nodeEnv === 'production' && (app.deploymentTier ?? 'production') === 'production';
}
