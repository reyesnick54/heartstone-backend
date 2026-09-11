import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  IdentityOfficeholderLink,
  IdentityOfficeholderLinkStatus,
  IdentityOfficeholderVerificationMethod,
  PrincipalKind,
  SecurityAuditEventType,
} from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { SecurityAuditService } from '../audit/security-audit.service';
import { IdentityAuthorizationService } from '../auth/identity-authorization.service';
import { AuthenticatedPrincipal } from '../auth/principal.types';
import { isIdentityOfficeholderLinkActive } from '../common/is-active-link.util';

export interface RequestOfficeholderLinkInput {
  personId: string;
  userAccountId?: string;
  officeholderId: string;
  evidenceReference?: string;
  actor: AuthenticatedPrincipal;
  correlationId?: string;
  source?: string;
}

export interface ActivateOfficeholderLinkInput {
  linkId: string;
  verificationMethod: IdentityOfficeholderVerificationMethod;
  evidenceReference?: string;
  effectiveFrom?: Date;
  effectiveUntil?: Date;
  actor: AuthenticatedPrincipal;
  correlationId?: string;
  source?: string;
}

@Injectable()
export class IdentityOfficeholderLinksService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: SecurityAuditService,
    private readonly authorization: IdentityAuthorizationService,
  ) {}

  async requestLink(input: RequestOfficeholderLinkInput): Promise<IdentityOfficeholderLink> {
    await this.ensureOfficeholderExists(input.officeholderId);

    const existingPending = await this.prisma.identityOfficeholderLink.findFirst({
      where: {
        personId: input.personId,
        officeholderId: input.officeholderId,
        status: IdentityOfficeholderLinkStatus.PENDING,
      },
    });

    if (existingPending) {
      throw new ConflictException(
        'A pending officeholder linkage already exists for this identity',
      );
    }

    const link = await this.prisma.identityOfficeholderLink.create({
      data: {
        personId: input.personId,
        userAccountId: input.userAccountId,
        officeholderId: input.officeholderId,
        status: IdentityOfficeholderLinkStatus.PENDING,
        evidenceReference: input.evidenceReference,
      },
    });

    await this.audit.record({
      eventType: SecurityAuditEventType.OFFICEHOLDER_LINKAGE_REQUESTED,
      actor: input.actor,
      subjectType: 'identity_officeholder_link',
      subjectId: link.id,
      correlationId: input.correlationId,
      source: input.source,
      metadata: {
        personId: link.personId,
        officeholderId: link.officeholderId,
        userAccountId: link.userAccountId,
      },
    });

    return link;
  }

  async activateLink(input: ActivateOfficeholderLinkInput): Promise<IdentityOfficeholderLink> {
    this.authorization.assertIdentityAdministrator(input.actor);
    const link = await this.findById(input.linkId);

    if (link.status !== IdentityOfficeholderLinkStatus.PENDING) {
      throw new ConflictException('Only pending officeholder linkages can be activated');
    }

    const effectiveFrom = input.effectiveFrom ?? new Date();

    const updated = await this.prisma.identityOfficeholderLink.update({
      where: { id: link.id },
      data: {
        status: IdentityOfficeholderLinkStatus.VERIFIED,
        verificationMethod: input.verificationMethod,
        evidenceReference: input.evidenceReference ?? link.evidenceReference,
        effectiveFrom,
        effectiveUntil: input.effectiveUntil ?? null,
      },
    });

    await this.audit.record({
      eventType: SecurityAuditEventType.OFFICEHOLDER_LINKAGE_ACTIVATED,
      actor: input.actor,
      subjectType: 'identity_officeholder_link',
      subjectId: updated.id,
      correlationId: input.correlationId,
      source: input.source,
      metadata: {
        verificationMethod: updated.verificationMethod,
        officeholderId: updated.officeholderId,
        personId: updated.personId,
      },
    });

    await this.audit.record({
      eventType: SecurityAuditEventType.IDENTITY_VERIFICATION_CHANGED,
      actor: input.actor,
      subjectType: 'identity_officeholder_link',
      subjectId: updated.id,
      correlationId: input.correlationId,
      source: input.source,
      metadata: {
        status: updated.status,
      },
    });

    return updated;
  }

  async suspendLink(
    linkId: string,
    actor: AuthenticatedPrincipal,
    reason?: string,
    correlationId?: string,
  ): Promise<IdentityOfficeholderLink> {
    this.authorization.assertIdentityAdministrator(actor);
    const link = await this.findById(linkId);

    if (link.status !== IdentityOfficeholderLinkStatus.VERIFIED) {
      throw new ConflictException('Only verified officeholder linkages can be suspended');
    }

    const updated = await this.prisma.identityOfficeholderLink.update({
      where: { id: link.id },
      data: { status: IdentityOfficeholderLinkStatus.SUSPENDED },
    });

    await this.audit.record({
      eventType: SecurityAuditEventType.OFFICEHOLDER_LINKAGE_SUSPENDED,
      actor,
      subjectType: 'identity_officeholder_link',
      subjectId: updated.id,
      correlationId,
      reason,
    });

    return updated;
  }

  async revokeLink(
    linkId: string,
    actor: AuthenticatedPrincipal,
    reason?: string,
    correlationId?: string,
  ): Promise<IdentityOfficeholderLink> {
    this.authorization.assertIdentityAdministrator(actor);
    const link = await this.findById(linkId);

    if (
      link.status === IdentityOfficeholderLinkStatus.REVOKED ||
      link.status === IdentityOfficeholderLinkStatus.ENDED
    ) {
      throw new ConflictException('Officeholder linkage is already ended');
    }

    const updated = await this.prisma.identityOfficeholderLink.update({
      where: { id: link.id },
      data: {
        status: IdentityOfficeholderLinkStatus.REVOKED,
        effectiveUntil: new Date(),
      },
    });

    await this.audit.record({
      eventType: SecurityAuditEventType.OFFICEHOLDER_LINKAGE_REVOKED,
      actor,
      subjectType: 'identity_officeholder_link',
      subjectId: updated.id,
      correlationId,
      reason,
    });

    return updated;
  }

  async findById(id: string): Promise<IdentityOfficeholderLink> {
    const link = await this.prisma.identityOfficeholderLink.findUnique({ where: { id } });

    if (!link) {
      throw new NotFoundException(`Identity officeholder link with id "${id}" was not found`);
    }

    return link;
  }

  async findCurrentForPerson(personId: string): Promise<IdentityOfficeholderLink | null> {
    const links = await this.prisma.identityOfficeholderLink.findMany({
      where: {
        personId,
        status: IdentityOfficeholderLinkStatus.VERIFIED,
      },
      orderBy: [{ effectiveFrom: 'desc' }, { createdAt: 'desc' }],
    });

    return links.find((link) => isIdentityOfficeholderLinkActive(link)) ?? null;
  }

  async listForPerson(personId: string): Promise<IdentityOfficeholderLink[]> {
    return this.prisma.identityOfficeholderLink.findMany({
      where: { personId },
      orderBy: [{ createdAt: 'desc' }],
    });
  }

  async listAll(): Promise<IdentityOfficeholderLink[]> {
    return this.prisma.identityOfficeholderLink.findMany({
      orderBy: [{ createdAt: 'desc' }],
    });
  }

  assertCanRequestForSelf(
    principal: AuthenticatedPrincipal,
    personId: string,
    officeholderId: string,
  ): void {
    if (principal.kind !== PrincipalKind.USER_ACCOUNT || principal.personId !== personId) {
      throw new ForbiddenException(
        'Officeholder linkage can only be requested for the authenticated person',
      );
    }

    if (!officeholderId.trim()) {
      throw new ForbiddenException('Officeholder id is required');
    }
  }

  private async ensureOfficeholderExists(officeholderId: string): Promise<void> {
    const officeholder = await this.prisma.officeholder.findUnique({
      where: { id: officeholderId },
    });

    if (!officeholder) {
      throw new NotFoundException(`Officeholder with id "${officeholderId}" was not found`);
    }
  }
}
