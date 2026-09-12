import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { WorkflowStageType } from '@prisma/client';
import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateWorkflowStageDto {
  @ApiProperty({ example: 'intake' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  stageKey!: string;

  @ApiProperty({ example: 'Intake' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name!: string;

  @ApiProperty()
  @IsInt()
  @Min(0)
  sequence!: number;

  @ApiProperty({ enum: WorkflowStageType })
  @IsEnum(WorkflowStageType)
  stageType!: WorkflowStageType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(4000)
  description?: string;

  @ApiPropertyOptional({ type: 'object', additionalProperties: true })
  @IsOptional()
  @IsObject()
  entryRules?: Record<string, unknown>;

  @ApiPropertyOptional({ type: 'object', additionalProperties: true })
  @IsOptional()
  @IsObject()
  completionRules?: Record<string, unknown>;
}
