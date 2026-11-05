import { ApiProperty } from '@nestjs/swagger';
import {
  ClinicalTrialListingLifecycleStatus,
  ClinicalTrialRecruitmentStatus,
} from '@prisma/client';

import { PUBLIC_TRIAL_DISCOVERY_FORBIDDEN_RESPONSE_KEYS } from '../../clinical-research.constants';

export class ClinicalTrialCodeLabelDto {
  @ApiProperty()
  code!: string;

  @ApiProperty()
  label!: string;
}

export class ClinicalTrialConditionDto extends ClinicalTrialCodeLabelDto {
  @ApiProperty({ type: String, nullable: true })
  categoryCode!: string | null;
}

export class ClinicalTrialSponsorDto {
  @ApiProperty()
  displayName!: string;

  @ApiProperty()
  sponsorReference!: string;
}

export class ClinicalTrialEligibilityCriterionDto {
  @ApiProperty()
  criterionCode!: string;

  @ApiProperty()
  summary!: string;

  @ApiProperty()
  isInclusion!: boolean;

  @ApiProperty()
  sortOrder!: number;
}

/** Public trial listing without any participant-identifying data. */
export class PublicClinicalTrialListingDto {
  @ApiProperty()
  trialNumber!: string;

  @ApiProperty({ enum: ClinicalTrialRecruitmentStatus })
  recruitmentStatus!: ClinicalTrialRecruitmentStatus;

  @ApiProperty({ enum: ClinicalTrialListingLifecycleStatus })
  listingLifecycleStatus!: ClinicalTrialListingLifecycleStatus;

  @ApiProperty({ type: Number, nullable: true })
  minimumAgeYears!: number | null;

  @ApiProperty({ type: Number, nullable: true })
  maximumAgeYears!: number | null;

  @ApiProperty({ type: String, nullable: true })
  locationSummary!: string | null;

  @ApiProperty({ type: () => ClinicalTrialCodeLabelDto, nullable: true })
  phase!: ClinicalTrialCodeLabelDto | null;

  @ApiProperty({ type: () => ClinicalTrialConditionDto, nullable: true })
  condition!: ClinicalTrialConditionDto | null;

  @ApiProperty({ type: () => ClinicalTrialCodeLabelDto, nullable: true })
  intervention!: ClinicalTrialCodeLabelDto | null;

  @ApiProperty({ type: () => ClinicalTrialSponsorDto })
  sponsor!: ClinicalTrialSponsorDto;

  @ApiProperty({ type: String, nullable: true })
  title!: string | null;

  @ApiProperty({ type: String, nullable: true })
  publicSummary!: string | null;

  @ApiProperty({ type: String, nullable: true })
  broadEligibilitySummary!: string | null;

  @ApiProperty({ type: () => [ClinicalTrialEligibilityCriterionDto] })
  eligibilityCriteria!: ClinicalTrialEligibilityCriterionDto[];

  @ApiProperty()
  listingIsNotRegulatoryApproval!: boolean;

  @ApiProperty()
  discoveryIsNotRecommendation!: boolean;
}

export class PublicClinicalTrialDiscoveryResponseDto {
  @ApiProperty()
  disclaimer!: string;

  @ApiProperty()
  discoveryIsNotRecommendation!: boolean;

  @ApiProperty()
  participantDataIncluded!: boolean;

  @ApiProperty({
    enum: [...PUBLIC_TRIAL_DISCOVERY_FORBIDDEN_RESPONSE_KEYS],
    isArray: true,
    description: 'Participant fields that public discovery never exposes',
  })
  forbiddenParticipantFields!: (typeof PUBLIC_TRIAL_DISCOVERY_FORBIDDEN_RESPONSE_KEYS)[number][];

  @ApiProperty({ type: () => [PublicClinicalTrialListingDto] })
  trials!: PublicClinicalTrialListingDto[];
}
