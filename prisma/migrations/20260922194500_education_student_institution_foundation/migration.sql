-- CreateEnum
CREATE TYPE "EducationDataClassification" AS ENUM ('STUDENT_ACCESS', 'GUARDIAN_AUTHORIZED', 'INSTITUTION_ACCESS', 'GOVERNMENT_AUTHORIZED', 'RESTRICTED', 'PUBLIC_VERIFICATION_ONLY');

-- CreateEnum
CREATE TYPE "EducationActorPersona" AS ENUM ('STUDENT', 'GUARDIAN', 'AUTHORIZED_REPRESENTATIVE', 'ADULT_STUDENT', 'EDUCATOR', 'INSTITUTION_ADMIN', 'EDUCATION_OFFICER', 'SENIOR_DECISION_OFFICER', 'COMPLIANCE_OFFICER', 'TECHNICAL_ADMIN', 'AI_ASSISTANCE', 'PAYMENT_SYSTEM', 'SYSTEM');

-- CreateEnum
CREATE TYPE "EducationInstitutionKind" AS ENUM ('PUBLIC_INSTITUTION', 'PRIVATE_INSTITUTION', 'UNIVERSITY', 'VOCATIONAL_INSTITUTION', 'TRAINING_PROVIDER', 'OTHER_CONFIGURED');

-- CreateEnum
CREATE TYPE "EducationInstitutionOperationalStatus" AS ENUM ('DRAFT', 'REGISTERED', 'LICENSED', 'ACCREDITED', 'SUSPENDED', 'WITHDRAWN', 'CLOSED');

-- CreateEnum
CREATE TYPE "EducationInstitutionRegistrationStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'REGISTERED', 'REJECTED', 'WITHDRAWN');

-- CreateEnum
CREATE TYPE "EducationInstitutionLicenseStatus" AS ENUM ('NOT_ISSUED', 'PENDING', 'ISSUED', 'EFFECTIVE', 'EXPIRED', 'REVOKED', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "EducationInstitutionAccreditationStatus" AS ENUM ('NOT_ACCREDITED', 'PENDING', 'ACCREDITED', 'PROVISIONAL', 'WITHDRAWN', 'REVOKED');

-- CreateEnum
CREATE TYPE "GuardianEducationRelationshipKind" AS ENUM ('LEGAL_GUARDIAN', 'PARENT', 'AUTHORIZED_REPRESENTATIVE', 'ADULT_STUDENT_SELF');

-- CreateEnum
CREATE TYPE "GuardianEducationRelationshipStatus" AS ENUM ('PROPOSED', 'ACTIVE', 'SUSPENDED', 'REVOKED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "StudentInstitutionRelationshipStatus" AS ENUM ('PROPOSED', 'ACTIVE', 'ON_LEAVE', 'WITHDRAWN', 'CLOSED');

-- CreateEnum
CREATE TYPE "EducationAdmissionApplicationProfileStatus" AS ENUM ('LINKED', 'ACTIVE', 'WITHDRAWN', 'CLOSED');

-- CreateEnum
CREATE TYPE "EnrollmentRecordStatus" AS ENUM ('PROPOSED', 'ACTIVE', 'ON_LEAVE', 'WITHDRAWN', 'COMPLETED', 'CLOSED');

-- CreateEnum
CREATE TYPE "EducationProgramStatus" AS ENUM ('DRAFT', 'ACTIVE', 'RETIRED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "AcademicRecordVerificationStatus" AS ENUM ('UNVERIFIED', 'INSTITUTION_ATTESTED', 'GOVERNMENT_VERIFIED', 'DISPUTED', 'SUPERSEDED');

-- CreateEnum
CREATE TYPE "AcademicCredentialLifecycleStatus" AS ENUM ('DRAFT', 'PENDING_ISSUANCE', 'ISSUED', 'EFFECTIVE', 'REVOKED', 'SUPERSEDED');

-- CreateEnum
CREATE TYPE "ScholarshipApplicationProfileStatus" AS ENUM ('LINKED', 'ACTIVE', 'WITHDRAWN', 'CLOSED');

-- CreateEnum
CREATE TYPE "EducatorLicenseRecordStatus" AS ENUM ('NOT_ISSUED', 'PENDING', 'ISSUED', 'EFFECTIVE', 'EXPIRED', 'REVOKED', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "EducationExternalDependencyType" AS ENUM ('CIVIL_IDENTITY', 'IMMIGRATION_STATUS', 'PROFESSIONAL_REGULATOR', 'ACCREDITATION_BODY', 'BACKGROUND_CHECK', 'HEALTH_SCREENING', 'OTHER_AUTHORIZED');

-- CreateEnum
CREATE TYPE "EducationExternalDependencyRecordedBy" AS ENUM ('EDUCATION_OFFICER', 'INTEGRATION_SYSTEM', 'EXTERNAL_AUTHORITY_LIAISON', 'SYSTEM');

-- CreateTable
CREATE TABLE "education_configurations" (
    "id" UUID NOT NULL,
    "jurisdictionId" UUID NOT NULL,
    "guardianAccessPolicyReference" TEXT,
    "studentSelfAccessMinAgeYears" INTEGER,
    "publicVerificationModeCode" TEXT NOT NULL DEFAULT 'MINIMAL',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "education_configurations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "education_institutions" (
    "id" UUID NOT NULL,
    "institutionReferenceNumber" TEXT NOT NULL,
    "organizationId" UUID NOT NULL,
    "jurisdictionId" UUID,
    "institutionKind" "EducationInstitutionKind" NOT NULL,
    "operationalStatus" "EducationInstitutionOperationalStatus" NOT NULL DEFAULT 'DRAFT',
    "doesNotSelfAccredit" BOOLEAN NOT NULL DEFAULT true,
    "dataClassification" "EducationDataClassification" NOT NULL DEFAULT 'INSTITUTION_ACCESS',
    "masterAdministrativeFileId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "education_institutions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "education_institution_registrations" (
    "id" UUID NOT NULL,
    "educationInstitutionId" UUID NOT NULL,
    "registrationReference" TEXT NOT NULL,
    "status" "EducationInstitutionRegistrationStatus" NOT NULL DEFAULT 'DRAFT',
    "registrationDoesNotAccredit" BOOLEAN NOT NULL DEFAULT true,
    "registeredAt" TIMESTAMP(3),
    "applicationId" UUID,
    "caseId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "education_institution_registrations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "education_institution_licenses" (
    "id" UUID NOT NULL,
    "educationInstitutionId" UUID NOT NULL,
    "licenseReference" TEXT NOT NULL,
    "status" "EducationInstitutionLicenseStatus" NOT NULL DEFAULT 'NOT_ISSUED',
    "governmentDecisionId" UUID,
    "officialInstrumentId" UUID,
    "licenseTypeCode" TEXT,
    "effectiveFrom" TIMESTAMP(3),
    "effectiveUntil" TIMESTAMP(3),
    "issuedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "education_institution_licenses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "education_institution_accreditations" (
    "id" UUID NOT NULL,
    "educationInstitutionId" UUID NOT NULL,
    "accreditationReference" TEXT NOT NULL,
    "status" "EducationInstitutionAccreditationStatus" NOT NULL DEFAULT 'NOT_ACCREDITED',
    "accreditingAuthorityReference" TEXT,
    "governmentDecisionId" UUID,
    "grantedAt" TIMESTAMP(3),
    "effectiveUntil" TIMESTAMP(3),
    "institutionSelfDeclared" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "education_institution_accreditations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "education_institution_status_history" (
    "id" UUID NOT NULL,
    "educationInstitutionId" UUID NOT NULL,
    "fromStatusCode" TEXT,
    "toStatusCode" TEXT NOT NULL,
    "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actorIdentityId" UUID,
    "actorPersona" "EducationActorPersona",
    "reasonSummary" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "education_institution_status_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "student_education_profiles" (
    "id" UUID NOT NULL,
    "profileReferenceNumber" TEXT NOT NULL,
    "studentIdentityId" UUID NOT NULL,
    "jurisdictionId" UUID,
    "masterAdministrativeFileId" UUID,
    "dataClassification" "EducationDataClassification" NOT NULL DEFAULT 'STUDENT_ACCESS',
    "studentAccountIsNotEnrollment" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "student_education_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "guardian_education_relationships" (
    "id" UUID NOT NULL,
    "studentEducationProfileId" UUID NOT NULL,
    "guardianIdentityId" UUID NOT NULL,
    "relationshipKind" "GuardianEducationRelationshipKind" NOT NULL,
    "status" "GuardianEducationRelationshipStatus" NOT NULL DEFAULT 'PROPOSED',
    "authorizedAccessScopes" JSONB NOT NULL DEFAULT '{}',
    "policyReference" TEXT,
    "effectiveFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "effectiveUntil" TIMESTAMP(3),
    "parentDoesNotImplyFullAccess" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "guardian_education_relationships_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "student_institution_relationships" (
    "id" UUID NOT NULL,
    "studentEducationProfileId" UUID NOT NULL,
    "educationInstitutionId" UUID NOT NULL,
    "relationshipReference" TEXT NOT NULL,
    "status" "StudentInstitutionRelationshipStatus" NOT NULL DEFAULT 'PROPOSED',
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "student_institution_relationships_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "education_admission_application_profiles" (
    "id" UUID NOT NULL,
    "profileNumber" TEXT NOT NULL,
    "studentEducationProfileId" UUID NOT NULL,
    "caseId" UUID NOT NULL,
    "applicationId" UUID NOT NULL,
    "status" "EducationAdmissionApplicationProfileStatus" NOT NULL DEFAULT 'LINKED',
    "doesNotCreateEnrollment" BOOLEAN NOT NULL DEFAULT true,
    "doesNotGrantAdmission" BOOLEAN NOT NULL DEFAULT true,
    "paymentDoesNotCreateAdmission" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "education_admission_application_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "enrollment_records" (
    "id" UUID NOT NULL,
    "enrollmentReference" TEXT NOT NULL,
    "studentEducationProfileId" UUID NOT NULL,
    "educationInstitutionId" UUID NOT NULL,
    "educationProgramVersionId" UUID,
    "educationAdmissionApplicationProfileId" UUID,
    "status" "EnrollmentRecordStatus" NOT NULL DEFAULT 'PROPOSED',
    "enrollmentPeriodStart" TIMESTAMP(3),
    "enrollmentPeriodEnd" TIMESTAMP(3),
    "admissionIsNotEnrollment" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "enrollment_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "enrollment_history" (
    "id" UUID NOT NULL,
    "enrollmentRecordId" UUID NOT NULL,
    "fromStatusCode" TEXT,
    "toStatusCode" TEXT NOT NULL,
    "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actorIdentityId" UUID,
    "actorPersona" "EducationActorPersona",
    "reasonSummary" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "enrollment_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "education_programs" (
    "id" UUID NOT NULL,
    "educationInstitutionId" UUID NOT NULL,
    "programCode" TEXT NOT NULL,
    "programTitle" TEXT NOT NULL,
    "status" "EducationProgramStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "education_programs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "education_program_versions" (
    "id" UUID NOT NULL,
    "educationProgramId" UUID NOT NULL,
    "versionNumber" INTEGER NOT NULL,
    "effectiveFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "effectiveUntil" TIMESTAMP(3),
    "curriculumReference" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "education_program_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "course_references" (
    "id" UUID NOT NULL,
    "educationProgramVersionId" UUID NOT NULL,
    "courseCode" TEXT NOT NULL,
    "courseTitle" TEXT NOT NULL,
    "schemeReference" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "course_references_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "qualification_references" (
    "id" UUID NOT NULL,
    "qualificationCode" TEXT NOT NULL,
    "qualificationLabel" TEXT NOT NULL,
    "schemeReference" TEXT,
    "jurisdictionId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "qualification_references_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "academic_records" (
    "id" UUID NOT NULL,
    "recordReference" TEXT NOT NULL,
    "studentEducationProfileId" UUID NOT NULL,
    "enrollmentRecordId" UUID,
    "educationInstitutionId" UUID,
    "educationProgramVersionId" UUID,
    "qualificationReferenceId" UUID,
    "periodStart" TIMESTAMP(3),
    "periodEnd" TIMESTAMP(3),
    "sourceReference" TEXT,
    "issuingAuthorityReference" TEXT,
    "verificationStatus" "AcademicRecordVerificationStatus" NOT NULL DEFAULT 'UNVERIFIED',
    "schoolResultIsNotGovernmentCredential" BOOLEAN NOT NULL DEFAULT true,
    "dataClassification" "EducationDataClassification" NOT NULL DEFAULT 'RESTRICTED',
    "currentVersionNumber" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "academic_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transcript_records" (
    "id" UUID NOT NULL,
    "academicRecordId" UUID NOT NULL,
    "transcriptReference" TEXT NOT NULL,
    "versionNumber" INTEGER NOT NULL,
    "isCurrentVersion" BOOLEAN NOT NULL DEFAULT true,
    "contentReference" TEXT,
    "verificationStatus" "AcademicRecordVerificationStatus" NOT NULL DEFAULT 'UNVERIFIED',
    "provenanceSummary" TEXT,
    "supersededAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "transcript_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transcript_record_correction_history" (
    "id" UUID NOT NULL,
    "transcriptRecordId" UUID NOT NULL,
    "priorVersionNumber" INTEGER NOT NULL,
    "correctionReason" TEXT NOT NULL,
    "correctedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actorIdentityId" UUID,
    "actorPersona" "EducationActorPersona",
    "priorContentReference" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "transcript_record_correction_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "certificate_records" (
    "id" UUID NOT NULL,
    "academicRecordId" UUID NOT NULL,
    "certificateReference" TEXT NOT NULL,
    "verificationStatus" "AcademicRecordVerificationStatus" NOT NULL DEFAULT 'UNVERIFIED',
    "documentRecordId" UUID,
    "evidenceRecordId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "certificate_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "academic_credentials" (
    "id" UUID NOT NULL,
    "credentialReference" TEXT NOT NULL,
    "studentEducationProfileId" UUID NOT NULL,
    "lifecycleStatus" "AcademicCredentialLifecycleStatus" NOT NULL DEFAULT 'DRAFT',
    "governmentDecisionId" UUID,
    "officialInstrumentId" UUID,
    "evidenceRecordId" UUID,
    "academicRecordIsNotCredential" BOOLEAN NOT NULL DEFAULT true,
    "dataClassification" "EducationDataClassification" NOT NULL DEFAULT 'GOVERNMENT_AUTHORIZED',
    "issuedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "academic_credentials_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scholarship_program_references" (
    "id" UUID NOT NULL,
    "programCode" TEXT NOT NULL,
    "programTitle" TEXT NOT NULL,
    "jurisdictionId" UUID,
    "governingSourceRef" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "scholarship_program_references_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scholarship_application_profiles" (
    "id" UUID NOT NULL,
    "profileNumber" TEXT NOT NULL,
    "studentEducationProfileId" UUID NOT NULL,
    "scholarshipProgramReferenceId" UUID NOT NULL,
    "caseId" UUID NOT NULL,
    "applicationId" UUID NOT NULL,
    "status" "ScholarshipApplicationProfileStatus" NOT NULL DEFAULT 'LINKED',
    "doesNotCreateAward" BOOLEAN NOT NULL DEFAULT true,
    "aiRecommendationIsNotDecision" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "scholarship_application_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "education_grant_references" (
    "id" UUID NOT NULL,
    "grantCode" TEXT NOT NULL,
    "grantTitle" TEXT NOT NULL,
    "jurisdictionId" UUID,
    "governingSourceRef" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "education_grant_references_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "student_support_program_references" (
    "id" UUID NOT NULL,
    "programCode" TEXT NOT NULL,
    "programTitle" TEXT NOT NULL,
    "jurisdictionId" UUID,
    "governingSourceRef" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "student_support_program_references_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "educator_profile_references" (
    "id" UUID NOT NULL,
    "educatorReferenceNumber" TEXT NOT NULL,
    "educatorIdentityId" UUID NOT NULL,
    "educationInstitutionId" UUID,
    "jurisdictionId" UUID,
    "dataClassification" "EducationDataClassification" NOT NULL DEFAULT 'INSTITUTION_ACCESS',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "educator_profile_references_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "educator_license_records" (
    "id" UUID NOT NULL,
    "educatorProfileReferenceId" UUID NOT NULL,
    "licenseReference" TEXT NOT NULL,
    "status" "EducatorLicenseRecordStatus" NOT NULL DEFAULT 'NOT_ISSUED',
    "governmentDecisionId" UUID,
    "officialInstrumentId" UUID,
    "licenseTypeCode" TEXT,
    "effectiveFrom" TIMESTAMP(3),
    "effectiveUntil" TIMESTAMP(3),
    "issuedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "educator_license_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "professional_education_qualification_references" (
    "id" UUID NOT NULL,
    "educatorProfileReferenceId" UUID NOT NULL,
    "qualificationCode" TEXT NOT NULL,
    "qualificationLabel" TEXT NOT NULL,
    "schemeReference" TEXT,
    "verificationStatus" "AcademicRecordVerificationStatus" NOT NULL DEFAULT 'UNVERIFIED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "professional_education_qualification_references_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "education_inspection_references" (
    "id" UUID NOT NULL,
    "educationInstitutionId" UUID NOT NULL,
    "inspectionRecordId" UUID NOT NULL,
    "isFinalComplianceDecision" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "education_inspection_references_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "education_compliance_references" (
    "id" UUID NOT NULL,
    "educationInstitutionId" UUID NOT NULL,
    "complianceMatterId" UUID NOT NULL,
    "studentEducationProfileId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "education_compliance_references_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "education_external_dependencies" (
    "id" UUID NOT NULL,
    "dependencyType" "EducationExternalDependencyType" NOT NULL,
    "educationInstitutionId" UUID,
    "studentEducationProfileId" UUID,
    "externalAuthorityId" UUID,
    "isRequired" BOOLEAN NOT NULL DEFAULT false,
    "isAuthenticated" BOOLEAN NOT NULL DEFAULT false,
    "authenticatedPayloadHash" TEXT,
    "recordedBy" "EducationExternalDependencyRecordedBy" NOT NULL,
    "recordedByIdentityId" UUID,
    "resolutionStatusCode" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "education_external_dependencies_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "education_configurations_jurisdictionId_key" ON "education_configurations"("jurisdictionId");

-- CreateIndex
CREATE UNIQUE INDEX "education_institutions_institutionReferenceNumber_key" ON "education_institutions"("institutionReferenceNumber");

-- CreateIndex
CREATE INDEX "education_institutions_organizationId_idx" ON "education_institutions"("organizationId");

-- CreateIndex
CREATE INDEX "education_institutions_jurisdictionId_idx" ON "education_institutions"("jurisdictionId");

-- CreateIndex
CREATE INDEX "education_institutions_operationalStatus_idx" ON "education_institutions"("operationalStatus");

-- CreateIndex
CREATE UNIQUE INDEX "education_institution_registrations_registrationReference_key" ON "education_institution_registrations"("registrationReference");

-- CreateIndex
CREATE INDEX "education_institution_registrations_educationInstitutionId_idx" ON "education_institution_registrations"("educationInstitutionId");

-- CreateIndex
CREATE INDEX "education_institution_registrations_status_idx" ON "education_institution_registrations"("status");

-- CreateIndex
CREATE UNIQUE INDEX "education_institution_licenses_licenseReference_key" ON "education_institution_licenses"("licenseReference");

-- CreateIndex
CREATE INDEX "education_institution_licenses_educationInstitutionId_idx" ON "education_institution_licenses"("educationInstitutionId");

-- CreateIndex
CREATE INDEX "education_institution_licenses_status_idx" ON "education_institution_licenses"("status");

-- CreateIndex
CREATE UNIQUE INDEX "education_institution_accreditations_accreditationReference_key" ON "education_institution_accreditations"("accreditationReference");

-- CreateIndex
CREATE INDEX "education_institution_accreditations_educationInstitutionId_idx" ON "education_institution_accreditations"("educationInstitutionId");

-- CreateIndex
CREATE INDEX "education_institution_accreditations_status_idx" ON "education_institution_accreditations"("status");

-- CreateIndex
CREATE INDEX "education_institution_status_history_educationInstitutionId_idx" ON "education_institution_status_history"("educationInstitutionId");

-- CreateIndex
CREATE UNIQUE INDEX "student_education_profiles_profileReferenceNumber_key" ON "student_education_profiles"("profileReferenceNumber");

-- CreateIndex
CREATE INDEX "student_education_profiles_studentIdentityId_idx" ON "student_education_profiles"("studentIdentityId");

-- CreateIndex
CREATE INDEX "student_education_profiles_jurisdictionId_idx" ON "student_education_profiles"("jurisdictionId");

-- CreateIndex
CREATE INDEX "guardian_education_relationships_studentEducationProfileId_idx" ON "guardian_education_relationships"("studentEducationProfileId");

-- CreateIndex
CREATE INDEX "guardian_education_relationships_guardianIdentityId_idx" ON "guardian_education_relationships"("guardianIdentityId");

-- CreateIndex
CREATE INDEX "guardian_education_relationships_status_idx" ON "guardian_education_relationships"("status");

-- CreateIndex
CREATE UNIQUE INDEX "student_institution_relationships_relationshipReference_key" ON "student_institution_relationships"("relationshipReference");

-- CreateIndex
CREATE INDEX "student_institution_relationships_studentEducationProfileId_idx" ON "student_institution_relationships"("studentEducationProfileId");

-- CreateIndex
CREATE INDEX "student_institution_relationships_educationInstitutionId_idx" ON "student_institution_relationships"("educationInstitutionId");

-- CreateIndex
CREATE UNIQUE INDEX "education_admission_application_profiles_profileNumber_key" ON "education_admission_application_profiles"("profileNumber");

-- CreateIndex
CREATE UNIQUE INDEX "education_admission_application_profiles_caseId_key" ON "education_admission_application_profiles"("caseId");

-- CreateIndex
CREATE UNIQUE INDEX "education_admission_application_profiles_applicationId_key" ON "education_admission_application_profiles"("applicationId");

-- CreateIndex
CREATE INDEX "education_admission_application_profiles_studentEducationPr_idx" ON "education_admission_application_profiles"("studentEducationProfileId");

-- CreateIndex
CREATE UNIQUE INDEX "enrollment_records_enrollmentReference_key" ON "enrollment_records"("enrollmentReference");

-- CreateIndex
CREATE INDEX "enrollment_records_studentEducationProfileId_idx" ON "enrollment_records"("studentEducationProfileId");

-- CreateIndex
CREATE INDEX "enrollment_records_educationInstitutionId_idx" ON "enrollment_records"("educationInstitutionId");

-- CreateIndex
CREATE INDEX "enrollment_records_status_idx" ON "enrollment_records"("status");

-- CreateIndex
CREATE INDEX "enrollment_history_enrollmentRecordId_idx" ON "enrollment_history"("enrollmentRecordId");

-- CreateIndex
CREATE INDEX "education_programs_educationInstitutionId_idx" ON "education_programs"("educationInstitutionId");

-- CreateIndex
CREATE UNIQUE INDEX "education_programs_educationInstitutionId_programCode_key" ON "education_programs"("educationInstitutionId", "programCode");

-- CreateIndex
CREATE INDEX "education_program_versions_educationProgramId_idx" ON "education_program_versions"("educationProgramId");

-- CreateIndex
CREATE UNIQUE INDEX "education_program_versions_educationProgramId_versionNumber_key" ON "education_program_versions"("educationProgramId", "versionNumber");

-- CreateIndex
CREATE INDEX "course_references_educationProgramVersionId_idx" ON "course_references"("educationProgramVersionId");

-- CreateIndex
CREATE INDEX "qualification_references_qualificationCode_idx" ON "qualification_references"("qualificationCode");

-- CreateIndex
CREATE INDEX "qualification_references_jurisdictionId_idx" ON "qualification_references"("jurisdictionId");

-- CreateIndex
CREATE UNIQUE INDEX "academic_records_recordReference_key" ON "academic_records"("recordReference");

-- CreateIndex
CREATE INDEX "academic_records_studentEducationProfileId_idx" ON "academic_records"("studentEducationProfileId");

-- CreateIndex
CREATE INDEX "academic_records_verificationStatus_idx" ON "academic_records"("verificationStatus");

-- CreateIndex
CREATE UNIQUE INDEX "transcript_records_transcriptReference_key" ON "transcript_records"("transcriptReference");

-- CreateIndex
CREATE INDEX "transcript_records_academicRecordId_idx" ON "transcript_records"("academicRecordId");

-- CreateIndex
CREATE UNIQUE INDEX "transcript_records_academicRecordId_versionNumber_key" ON "transcript_records"("academicRecordId", "versionNumber");

-- CreateIndex
CREATE INDEX "transcript_record_correction_history_transcriptRecordId_idx" ON "transcript_record_correction_history"("transcriptRecordId");

-- CreateIndex
CREATE UNIQUE INDEX "certificate_records_certificateReference_key" ON "certificate_records"("certificateReference");

-- CreateIndex
CREATE INDEX "certificate_records_academicRecordId_idx" ON "certificate_records"("academicRecordId");

-- CreateIndex
CREATE UNIQUE INDEX "academic_credentials_credentialReference_key" ON "academic_credentials"("credentialReference");

-- CreateIndex
CREATE INDEX "academic_credentials_studentEducationProfileId_idx" ON "academic_credentials"("studentEducationProfileId");

-- CreateIndex
CREATE INDEX "academic_credentials_lifecycleStatus_idx" ON "academic_credentials"("lifecycleStatus");

-- CreateIndex
CREATE INDEX "scholarship_program_references_programCode_idx" ON "scholarship_program_references"("programCode");

-- CreateIndex
CREATE INDEX "scholarship_program_references_jurisdictionId_idx" ON "scholarship_program_references"("jurisdictionId");

-- CreateIndex
CREATE UNIQUE INDEX "scholarship_application_profiles_profileNumber_key" ON "scholarship_application_profiles"("profileNumber");

-- CreateIndex
CREATE UNIQUE INDEX "scholarship_application_profiles_caseId_key" ON "scholarship_application_profiles"("caseId");

-- CreateIndex
CREATE UNIQUE INDEX "scholarship_application_profiles_applicationId_key" ON "scholarship_application_profiles"("applicationId");

-- CreateIndex
CREATE INDEX "scholarship_application_profiles_studentEducationProfileId_idx" ON "scholarship_application_profiles"("studentEducationProfileId");

-- CreateIndex
CREATE INDEX "scholarship_application_profiles_scholarshipProgramReferenc_idx" ON "scholarship_application_profiles"("scholarshipProgramReferenceId");

-- CreateIndex
CREATE INDEX "education_grant_references_grantCode_idx" ON "education_grant_references"("grantCode");

-- CreateIndex
CREATE INDEX "education_grant_references_jurisdictionId_idx" ON "education_grant_references"("jurisdictionId");

-- CreateIndex
CREATE INDEX "student_support_program_references_programCode_idx" ON "student_support_program_references"("programCode");

-- CreateIndex
CREATE INDEX "student_support_program_references_jurisdictionId_idx" ON "student_support_program_references"("jurisdictionId");

-- CreateIndex
CREATE UNIQUE INDEX "educator_profile_references_educatorReferenceNumber_key" ON "educator_profile_references"("educatorReferenceNumber");

-- CreateIndex
CREATE INDEX "educator_profile_references_educatorIdentityId_idx" ON "educator_profile_references"("educatorIdentityId");

-- CreateIndex
CREATE INDEX "educator_profile_references_educationInstitutionId_idx" ON "educator_profile_references"("educationInstitutionId");

-- CreateIndex
CREATE UNIQUE INDEX "educator_license_records_licenseReference_key" ON "educator_license_records"("licenseReference");

-- CreateIndex
CREATE INDEX "educator_license_records_educatorProfileReferenceId_idx" ON "educator_license_records"("educatorProfileReferenceId");

-- CreateIndex
CREATE INDEX "educator_license_records_status_idx" ON "educator_license_records"("status");

-- CreateIndex
CREATE INDEX "professional_education_qualification_references_educatorPro_idx" ON "professional_education_qualification_references"("educatorProfileReferenceId");

-- CreateIndex
CREATE UNIQUE INDEX "education_inspection_references_inspectionRecordId_key" ON "education_inspection_references"("inspectionRecordId");

-- CreateIndex
CREATE INDEX "education_inspection_references_educationInstitutionId_idx" ON "education_inspection_references"("educationInstitutionId");

-- CreateIndex
CREATE UNIQUE INDEX "education_compliance_references_complianceMatterId_key" ON "education_compliance_references"("complianceMatterId");

-- CreateIndex
CREATE INDEX "education_compliance_references_educationInstitutionId_idx" ON "education_compliance_references"("educationInstitutionId");

-- CreateIndex
CREATE INDEX "education_external_dependencies_educationInstitutionId_idx" ON "education_external_dependencies"("educationInstitutionId");

-- CreateIndex
CREATE INDEX "education_external_dependencies_studentEducationProfileId_idx" ON "education_external_dependencies"("studentEducationProfileId");

-- AddForeignKey
ALTER TABLE "education_configurations" ADD CONSTRAINT "education_configurations_jurisdictionId_fkey" FOREIGN KEY ("jurisdictionId") REFERENCES "jurisdictions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "education_institutions" ADD CONSTRAINT "education_institutions_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "education_institutions" ADD CONSTRAINT "education_institutions_jurisdictionId_fkey" FOREIGN KEY ("jurisdictionId") REFERENCES "jurisdictions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "education_institutions" ADD CONSTRAINT "education_institutions_masterAdministrativeFileId_fkey" FOREIGN KEY ("masterAdministrativeFileId") REFERENCES "master_administrative_files"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "education_institution_registrations" ADD CONSTRAINT "education_institution_registrations_educationInstitutionId_fkey" FOREIGN KEY ("educationInstitutionId") REFERENCES "education_institutions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "education_institution_registrations" ADD CONSTRAINT "education_institution_registrations_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "applications"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "education_institution_registrations" ADD CONSTRAINT "education_institution_registrations_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "cases"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "education_institution_licenses" ADD CONSTRAINT "education_institution_licenses_educationInstitutionId_fkey" FOREIGN KEY ("educationInstitutionId") REFERENCES "education_institutions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "education_institution_licenses" ADD CONSTRAINT "education_institution_licenses_governmentDecisionId_fkey" FOREIGN KEY ("governmentDecisionId") REFERENCES "government_decisions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "education_institution_licenses" ADD CONSTRAINT "education_institution_licenses_officialInstrumentId_fkey" FOREIGN KEY ("officialInstrumentId") REFERENCES "official_instruments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "education_institution_accreditations" ADD CONSTRAINT "education_institution_accreditations_educationInstitutionI_fkey" FOREIGN KEY ("educationInstitutionId") REFERENCES "education_institutions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "education_institution_accreditations" ADD CONSTRAINT "education_institution_accreditations_governmentDecisionId_fkey" FOREIGN KEY ("governmentDecisionId") REFERENCES "government_decisions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "education_institution_status_history" ADD CONSTRAINT "education_institution_status_history_educationInstitutionI_fkey" FOREIGN KEY ("educationInstitutionId") REFERENCES "education_institutions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "education_institution_status_history" ADD CONSTRAINT "education_institution_status_history_actorIdentityId_fkey" FOREIGN KEY ("actorIdentityId") REFERENCES "identities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_education_profiles" ADD CONSTRAINT "student_education_profiles_studentIdentityId_fkey" FOREIGN KEY ("studentIdentityId") REFERENCES "identities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_education_profiles" ADD CONSTRAINT "student_education_profiles_jurisdictionId_fkey" FOREIGN KEY ("jurisdictionId") REFERENCES "jurisdictions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_education_profiles" ADD CONSTRAINT "student_education_profiles_masterAdministrativeFileId_fkey" FOREIGN KEY ("masterAdministrativeFileId") REFERENCES "master_administrative_files"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "guardian_education_relationships" ADD CONSTRAINT "guardian_education_relationships_studentEducationProfileId_fkey" FOREIGN KEY ("studentEducationProfileId") REFERENCES "student_education_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "guardian_education_relationships" ADD CONSTRAINT "guardian_education_relationships_guardianIdentityId_fkey" FOREIGN KEY ("guardianIdentityId") REFERENCES "identities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_institution_relationships" ADD CONSTRAINT "student_institution_relationships_studentEducationProfileI_fkey" FOREIGN KEY ("studentEducationProfileId") REFERENCES "student_education_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_institution_relationships" ADD CONSTRAINT "student_institution_relationships_educationInstitutionId_fkey" FOREIGN KEY ("educationInstitutionId") REFERENCES "education_institutions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "education_admission_application_profiles" ADD CONSTRAINT "education_admission_application_profiles_studentEducationP_fkey" FOREIGN KEY ("studentEducationProfileId") REFERENCES "student_education_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "education_admission_application_profiles" ADD CONSTRAINT "education_admission_application_profiles_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "cases"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "education_admission_application_profiles" ADD CONSTRAINT "education_admission_application_profiles_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "applications"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "enrollment_records" ADD CONSTRAINT "enrollment_records_studentEducationProfileId_fkey" FOREIGN KEY ("studentEducationProfileId") REFERENCES "student_education_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "enrollment_records" ADD CONSTRAINT "enrollment_records_educationInstitutionId_fkey" FOREIGN KEY ("educationInstitutionId") REFERENCES "education_institutions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "enrollment_records" ADD CONSTRAINT "enrollment_records_educationProgramVersionId_fkey" FOREIGN KEY ("educationProgramVersionId") REFERENCES "education_program_versions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "enrollment_records" ADD CONSTRAINT "enrollment_records_educationAdmissionApplicationProfileId_fkey" FOREIGN KEY ("educationAdmissionApplicationProfileId") REFERENCES "education_admission_application_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "enrollment_history" ADD CONSTRAINT "enrollment_history_enrollmentRecordId_fkey" FOREIGN KEY ("enrollmentRecordId") REFERENCES "enrollment_records"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "enrollment_history" ADD CONSTRAINT "enrollment_history_actorIdentityId_fkey" FOREIGN KEY ("actorIdentityId") REFERENCES "identities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "education_programs" ADD CONSTRAINT "education_programs_educationInstitutionId_fkey" FOREIGN KEY ("educationInstitutionId") REFERENCES "education_institutions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "education_program_versions" ADD CONSTRAINT "education_program_versions_educationProgramId_fkey" FOREIGN KEY ("educationProgramId") REFERENCES "education_programs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "course_references" ADD CONSTRAINT "course_references_educationProgramVersionId_fkey" FOREIGN KEY ("educationProgramVersionId") REFERENCES "education_program_versions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "qualification_references" ADD CONSTRAINT "qualification_references_jurisdictionId_fkey" FOREIGN KEY ("jurisdictionId") REFERENCES "jurisdictions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "academic_records" ADD CONSTRAINT "academic_records_educationInstitutionId_fkey" FOREIGN KEY ("educationInstitutionId") REFERENCES "education_institutions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "academic_records" ADD CONSTRAINT "academic_records_studentEducationProfileId_fkey" FOREIGN KEY ("studentEducationProfileId") REFERENCES "student_education_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "academic_records" ADD CONSTRAINT "academic_records_enrollmentRecordId_fkey" FOREIGN KEY ("enrollmentRecordId") REFERENCES "enrollment_records"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "academic_records" ADD CONSTRAINT "academic_records_educationProgramVersionId_fkey" FOREIGN KEY ("educationProgramVersionId") REFERENCES "education_program_versions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "academic_records" ADD CONSTRAINT "academic_records_qualificationReferenceId_fkey" FOREIGN KEY ("qualificationReferenceId") REFERENCES "qualification_references"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transcript_records" ADD CONSTRAINT "transcript_records_academicRecordId_fkey" FOREIGN KEY ("academicRecordId") REFERENCES "academic_records"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transcript_record_correction_history" ADD CONSTRAINT "transcript_record_correction_history_transcriptRecordId_fkey" FOREIGN KEY ("transcriptRecordId") REFERENCES "transcript_records"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transcript_record_correction_history" ADD CONSTRAINT "transcript_record_correction_history_actorIdentityId_fkey" FOREIGN KEY ("actorIdentityId") REFERENCES "identities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "certificate_records" ADD CONSTRAINT "certificate_records_academicRecordId_fkey" FOREIGN KEY ("academicRecordId") REFERENCES "academic_records"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "certificate_records" ADD CONSTRAINT "certificate_records_documentRecordId_fkey" FOREIGN KEY ("documentRecordId") REFERENCES "document_records"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "certificate_records" ADD CONSTRAINT "certificate_records_evidenceRecordId_fkey" FOREIGN KEY ("evidenceRecordId") REFERENCES "evidence_records"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "academic_credentials" ADD CONSTRAINT "academic_credentials_studentEducationProfileId_fkey" FOREIGN KEY ("studentEducationProfileId") REFERENCES "student_education_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "academic_credentials" ADD CONSTRAINT "academic_credentials_governmentDecisionId_fkey" FOREIGN KEY ("governmentDecisionId") REFERENCES "government_decisions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "academic_credentials" ADD CONSTRAINT "academic_credentials_officialInstrumentId_fkey" FOREIGN KEY ("officialInstrumentId") REFERENCES "official_instruments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "academic_credentials" ADD CONSTRAINT "academic_credentials_evidenceRecordId_fkey" FOREIGN KEY ("evidenceRecordId") REFERENCES "evidence_records"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scholarship_program_references" ADD CONSTRAINT "scholarship_program_references_jurisdictionId_fkey" FOREIGN KEY ("jurisdictionId") REFERENCES "jurisdictions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scholarship_application_profiles" ADD CONSTRAINT "scholarship_application_profiles_studentEducationProfileId_fkey" FOREIGN KEY ("studentEducationProfileId") REFERENCES "student_education_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scholarship_application_profiles" ADD CONSTRAINT "scholarship_application_profiles_scholarshipProgramReferen_fkey" FOREIGN KEY ("scholarshipProgramReferenceId") REFERENCES "scholarship_program_references"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scholarship_application_profiles" ADD CONSTRAINT "scholarship_application_profiles_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "cases"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scholarship_application_profiles" ADD CONSTRAINT "scholarship_application_profiles_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "applications"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "education_grant_references" ADD CONSTRAINT "education_grant_references_jurisdictionId_fkey" FOREIGN KEY ("jurisdictionId") REFERENCES "jurisdictions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_support_program_references" ADD CONSTRAINT "student_support_program_references_jurisdictionId_fkey" FOREIGN KEY ("jurisdictionId") REFERENCES "jurisdictions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "educator_profile_references" ADD CONSTRAINT "educator_profile_references_educatorIdentityId_fkey" FOREIGN KEY ("educatorIdentityId") REFERENCES "identities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "educator_profile_references" ADD CONSTRAINT "educator_profile_references_educationInstitutionId_fkey" FOREIGN KEY ("educationInstitutionId") REFERENCES "education_institutions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "educator_profile_references" ADD CONSTRAINT "educator_profile_references_jurisdictionId_fkey" FOREIGN KEY ("jurisdictionId") REFERENCES "jurisdictions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "educator_license_records" ADD CONSTRAINT "educator_license_records_educatorProfileReferenceId_fkey" FOREIGN KEY ("educatorProfileReferenceId") REFERENCES "educator_profile_references"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "educator_license_records" ADD CONSTRAINT "educator_license_records_governmentDecisionId_fkey" FOREIGN KEY ("governmentDecisionId") REFERENCES "government_decisions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "educator_license_records" ADD CONSTRAINT "educator_license_records_officialInstrumentId_fkey" FOREIGN KEY ("officialInstrumentId") REFERENCES "official_instruments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "professional_education_qualification_references" ADD CONSTRAINT "professional_education_qualification_references_educatorPr_fkey" FOREIGN KEY ("educatorProfileReferenceId") REFERENCES "educator_profile_references"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "education_inspection_references" ADD CONSTRAINT "education_inspection_references_educationInstitutionId_fkey" FOREIGN KEY ("educationInstitutionId") REFERENCES "education_institutions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "education_inspection_references" ADD CONSTRAINT "education_inspection_references_inspectionRecordId_fkey" FOREIGN KEY ("inspectionRecordId") REFERENCES "inspection_records"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "education_compliance_references" ADD CONSTRAINT "education_compliance_references_educationInstitutionId_fkey" FOREIGN KEY ("educationInstitutionId") REFERENCES "education_institutions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "education_compliance_references" ADD CONSTRAINT "education_compliance_references_complianceMatterId_fkey" FOREIGN KEY ("complianceMatterId") REFERENCES "compliance_matters"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "education_compliance_references" ADD CONSTRAINT "education_compliance_references_studentEducationProfileId_fkey" FOREIGN KEY ("studentEducationProfileId") REFERENCES "student_education_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "education_external_dependencies" ADD CONSTRAINT "education_external_dependencies_educationInstitutionId_fkey" FOREIGN KEY ("educationInstitutionId") REFERENCES "education_institutions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "education_external_dependencies" ADD CONSTRAINT "education_external_dependencies_studentEducationProfileId_fkey" FOREIGN KEY ("studentEducationProfileId") REFERENCES "student_education_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "education_external_dependencies" ADD CONSTRAINT "education_external_dependencies_externalAuthorityId_fkey" FOREIGN KEY ("externalAuthorityId") REFERENCES "external_authorities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "education_external_dependencies" ADD CONSTRAINT "education_external_dependencies_recordedByIdentityId_fkey" FOREIGN KEY ("recordedByIdentityId") REFERENCES "identities"("id") ON DELETE SET NULL ON UPDATE CASCADE;
