import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SubmissionChannel, SubmittedCapacity } from '@prisma/client';

export class ApplicationSubmissionResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  applicationId!: string;

  @ApiProperty()
  submissionSequence!: number;

  @ApiProperty()
  serviceVersionId!: string;

  @ApiProperty()
  formVersionId!: string;

  @ApiProperty()
  configurationFingerprint!: string;

  @ApiProperty()
  submittedByIdentityId!: string;

  @ApiProperty({ enum: SubmittedCapacity })
  submittedCapacity!: SubmittedCapacity;

  @ApiPropertyOptional()
  representativeAuthorityId?: string | null;

  @ApiProperty({ enum: SubmissionChannel })
  submissionChannel!: SubmissionChannel;

  @ApiProperty()
  submittedAt!: string;

  @ApiProperty()
  payloadHash!: string;

  @ApiProperty()
  acknowledgmentReference!: string;

  @ApiPropertyOptional()
  supersedesSubmissionId?: string | null;

  @ApiProperty()
  createdAt!: string;
}
