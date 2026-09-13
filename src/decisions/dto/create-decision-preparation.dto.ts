import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsObject, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateDecisionPreparationDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  caseId!: string;

  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  decisionTypeVersionId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  proposedFindings?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  proposedReasons?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  proposedOutcome?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  recommendation?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  aiAssistanceMetadata?: Record<string, unknown>;
}
