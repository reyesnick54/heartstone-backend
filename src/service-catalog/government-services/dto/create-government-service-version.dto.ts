import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { GovernmentServiceVersionStatus } from '@prisma/client';
import { IsArray, IsDateString, IsEnum, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateGovernmentServiceVersionDto {
  @ApiProperty({ example: '1.0.0' })
  @IsString()
  @MinLength(1)
  versionLabel!: string;

  @ApiProperty({ example: '2026-01-01T00:00:00.000Z' })
  @IsDateString()
  effectiveFrom!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  effectiveUntil?: string;

  @ApiPropertyOptional({ enum: GovernmentServiceVersionStatus })
  @IsOptional()
  @IsEnum(GovernmentServiceVersionStatus)
  status?: GovernmentServiceVersionStatus;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  relatedServiceCodes?: string[];

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  dependencyCodes?: string[];
}
