import type {
  AccountStatus,
  AssuranceLevel,
  CredentialStatus,
  CredentialType,
  IdentityType,
  MembershipStatus,
  OrganizationStatus,
  RepresentativeAuthorityStatus,
} from '@prisma/client';

export interface PersonBody {
  id: string;
  givenName: string;
  familyName: string;
  displayName: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface UserAccountBody {
  id: string;
  personId: string | null;
  loginIdentifier: string;
  status: AccountStatus;
  createdAt: string;
  updatedAt: string;
}

export interface IdentityBody {
  id: string;
  type: IdentityType;
  userAccountId: string | null;
  personId: string | null;
  organizationId: string | null;
  displayName: string;
  createdAt: string;
  updatedAt: string;
}

export interface OrganizationBody {
  id: string;
  code: string;
  name: string;
  description: string | null;
  status: OrganizationStatus;
  createdAt: string;
  updatedAt: string;
}

export interface MembershipBody {
  id: string;
  organizationId: string;
  identityId: string;
  roleLabel: string | null;
  status: MembershipStatus;
  effectiveFrom: string;
  effectiveUntil: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface RepresentativeAuthorityBody {
  id: string;
  organizationId: string;
  identityId: string;
  scopeDescription: string;
  status: RepresentativeAuthorityStatus;
  effectiveFrom: string;
  effectiveUntil: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CredentialBody {
  id: string;
  identityId: string;
  type: CredentialType;
  status: CredentialStatus;
  oidcProvider: string | null;
  oidcSubject: string | null;
  revokedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface LoginResponseBody {
  sessionToken: string;
  sessionId: string;
  identityId: string;
  expiresAt: string;
  assuranceLevel: AssuranceLevel;
}

export interface ProtectedProfileBody {
  identityId: string;
  sessionId: string;
  assuranceLevel: string;
  hasGovernmentAuthority: false;
  governmentAuthorityNote: string;
}

export function asPersonBody(body: unknown): PersonBody {
  return body as PersonBody;
}

export function asUserAccountBody(body: unknown): UserAccountBody {
  return body as UserAccountBody;
}

export function asIdentityBody(body: unknown): IdentityBody {
  return body as IdentityBody;
}

export function asOrganizationBody(body: unknown): OrganizationBody {
  return body as OrganizationBody;
}

export function asMembershipBody(body: unknown): MembershipBody {
  return body as MembershipBody;
}

export function asRepresentativeAuthorityBody(body: unknown): RepresentativeAuthorityBody {
  return body as RepresentativeAuthorityBody;
}

export function asCredentialBody(body: unknown): CredentialBody {
  return body as CredentialBody;
}

export function asIdentityListBody(body: unknown): IdentityBody[] {
  return body as IdentityBody[];
}

export function asLoginResponseBody(body: unknown): LoginResponseBody {
  return body as LoginResponseBody;
}

export function asProtectedProfileBody(body: unknown): ProtectedProfileBody {
  return body as ProtectedProfileBody;
}
