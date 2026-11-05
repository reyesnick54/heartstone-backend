import { Injectable, UnauthorizedException } from '@nestjs/common';
import { AccountStatus, CredentialStatus, CredentialType, IdentityType } from '@prisma/client';

import { type OidcProviderConfig } from '../../../config/config.constants';
import { PrismaService } from '../../../database/prisma.service';
import { SecurityAuditService } from '../../audit/security-audit.service';
import { OidcCitizenProvisioningService } from './oidc-citizen-provisioning.service';
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
    private readonly citizenProvisioning: OidcCitizenProvisioningService,
  ) {}

  /**
   * Resolves the HeartStone identity linked to an OIDC provider + subject.
   * Never matches by email or other unverified claims; the token is validated upstream.
   *
   * When no link exists and the provider opted in to citizen self-service
   * (`provisioning.citizenSelfService`), a new self-service identity is provisioned instead of
   * rejecting the login. Otherwise an explicit administrator link is required.
   */
  async resolveIdentity(
    claims: MappedOidcClaims,
    options?: { provider?: OidcProviderConfig; ipAddress?: string },
  ): Promise<ResolvedOidcIdentity> {
    let credential = await this.findActiveLink(claims);

    if (!credential) {
      if (!options || options.provider?.provisioning?.citizenSelfService !== true) {
        throw await this.rejectUnlinked(claims, 'no_linked_identity');
      }

      const outcome = await this.citizenProvisioning.provision(claims, {
        ipAddress: options.ipAddress,
      });

      if (outcome.status === 'PROVISIONED') {
        return {
          identityId: outcome.identity.identityId,
          userAccountId: outcome.identity.userAccountId,
          personId: outcome.identity.personId,
          organizationId: null,
          identityType: outcome.identity.identityType,
          isNewLink: true,
        };
      }

      if (outcome.status === 'REFUSED') {
        throw await this.rejectUnlinked(claims, outcome.reason);
      }

      // ALREADY_LINKED: a concurrent first login for the same subject created the link.
      credential = await this.findActiveLink(claims);
      if (!credential) {
        throw await this.rejectUnlinked(claims, 'no_linked_identity');
      }
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

  private findActiveLink(claims: MappedOidcClaims) {
    return this.prisma.credential.findFirst({
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
  }

  /** Audits the rejection and returns the exception for the caller to throw. */
  private async rejectUnlinked(
    claims: MappedOidcClaims,
    reason: string,
  ): Promise<UnauthorizedException> {
    await this.audit.record({
      eventType: 'AUTHENTICATION_REJECTED',
      metadata: {
        reason,
        providerCode: claims.providerCode,
        externalSubject: claims.subject,
      },
    });
    return new UnauthorizedException(
      'No linked HeartStone identity for this external subject. Account linking requires explicit credential provisioning.',
    );
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
