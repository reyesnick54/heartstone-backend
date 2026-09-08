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

export function asJurisdictionBody(body: unknown): JurisdictionBody {
  return body as JurisdictionBody;
}

export function asInstitutionBody(body: unknown): InstitutionBody {
  return body as InstitutionBody;
}

export function asInstitutionListBody(body: unknown): InstitutionBody[] {
  return body as InstitutionBody[];
}
