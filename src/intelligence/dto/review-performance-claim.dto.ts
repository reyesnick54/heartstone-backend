import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  PerformanceAttributionClassification,
  PerformanceClaimReviewOutcome,
} from '@prisma/client';
import { IsBoolean, IsEnum, IsOptional, IsString } from 'class-validator';

export class ReviewPerformanceClaimDto {
  @ApiProperty({ enum: PerformanceClaimReviewOutcome })
  @IsEnum(PerformanceClaimReviewOutcome)
  outcome!: PerformanceClaimReviewOutcome;

  @ApiProperty()
  @IsBoolean()
  approved!: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  findings?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  limitationsNoted?: string;

  @ApiPropertyOptional({ enum: PerformanceAttributionClassification })
  @IsOptional()
  @IsEnum(PerformanceAttributionClassification)
  attributionClassification?: PerformanceAttributionClassification;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  approvedCausalMethod?: boolean;
}
