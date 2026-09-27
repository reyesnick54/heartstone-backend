import { Injectable } from '@nestjs/common';
import { IdentityType, type Session } from '@prisma/client';

import { type AuthenticatedPrincipal } from '../domain/authenticated-principal';

type SessionWithIdentity = Session & {
  identity?: { type: IdentityType };
};

@Injectable()
export class IdentityResolutionService {
  resolveFromSession(session: SessionWithIdentity): AuthenticatedPrincipal {
    const identityType = session.identity?.type ?? IdentityType.INDIVIDUAL;

    return {
      sessionId: session.id,
      identityId: session.identityId,
      userAccountId: session.userAccountId,
      assuranceLevel: session.assuranceLevel,
      authMethod: session.authMethod,
      mfaSatisfied: session.mfaSatisfied,
      authenticatedAt: session.authenticatedAt,
      oidcProviderCode: session.oidcProviderCode,
      identityType,
      isServicePrincipal: identityType === IdentityType.SERVICE,
    };
  }
}
