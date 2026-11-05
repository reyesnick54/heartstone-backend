import { ApiProperty } from '@nestjs/swagger';
import {
  ApplicantCategory,
  CatalogServiceType,
  GovernmentServicePublicAvailability,
  Prisma,
} from '@prisma/client';

import { jsonValueSchema } from '../../../common/openapi/json-value.schema';

export class PublicServiceFamilyResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  code!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty({ type: String, nullable: true })
  description!: string | null;
}

export class PublicServiceSummaryResponseDto {
  @ApiProperty()
  serviceId!: string;

  @ApiProperty()
  slug!: string;

  @ApiProperty()
  serviceVersionId!: string;

  @ApiProperty()
  versionLabel!: string;

  @ApiProperty()
  publicName!: string;

  @ApiProperty()
  plainLanguagePurpose!: string;

  @ApiProperty()
  responsibleDepartmentDisplayName!: string;

  @ApiProperty()
  serviceFamilyName!: string;

  @ApiProperty({ enum: CatalogServiceType, nullable: true })
  serviceType!: CatalogServiceType | null;

  @ApiProperty({ enum: ApplicantCategory, isArray: true })
  eligibleApplicantCategories!: ApplicantCategory[];

  @ApiProperty({ type: [String] })
  activitiesCovered!: string[];

  @ApiProperty({ enum: GovernmentServicePublicAvailability })
  availabilityStatus!: GovernmentServicePublicAvailability;

  @ApiProperty()
  isPilotOnly!: boolean;

  @ApiProperty()
  isInformationOnly!: boolean;

  @ApiProperty()
  applicationCapable!: boolean;

  @ApiProperty({ type: String, nullable: true })
  informationLastVerifiedAt!: string | null;

  @ApiProperty()
  nonbindingGuidanceDisclaimer!: string;
}

export class PaginatedPublicServicesResponseDto {
  @ApiProperty({ type: PublicServiceSummaryResponseDto, isArray: true })
  items!: PublicServiceSummaryResponseDto[];

  @ApiProperty()
  page!: number;

  @ApiProperty()
  limit!: number;

  @ApiProperty()
  total!: number;

  @ApiProperty()
  totalPages!: number;
}

export class PublicServiceStageDto {
  @ApiProperty()
  stageCode!: string;

  @ApiProperty()
  label!: string;

  @ApiProperty({ type: String, nullable: true })
  description!: string | null;

  @ApiProperty({ type: String, nullable: true })
  estimatedDurationLabel!: string | null;
}

export class PublicServiceFeeDto {
  @ApiProperty()
  code!: string;

  @ApiProperty()
  label!: string;

  @ApiProperty({ type: String, nullable: true })
  description!: string | null;

  @ApiProperty({ type: Number, nullable: true })
  amountCents!: number | null;

  @ApiProperty()
  currency!: string;

  @ApiProperty()
  isVariable!: boolean;
}

export class PublicServiceOutputDto {
  @ApiProperty()
  outputCode!: string;

  @ApiProperty()
  label!: string;

  @ApiProperty({ type: String, nullable: true })
  description!: string | null;

  @ApiProperty({ type: String, nullable: true })
  validityLabel!: string | null;
}

export class PublicServiceRedressRouteDto {
  @ApiProperty()
  routeCode!: string;

  @ApiProperty()
  label!: string;

  @ApiProperty({ type: String, nullable: true })
  description!: string | null;

  @ApiProperty({ type: String, nullable: true })
  contactReference!: string | null;
}

/** Mirrors `PublicServiceDetail` in service-catalog/common/public-service.mapper.ts. */
export class PublicServiceDetailResponseDto extends PublicServiceSummaryResponseDto {
  @ApiProperty({ type: [String] })
  activitiesExcluded!: string[];

  @ApiProperty({ type: String, nullable: true })
  geographicScope!: string | null;

  @ApiProperty({ type: String, nullable: true })
  authorityClassificationSummary!: string | null;

  @ApiProperty({ ...jsonValueSchema(), nullable: true })
  majorGovernmentDependencies!: Prisma.JsonValue;

  @ApiProperty({ type: () => [PublicServiceStageDto] })
  expectedHighLevelStages!: PublicServiceStageDto[];

  @ApiProperty({ type: () => [PublicServiceFeeDto] })
  fees!: PublicServiceFeeDto[];

  @ApiProperty({ type: () => [PublicServiceOutputDto] })
  expectedOutputs!: PublicServiceOutputDto[];

  @ApiProperty({ type: String, nullable: true })
  typicalValidity!: string | null;

  @ApiProperty({ type: () => [PublicServiceRedressRouteDto] })
  reviewComplaintRoutes!: PublicServiceRedressRouteDto[];

  @ApiProperty({ type: String, nullable: true })
  publicDisclaimer!: string | null;
}

export class PublicServiceEligibilityGuidanceDto {
  @ApiProperty()
  ruleCode!: string;

  @ApiProperty()
  label!: string;

  @ApiProperty()
  description!: string;

  @ApiProperty()
  isRequired!: boolean;
}

export class PublicServiceChecklistItemDto {
  @ApiProperty()
  itemCode!: string;

  @ApiProperty()
  label!: string;

  @ApiProperty({ type: String, nullable: true })
  description!: string | null;

  @ApiProperty({ ...jsonValueSchema(), nullable: true })
  conditionExpression!: Prisma.JsonValue | null;

  @ApiProperty()
  isRequired!: boolean;
}

/** Mirrors `ServiceStartPackage` in service-catalog/common/public-service.mapper.ts. */
export class ServiceStartPackageResponseDto {
  @ApiProperty()
  serviceId!: string;

  @ApiProperty()
  serviceSlug!: string;

  @ApiProperty()
  serviceVersionId!: string;

  @ApiProperty()
  versionLabel!: string;

  @ApiProperty({ type: String, nullable: true })
  formDefinitionId!: string | null;

  @ApiProperty({ type: String, nullable: true })
  formVersionId!: string | null;

  @ApiProperty({
    ...jsonValueSchema(),
    nullable: true,
    description: 'Not rendered by the public start package; currently always null',
  })
  formSchema!: Prisma.JsonValue | null;

  @ApiProperty({ type: () => [PublicServiceEligibilityGuidanceDto] })
  eligibilityGuidance!: PublicServiceEligibilityGuidanceDto[];

  @ApiProperty({ type: () => [PublicServiceChecklistItemDto] })
  conditionalChecklist!: PublicServiceChecklistItemDto[];

  @ApiProperty({ type: () => [PublicServiceFeeDto] })
  feeDefinitions!: PublicServiceFeeDto[];

  @ApiProperty({ ...jsonValueSchema(), nullable: true })
  dependencySummary!: Prisma.JsonValue;

  @ApiProperty({ type: () => [PublicServiceStageDto] })
  expectedStagesSummary!: PublicServiceStageDto[];

  @ApiProperty({ type: () => [PublicServiceOutputDto] })
  outputDefinitions!: PublicServiceOutputDto[];

  @ApiProperty({ type: () => [PublicServiceRedressRouteDto] })
  redressRoutes!: PublicServiceRedressRouteDto[];

  @ApiProperty({ enum: GovernmentServicePublicAvailability })
  serviceAvailability!: GovernmentServicePublicAvailability;

  @ApiProperty()
  applicationCapable!: boolean;

  @ApiProperty({ type: [String] })
  publicDisclaimers!: string[];

  @ApiProperty()
  configurationFingerprint!: string;
}

/** Mirrors `PublicEligibilityResult`: nonbinding guidance, never an eligibility determination. */
export class PublicEligibilityResultResponseDto {
  @ApiProperty()
  serviceId!: string;

  @ApiProperty()
  serviceVersionId!: string;

  @ApiProperty({
    type: Boolean,
    nullable: true,
    description: 'Preliminary guidance only; null when guidance cannot be derived',
  })
  eligible!: boolean | null;

  @ApiProperty({ type: [String] })
  matchedRules!: string[];

  @ApiProperty({ type: [String] })
  unmatchedRequiredRules!: string[];

  @ApiProperty({ type: [String] })
  guidanceNotes!: string[];

  @ApiProperty()
  nonbindingDisclaimer!: string;
}
