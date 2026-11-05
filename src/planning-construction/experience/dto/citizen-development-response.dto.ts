import { ApiProperty } from '@nestjs/swagger';
import {
  DevelopmentApplicationStatus,
  DevelopmentCorrectiveActionStatus,
  DevelopmentExternalDependencyStatus,
  DevelopmentFeeStatus,
  DevelopmentInspectionOutcome,
  DevelopmentInspectionStatus,
  DevelopmentOccupancyCertificateStatus,
  DevelopmentPermitStatus,
  DevelopmentPlanningAppealStatus,
  DevelopmentProfessionalRole,
  DevelopmentProjectStatus,
  Prisma,
  ServiceAppointmentStatus,
} from '@prisma/client';

import { jsonValueSchema } from '../../../common/openapi/json-value.schema';

/** Scalar columns of a persisted `DevelopmentProjectSite` row as serialized to JSON. */
export class DevelopmentProjectSiteRecordDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  developmentProjectId!: string;

  @ApiProperty()
  siteLabel!: string;

  @ApiProperty({ type: String, nullable: true })
  addressLine!: string | null;

  @ApiProperty({ type: String, nullable: true })
  parcelReference!: string | null;

  @ApiProperty({ type: Number, nullable: true })
  latitude!: number | null;

  @ApiProperty({ type: Number, nullable: true })
  longitude!: number | null;

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt!: Date;

  @ApiProperty({ type: String, format: 'date-time' })
  updatedAt!: Date;
}

/** Scalar columns of a persisted `DevelopmentApplication` row as serialized to JSON. */
export class DevelopmentApplicationRecordDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  developmentProjectId!: string;

  @ApiProperty()
  applicationReference!: string;

  @ApiProperty()
  serviceCode!: string;

  @ApiProperty()
  serviceName!: string;

  @ApiProperty({ enum: DevelopmentApplicationStatus })
  status!: DevelopmentApplicationStatus;

  @ApiProperty({ type: String, format: 'date-time', nullable: true })
  submittedAt!: Date | null;

  @ApiProperty({ type: String, nullable: true })
  caseId!: string | null;

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt!: Date;

  @ApiProperty({ type: String, format: 'date-time' })
  updatedAt!: Date;
}

/** Scalar columns of a persisted `DevelopmentPermit` row as serialized to JSON. */
export class DevelopmentPermitRecordDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  developmentProjectId!: string;

  @ApiProperty()
  permitNumber!: string;

  @ApiProperty()
  permitType!: string;

  @ApiProperty({ enum: DevelopmentPermitStatus })
  status!: DevelopmentPermitStatus;

  @ApiProperty({ type: String, nullable: true })
  currentVersionId!: string | null;

  @ApiProperty({ type: String, nullable: true })
  issuedByOfficeholderId!: string | null;

  @ApiProperty({ type: String, format: 'date-time', nullable: true })
  issuedAt!: Date | null;

  @ApiProperty({ type: String, format: 'date-time', nullable: true })
  expiresAt!: Date | null;

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt!: Date;

  @ApiProperty({ type: String, format: 'date-time' })
  updatedAt!: Date;
}

/** Scalar columns of a persisted `DevelopmentPermitVersion` row as serialized to JSON. */
export class DevelopmentPermitVersionRecordDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  developmentPermitId!: string;

  @ApiProperty()
  versionNumber!: number;

  @ApiProperty()
  isAmendment!: boolean;

  @ApiProperty({ type: String, nullable: true })
  amendmentSummary!: string | null;

  @ApiProperty({ ...jsonValueSchema() })
  payload!: Prisma.JsonValue;

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt!: Date;

  @ApiProperty({ type: String, format: 'date-time' })
  updatedAt!: Date;
}

/** Scalar columns of a persisted `DevelopmentInspection` row as serialized to JSON. */
export class DevelopmentInspectionRecordDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  developmentProjectId!: string;

  @ApiProperty()
  inspectionReference!: string;

  @ApiProperty()
  inspectionType!: string;

  @ApiProperty({ enum: DevelopmentInspectionStatus })
  status!: DevelopmentInspectionStatus;

  @ApiProperty({ enum: DevelopmentInspectionOutcome, nullable: true })
  outcome!: DevelopmentInspectionOutcome | null;

  @ApiProperty({ type: String, nullable: true })
  failureNotes!: string | null;

  @ApiProperty({ type: String, format: 'date-time', nullable: true })
  outcomeLockedAt!: Date | null;

  @ApiProperty({ type: String, format: 'date-time', nullable: true })
  scheduledAt!: Date | null;

  @ApiProperty({ type: String, format: 'date-time', nullable: true })
  completedAt!: Date | null;

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt!: Date;

  @ApiProperty({ type: String, format: 'date-time' })
  updatedAt!: Date;
}

/** Scalar columns of a persisted `DevelopmentCorrectiveAction` row as serialized to JSON. */
export class DevelopmentCorrectiveActionRecordDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  developmentProjectId!: string;

  @ApiProperty({ type: String, nullable: true })
  developmentInspectionId!: string | null;

  @ApiProperty()
  actionReference!: string;

  @ApiProperty()
  description!: string;

  @ApiProperty({ enum: DevelopmentCorrectiveActionStatus })
  status!: DevelopmentCorrectiveActionStatus;

  @ApiProperty({ type: String, format: 'date-time', nullable: true })
  submittedAt!: Date | null;

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt!: Date;

  @ApiProperty({ type: String, format: 'date-time' })
  updatedAt!: Date;
}

/** Scalar columns of a persisted `DevelopmentExternalDependency` row as serialized to JSON. */
export class DevelopmentExternalDependencyRecordDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  developmentProjectId!: string;

  @ApiProperty()
  dependencyCode!: string;

  @ApiProperty()
  dependencyLabel!: string;

  @ApiProperty({ enum: DevelopmentExternalDependencyStatus })
  status!: DevelopmentExternalDependencyStatus;

  @ApiProperty()
  blocksPermitDecision!: boolean;

  @ApiProperty({ type: String, nullable: true })
  externalAuthorityReference!: string | null;

  @ApiProperty({ type: String, format: 'date-time', nullable: true })
  resolvedAt!: Date | null;

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt!: Date;

  @ApiProperty({ type: String, format: 'date-time' })
  updatedAt!: Date;
}

/** Scalar columns of a persisted `DevelopmentProjectFee` row as serialized to JSON. */
export class DevelopmentProjectFeeRecordDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  developmentProjectId!: string;

  @ApiProperty()
  feeCode!: string;

  @ApiProperty()
  label!: string;

  @ApiProperty()
  amountCents!: number;

  @ApiProperty()
  currency!: string;

  @ApiProperty({ enum: DevelopmentFeeStatus })
  status!: DevelopmentFeeStatus;

  @ApiProperty({ type: String, format: 'date-time', nullable: true })
  paidAt!: Date | null;

  @ApiProperty({ type: String, nullable: true })
  paymentTransactionId!: string | null;

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt!: Date;

  @ApiProperty({ type: String, format: 'date-time' })
  updatedAt!: Date;
}

/** Scalar columns of a persisted `DevelopmentOccupancyCertificate` row as serialized to JSON. */
export class DevelopmentOccupancyCertificateRecordDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  developmentProjectId!: string;

  @ApiProperty()
  certificateReference!: string;

  @ApiProperty({ enum: DevelopmentOccupancyCertificateStatus })
  status!: DevelopmentOccupancyCertificateStatus;

  @ApiProperty({ type: String, nullable: true })
  governmentDecisionId!: string | null;

  @ApiProperty({ type: String, nullable: true })
  issuedByOfficeholderId!: string | null;

  @ApiProperty({ type: String, format: 'date-time', nullable: true })
  issuedAt!: Date | null;

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt!: Date;

  @ApiProperty({ type: String, format: 'date-time' })
  updatedAt!: Date;
}

/** Scalar columns of a persisted `DevelopmentPlanningAppeal` row as serialized to JSON. */
export class DevelopmentPlanningAppealRecordDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  developmentProjectId!: string;

  @ApiProperty()
  appealReference!: string;

  @ApiProperty({ enum: DevelopmentPlanningAppealStatus })
  status!: DevelopmentPlanningAppealStatus;

  @ApiProperty()
  groundsSummary!: string;

  @ApiProperty({ type: String, format: 'date-time' })
  filedAt!: Date;

  @ApiProperty({ type: String, format: 'date-time', nullable: true })
  decidedAt!: Date | null;

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt!: Date;

  @ApiProperty({ type: String, format: 'date-time' })
  updatedAt!: Date;
}

export class DevelopmentPermitWithVersionDto extends DevelopmentPermitRecordDto {
  @ApiProperty({ type: () => DevelopmentPermitVersionRecordDto, nullable: true })
  currentVersion!: DevelopmentPermitVersionRecordDto | null;
}

export class CitizenDevelopmentProjectListItemDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  projectReference!: string;

  @ApiProperty()
  title!: string;

  @ApiProperty({ enum: DevelopmentProjectStatus })
  status!: DevelopmentProjectStatus;

  @ApiProperty({ type: String, nullable: true })
  siteLabel!: string | null;
}

export class CitizenDevelopmentProjectsResponseDto {
  @ApiProperty({ type: () => [CitizenDevelopmentProjectListItemDto] })
  items!: CitizenDevelopmentProjectListItemDto[];
}

export class DevelopmentPortalProjectSummaryDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  projectReference!: string;

  @ApiProperty()
  title!: string;

  @ApiProperty({ enum: DevelopmentProjectStatus })
  status!: DevelopmentProjectStatus;
}

export class DevelopmentPortalPermitStatusDto {
  @ApiProperty()
  permitId!: string;

  @ApiProperty()
  permitNumber!: string;

  @ApiProperty({ enum: DevelopmentPermitStatus })
  status!: DevelopmentPermitStatus;

  @ApiProperty({ type: Number, nullable: true })
  currentVersionNumber!: number | null;
}

export class DevelopmentPortalProfessionalDto {
  @ApiProperty()
  professionalId!: string;

  @ApiProperty()
  identityId!: string;

  @ApiProperty({ enum: DevelopmentProfessionalRole })
  role!: DevelopmentProfessionalRole;

  @ApiProperty({ type: String, nullable: true })
  registrationReference!: string | null;
}

export class DevelopmentPortalAppointmentDto {
  @ApiProperty()
  appointmentId!: string;

  @ApiProperty({ type: String, nullable: true })
  scheduledStartAt!: string | null;

  @ApiProperty({ enum: ServiceAppointmentStatus })
  status!: ServiceAppointmentStatus;
}

export class DevelopmentPortalOccupancyStatusDto {
  @ApiProperty({ enum: DevelopmentOccupancyCertificateStatus })
  latestCertificateStatus!: DevelopmentOccupancyCertificateStatus;

  @ApiProperty({ type: () => [DevelopmentOccupancyCertificateRecordDto] })
  certificates!: DevelopmentOccupancyCertificateRecordDto[];
}

export class DevelopmentPortalDeadlineDto {
  @ApiProperty()
  applicationReference!: string;

  @ApiProperty({ type: String, nullable: true })
  submittedAt!: string | null;

  @ApiProperty({ type: String, nullable: true })
  indicativeReviewDeadline!: string | null;
}

/** Unified development portal view built by DevelopmentPortalProjectionService. */
export class DevelopmentProjectPortalViewDto {
  @ApiProperty()
  disclaimer!: string;

  @ApiProperty({ enum: ['NON_PRODUCTION'] })
  ruleEnvironment!: 'NON_PRODUCTION';

  @ApiProperty({ type: () => DevelopmentPortalProjectSummaryDto })
  project!: DevelopmentPortalProjectSummaryDto;

  @ApiProperty({ type: () => DevelopmentProjectSiteRecordDto, nullable: true })
  propertySite!: DevelopmentProjectSiteRecordDto | null;

  @ApiProperty({ type: () => [DevelopmentApplicationRecordDto] })
  submittedApplications!: DevelopmentApplicationRecordDto[];

  @ApiProperty({ type: () => [DevelopmentPermitWithVersionDto] })
  permits!: DevelopmentPermitWithVersionDto[];

  @ApiProperty({ type: () => [DevelopmentPortalPermitStatusDto] })
  permitStatusSummary!: DevelopmentPortalPermitStatusDto[];

  @ApiProperty()
  evidenceOutstandingCount!: number;

  @ApiProperty({ type: () => [DevelopmentPortalProfessionalDto] })
  professionals!: DevelopmentPortalProfessionalDto[];

  @ApiProperty({ type: () => [DevelopmentExternalDependencyRecordDto] })
  externalDependencies!: DevelopmentExternalDependencyRecordDto[];

  @ApiProperty({ type: () => [DevelopmentInspectionRecordDto] })
  inspections!: DevelopmentInspectionRecordDto[];

  @ApiProperty({ type: () => [DevelopmentCorrectiveActionRecordDto] })
  correctiveActions!: DevelopmentCorrectiveActionRecordDto[];

  @ApiProperty({ type: () => [DevelopmentProjectFeeRecordDto] })
  outstandingFees!: DevelopmentProjectFeeRecordDto[];

  @ApiProperty({ type: () => [DevelopmentPortalAppointmentDto] })
  upcomingAppointments!: DevelopmentPortalAppointmentDto[];

  @ApiProperty({ type: () => DevelopmentPortalOccupancyStatusDto })
  completionOccupancyStatus!: DevelopmentPortalOccupancyStatusDto;

  @ApiProperty({ type: () => [DevelopmentPlanningAppealRecordDto] })
  appeals!: DevelopmentPlanningAppealRecordDto[];

  @ApiProperty({ type: () => [DevelopmentPortalDeadlineDto] })
  deadlines!: DevelopmentPortalDeadlineDto[];

  @ApiProperty()
  openInspections!: number;
}

export class CitizenDevelopmentActionItemDto {
  @ApiProperty()
  projectId!: string;

  @ApiProperty()
  projectReference!: string;

  @ApiProperty({ description: 'Number of outstanding fees on the project' })
  outstandingFees!: number;

  @ApiProperty()
  evidenceOutstandingCount!: number;

  @ApiProperty()
  openInspections!: number;

  @ApiProperty({ type: () => [DevelopmentCorrectiveActionRecordDto] })
  correctiveActions!: DevelopmentCorrectiveActionRecordDto[];
}

export class CitizenDevelopmentActionsResponseDto {
  @ApiProperty({ type: () => [CitizenDevelopmentActionItemDto] })
  items!: CitizenDevelopmentActionItemDto[];
}
