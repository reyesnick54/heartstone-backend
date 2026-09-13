import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsISO8601, IsOptional, IsString, IsUUID } from 'class-validator';

export class ExecuteGovernmentDecisionDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  caseId!: string;

  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  decisionTypeVersionId!: string;

  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  decisionReadinessAssessmentId!: string;

  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  evidencePacketVersionId!: string;

  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  decisionMakerIdentityId!: string;

  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  decisionMakerOfficeholderId!: string;

  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  appointmentId!: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  delegationId?: string;

  @ApiProperty()
  @IsString()
  matterDecided!: string;

  @ApiProperty()
  @IsString()
  outcome!: string;

  @ApiProperty({ description: 'Decision-maker must explicitly confirm intent to decide' })
  @IsBoolean()
  explicitIntentConfirmed!: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsISO8601()
  at?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isConflicted?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isRecused?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  hasSecondApproval?: boolean;
}
