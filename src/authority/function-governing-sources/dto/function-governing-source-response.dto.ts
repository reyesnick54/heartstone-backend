import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { FunctionSourceInterpretationStatus, FunctionSourceRelationshipType } from '@prisma/client';

export class FunctionGoverningSourceResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'uuid' })
  functionAuthorityRecordId!: string;

  @ApiProperty({ format: 'uuid' })
  governingSourceId!: string;

  @ApiPropertyOptional()
  provisionCitation?: string | null;

  @ApiProperty({ enum: FunctionSourceRelationshipType })
  relationshipType!: FunctionSourceRelationshipType;

  @ApiProperty()
  isPrimary!: boolean;

  @ApiProperty({ enum: FunctionSourceInterpretationStatus })
  interpretationStatus!: FunctionSourceInterpretationStatus;

  @ApiPropertyOptional()
  effectiveFrom?: Date | null;

  @ApiPropertyOptional()
  effectiveUntil?: Date | null;

  @ApiPropertyOptional()
  notes?: string | null;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}
