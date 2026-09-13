import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsISO8601, IsOptional, IsString, IsUUID } from 'class-validator';

export class AssessDecisionReadinessDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  caseId!: string;

  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  decisionTypeVersionId!: string;

  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  proposedDecisionMakerIdentityId!: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  proposedDecisionMakerOfficeholderId?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  appointmentId?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  delegationId?: string;

  @ApiProperty()
  @IsString()
  requestedOutcome!: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  evidencePacketVersionId?: string;

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
