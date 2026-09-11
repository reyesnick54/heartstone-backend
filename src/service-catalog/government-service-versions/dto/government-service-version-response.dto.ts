import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ApplicantCategory,
  GovernmentServiceMaturityStatus,
  GovernmentServicePublicAvailability,
} from '@prisma/client';

export class GovernmentServiceVersionResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'uuid' })
  governmentServiceId!: string;

  @ApiProperty()
  version!: string;

  @ApiPropertyOptional()
  purpose?: string | null;

  @ApiPropertyOptional()
  coveredActivities?: string | null;

  @ApiPropertyOptional()
  excludedActivities?: string | null;

  @ApiPropertyOptional()
  geographicScope?: string | null;

  @ApiPropertyOptional()
  publicDescription?: string | null;

  @ApiPropertyOptional()
  typicalValidityDescription?: string | null;

  @ApiPropertyOptional()
  effectiveFrom?: Date | null;

  @ApiPropertyOptional()
  effectiveUntil?: Date | null;

  @ApiPropertyOptional()
  informationLastVerifiedAt?: Date | null;

  @ApiProperty({ enum: GovernmentServiceMaturityStatus })
  maturityStatus!: GovernmentServiceMaturityStatus;

  @ApiProperty({ enum: GovernmentServicePublicAvailability })
  publicAvailability!: GovernmentServicePublicAvailability;

  @ApiProperty({ enum: ApplicantCategory, isArray: true })
  applicantCategories!: ApplicantCategory[];

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}
