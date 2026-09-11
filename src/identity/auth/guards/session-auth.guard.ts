import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';

import { SessionsService } from '../../sessions/sessions.service';
import { SessionContextDto } from '../dto/session-context.dto';

@Injectable()
export class SessionAuthGuard implements CanActivate {
  constructor(private readonly sessionsService: SessionsService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<{
      headers: Record<string, string | string[] | undefined>;
      session?: SessionContextDto;
    }>();

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
    return true;
  }
}
