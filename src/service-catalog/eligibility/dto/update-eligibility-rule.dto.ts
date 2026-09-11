import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  EligibilityGuidanceOutcome,
  ServiceEligibilityRuleCategory,
  ServiceEligibilityRuleOperator,
  ServiceEligibilityRuleStatus,
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

export class UpdateEligibilityRuleDto {
  @ApiPropertyOptional({ enum: ServiceEligibilityRuleCategory })
  @IsOptional()
  @IsEnum(ServiceEligibilityRuleCategory)
  category?: ServiceEligibilityRuleCategory;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(1)
  attributeKey?: string;

  @ApiPropertyOptional({ enum: ServiceEligibilityRuleOperator })
  @IsOptional()
  @IsEnum(ServiceEligibilityRuleOperator)
  operator?: ServiceEligibilityRuleOperator;

  @ApiPropertyOptional()
  @IsOptional()
  expectedValue?: unknown;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(1)
  reasonCode?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  priority?: number;

  @ApiPropertyOptional({ enum: EligibilityGuidanceOutcome })
  @IsOptional()
  @IsEnum(EligibilityGuidanceOutcome)
  onFailureOutcome?: EligibilityGuidanceOutcome;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  effectiveFrom?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  effectiveUntil?: string;

  @ApiPropertyOptional({ enum: ServiceEligibilityRuleStatus })
  @IsOptional()
  @IsEnum(ServiceEligibilityRuleStatus)
  status?: ServiceEligibilityRuleStatus;
}
