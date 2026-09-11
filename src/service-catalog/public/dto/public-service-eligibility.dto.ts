import { ApiPropertyOptional } from '@nestjs/swagger';
import { ApplicantCategory } from '@prisma/client';
import { IsEnum, IsObject, IsOptional, IsString } from 'class-validator';

export class PublicServiceEligibilityDto {
  @ApiPropertyOptional({ enum: ApplicantCategory })
  @IsOptional()
  @IsEnum(ApplicantCategory)
  applicantCategory?: ApplicantCategory;

  @ApiPropertyOptional({ description: 'Non-persistent applicant attributes used for guidance only' })
  @IsOptional()
  @IsObject()
  attributes?: Record<string, unknown>;

  @ApiPropertyOptional({ description: 'Optional service version id when checking against a pinned package' })
  @IsOptional()
  @IsString()
  serviceVersionId?: string;
}
