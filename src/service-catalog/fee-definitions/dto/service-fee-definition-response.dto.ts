import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ServiceFeeCalculationType,
  ServiceFeeRefundability,
  ServiceOperatingMetadataStatus,
} from '@prisma/client';

export class ServiceFeeDefinitionResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  serviceVersionId!: string;

  @ApiProperty()
  feeCode!: string;

  @ApiProperty()
  name!: string;

  @ApiPropertyOptional()
  description?: string | null;

  @ApiProperty()
  currency!: string;

  @ApiProperty({ enum: ServiceFeeCalculationType })
  calculationType!: ServiceFeeCalculationType;

  @ApiPropertyOptional()
  fixedAmount?: string | null;

  @ApiProperty()
  calculationConfiguration!: Record<string, unknown>;

  @ApiProperty()
  governingSourceId!: string;

  @ApiProperty()
  collectingInstitutionId!: string;

  @ApiProperty({ enum: ServiceFeeRefundability })
  refundability!: ServiceFeeRefundability;

  @ApiProperty()
  waiverReductionAvailable!: boolean;

  @ApiPropertyOptional()
  waiverAuthorityFunctionId?: string | null;

  @ApiProperty()
  isExternalProfessionalFee!: boolean;

  @ApiProperty()
  effectiveFrom!: Date;

  @ApiPropertyOptional()
  effectiveUntil?: Date | null;

  @ApiProperty({ enum: ServiceOperatingMetadataStatus })
  status!: ServiceOperatingMetadataStatus;

  @ApiProperty()
  isCurrent!: boolean;

  @ApiProperty()
  waived!: false;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}
