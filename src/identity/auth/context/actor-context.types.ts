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

import { type AuthenticatedPrincipal } from '../domain/authenticated-principal';

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

/** Lightweight institutional actor profile for case and document access checks. */
export interface InstitutionalCaseAccessActor {
  identityId: string;
  identityType: IdentityType;
  userAccountId: string | null;
  officeholderId?: string;
  linkedOfficeIds: string[];
  hasActiveOfficeholderLink: boolean;
  linkedInstitutionIds: string[];
}

export interface ActorContext extends AuthenticatedPrincipal {
  userAccountId: string | null;
  identityType: IdentityType;
  personId: string | null;

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
