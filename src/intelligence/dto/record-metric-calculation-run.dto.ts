import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MetricDataQualityDimension, MetricDataQualityResult } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsDate,
  IsEnum,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';

class QualityAssessmentInput {
  @IsEnum(MetricDataQualityDimension)
  dimension!: MetricDataQualityDimension;

  @IsEnum(MetricDataQualityResult)
  result!: MetricDataQualityResult;

  @IsOptional()
  @IsString()
  findings?: string;
}

export class RecordMetricCalculationRunDto {
  @ApiProperty()
  metricVersionId!: string;

  @ApiProperty()
  @Type(() => Date)
  @IsDate()
  periodStart!: Date;

  @ApiProperty()
  @Type(() => Date)
  @IsDate()
  periodEnd!: Date;

  @ApiPropertyOptional({ type: 'array', items: { type: 'object' } })
  @IsOptional()
  @IsArray()
  inputRecordReferences?: unknown[];

  @ApiProperty()
  @IsInt()
  @Min(0)
  inputCount!: number;

  @ApiPropertyOptional({ type: 'array', items: { type: 'object' } })
  @IsOptional()
  @IsArray()
  excludedRecords?: unknown[];

  @ApiPropertyOptional({ type: 'array', items: { type: 'object' } })
  @IsOptional()
  @IsArray()
  exclusionReasons?: unknown[];

  @ApiProperty({ type: Object })
  @IsObject()
  calculationTrace!: Record<string, unknown>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  resultValue?: string;

  @ApiPropertyOptional({ type: 'array', items: { type: 'object' } })
  @IsOptional()
  @IsArray()
  qualityFindings?: unknown[];

  @ApiPropertyOptional({ type: [QualityAssessmentInput] })
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => QualityAssessmentInput)
  qualityAssessments?: QualityAssessmentInput[];
}
