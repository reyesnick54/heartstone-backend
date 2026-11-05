import { type AssuranceLevel, type AuthenticationMethodType } from '@prisma/client';

/**
 * Self-asserted profile claims from the identity provider. They are untrusted: they may only
 * prefill a newly provisioned person's name and flag possible duplicates for review. They are
 * never used to find, link or merge an existing HeartStone identity.
 */
export interface MappedOidcProfileClaims {
  givenName?: string;
  familyName?: string;
  name?: string;
  email?: string;
  emailVerified: boolean;
}

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
  profile?: MappedOidcProfileClaims;
}
