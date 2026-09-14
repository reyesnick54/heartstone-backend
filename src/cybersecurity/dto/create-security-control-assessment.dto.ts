import { SecurityControlAssessmentResult } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsDate, IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateSecurityControlAssessmentDto {
  @IsOptional()
  @IsString()
  assessmentNumber?: string;

  @IsUUID()
  implementationId!: string;

  @IsUUID()
  assessorIdentityId!: string;

  @IsEnum(SecurityControlAssessmentResult)
  result!: SecurityControlAssessmentResult;

  @IsOptional()
  @IsString()
  findingsSummary?: string;

  @IsOptional()
  @IsString()
  evidenceReference?: string;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  assessedAt?: Date;
}
