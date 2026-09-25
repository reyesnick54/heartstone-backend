import {
  type AppointmentStatus,
  type AssuranceLevel,
  type DelegationStatus,
  type IdentityOfficeholderLinkStatus,
  type IdentityType,
  type MembershipStatus,
  type RepresentativeAuthorityStatus,
  type SessionStatus,
} from '@prisma/client';

/**
 * Server-derived authenticated actor context.
 *
 * Answers: "Who is the authenticated actor and what institutional relationships
 * currently exist?" — never "May this actor perform a consequential government action?"
 *
 * Must be constructed exclusively from validated session state plus database lookups
 * keyed by session.identityId. Client-supplied identity or institutional identifiers
 * must never override these fields.
 */
export interface ActorContextSessionMetadata {
  sessionId: string;
  status: SessionStatus;
  assuranceLevel: AssuranceLevel;
  issuedAt: Date;
  expiresAt: Date;
  lastUsedAt: Date | null;
  ipAddress: string | null;
  userAgent: string | null;
}

export interface ActorContextOrganizationMembership {
  membershipId: string;
  organizationId: string;
  roleLabel: string | null;
  status: MembershipStatus;
  effectiveFrom: Date;
  effectiveUntil: Date | null;
}

export interface ActorContextRepresentativeAuthority {
  representativeAuthorityId: string;
  organizationId: string;
  scopeDescription: string;
  status: RepresentativeAuthorityStatus;
  effectiveFrom: Date;
  effectiveUntil: Date | null;
}

export interface ActorContextOfficeholderLink {
  linkId: string;
  officeholderId: string;
  status: IdentityOfficeholderLinkStatus;
  linkedAt: Date;
}

export interface ActorContextAppointment {
  appointmentId: string;
  officeholderId: string;
  officeId: string;
  departmentId: string;
  institutionId: string;
  status: AppointmentStatus;
  effectiveFrom: Date;
  effectiveUntil: Date | null;
}

export interface ActorContextDelegation {
  delegationId: string;
  institutionId: string;
  recipientOfficeholderId: string | null;
  recipientOfficeId: string | null;
  status: DelegationStatus;
  effectiveFrom: Date;
  effectiveUntil: Date | null;
}

export interface ActorContextInstitutionContext {
  institutionId: string;
  departmentIds: string[];
  officeIds: string[];
}

export interface ActorContext {
  identityId: string;
  userAccountId: string | null;
  personId: string | null;
  sessionId: string;
  identityType: IdentityType;
  assuranceLevel: AssuranceLevel;

  session: ActorContextSessionMetadata;
  organizationMemberships: ActorContextOrganizationMembership[];
  representativeAuthorities: ActorContextRepresentativeAuthority[];
  officeholderLinks: ActorContextOfficeholderLink[];
  activeAppointments: ActorContextAppointment[];
  activeDelegations: ActorContextDelegation[];
  institutionContexts: ActorContextInstitutionContext[];

  /**
   * True when the identity has at least one active officeholder link, appointment,
   * or delegation relationship. Does not imply government authority.
   */
  hasInstitutionalRelationships: boolean;
}

/** Fields that must never appear on ActorContext — enforced in must-fail tests. */
export const FORBIDDEN_ACTOR_CONTEXT_AUTHORITY_FIELDS = [
  'hasGovernmentAuthority',
  'canApproveLicense',
  'canIssuePermit',
  'isDecisionMaker',
  'grantedActionTypes',
  'authorityOutcome',
  'mayPerformAction',
] as const;

/** Client payload keys that must not override server-derived actor identity. */
export const CLIENT_ACTOR_IDENTITY_FIELDS = [
  'identityId',
  'userAccountId',
  'personId',
  'sessionId',
] as const;

/** Client payload keys that identify the acting institutional binding for an action. */
export const CLIENT_INSTITUTIONAL_SELECTOR_FIELDS = [
  'officeholderId',
  'appointmentId',
  'delegationId',
  'officeId',
  'departmentId',
  'institutionId',
] as const;

export const ACTOR_BINDING_FAILURE_CODES = {
  OFFICEHOLDER_NOT_LINKED: 'ACTOR_OFFICEHOLDER_NOT_LINKED',
  APPOINTMENT_NOT_OWNED: 'ACTOR_APPOINTMENT_NOT_OWNED',
  APPOINTMENT_NOT_CURRENT: 'ACTOR_APPOINTMENT_NOT_CURRENT',
  APPOINTMENT_FUTURE: 'ACTOR_APPOINTMENT_FUTURE',
  APPOINTMENT_SUSPENDED: 'ACTOR_APPOINTMENT_SUSPENDED',
  APPOINTMENT_REVOKED: 'ACTOR_APPOINTMENT_REVOKED',
  DELEGATION_NOT_OWNED: 'ACTOR_DELEGATION_NOT_OWNED',
  DELEGATION_NOT_CURRENT: 'ACTOR_DELEGATION_NOT_CURRENT',
  NO_CURRENT_APPOINTMENT: 'ACTOR_NO_CURRENT_APPOINTMENT',
  AMBIGUOUS_APPOINTMENT: 'ACTOR_AMBIGUOUS_APPOINTMENT',
  SERVICE_CANNOT_IMPERSONATE: 'ACTOR_SERVICE_CANNOT_IMPERSONATE',
} as const;

export type ActorBindingFailureCode =
  (typeof ACTOR_BINDING_FAILURE_CODES)[keyof typeof ACTOR_BINDING_FAILURE_CODES];

export interface ActorInstitutionalSelectors {
  officeholderId?: string;
  appointmentId?: string;
  delegationId?: string;
  officeId?: string;
  departmentId?: string;
  institutionId?: string;
}

export interface ResolvedActorInstitutionalBinding {
  officeholderId: string;
  officeholderLinkId: string;
  appointment: ActorContextAppointment;
  delegation?: ActorContextDelegation | undefined;
  resolvedAt: Date;
}

/**
 * Audit-friendly snapshot of server-verified actor institutional context.
 * Suitable for persistence alongside consequential action records.
 */
export interface ActorContextResolutionAudit {
  sessionId: string;
  identityId: string;
  personId: string | null;
  userAccountId: string | null;
  identityType: IdentityType;
  officeholderId?: string;
  officeholderLinkId?: string;
  appointmentId?: string;
  delegationId?: string;
  institutionId?: string;
  departmentId?: string;
  officeId?: string;
  effectiveAt: Date;
}

/** Legacy summary shape; prefer {@link ActorContext} for new code. */
export interface ResolvedActorContext {
  identityId: string;
  identityType: IdentityType;
  userAccountId?: string | null;
  officeholderId?: string;
  linkedOfficeIds: string[];
  hasActiveOfficeholderLink: boolean;
  linkedInstitutionIds: string[];
}

export function toResolvedActorContext(actor: ActorContext): ResolvedActorContext {
  const officeIds = [
    ...new Set(actor.activeAppointments.map((appointment) => appointment.officeId)),
  ];
  const institutionIds = [
    ...new Set(actor.activeAppointments.map((appointment) => appointment.institutionId)),
  ];

  return {
    identityId: actor.identityId,
    identityType: actor.identityType,
    userAccountId: actor.userAccountId,
    officeholderId: actor.officeholderLinks[0]?.officeholderId,
    linkedOfficeIds: officeIds,
    hasActiveOfficeholderLink: actor.officeholderLinks.length > 0,
    linkedInstitutionIds: institutionIds,
  };
}
