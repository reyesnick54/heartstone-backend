import { Injectable, UnauthorizedException } from '@nestjs/common';
import {
  IdentityAccountStatus,
  PrincipalKind,
  SecurityAuditEventType,
  SecurityAuditResult,
  UserAccountKind,
} from '@prisma/client';

import { UserAccountsService } from '../accounts/user-accounts.service';
import { SecurityAuditService } from '../audit/security-audit.service';
import { verifySecret } from '../common/crypto.util';
import { isIdentityOfficeholderLinkActive } from '../common/is-active-link.util';
import { CredentialsService } from '../credentials/credentials.service';
import { IdentityOfficeholderLinksService } from '../officeholder-links/identity-officeholder-links.service';
import { ServiceIdentitiesService } from '../service-identities/service-identities.service';
import { SessionsService } from '../sessions/sessions.service';
import { IdentityAuthorizationService } from './identity-authorization.service';
import { AuthenticatedPrincipal } from './principal.types';

export interface UserLoginInput {
  username: string;
  password: string;
  correlationId?: string;
  source?: string;
}

export interface ServiceLoginInput {
  code: string;
  apiKey: string;
  correlationId?: string;
  source?: string;
}

export interface LoginResult {
  principal: AuthenticatedPrincipal;
  token: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly userAccounts: UserAccountsService,
    private readonly serviceIdentities: ServiceIdentitiesService,
    private readonly credentials: CredentialsService,
    private readonly sessions: SessionsService,
    private readonly officeholderLinks: IdentityOfficeholderLinksService,
    private readonly audit: SecurityAuditService,
    private readonly authorization: IdentityAuthorizationService,
  ) {}

  async loginUser(input: UserLoginInput): Promise<LoginResult> {
    const account = await this.userAccounts.findByUsername(input.username);

    if (account?.status !== IdentityAccountStatus.ACTIVE) {
      await this.audit.record({
        eventType: SecurityAuditEventType.SESSION_CREATED,
        actor: { kind: PrincipalKind.SYSTEM, correlationId: input.correlationId },
        subjectType: 'user_account',
        subjectId: account?.id,
        correlationId: input.correlationId,
        source: input.source,
        result: SecurityAuditResult.FAILURE,
        reason: 'Invalid credentials or inactive account',
      });
      throw new UnauthorizedException('Invalid credentials');
    }

    const credential = await this.credentials.findActivePasswordCredential(account.id);

    if (!credential?.secretHash || !verifySecret(input.password, credential.secretHash)) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const { session, token } = await this.sessions.create({
      userAccountId: account.id,
      correlationId: input.correlationId,
      source: input.source,
    });

    const principal = await this.buildUserPrincipal(
      account.id,
      account.personId,
      account.username,
      account.kind,
      session.id,
      session.correlationId ?? input.correlationId,
    );

    return { principal, token };
  }

  async loginService(input: ServiceLoginInput): Promise<LoginResult> {
    const identity = await this.serviceIdentities.findByCode(input.code);

    if (identity?.status !== IdentityAccountStatus.ACTIVE) {
      throw new UnauthorizedException('Invalid service credentials');
    }

    const credential = await this.credentials.findActiveApiKeyCredential(identity.id, input.code);

    if (!credential?.secretHash || !verifySecret(input.apiKey, credential.secretHash)) {
      throw new UnauthorizedException('Invalid service credentials');
    }

    const { session, token } = await this.sessions.create({
      serviceIdentityId: identity.id,
      correlationId: input.correlationId,
      source: input.source,
    });

    await this.audit.record({
      eventType: SecurityAuditEventType.SERVICE_IDENTITY_AUTHENTICATED,
      actor: {
        kind: PrincipalKind.SERVICE_IDENTITY,
        accountId: identity.id,
        sessionId: session.id,
        correlationId: input.correlationId,
      },
      subjectType: 'service_identity',
      subjectId: identity.id,
      correlationId: input.correlationId,
      source: input.source,
    });

    const principal: AuthenticatedPrincipal = {
      kind: PrincipalKind.SERVICE_IDENTITY,
      accountId: identity.id,
      sessionId: session.id,
      correlationId: input.correlationId,
    };

    return { principal, token };
  }

  async resolvePrincipalFromToken(token: string): Promise<AuthenticatedPrincipal> {
    const session = await this.sessions.findActiveByToken(token);

    if (!session) {
      throw new UnauthorizedException('Invalid or expired session');
    }

    if (session.userAccountId) {
      const account = await this.userAccounts.findById(session.userAccountId);

      if (account.status !== IdentityAccountStatus.ACTIVE) {
        throw new UnauthorizedException('Account is not active');
      }

      return this.buildUserPrincipal(
        account.id,
        account.personId,
        account.username,
        account.kind,
        session.id,
        session.correlationId ?? undefined,
      );
    }

    if (session.serviceIdentityId) {
      const identity = await this.serviceIdentities.findById(session.serviceIdentityId);

      if (identity.status !== IdentityAccountStatus.ACTIVE) {
        throw new UnauthorizedException('Service identity is not active');
      }

      return {
        kind: PrincipalKind.SERVICE_IDENTITY,
        accountId: identity.id,
        sessionId: session.id,
        correlationId: session.correlationId ?? undefined,
      };
    }

    throw new UnauthorizedException('Invalid session principal');
  }

  async buildUserPrincipal(
    accountId: string,
    personId: string,
    username: string,
    accountKind: UserAccountKind,
    sessionId: string,
    correlationId?: string,
  ): Promise<AuthenticatedPrincipal> {
    const currentLink = await this.officeholderLinks.findCurrentForPerson(personId);

    const principal: AuthenticatedPrincipal = {
      kind: PrincipalKind.USER_ACCOUNT,
      accountId,
      personId,
      username,
      accountKind,
      sessionId,
      correlationId,
    };

    if (currentLink && isIdentityOfficeholderLinkActive(currentLink)) {
      principal.verifiedOfficeholderLinkId = currentLink.id;
      principal.verifiedOfficeholderId = currentLink.officeholderId;
    }

    return principal;
  }

  assertIdentityAdministrator(principal: AuthenticatedPrincipal): void {
    this.authorization.assertIdentityAdministrator(principal);
  }

  assertUserAccount(principal: AuthenticatedPrincipal): void {
    this.authorization.assertUserAccount(principal);
  }

  requirePersonId(principal: AuthenticatedPrincipal): string {
    return this.authorization.requirePersonId(principal);
  }
}
