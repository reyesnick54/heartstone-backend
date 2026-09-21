import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import { DeepLinkDto } from '../../common/dto/deep-link.dto';
import { InstitutionAttributionDto } from '../../common/dto/institution-attribution.dto';
import { LocalizedLabelDto } from '../../common/dto/localized-label.dto';
import { PaginationMetaDto } from '../../common/dto/pagination-meta.dto';

export class BusinessActionDto {
  @ApiProperty({ example: 'PAY_INVOICE' })
  actionCode!: string;

  @ApiProperty({ type: LocalizedLabelDto })
  label!: LocalizedLabelDto;

  @ApiProperty()
  priority!: number;

  @ApiProperty()
  dueAt!: string | null;

  @ApiProperty()
  createdAt!: string;

  @ApiProperty({ type: InstitutionAttributionDto })
  attribution!: InstitutionAttributionDto;

  @ApiProperty({ type: DeepLinkDto })
  deepLink!: DeepLinkDto;

  @ApiPropertyOptional()
  relatedCaseId?: string;

  @ApiPropertyOptional()
  relatedApplicationId?: string;

  @ApiPropertyOptional()
  relatedInvoiceId?: string;

  @ApiPropertyOptional()
  relatedInstrumentId?: string;

  @ApiPropertyOptional()
  relatedCommunicationId?: string;

  @ApiPropertyOptional()
  relatedComplianceMatterId?: string;

  @ApiPropertyOptional()
  relatedProjectId?: string;
}

export class BusinessActionsResponseDto {
  @ApiProperty({ type: [BusinessActionDto] })
  items!: BusinessActionDto[];

  @ApiProperty({ type: PaginationMetaDto })
  pagination!: PaginationMetaDto;
}
