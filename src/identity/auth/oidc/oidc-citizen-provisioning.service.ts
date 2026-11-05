import { Injectable } from '@nestjs/common';
import {
  AccountStatus,
  AuthenticationMethodType,
  CredentialStatus,
  CredentialType,
  IdentityType,
  Prisma,
} from '@prisma/client';

import { PrismaService } from '../../../database/prisma.service';
import { SecurityAuditService } from '../../audit/security-audit.service';
import { hashToken } from '../../common/crypto.util';
import type { MappedOidcClaims } from './types/mapped-oidc-claims';

const PROVISIONING_TRANSACTION_TIMEOUT_MS = 15_000;

/** Shown when the IdP gives no usable name. Neutral: it implies no legal status. */
export const SELF_PROVISIONED_FALLBACK_DISPLAY_NAME = 'Self-service account';

export const OIDC_PROVISIONING_REFUSAL_REASONS = {
  /** A credential for this subject exists but is not active (revoked or pending). */
  PRIOR_LINK_NOT_ACTIVE: 'prior_link_not_active',
  /** The provider-scoped login identifier is taken by an account with no active link. */
  LOGIN_IDENTIFIER_TAKEN: 'login_identifier_taken',
} as const;

export type OidcProvisioningRefusalReason =
  (typeof OIDC_PROVISIONING_REFUSAL_REASONS)[keyof typeof OIDC_PROVISIONING_REFUSAL_REASONS];

export interface ProvisionedOidcIdentity {
  identityId: string;
  userAccountId: string;
  personId: string;
  identityType: IdentityType;
}

export type OidcProvisioningOutcome =
  | { status: 'PROVISIONED'; identity: ProvisionedOidcIdentity }
  /** Another login for the same subject created the link first; resolve it normally. */
  | { status: 'ALREADY_LINKED' }
  | { status: 'REFUSED'; reason: OidcProvisioningRefusalReason };

/** Provider-scoped login identifier; never an email, which the IdP may not have verified. */
export function buildProvisionedLoginIdentifier(providerCode: string, subject: string): string {
  return `${providerCode}:${subject}`;
}

/** Audit-safe reference to an external subject. */
export function hashExternalSubject(providerCode: string, subject: string): string {
  return hashToken(`${providerCode}:${subject}`);
}

/**
 * Governed just-in-time provisioning of a self-service identity for an OIDC subject that has
 * no HeartStone link yet. Only called for providers that opted in to citizen self-service.
 *
 * The new identity gets the authenticated self-service baseline and nothing else: no
 * technical roles, officeholder links, organisation memberships or representative
 * authorities. Officials are still provisioned and linked by administrators.
 */
@Injectable()
export class OidcCitizenProvisioningService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: SecurityAuditService,
  ) {}

  async provision(
    claims: MappedOidcClaims,
    context?: { ipAddress?: string },
  ): Promise<OidcProvisioningOutcome> {
    try {
      return await this.prisma.$transaction(
        (tx) => this.provisionWithinTransaction(tx, claims, context),
        { timeout: PROVISIONING_TRANSACTION_TIMEOUT_MS },
      );
    } catch (error) {
      // Backstop for the unique login identifier: a concurrent first login won.
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        return { status: 'ALREADY_LINKED' };
      }
      throw error;
    }
  }

  private async provisionWithinTransaction(
    tx: Prisma.TransactionClient,
    claims: MappedOidcClaims,
    context?: { ipAddress?: string },
  ): Promise<OidcProvisioningOutcome> {
    const { providerCode, subject } = claims;
    const subjectHash = hashExternalSubject(providerCode, subject);

    // Serialise concurrent first logins for the same subject; released at commit or rollback.
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`oidc-provisioning:${subjectHash}`}))`;

    const priorLinks = await tx.credential.findMany({
      where: { type: CredentialType.OIDC, oidcProvider: providerCode, oidcSubject: subject },
      select: { status: true },
    });
    if (priorLinks.some((link) => link.status === CredentialStatus.ACTIVE)) {
      return { status: 'ALREADY_LINKED' };
    }
    if (priorLinks.length > 0) {
      // An administrator revoked or has not activated this link: do not route around it.
      return { status: 'REFUSED', reason: OIDC_PROVISIONING_REFUSAL_REASONS.PRIOR_LINK_NOT_ACTIVE };
    }

    const loginIdentifier = buildProvisionedLoginIdentifier(providerCode, subject);
    const accountWithIdentifier = await tx.userAccount.findUnique({
      where: { loginIdentifier },
      select: { id: true },
    });
    if (accountWithIdentifier) {
      return {
        status: 'REFUSED',
        reason: OIDC_PROVISIONING_REFUSAL_REASONS.LOGIN_IDENTIFIER_TAKEN,
      };
    }

    const profile = claims.profile;
    const givenName = profile?.givenName ?? '';
    const familyName = profile?.familyName ?? '';
    const displayName =
      profile?.name ??
      (`${givenName} ${familyName}`.trim() || SELF_PROVISIONED_FALLBACK_DISPLAY_NAME);

    // Looked up for review only. Self-asserted email never selects or merges an identity.
    const possibleDuplicates = profile?.email
      ? await tx.userAccount.findMany({
          where: { loginIdentifier: { equals: profile.email, mode: 'insensitive' } },
          select: { id: true },
          take: 5,
        })
      : [];

    const person = await tx.person.create({
      data: { givenName, familyName, displayName: profile?.name },
    });
    const account = await tx.userAccount.create({
      data: { loginIdentifier, personId: person.id, status: AccountStatus.ACTIVE },
    });
    const identity = await tx.identity.create({
      data: {
        type: IdentityType.INDIVIDUAL,
        displayName,
        userAccountId: account.id,
        personId: person.id,
      },
    });
    await tx.credential.create({
      data: {
        identityId: identity.id,
        type: CredentialType.OIDC,
        status: CredentialStatus.ACTIVE,
        oidcProvider: providerCode,
        oidcSubject: subject,
      },
    });
    await tx.authenticationMethod.create({
      data: {
        identityId: identity.id,
        type: AuthenticationMethodType.OIDC,
        oidcIssuer: claims.issuer,
        oidcAudience: Array.isArray(claims.audience) ? claims.audience.join(' ') : claims.audience,
      },
    });

    await this.audit.recordWithinTransaction(tx, {
      eventType: 'IDENTITY_SELF_PROVISIONED',
      identityId: identity.id,
      userAccountId: account.id,
      ipAddress: context?.ipAddress,
      metadata: {
        providerCode,
        subjectHash,
        personId: person.id,
        provisioningMode: 'CITIZEN_SELF_SERVICE',
        profileClaimsSelfAsserted: true,
        emailVerifiedByProvider: profile?.emailVerified ?? false,
        assuranceLevelAtProvisioning: claims.assuranceLevel,
        grantedTechnicalRoles: [],
        grantedOfficeholderLinks: [],
        grantedMemberships: [],
        grantedRepresentativeAuthorities: [],
      },
    });

    if (possibleDuplicates.length > 0) {
      await this.audit.recordWithinTransaction(tx, {
        eventType: 'IDENTITY_POSSIBLE_DUPLICATE',
        identityId: identity.id,
        userAccountId: account.id,
        ipAddress: context?.ipAddress,
        metadata: {
          providerCode,
          subjectHash,
          matchBasis: 'self_asserted_email_equals_login_identifier',
          emailVerifiedByProvider: profile?.emailVerified ?? false,
          matchedUserAccountIds: possibleDuplicates.map((match) => match.id),
          resolution: 'NOT_MERGED_REQUIRES_REVIEW',
        },
      });
    }

    return {
      status: 'PROVISIONED',
      identity: {
        identityId: identity.id,
        userAccountId: account.id,
        personId: person.id,
        identityType: identity.type,
      },
    };
  }
}
