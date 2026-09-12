import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { WorkflowConsequenceLevel } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsDate,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  ValidateNested,
} from 'class-validator';

export class WorkflowEntryConditionsDto {
  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  eligibleApplicantCategories?: string[];

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  formVersionId?: string;

  @ApiPropertyOptional({ type: 'object', additionalProperties: true })
  @IsOptional()
  identityRequirements?: Record<string, unknown>;

  @ApiPropertyOptional({ type: 'object', additionalProperties: true })
  @IsOptional()
  feeRequirementMetadata?: Record<string, unknown>;

  @ApiPropertyOptional({ type: 'array', items: { type: 'object' } })
  @IsOptional()
  @IsArray()
  prerequisites?: Record<string, unknown>[];
}

export class CreateWorkflowVersionDto {
  @ApiProperty({ example: '1.0.0' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(32)
  version!: string;

  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  serviceVersionId!: string;

  @ApiPropertyOptional({ enum: WorkflowConsequenceLevel })
  @IsOptional()
  @IsEnum(WorkflowConsequenceLevel)
  consequenceLevel?: WorkflowConsequenceLevel;

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

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(512)
  manualFallbackReference?: string;

  @ApiPropertyOptional({ type: WorkflowEntryConditionsDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => WorkflowEntryConditionsDto)
  entryConditions?: WorkflowEntryConditionsDto;
}

export class UpdateWorkflowVersionDto {
  @ApiPropertyOptional({ enum: WorkflowConsequenceLevel })
  @IsOptional()
  @IsEnum(WorkflowConsequenceLevel)
  consequenceLevel?: WorkflowConsequenceLevel;

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

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(512)
  manualFallbackReference?: string;

  @ApiPropertyOptional({ type: WorkflowEntryConditionsDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => WorkflowEntryConditionsDto)
  entryConditions?: WorkflowEntryConditionsDto;
}
