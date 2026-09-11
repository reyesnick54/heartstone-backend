import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  EligibilityGuidanceOutcome,
  ServiceEligibilityRuleCategory,
  ServiceEligibilityRuleOperator,
} from '@prisma/client';
import {
  Allow,
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';

export class CreateEligibilityRuleDto {
  @ApiProperty({ enum: ServiceEligibilityRuleCategory })
  @IsEnum(ServiceEligibilityRuleCategory)
  category!: ServiceEligibilityRuleCategory;

  @ApiProperty({ example: 'applicantCategory' })
  @IsString()
  @MinLength(1)
  attributeKey!: string;

  @ApiProperty({ enum: ServiceEligibilityRuleOperator })
  @IsEnum(ServiceEligibilityRuleOperator)
  operator!: ServiceEligibilityRuleOperator;

  @ApiProperty({ example: { value: 'INDIVIDUAL' } })
  expectedValue!: unknown;

  @ApiProperty({ example: 'APPLICANT_CATEGORY_MATCH' })
  @IsString()
  @MinLength(1)
  reasonCode!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  priority?: number;

  @ApiPropertyOptional({ enum: EligibilityGuidanceOutcome })
  @IsOptional()
  @IsEnum(EligibilityGuidanceOutcome)
  onFailureOutcome?: EligibilityGuidanceOutcome;

  @ApiProperty({ example: '2026-01-01T00:00:00.000Z' })
  @IsDateString()
  effectiveFrom!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  effectiveUntil?: string;
}
