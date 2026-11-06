import { ApiPropertyOptional } from '@nestjs/swagger';
import { ApplicantCategory } from '@prisma/client';
import { IsEnum, IsObject, IsOptional, IsString } from 'class-validator';

import { FREE_FORM_OBJECT_SCHEMA } from '../../../common/openapi/json-value.schema';

export class PublicServiceEligibilityDto {
  @ApiPropertyOptional({ enum: ApplicantCategory })
  @IsOptional()
  @IsEnum(ApplicantCategory)
  applicantCategory?: ApplicantCategory;

  @ApiPropertyOptional({
    ...FREE_FORM_OBJECT_SCHEMA,
    description:
      'Non-persistent applicant attributes used for guidance only, keyed by eligibility attribute code',
  })
  @IsOptional()
  @IsObject()
  attributes?: Record<string, unknown>;

  @ApiPropertyOptional({
    description: 'Optional service version id when checking against a pinned package',
  })
  @IsOptional()
  @IsString()
  serviceVersionId?: string;
}
