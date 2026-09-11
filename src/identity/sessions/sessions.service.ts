import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  AccountStatus,
  AssuranceLevel,
  AuthenticationMethodType,
  CredentialStatus,
  CredentialType,
  IdentityType,
  Session,
  SessionStatus,
} from '@prisma/client';

import { IDENTITY_CONFIG, type IdentityConfig } from '../../config/config.constants';
import { PrismaService } from '../../database/prisma.service';
import { SecurityAuditService } from '../audit/security-audit.service';
import { SessionContextDto } from '../auth/dto/session-context.dto';
import type { MappedOidcClaims } from '../auth/oidc/types/mapped-oidc-claims';
import type { ServiceIdentityAuthResult } from '../auth/service-identity/service-identity-auth.service';
import { generateOpaqueToken, hashToken, verifySecret } from '../common/crypto.util';

@Injectable()
export class SessionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly audit: SecurityAuditService,
  ) {}

  private get identityConfig(): IdentityConfig {
    return this.configService.getOrThrow<IdentityConfig>(IDENTITY_CONFIG);
  }

  async authenticateWithPassword(
    loginIdentifier: string,
    password: string,
    context?: { ipAddress?: string; userAgent?: string },
  ): Promise<{ session: Session; sessionToken: string }> {
    const account = await this.prisma.userAccount.findUnique({
      where: { loginIdentifier },
      include: {
        identities: {
          include: {
            credentials: {
              where: { type: CredentialType.PASSWORD, status: CredentialStatus.ACTIVE },
            },
          },
        },
      },
    });

    if (account?.status !== AccountStatus.ACTIVE) {
      await this.audit.record({
        eventType: 'AUTHENTICATION_FAILURE',
        metadata: { loginIdentifier, reason: 'account_not_found_or_inactive' },
        ipAddress: context?.ipAddress,
      });
      throw new UnauthorizedException('Invalid credentials');
    }

    const identity = account.identities[0];
    if (!identity) {
      await this.audit.record({
        eventType: 'AUTHENTICATION_FAILURE',
        userAccountId: account.id,
        metadata: { reason: 'no_identity' },
        ipAddress: context?.ipAddress,
      });
      throw new UnauthorizedException('Invalid credentials');
    }

    const passwordCredential = identity.credentials.find((c) => c.type === CredentialType.PASSWORD);
    if (!passwordCredential?.secretHash) {
      await this.audit.record({
        eventType: 'AUTHENTICATION_FAILURE',
        identityId: identity.id,
        userAccountId: account.id,
        metadata: { reason: 'no_password_credential' },
        ipAddress: context?.ipAddress,
      });
      throw new UnauthorizedException('Invalid credentials');
    }

    const valid = await verifySecret(password, passwordCredential.secretHash);
    if (!valid) {
      await this.audit.record({
        eventType: 'AUTHENTICATION_FAILURE',
        identityId: identity.id,
        userAccountId: account.id,
        metadata: { reason: 'invalid_password' },
        ipAddress: context?.ipAddress,
      });
      throw new UnauthorizedException('Invalid credentials');
    }

    await this.prisma.credential.update({
      where: { id: passwordCredential.id },
      data: { lastUsedAt: new Date() },
    });

    const { session, sessionToken } = await this.createSession({
      identityId: identity.id,
      userAccountId: account.id,
      assuranceLevel: AssuranceLevel.LOW,
      authMethod: AuthenticationMethodType.PASSWORD,
      mfaSatisfied: false,
      ipAddress: context?.ipAddress,
      userAgent: context?.userAgent,
    });

    await this.audit.record({
      eventType: 'AUTHENTICATION_SUCCESS',
      identityId: identity.id,
      userAccountId: account.id,
      sessionId: session.id,
      ipAddress: context?.ipAddress,
    });

    return { session, sessionToken };
  }

  async authenticateWithOidc(
    claims: MappedOidcClaims,
    resolved: {
      identityId: string;
      userAccountId?: string | null;
      identityType: IdentityType;
    },
    context?: { ipAddress?: string; userAgent?: string },
  ): Promise<{ session: Session; sessionToken: string }> {
    await this.audit.record({
      eventType: 'OIDC_CLAIM_RECEIVED',
      identityId: resolved.identityId,
      userAccountId: resolved.userAccountId ?? undefined,
      metadata: {
        providerCode: claims.providerCode,
        subject: claims.subject,
        assuranceLevel: claims.assuranceLevel,
        mfaSatisfied: claims.mfaSatisfied,
        externalContext: JSON.parse(JSON.stringify(claims.externalContext)) as Record<
          string,
          string | string[]
        >,
      },
      ipAddress: context?.ipAddress,
    });

    if (claims.mfaSatisfied) {
      await this.audit.record({
        eventType: 'MFA_VERIFIED',
        identityId: resolved.identityId,
        metadata: { providerCode: claims.providerCode, amr: claims.amr },
        ipAddress: context?.ipAddress,
      });
    }

    const { session, sessionToken } = await this.createSession({
      identityId: resolved.identityId,
      userAccountId: resolved.userAccountId ?? undefined,
      assuranceLevel: claims.assuranceLevel,
      authMethod: AuthenticationMethodType.OIDC,
      oidcProviderCode: claims.providerCode,
      mfaSatisfied: claims.mfaSatisfied,
      authenticatedAt: claims.authenticatedAt,
      ipAddress: context?.ipAddress,
      userAgent: context?.userAgent,
    });

    await this.audit.record({
      eventType: 'AUTHENTICATION_SUCCESS',
      identityId: resolved.identityId,
      userAccountId: resolved.userAccountId ?? undefined,
      sessionId: session.id,
      metadata: { method: AuthenticationMethodType.OIDC, providerCode: claims.providerCode },
      ipAddress: context?.ipAddress,
    });

    return { session, sessionToken };
  }

  async authenticateWithServiceApiKey(
    authResult: ServiceIdentityAuthResult,
    context?: { ipAddress?: string; userAgent?: string },
  ): Promise<{ session: Session; sessionToken: string }> {
    const { session, sessionToken } = await this.createSession({
      identityId: authResult.identityId,
      assuranceLevel: authResult.assuranceLevel,
      authMethod: AuthenticationMethodType.SERVICE_API_KEY,
      mfaSatisfied: authResult.mfaSatisfied,
      ipAddress: context?.ipAddress,
      userAgent: context?.userAgent,
    });

    await this.audit.record({
      eventType: 'AUTHENTICATION_SUCCESS',
      identityId: authResult.identityId,
      sessionId: session.id,
      metadata: {
        method: AuthenticationMethodType.SERVICE_API_KEY,
        serviceCode: authResult.serviceCode,
      },
      ipAddress: context?.ipAddress,
    });

    return { session, sessionToken };
  }

  async createSession(input: {
    identityId: string;
    userAccountId?: string;
    assuranceLevel?: AssuranceLevel;
    authMethod?: AuthenticationMethodType;
    oidcProviderCode?: string;
    mfaSatisfied?: boolean;
    authenticatedAt?: Date;
    ipAddress?: string;
    userAgent?: string;
  }): Promise<{ session: Session; sessionToken: string }> {
    const sessionToken = generateOpaqueToken();
    const tokenHash = hashToken(sessionToken);
    const expiresAt = new Date(Date.now() + this.identityConfig.sessionTtlSeconds * 1000);

    const session = await this.prisma.session.create({
      data: {
        identityId: input.identityId,
        userAccountId: input.userAccountId,
        tokenHash,
        status: SessionStatus.ACTIVE,
        assuranceLevel: input.assuranceLevel ?? AssuranceLevel.LOW,
        authMethod: input.authMethod ?? AuthenticationMethodType.PASSWORD,
        oidcProviderCode: input.oidcProviderCode,
        mfaSatisfied: input.mfaSatisfied ?? false,
        authenticatedAt: input.authenticatedAt ?? new Date(),
        expiresAt,
        ipAddress: input.ipAddress,
        userAgent: input.userAgent,
      },
    });

    await this.audit.record({
      eventType: 'SESSION_CREATED',
      identityId: input.identityId,
      userAccountId: input.userAccountId,
      sessionId: session.id,
      ipAddress: input.ipAddress,
    });

    return { session, sessionToken };
  }

  async validateSessionToken(token: string): Promise<SessionContextDto> {
    const tokenHash = hashToken(token);
    const session = await this.prisma.session.findUnique({
      where: { tokenHash },
      include: { userAccount: true, identity: true },
    });

    if (!session) {
      await this.audit.record({
        eventType: 'SESSION_REJECTED',
        metadata: { reason: 'token_not_found' },
      });
      throw new UnauthorizedException('Invalid or expired session');
    }

    if (session.status === SessionStatus.REVOKED) {
      await this.audit.record({
        eventType: 'SESSION_REJECTED',
        sessionId: session.id,
        identityId: session.identityId,
        metadata: { reason: 'session_revoked' },
      });
      throw new UnauthorizedException('Session has been revoked');
    }

    if (session.expiresAt < new Date()) {
      await this.prisma.session.update({
        where: { id: session.id },
        data: { status: SessionStatus.EXPIRED },
      });
      await this.audit.record({
        eventType: 'SESSION_REJECTED',
        sessionId: session.id,
        identityId: session.identityId,
        metadata: { reason: 'session_expired' },
      });
      throw new UnauthorizedException('Session has expired');
    }

    if (session.userAccount && session.userAccount.status !== AccountStatus.ACTIVE) {
      await this.audit.record({
        eventType: 'SESSION_REJECTED',
        sessionId: session.id,
        identityId: session.identityId,
        userAccountId: session.userAccountId ?? undefined,
        metadata: { reason: 'account_suspended' },
      });
      throw new UnauthorizedException('Account is not active');
    }

    return {
      sessionId: session.id,
      identityId: session.identityId,
      userAccountId: session.userAccountId,
      assuranceLevel: session.assuranceLevel,
      authMethod: session.authMethod,
      oidcProviderCode: session.oidcProviderCode,
      mfaSatisfied: session.mfaSatisfied,
      authenticatedAt: session.authenticatedAt,
      identityType: session.identity.type,
      isServicePrincipal: session.identity.type === IdentityType.SERVICE,
    };
  }

  async revokeSession(sessionId: string, identityId?: string): Promise<void> {
    const session = await this.prisma.session.findUnique({ where: { id: sessionId } });
    if (!session) {
      return;
    }

    await this.prisma.session.update({
      where: { id: sessionId },
      data: { status: SessionStatus.REVOKED, revokedAt: new Date() },
    });

    await this.audit.record({
      eventType: 'SESSION_REVOKED',
      sessionId,
      identityId: identityId ?? session.identityId,
      userAccountId: session.userAccountId ?? undefined,
    });
  }
}
