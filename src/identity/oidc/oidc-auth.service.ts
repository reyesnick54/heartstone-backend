import { Injectable } from '@nestjs/common';
import { AccountStatus, CredentialStatus, CredentialType, IdentityType } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { SecurityAuditService } from '../audit/security-audit.service';
import { AuthorityBoundaryService } from '../common/authority-boundary.service';

export interface OidcClaims {
  providerKey: string;
  subject: string;
  loginIdentifier: string;
  displayName?: string;
  roles?: string[];
}

export interface OidcLinkResult {
  userAccountId: string;
  personId: string;
  identityId: string;
}

/**
 * Processes external OIDC identity claims.
 * External role claims never create or activate officeholder linkages.
 */
@Injectable()
export class OidcAuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: SecurityAuditService,
    private readonly authorityBoundary: AuthorityBoundaryService,
  ) {}

  async linkOrCreateUserFromOidcClaims(claims: OidcClaims): Promise<OidcLinkResult> {
    const existingCredential = await this.prisma.credential.findFirst({
      where: {
        type: CredentialType.OIDC,
        oidcProvider: claims.providerKey,
        oidcSubject: claims.subject,
        status: CredentialStatus.ACTIVE,
      },
      include: {
        identity: {
          include: {
            userAccount: true,
            person: true,
          },
        },
      },
    });

    const linkedIdentity = existingCredential?.identity;
    if (linkedIdentity?.userAccountId && linkedIdentity.personId) {
      await this.recordOidcClaim(linkedIdentity.id, claims, {
        userAccountId: linkedIdentity.userAccountId,
        personId: linkedIdentity.personId,
      });

      return {
        userAccountId: linkedIdentity.userAccountId,
        personId: linkedIdentity.personId,
        identityId: linkedIdentity.id,
      };
    }

    const person = await this.prisma.person.create({
      data: {
        givenName: claims.displayName ?? claims.loginIdentifier,
        familyName: 'OIDC',
        displayName: claims.displayName,
      },
    });

    const userAccount = await this.prisma.userAccount.create({
      data: {
        personId: person.id,
        loginIdentifier: claims.loginIdentifier,
        status: AccountStatus.ACTIVE,
      },
    });

    const identity = await this.prisma.identity.create({
      data: {
        type: IdentityType.INDIVIDUAL,
        displayName: claims.displayName ?? claims.loginIdentifier,
        userAccountId: userAccount.id,
        personId: person.id,
      },
    });

    await this.prisma.credential.create({
      data: {
        identityId: identity.id,
        type: CredentialType.OIDC,
        status: CredentialStatus.ACTIVE,
        oidcProvider: claims.providerKey,
        oidcSubject: claims.subject,
      },
    });

    this.authorityBoundary.assertNoGovernmentAuthority({
      identityId: identity.id,
      userAccountId: userAccount.id,
      externalClaims: { roles: claims.roles ?? [] },
    });

    await this.recordOidcClaim(identity.id, claims, {
      userAccountId: userAccount.id,
      personId: person.id,
      created: true,
    });

    return {
      userAccountId: userAccount.id,
      personId: person.id,
      identityId: identity.id,
    };
  }

  private async recordOidcClaim(
    identityId: string,
    claims: OidcClaims,
    context: { userAccountId: string; personId: string; created?: boolean },
  ): Promise<void> {
    await this.audit.record({
      eventType: 'OIDC_CLAIM_RECEIVED',
      identityId,
      userAccountId: context.userAccountId,
      metadata: {
        providerKey: claims.providerKey,
        externalSubject: claims.subject,
        rolesObserved: claims.roles ?? [],
        officeholderLinkageCreated: false,
        officeholderLinkageActivated: false,
        accountCreated: context.created ?? false,
      },
    });
  }
}
