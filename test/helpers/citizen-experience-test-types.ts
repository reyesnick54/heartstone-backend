import type { ApplicantCategory, GovernmentServicePublicAvailability } from '@prisma/client';

import type { ServiceStartPackageBody } from './public-service-test-types';

export interface CitizenMeResponse {
  profile: { identityId: string };
  accountAssurance: { hasGovernmentAuthority: boolean };
  disclaimer: { labelKey: string };
  representationRelationships: { representativeAuthorityId: string }[];
}

export interface CitizenHomeResponse {
  counts: Record<string, number>;
  disclaimer: { labelKey: string };
}

export interface CitizenApplicationsResponse {
  items: { applicationId: string }[];
  pagination: {
    totalItems: number;
    hasNextPage: boolean;
    page: number;
    pageSize: number;
  };
}

export interface CitizenApplicationDetailResponse {
  applicationId: string;
  attribution: { serviceId: string };
  disclaimer: { labelKey: string };
}

export interface CitizenCaseStatusResponse {
  caseId: string;
  applicantDisclaimer: { labelKey: string };
}

export interface CitizenActionResponse {
  actionCode: string;
  label: { labelKey: string };
  deepLink: { route: string };
}

export interface CitizenActionsListResponse {
  items: CitizenActionResponse[];
  pagination: { page: number; pageSize: number };
}

export interface CitizenStartExperienceBody extends Omit<ServiceStartPackageBody, 'formSchema'> {
  requiredFields: string[];
  declarations: {
    declarationVersion: string;
    declarationText: Record<string, string>;
  }[];
  expectedNextStep: string;
  formSchema: {
    formVersionId: string;
    sections: {
      sectionKey: string;
      fields: { fieldKey: string; required: boolean }[];
    }[];
  } | null;
}

export interface CitizenApplicationBody {
  id: string;
  governmentServiceVersionId: string;
  formVersionId: string;
  configurationFingerprint: string;
}

export interface CitizenServiceDetailBody {
  slug: string;
  publicName: string;
  plainLanguagePurpose: string;
  serviceFamilyName: string;
  responsibleDepartmentDisplayName: string;
  eligibleApplicantCategories: ApplicantCategory[];
  availabilityStatus: GovernmentServicePublicAvailability;
  applicationCapable: boolean;
  fees: { code: string; label: string }[];
  expectedOutputs: { outputCode: string; label: string }[];
  reviewComplaintRoutes: { routeCode: string; label: string }[];
  expectedHighLevelStages: { stageCode: string; label: string }[];
  nonbindingGuidanceDisclaimer: string;
}

export function asCitizenMeBody(body: unknown): CitizenMeResponse {
  return body as CitizenMeResponse;
}

export function asCitizenHomeBody(body: unknown): CitizenHomeResponse {
  return body as CitizenHomeResponse;
}

export function asCitizenApplicationsBody(body: unknown): CitizenApplicationsResponse {
  return body as CitizenApplicationsResponse;
}

export function asCitizenApplicationDetailBody(body: unknown): CitizenApplicationDetailResponse {
  return body as CitizenApplicationDetailResponse;
}

export function asCitizenCaseStatusBody(body: unknown): CitizenCaseStatusResponse {
  return body as CitizenCaseStatusResponse;
}

export function asCitizenActionsBody(body: unknown): CitizenActionsListResponse {
  return body as CitizenActionsListResponse;
}

export function asCitizenStartExperienceBody(body: unknown): CitizenStartExperienceBody {
  return body as CitizenStartExperienceBody;
}

export function asCitizenServiceDetailBody(body: unknown): CitizenServiceDetailBody {
  return body as CitizenServiceDetailBody;
}

export function asCitizenApplicationBody(body: unknown): CitizenApplicationBody {
  return body as CitizenApplicationBody;
}
