import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AssuranceLevel, ServiceDataClassification, ServiceLifecycleStatus } from '@prisma/client';

export class ServiceVersionResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  governmentServiceId!: string;

  @ApiProperty()
  versionLabel!: string;

  @ApiProperty({ enum: ServiceLifecycleStatus })
  status!: ServiceLifecycleStatus;

  @ApiPropertyOptional()
  description?: string | null;

  @ApiProperty({ enum: ServiceDataClassification })
  dataClassification!: ServiceDataClassification;

  @ApiPropertyOptional({ enum: AssuranceLevel })
  identityAssuranceExpectation?: AssuranceLevel | null;

  @ApiProperty()
  sensitiveDataIndicator!: boolean;

  @ApiPropertyOptional()
  manualFallbackDescription?: string | null;

  @ApiPropertyOptional()
  manualFallbackReference?: string | null;

  @ApiProperty()
  effectiveFrom!: Date;

  @ApiPropertyOptional()
  effectiveUntil?: Date | null;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}
