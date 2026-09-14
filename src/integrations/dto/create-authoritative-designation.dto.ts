import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AuthoritativeSourceStatus } from '@prisma/client';
import { IsDateString, IsEnum, IsOptional, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';

export class CreateAuthoritativeDesignationDto {
  @ApiProperty()
  @IsUUID()
  integrationVersionId!: string;

  @ApiProperty()
  @IsUUID()
  institutionId!: string;

  @ApiProperty()
  @IsString()
  @MinLength(2)
  @MaxLength(512)
  datasetResource!: string;

  @ApiProperty()
  @IsString()
  @MinLength(2)
  @MaxLength(512)
  authoritySource!: string;

  @ApiProperty()
  @IsString()
  @MinLength(2)
  @MaxLength(2000)
  scope!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  effectiveFrom?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  effectiveUntil?: string;

  @ApiPropertyOptional({ enum: AuthoritativeSourceStatus, description: 'Defaults to UNVERIFIED; cannot be AUTHORITATIVE on create' })
  @IsOptional()
  @IsEnum(AuthoritativeSourceStatus)
  sourceStatus?: AuthoritativeSourceStatus;
}
