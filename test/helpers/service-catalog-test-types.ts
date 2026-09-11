import type {
  ApplicantCategory,
  GovernmentServiceMaturityStatus,
  GovernmentServicePublicAvailability,
} from '@prisma/client';

export interface GovernmentServiceBody {
  id: string;
  code: string;
  slug: string;
  officialName: string;
  publicName: string;
  summary?: string | null;
  responsibleInstitutionId: string;
  responsibleDepartmentId: string;
  serviceFamilyId: string;
  createdAt: string;
  updatedAt: string;
}

export interface GovernmentServiceVersionBody {
  id: string;
  governmentServiceId: string;
  version: string;
  purpose?: string | null;
  maturityStatus: GovernmentServiceMaturityStatus;
  publicAvailability: GovernmentServicePublicAvailability;
  applicantCategories: ApplicantCategory[];
  createdAt: string;
  updatedAt: string;
}

export interface ServiceFunctionMappingBody {
  id: string;
  governmentServiceVersionId: string;
  functionAuthorityRecordId: string;
  sequenceOrder: number;
  isConsequential: boolean;
  publicStageLabel?: string | null;
  functionAuthorityRecordCode?: string;
  functionAuthorityRecordName?: string;
}

export function asGovernmentServiceBody(body: unknown): GovernmentServiceBody {
  return body as GovernmentServiceBody;
}

export function asGovernmentServiceVersionBody(body: unknown): GovernmentServiceVersionBody {
  return body as GovernmentServiceVersionBody;
}

export function asServiceFunctionMappingBody(body: unknown): ServiceFunctionMappingBody {
  return body as ServiceFunctionMappingBody;
}
