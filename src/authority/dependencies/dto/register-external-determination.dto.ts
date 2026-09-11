import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ExternalDeterminationStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsDate,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

export class RegisterExternalDeterminationDto {
  @ApiProperty()
  @IsUUID()
  authorityDependencyId!: string;

  @ApiProperty()
  @IsUUID()
  externalAuthorityId!: string;

  @ApiProperty({ example: 'NAT-GOV-2026-00142' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  determinationReference!: string;

  @ApiProperty({ enum: ExternalDeterminationStatus })
  @IsEnum(ExternalDeterminationStatus)
  determinationStatus!: ExternalDeterminationStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  effectiveDate?: Date;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  expiryDate?: Date;

  @ApiProperty({ default: false })
  @IsBoolean()
  isAuthenticated!: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  scope?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  retainedQuestion?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  requiredDetermination?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  referralBasis?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  effectOnAbsezAction?: string;
}
