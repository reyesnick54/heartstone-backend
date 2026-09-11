import { Injectable, UnauthorizedException } from '@nestjs/common';
import { CredentialStatus, CredentialType, IdentityType } from '@prisma/client';

import { PrismaService } from '../../../database/prisma.service';
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
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Resolves a pre-linked HeartStone identity from OIDC provider + subject.
   * Account provisioning requires an explicit OIDC credential link — never automatic.
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
        identity: true,
      },
    });

    if (!credential) {
      throw new UnauthorizedException(
        'No linked HeartStone identity for this external subject. Account linking requires explicit credential provisioning.',
      );
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
