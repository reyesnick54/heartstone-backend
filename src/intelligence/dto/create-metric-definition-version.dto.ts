import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MetricDependencyTimeClassification } from '@prisma/client';
import { IsEnum, IsInt, IsObject, IsOptional, IsString, Min } from 'class-validator';

export class CreateMetricDefinitionVersionDto {
  @ApiProperty({ type: Object })
  @IsObject()
  formulaSpecification!: Record<string, unknown>;

  @ApiPropertyOptional({ type: 'array', items: { type: 'object' } })
  @IsOptional()
  sourceDefinitions?: unknown[];

  @ApiPropertyOptional({ type: 'array', items: { type: 'object' } })
  @IsOptional()
  inclusions?: unknown[];

  @ApiPropertyOptional({ type: 'array', items: { type: 'object' } })
  @IsOptional()
  exclusions?: unknown[];

  @ApiPropertyOptional({ enum: MetricDependencyTimeClassification })
  @IsOptional()
  @IsEnum(MetricDependencyTimeClassification)
  dependencyTimeClassification?: MetricDependencyTimeClassification;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  roundingRule?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  percentileMethod?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  dataQualityThresholds?: Record<string, unknown>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  materialityThreshold?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1)
  revalidationIntervalDays?: number;
}
