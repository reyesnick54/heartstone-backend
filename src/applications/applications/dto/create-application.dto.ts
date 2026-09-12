import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SubmissionChannel } from '@prisma/client';
import { IsEnum, IsOptional, IsUUID } from 'class-validator';

export class CreateApplicationDto {
  @ApiProperty()
  @IsUUID()
  governmentServiceVersionId!: string;

  @ApiPropertyOptional({ enum: SubmissionChannel })
  @IsOptional()
  @IsEnum(SubmissionChannel)
  submissionChannel?: SubmissionChannel;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  representativeAuthorityId?: string;

  @ApiPropertyOptional({
    description:
      'Organization context when filing on behalf of an entity. Must be validated against representative authority or membership.',
  })
  @IsOptional()
  @IsUUID()
  organizationId?: string;
}
