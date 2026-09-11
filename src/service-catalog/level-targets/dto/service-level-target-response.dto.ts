import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ServiceLevelClockBasis,
  ServiceLevelDayBasis,
  ServiceLevelDurationUnit,
  ServiceLevelTargetType,
  ServiceOperatingMetadataStatus,
} from '@prisma/client';

export class ServiceLevelTargetResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  serviceVersionId!: string;

  @ApiProperty({ enum: ServiceLevelTargetType })
  targetType!: ServiceLevelTargetType;

  @ApiProperty()
  targetDurationValue!: number;

  @ApiProperty({ enum: ServiceLevelDurationUnit })
  targetDurationUnit!: ServiceLevelDurationUnit;

  @ApiProperty({ enum: ServiceLevelClockBasis })
  clockBasis!: ServiceLevelClockBasis;

  @ApiProperty({ enum: ServiceLevelDayBasis })
  dayBasis!: ServiceLevelDayBasis;

  @ApiProperty()
  startEventDescription!: string;

  @ApiPropertyOptional()
  startEventReference?: string | null;

  @ApiProperty()
  pausable!: boolean;

  @ApiProperty()
  approvedPauseReasons!: string[];

  @ApiPropertyOptional()
  externalDependencyTreatment?: string | null;

  @ApiPropertyOptional()
  escalationThreshold?: string | null;

  @ApiPropertyOptional()
  governingSourceId?: string | null;

  @ApiProperty()
  effectiveFrom!: Date;

  @ApiPropertyOptional()
  effectiveUntil?: Date | null;

  @ApiProperty({ enum: ServiceOperatingMetadataStatus })
  status!: ServiceOperatingMetadataStatus;

  @ApiProperty()
  isCurrent!: boolean;

  @ApiProperty()
  approved!: false;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}
