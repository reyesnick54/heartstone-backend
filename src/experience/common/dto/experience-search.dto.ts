import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, Min, MinLength } from 'class-validator';

import { DeepLinkDto } from './deep-link.dto';
import { LocalizedLabelDto } from './localized-label.dto';
import { PaginationMetaDto } from './pagination-meta.dto';

export class ExperienceSearchQueryDto {
  @ApiProperty({ description: 'Search query text', minLength: 1 })
  @IsString()
  @MinLength(1)
  q!: string;

  @ApiPropertyOptional({ description: 'Optional resource type filter' })
  @IsOptional()
  @IsString()
  resourceType?: string;

  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 20, minimum: 1, maximum: 50 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  pageSize?: number = 20;
}

export class ExperienceSearchHitDto {
  @ApiProperty()
  resourceType!: string;

  @ApiProperty()
  resourceId!: string;

  @ApiProperty()
  title!: string;

  @ApiPropertyOptional()
  subtitle?: string;

  @ApiProperty({ type: LocalizedLabelDto })
  displayLabel!: LocalizedLabelDto;

  @ApiProperty({ type: DeepLinkDto })
  deepLink!: DeepLinkDto;

  @ApiProperty()
  matchedAt!: string;
}

export class ExperienceSearchResponseDto {
  @ApiProperty({ type: [ExperienceSearchHitDto] })
  items!: ExperienceSearchHitDto[];

  @ApiProperty({ type: PaginationMetaDto })
  pagination!: PaginationMetaDto;

  @ApiProperty()
  scopeDisclaimer!: string;
}
