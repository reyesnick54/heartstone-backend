import { AssuranceLevel } from '@prisma/client';

import { type AuthenticatedPrincipal } from '../../src/identity/auth/domain/authenticated-principal';

export function toDashboardActor(
  identityId: string,
  sessionId: string,
  userAccountId?: string | null,
): AuthenticatedPrincipal {
  return {
    sessionId,
    identityId,
    userAccountId: userAccountId ?? null,
    assuranceLevel: AssuranceLevel.MEDIUM,
  };
}
