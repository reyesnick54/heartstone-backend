import { Injectable, UnauthorizedException } from '@nestjs/common';
import { AccountStatus, CredentialStatus, CredentialType, IdentityType } from '@prisma/client';

import { PrismaService } from '../../../database/prisma.service';
import { SecurityAuditService } from '../../audit/security-audit.service';
import type { MappedOidcClaims } from './types/mapped-oidc-claims';

export interface ResolvedOidcIdentity {
  identityId: string;
  userAccountId?: string | null;
  personId?: string | null;
  organizationId?: string | null;
  identityType: IdentityType;
  isNewLink: boolean;
}

@Injectable()
export class OidcIdentityResolverService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: SecurityAuditService,
  ) {}

  /**
   * Resolves a pre-linked HeartStone identity from OIDC provider + subject only.
   * Never matches by email or unverified claims; never trusts caller-supplied subject without token validation upstream.
   */
  async resolveIdentity(claims: MappedOidcClaims): Promise<ResolvedOidcIdentity> {
    const credential = await this.prisma.credential.findFirst({
      where: {
        type: CredentialType.OIDC,
        oidcProvider: claims.providerCode,
        oidcSubject: claims.subject,
        status: CredentialStatus.ACTIVE,
      },
      include: {
        identity: {
          include: { userAccount: true },
        },
      },
    });

    if (!credential) {
      await this.audit.record({
        eventType: 'AUTHENTICATION_REJECTED',
        metadata: {
          reason: 'no_linked_identity',
          providerCode: claims.providerCode,
          externalSubject: claims.subject,
        },
      });
      throw new UnauthorizedException(
        'No linked HeartStone identity for this external subject. Account linking requires explicit credential provisioning.',
      );
    }

    if (credential.identity.userAccount?.status === AccountStatus.SUSPENDED) {
      await this.audit.record({
        eventType: 'SUSPENDED_ACCOUNT_LOGIN_ATTEMPT',
        userAccountId: credential.identity.userAccountId ?? undefined,
        identityId: credential.identity.id,
        metadata: { providerCode: claims.providerCode },
      });
      throw new UnauthorizedException('Invalid credentials');
    }

    if (credential.identity.userAccount?.status === AccountStatus.REVOKED) {
      await this.audit.record({
        eventType: 'REVOKED_ACCOUNT_LOGIN_ATTEMPT',
        userAccountId: credential.identity.userAccountId ?? undefined,
        identityId: credential.identity.id,
        metadata: { providerCode: claims.providerCode },
      });
      throw new UnauthorizedException('Invalid credentials');
    }

    return {
      identityId: credential.identity.id,
      userAccountId: credential.identity.userAccountId,
      personId: credential.identity.personId,
      organizationId: credential.identity.organizationId,
      identityType: credential.identity.type,
      isNewLink: false,
    };
  }

  async linkExistingIdentity(
    providerCode: string,
    externalSubject: string,
    identityId: string,
    actorIdentityId?: string,
  ): Promise<ResolvedOidcIdentity> {
    const identity = await this.prisma.identity.findUnique({
      where: { id: identityId },
    });

    if (!identity) {
      throw new UnauthorizedException('Identity not found');
    }

    const existing = await this.prisma.credential.findFirst({
      where: {
        type: CredentialType.OIDC,
        oidcProvider: providerCode,
        oidcSubject: externalSubject,
        status: CredentialStatus.ACTIVE,
      },
    });

    if (existing) {
      throw new UnauthorizedException('External subject is already linked to an identity');
    }

    await this.prisma.credential.create({
      data: {
        identityId: identity.id,
        type: CredentialType.OIDC,
        status: CredentialStatus.ACTIVE,
        oidcProvider: providerCode,
        oidcSubject: externalSubject,
      },
    });

    await this.audit.record({
      eventType: 'OIDC_ACCOUNT_LINKED',
      identityId: identity.id,
      userAccountId: identity.userAccountId ?? undefined,
      actorIdentityId,
      metadata: { providerCode, externalSubject },
    });

    return {
      identityId: identity.id,
      userAccountId: identity.userAccountId,
      personId: identity.personId,
      organizationId: identity.organizationId,
      identityType: identity.type,
      isNewLink: true,
    };
  }
}
