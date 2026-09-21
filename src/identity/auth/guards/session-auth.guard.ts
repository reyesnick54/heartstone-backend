import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';

import { SessionsService } from '../../sessions/sessions.service';
import { ActorContextService } from '../context/actor-context.service';
import { type ActorContext } from '../context/actor-context.types';
import { SessionContextDto } from '../dto/session-context.dto';

export interface AuthenticatedRequest {
  headers: Record<string, string | string[] | undefined>;
  body?: Record<string, unknown>;
  session?: SessionContextDto;
  actor?: ActorContext;
}

@Injectable()
export class SessionAuthGuard implements CanActivate {
  constructor(
    private readonly sessionsService: SessionsService,
    private readonly actorContextService: ActorContextService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();

    const authHeader = request.headers.authorization;
    if (!authHeader || typeof authHeader !== 'string' || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing or invalid authorization header');
    }

    const token = authHeader.slice('Bearer '.length).trim();
    if (!token) {
      throw new UnauthorizedException('Missing session token');
    }

    const session = await this.sessionsService.validateSessionToken(token);
    request.session = session;

    const actor = await this.actorContextService.resolveFromSessionContext({ session });
    request.actor = actor;

    this.actorContextService.assertNoClientIdentitySubstitution(actor, request.body);

    return true;
  }
}
