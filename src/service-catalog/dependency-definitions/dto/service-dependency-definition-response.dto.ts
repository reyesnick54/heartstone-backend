import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ServiceDependencyType, ServiceOperatingMetadataStatus } from '@prisma/client';

export class ServiceDependencyDefinitionResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  serviceVersionId!: string;

  @ApiProperty({ enum: ServiceDependencyType })
  dependencyType!: ServiceDependencyType;

  @ApiPropertyOptional()
  authorityDependencyId?: string | null;

  @ApiProperty()
  name!: string;

  @ApiPropertyOptional()
  description?: string | null;

  @ApiPropertyOptional()
  externalEntityLabel?: string | null;

  @ApiPropertyOptional()
  operationalNotes?: string | null;

  @ApiProperty()
  effectiveFrom!: Date;

  @ApiPropertyOptional()
  effectiveUntil?: Date | null;

  @ApiProperty({ enum: ServiceOperatingMetadataStatus })
  status!: ServiceOperatingMetadataStatus;

  @ApiProperty()
  isCurrent!: boolean;

  @ApiProperty()
  authorityTransferred!: false;

  @ApiProperty()
  metadataOnly!: true;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}
