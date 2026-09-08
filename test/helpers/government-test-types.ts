import type { InstitutionType, JurisdictionType, StructuralLifecycleStatus } from '@prisma/client';

export interface JurisdictionBody {
  id: string;
  code: string;
  name: string;
  description: string | null;
  type: JurisdictionType;
  status: StructuralLifecycleStatus;
  createdAt: string;
  updatedAt: string;
}

export interface InstitutionBody {
  id: string;
  jurisdictionId: string;
  code: string;
  name: string;
  description: string | null;
  type: InstitutionType;
  status: StructuralLifecycleStatus;
  createdAt: string;
  updatedAt: string;
}

export interface OfficeBody {
  id: string;
  departmentId: string;
  code: string;
  title: string;
  description: string | null;
  status: StructuralLifecycleStatus;
  createdAt: string;
  updatedAt: string;
}

export interface OfficeholderBody {
  id: string;
  referenceCode: string;
  displayName: string;
  givenName: string | null;
  familyName: string | null;
  titlePrefix: string | null;
  titleSuffix: string | null;
  status: StructuralLifecycleStatus;
  createdAt: string;
  updatedAt: string;
}

export function asJurisdictionBody(body: unknown): JurisdictionBody {
  return body as JurisdictionBody;
}

export function asInstitutionBody(body: unknown): InstitutionBody {
  return body as InstitutionBody;
}

export function asInstitutionListBody(body: unknown): InstitutionBody[] {
  return body as InstitutionBody[];
}

export function asOfficeBody(body: unknown): OfficeBody {
  return body as OfficeBody;
}

export function asOfficeholderBody(body: unknown): OfficeholderBody {
  return body as OfficeholderBody;
}
