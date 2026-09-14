import { ComplaintCategory } from '@prisma/client';
import { IsEnum, IsOptional, IsString, IsUUID, MinLength } from 'class-validator';

export class LodgeComplaintDto {
  @IsUUID()
  masterAdministrativeFileId!: string;

  @IsUUID()
  complainantIdentityId!: string;

  @IsUUID()
  responsibleInstitutionId!: string;

  @IsUUID()
  responsibleDepartmentId!: string;

  @IsString()
  @MinLength(3)
  subjectSummary!: string;

  @IsOptional()
  @IsUUID()
  caseId?: string;

  @IsOptional()
  @IsUUID()
  governmentDecisionId?: string;

  @IsEnum(ComplaintCategory)
  category!: ComplaintCategory;

  @IsOptional()
  @IsString()
  classificationNotes?: string;
}
