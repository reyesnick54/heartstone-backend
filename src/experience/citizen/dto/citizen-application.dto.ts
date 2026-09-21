import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ApplicantCategory, ApplicationStatus } from '@prisma/client';

import { DeepLinkDto } from '../../common/dto/deep-link.dto';
import { InstitutionAttributionDto } from '../../common/dto/institution-attribution.dto';
import { LocalizedLabelDto } from '../../common/dto/localized-label.dto';
import { PaginationMetaDto } from '../../common/dto/pagination-meta.dto';

export class CitizenApplicationSummaryDto {
  @ApiProperty()
  applicationId!: string;

  @ApiPropertyOptional()
  applicationNumber?: string;

  @ApiProperty({ enum: ApplicationStatus })
  status!: ApplicationStatus;

  @ApiProperty({ enum: ApplicantCategory })
  applicantCategory!: ApplicantCategory;

  @ApiProperty()
  createdAt!: string;

  @ApiProperty()
  updatedAt!: string;

  @ApiProperty({ type: InstitutionAttributionDto })
  attribution!: InstitutionAttributionDto;

  @ApiPropertyOptional()
  caseId?: string;

  @ApiPropertyOptional()
  caseNumber?: string;

  @ApiPropertyOptional()
  publicStatusLabel?: string;

  @ApiProperty({ type: DeepLinkDto })
  deepLink!: DeepLinkDto;
}

export class CitizenApplicationsResponseDto {
  @ApiProperty({ type: [CitizenApplicationSummaryDto] })
  items!: CitizenApplicationSummaryDto[];

  @ApiProperty({ type: PaginationMetaDto })
  pagination!: PaginationMetaDto;
}

export class CitizenApplicationDetailDto extends CitizenApplicationSummaryDto {
  @ApiPropertyOptional()
  organizationId?: string;

  @ApiPropertyOptional()
  organizationName?: string;

  @ApiPropertyOptional()
  representativeAuthorityId?: string;

  @ApiProperty()
  formDefinitionId!: string;

  @ApiProperty()
  formVersionId!: string;

  @ApiProperty()
  governmentServiceVersionId!: string;

  @ApiProperty({ type: LocalizedLabelDto })
  disclaimer!: LocalizedLabelDto;
}
