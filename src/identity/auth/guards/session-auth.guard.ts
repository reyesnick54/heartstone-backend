import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { IS_PUBLIC_KEY } from '../../../security/decorators/public.decorator';
import { SessionsService } from '../../sessions/sessions.service';
import { ActorContextService } from '../context/actor-context.service';
import { type ActorContext } from '../context/actor-context.types';
import { SessionContextDto } from '../dto/session-context.dto';

export interface AuthenticatedRequest {
  headers: Record<string, string | string[] | undefined>;
  body?: Record<string, unknown>;
  params?: Record<string, string>;
  query?: Record<string, string>;
  session?: SessionContextDto;
  actor?: ActorContext;
}

@Injectable()
export class SessionAuthGuard implements CanActivate {
  constructor(
    private readonly sessionsService: SessionsService,
    private readonly actorContextService: ActorContextService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

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

    request.actor = await this.actorContextService.resolveFromSessionContext({ session });

    return true;
  }
}
