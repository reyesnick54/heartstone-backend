import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import { InstitutionAttributionDto } from '../../common/dto/institution-attribution.dto';
import { LocalizedLabelDto } from '../../common/dto/localized-label.dto';
import { PaginationMetaDto } from '../../common/dto/pagination-meta.dto';

export class BusinessApplicationItemDto {
  @ApiProperty()
  applicationId!: string;

  @ApiPropertyOptional()
  applicationNumber?: string | null;

  @ApiProperty()
  status!: string;

  @ApiProperty()
  applicantCategory!: string;

  @ApiProperty()
  updatedAt!: string;

  @ApiPropertyOptional()
  caseId?: string | null;

  @ApiProperty({ type: InstitutionAttributionDto })
  attribution!: InstitutionAttributionDto;
}

export class BusinessApplicationsResponseDto {
  @ApiProperty({ type: [BusinessApplicationItemDto] })
  items!: BusinessApplicationItemDto[];

  @ApiProperty({ type: PaginationMetaDto })
  pagination!: PaginationMetaDto;

  @ApiProperty({ type: LocalizedLabelDto })
  disclaimer!: LocalizedLabelDto;
}
