import { type AssuranceLevel, type AuthenticationMethodType } from '@prisma/client';

export interface MappedOidcClaims {
  issuer: string;
  subject: string;
  audience: string | string[];
  providerCode: string;
  authenticationMethod: AuthenticationMethodType;
  authenticatedAt: Date;
  assuranceLevel: AssuranceLevel;
  mfaSatisfied: boolean;
  amr: string[];
  acr?: string;
  externalContext: Record<string, unknown>;
}
