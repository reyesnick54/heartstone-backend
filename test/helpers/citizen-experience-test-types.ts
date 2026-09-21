import type { ApplicantCategory, GovernmentServicePublicAvailability } from '@prisma/client';

import type { ServiceStartPackageBody } from './public-service-test-types';

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

export function asCitizenStartExperienceBody(body: unknown): CitizenStartExperienceBody {
  return body as CitizenStartExperienceBody;
}

export function asCitizenServiceDetailBody(body: unknown): CitizenServiceDetailBody {
  return body as CitizenServiceDetailBody;
}

export function asCitizenApplicationBody(body: unknown): CitizenApplicationBody {
  return body as CitizenApplicationBody;
}
