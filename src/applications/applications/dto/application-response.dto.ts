import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ApplicationStatus, SubmissionChannel } from '@prisma/client';

export class ApplicationResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  applicationNumber!: string;

  @ApiProperty()
  applicantIdentityId!: string;

  @ApiPropertyOptional()
  representativeAuthorityId?: string | null;

  @ApiPropertyOptional()
  organizationId?: string | null;

  @ApiProperty()
  governmentServiceId!: string;

  @ApiProperty()
  governmentServiceVersionId!: string;

  @ApiProperty({ enum: ApplicationStatus })
  currentStatus!: ApplicationStatus;

  @ApiProperty({ enum: SubmissionChannel })
  submissionChannel!: SubmissionChannel;

  @ApiPropertyOptional()
  draftFormVersionId?: string | null;

  @ApiProperty()
  createdAt!: string;

  @ApiProperty()
  updatedAt!: string;
}
