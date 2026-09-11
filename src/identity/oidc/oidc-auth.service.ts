import { Injectable } from '@nestjs/common';
import { PrincipalKind, SecurityAuditEventType, UserAccountKind } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { UserAccountsService } from '../accounts/user-accounts.service';
import { SecurityAuditService } from '../audit/security-audit.service';

export interface OidcClaims {
  providerKey: string;
  subject: string;
  username: string;
  displayName?: string;
  roles?: string[];
  correlationId?: string;
  source?: string;
}

/**
 * Processes external OIDC identity claims.
 * External role claims never create or activate officeholder linkages.
 */
@Injectable()
export class OidcAuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly userAccounts: UserAccountsService,
    private readonly audit: SecurityAuditService,
  ) {}

  async linkOrCreateUserFromOidcClaims(
    claims: OidcClaims,
  ): Promise<{ userAccountId: string; personId: string }> {
    const existingLink = await this.prisma.externalIdentityLink.findUnique({
      where: {
        providerKey_externalSubject: {
          providerKey: claims.providerKey,
          externalSubject: claims.subject,
        },
      },
      include: { userAccount: true },
    });

    if (existingLink) {
      return {
        userAccountId: existingLink.userAccountId,
        personId: existingLink.userAccount.personId,
      };
    }

    const account = await this.userAccounts.create({
      username: claims.username,
      displayName: claims.displayName,
      kind: UserAccountKind.STANDARD,
      actor: { kind: PrincipalKind.SYSTEM, correlationId: claims.correlationId },
      correlationId: claims.correlationId,
      source: claims.source ?? 'oidc',
    });

    await this.prisma.externalIdentityLink.create({
      data: {
        userAccountId: account.id,
        providerKey: claims.providerKey,
        externalSubject: claims.subject,
      },
    });

    await this.audit.record({
      eventType: SecurityAuditEventType.IDENTITY_LINKED,
      actor: { kind: PrincipalKind.SYSTEM, correlationId: claims.correlationId },
      subjectType: 'user_account',
      subjectId: account.id,
      correlationId: claims.correlationId,
      source: claims.source ?? 'oidc',
      metadata: {
        providerKey: claims.providerKey,
        externalSubject: claims.subject,
        rolesObserved: claims.roles ?? [],
        officeholderLinkageCreated: false,
        officeholderLinkageActivated: false,
      },
    });

    return {
      userAccountId: account.id,
      personId: account.personId,
    };
  }
}
