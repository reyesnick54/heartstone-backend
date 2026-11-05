import { ApiProperty } from '@nestjs/swagger';
import {
  EmployerRegistryStatus,
  EmploymentRelationshipStatus,
  LabourDataClassification,
  WorkPermitApplicationProfileStatus,
  WorkPermitLifecycleStatus,
} from '@prisma/client';

/** Scalar columns of a persisted `EmployerRegistryRecord` row as serialized to JSON. */
export class EmployerRegistryRecordDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  registryNumber!: string;

  @ApiProperty()
  organizationId!: string;

  @ApiProperty({ type: String, nullable: true })
  jurisdictionId!: string | null;

  @ApiProperty({ type: String, nullable: true })
  institutionId!: string | null;

  @ApiProperty({ type: String, nullable: true })
  masterAdministrativeFileId!: string | null;

  @ApiProperty({ enum: EmployerRegistryStatus })
  registrationStatus!: EmployerRegistryStatus;

  @ApiProperty()
  doesNotSelfAuthorizeWorkers!: boolean;

  @ApiProperty({ enum: LabourDataClassification })
  dataClassification!: LabourDataClassification;

  @ApiProperty({ type: String, format: 'date-time', nullable: true })
  registeredAt!: Date | null;

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt!: Date;

  @ApiProperty({ type: String, format: 'date-time' })
  updatedAt!: Date;
}

/** Scalar columns of a persisted `EmploymentRelationship` row as serialized to JSON. */
export class EmploymentRelationshipRecordDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  relationshipNumber!: string;

  @ApiProperty()
  employerRegistryRecordId!: string;

  @ApiProperty()
  workerProfileReferenceId!: string;

  @ApiProperty({ type: String, nullable: true })
  occupationClassificationId!: string | null;

  @ApiProperty()
  roleTitle!: string;

  @ApiProperty({ enum: EmploymentRelationshipStatus })
  status!: EmploymentRelationshipStatus;

  @ApiProperty({ type: String, format: 'date-time', nullable: true })
  startDate!: Date | null;

  @ApiProperty({ type: String, format: 'date-time', nullable: true })
  endDate!: Date | null;

  @ApiProperty()
  isGovernmentWorkAuthorization!: boolean;

  @ApiProperty({ type: String, nullable: true })
  currentWorkPermitRecordId!: string | null;

  @ApiProperty({ enum: LabourDataClassification })
  dataClassification!: LabourDataClassification;

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt!: Date;

  @ApiProperty({ type: String, format: 'date-time' })
  updatedAt!: Date;
}

/** Scalar columns of a persisted `WorkPermitRecord` row as serialized to JSON. */
export class WorkPermitRecordDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  permitNumber!: string;

  @ApiProperty()
  workerProfileReferenceId!: string;

  @ApiProperty({ type: String, nullable: true })
  employerRegistryRecordId!: string | null;

  @ApiProperty({ type: String, nullable: true })
  workPermitApplicationProfileId!: string | null;

  @ApiProperty({ type: String, nullable: true })
  immigrationProfileId!: string | null;

  @ApiProperty({ type: String, nullable: true })
  linkedResidencyPermitRecordId!: string | null;

  @ApiProperty({ type: String, nullable: true })
  governmentDecisionId!: string | null;

  @ApiProperty({ type: String, nullable: true })
  officialInstrumentId!: string | null;

  @ApiProperty({ enum: WorkPermitLifecycleStatus })
  lifecycleStatus!: WorkPermitLifecycleStatus;

  @ApiProperty()
  doesNotCreateResidency!: boolean;

  @ApiProperty({ type: String, format: 'date-time', nullable: true })
  validFrom!: Date | null;

  @ApiProperty({ type: String, format: 'date-time', nullable: true })
  validUntil!: Date | null;

  @ApiProperty({ type: String, nullable: true })
  renewalOfPermitId!: string | null;

  @ApiProperty({ enum: LabourDataClassification })
  dataClassification!: LabourDataClassification;

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt!: Date;

  @ApiProperty({ type: String, format: 'date-time' })
  updatedAt!: Date;
}

/** Scalar columns of a persisted `WorkPermitApplicationProfile` row as serialized to JSON. */
export class WorkPermitApplicationProfileRecordDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  profileNumber!: string;

  @ApiProperty()
  workerProfileReferenceId!: string;

  @ApiProperty()
  caseId!: string;

  @ApiProperty()
  applicationId!: string;

  @ApiProperty({ type: String, nullable: true })
  immigrationProfileId!: string | null;

  @ApiProperty({ enum: WorkPermitApplicationProfileStatus })
  status!: WorkPermitApplicationProfileStatus;

  @ApiProperty({ type: String, format: 'date-time', nullable: true })
  submissionAcknowledgedAt!: Date | null;

  @ApiProperty()
  doesNotIssueWorkPermit!: boolean;

  @ApiProperty()
  paymentDoesNotApprove!: boolean;

  @ApiProperty({ type: String, nullable: true })
  serviceCategoryCode!: string | null;

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt!: Date;

  @ApiProperty({ type: String, format: 'date-time' })
  updatedAt!: Date;
}

export class CitizenEmploymentRelationshipItemDto extends EmploymentRelationshipRecordDto {
  @ApiProperty({ type: () => EmployerRegistryRecordDto })
  employerRegistryRecord!: EmployerRegistryRecordDto;
}

export class CitizenEmploymentWorkPermitSummaryDto {
  @ApiProperty()
  permitNumber!: string;

  @ApiProperty({ enum: WorkPermitLifecycleStatus })
  lifecycleStatus!: WorkPermitLifecycleStatus;

  @ApiProperty()
  immigrationProfileLinked!: boolean;

  @ApiProperty()
  residencyCoordinationLinked!: boolean;

  @ApiProperty()
  doesNotCreateResidency!: boolean;

  @ApiProperty({ type: String, format: 'date-time', nullable: true })
  validUntil!: Date | null;
}

export class CitizenEmploymentHomeResponseDto {
  @ApiProperty()
  profileReferenceNumber!: string;

  @ApiProperty({ enum: ['NON_PRODUCTION'] })
  ruleEnvironment!: 'NON_PRODUCTION';

  @ApiProperty()
  disclaimer!: string;

  @ApiProperty()
  immigrationCoordinationDisclaimer!: string;

  @ApiProperty()
  activeEmployers!: number;

  @ApiProperty({ type: () => CitizenEmploymentWorkPermitSummaryDto, nullable: true })
  workPermit!: CitizenEmploymentWorkPermitSummaryDto | null;

  @ApiProperty()
  pendingApplications!: number;
}

export class CitizenEmploymentActionItemDto {
  @ApiProperty()
  actionKey!: string;

  @ApiProperty()
  label!: string;

  @ApiProperty()
  available!: boolean;

  @ApiProperty()
  configuredObligation!: boolean;
}

export class CitizenEmploymentActionsResponseDto {
  @ApiProperty()
  disclaimer!: string;

  @ApiProperty({ type: () => [CitizenEmploymentActionItemDto] })
  items!: CitizenEmploymentActionItemDto[];
}
