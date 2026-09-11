export const APP_CONFIG = 'app';
export const SECURITY_CONFIG = 'security';
export const IDENTITY_CONFIG = 'identity';

export interface AppConfig {
  name: string;
  port: number;
  nodeEnv: string;
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

export const OIDC_CONFIG = 'oidc';

export interface IdentityConfig {
  sessionTtlSeconds: number;
  sessionTokenBytes: number;
  serviceCredentialPepper: string;
}

export interface OidcProviderConfig {
  code: string;
  name: string;
  issuer: string;
  audience: string;
  jwksUri: string;
  allowedAlgorithms: string[];
  clockToleranceSeconds?: number;
}

export interface OidcConfig {
  enabled: boolean;
  providers: OidcProviderConfig[];
}
