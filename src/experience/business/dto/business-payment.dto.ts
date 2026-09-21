import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import { InstitutionAttributionDto } from '../../common/dto/institution-attribution.dto';
import { LocalizedLabelDto } from '../../common/dto/localized-label.dto';
import { PaginationMetaDto } from '../../common/dto/pagination-meta.dto';

export class BusinessPaymentItemDto {
  @ApiProperty()
  invoiceId!: string;

  @ApiProperty()
  invoiceNumber!: string;

  @ApiProperty()
  status!: string;

  @ApiProperty()
  totalAmountCents!: number;

  @ApiProperty()
  amountPaidCents!: number;

  @ApiProperty()
  currency!: string;

  @ApiPropertyOptional()
  dueAt?: string | null;

  @ApiProperty()
  paymentDoesNotImplyApproval!: boolean;

  @ApiPropertyOptional()
  caseId?: string | null;

  @ApiPropertyOptional({ type: InstitutionAttributionDto })
  attribution?: InstitutionAttributionDto;
}

export class BusinessPaymentsResponseDto {
  @ApiProperty({ type: [BusinessPaymentItemDto] })
  items!: BusinessPaymentItemDto[];

  @ApiProperty({ type: PaginationMetaDto })
  pagination!: PaginationMetaDto;

  @ApiProperty({ type: LocalizedLabelDto })
  disclaimer!: LocalizedLabelDto;
}
