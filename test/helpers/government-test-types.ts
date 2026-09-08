import type {
  AppointmentStatus,
  DelegationStatus,
  ExternalAuthorityType,
  GovernmentBodyType,
  InstitutionType,
  JurisdictionType,
  StructuralLifecycleStatus,
} from '@prisma/client';
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

export interface GovernmentBody {
  id: string;
  institutionId: string;
  code: string;
  name: string;
  description: string | null;
  type: GovernmentBodyType;
  status: StructuralLifecycleStatus;
  createdAt: string;
  updatedAt: string;
}

export interface OfficeBody {
  id: string;
  departmentId: string;
  code: string;
  name: string;
  title: string;
  description: string | null;
  status: StructuralLifecycleStatus;
  createdAt: string;
  updatedAt: string;
}

export interface OfficeholderBody {
  id: string;
  code: string;
  name: string;
  description: string | null;
  status: StructuralLifecycleStatus;
  createdAt: string;
  updatedAt: string;
}

export interface AppointmentBody {
  id: string;
  officeId: string;
  officeholderId: string;
  status: AppointmentStatus;
  effectiveFrom: string;
  effectiveUntil: string | null;
  isCurrent: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface DelegationBody {
  id: string;
  institutionId: string;
  delegatorOfficeId: string | null;
  delegatorOfficeholderId: string | null;
  recipientOfficeId: string | null;
  recipientOfficeholderId: string | null;
  scopeDescription: string;
  status: DelegationStatus;
  effectiveFrom: string;
  effectiveUntil: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ExternalAuthorityBody {
  id: string;
  code: string;
  name: string;
  description: string | null;
  type: ExternalAuthorityType;
  status: StructuralLifecycleStatus;
  createdAt: string;
  updatedAt: string;
}

export interface DepartmentBody {
  id: string;
  institutionId: string;
  code: string;
  name: string;
  description: string | null;
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

export interface StructureAppointmentBody {
  id: string;
  status: AppointmentStatus;
  effectiveFrom: string;
  effectiveUntil: string | null;
  officeholder: Pick<OfficeholderBody, 'id' | 'code' | 'name' | 'status'> | null;
}

export interface StructureOfficeBody {
  id: string;
  code: string;
  name: string;
  status: StructuralLifecycleStatus;
  currentAppointment: StructureAppointmentBody | null;
}

export interface StructureDepartmentBody {
  id: string;
  code: string;
  name: string;
  status: StructuralLifecycleStatus;
  offices: StructureOfficeBody[];
}

export interface InstitutionStructureBody {
  id: string;
  jurisdictionId: string;
  code: string;
  name: string;
  type: InstitutionType;
  status: StructuralLifecycleStatus;
  governmentBodies: GovernmentBody[];
  departments: StructureDepartmentBody[];
  externalAuthorities: {
    id: string;
    code: string;
    name: string;
    type: ExternalAuthorityType;
    status: StructuralLifecycleStatus;
    relationshipLabel: string | null;
    effectiveFrom: string | null;
    effectiveUntil: string | null;
  }[];
}

export interface JurisdictionStructureBody {
  jurisdiction: Pick<JurisdictionBody, 'id' | 'code' | 'name' | 'type' | 'status'>;
  institutions: InstitutionStructureBody[];
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

export function asGovernmentBody(body: unknown): GovernmentBody {
  return body as GovernmentBody;
}

export function asOfficeBody(body: unknown): OfficeBody {
  return body as OfficeBody;
}

export function asOfficeholderBody(body: unknown): OfficeholderBody {
  return body as OfficeholderBody;
}

export function asAppointmentBody(body: unknown): AppointmentBody {
  return body as AppointmentBody;
}

export function asDelegationBody(body: unknown): DelegationBody {
  return body as DelegationBody;
}

export function asExternalAuthorityBody(body: unknown): ExternalAuthorityBody {
  return body as ExternalAuthorityBody;
}

export function asDepartmentBody(body: unknown): DepartmentBody {
  return body as DepartmentBody;
}

export function asInstitutionStructureBody(body: unknown): InstitutionStructureBody {
  return body as InstitutionStructureBody;
}

export function asJurisdictionStructureBody(body: unknown): JurisdictionStructureBody {
  return body as JurisdictionStructureBody;
}
