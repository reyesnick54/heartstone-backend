import { ApiProperty } from '@nestjs/swagger';
import {
  ApplicantCategory,
  CatalogServiceType,
  GovernmentServicePublicAvailability,
} from '@prisma/client';

export class PublicServiceFamilyResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  code!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty({ required: false, nullable: true })
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

  @ApiProperty({ nullable: true })
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
