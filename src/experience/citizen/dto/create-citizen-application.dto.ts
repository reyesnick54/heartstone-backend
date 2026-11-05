import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ApplicantCategory } from '@prisma/client';
import { IsEnum, IsNotEmpty, IsObject, IsOptional, IsString, IsUUID } from 'class-validator';

/**
 * Body for creating a draft application from a citizen-facing service start package.
 * The applicant identity always comes from the authenticated session, never from this body.
 */
export class CreateCitizenApplicationDto {
  @ApiProperty({
    description: 'Configuration fingerprint returned by the service start package',
  })
  @IsString()
  @IsNotEmpty()
  configurationFingerprint!: string;

  @ApiPropertyOptional({
    format: 'uuid',
    description: 'Pin to the service version returned by the start package',
  })
  @IsOptional()
  @IsUUID()
  serviceVersionId?: string;

  @ApiProperty({ enum: ApplicantCategory })
  @IsEnum(ApplicantCategory)
  applicantCategory!: ApplicantCategory;

  @ApiPropertyOptional({
    format: 'uuid',
    description: 'Organization applied for; requires a representative authority',
  })
  @IsOptional()
  @IsUUID()
  organizationId?: string;

  @ApiPropertyOptional({
    format: 'uuid',
    description: 'Representative authority under which the citizen acts for the organization',
  })
  @IsOptional()
  @IsUUID()
  representativeAuthorityId?: string;

  @ApiPropertyOptional({
    type: 'object',
    additionalProperties: true,
    description: 'Draft form answers keyed by form field key',
  })
  @IsOptional()
  @IsObject()
  draftAnswers?: Record<string, unknown>;
}
