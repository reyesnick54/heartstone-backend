import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { type SessionContextDto } from '../../../identity/auth/dto/session-context.dto';
import { SessionsService } from '../../../identity/sessions/sessions.service';

@Injectable()
export class ServiceCatalogAdminGuard implements CanActivate {
  constructor(
    private readonly sessionsService: SessionsService,
    private readonly configService: ConfigService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<{
      headers: Record<string, string | string[] | undefined>;
      session?: SessionContextDto;
    }>();

    const authHeader = request.headers.authorization;
    if (!authHeader || typeof authHeader !== 'string' || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException(
        'Authenticated session required for service catalog administration',
      );
    }

    const token = authHeader.slice('Bearer '.length).trim();
    const session = await this.sessionsService.validateSessionToken(token);
    request.session = session;

    const authorizedIds = this.getAuthorizedAdminIdentityIds();
    if (!authorizedIds.includes(session.identityId)) {
      throw new ForbiddenException(
        'Service catalog administration requires an explicitly authorized administrative identity. ' +
          'Technical or OIDC administrative roles do not grant eligibility rule management access.',
      );
    }

    return true;
  }

  private getAuthorizedAdminIdentityIds(): string[] {
    const raw =
      process.env.SERVICE_CATALOG_ADMIN_IDENTITY_IDS ??
      this.configService.get<string>('SERVICE_CATALOG_ADMIN_IDENTITY_IDS') ??
      '';
    return raw
      .split(',')
      .map((id) => id.trim())
      .filter((id) => id.length > 0);
  }
}
