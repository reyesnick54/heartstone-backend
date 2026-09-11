import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ServiceFeeCalculationType,
  ServiceFeeRefundability,
  ServiceOperatingMetadataStatus,
} from '@prisma/client';
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  MinLength,
} from 'class-validator';

export class CreateServiceFeeDefinitionDto {
  @ApiProperty()
  @IsUUID()
  serviceVersionId!: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  feeCode!: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  name!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty()
  @IsString()
  @MinLength(3)
  currency!: string;

  @ApiProperty({ enum: ServiceFeeCalculationType })
  @IsEnum(ServiceFeeCalculationType)
  calculationType!: ServiceFeeCalculationType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  fixedAmount?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  calculationConfiguration?: Record<string, unknown>;

  @ApiProperty()
  @IsUUID()
  governingSourceId!: string;

  @ApiProperty()
  @IsUUID()
  collectingInstitutionId!: string;

  @ApiProperty({ enum: ServiceFeeRefundability })
  @IsEnum(ServiceFeeRefundability)
  refundability!: ServiceFeeRefundability;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  waiverReductionAvailable?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  waiverAuthorityFunctionId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isExternalProfessionalFee?: boolean;

  @ApiProperty()
  @IsDateString()
  effectiveFrom!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  effectiveUntil?: string;

  @ApiPropertyOptional({ enum: ServiceOperatingMetadataStatus })
  @IsOptional()
  @IsEnum(ServiceOperatingMetadataStatus)
  status?: ServiceOperatingMetadataStatus;
}
