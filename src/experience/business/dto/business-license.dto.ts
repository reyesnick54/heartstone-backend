import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import { InstitutionAttributionDto } from '../../common/dto/institution-attribution.dto';
import { LocalizedLabelDto } from '../../common/dto/localized-label.dto';
import { PaginationMetaDto } from '../../common/dto/pagination-meta.dto';

export class BusinessLicenseItemDto {
  @ApiProperty()
  instrumentId!: string;

  @ApiProperty()
  instrumentNumber!: string;

  @ApiProperty()
  status!: string;

  @ApiPropertyOptional()
  effectiveFrom?: string | null;

  @ApiPropertyOptional()
  effectiveUntil?: string | null;

  @ApiProperty()
  approachingExpiry!: boolean;

  @ApiPropertyOptional()
  caseId?: string | null;

  @ApiPropertyOptional({ type: InstitutionAttributionDto })
  attribution?: InstitutionAttributionDto;
}

export class BusinessLicensesResponseDto {
  @ApiProperty({ type: [BusinessLicenseItemDto] })
  items!: BusinessLicenseItemDto[];

  @ApiProperty({ type: PaginationMetaDto })
  pagination!: PaginationMetaDto;

  @ApiProperty({ type: LocalizedLabelDto })
  disclaimer!: LocalizedLabelDto;
}
