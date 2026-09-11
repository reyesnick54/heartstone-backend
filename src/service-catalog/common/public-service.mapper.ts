import {
  type ApplicantCategory,
  type CatalogServiceType,
  GovernmentServicePublicAvailability,
  type Prisma,
} from '@prisma/client';

import {
  APPLICATION_STARTABLE_AVAILABILITY,
  PUBLIC_NONBINDING_DISCLAIMER,
} from './public-discovery.constants';
import { buildServiceConfigurationFingerprint } from './service-configuration-hash.util';

export type PublicGovernmentServiceVersionRecord = Prisma.GovernmentServiceVersionGetPayload<{
  include: {
    fees: true;
    eligibilityRules: true;
    checklistItems: true;
    outputs: true;
    redressRoutes: true;
    formDefinition: true;
    formVersion: true;
    applicantCategories: true;
    functionMappings: {
      include: {
        functionAuthorityRecord: {
          select: {
            classification: true;
            name: true;
          };
        };
      };
    };
    governmentService: {
      include: {
        responsibleDepartment: true;
        serviceFamily: true;
      };
    };
  };
}>;

export interface PublicServiceSummary {
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

export interface PublicServiceDetail extends PublicServiceSummary {
  activitiesExcluded: string[];
  geographicScope: string | null;
  authorityClassificationSummary: string | null;
  majorGovernmentDependencies: Prisma.JsonValue;
  expectedHighLevelStages: {
    stageCode: string;
    label: string;
    description: string | null;
    estimatedDurationLabel: string | null;
  }[];
  fees: {
    code: string;
    label: string;
    description: string | null;
    amountCents: number | null;
    currency: string;
    isVariable: boolean;
  }[];
  expectedOutputs: {
    outputCode: string;
    label: string;
    description: string | null;
    validityLabel: string | null;
  }[];
  typicalValidity: string | null;
  reviewComplaintRoutes: {
    routeCode: string;
    label: string;
    description: string | null;
    contactReference: string | null;
  }[];
  publicDisclaimer: string | null;
}

export interface ServiceStartPackage {
  serviceId: string;
  serviceSlug: string;
  serviceVersionId: string;
  versionLabel: string;
  formDefinitionId: string | null;
  formVersionId: string | null;
  formSchema: Prisma.JsonValue | null;
  eligibilityGuidance: {
    ruleCode: string;
    label: string;
    description: string;
    isRequired: boolean;
  }[];
  conditionalChecklist: {
    itemCode: string;
    label: string;
    description: string | null;
    conditionExpression: Prisma.JsonValue | null;
    isRequired: boolean;
  }[];
  feeDefinitions: PublicServiceDetail['fees'];
  dependencySummary: Prisma.JsonValue;
  expectedStagesSummary: PublicServiceDetail['expectedHighLevelStages'];
  outputDefinitions: PublicServiceDetail['expectedOutputs'];
  redressRoutes: PublicServiceDetail['reviewComplaintRoutes'];
  serviceAvailability: GovernmentServicePublicAvailability;
  applicationCapable: boolean;
  publicDisclaimers: string[];
  configurationFingerprint: string;
}

export interface PublicEligibilityResult {
  serviceId: string;
  serviceVersionId: string;
  eligible: boolean | null;
  matchedRules: string[];
  unmatchedRequiredRules: string[];
  guidanceNotes: string[];
  nonbindingDisclaimer: string;
}

function sortByOrder<T extends { sortOrder: number }>(items: T[]): T[] {
  return [...items].sort((left, right) => left.sortOrder - right.sortOrder);
}

export function parseActivityList(value: string | null | undefined): string[] {
  if (!value) {
    return [];
  }

  return value
    .split(/[\n,;]+/)
    .map((entry) => entry.trim())
    .filter(Boolean);
}

export function isApplicationCapableAvailability(
  availability: GovernmentServicePublicAvailability,
): boolean {
  return APPLICATION_STARTABLE_AVAILABILITY.includes(availability);
}

export function mapPublicServiceSummary(
  version: PublicGovernmentServiceVersionRecord,
): PublicServiceSummary {
  const service = version.governmentService;

  return {
    serviceId: service.id,
    slug: service.slug,
    serviceVersionId: version.id,
    versionLabel: version.version,
    publicName: service.publicName,
    plainLanguagePurpose:
      version.purpose ?? version.publicDescription ?? service.summary ?? service.publicName,
    responsibleDepartmentDisplayName: service.responsibleDepartment.name,
    serviceFamilyName: service.serviceFamily.name,
    serviceType: service.catalogServiceType,
    eligibleApplicantCategories: version.applicantCategories.map((entry) => entry.category),
    activitiesCovered: parseActivityList(version.coveredActivities),
    availabilityStatus: version.publicAvailability,
    isPilotOnly: version.publicAvailability === GovernmentServicePublicAvailability.PILOT_ONLY,
    isInformationOnly:
      version.publicAvailability === GovernmentServicePublicAvailability.INFORMATION_ONLY,
    applicationCapable: isApplicationCapableAvailability(version.publicAvailability),
    informationLastVerifiedAt: version.informationLastVerifiedAt?.toISOString() ?? null,
    nonbindingGuidanceDisclaimer: PUBLIC_NONBINDING_DISCLAIMER,
  };
}

export function mapPublicServiceDetail(
  version: PublicGovernmentServiceVersionRecord,
): PublicServiceDetail {
  const summary = mapPublicServiceSummary(version);

  return {
    ...summary,
    activitiesExcluded: parseActivityList(version.excludedActivities),
    geographicScope: version.geographicScope,
    authorityClassificationSummary: version.authorityClassificationSummary,
    majorGovernmentDependencies: version.majorDependencies,
    expectedHighLevelStages: [...version.functionMappings]
      .sort((left, right) => left.sequenceOrder - right.sequenceOrder)
      .map((mapping) => ({
        stageCode: mapping.functionAuthorityRecord.name,
        label: mapping.publicStageLabel ?? mapping.functionAuthorityRecord.name,
        description: mapping.functionAuthorityRecord.classification,
        estimatedDurationLabel: null,
      })),
    fees: sortByOrder(version.fees).map((fee) => ({
      code: fee.code,
      label: fee.label,
      description: fee.description,
      amountCents: fee.amountCents,
      currency: fee.currency,
      isVariable: fee.isVariable,
    })),
    expectedOutputs: sortByOrder(version.outputs).map((output) => ({
      outputCode: output.outputCode,
      label: output.label,
      description: output.description,
      validityLabel: output.validityLabel,
    })),
    typicalValidity: version.typicalValidityDescription,
    reviewComplaintRoutes: sortByOrder(version.redressRoutes).map((route) => ({
      routeCode: route.routeCode,
      label: route.label,
      description: route.description,
      contactReference: route.contactReference,
    })),
    publicDisclaimer: version.publicDisclaimer,
  };
}

export function mapServiceStartPackage(
  version: PublicGovernmentServiceVersionRecord,
  disclaimers: string[],
): ServiceStartPackage {
  const detail = mapPublicServiceDetail(version);

  return {
    serviceId: version.governmentServiceId,
    serviceSlug: version.governmentService.slug,
    serviceVersionId: version.id,
    versionLabel: version.version,
    formDefinitionId: version.formDefinitionId,
    formVersionId: version.formVersionId,
    formSchema: version.formVersion?.schema ?? null,
    eligibilityGuidance: sortByOrder(version.eligibilityRules).map((rule) => ({
      ruleCode: rule.ruleCode,
      label: rule.label,
      description: rule.description,
      isRequired: rule.isRequired,
    })),
    conditionalChecklist: sortByOrder(version.checklistItems).map((item) => ({
      itemCode: item.itemCode,
      label: item.label,
      description: item.description,
      conditionExpression: item.conditionExpression,
      isRequired: item.isRequired,
    })),
    feeDefinitions: detail.fees,
    dependencySummary: version.majorDependencies,
    expectedStagesSummary: detail.expectedHighLevelStages,
    outputDefinitions: detail.expectedOutputs,
    redressRoutes: detail.reviewComplaintRoutes,
    serviceAvailability: version.publicAvailability,
    applicationCapable: isApplicationCapableAvailability(version.publicAvailability),
    publicDisclaimers: disclaimers,
    configurationFingerprint: buildServiceConfigurationFingerprint({
      serviceVersionId: version.id,
      formVersionId: version.formVersionId,
      feeDefinitionIds: version.fees.map((fee) => fee.id),
      eligibilityRuleIds: version.eligibilityRules.map((rule) => rule.id),
      checklistItemIds: version.checklistItems.map((item) => item.id),
    }),
  };
}

export function assertNoRestrictedFields(payload: Record<string, unknown>): void {
  const restrictedKeys = [
    'internalNotes',
    'internalGoverningSourceMaterial',
    'restrictedSecurityNotes',
    'sensitiveConfig',
    'secretIntegrationDetails',
  ];

  for (const key of restrictedKeys) {
    if (key in payload) {
      throw new Error(`Restricted field leaked in public response: ${key}`);
    }
  }
}
