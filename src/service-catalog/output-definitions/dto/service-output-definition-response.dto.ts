import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ServiceOperatingMetadataStatus, ServiceOutputType } from '@prisma/client';

export class ServiceOutputDefinitionResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  serviceVersionId!: string;

  @ApiProperty({ enum: ServiceOutputType })
  outputType!: ServiceOutputType;

  @ApiProperty()
  publicName!: string;

  @ApiPropertyOptional()
  description?: string | null;

  @ApiPropertyOptional()
  issuingInstitutionId?: string | null;

  @ApiPropertyOptional()
  expectedValidityDescription?: string | null;

  @ApiProperty()
  renewalRequired!: boolean;

  @ApiPropertyOptional()
  authorityFunctionId?: string | null;

  @ApiProperty()
  electronicIssuanceEligible!: boolean;

  @ApiProperty()
  electronicIssuanceMetadata!: Record<string, unknown>;

  @ApiProperty()
  effectiveFrom!: Date;

  @ApiPropertyOptional()
  effectiveUntil?: Date | null;

  @ApiProperty({ enum: ServiceOperatingMetadataStatus })
  status!: ServiceOperatingMetadataStatus;

  @ApiProperty()
  isCurrent!: boolean;

  @ApiProperty()
  issued!: false;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}
