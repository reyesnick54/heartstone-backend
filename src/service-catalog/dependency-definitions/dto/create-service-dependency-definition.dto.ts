import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ServiceDependencyType, ServiceOperatingMetadataStatus } from '@prisma/client';
import { IsDateString, IsEnum, IsOptional, IsString, IsUUID, MinLength } from 'class-validator';

export class CreateServiceDependencyDefinitionDto {
  @ApiProperty()
  @IsUUID()
  serviceVersionId!: string;

  @ApiProperty({ enum: ServiceDependencyType })
  @IsEnum(ServiceDependencyType)
  dependencyType!: ServiceDependencyType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  authorityDependencyId?: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  name!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  externalEntityLabel?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  operationalNotes?: string;

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
