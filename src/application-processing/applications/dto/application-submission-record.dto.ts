import { ApiProperty } from '@nestjs/swagger';
import {
  ApplicationSubmissionStatus,
  CaseLegalStatus,
  CasePriority,
  CaseStatus,
  Prisma,
} from '@prisma/client';

import { jsonValueSchema } from '../../../common/openapi/json-value.schema';
import { ApplicationRecordDto } from './application-record.dto';

/** Scalar columns of a persisted `ApplicationSubmission` row as serialized to JSON. */
export class ApplicationSubmissionRecordDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'uuid' })
  applicationId!: string;

  @ApiProperty()
  submissionNumber!: string;

  @ApiProperty()
  sequenceNumber!: number;

  @ApiProperty({ enum: ApplicationSubmissionStatus })
  status!: ApplicationSubmissionStatus;

  @ApiProperty({
    ...jsonValueSchema(),
    description: 'Answers exactly as submitted (immutable snapshot)',
  })
  answersSnapshot!: Prisma.JsonValue;

  @ApiProperty()
  configurationFingerprint!: string;

  @ApiProperty({ format: 'uuid' })
  governmentServiceVersionId!: string;

  @ApiProperty({ format: 'uuid' })
  formVersionId!: string;

  @ApiProperty({ type: String, format: 'date-time' })
  submittedAt!: Date;

  @ApiProperty({ type: String, format: 'date-time', nullable: true })
  acknowledgedAt!: Date | null;

  @ApiProperty({ type: String, nullable: true })
  acknowledgmentReference!: string | null;

  @ApiProperty({
    description: 'SHA-256 of the submitted content. Integrity only; not proof of truth.',
  })
  contentHash!: string;

  @ApiProperty({ type: String, format: 'date-time', nullable: true })
  supersededAt!: Date | null;

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt!: Date;
}

/** Scalar columns of a persisted `Case` row as serialized to JSON. */
export class CaseRecordDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  caseNumber!: string;

  @ApiProperty({ format: 'uuid' })
  applicationId!: string;

  @ApiProperty({ format: 'uuid' })
  applicantIdentityId!: string;

  @ApiProperty({ format: 'uuid' })
  governmentServiceId!: string;

  @ApiProperty({ format: 'uuid' })
  governmentServiceVersionId!: string;

  @ApiProperty({ format: 'uuid' })
  responsibleInstitutionId!: string;

  @ApiProperty({ format: 'uuid' })
  responsibleDepartmentId!: string;

  @ApiProperty({ format: 'uuid' })
  workflowVersionId!: string;

  @ApiProperty()
  configurationFingerprint!: string;

  @ApiProperty({ enum: CaseStatus })
  status!: CaseStatus;

  @ApiProperty({ enum: CaseLegalStatus })
  legalStatus!: CaseLegalStatus;

  @ApiProperty({ type: String, nullable: true })
  legalStatusLabel!: string | null;

  @ApiProperty({ enum: CasePriority })
  priority!: CasePriority;

  @ApiProperty()
  version!: number;

  @ApiProperty({ type: String, format: 'date-time' })
  openedAt!: Date;

  @ApiProperty({ type: String, format: 'date-time', nullable: true })
  closedAt!: Date | null;

  @ApiProperty({ type: String, format: 'uuid', nullable: true })
  currentCaseManagerOfficeholderId!: string | null;

  @ApiProperty({ type: String, nullable: true })
  masterAdministrativeFileReference!: string | null;

  @ApiProperty({ type: String, nullable: true })
  documentRegisterReference!: string | null;

  @ApiProperty({ type: String, nullable: true })
  evidencePacketReference!: string | null;

  @ApiProperty({ type: String, nullable: true })
  recordsClassificationReference!: string | null;

  @ApiProperty({ type: String, nullable: true })
  retentionLegalHoldReference!: string | null;

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt!: Date;

  @ApiProperty({ type: String, format: 'date-time' })
  updatedAt!: Date;
}

/** `GET /applications/{id}`: the application with its submissions and (once submitted) its case. */
export class ApplicationDetailRecordDto extends ApplicationRecordDto {
  @ApiProperty({ type: () => [ApplicationSubmissionRecordDto] })
  submissions!: ApplicationSubmissionRecordDto[];

  @ApiProperty({ type: () => CaseRecordDto, nullable: true })
  case!: CaseRecordDto | null;
}

/**
 * Result of `POST /applications/{id}/submit` and `POST /applications/{id}/corrections`.
 *
 * Submission records receipt only. It is not acceptance, approval or issuance.
 */
export class ApplicationSubmissionResultDto {
  @ApiProperty({ format: 'uuid' })
  applicationId!: string;

  @ApiProperty({ type: String, nullable: true })
  applicationNumber!: string | null;

  @ApiProperty({ type: () => ApplicationSubmissionRecordDto })
  submission!: ApplicationSubmissionRecordDto;

  @ApiProperty({ type: () => CaseRecordDto, nullable: true })
  case!: CaseRecordDto | null;
}
