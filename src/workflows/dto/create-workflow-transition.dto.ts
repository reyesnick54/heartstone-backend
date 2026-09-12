import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { WorkflowTransitionType } from '@prisma/client';
import { IsEnum, IsInt, IsObject, IsOptional, IsUUID, Min } from 'class-validator';

export class CreateWorkflowTransitionDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  fromStepId!: string;

  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  toStepId!: string;

  @ApiPropertyOptional({ enum: WorkflowTransitionType, default: WorkflowTransitionType.NORMAL })
  @IsOptional()
  @IsEnum(WorkflowTransitionType)
  transitionType?: WorkflowTransitionType;

  @ApiPropertyOptional({ type: 'object', additionalProperties: true })
  @IsOptional()
  @IsObject()
  conditionConfig?: Record<string, unknown>;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  priority?: number;
}
