import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AssuranceLevel, ServiceDataClassification } from '@prisma/client';
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MinLength,
} from 'class-validator';

export class CreateServiceVersionDto {
  @ApiProperty()
  @IsUUID()
  governmentServiceId!: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  versionLabel!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ enum: ServiceDataClassification })
  @IsOptional()
  @IsEnum(ServiceDataClassification)
  dataClassification?: ServiceDataClassification;

  @ApiPropertyOptional({ enum: AssuranceLevel })
  @IsOptional()
  @IsEnum(AssuranceLevel)
  identityAssuranceExpectation?: AssuranceLevel;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  sensitiveDataIndicator?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  manualFallbackDescription?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  manualFallbackReference?: string;

  @ApiProperty()
  @IsDateString()
  effectiveFrom!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  effectiveUntil?: string;
}
