import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { EvidenceSource, EvidenceType } from '@prisma/client';
import {
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';

export class ReceiveEvidenceDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  caseId!: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  documentVersionId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  externalRecordReference?: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  title!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(4000)
  description?: string;

  @ApiProperty({ enum: EvidenceType })
  @IsEnum(EvidenceType)
  evidenceType!: EvidenceType;

  @ApiProperty({ enum: EvidenceSource })
  @IsEnum(EvidenceSource)
  source!: EvidenceSource;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  submittingParty!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  authorOrIssuingBody?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  dateCreated?: string;

  @ApiProperty()
  @IsDateString()
  dateReceived!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  periodCovered?: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  confidentialityClassification!: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  integrityReference!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  limitations?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  retentionRuleReference?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  validFrom?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  validUntil?: string;
}
