import { ComplianceRevalidationTrigger } from '@prisma/client';
import { IsArray, IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';

export class RecordRevalidationDto {
  @IsUUID()
  projectionId!: string;

  @IsEnum(ComplianceRevalidationTrigger)
  trigger!: ComplianceRevalidationTrigger;

  @IsString()
  triggerSummary!: string;

  @IsArray()
  sourceDataRefs!: { type: string; id: string }[];

  @IsOptional()
  @IsUUID()
  priorAssessmentId?: string;

  @IsOptional()
  @IsString()
  priorAssessmentType?: string;

  @IsOptional()
  @IsUUID()
  recordedByIdentityId?: string;
}
