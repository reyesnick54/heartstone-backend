import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';

import { ActorContextService } from '../context/actor-context.service';
import { type ActorContext } from '../context/actor-context.types';

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
    }>();

    if (request.actor) {
      this.actorContextService.assertNoClientIdentitySubstitution(request.actor, request.body);
    }

    return true;
  }
}
