import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import { DeepLinkDto } from './deep-link.dto';
import { InstitutionAttributionDto } from './institution-attribution.dto';
import { LocalizedLabelDto } from './localized-label.dto';
import { PaginationMetaDto } from './pagination-meta.dto';
import { PaginationQueryDto } from './pagination-query.dto';

export { PaginationQueryDto as ExperienceInboxQueryDto };

export class ExperienceInboxItemDto {
  @ApiProperty()
  inboxItemId!: string;

  @ApiProperty()
  itemType!: string;

  @ApiProperty()
  sourceDomain!: string;

  @ApiProperty()
  sourceRecordId!: string;

  @ApiProperty({ type: LocalizedLabelDto })
  title!: LocalizedLabelDto;

  @ApiPropertyOptional({ type: LocalizedLabelDto })
  preview?: LocalizedLabelDto;

  @ApiProperty()
  receivedAt!: string;

  @ApiProperty()
  read!: boolean;

  @ApiProperty({ type: DeepLinkDto })
  deepLink!: DeepLinkDto;

  @ApiPropertyOptional({ type: InstitutionAttributionDto })
  attribution?: InstitutionAttributionDto;
}

export class ExperienceInboxResponseDto {
  @ApiProperty({ type: [ExperienceInboxItemDto] })
  items!: ExperienceInboxItemDto[];

  @ApiProperty({ type: PaginationMetaDto })
  pagination!: PaginationMetaDto;
}
