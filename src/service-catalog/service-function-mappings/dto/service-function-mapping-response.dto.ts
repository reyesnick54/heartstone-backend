import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ServiceFunctionMappingStatus } from '@prisma/client';

export class ServiceFunctionMappingResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'uuid' })
  governmentServiceVersionId!: string;

  @ApiProperty({ format: 'uuid' })
  functionAuthorityRecordId!: string;

  @ApiProperty()
  sequenceOrder!: number;

  @ApiProperty()
  isConsequential!: boolean;

  @ApiPropertyOptional()
  publicStageLabel?: string | null;

  @ApiProperty({ enum: ServiceFunctionMappingStatus })
  status!: ServiceFunctionMappingStatus;

  @ApiPropertyOptional()
  effectiveFrom?: Date | null;

  @ApiPropertyOptional()
  effectiveUntil?: Date | null;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;

  @ApiPropertyOptional({ description: 'Resolved Phase 4 function authority record code' })
  functionAuthorityRecordCode?: string;

  @ApiPropertyOptional({ description: 'Resolved Phase 4 function authority record name' })
  functionAuthorityRecordName?: string;
}
