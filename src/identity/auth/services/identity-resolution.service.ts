import { Injectable } from '@nestjs/common';
import { type Session } from '@prisma/client';

import { type AuthenticatedPrincipal } from '../domain/authenticated-principal';

@Injectable()
export class IdentityResolutionService {
  resolveFromSession(session: Session): AuthenticatedPrincipal {
    return {
      sessionId: session.id,
      identityId: session.identityId,
      userAccountId: session.userAccountId,
      assuranceLevel: session.assuranceLevel,
    };
  }
}
