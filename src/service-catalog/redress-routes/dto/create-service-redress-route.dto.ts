import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ServiceOperatingMetadataStatus, ServiceRedressRouteType } from '@prisma/client';
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  MinLength,
} from 'class-validator';

export class CreateServiceRedressRouteDto {
  @ApiProperty()
  @IsUUID()
  serviceVersionId!: string;

  @ApiProperty({ enum: ServiceRedressRouteType })
  @IsEnum(ServiceRedressRouteType)
  routeType!: ServiceRedressRouteType;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  routeName!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  responsibleInstitutionId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  deadlineDescription?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  governingSourceId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  independenceRequired?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  contactChannelMetadata?: Record<string, unknown>;

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
