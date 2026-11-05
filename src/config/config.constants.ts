import { type DeploymentTier } from './deployment-tier';

export const APP_CONFIG = 'app';
export const SECURITY_CONFIG = 'security';
export const IDENTITY_CONFIG = 'identity';
export const OIDC_CONFIG = 'oidc';

export interface AppConfig {
  name: string;
  port: number;
  nodeEnv: string;
  /** See src/config/deployment-tier.ts. */
  deploymentTier: DeploymentTier;
  apiVersion: string;
  buildVersion: string | null;
}

export interface SecurityConfig {
  cors: {
    enabled: boolean;
    origins: string[] | boolean;
    credentials: boolean;
  };
  bodyLimit: string;
  swaggerEnabled: boolean;
  trustProxy: boolean;
}

/**
 * Governed just-in-time provisioning for an OIDC provider. Absent or false means an external
 * subject must already be linked to a HeartStone identity by an administrator.
 */
export interface OidcProviderProvisioningConfig {
  /**
   * When true, a first login for an unlinked subject creates a new Person, UserAccount and
   * INDIVIDUAL Identity with no roles, offices, memberships or representative authority.
   */
  citizenSelfService: boolean;
}

export interface OidcProviderConfig {
  code: string;
  name: string;
  issuer: string;
  audience: string;
  jwksUri: string;
  allowedAlgorithms: string[];
  clockToleranceSeconds?: number;
  provisioning?: OidcProviderProvisioningConfig;
}

export interface OidcConfig {
  enabled: boolean;
  providers: OidcProviderConfig[];
}

export interface IdentityConfig {
  sessionTtlSeconds: number;
  sessionAbsoluteTtlSeconds: number;
  sessionIdleTimeoutSeconds: number;
  sessionTokenBytes: number;
  sessionRenewalThresholdSeconds: number;
  maxActiveSessionsPerAccount: number;
  localPasswordAuthEnabled: boolean;
  lockoutMaxAttempts: number;
  lockoutDurationSeconds: number;
  stepUpMaxAuthenticationAgeSeconds: number;
  serviceCredentialPepper: string;
}
