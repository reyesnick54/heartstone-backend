import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ServiceOperatingMetadataStatus, ServiceOutputType } from '@prisma/client';
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

export class CreateServiceOutputDefinitionDto {
  @ApiProperty()
  @IsUUID()
  serviceVersionId!: string;

  @ApiProperty({ enum: ServiceOutputType })
  @IsEnum(ServiceOutputType)
  outputType!: ServiceOutputType;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  publicName!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  issuingInstitutionId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  expectedValidityDescription?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  renewalRequired?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  authorityFunctionId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  electronicIssuanceEligible?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  electronicIssuanceMetadata?: Record<string, unknown>;

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
