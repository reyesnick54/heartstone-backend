import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  EvidenceAcceptanceDecision,
  EvidenceAcceptancePurpose,
  EvidenceRequirementLinkStatus,
  EvidenceRequirementRelationship,
} from '@prisma/client';
import {
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';

export class LinkEvidenceRequirementDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  checklistItemId!: string;

  @ApiProperty({ enum: EvidenceRequirementRelationship })
  @IsEnum(EvidenceRequirementRelationship)
  relationship!: EvidenceRequirementRelationship;

  @ApiPropertyOptional({ enum: EvidenceRequirementLinkStatus })
  @IsOptional()
  @IsEnum(EvidenceRequirementLinkStatus)
  status?: EvidenceRequirementLinkStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  effectiveFrom?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  effectiveUntil?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  limitations?: string;
}

export class RecordEvidencePurposeAcceptanceDto {
  @ApiProperty({ enum: EvidenceAcceptancePurpose })
  @IsEnum(EvidenceAcceptancePurpose)
  purpose!: EvidenceAcceptancePurpose;

  @ApiProperty({ enum: EvidenceAcceptanceDecision })
  @IsEnum(EvidenceAcceptanceDecision)
  decision!: EvidenceAcceptanceDecision;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  reviewerOfficeholderId?: string;

  @ApiProperty()
  @IsDateString()
  decidedAt!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  reason?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  scope?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  limitations?: string;
}

export class ProposeEvidenceQualityAssessmentDto {
  @ApiProperty({
    enum: [
      'RELEVANCE',
      'PROVENANCE',
      'AUTHENTICITY',
      'COMPLETENESS',
      'CURRENCY',
      'INDEPENDENCE',
      'RELIABILITY',
      'INTEGRITY',
      'SCOPE',
      'FITNESS_FOR_PURPOSE',
    ],
  })
  @IsString()
  criterion!: string;

  @ApiProperty({ enum: ['STRONG', 'ADEQUATE', 'WEAK', 'INSUFFICIENT', 'UNASSESSED'] })
  @IsString()
  rating!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;

  @ApiProperty()
  @IsDateString()
  assessedAt!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  limitations?: string;
}

export class FinalizeEvidenceQualityAssessmentDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  assessmentId!: string;
}

export class UpdateEvidenceStatusDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  status!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  reason?: string;
}
