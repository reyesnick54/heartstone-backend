import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsObject, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class RequestSubmissionCorrectionDto {
  @ApiProperty()
  @IsUUID()
  submissionId!: string;

  @ApiProperty()
  @IsString()
  @MaxLength(2000)
  correctionReason!: string;

  @ApiProperty()
  @IsObject()
  answersData!: Record<string, unknown>;

  @ApiPropertyOptional()
  @IsOptional()
  documentReferences?: unknown[];

  @ApiPropertyOptional()
  @IsOptional()
  evidenceReferences?: unknown[];
}
