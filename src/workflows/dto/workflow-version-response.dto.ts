import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { WorkflowConsequenceLevel, WorkflowVersionStatus } from '@prisma/client';

export class WorkflowVersionResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'uuid' })
  workflowDefinitionId!: string;

  @ApiProperty()
  version!: string;

  @ApiProperty({ format: 'uuid' })
  serviceVersionId!: string;

  @ApiProperty({ enum: WorkflowVersionStatus })
  status!: WorkflowVersionStatus;

  @ApiProperty({ enum: WorkflowConsequenceLevel })
  consequenceLevel!: WorkflowConsequenceLevel;

  @ApiPropertyOptional()
  effectiveFrom?: Date | null;

  @ApiPropertyOptional()
  effectiveUntil?: Date | null;

  @ApiPropertyOptional({ format: 'uuid' })
  supersededByVersionId?: string | null;

  @ApiPropertyOptional({ format: 'uuid' })
  activationFunctionAuthorityRecordId?: string | null;

  @ApiPropertyOptional()
  manualFallbackReference?: string | null;

  @ApiProperty({ type: 'object', additionalProperties: true })
  entryConditions!: Record<string, unknown>;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}
