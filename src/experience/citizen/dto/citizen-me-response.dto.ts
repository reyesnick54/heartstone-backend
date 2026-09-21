import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ApplicantCategory, AssuranceLevel } from '@prisma/client';

import { LocalizedLabelDto } from '../../common/dto/localized-label.dto';

export class CitizenProfileSummaryDto {
  @ApiProperty()
  identityId!: string;

  @ApiProperty()
  displayName!: string;

  @ApiPropertyOptional()
  givenName?: string;

  @ApiPropertyOptional()
  familyName?: string;
}

export class CitizenClassificationDto {
  @ApiPropertyOptional({ enum: ApplicantCategory, isArray: true })
  observedApplicantCategories?: ApplicantCategory[];

  @ApiProperty({
    description: 'Citizen/resident classification is derived from application history only',
  })
  classificationNote!: string;
}

export class CitizenOrganizationRelationshipDto {
  @ApiProperty()
  organizationId!: string;

  @ApiProperty()
  organizationName!: string;

  @ApiProperty()
  membershipRole!: string;

  @ApiProperty()
  membershipStatus!: string;
}

export class CitizenRepresentationRelationshipDto {
  @ApiProperty()
  representativeAuthorityId!: string;

  @ApiProperty()
  organizationId!: string;

  @ApiProperty()
  organizationName!: string;

  @ApiProperty()
  scopeDescription!: string;

  @ApiProperty()
  status!: string;

  @ApiProperty()
  effectiveFrom!: string;

  @ApiPropertyOptional()
  effectiveUntil?: string;
}

export class CitizenAccountAssuranceDto {
  @ApiProperty({ enum: AssuranceLevel })
  assuranceLevel!: AssuranceLevel;

  @ApiProperty()
  accountStatus!: string;

  @ApiProperty()
  sessionId!: string;

  @ApiProperty({ example: false })
  hasGovernmentAuthority!: false;

  @ApiProperty()
  assuranceNote!: string;
}

export class CitizenCommunicationPreferenceDto {
  @ApiProperty()
  channelType!: string;

  @ApiProperty()
  isEnabled!: boolean;

  @ApiPropertyOptional()
  locale?: string;
}

export class CitizenMeResponseDto {
  @ApiProperty({ type: CitizenProfileSummaryDto })
  profile!: CitizenProfileSummaryDto;

  @ApiProperty({ type: CitizenClassificationDto })
  classification!: CitizenClassificationDto;

  @ApiProperty({ type: [CitizenOrganizationRelationshipDto] })
  organizationRelationships!: CitizenOrganizationRelationshipDto[];

  @ApiProperty({ type: [CitizenRepresentationRelationshipDto] })
  representationRelationships!: CitizenRepresentationRelationshipDto[];

  @ApiProperty({ type: CitizenAccountAssuranceDto })
  accountAssurance!: CitizenAccountAssuranceDto;

  @ApiProperty({ type: [CitizenCommunicationPreferenceDto] })
  communicationPreferences!: CitizenCommunicationPreferenceDto[];

  @ApiProperty({ type: LocalizedLabelDto })
  disclaimer!: LocalizedLabelDto;
}
