import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  HealthcareAppointmentPrivacyClassification,
  ServiceAppointmentStatus,
  TreatmentAdministrativeEligibilityOutcome,
  TreatmentApplicationStatus,
  TreatmentEnrollmentStatus,
  TreatmentProgramKind,
  TreatmentProgramLifecycleStatus,
  TreatmentProgramProviderRole,
  TreatmentReferralStatus,
  TreatmentScreeningStatus,
} from '@prisma/client';

/*
 * Patient-safe healthcare projections. Clinical notes and findings are stripped by
 * TreatmentExperienceBoundaryService.sanitizeCitizenPayload before serialization and are
 * intentionally absent from these contracts.
 */

export class CitizenTreatmentApplicationItemDto {
  @ApiProperty()
  applicationNumber!: string;

  @ApiProperty({ enum: TreatmentApplicationStatus })
  status!: TreatmentApplicationStatus;

  @ApiProperty()
  programCode!: string;

  @ApiProperty()
  programName!: string;

  @ApiProperty()
  notTreatmentAuthorization!: boolean;

  @ApiProperty({ enum: TreatmentAdministrativeEligibilityOutcome })
  administrativeEligibilityOutcome!: TreatmentAdministrativeEligibilityOutcome;

  @ApiProperty({ type: String, nullable: true })
  consentReference!: string | null;
}

export class CitizenTreatmentReferralItemDto {
  @ApiProperty()
  referralNumber!: string;

  @ApiProperty({ enum: TreatmentReferralStatus })
  status!: TreatmentReferralStatus;

  @ApiProperty()
  programCode!: string;

  @ApiProperty()
  notGuaranteedEnrollment!: boolean;

  @ApiProperty()
  notEnrollment!: boolean;
}

export class CitizenTreatmentReferralsResponseDto {
  @ApiProperty({ type: () => [CitizenTreatmentReferralItemDto] })
  items!: CitizenTreatmentReferralItemDto[];
}

export class CitizenTreatmentScreeningItemDto {
  @ApiProperty()
  screeningNumber!: string;

  @ApiProperty({ enum: TreatmentScreeningStatus })
  status!: TreatmentScreeningStatus;

  @ApiProperty({ type: String, format: 'date-time', nullable: true })
  scheduledAt!: Date | null;

  @ApiProperty({ type: String, nullable: true })
  summary!: string | null;
}

export class CitizenTreatmentEnrollmentItemDto {
  @ApiProperty()
  enrollmentNumber!: string;

  @ApiProperty({ enum: TreatmentEnrollmentStatus })
  status!: TreatmentEnrollmentStatus;

  @ApiProperty()
  programCode!: string;

  @ApiProperty()
  programName!: string;

  @ApiPropertyOptional({ description: 'Omitted when no status projection exists' })
  publicStatusLabel?: string;

  @ApiProperty()
  trialOpportunitySeparate!: boolean;

  @ApiProperty()
  notClinicalOutcome!: boolean;
}

export class CitizenHealthcareHomeResponseDto {
  @ApiProperty()
  disclaimer!: string;

  @ApiProperty({ type: () => [CitizenTreatmentApplicationItemDto] })
  applications!: CitizenTreatmentApplicationItemDto[];

  @ApiProperty({ type: () => [CitizenTreatmentReferralItemDto] })
  referrals!: CitizenTreatmentReferralItemDto[];

  @ApiProperty({ type: () => [CitizenTreatmentScreeningItemDto] })
  screenings!: CitizenTreatmentScreeningItemDto[];

  @ApiProperty({ type: () => [CitizenTreatmentEnrollmentItemDto] })
  enrolledPrograms!: CitizenTreatmentEnrollmentItemDto[];

  @ApiProperty({ type: [String] })
  requiredActions!: string[];

  @ApiProperty()
  consentState!: string;

  @ApiProperty({ type: () => [CitizenTreatmentEnrollmentItemDto] })
  trialOpportunities!: CitizenTreatmentEnrollmentItemDto[];
}

export class CitizenHealthcareProfileResponseDto {
  @ApiPropertyOptional({ description: 'Omitted when the citizen has no healthcare profile' })
  profileNumber?: string;

  @ApiPropertyOptional()
  publicStatusLabel?: string;

  @ApiPropertyOptional({ type: String, nullable: true })
  publicMessage?: string | null;

  @ApiPropertyOptional({ type: String, nullable: true })
  consentStateCode?: string | null;

  @ApiProperty()
  disclaimer!: string;
}

export class CitizenHealthcareProviderItemDto {
  @ApiProperty()
  programCode!: string;

  @ApiProperty({ type: String, nullable: true })
  providerOrganizationId!: string | null;

  @ApiProperty({ type: String, nullable: true })
  providerIdentityId!: string | null;

  @ApiProperty({ enum: TreatmentProgramProviderRole })
  providerRole!: TreatmentProgramProviderRole;
}

export class CitizenHealthcareProvidersResponseDto {
  @ApiProperty({ type: () => [CitizenHealthcareProviderItemDto] })
  items!: CitizenHealthcareProviderItemDto[];

  @ApiProperty()
  disclaimer!: string;
}

export class CitizenTreatmentProgramItemDto {
  @ApiProperty()
  programCode!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty({ type: String, nullable: true })
  description!: string | null;

  @ApiProperty({ enum: TreatmentProgramKind })
  programKind!: TreatmentProgramKind;

  @ApiProperty({ enum: TreatmentProgramLifecycleStatus })
  lifecycleStatus!: TreatmentProgramLifecycleStatus;

  @ApiProperty()
  doesNotRecommendTreatment!: boolean;

  @ApiProperty()
  isDiscoveryOnly!: boolean;

  @ApiProperty()
  discoveryOnly!: boolean;

  @ApiProperty()
  notMedicalRecommendation!: boolean;
}

export class CitizenTreatmentProgramsResponseDto {
  @ApiProperty({ type: () => [CitizenTreatmentProgramItemDto] })
  items!: CitizenTreatmentProgramItemDto[];

  @ApiProperty()
  disclaimer!: string;
}

export class CitizenTreatmentsResponseDto {
  @ApiProperty({ type: () => [CitizenTreatmentScreeningItemDto] })
  screenings!: CitizenTreatmentScreeningItemDto[];

  @ApiProperty({ type: () => [CitizenTreatmentEnrollmentItemDto] })
  enrollments!: CitizenTreatmentEnrollmentItemDto[];

  @ApiProperty({ type: () => [CitizenTreatmentEnrollmentItemDto] })
  trialOpportunities!: CitizenTreatmentEnrollmentItemDto[];
}

export class CitizenHealthcareAppointmentItemDto {
  @ApiProperty()
  appointmentReference!: string;

  @ApiProperty({ enum: ServiceAppointmentStatus })
  status!: ServiceAppointmentStatus;

  @ApiProperty({ type: String, format: 'date-time', nullable: true })
  scheduledStartsAt!: Date | null;

  @ApiProperty({ enum: HealthcareAppointmentPrivacyClassification })
  privacyClassification!: HealthcareAppointmentPrivacyClassification;

  @ApiProperty({ type: String, nullable: true })
  patientSafeLabel!: string | null;

  @ApiProperty()
  enrollmentNumber!: string;

  @ApiProperty()
  programCode!: string;
}

export class CitizenHealthcareAppointmentsResponseDto {
  @ApiProperty({ type: () => [CitizenHealthcareAppointmentItemDto] })
  items!: CitizenHealthcareAppointmentItemDto[];

  @ApiProperty()
  disclaimer!: string;
}

export class CitizenHealthcareActionsResponseDto {
  @ApiProperty({ type: [String], description: 'Required patient action codes' })
  items!: string[];

  @ApiProperty()
  consentState!: string;
}
