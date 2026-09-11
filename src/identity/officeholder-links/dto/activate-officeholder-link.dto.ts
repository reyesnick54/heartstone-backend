import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IdentityOfficeholderVerificationMethod } from '@prisma/client';
import { IsDateString, IsEnum, IsOptional, IsString } from 'class-validator';

export class ActivateOfficeholderLinkDto {
  @ApiProperty({ enum: IdentityOfficeholderVerificationMethod })
  @IsEnum(IdentityOfficeholderVerificationMethod)
  verificationMethod!: IdentityOfficeholderVerificationMethod;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  evidenceReference?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  effectiveFrom?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  effectiveUntil?: string;
}
