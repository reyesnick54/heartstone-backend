import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';

import { type ActorContextDto } from '../dto/actor-context.dto';
import { type SessionContextDto } from '../dto/session-context.dto';
import { ActorContextService } from '../services/actor-context.service';

@Injectable()
export class ActorContextGuard implements CanActivate {
  constructor(private readonly actorContextService: ActorContextService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<{
      session?: SessionContextDto;
      actor?: ActorContextDto;
    }>();

    if (!request.session) {
      throw new UnauthorizedException('Authenticated session required for actor context');
    }

    const actor = await this.actorContextService.resolveFromSession(request.session);

    if (actor.isSuspendedAiAgent) {
      throw new ForbiddenException('Suspended AI agent cannot perform intelligence operations');
    }

    request.actor = actor;
    return true;
  }
}
