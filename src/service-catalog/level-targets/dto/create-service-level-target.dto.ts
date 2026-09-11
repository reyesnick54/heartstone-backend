import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ServiceLevelClockBasis,
  ServiceLevelDayBasis,
  ServiceLevelDurationUnit,
  ServiceLevelTargetType,
  ServiceOperatingMetadataStatus,
} from '@prisma/client';
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  MinLength,
} from 'class-validator';

export class CreateServiceLevelTargetDto {
  @ApiProperty()
  @IsUUID()
  serviceVersionId!: string;

  @ApiProperty({ enum: ServiceLevelTargetType })
  @IsEnum(ServiceLevelTargetType)
  targetType!: ServiceLevelTargetType;

  @ApiProperty()
  @IsInt()
  @Min(1)
  targetDurationValue!: number;

  @ApiProperty({ enum: ServiceLevelDurationUnit })
  @IsEnum(ServiceLevelDurationUnit)
  targetDurationUnit!: ServiceLevelDurationUnit;

  @ApiProperty({ enum: ServiceLevelClockBasis })
  @IsEnum(ServiceLevelClockBasis)
  clockBasis!: ServiceLevelClockBasis;

  @ApiProperty({ enum: ServiceLevelDayBasis })
  @IsEnum(ServiceLevelDayBasis)
  dayBasis!: ServiceLevelDayBasis;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  startEventDescription!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  startEventReference?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  pausable?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  approvedPauseReasons?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  externalDependencyTreatment?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  escalationThreshold?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  governingSourceId?: string;

  @ApiProperty()
  @IsDateString()
  effectiveFrom!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  effectiveUntil?: string;

  @ApiPropertyOptional({ enum: ServiceOperatingMetadataStatus })
  @IsOptional()
  @IsEnum(ServiceOperatingMetadataStatus)
  status?: ServiceOperatingMetadataStatus;
}
