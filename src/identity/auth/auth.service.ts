import { Injectable } from '@nestjs/common';

import { SessionsService } from '../sessions/sessions.service';
import { LoginDto } from './dto/login.dto';
import { LoginResponseDto } from './dto/login-response.dto';
import { OidcLoginDto } from './dto/oidc-login.dto';
import { ServiceLoginDto } from './dto/service-login.dto';
import { SessionContextDto } from './dto/session-context.dto';
import { OidcIdentityResolverService } from './oidc/oidc-identity-resolver.service';
import { OidcTokenValidatorService } from './oidc/oidc-token-validator.service';
import { ServiceIdentityAuthService } from './service-identity/service-identity-auth.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly sessionsService: SessionsService,
    private readonly oidcTokenValidator: OidcTokenValidatorService,
    private readonly oidcIdentityResolver: OidcIdentityResolverService,
    private readonly serviceIdentityAuth: ServiceIdentityAuthService,
  ) {}

  async login(
    dto: LoginDto,
    context?: { ipAddress?: string; userAgent?: string },
  ): Promise<LoginResponseDto> {
    const { session, sessionToken } = await this.sessionsService.authenticateWithPassword(
      dto.loginIdentifier,
      dto.password,
      context,
    );

    return this.toLoginResponse(session, sessionToken);
  }

  async loginWithOidc(
    dto: OidcLoginDto,
    context?: { ipAddress?: string; userAgent?: string },
  ): Promise<LoginResponseDto> {
    const validation = await this.oidcTokenValidator.validateAccessToken(
      dto.accessToken,
      dto.providerCode,
    );
    const resolved = await this.oidcIdentityResolver.resolveIdentity(validation.claims);
    const { session, sessionToken } = await this.sessionsService.authenticateWithOidc(
      validation.claims,
      resolved,
      context,
    );

    return this.toLoginResponse(session, sessionToken);
  }

  async loginWithServiceCredentials(
    dto: ServiceLoginDto,
    context?: { ipAddress?: string; userAgent?: string },
  ): Promise<LoginResponseDto> {
    const authResult = await this.serviceIdentityAuth.authenticate(dto.clientId, dto.clientSecret);
    const { session, sessionToken } = await this.sessionsService.authenticateWithServiceApiKey(
      authResult,
      context,
    );

    return this.toLoginResponse(session, sessionToken);
  }

  async logout(session: SessionContextDto): Promise<void> {
    await this.sessionsService.revokeSession(session.sessionId, session.identityId);
  }

  private toLoginResponse(
    session: {
      id: string;
      identityId: string;
      expiresAt: Date;
      assuranceLevel: LoginResponseDto['assuranceLevel'];
      authMethod: LoginResponseDto['authMethod'];
      mfaSatisfied: boolean;
      oidcProviderCode?: string | null;
      authenticatedAt: Date;
    },
    sessionToken: string,
  ): LoginResponseDto {
    return {
      sessionToken,
      sessionId: session.id,
      identityId: session.identityId,
      expiresAt: session.expiresAt,
      assuranceLevel: session.assuranceLevel,
      authMethod: session.authMethod,
      mfaSatisfied: session.mfaSatisfied,
      oidcProviderCode: session.oidcProviderCode,
      authenticatedAt: session.authenticatedAt,
    };
  }
}
