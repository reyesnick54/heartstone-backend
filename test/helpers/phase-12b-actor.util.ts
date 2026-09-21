import { randomUUID } from 'node:crypto';

import { AssuranceLevel } from '@prisma/client';

import { type AuthenticatedPrincipal } from '../../src/identity/auth/domain/authenticated-principal';

export function toDashboardActor(
  identityId: string,
  userAccountId?: string,
): AuthenticatedPrincipal {
  return {
    sessionId: randomUUID(),
    identityId,
    userAccountId: userAccountId ?? null,
    assuranceLevel: AssuranceLevel.MEDIUM,
  };
}
