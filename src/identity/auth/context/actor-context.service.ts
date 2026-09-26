import { ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import {
  AppointmentStatus,
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
  ACTOR_BINDING_FAILURE_CODES,
  type ActorBindingFailureCode,
  type ActorContext,
  type ActorContextAppointment,
  type ActorContextDelegation,
  type ActorContextInstitutionContext,
  type ActorContextOfficeholderLink,
  type ActorContextOrganizationMembership,
  type ActorContextRepresentativeAuthority,
  type ActorContextResolutionAudit,
  type ActorInstitutionalSelectors,
  CLIENT_ACTOR_IDENTITY_FIELDS,
  CLIENT_ADMIN_ACTOR_FIELD_ALIASES,
  type InstitutionalCaseAccessActor,
  type ResolvedActorContext,
  type ResolvedActorInstitutionalBinding,
  toResolvedActorContext,
} from './actor-context.types';

export class ActorInstitutionalBindingException extends ForbiddenException {
  constructor(
    public readonly code: ActorBindingFailureCode,
    message: string,
  ) {
    super({ message, code });
  }
}

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

    const fieldsToValidate: { clientField: string; actorField: keyof ActorContext }[] = [
      ...CLIENT_ACTOR_IDENTITY_FIELDS.map((field) => ({
        clientField: field,
        actorField: field,
      })),
      ...Object.entries(CLIENT_ADMIN_ACTOR_FIELD_ALIASES).map(([clientField, actorField]) => ({
        clientField,
        actorField,
      })),
    ];

    for (const { clientField, actorField } of fieldsToValidate) {
      const clientValue = clientPayload[clientField];
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

      const actorValue = actor[actorField];
      const normalizedClientValue = clientValue;
      const normalizedActorValue =
        typeof actorValue === 'string' ? actorValue : actorValue == null ? '' : null;

      if (normalizedActorValue === null || normalizedClientValue !== normalizedActorValue) {
        throw new ForbiddenException(
          `Client-supplied ${clientField} does not match authenticated actor context`,
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

  /**
   * Resolves institutional relationships for case/document access without a live session token.
   * Callers must still authenticate the identity through a validated session elsewhere.
   */
  async resolveInstitutionalCaseAccessActor(
    identityId: string,
  ): Promise<InstitutionalCaseAccessActor> {
    const identity = await this.prisma.identity.findUnique({
      where: { id: identityId },
      select: {
        type: true,
        userAccountId: true,
        officeholderLinks: {
          where: { status: IdentityOfficeholderLinkStatus.ACTIVE },
          select: {
            officeholderId: true,
            officeholder: {
              select: {
                appointments: {
                  where: { status: 'ACTIVE' },
                  select: {
                    officeId: true,
                    office: {
                      select: {
                        department: { select: { institutionId: true } },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!identity) {
      throw new UnauthorizedException(`Identity "${identityId}" was not found`);
    }

    const activeLinks = identity.officeholderLinks;
    const linkedOfficeIds = activeLinks.flatMap((link) =>
      link.officeholder.appointments.map((appointment) => appointment.officeId),
    );
    const linkedInstitutionIds = [
      ...new Set(
        activeLinks.flatMap((link) =>
          link.officeholder.appointments.map(
            (appointment) => appointment.office.department.institutionId,
          ),
        ),
      ),
    ] as string[];

    return {
      identityId,
      identityType: identity.type,
      userAccountId: identity.userAccountId,
      officeholderId: activeLinks[0]?.officeholderId,
      linkedOfficeIds,
      hasActiveOfficeholderLink: activeLinks.length > 0,
      linkedInstitutionIds,
    };
  }

  assertActorIdentityMatchesSession(
    sessionIdentityId: string,
    suppliedIdentityId: string | undefined | null,
    fieldName: string,
  ): void {
    if (!suppliedIdentityId) {
      return;
    }

    if (suppliedIdentityId !== sessionIdentityId) {
      throw new ForbiddenException(
        `Client-supplied ${fieldName} must not differ from authenticated session identity`,
      );
    }
  }

  /** Session-backed summary for callers that only hold `session.identityId`. */
  async resolveFromIdentityId(identityId: string, at?: Date): Promise<ResolvedActorContext> {
    const identity = await this.prisma.identity.findUnique({
      where: { id: identityId },
      select: { id: true },
    });

    if (!identity) {
      throw new UnauthorizedException(`Identity "${identityId}" was not found`);
    }

    const session = await this.prisma.session.findFirst({
      where: { identityId, status: SessionStatus.ACTIVE },
      orderBy: { issuedAt: 'desc' },
    });

    if (!session) {
      throw new UnauthorizedException(
        'resolveFromIdentityId requires an active server session for the identity',
      );
    }

    const actor = await this.resolveFromSessionContext({
      session: {
        sessionId: session.id,
        identityId: session.identityId,
        userAccountId: session.userAccountId,
        assuranceLevel: session.assuranceLevel,
      },
      at,
    });

    return toResolvedActorContext(actor);
  }

  assertOfficeholderLinkedToActor(actor: ActorContext, officeholderId: string): void {
    if (actor.identityType === IdentityType.SERVICE) {
      throw new ActorInstitutionalBindingException(
        ACTOR_BINDING_FAILURE_CODES.SERVICE_CANNOT_IMPERSONATE,
        'Service identities cannot act as human officeholders',
      );
    }

    const linked = actor.officeholderLinks.some((link) => link.officeholderId === officeholderId);
    if (!linked) {
      throw new ActorInstitutionalBindingException(
        ACTOR_BINDING_FAILURE_CODES.OFFICEHOLDER_NOT_LINKED,
        'Officeholder is not linked to the authenticated actor',
      );
    }
  }

  async resolveBoundAppointment(
    actor: ActorContext,
    input: {
      appointmentId?: string;
      officeholderId?: string;
      officeId?: string;
      requireExplicitAppointment?: boolean;
      at?: Date;
    },
  ): Promise<ResolvedActorInstitutionalBinding> {
    const at = input.at ?? new Date();

    if (actor.identityType === IdentityType.SERVICE) {
      throw new ActorInstitutionalBindingException(
        ACTOR_BINDING_FAILURE_CODES.SERVICE_CANNOT_IMPERSONATE,
        'Service identities cannot act as human officeholders',
      );
    }

    const officeholderId = this.resolveOfficeholderId(actor, input.officeholderId);
    const link = actor.officeholderLinks.find((item) => item.officeholderId === officeholderId);
    if (!link) {
      throw new ActorInstitutionalBindingException(
        ACTOR_BINDING_FAILURE_CODES.OFFICEHOLDER_NOT_LINKED,
        'Officeholder is not linked to the authenticated actor',
      );
    }

    const currentAppointments = actor.activeAppointments.filter(
      (appointment) => appointment.officeholderId === officeholderId,
    );

    if (input.appointmentId) {
      const appointment = currentAppointments.find(
        (item) => item.appointmentId === input.appointmentId,
      );
      if (!appointment) {
        throw await this.buildAppointmentBindingFailure(
          input.appointmentId,
          actor,
          officeholderId,
          at,
        );
      }

      if (input.officeId && appointment.officeId !== input.officeId) {
        throw new ActorInstitutionalBindingException(
          ACTOR_BINDING_FAILURE_CODES.APPOINTMENT_NOT_OWNED,
          'Appointment office does not match requested office context',
        );
      }

      return {
        officeholderId,
        officeholderLinkId: link.linkId,
        appointment,
        resolvedAt: at,
      };
    }

    const scoped = input.officeId
      ? currentAppointments.filter((appointment) => appointment.officeId === input.officeId)
      : currentAppointments;

    if (scoped.length === 0) {
      throw new ActorInstitutionalBindingException(
        ACTOR_BINDING_FAILURE_CODES.NO_CURRENT_APPOINTMENT,
        'Authenticated actor has no current appointment for the requested institutional context',
      );
    }

    if (scoped.length > 1 && input.requireExplicitAppointment) {
      throw new ActorInstitutionalBindingException(
        ACTOR_BINDING_FAILURE_CODES.AMBIGUOUS_APPOINTMENT,
        'Multiple current appointments require an explicit appointmentId',
      );
    }

    const appointment = scoped[0];
    if (!appointment) {
      throw new ActorInstitutionalBindingException(
        ACTOR_BINDING_FAILURE_CODES.NO_CURRENT_APPOINTMENT,
        'Authenticated actor has no current appointment for the requested institutional context',
      );
    }

    return {
      officeholderId,
      officeholderLinkId: link.linkId,
      appointment,
      resolvedAt: at,
    };
  }

  assertBoundDelegation(
    actor: ActorContext,
    binding: ResolvedActorInstitutionalBinding,
    delegationId: string,
    at: Date = new Date(),
  ): ActorContextDelegation {
    const delegation = actor.activeDelegations.find((item) => item.delegationId === delegationId);
    if (!delegation) {
      throw new ActorInstitutionalBindingException(
        ACTOR_BINDING_FAILURE_CODES.DELEGATION_NOT_OWNED,
        'Delegation is not active for the authenticated actor',
      );
    }

    const recipientMatches =
      delegation.recipientOfficeholderId === binding.officeholderId ||
      (delegation.recipientOfficeId !== null &&
        delegation.recipientOfficeId === binding.appointment.officeId);

    if (!recipientMatches) {
      throw new ActorInstitutionalBindingException(
        ACTOR_BINDING_FAILURE_CODES.DELEGATION_NOT_OWNED,
        'Delegation does not apply to the resolved actor appointment',
      );
    }

    if (
      !isEffectiveAt(
        { effectiveFrom: delegation.effectiveFrom, effectiveUntil: delegation.effectiveUntil },
        at,
      )
    ) {
      throw new ActorInstitutionalBindingException(
        ACTOR_BINDING_FAILURE_CODES.DELEGATION_NOT_CURRENT,
        'Delegation is not current at the effective time',
      );
    }

    return delegation;
  }

  async assertInstitutionalSelectorsBoundToActor(
    actor: ActorContext,
    selectors: ActorInstitutionalSelectors,
    options?: { requireAppointment?: boolean; requireExplicitAppointment?: boolean; at?: Date },
  ): Promise<ResolvedActorInstitutionalBinding | null> {
    const at = options?.at ?? new Date();
    const hasSelectors =
      selectors.officeholderId !== undefined ||
      selectors.appointmentId !== undefined ||
      selectors.delegationId !== undefined ||
      selectors.officeId !== undefined;

    if (!hasSelectors && !options?.requireAppointment) {
      return null;
    }

    const binding = await this.resolveBoundAppointment(actor, {
      appointmentId: selectors.appointmentId,
      officeholderId: selectors.officeholderId,
      officeId: selectors.officeId,
      requireExplicitAppointment: options?.requireExplicitAppointment,
      at,
    });

    if (selectors.institutionId && binding.appointment.institutionId !== selectors.institutionId) {
      throw new ActorInstitutionalBindingException(
        ACTOR_BINDING_FAILURE_CODES.APPOINTMENT_NOT_OWNED,
        'Appointment institution does not match requested institution context',
      );
    }

    if (selectors.departmentId && binding.appointment.departmentId !== selectors.departmentId) {
      throw new ActorInstitutionalBindingException(
        ACTOR_BINDING_FAILURE_CODES.APPOINTMENT_NOT_OWNED,
        'Appointment department does not match requested department context',
      );
    }

    if (selectors.delegationId) {
      const delegation = this.assertBoundDelegation(actor, binding, selectors.delegationId, at);
      return { ...binding, delegation };
    }

    return binding;
  }

  buildResolutionAudit(
    actor: ActorContext,
    binding: ResolvedActorInstitutionalBinding | null,
    at: Date = new Date(),
  ): ActorContextResolutionAudit {
    const appointment = binding?.appointment;

    return {
      sessionId: actor.sessionId,
      identityId: actor.identityId,
      personId: actor.personId,
      userAccountId: actor.userAccountId,
      identityType: actor.identityType,
      officeholderId: binding?.officeholderId,
      officeholderLinkId: binding?.officeholderLinkId,
      appointmentId: appointment?.appointmentId,
      delegationId: binding?.delegation?.delegationId,
      institutionId: appointment?.institutionId,
      departmentId: appointment?.departmentId,
      officeId: appointment?.officeId,
      effectiveAt: at,
    };
  }

  private resolveOfficeholderId(actor: ActorContext, requestedOfficeholderId?: string): string {
    if (requestedOfficeholderId) {
      this.assertOfficeholderLinkedToActor(actor, requestedOfficeholderId);
      return requestedOfficeholderId;
    }

    if (actor.officeholderLinks.length === 1) {
      const onlyLink = actor.officeholderLinks[0];
      if (onlyLink) {
        return onlyLink.officeholderId;
      }
    }

    if (actor.officeholderLinks.length === 0) {
      throw new ActorInstitutionalBindingException(
        ACTOR_BINDING_FAILURE_CODES.OFFICEHOLDER_NOT_LINKED,
        'Authenticated actor has no linked officeholder',
      );
    }

    throw new ActorInstitutionalBindingException(
      ACTOR_BINDING_FAILURE_CODES.AMBIGUOUS_APPOINTMENT,
      'Multiple officeholder links require an explicit officeholderId',
    );
  }

  private async buildAppointmentBindingFailure(
    appointmentId: string,
    actor: ActorContext,
    officeholderId: string,
    at: Date,
  ): Promise<ActorInstitutionalBindingException> {
    const linkedOfficeholderIds = new Set(
      actor.officeholderLinks.map((link) => link.officeholderId),
    );

    const appointment = await this.prisma.appointment.findUnique({ where: { id: appointmentId } });

    if (!appointment) {
      return new ActorInstitutionalBindingException(
        ACTOR_BINDING_FAILURE_CODES.APPOINTMENT_NOT_OWNED,
        'Appointment is not bound to the authenticated actor',
      );
    }

    if (!linkedOfficeholderIds.has(appointment.officeholderId)) {
      return new ActorInstitutionalBindingException(
        ACTOR_BINDING_FAILURE_CODES.APPOINTMENT_NOT_OWNED,
        'Appointment belongs to a different officeholder than the authenticated actor',
      );
    }

    if (appointment.officeholderId !== officeholderId) {
      return new ActorInstitutionalBindingException(
        ACTOR_BINDING_FAILURE_CODES.APPOINTMENT_NOT_OWNED,
        'Appointment does not match the requested officeholder context',
      );
    }

    if (appointment.status === AppointmentStatus.SUSPENDED) {
      return new ActorInstitutionalBindingException(
        ACTOR_BINDING_FAILURE_CODES.APPOINTMENT_SUSPENDED,
        'Appointment is suspended',
      );
    }

    if (
      appointment.status === AppointmentStatus.REVOKED ||
      appointment.status === AppointmentStatus.ENDED
    ) {
      return new ActorInstitutionalBindingException(
        ACTOR_BINDING_FAILURE_CODES.APPOINTMENT_REVOKED,
        'Appointment is revoked or ended',
      );
    }

    if (appointment.effectiveFrom > at) {
      return new ActorInstitutionalBindingException(
        ACTOR_BINDING_FAILURE_CODES.APPOINTMENT_FUTURE,
        'Appointment is not yet effective',
      );
    }

    if (appointment.effectiveUntil !== null && appointment.effectiveUntil <= at) {
      return new ActorInstitutionalBindingException(
        ACTOR_BINDING_FAILURE_CODES.APPOINTMENT_NOT_CURRENT,
        'Appointment is expired',
      );
    }

    return new ActorInstitutionalBindingException(
      ACTOR_BINDING_FAILURE_CODES.APPOINTMENT_NOT_OWNED,
      'Appointment is not current for the authenticated actor',
    );
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
