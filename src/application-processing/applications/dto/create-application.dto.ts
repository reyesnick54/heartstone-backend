import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ApplicantCategory } from '@prisma/client';
import { IsEnum, IsNotEmpty, IsObject, IsOptional, IsString, IsUUID } from 'class-validator';

import { FREE_FORM_OBJECT_SCHEMA } from '../../../common/openapi/json-value.schema';

export class CreateApplicationDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  governmentServiceVersionId!: string;

  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  formDefinitionId!: string;

  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  formVersionId!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  configurationFingerprint!: string;

  @ApiProperty({ enum: ApplicantCategory })
  @IsEnum(ApplicantCategory)
  applicantCategory!: ApplicantCategory;

  @ApiPropertyOptional({
    format: 'uuid',
    description: 'Required only with a representative authority the applicant holds',
  })
  @IsOptional()
  @IsUUID()
  organizationId?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  representativeAuthorityId?: string;

  @ApiPropertyOptional({ ...FREE_FORM_OBJECT_SCHEMA })
  @IsOptional()
  @IsObject()
  draftAnswers?: Record<string, unknown>;
}
