-- CreateEnum
CREATE TYPE "HealthcareDataClassification" AS ENUM ('PUBLIC_PROGRAM_DISCOVERY', 'PATIENT_SELF', 'CARE_TEAM', 'CLINICAL_RESTRICTED', 'GOVERNMENT_RESTRICTED');

-- CreateEnum
CREATE TYPE "TreatmentProgramKind" AS ENUM ('GOVERNMENT', 'SPECIALIST', 'REFERRAL', 'ELECTIVE', 'SUBSIDIZED', 'PUBLIC_HEALTH', 'MEDICAL_ASSISTANCE');

-- CreateEnum
CREATE TYPE "TreatmentProgramLifecycleStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'SUSPENDED', 'RETIRED');

-- CreateEnum
CREATE TYPE "TreatmentApplicationStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'UNDER_ADMIN_REVIEW', 'PENDING_CLINICAL_REVIEW', 'CLOSED', 'WITHDRAWN');

-- CreateEnum
CREATE TYPE "TreatmentReferralStatus" AS ENUM ('REQUESTED', 'SENT', 'RECEIVED', 'DECLINED', 'WITHDRAWN');

-- CreateEnum
CREATE TYPE "TreatmentScreeningStatus" AS ENUM ('SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "TreatmentEligibilityReviewStatus" AS ENUM ('DRAFT', 'FINALIZED');

-- CreateEnum
CREATE TYPE "ClinicalSuitabilityOutcome" AS ENUM ('PENDING', 'CLINICALLY_SUITABLE', 'NOT_CLINICALLY_SUITABLE', 'DEFERRED');

-- CreateEnum
CREATE TYPE "TreatmentAdministrativeEligibilityOutcome" AS ENUM ('NOT_EVALUATED', 'ADMINISTRATIVELY_ELIGIBLE', 'ADMINISTRATIVELY_INELIGIBLE', 'DEFERRED');

-- CreateEnum
CREATE TYPE "TreatmentEnrollmentStatus" AS ENUM ('PROPOSED', 'ACTIVE', 'SUSPENDED', 'COMPLETED', 'WITHDRAWN', 'TERMINATED');

-- CreateEnum
CREATE TYPE "HealthcareActorPersona" AS ENUM ('PATIENT', 'PROVIDER', 'CLINICAL_PROFESSIONAL', 'GOVERNMENT_OFFICIAL', 'AI_ASSISTANCE', 'PAYMENT_SYSTEM', 'PLATFORM_ADMIN');

-- CreateEnum
CREATE TYPE "HealthcareAppointmentPrivacyClassification" AS ENUM ('STANDARD', 'SENSITIVE', 'HIGHLY_CONFIDENTIAL');

-- CreateEnum
CREATE TYPE "TreatmentProgramAuthorizationKind" AS ENUM ('ADMINISTRATIVE', 'FUNDING', 'OPERATIONAL');

-- CreateEnum
CREATE TYPE "TreatmentExternalDependencyRecordedBy" AS ENUM ('SYSTEM', 'INSTITUTION', 'EXTERNAL_AUTHORITY', 'PROVIDER');

-- CreateEnum
CREATE TYPE "TreatmentProgramProviderRole" AS ENUM ('PRIMARY', 'SPECIALIST', 'REFERRAL_PARTNER', 'SITE_OPERATOR');

-- CreateTable
CREATE TABLE "treatment_referral_sources" (
    "id" UUID NOT NULL,
    "sourceCode" TEXT NOT NULL,
    "sourceLabel" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "treatment_referral_sources_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "patient_healthcare_profiles" (
    "id" UUID NOT NULL,
    "profileNumber" TEXT NOT NULL,
    "subjectIdentityId" UUID NOT NULL,
    "jurisdictionId" UUID,
    "masterAdministrativeFileId" UUID,
    "dataClassification" "HealthcareDataClassification" NOT NULL DEFAULT 'PATIENT_SELF',
    "currentStatusProjectionId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "patient_healthcare_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "treatment_programs" (
    "id" UUID NOT NULL,
    "programCode" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "programKind" "TreatmentProgramKind" NOT NULL,
    "lifecycleStatus" "TreatmentProgramLifecycleStatus" NOT NULL DEFAULT 'DRAFT',
    "institutionId" UUID NOT NULL,
    "jurisdictionId" UUID,
    "blocksNewEnrollmentWhenSuspended" BOOLEAN NOT NULL DEFAULT true,
    "isDiscoveryOnly" BOOLEAN NOT NULL DEFAULT true,
    "doesNotRecommendTreatment" BOOLEAN NOT NULL DEFAULT true,
    "currentVersionId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "treatment_programs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "treatment_program_versions" (
    "id" UUID NOT NULL,
    "treatmentProgramId" UUID NOT NULL,
    "versionNumber" INTEGER NOT NULL,
    "protocolSummary" TEXT,
    "effectiveFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "effectiveUntil" TIMESTAMP(3),
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "treatment_program_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "treatment_program_providers" (
    "id" UUID NOT NULL,
    "treatmentProgramId" UUID NOT NULL,
    "providerOrganizationId" UUID,
    "providerIdentityId" UUID,
    "providerRole" "TreatmentProgramProviderRole" NOT NULL DEFAULT 'PRIMARY',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "treatment_program_providers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "treatment_program_sites" (
    "id" UUID NOT NULL,
    "treatmentProgramId" UUID NOT NULL,
    "institutionId" UUID NOT NULL,
    "siteCode" TEXT NOT NULL,
    "siteName" TEXT NOT NULL,
    "capacityReference" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "treatment_program_sites_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "treatment_program_condition_references" (
    "id" UUID NOT NULL,
    "treatmentProgramId" UUID NOT NULL,
    "conditionCode" TEXT NOT NULL,
    "conditionLabel" TEXT NOT NULL,
    "referenceUri" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "treatment_program_condition_references_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "treatment_program_eligibility_criteria" (
    "id" UUID NOT NULL,
    "treatmentProgramId" UUID NOT NULL,
    "criterionCode" TEXT NOT NULL,
    "criterionLabel" TEXT NOT NULL,
    "isAdministrativeOnly" BOOLEAN NOT NULL DEFAULT true,
    "isClinicalDetermination" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "treatment_program_eligibility_criteria_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "treatment_applications" (
    "id" UUID NOT NULL,
    "applicationNumber" TEXT NOT NULL,
    "patientHealthcareProfileId" UUID NOT NULL,
    "patientIdentityId" UUID NOT NULL,
    "treatmentProgramId" UUID NOT NULL,
    "treatmentProgramVersionId" UUID,
    "caseId" UUID NOT NULL,
    "applicationId" UUID NOT NULL,
    "status" "TreatmentApplicationStatus" NOT NULL DEFAULT 'DRAFT',
    "administrativeEligibilityOutcome" "TreatmentAdministrativeEligibilityOutcome" NOT NULL DEFAULT 'NOT_EVALUATED',
    "doesNotAuthorizeTreatment" BOOLEAN NOT NULL DEFAULT true,
    "doesNotEqualClinicalSuitability" BOOLEAN NOT NULL DEFAULT true,
    "consentReference" TEXT,
    "submittedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "treatment_applications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "treatment_referrals" (
    "id" UUID NOT NULL,
    "referralNumber" TEXT NOT NULL,
    "patientHealthcareProfileId" UUID NOT NULL,
    "patientIdentityId" UUID NOT NULL,
    "treatmentProgramId" UUID NOT NULL,
    "treatmentApplicationId" UUID,
    "caseId" UUID,
    "referralSourceId" UUID,
    "referrerIdentityId" UUID,
    "status" "TreatmentReferralStatus" NOT NULL DEFAULT 'REQUESTED',
    "doesNotGuaranteeEnrollment" BOOLEAN NOT NULL DEFAULT true,
    "doesNotEqualEnrollment" BOOLEAN NOT NULL DEFAULT true,
    "receivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "treatment_referrals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "treatment_screenings" (
    "id" UUID NOT NULL,
    "screeningNumber" TEXT NOT NULL,
    "patientHealthcareProfileId" UUID NOT NULL,
    "patientIdentityId" UUID NOT NULL,
    "treatmentApplicationId" UUID,
    "treatmentReferralId" UUID,
    "caseId" UUID,
    "status" "TreatmentScreeningStatus" NOT NULL DEFAULT 'SCHEDULED',
    "scheduledAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "patientSafeSummary" TEXT,
    "dataClassification" "HealthcareDataClassification" NOT NULL DEFAULT 'PATIENT_SELF',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "treatment_screenings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "treatment_eligibility_reviews" (
    "id" UUID NOT NULL,
    "reviewNumber" TEXT NOT NULL,
    "treatmentApplicationId" UUID NOT NULL,
    "treatmentScreeningId" UUID,
    "caseId" UUID NOT NULL,
    "treatmentProgramVersionId" UUID NOT NULL,
    "professionalIdentityId" UUID NOT NULL,
    "professionalLicenseNumber" TEXT NOT NULL,
    "professionalLicenseAuthorityCode" TEXT NOT NULL,
    "professionalLicenseValidUntil" TIMESTAMP(3) NOT NULL,
    "reviewStatus" "TreatmentEligibilityReviewStatus" NOT NULL DEFAULT 'DRAFT',
    "clinicalSuitabilityOutcome" "ClinicalSuitabilityOutcome" NOT NULL DEFAULT 'PENDING',
    "decisionBasisEvidenceReference" TEXT,
    "finalizedAt" TIMESTAMP(3),
    "requiresProfessionalJudgment" BOOLEAN NOT NULL DEFAULT true,
    "doesNotSubstituteGovernmentAuthority" BOOLEAN NOT NULL DEFAULT true,
    "governmentAdministrativeEvaluationId" UUID,
    "dataClassification" "HealthcareDataClassification" NOT NULL DEFAULT 'CLINICAL_RESTRICTED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "treatment_eligibility_reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "treatment_enrollments" (
    "id" UUID NOT NULL,
    "enrollmentNumber" TEXT NOT NULL,
    "patientHealthcareProfileId" UUID NOT NULL,
    "patientIdentityId" UUID NOT NULL,
    "treatmentProgramId" UUID NOT NULL,
    "treatmentProgramVersionId" UUID NOT NULL,
    "treatmentApplicationId" UUID,
    "treatmentReferralId" UUID,
    "treatmentEligibilityReviewId" UUID,
    "treatmentProgramSiteId" UUID,
    "status" "TreatmentEnrollmentStatus" NOT NULL DEFAULT 'PROPOSED',
    "currentStatusHistoryId" UUID,
    "doesNotEqualClinicalOutcome" BOOLEAN NOT NULL DEFAULT true,
    "enrolledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "treatment_enrollments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "treatment_enrollment_status_history" (
    "id" UUID NOT NULL,
    "treatmentEnrollmentId" UUID NOT NULL,
    "fromStatus" "TreatmentEnrollmentStatus",
    "toStatus" "TreatmentEnrollmentStatus" NOT NULL,
    "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actorIdentityId" UUID,
    "actorPersona" "HealthcareActorPersona",
    "reasonSummary" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "treatment_enrollment_status_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "treatment_appointment_references" (
    "id" UUID NOT NULL,
    "treatmentEnrollmentId" UUID NOT NULL,
    "serviceAppointmentId" UUID NOT NULL,
    "privacyClassification" "HealthcareAppointmentPrivacyClassification" NOT NULL DEFAULT 'STANDARD',
    "patientSafeLabel" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "treatment_appointment_references_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "treatment_care_team_references" (
    "id" UUID NOT NULL,
    "treatmentEnrollmentId" UUID NOT NULL,
    "memberIdentityId" UUID NOT NULL,
    "roleCode" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "treatment_care_team_references_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "treatment_program_authorizations" (
    "id" UUID NOT NULL,
    "authorizationNumber" TEXT NOT NULL,
    "treatmentProgramId" UUID NOT NULL,
    "treatmentProgramVersionId" UUID,
    "authorizationKind" "TreatmentProgramAuthorizationKind" NOT NULL,
    "governmentDecisionId" UUID,
    "isAdministrativeOnly" BOOLEAN NOT NULL DEFAULT true,
    "doesNotAuthorizeClinicalCare" BOOLEAN NOT NULL DEFAULT true,
    "recordedByIdentityId" UUID,
    "effectiveFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "effectiveUntil" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "treatment_program_authorizations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "treatment_program_external_dependencies" (
    "id" UUID NOT NULL,
    "treatmentProgramId" UUID NOT NULL,
    "externalAuthorityId" UUID,
    "dependencyTypeCode" TEXT NOT NULL,
    "isRequired" BOOLEAN NOT NULL DEFAULT false,
    "blocksEnrollmentWhenRequired" BOOLEAN NOT NULL DEFAULT false,
    "isAuthenticated" BOOLEAN NOT NULL DEFAULT false,
    "authenticatedPayloadHash" TEXT,
    "recordedBy" "TreatmentExternalDependencyRecordedBy" NOT NULL,
    "recordedByIdentityId" UUID,
    "resolutionStatusCode" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "treatment_program_external_dependencies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "patient_treatment_status_projections" (
    "id" UUID NOT NULL,
    "patientHealthcareProfileId" UUID NOT NULL,
    "treatmentEnrollmentId" UUID,
    "publicStatusLabel" TEXT NOT NULL,
    "publicMessage" TEXT,
    "consentStateCode" TEXT,
    "requiresPatientAction" BOOLEAN NOT NULL DEFAULT false,
    "trialOpportunitySeparate" BOOLEAN NOT NULL DEFAULT true,
    "dataClassification" "HealthcareDataClassification" NOT NULL DEFAULT 'PATIENT_SELF',
    "effectiveFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "effectiveUntil" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "patient_treatment_status_projections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "healthcare_data_access_policies" (
    "id" UUID NOT NULL,
    "policyReference" TEXT NOT NULL,
    "patientHealthcareProfileId" UUID NOT NULL,
    "patientSubjectIdentityId" UUID NOT NULL,
    "granteeProviderIdentityId" UUID,
    "granteeOrganizationId" UUID,
    "authorizedScopeCode" TEXT NOT NULL,
    "authorizedDataCategories" JSONB NOT NULL DEFAULT '[]',
    "effectiveFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "effectiveUntil" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "healthcare_data_access_policies_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "treatment_referral_sources_sourceCode_key" ON "treatment_referral_sources"("sourceCode");

-- CreateIndex
CREATE UNIQUE INDEX "patient_healthcare_profiles_profileNumber_key" ON "patient_healthcare_profiles"("profileNumber");

-- CreateIndex
CREATE UNIQUE INDEX "patient_healthcare_profiles_currentStatusProjectionId_key" ON "patient_healthcare_profiles"("currentStatusProjectionId");

-- CreateIndex
CREATE INDEX "patient_healthcare_profiles_subjectIdentityId_idx" ON "patient_healthcare_profiles"("subjectIdentityId");

-- CreateIndex
CREATE INDEX "patient_healthcare_profiles_jurisdictionId_idx" ON "patient_healthcare_profiles"("jurisdictionId");

-- CreateIndex
CREATE UNIQUE INDEX "treatment_programs_programCode_key" ON "treatment_programs"("programCode");

-- CreateIndex
CREATE UNIQUE INDEX "treatment_programs_currentVersionId_key" ON "treatment_programs"("currentVersionId");

-- CreateIndex
CREATE INDEX "treatment_programs_institutionId_idx" ON "treatment_programs"("institutionId");

-- CreateIndex
CREATE INDEX "treatment_programs_lifecycleStatus_idx" ON "treatment_programs"("lifecycleStatus");

-- CreateIndex
CREATE INDEX "treatment_programs_programKind_idx" ON "treatment_programs"("programKind");

-- CreateIndex
CREATE UNIQUE INDEX "treatment_program_versions_treatmentProgramId_versionNumber_key" ON "treatment_program_versions"("treatmentProgramId", "versionNumber");

-- CreateIndex
CREATE INDEX "treatment_program_versions_treatmentProgramId_idx" ON "treatment_program_versions"("treatmentProgramId");

-- CreateIndex
CREATE INDEX "treatment_program_providers_treatmentProgramId_idx" ON "treatment_program_providers"("treatmentProgramId");

-- CreateIndex
CREATE INDEX "treatment_program_providers_providerOrganizationId_idx" ON "treatment_program_providers"("providerOrganizationId");

-- CreateIndex
CREATE INDEX "treatment_program_providers_providerIdentityId_idx" ON "treatment_program_providers"("providerIdentityId");

-- CreateIndex
CREATE UNIQUE INDEX "treatment_program_sites_treatmentProgramId_siteCode_key" ON "treatment_program_sites"("treatmentProgramId", "siteCode");

-- CreateIndex
CREATE INDEX "treatment_program_sites_institutionId_idx" ON "treatment_program_sites"("institutionId");

-- CreateIndex
CREATE INDEX "treatment_program_condition_references_treatmentProgramId_idx" ON "treatment_program_condition_references"("treatmentProgramId");

-- CreateIndex
CREATE UNIQUE INDEX "treatment_program_eligibility_criteria_treatmentProgramId_criterionCode_key" ON "treatment_program_eligibility_criteria"("treatmentProgramId", "criterionCode");

-- CreateIndex
CREATE UNIQUE INDEX "treatment_applications_applicationNumber_key" ON "treatment_applications"("applicationNumber");

-- CreateIndex
CREATE UNIQUE INDEX "treatment_applications_caseId_key" ON "treatment_applications"("caseId");

-- CreateIndex
CREATE UNIQUE INDEX "treatment_applications_applicationId_key" ON "treatment_applications"("applicationId");

-- CreateIndex
CREATE INDEX "treatment_applications_patientHealthcareProfileId_idx" ON "treatment_applications"("patientHealthcareProfileId");

-- CreateIndex
CREATE INDEX "treatment_applications_patientIdentityId_idx" ON "treatment_applications"("patientIdentityId");

-- CreateIndex
CREATE INDEX "treatment_applications_treatmentProgramId_idx" ON "treatment_applications"("treatmentProgramId");

-- CreateIndex
CREATE INDEX "treatment_applications_status_idx" ON "treatment_applications"("status");

-- CreateIndex
CREATE UNIQUE INDEX "treatment_referrals_referralNumber_key" ON "treatment_referrals"("referralNumber");

-- CreateIndex
CREATE INDEX "treatment_referrals_patientHealthcareProfileId_idx" ON "treatment_referrals"("patientHealthcareProfileId");

-- CreateIndex
CREATE INDEX "treatment_referrals_patientIdentityId_idx" ON "treatment_referrals"("patientIdentityId");

-- CreateIndex
CREATE INDEX "treatment_referrals_treatmentProgramId_idx" ON "treatment_referrals"("treatmentProgramId");

-- CreateIndex
CREATE INDEX "treatment_referrals_status_idx" ON "treatment_referrals"("status");

-- CreateIndex
CREATE UNIQUE INDEX "treatment_screenings_screeningNumber_key" ON "treatment_screenings"("screeningNumber");

-- CreateIndex
CREATE INDEX "treatment_screenings_patientHealthcareProfileId_idx" ON "treatment_screenings"("patientHealthcareProfileId");

-- CreateIndex
CREATE INDEX "treatment_screenings_patientIdentityId_idx" ON "treatment_screenings"("patientIdentityId");

-- CreateIndex
CREATE INDEX "treatment_screenings_status_idx" ON "treatment_screenings"("status");

-- CreateIndex
CREATE UNIQUE INDEX "treatment_eligibility_reviews_reviewNumber_key" ON "treatment_eligibility_reviews"("reviewNumber");

-- CreateIndex
CREATE INDEX "treatment_eligibility_reviews_treatmentApplicationId_idx" ON "treatment_eligibility_reviews"("treatmentApplicationId");

-- CreateIndex
CREATE INDEX "treatment_eligibility_reviews_professionalIdentityId_idx" ON "treatment_eligibility_reviews"("professionalIdentityId");

-- CreateIndex
CREATE INDEX "treatment_eligibility_reviews_reviewStatus_idx" ON "treatment_eligibility_reviews"("reviewStatus");

-- CreateIndex
CREATE UNIQUE INDEX "treatment_enrollments_enrollmentNumber_key" ON "treatment_enrollments"("enrollmentNumber");

-- CreateIndex
CREATE UNIQUE INDEX "treatment_enrollments_currentStatusHistoryId_key" ON "treatment_enrollments"("currentStatusHistoryId");

-- CreateIndex
CREATE INDEX "treatment_enrollments_patientHealthcareProfileId_idx" ON "treatment_enrollments"("patientHealthcareProfileId");

-- CreateIndex
CREATE INDEX "treatment_enrollments_patientIdentityId_idx" ON "treatment_enrollments"("patientIdentityId");

-- CreateIndex
CREATE INDEX "treatment_enrollments_treatmentProgramId_idx" ON "treatment_enrollments"("treatmentProgramId");

-- CreateIndex
CREATE INDEX "treatment_enrollments_status_idx" ON "treatment_enrollments"("status");

-- CreateIndex
CREATE INDEX "treatment_enrollment_status_history_treatmentEnrollmentId_idx" ON "treatment_enrollment_status_history"("treatmentEnrollmentId");

-- CreateIndex
CREATE UNIQUE INDEX "treatment_appointment_references_serviceAppointmentId_key" ON "treatment_appointment_references"("serviceAppointmentId");

-- CreateIndex
CREATE INDEX "treatment_appointment_references_treatmentEnrollmentId_idx" ON "treatment_appointment_references"("treatmentEnrollmentId");

-- CreateIndex
CREATE UNIQUE INDEX "treatment_care_team_references_treatmentEnrollmentId_memberIdentityId_roleCode_key" ON "treatment_care_team_references"("treatmentEnrollmentId", "memberIdentityId", "roleCode");

-- CreateIndex
CREATE INDEX "treatment_care_team_references_memberIdentityId_idx" ON "treatment_care_team_references"("memberIdentityId");

-- CreateIndex
CREATE UNIQUE INDEX "treatment_program_authorizations_authorizationNumber_key" ON "treatment_program_authorizations"("authorizationNumber");

-- CreateIndex
CREATE INDEX "treatment_program_authorizations_treatmentProgramId_idx" ON "treatment_program_authorizations"("treatmentProgramId");

-- CreateIndex
CREATE INDEX "treatment_program_external_dependencies_treatmentProgramId_idx" ON "treatment_program_external_dependencies"("treatmentProgramId");

-- CreateIndex
CREATE INDEX "treatment_program_external_dependencies_externalAuthorityId_idx" ON "treatment_program_external_dependencies"("externalAuthorityId");

-- CreateIndex
CREATE INDEX "patient_treatment_status_projections_patientHealthcareProfileId_idx" ON "patient_treatment_status_projections"("patientHealthcareProfileId");

-- CreateIndex
CREATE INDEX "patient_treatment_status_projections_treatmentEnrollmentId_idx" ON "patient_treatment_status_projections"("treatmentEnrollmentId");

-- CreateIndex
CREATE UNIQUE INDEX "healthcare_data_access_policies_policyReference_key" ON "healthcare_data_access_policies"("policyReference");

-- CreateIndex
CREATE INDEX "healthcare_data_access_policies_patientHealthcareProfileId_idx" ON "healthcare_data_access_policies"("patientHealthcareProfileId");

-- CreateIndex
CREATE INDEX "healthcare_data_access_policies_patientSubjectIdentityId_idx" ON "healthcare_data_access_policies"("patientSubjectIdentityId");

-- CreateIndex
CREATE INDEX "healthcare_data_access_policies_granteeProviderIdentityId_idx" ON "healthcare_data_access_policies"("granteeProviderIdentityId");

-- CreateIndex
CREATE INDEX "healthcare_data_access_policies_granteeOrganizationId_idx" ON "healthcare_data_access_policies"("granteeOrganizationId");

-- AddForeignKey
ALTER TABLE "patient_healthcare_profiles" ADD CONSTRAINT "patient_healthcare_profiles_subjectIdentityId_fkey" FOREIGN KEY ("subjectIdentityId") REFERENCES "identities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patient_healthcare_profiles" ADD CONSTRAINT "patient_healthcare_profiles_jurisdictionId_fkey" FOREIGN KEY ("jurisdictionId") REFERENCES "jurisdictions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patient_healthcare_profiles" ADD CONSTRAINT "patient_healthcare_profiles_masterAdministrativeFileId_fkey" FOREIGN KEY ("masterAdministrativeFileId") REFERENCES "master_administrative_files"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "treatment_programs" ADD CONSTRAINT "treatment_programs_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "institutions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "treatment_programs" ADD CONSTRAINT "treatment_programs_jurisdictionId_fkey" FOREIGN KEY ("jurisdictionId") REFERENCES "jurisdictions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "treatment_program_versions" ADD CONSTRAINT "treatment_program_versions_treatmentProgramId_fkey" FOREIGN KEY ("treatmentProgramId") REFERENCES "treatment_programs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "treatment_programs" ADD CONSTRAINT "treatment_programs_currentVersionId_fkey" FOREIGN KEY ("currentVersionId") REFERENCES "treatment_program_versions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "treatment_program_providers" ADD CONSTRAINT "treatment_program_providers_treatmentProgramId_fkey" FOREIGN KEY ("treatmentProgramId") REFERENCES "treatment_programs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "treatment_program_providers" ADD CONSTRAINT "treatment_program_providers_providerOrganizationId_fkey" FOREIGN KEY ("providerOrganizationId") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "treatment_program_providers" ADD CONSTRAINT "treatment_program_providers_providerIdentityId_fkey" FOREIGN KEY ("providerIdentityId") REFERENCES "identities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "treatment_program_sites" ADD CONSTRAINT "treatment_program_sites_treatmentProgramId_fkey" FOREIGN KEY ("treatmentProgramId") REFERENCES "treatment_programs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "treatment_program_sites" ADD CONSTRAINT "treatment_program_sites_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "institutions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "treatment_program_condition_references" ADD CONSTRAINT "treatment_program_condition_references_treatmentProgramId_fkey" FOREIGN KEY ("treatmentProgramId") REFERENCES "treatment_programs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "treatment_program_eligibility_criteria" ADD CONSTRAINT "treatment_program_eligibility_criteria_treatmentProgramId_fkey" FOREIGN KEY ("treatmentProgramId") REFERENCES "treatment_programs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "treatment_applications" ADD CONSTRAINT "treatment_applications_patientHealthcareProfileId_fkey" FOREIGN KEY ("patientHealthcareProfileId") REFERENCES "patient_healthcare_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "treatment_applications" ADD CONSTRAINT "treatment_applications_patientIdentityId_fkey" FOREIGN KEY ("patientIdentityId") REFERENCES "identities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "treatment_applications" ADD CONSTRAINT "treatment_applications_treatmentProgramId_fkey" FOREIGN KEY ("treatmentProgramId") REFERENCES "treatment_programs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "treatment_applications" ADD CONSTRAINT "treatment_applications_treatmentProgramVersionId_fkey" FOREIGN KEY ("treatmentProgramVersionId") REFERENCES "treatment_program_versions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "treatment_applications" ADD CONSTRAINT "treatment_applications_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "cases"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "treatment_applications" ADD CONSTRAINT "treatment_applications_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "applications"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "treatment_referrals" ADD CONSTRAINT "treatment_referrals_patientHealthcareProfileId_fkey" FOREIGN KEY ("patientHealthcareProfileId") REFERENCES "patient_healthcare_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "treatment_referrals" ADD CONSTRAINT "treatment_referrals_patientIdentityId_fkey" FOREIGN KEY ("patientIdentityId") REFERENCES "identities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "treatment_referrals" ADD CONSTRAINT "treatment_referrals_treatmentProgramId_fkey" FOREIGN KEY ("treatmentProgramId") REFERENCES "treatment_programs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "treatment_referrals" ADD CONSTRAINT "treatment_referrals_treatmentApplicationId_fkey" FOREIGN KEY ("treatmentApplicationId") REFERENCES "treatment_applications"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "treatment_referrals" ADD CONSTRAINT "treatment_referrals_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "cases"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "treatment_referrals" ADD CONSTRAINT "treatment_referrals_referralSourceId_fkey" FOREIGN KEY ("referralSourceId") REFERENCES "treatment_referral_sources"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "treatment_referrals" ADD CONSTRAINT "treatment_referrals_referrerIdentityId_fkey" FOREIGN KEY ("referrerIdentityId") REFERENCES "identities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "treatment_screenings" ADD CONSTRAINT "treatment_screenings_patientHealthcareProfileId_fkey" FOREIGN KEY ("patientHealthcareProfileId") REFERENCES "patient_healthcare_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "treatment_screenings" ADD CONSTRAINT "treatment_screenings_patientIdentityId_fkey" FOREIGN KEY ("patientIdentityId") REFERENCES "identities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "treatment_screenings" ADD CONSTRAINT "treatment_screenings_treatmentApplicationId_fkey" FOREIGN KEY ("treatmentApplicationId") REFERENCES "treatment_applications"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "treatment_screenings" ADD CONSTRAINT "treatment_screenings_treatmentReferralId_fkey" FOREIGN KEY ("treatmentReferralId") REFERENCES "treatment_referrals"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "treatment_screenings" ADD CONSTRAINT "treatment_screenings_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "cases"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "treatment_eligibility_reviews" ADD CONSTRAINT "treatment_eligibility_reviews_treatmentApplicationId_fkey" FOREIGN KEY ("treatmentApplicationId") REFERENCES "treatment_applications"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "treatment_eligibility_reviews" ADD CONSTRAINT "treatment_eligibility_reviews_treatmentScreeningId_fkey" FOREIGN KEY ("treatmentScreeningId") REFERENCES "treatment_screenings"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "treatment_eligibility_reviews" ADD CONSTRAINT "treatment_eligibility_reviews_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "cases"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "treatment_eligibility_reviews" ADD CONSTRAINT "treatment_eligibility_reviews_treatmentProgramVersionId_fkey" FOREIGN KEY ("treatmentProgramVersionId") REFERENCES "treatment_program_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "treatment_eligibility_reviews" ADD CONSTRAINT "treatment_eligibility_reviews_professionalIdentityId_fkey" FOREIGN KEY ("professionalIdentityId") REFERENCES "identities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "treatment_eligibility_reviews" ADD CONSTRAINT "treatment_eligibility_reviews_governmentAdministrativeEvaluationId_fkey" FOREIGN KEY ("governmentAdministrativeEvaluationId") REFERENCES "authority_evaluation_records"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "treatment_enrollments" ADD CONSTRAINT "treatment_enrollments_patientHealthcareProfileId_fkey" FOREIGN KEY ("patientHealthcareProfileId") REFERENCES "patient_healthcare_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "treatment_enrollments" ADD CONSTRAINT "treatment_enrollments_patientIdentityId_fkey" FOREIGN KEY ("patientIdentityId") REFERENCES "identities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "treatment_enrollments" ADD CONSTRAINT "treatment_enrollments_treatmentProgramId_fkey" FOREIGN KEY ("treatmentProgramId") REFERENCES "treatment_programs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "treatment_enrollments" ADD CONSTRAINT "treatment_enrollments_treatmentProgramVersionId_fkey" FOREIGN KEY ("treatmentProgramVersionId") REFERENCES "treatment_program_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "treatment_enrollments" ADD CONSTRAINT "treatment_enrollments_treatmentApplicationId_fkey" FOREIGN KEY ("treatmentApplicationId") REFERENCES "treatment_applications"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "treatment_enrollments" ADD CONSTRAINT "treatment_enrollments_treatmentReferralId_fkey" FOREIGN KEY ("treatmentReferralId") REFERENCES "treatment_referrals"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "treatment_enrollments" ADD CONSTRAINT "treatment_enrollments_treatmentEligibilityReviewId_fkey" FOREIGN KEY ("treatmentEligibilityReviewId") REFERENCES "treatment_eligibility_reviews"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "treatment_enrollments" ADD CONSTRAINT "treatment_enrollments_treatmentProgramSiteId_fkey" FOREIGN KEY ("treatmentProgramSiteId") REFERENCES "treatment_program_sites"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "treatment_enrollment_status_history" ADD CONSTRAINT "treatment_enrollment_status_history_treatmentEnrollmentId_fkey" FOREIGN KEY ("treatmentEnrollmentId") REFERENCES "treatment_enrollments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "treatment_enrollment_status_history" ADD CONSTRAINT "treatment_enrollment_status_history_actorIdentityId_fkey" FOREIGN KEY ("actorIdentityId") REFERENCES "identities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "treatment_enrollments" ADD CONSTRAINT "treatment_enrollments_currentStatusHistoryId_fkey" FOREIGN KEY ("currentStatusHistoryId") REFERENCES "treatment_enrollment_status_history"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "treatment_appointment_references" ADD CONSTRAINT "treatment_appointment_references_treatmentEnrollmentId_fkey" FOREIGN KEY ("treatmentEnrollmentId") REFERENCES "treatment_enrollments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "treatment_appointment_references" ADD CONSTRAINT "treatment_appointment_references_serviceAppointmentId_fkey" FOREIGN KEY ("serviceAppointmentId") REFERENCES "service_appointments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "treatment_care_team_references" ADD CONSTRAINT "treatment_care_team_references_treatmentEnrollmentId_fkey" FOREIGN KEY ("treatmentEnrollmentId") REFERENCES "treatment_enrollments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "treatment_care_team_references" ADD CONSTRAINT "treatment_care_team_references_memberIdentityId_fkey" FOREIGN KEY ("memberIdentityId") REFERENCES "identities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "treatment_program_authorizations" ADD CONSTRAINT "treatment_program_authorizations_treatmentProgramId_fkey" FOREIGN KEY ("treatmentProgramId") REFERENCES "treatment_programs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "treatment_program_authorizations" ADD CONSTRAINT "treatment_program_authorizations_treatmentProgramVersionId_fkey" FOREIGN KEY ("treatmentProgramVersionId") REFERENCES "treatment_program_versions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "treatment_program_authorizations" ADD CONSTRAINT "treatment_program_authorizations_governmentDecisionId_fkey" FOREIGN KEY ("governmentDecisionId") REFERENCES "government_decisions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "treatment_program_authorizations" ADD CONSTRAINT "treatment_program_authorizations_recordedByIdentityId_fkey" FOREIGN KEY ("recordedByIdentityId") REFERENCES "identities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "treatment_program_external_dependencies" ADD CONSTRAINT "treatment_program_external_dependencies_treatmentProgramId_fkey" FOREIGN KEY ("treatmentProgramId") REFERENCES "treatment_programs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "treatment_program_external_dependencies" ADD CONSTRAINT "treatment_program_external_dependencies_externalAuthorityId_fkey" FOREIGN KEY ("externalAuthorityId") REFERENCES "external_authorities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "treatment_program_external_dependencies" ADD CONSTRAINT "treatment_program_external_dependencies_recordedByIdentityId_fkey" FOREIGN KEY ("recordedByIdentityId") REFERENCES "identities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patient_treatment_status_projections" ADD CONSTRAINT "patient_treatment_status_projections_patientHealthcareProfileId_fkey" FOREIGN KEY ("patientHealthcareProfileId") REFERENCES "patient_healthcare_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patient_treatment_status_projections" ADD CONSTRAINT "patient_treatment_status_projections_treatmentEnrollmentId_fkey" FOREIGN KEY ("treatmentEnrollmentId") REFERENCES "treatment_enrollments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patient_healthcare_profiles" ADD CONSTRAINT "patient_healthcare_profiles_currentStatusProjectionId_fkey" FOREIGN KEY ("currentStatusProjectionId") REFERENCES "patient_treatment_status_projections"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "healthcare_data_access_policies" ADD CONSTRAINT "healthcare_data_access_policies_patientHealthcareProfileId_fkey" FOREIGN KEY ("patientHealthcareProfileId") REFERENCES "patient_healthcare_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "healthcare_data_access_policies" ADD CONSTRAINT "healthcare_data_access_policies_patientSubjectIdentityId_fkey" FOREIGN KEY ("patientSubjectIdentityId") REFERENCES "identities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "healthcare_data_access_policies" ADD CONSTRAINT "healthcare_data_access_policies_granteeProviderIdentityId_fkey" FOREIGN KEY ("granteeProviderIdentityId") REFERENCES "identities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "healthcare_data_access_policies" ADD CONSTRAINT "healthcare_data_access_policies_granteeOrganizationId_fkey" FOREIGN KEY ("granteeOrganizationId") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
