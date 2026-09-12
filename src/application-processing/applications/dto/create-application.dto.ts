import { ApplicantCategory } from '@prisma/client';
import { IsEnum, IsNotEmpty, IsObject, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateApplicationDto {
  @IsUUID()
  governmentServiceVersionId!: string;

  @IsUUID()
  formDefinitionId!: string;

  @IsUUID()
  formVersionId!: string;

  @IsString()
  @IsNotEmpty()
  configurationFingerprint!: string;

  @IsEnum(ApplicantCategory)
  applicantCategory!: ApplicantCategory;

  @IsOptional()
  @IsUUID()
  organizationId?: string;

  @IsOptional()
  @IsUUID()
  representativeAuthorityId?: string;

  @IsOptional()
  @IsObject()
  draftAnswers?: Record<string, unknown>;
}
