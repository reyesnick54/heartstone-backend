import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { GoverningSourceType } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsDate,
  IsEnum,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

export class CreateGoverningSourceDto {
  @ApiProperty({ example: 'ACT-2024-001' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  sourceCode!: string;

  @ApiProperty({ example: 'Building Control Act 2024' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  title!: string;

  @ApiProperty({ enum: GoverningSourceType })
  @IsEnum(GoverningSourceType)
  sourceType!: GoverningSourceType;

  @ApiPropertyOptional({ example: 'Parliament of Antigua and Barbuda' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  issuer?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  jurisdictionId?: string;

  @ApiPropertyOptional({ type: String, format: 'date' })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  instrumentDate?: Date;

  @ApiPropertyOptional({ type: String, format: 'date' })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  effectiveDate?: Date;

  @ApiPropertyOptional({ type: String, format: 'date' })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  commencementDate?: Date;

  @ApiPropertyOptional({ type: String, format: 'date' })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  expiryDate?: Date;

  @ApiPropertyOptional({ example: 'https://laws.gov.example/act/2024/001' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  officialLocationRef?: string;

  @ApiPropertyOptional({ example: 'sha256:abc123...' })
  @IsOptional()
  @IsString()
  @MaxLength(128)
  documentFingerprint?: string;

  @ApiPropertyOptional({ type: 'object', additionalProperties: true })
  @IsOptional()
  @IsObject()
  classificationMetadata?: Record<string, unknown>;
}
