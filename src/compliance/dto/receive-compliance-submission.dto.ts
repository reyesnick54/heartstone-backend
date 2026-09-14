import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsObject, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class ReceiveComplianceSubmissionDto {
  @ApiProperty()
  @IsUUID()
  complianceMatterId!: string;

  @ApiProperty()
  @IsUUID()
  continuingObligationId!: string;

  @ApiProperty()
  @IsDateString()
  reportingPeriodStart!: string;

  @ApiProperty()
  @IsDateString()
  reportingPeriodEnd!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  representativeAuthorityId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  declarationReference?: string;

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
