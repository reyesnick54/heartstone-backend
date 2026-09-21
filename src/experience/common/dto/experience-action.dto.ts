import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import { DeepLinkDto } from './deep-link.dto';
import { InstitutionAttributionDto } from './institution-attribution.dto';
import { LocalizedLabelDto } from './localized-label.dto';
import { PaginationMetaDto } from './pagination-meta.dto';
import { PaginationQueryDto } from './pagination-query.dto';

export { PaginationQueryDto as ExperienceActionQueryDto };

export class ExperienceActionItemDto {
  @ApiProperty()
  actionCode!: string;

  @ApiProperty()
  actionType!: string;

  @ApiProperty({ type: LocalizedLabelDto })
  title!: LocalizedLabelDto;

  @ApiPropertyOptional({ type: LocalizedLabelDto })
  description?: LocalizedLabelDto;

  @ApiProperty()
  priority!: number;

  @ApiProperty()
  sourceDomain!: string;

  @ApiProperty()
  resourceType!: string;

  @ApiProperty()
  resourceId!: string;

  @ApiProperty({ type: DeepLinkDto })
  deepLink!: DeepLinkDto;

  @ApiPropertyOptional()
  dueDate?: string | null;

  @ApiPropertyOptional({ type: InstitutionAttributionDto })
  institution?: InstitutionAttributionDto;

  @ApiPropertyOptional()
  departmentId?: string;

  @ApiPropertyOptional()
  departmentName?: string;

  @ApiProperty()
  status!: string;

  @ApiProperty()
  presentationOnly!: boolean;
}

export class ExperienceActionsResponseDto {
  @ApiProperty({ type: [ExperienceActionItemDto] })
  items!: ExperienceActionItemDto[];

  @ApiProperty({ type: PaginationMetaDto })
  pagination!: PaginationMetaDto;

  @ApiProperty()
  executionRequiresRevalidation!: boolean;
}
