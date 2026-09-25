import { ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import {
  DelegationStatus,
  IdentityOfficeholderLinkStatus,
  IdentityType,
  MembershipStatus,
  RepresentativeAuthorityStatus,
  SessionStatus,
} from '@prisma/client';

import { isEffectiveAt } from '../../../authority/common/effective-period.util';
import { PrismaService } from '../../../database/prisma.service';
import { isAppointmentCurrent } from '../../../government/common/appointment-current.util';
import { type SessionContextDto } from '../dto/session-context.dto';
import {
  type ActorContext,
  type ActorContextAppointment,
  type ActorContextDelegation,
  type ActorContextInstitutionContext,
  type ActorContextOfficeholderLink,
  type ActorContextOrganizationMembership,
  type ActorContextRepresentativeAuthority,
  CLIENT_ACTOR_IDENTITY_FIELDS,
} from './actor-context.types';

export interface ResolveActorContextInput {
  session: SessionContextDto;
  at?: Date;
}

@Injectable()
export class ActorContextService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Builds the canonical actor context from a server-validated session.
   * Requires session context produced by SessionsService.validateSessionToken().
   */
  async resolveFromSessionContext(input: ResolveActorContextInput): Promise<ActorContext> {
    const at = input.at ?? new Date();
    const sessionContext = input.session;

    if (!sessionContext.sessionId || !sessionContext.identityId) {
      throw new UnauthorizedException('Actor context requires server-derived session identity');
    }

    const session = await this.prisma.session.findUnique({
      where: { id: sessionContext.sessionId },
      include: { userAccount: true },
    });

    if (!session) {
      throw new UnauthorizedException('Session not found');
    }

    if (session.identityId !== sessionContext.identityId) {
      throw new UnauthorizedException('Session identity mismatch');
    }

    if (session.status === SessionStatus.REVOKED) {
      throw new UnauthorizedException('Session has been revoked');
    }

    if (session.status === SessionStatus.EXPIRED || session.expiresAt <= at) {
      throw new UnauthorizedException('Session has expired');
    }

    if (session.userAccount && session.userAccount.status !== 'ACTIVE') {
      throw new UnauthorizedException('Account is not active');
    }

    const identity = await this.prisma.identity.findUnique({
      where: { id: session.identityId },
    });

    if (!identity) {
      throw new UnauthorizedException('Identity not found');
    }

    const [organizationMemberships, representativeAuthorities, officeholderLinks] =
      await Promise.all([
        this.loadActiveOrganizationMemberships(identity.id, at),
        this.loadActiveRepresentativeAuthorities(identity.id, at),
        identity.type === IdentityType.SERVICE
          ? Promise.resolve([])
          : this.loadActiveOfficeholderLinks(identity.id),
      ]);

    const officeholderIds = officeholderLinks.map((link) => link.officeholderId);
    const activeAppointments =
      officeholderIds.length > 0 ? await this.loadActiveAppointments(officeholderIds, at) : [];
    const activeDelegations =
      officeholderIds.length > 0 || activeAppointments.length > 0
        ? await this.loadActiveDelegations(officeholderIds, activeAppointments, at)
        : [];

    const institutionContexts = this.buildInstitutionContexts(activeAppointments);

    return {
      identityId: identity.id,
      userAccountId: identity.userAccountId,
      personId: identity.personId,
      sessionId: session.id,
      identityType: identity.type,
      assuranceLevel: session.assuranceLevel,
      authMethod: session.authMethod,
      mfaSatisfied: session.mfaSatisfied,
      authenticatedAt: session.authenticatedAt,
      oidcProviderCode: session.oidcProviderCode,
      isServicePrincipal: identity.type === IdentityType.SERVICE,
      session: {
        sessionId: session.id,
        status: session.status,
        assuranceLevel: session.assuranceLevel,
        issuedAt: session.issuedAt,
        expiresAt: session.expiresAt,
        lastUsedAt: session.lastUsedAt,
        ipAddress: session.ipAddress,
        userAgent: session.userAgent,
      },
      organizationMemberships,
      representativeAuthorities,
      officeholderLinks,
      activeAppointments,
      activeDelegations,
      institutionContexts,
      hasInstitutionalRelationships:
        officeholderLinks.length > 0 ||
        activeAppointments.length > 0 ||
        activeDelegations.length > 0,
    };
  }

  /**
   * Rejects client attempts to substitute a different authenticated identity.
   * Institutional selectors (officeholderId, appointmentId, etc.) are validated
   * separately against actor relationships when supplied for a specific action.
   */
  assertNoClientIdentitySubstitution(
    actor: ActorContext,
    clientPayload: Record<string, unknown> | null | undefined,
  ): void {
    if (!clientPayload || typeof clientPayload !== 'object') {
      return;
    }

    for (const field of CLIENT_ACTOR_IDENTITY_FIELDS) {
      const clientValue = clientPayload[field];
      if (
        clientValue === undefined ||
        clientValue === null ||
        clientValue === '' ||
        typeof clientValue === 'object'
      ) {
        continue;
      }

      if (typeof clientValue !== 'string') {
        continue;
      }

      const actorValue = actor[field as keyof ActorContext];
      const normalizedClientValue = clientValue;
      const normalizedActorValue =
        typeof actorValue === 'string' ? actorValue : actorValue == null ? '' : null;

      if (normalizedActorValue === null || normalizedClientValue !== normalizedActorValue) {
        throw new ForbiddenException(
          `Client-supplied ${field} does not match authenticated actor context`,
        );
      }
    }
  }

  /**
   * Actor context cannot be built from request-body identifiers alone.
   * This guard ensures callers pass server-validated session context.
   */
  assertServerDerivedSession(session: SessionContextDto | null | undefined): void {
    if (!session?.sessionId || !session.identityId) {
      throw new UnauthorizedException(
        'Actor context requires authenticated server-derived session context',
      );
    }
  }

  private async loadActiveOrganizationMemberships(
    identityId: string,
    at: Date,
  ): Promise<ActorContextOrganizationMembership[]> {
    const memberships = await this.prisma.organizationMembership.findMany({
      where: { identityId, status: MembershipStatus.ACTIVE },
    });

    return memberships
      .filter((membership) =>
        isEffectiveAt(
          { effectiveFrom: membership.effectiveFrom, effectiveUntil: membership.effectiveUntil },
          at,
        ),
      )
      .map((membership) => ({
        membershipId: membership.id,
        organizationId: membership.organizationId,
        roleLabel: membership.roleLabel,
        status: membership.status,
        effectiveFrom: membership.effectiveFrom,
        effectiveUntil: membership.effectiveUntil,
      }));
  }

  private async loadActiveRepresentativeAuthorities(
    identityId: string,
    at: Date,
  ): Promise<ActorContextRepresentativeAuthority[]> {
    const authorities = await this.prisma.representativeAuthority.findMany({
      where: { identityId, status: RepresentativeAuthorityStatus.ACTIVE },
    });

    return authorities
      .filter((authority) =>
        isEffectiveAt(
          { effectiveFrom: authority.effectiveFrom, effectiveUntil: authority.effectiveUntil },
          at,
        ),
      )
      .map((authority) => ({
        representativeAuthorityId: authority.id,
        organizationId: authority.organizationId,
        scopeDescription: authority.scopeDescription,
        status: authority.status,
        effectiveFrom: authority.effectiveFrom,
        effectiveUntil: authority.effectiveUntil,
      }));
  }

  private async loadActiveOfficeholderLinks(
    identityId: string,
  ): Promise<ActorContextOfficeholderLink[]> {
    const links = await this.prisma.identityOfficeholderLink.findMany({
      where: {
        identityId,
        status: IdentityOfficeholderLinkStatus.ACTIVE,
      },
      orderBy: { linkedAt: 'desc' },
    });

    return links.map((link) => ({
      linkId: link.id,
      officeholderId: link.officeholderId,
      status: link.status,
      linkedAt: link.linkedAt,
    }));
  }

  private async loadActiveAppointments(
    officeholderIds: string[],
    at: Date,
  ): Promise<ActorContextAppointment[]> {
    const appointments = await this.prisma.appointment.findMany({
      where: { officeholderId: { in: officeholderIds } },
      include: { office: { include: { department: true } } },
      orderBy: [{ effectiveFrom: 'desc' }, { createdAt: 'desc' }],
    });

    return appointments
      .filter((appointment) => isAppointmentCurrent(appointment, at))
      .map((appointment) => ({
        appointmentId: appointment.id,
        officeholderId: appointment.officeholderId,
        officeId: appointment.officeId,
        departmentId: appointment.office.departmentId,
        institutionId: appointment.office.department.institutionId,
        status: appointment.status,
        effectiveFrom: appointment.effectiveFrom,
        effectiveUntil: appointment.effectiveUntil,
      }));
  }

  private async loadActiveDelegations(
    officeholderIds: string[],
    activeAppointments: ActorContextAppointment[],
    at: Date,
  ): Promise<ActorContextDelegation[]> {
    const officeIds = [...new Set(activeAppointments.map((appointment) => appointment.officeId))];
    const institutionIds = [
      ...new Set(activeAppointments.map((appointment) => appointment.institutionId)),
    ];

    if (officeholderIds.length === 0 && officeIds.length === 0) {
      return [];
    }

    const delegations = await this.prisma.delegation.findMany({
      where: {
        status: DelegationStatus.ACTIVE,
        institutionId: institutionIds.length > 0 ? { in: institutionIds } : undefined,
        OR: [
          ...(officeholderIds.length > 0
            ? [{ recipientOfficeholderId: { in: officeholderIds } }]
            : []),
          ...(officeIds.length > 0 ? [{ recipientOfficeId: { in: officeIds } }] : []),
        ],
      },
      orderBy: [{ effectiveFrom: 'desc' }, { createdAt: 'desc' }],
    });

    return delegations
      .filter((delegation) =>
        isEffectiveAt(
          { effectiveFrom: delegation.effectiveFrom, effectiveUntil: delegation.effectiveUntil },
          at,
        ),
      )
      .map((delegation) => ({
        delegationId: delegation.id,
        institutionId: delegation.institutionId,
        recipientOfficeholderId: delegation.recipientOfficeholderId,
        recipientOfficeId: delegation.recipientOfficeId,
        status: delegation.status,
        effectiveFrom: delegation.effectiveFrom,
        effectiveUntil: delegation.effectiveUntil,
      }));
  }

  private buildInstitutionContexts(
    activeAppointments: ActorContextAppointment[],
  ): ActorContextInstitutionContext[] {
    const byInstitution = new Map<string, ActorContextInstitutionContext>();

    for (const appointment of activeAppointments) {
      const existing = byInstitution.get(appointment.institutionId) ?? {
        institutionId: appointment.institutionId,
        departmentIds: [],
        officeIds: [],
      };

      if (!existing.departmentIds.includes(appointment.departmentId)) {
        existing.departmentIds.push(appointment.departmentId);
      }
      if (!existing.officeIds.includes(appointment.officeId)) {
        existing.officeIds.push(appointment.officeId);
      }

      byInstitution.set(appointment.institutionId, existing);
    }

    return [...byInstitution.values()];
  }
}
