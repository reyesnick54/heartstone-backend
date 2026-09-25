import { ForbiddenException, Injectable } from '@nestjs/common';
import { IdentityType, RepresentativeAuthorityStatus } from '@prisma/client';

import { PrismaService } from '../database/prisma.service';
import { SessionContextDto } from '../identity/auth/dto/session-context.dto';
import { ScopedResourceNotFoundException } from './institutional-scope.exceptions';
import { ScopedResourceType } from './institutional-scope.types';
import { ResourceAccessService } from './resource-access.service';

export const SUBJECT_RECORD_ACCESS_REASON = {
  CLIENT_IDENTITY_FORBIDDEN: 'client_supplied_identity_forbidden',
  SERVICE_IDENTITY_PERSONAL_RECORD_DENIED: 'service_identity_personal_record_denied',
  SUBJECT_RELATIONSHIP_REQUIRED: 'subject_relationship_required',
} as const;

export interface SubjectIdentityAccessOptions {
  representativeAuthorityId?: string;
  /** When true, failed cross-subject checks return 404. */
  maskEnumeration?: boolean;
}

/**
 * Canonical access evaluation for subject-bound domain records and routes.
 * Combines institutional scope (applications, cases) with self-service and representation rules.
 */
@Injectable()
export class SubjectRecordAccessService {
  constructor(
    private readonly resourceAccess: ResourceAccessService,
    private readonly prisma: PrismaService,
  ) {}

  assertSessionDerivedIdentity(
    session: SessionContextDto,
    clientSuppliedIdentityId?: string,
  ): void {
    if (clientSuppliedIdentityId && clientSuppliedIdentityId !== session.identityId) {
      throw new ForbiddenException({
        message: 'Caller-supplied identity does not match authenticated session',
        reason: SUBJECT_RECORD_ACCESS_REASON.CLIENT_IDENTITY_FORBIDDEN,
        domain: 'subject-record-access',
      });
    }
  }

  assertPersonaAllowsPersonalSelfService(
    session: SessionContextDto,
    identityType: IdentityType,
  ): void {
    if (identityType === IdentityType.SERVICE) {
      throw new ForbiddenException({
        message: 'Service identities cannot access personal subject records',
        reason: SUBJECT_RECORD_ACCESS_REASON.SERVICE_IDENTITY_PERSONAL_RECORD_DENIED,
        domain: 'subject-record-access',
      });
    }
  }

  async assertSubjectIdentityVisible(
    session: SessionContextDto,
    subjectIdentityId: string,
    options?: SubjectIdentityAccessOptions,
  ): Promise<void> {
    this.assertSessionDerivedIdentity(session);

    const accessorIdentityId = await this.resolveCanonicalSessionIdentityId(session);
    if (accessorIdentityId === subjectIdentityId) {
      return;
    }

    const scope = await this.resolveRepresentativeScope(session.identityId);

    if (options?.representativeAuthorityId) {
      if (!scope.activeRepresentativeAuthorityIds.includes(options.representativeAuthorityId)) {
        throw this.buildSubjectDenial(session, subjectIdentityId, options);
      }
    }

    if (scope.activeRepresentativeAuthorityIds.length > 0) {
      const representedApplication = await this.prisma.application.findFirst({
        where: {
          applicantIdentityId: subjectIdentityId,
          representativeAuthorityId: { in: scope.activeRepresentativeAuthorityIds },
          organizationId: { in: scope.representedOrganizationIds },
        },
        select: { id: true },
      });
      if (representedApplication) {
        return;
      }
    }

    throw this.buildSubjectDenial(session, subjectIdentityId, options);
  }

  async assertScopedResourceVisibility(
    session: SessionContextDto,
    resourceType: ScopedResourceType,
    resourceId: string,
    options?: Pick<SubjectIdentityAccessOptions, 'maskEnumeration' | 'representativeAuthorityId'>,
  ): Promise<void> {
    this.assertSessionDerivedIdentity(session);
    await this.resourceAccess.assertVisibility(session, resourceType, resourceId, {
      maskEnumeration: options?.maskEnumeration,
      representativeAuthorityId: options?.representativeAuthorityId,
    });
  }

  async assertApplicationLinkedRecord(
    session: SessionContextDto,
    applicationId: string,
    options?: Pick<SubjectIdentityAccessOptions, 'maskEnumeration' | 'representativeAuthorityId'>,
  ): Promise<void> {
    await this.assertScopedResourceVisibility(
      session,
      ScopedResourceType.APPLICATION,
      applicationId,
      options,
    );
  }

  async assertOfficialInstitutionalResource(
    session: SessionContextDto,
    resourceType: ScopedResourceType,
    resourceId: string,
  ): Promise<void> {
    await this.resourceAccess.assertInstitutionalBoundary(session, resourceType, resourceId);
  }

  async assertModification(
    session: SessionContextDto,
    resourceType: ScopedResourceType,
    resourceId: string,
    options?: Pick<SubjectIdentityAccessOptions, 'maskEnumeration' | 'representativeAuthorityId'>,
  ): Promise<void> {
    await this.resourceAccess.assertModification(session, resourceType, resourceId, options);
  }

  resolveAccessorIdentityId(
    session: SessionContextDto,
    _deprecatedClientIdentityId?: string,
  ): string {
    this.assertSessionDerivedIdentity(session, _deprecatedClientIdentityId);
    return session.identityId;
  }

  private async resolveCanonicalSessionIdentityId(session: SessionContextDto): Promise<string> {
    if (!session.sessionId) {
      return session.identityId;
    }

    const persisted = await this.prisma.session.findUnique({
      where: { id: session.sessionId },
      select: { identityId: true },
    });

    return persisted?.identityId ?? session.identityId;
  }

  private async resolveRepresentativeScope(identityId: string): Promise<{
    activeRepresentativeAuthorityIds: string[];
    representedOrganizationIds: string[];
  }> {
    const now = new Date();
    const activeAuthorities = await this.prisma.representativeAuthority.findMany({
      where: {
        identityId,
        status: RepresentativeAuthorityStatus.ACTIVE,
        effectiveFrom: { lte: now },
        OR: [{ effectiveUntil: null }, { effectiveUntil: { gt: now } }],
      },
      select: { id: true, organizationId: true },
    });

    return {
      activeRepresentativeAuthorityIds: activeAuthorities.map((authority) => authority.id),
      representedOrganizationIds: activeAuthorities.map((authority) => authority.organizationId),
    };
  }

  private buildSubjectDenial(
    session: SessionContextDto,
    subjectIdentityId: string,
    options?: SubjectIdentityAccessOptions,
  ): Error {
    if (options?.maskEnumeration) {
      return new ScopedResourceNotFoundException(ScopedResourceType.IDENTITY, subjectIdentityId);
    }

    return new ForbiddenException({
      message: 'Subject record is not accessible to this identity',
      reason: SUBJECT_RECORD_ACCESS_REASON.SUBJECT_RELATIONSHIP_REQUIRED,
      domain: 'subject-record-access',
    });
  }
}
