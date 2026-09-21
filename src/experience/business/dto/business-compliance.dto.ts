import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import { LocalizedLabelDto } from '../../common/dto/localized-label.dto';
import { PaginationMetaDto } from '../../common/dto/pagination-meta.dto';

export class BusinessComplianceObligationDto {
  @ApiProperty()
  obligationId!: string;

  @ApiProperty()
  complianceMatterId!: string;

  @ApiProperty()
  obligationCode!: string;

  @ApiProperty()
  description!: string;

  @ApiProperty()
  status!: string;

  @ApiPropertyOptional()
  dueDate?: string | null;
}

export class BusinessComplianceMatterDto {
  @ApiProperty()
  complianceMatterId!: string;

  @ApiProperty()
  complianceMatterNumber!: string;

  @ApiProperty()
  status!: string;

  @ApiProperty()
  openedAt!: string;

  @ApiPropertyOptional()
  authoritativeStatusLabel?: string | null;

  @ApiProperty({ type: [BusinessComplianceObligationDto] })
  outstandingObligations!: BusinessComplianceObligationDto[];
}

export class BusinessComplianceResponseDto {
  @ApiProperty({ type: [BusinessComplianceMatterDto] })
  items!: BusinessComplianceMatterDto[];

  @ApiProperty({ type: PaginationMetaDto })
  pagination!: PaginationMetaDto;

  @ApiProperty({ type: LocalizedLabelDto })
  disclaimer!: LocalizedLabelDto;
}
