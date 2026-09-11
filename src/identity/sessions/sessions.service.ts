import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  AccountStatus,
  AssuranceLevel,
  CredentialStatus,
  CredentialType,
  Session,
  SessionRevocationReason,
  SessionStatus,
} from '@prisma/client';

import { IDENTITY_CONFIG, type IdentityConfig } from '../../config/config.constants';
import { PrismaService } from '../../database/prisma.service';
import { AccountLookupService } from '../accounts/account-lookup.service';
import { SecurityAuditService } from '../audit/security-audit.service';
import { type AuthenticatedPrincipal } from '../auth/domain/authenticated-principal';
import { SessionContextDto } from '../auth/dto/session-context.dto';
import {
  CREDENTIAL_VERIFIER,
  type CredentialVerifier,
} from '../auth/interfaces/credential-verifier.interface';
import { IdentityResolutionService } from '../auth/services/identity-resolution.service';
import { generateOpaqueToken, hashToken } from '../common/crypto.util';

@Injectable()
export class SessionsService {
  private readonly verifiers: Map<string, CredentialVerifier>;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly audit: SecurityAuditService,
    private readonly accountLookup: AccountLookupService,
    private readonly identityResolution: IdentityResolutionService,
    @Inject(CREDENTIAL_VERIFIER)
    credentialVerifiers: CredentialVerifier[],
  ) {
    this.verifiers = new Map(credentialVerifiers.map((verifier) => [verifier.method, verifier]));
  }

  private get identityConfig(): IdentityConfig {
    return this.configService.getOrThrow<IdentityConfig>(IDENTITY_CONFIG);
  }

  async authenticateWithPassword(
    loginIdentifier: string,
    password: string,
    context?: { ipAddress?: string; userAgent?: string },
  ): Promise<{ session: Session; sessionToken: string }> {
    if (!this.identityConfig.localPasswordAuthEnabled) {
      await this.audit.record({
        eventType: 'AUTHENTICATION_FAILURE',
        metadata: { loginIdentifier, reason: 'password_auth_disabled' },
        ipAddress: context?.ipAddress,
      });
      throw new UnauthorizedException('Password authentication is not enabled');
    }

    const account = await this.accountLookup.findByLoginIdentifier(loginIdentifier);

    if (!account) {
      await this.audit.record({
        eventType: 'AUTHENTICATION_FAILURE',
        metadata: { loginIdentifier, reason: 'account_not_found' },
        ipAddress: context?.ipAddress,
      });
      throw new UnauthorizedException('Invalid credentials');
    }

    if (account.status === AccountStatus.SUSPENDED) {
      await this.audit.record({
        eventType: 'SUSPENDED_ACCOUNT_LOGIN_ATTEMPT',
        userAccountId: account.id,
        ipAddress: context?.ipAddress,
      });
      throw new UnauthorizedException('Invalid credentials');
    }

    if (account.status === AccountStatus.REVOKED) {
      await this.audit.record({
        eventType: 'REVOKED_ACCOUNT_LOGIN_ATTEMPT',
        userAccountId: account.id,
        ipAddress: context?.ipAddress,
      });
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!this.accountLookup.isAuthenticatable(account)) {
      await this.audit.record({
        eventType: 'AUTHENTICATION_FAILURE',
        userAccountId: account.id,
        metadata: { reason: 'account_not_authenticatable', status: account.status },
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

    const activeCredential = identity.credentials.find(
      (credential) =>
        credential.type === CredentialType.PASSWORD && credential.status === CredentialStatus.ACTIVE,
    );

    if (!activeCredential) {
      await this.audit.record({
        eventType: 'CREDENTIAL_REJECTED',
        identityId: identity.id,
        userAccountId: account.id,
        metadata: { reason: 'no_active_password_credential' },
        ipAddress: context?.ipAddress,
      });
      throw new UnauthorizedException('Invalid credentials');
    }

    const verifier = this.verifiers.get('password');
    if (!verifier) {
      throw new UnauthorizedException('Password authentication is not configured');
    }

    const valid = await verifier.verify({
      identityId: identity.id,
      userAccountId: account.id,
      credential: password,
    });

    if (!valid) {
      await this.audit.record({
        eventType: 'CREDENTIAL_REJECTED',
        identityId: identity.id,
        userAccountId: account.id,
        metadata: { reason: 'invalid_password' },
        ipAddress: context?.ipAddress,
      });
      await this.audit.record({
        eventType: 'AUTHENTICATION_FAILURE',
        identityId: identity.id,
        userAccountId: account.id,
        metadata: { reason: 'invalid_password' },
        ipAddress: context?.ipAddress,
      });
      throw new UnauthorizedException('Invalid credentials');
    }

    const { session, sessionToken } = await this.createSession({
      identityId: identity.id,
      userAccountId: account.id,
      assuranceLevel: AssuranceLevel.LOW,
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

  async createSession(input: {
    identityId: string;
    userAccountId?: string;
    assuranceLevel?: AssuranceLevel;
    ipAddress?: string;
    userAgent?: string;
  }): Promise<{ session: Session; sessionToken: string }> {
    const sessionToken = generateOpaqueToken();
    const tokenHash = hashToken(sessionToken);
    const issuedAt = new Date();
    const expiresAt = new Date(
      issuedAt.getTime() + this.identityConfig.sessionTtlSeconds * 1000,
    );

    const session = await this.prisma.session.create({
      data: {
        identityId: input.identityId,
        userAccountId: input.userAccountId,
        tokenHash,
        status: SessionStatus.ACTIVE,
        assuranceLevel: input.assuranceLevel ?? AssuranceLevel.LOW,
        issuedAt,
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
      include: { userAccount: true },
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

    const now = new Date();

    if (session.expiresAt < now) {
      await this.prisma.session.update({
        where: { id: session.id },
        data: {
          status: SessionStatus.EXPIRED,
          revokedAt: now,
          revocationReason: SessionRevocationReason.EXPIRED,
        },
      });
      await this.audit.record({
        eventType: 'SESSION_EXPIRED',
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
        metadata: { reason: 'account_not_active' },
      });
      throw new UnauthorizedException('Account is not active');
    }

    const renewedSession = await this.maybeRenewSession(session, now);
    const principal = this.identityResolution.resolveFromSession(renewedSession);

    return this.toSessionContext(principal);
  }

  async revokeSession(
    sessionId: string,
    identityId?: string,
    reason: SessionRevocationReason = SessionRevocationReason.USER_LOGOUT,
  ): Promise<void> {
    const session = await this.prisma.session.findUnique({ where: { id: sessionId } });
    if (!session || session.status === SessionStatus.REVOKED) {
      return;
    }

    await this.prisma.session.update({
      where: { id: sessionId },
      data: {
        status: SessionStatus.REVOKED,
        revokedAt: new Date(),
        revocationReason: reason,
      },
    });

    await this.audit.record({
      eventType: 'SESSION_REVOKED',
      sessionId,
      identityId: identityId ?? session.identityId,
      userAccountId: session.userAccountId ?? undefined,
      metadata: { reason },
    });
  }

  async revokeAllAccountSessions(
    userAccountId: string,
    reason: SessionRevocationReason = SessionRevocationReason.ACCOUNT_REVOCATION,
  ): Promise<number> {
    const now = new Date();

    const result = await this.prisma.session.updateMany({
      where: {
        userAccountId,
        status: SessionStatus.ACTIVE,
      },
      data: {
        status: SessionStatus.REVOKED,
        revokedAt: now,
        revocationReason: reason,
      },
    });

    if (result.count > 0) {
      await this.audit.record({
        eventType: 'SESSION_REVOKED',
        userAccountId,
        metadata: { reason, revokedCount: result.count, scope: 'all_account_sessions' },
      });
    }

    return result.count;
  }

  resolvePrincipal(session: Session): AuthenticatedPrincipal {
    return this.identityResolution.resolveFromSession(session);
  }

  private async maybeRenewSession(session: Session, now: Date): Promise<Session> {
    const thresholdMs = this.identityConfig.sessionRenewalThresholdSeconds * 1000;
    const timeRemaining = session.expiresAt.getTime() - now.getTime();

    if (timeRemaining > thresholdMs) {
      return this.prisma.session.update({
        where: { id: session.id },
        data: { lastUsedAt: now },
      });
    }

    const newExpiresAt = new Date(now.getTime() + this.identityConfig.sessionTtlSeconds * 1000);

    return this.prisma.session.update({
      where: { id: session.id },
      data: {
        lastUsedAt: now,
        expiresAt: newExpiresAt,
      },
    });
  }

  private toSessionContext(principal: AuthenticatedPrincipal): SessionContextDto {
    return {
      sessionId: principal.sessionId,
      identityId: principal.identityId,
      userAccountId: principal.userAccountId,
      assuranceLevel: principal.assuranceLevel,
    };
  }
}
