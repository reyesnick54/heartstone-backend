import { ApplicantCategory } from '@prisma/client';
import { IsEnum, IsNotEmpty, IsObject, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateCitizenApplicationDto {
  @IsString()
  @IsNotEmpty()
  configurationFingerprint!: string;

  @IsOptional()
  @IsUUID()
  serviceVersionId?: string;

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
