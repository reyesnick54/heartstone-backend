import {
  type AssuranceLevel,
  type AuthenticationMethodType,
  type IdentityType,
} from '@prisma/client';

/**
 * Technical actor identity for authenticated requests.
 * Contains only identity/access facts — never legal authority conclusions.
 */
export interface AuthenticatedPrincipal {
  sessionId: string;
  identityId: string;
  userAccountId?: string | null;
  assuranceLevel: AssuranceLevel;
  authMethod?: AuthenticationMethodType;
  mfaSatisfied?: boolean;
  authenticatedAt?: Date;
  oidcProviderCode?: string | null;
  identityType?: IdentityType;
  isServicePrincipal?: boolean;
}
