import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';

import { ActorContextService } from '../context/actor-context.service';
import {
  type ActorContext,
  normalizeActorGuardRequestPath,
} from '../context/actor-context.types';

/**
 * Rejects requests where the client attempts to substitute identity fields
 * that must be derived exclusively from the authenticated session.
 */
@Injectable()
export class ClientIdentitySubstitutionGuard implements CanActivate {
  constructor(private readonly actorContextService: ActorContextService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<{
      actor?: ActorContext;
      body?: Record<string, unknown>;
      path?: string;
      url?: string;
    }>();

    if (request.actor) {
      const requestPath = normalizeActorGuardRequestPath(request.path ?? request.url ?? '/');
      this.actorContextService.assertNoClientIdentitySubstitution(request.actor, request.body, {
        requestPath,
      });
    }

    return true;
  }
}
