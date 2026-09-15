import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PerformanceAttributionClassification } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsDate, IsEnum, IsOptional, IsString } from 'class-validator';

export class CreatePerformanceClaimDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  claimReference?: string;

  @ApiProperty()
  @IsString()
  claimStatement!: string;

  @ApiProperty()
  metricDefinitionVersionId!: string;

  @ApiProperty()
  calculationRunId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  baselineId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  comparisonPeriodStart?: Date;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  comparisonPeriodEnd?: Date;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  confidence?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  assumptions?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  limitations?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  externalFactors?: string;

  @ApiPropertyOptional({ enum: PerformanceAttributionClassification })
  @IsOptional()
  @IsEnum(PerformanceAttributionClassification)
  attributionClassification?: PerformanceAttributionClassification;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  evidencePacketReference?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  effectivePeriodStart?: Date;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  effectivePeriodEnd?: Date;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  revalidationDate?: Date;
}
