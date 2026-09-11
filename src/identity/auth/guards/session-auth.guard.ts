import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { SessionsService } from '../../sessions/sessions.service';
import { SessionContextDto } from '../dto/session-context.dto';
import { MfaAssuranceService } from '../mfa/mfa-assurance.service';
import { AUTH_REQUIREMENTS_KEY, type AuthRequirementsOptions } from './auth-requirements.decorator';

interface AuthRequirementsMetadata extends AuthRequirementsOptions {
  public?: boolean;
}

@Injectable()
export class SessionAuthGuard implements CanActivate {
  constructor(
    private readonly sessionsService: SessionsService,
    private readonly reflector: Reflector,
    private readonly mfaAssurance: MfaAssuranceService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requirements = this.reflector.getAllAndOverride<AuthRequirementsMetadata | undefined>(
      AUTH_REQUIREMENTS_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (requirements?.public) {
      return true;
    }

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
    this.enforceRequirements(requirements, session);

    request.session = session;
    return true;
  }

  private enforceRequirements(
    requirements: AuthRequirementsMetadata | undefined,
    session: SessionContextDto,
  ): void {
    if (!requirements) {
      return;
    }

    if (requirements.servicePrincipal && !session.isServicePrincipal) {
      throw new UnauthorizedException('Service principal authentication is required');
    }

    if (requirements.trustedProvider && session.oidcProviderCode !== requirements.trustedProvider) {
      throw new UnauthorizedException('Authentication from the required provider is required');
    }

    this.mfaAssurance.evaluateRequirement(
      {
        required: requirements.mfaVerified === true,
        minimumAssuranceLevel: requirements.minimumAssuranceLevel,
      },
      session,
    );
  }
}
