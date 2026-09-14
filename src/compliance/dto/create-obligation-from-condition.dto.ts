import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ContinuingObligationType } from '@prisma/client';
import { IsDateString, IsEnum, IsObject, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateObligationFromConditionDto {
  @ApiProperty()
  @IsUUID()
  complianceMatterId!: string;

  @ApiProperty()
  @IsUUID()
  sourceDecisionConditionId!: string;

  @ApiProperty()
  @IsUUID()
  sourceInstrumentVersionId!: string;

  @ApiProperty()
  @IsString()
  obligationCode!: string;

  @ApiProperty()
  @IsString()
  responsibleParty!: string;

  @ApiProperty({ enum: ContinuingObligationType })
  @IsEnum(ContinuingObligationType)
  obligationType!: ContinuingObligationType;

  @ApiProperty()
  @IsDateString()
  startDate!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  recurrenceConfiguration?: Record<string, unknown>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  evidenceStandard?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  reviewingOfficeId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  functionAuthorityRecordId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  noncomplianceConsequenceReference?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  exceptionProcedureReference?: string;
}
