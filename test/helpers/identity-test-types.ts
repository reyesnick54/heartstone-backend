import type { AccountStatus, AssuranceLevel, IdentityType } from '@prisma/client';

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

export function asLoginResponseBody(body: unknown): LoginResponseBody {
  return body as LoginResponseBody;
}

export function asProtectedProfileBody(body: unknown): ProtectedProfileBody {
  return body as ProtectedProfileBody;
}
