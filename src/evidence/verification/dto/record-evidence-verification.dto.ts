import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  EvidenceVerificationCategory,
  EvidenceVerificationMethod,
  EvidenceVerificationResult,
} from '@prisma/client';
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';

export class RecordEvidenceVerificationDto {
  @ApiProperty({ enum: EvidenceVerificationCategory })
  @IsEnum(EvidenceVerificationCategory)
  category!: EvidenceVerificationCategory;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  whatWasVerified!: string;

  @ApiProperty({ enum: EvidenceVerificationMethod })
  @IsEnum(EvidenceVerificationMethod)
  verificationMethod!: EvidenceVerificationMethod;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  verificationSource!: string;

  @ApiProperty({ enum: EvidenceVerificationResult })
  @IsEnum(EvidenceVerificationResult)
  result!: EvidenceVerificationResult;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  verifiedByOfficeholderId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  professionalReference?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  externalAuthorityReference?: string;

  @ApiProperty()
  @IsDateString()
  performedAt!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  limitations?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  expiresAt?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  authorityEvaluationRecordId?: string;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isAiProposed?: boolean;
}
