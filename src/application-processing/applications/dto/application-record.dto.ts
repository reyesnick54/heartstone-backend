import { ApiProperty } from '@nestjs/swagger';
import { ApplicantCategory, ApplicationStatus, Prisma } from '@prisma/client';

import { jsonValueSchema } from '../../../common/openapi/json-value.schema';

/** Scalar columns of a persisted `Application` row as serialized to JSON. */
export class ApplicationRecordDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({ type: String, nullable: true })
  applicationNumber!: string | null;

  @ApiProperty()
  applicantIdentityId!: string;

  @ApiProperty({ type: String, nullable: true })
  organizationId!: string | null;

  @ApiProperty({ type: String, nullable: true })
  representativeAuthorityId!: string | null;

  @ApiProperty()
  governmentServiceId!: string;

  @ApiProperty()
  governmentServiceVersionId!: string;

  @ApiProperty()
  formDefinitionId!: string;

  @ApiProperty()
  formVersionId!: string;

  @ApiProperty()
  configurationFingerprint!: string;

  @ApiProperty({ enum: ApplicantCategory })
  applicantCategory!: ApplicantCategory;

  @ApiProperty({ enum: ApplicationStatus })
  status!: ApplicationStatus;

  @ApiProperty({ ...jsonValueSchema() })
  draftAnswers!: Prisma.JsonValue;

  @ApiProperty({ type: String, nullable: true })
  idempotencyKey!: string | null;

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt!: Date;

  @ApiProperty({ type: String, format: 'date-time' })
  updatedAt!: Date;
}
