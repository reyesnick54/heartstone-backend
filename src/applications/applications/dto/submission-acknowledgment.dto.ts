import { ApiProperty } from '@nestjs/swagger';
import { ApplicationStatus } from '@prisma/client';

export class SubmissionAcknowledgmentDto {
  @ApiProperty()
  applicationNumber!: string;

  @ApiProperty()
  submissionId!: string;

  @ApiProperty()
  receivedAt!: string;

  @ApiProperty()
  serviceName!: string;

  @ApiProperty()
  serviceVersionLabel!: string;

  @ApiProperty()
  formVersionId!: string;

  @ApiProperty()
  configurationFingerprint!: string;

  @ApiProperty()
  nextExpectedStage!: string;

  @ApiProperty({ enum: ApplicationStatus })
  currentStatus!: ApplicationStatus;

  @ApiProperty()
  acknowledgmentReference!: string;

  @ApiProperty()
  receiptDisclaimer!: string;
}
