import type {
  ApplicantCategory,
  CatalogServiceType,
  GovernmentServicePublicAvailability,
} from '@prisma/client';

export interface PublicServiceSummaryBody {
  serviceId: string;
  slug: string;
  serviceVersionId: string;
  versionLabel: string;
  publicName: string;
  plainLanguagePurpose: string;
  responsibleDepartmentDisplayName: string;
  serviceFamilyName: string;
  serviceType: CatalogServiceType | null;
  eligibleApplicantCategories: ApplicantCategory[];
  activitiesCovered: string[];
  availabilityStatus: GovernmentServicePublicAvailability;
  isPilotOnly: boolean;
  isInformationOnly: boolean;
  applicationCapable: boolean;
  informationLastVerifiedAt: string | null;
  nonbindingGuidanceDisclaimer: string;
}

export interface PaginatedPublicServicesBody {
  items: PublicServiceSummaryBody[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PublicServiceDetailBody extends PublicServiceSummaryBody {
  activitiesExcluded: string[];
  geographicScope: string | null;
  authorityClassificationSummary: string | null;
}

export interface PublicEligibilityBody {
  serviceId: string;
  serviceVersionId: string;
  eligible: boolean | null;
  matchedRules: string[];
  unmatchedRequiredRules: string[];
  guidanceNotes: string[];
  nonbindingDisclaimer: string;
}

export interface ServiceStartPackageChecklistItemBody {
  itemCode: string;
  label: string;
  description: string | null;
  conditionExpression: Record<string, unknown> | null;
  isRequired: boolean;
}

export interface ServiceStartPackageFeeBody {
  code: string;
  label: string;
  description: string | null;
  amountCents: number | null;
  currency: string;
  isVariable: boolean;
}

export interface ServiceStartPackageOutputBody {
  outputCode: string;
  label: string;
  description: string | null;
  validityLabel: string | null;
}

export interface ServiceStartPackageBody {
  serviceId: string;
  serviceSlug: string;
  serviceVersionId: string;
  versionLabel: string;
  formDefinitionId: string | null;
  formVersionId: string | null;
  formSchema: {
    properties?: Record<string, unknown>;
  } | null;
  conditionalChecklist: ServiceStartPackageChecklistItemBody[];
  feeDefinitions: ServiceStartPackageFeeBody[];
  outputDefinitions: ServiceStartPackageOutputBody[];
  publicDisclaimers: string[];
  applicationCapable: boolean;
  configurationFingerprint: string;
}

export interface PublicServiceFamilyBody {
  id: string;
  code: string;
  name: string;
  description: string | null;
}

export function asPaginatedPublicServicesBody(body: unknown): PaginatedPublicServicesBody {
  return body as PaginatedPublicServicesBody;
}

export function asPublicServiceDetailBody(body: unknown): PublicServiceDetailBody {
  return body as PublicServiceDetailBody;
}

export function asPublicEligibilityBody(body: unknown): PublicEligibilityBody {
  return body as PublicEligibilityBody;
}

export function asServiceStartPackageBody(body: unknown): ServiceStartPackageBody {
  return body as ServiceStartPackageBody;
}

export function asPublicServiceSummaryListBody(body: unknown): PublicServiceSummaryBody[] {
  return body as PublicServiceSummaryBody[];
}

export function asPublicServiceFamilyListBody(body: unknown): PublicServiceFamilyBody[] {
  return body as PublicServiceFamilyBody[];
}
