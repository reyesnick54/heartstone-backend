import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  MetricAggregationMethod,
  MetricCalculationMethodType,
  MetricCategory,
  MetricReportingFrequency,
} from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsDate,
  IsEnum,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

export class CreateMetricDefinitionDto {
  @ApiProperty()
  @IsUUID()
  frameworkId!: string;

  @ApiProperty({ example: 'AVG_PROCESSING_DAYS' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  code!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(256)
  name!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  purpose!: string;

  @ApiProperty()
  @IsUUID()
  ownerInstitutionId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  ownerDepartmentId?: string;

  @ApiProperty({ enum: MetricCategory })
  @IsEnum(MetricCategory)
  metricCategory!: MetricCategory;

  @ApiProperty({ example: 'days' })
  @IsString()
  @IsNotEmpty()
  unit!: string;

  @ApiProperty({ enum: MetricAggregationMethod })
  @IsEnum(MetricAggregationMethod)
  aggregationMethod!: MetricAggregationMethod;

  @ApiProperty({ enum: MetricCalculationMethodType })
  @IsEnum(MetricCalculationMethodType)
  calculationMethod!: MetricCalculationMethodType;

  @ApiProperty({ type: 'array', items: { type: 'object' } })
  @IsArray()
  sourceRequirements!: unknown[];

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  scope!: string;

  @ApiProperty({ enum: MetricReportingFrequency })
  @IsEnum(MetricReportingFrequency)
  reportingFrequency!: MetricReportingFrequency;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  qualityRequirements?: Record<string, unknown>;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  baselineRequired?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  effectiveFrom?: Date;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  effectiveUntil?: Date;
}
