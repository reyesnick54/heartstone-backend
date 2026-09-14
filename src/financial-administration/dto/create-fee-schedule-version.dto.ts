import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsDate,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Matches,
  Min,
  ValidateNested,
} from 'class-validator';

export class CreateFeeScheduleItemDto {
  @ApiProperty()
  @IsUUID()
  serviceId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  serviceVersionId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  governmentServiceFeeDefinitionId?: string;

  @ApiProperty()
  @IsString()
  @Length(1, 64)
  feeCode!: string;

  @ApiProperty()
  @IsString()
  @Length(1, 512)
  description!: string;

  @ApiProperty({ description: 'Amount in integer cents' })
  @IsInt()
  @Min(0)
  amountCents!: number;

  @ApiProperty({ example: 'XCD' })
  @IsString()
  @Matches(/^[A-Z]{3}$/)
  currency!: string;

  @ApiProperty({
    enum: [
      'FIXED',
      'QUANTITY',
      'PERCENTAGE',
      'TIERED',
      'FORMULA_FROM_APPROVED_RULE',
      'MANUAL_AUTHORIZED_CALCULATION',
    ],
  })
  @IsString()
  calculationMethod!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  unitBasis?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  minimumAmountCents?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  maximumAmountCents?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  taxOrLevyTreatment?: string;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  waiverAllowed?: boolean;

  @ApiPropertyOptional({ enum: ['NON_REFUNDABLE', 'REFUNDABLE_PER_POLICY', 'CONDITIONAL'] })
  @IsOptional()
  @IsEnum(['NON_REFUNDABLE', 'REFUNDABLE_PER_POLICY', 'CONDITIONAL'])
  refundabilityRule?: string;

  @ApiProperty()
  @Type(() => Date)
  @IsDate()
  effectiveFrom!: Date;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  effectiveUntil?: Date;
}

export class CreateFeeScheduleVersionDto {
  @ApiProperty()
  @IsString()
  @Length(1, 32)
  version!: string;

  @ApiProperty()
  @IsUUID()
  governingSourceId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  functionAuthorityRecordId?: string;

  @ApiProperty()
  @Type(() => Date)
  @IsDate()
  effectiveFrom!: Date;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  effectiveUntil?: Date;

  @ApiProperty({ type: [CreateFeeScheduleItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateFeeScheduleItemDto)
  items!: CreateFeeScheduleItemDto[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  officeholderId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  appointmentId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  delegationId?: string;
}

export class ApproveFeeScheduleVersionDto {
  @ApiProperty()
  @IsUUID()
  officeholderId!: string;

  @ApiProperty()
  @IsUUID()
  functionAuthorityRecordId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  appointmentId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  delegationId?: string;
}
