import { ComplianceDashboardAudience } from '@prisma/client';
import { IsDateString, IsEnum, IsOptional, IsUUID } from 'class-validator';

export class DeriveComplianceProjectionDto {
  @IsEnum(ComplianceDashboardAudience)
  audience!: ComplianceDashboardAudience;

  @IsOptional()
  @IsUUID()
  subjectIdentityId?: string;

  @IsOptional()
  @IsUUID()
  subjectOfficeholderId?: string;

  @IsOptional()
  @IsUUID()
  subjectDepartmentId?: string;

  @IsOptional()
  @IsUUID()
  subjectInstitutionId?: string;

  @IsOptional()
  @IsUUID()
  caseId?: string;

  @IsOptional()
  @IsUUID()
  masterAdministrativeFileId?: string;

  @IsOptional()
  @IsUUID()
  officialInstrumentId?: string;

  @IsOptional()
  @IsUUID()
  functionAuthorityRecordId?: string;

  @IsOptional()
  @IsUUID()
  authorityEvaluationRecordId?: string;

  @IsOptional()
  underlyingAssessmentType?: string;

  @IsOptional()
  @IsUUID()
  underlyingAssessmentId?: string;

  @IsOptional()
  @IsDateString()
  evidenceCutoffAt?: string;
}
