import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import { InstitutionAttributionDto } from '../../common/dto/institution-attribution.dto';
import { LocalizedLabelDto } from '../../common/dto/localized-label.dto';
import { PaginationMetaDto } from '../../common/dto/pagination-meta.dto';

export class BusinessMessageItemDto {
  @ApiProperty()
  communicationId!: string;

  @ApiProperty()
  communicationType!: string;

  @ApiPropertyOptional()
  subject?: string | null;

  @ApiProperty()
  sentAt!: string;

  @ApiProperty()
  caseId!: string;

  @ApiPropertyOptional({ type: InstitutionAttributionDto })
  attribution?: InstitutionAttributionDto;
}

export class BusinessMessagesResponseDto {
  @ApiProperty({ type: [BusinessMessageItemDto] })
  items!: BusinessMessageItemDto[];

  @ApiProperty({ type: PaginationMetaDto })
  pagination!: PaginationMetaDto;

  @ApiProperty({ type: LocalizedLabelDto })
  disclaimer!: LocalizedLabelDto;
}
