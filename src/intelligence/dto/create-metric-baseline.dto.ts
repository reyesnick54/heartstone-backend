import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MetricBaselineMethod, MetricBaselineQualityStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsArray, IsDate, IsEnum, IsOptional, IsString } from 'class-validator';

export class CreateMetricBaselineDto {
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
  sourceRecords?: unknown[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  value?: string;

  @ApiPropertyOptional({ enum: MetricBaselineMethod })
  @IsOptional()
  @IsEnum(MetricBaselineMethod)
  method?: MetricBaselineMethod;

  @ApiPropertyOptional({ enum: MetricBaselineQualityStatus })
  @IsOptional()
  @IsEnum(MetricBaselineQualityStatus)
  qualityStatus?: MetricBaselineQualityStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  limitations?: string;
}
