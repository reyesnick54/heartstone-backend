export interface ServiceFeeDefinitionBody {
  governingSourceId: string;
  fixedAmount: string | null;
  isCurrent: boolean;
  waived: false;
}

export interface ServiceLevelTargetBody {
  approved: false;
  isCurrent: boolean;
}

export interface ServiceDependencyDefinitionBody {
  authorityDependencyId: string | null;
  authorityTransferred: false;
  metadataOnly: true;
}

export interface ServiceOutputDefinitionBody {
  issued: false;
  outputType: string;
}

export interface ServiceRedressRouteBody {
  routeType: string;
  decided: false;
}

export function asServiceFeeDefinitionBody(body: unknown): ServiceFeeDefinitionBody {
  return body as ServiceFeeDefinitionBody;
}

export function asServiceFeeDefinitionListBody(body: unknown): ServiceFeeDefinitionBody[] {
  return body as ServiceFeeDefinitionBody[];
}

export function asServiceLevelTargetListBody(body: unknown): ServiceLevelTargetBody[] {
  return body as ServiceLevelTargetBody[];
}

export function asServiceDependencyDefinitionListBody(
  body: unknown,
): ServiceDependencyDefinitionBody[] {
  return body as ServiceDependencyDefinitionBody[];
}

export function asServiceOutputDefinitionListBody(body: unknown): ServiceOutputDefinitionBody[] {
  return body as ServiceOutputDefinitionBody[];
}

export function asServiceRedressRouteListBody(body: unknown): ServiceRedressRouteBody[] {
  return body as ServiceRedressRouteBody[];
export interface GovernmentServiceBody {
  id: string;
  code: string;
  name: string;
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
  versionLabel: string;
  governmentServiceId: string;
}

export interface EligibilityGuidanceBody {
  outcome: string;
  governmentServiceVersionId: string;
  disclaimer: string;
  excludedActivity?: string;
  missingFacts: string[];
  matchedRules: unknown[];
}

export interface ServiceMatchBody {
  primaryService?: { code: string; name: string };
  disclaimer: string;
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

export function asEligibilityGuidanceBody(body: unknown): EligibilityGuidanceBody {
  return body as EligibilityGuidanceBody;
}

export function asServiceMatchBody(body: unknown): ServiceMatchBody {
  return body as ServiceMatchBody;
export function asServiceFunctionMappingBody(body: unknown): ServiceFunctionMappingBody {
  return body as ServiceFunctionMappingBody;
}
