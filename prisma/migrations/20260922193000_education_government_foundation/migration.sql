-- Education government vertical foundation (jurisdiction-neutral, NON_PRODUCTION templates)

CREATE TYPE "EducationDataClassification" AS ENUM (
  'PUBLIC',
  'OFFICIAL',
  'PROTECTED_EDUCATION',
  'PROTECTED_STUDENT'
);

CREATE TYPE "EducationActorPersona" AS ENUM (
  'STUDENT',
  'GUARDIAN',
  'INSTITUTION_REPRESENTATIVE',
  'OFFICIAL',
  'AI_ASSISTANCE',
  'TECHNICAL_ADMIN',
  'PAYMENT_SYSTEM',
  'PLATFORM_ADMINISTRATOR'
);

CREATE TYPE "EducationGuardianRelationshipStatus" AS ENUM (
  'PROPOSED',
  'ACTIVE',
  'LIMITED',
  'ENDED',
  'REVOKED'
);

CREATE TYPE "EducationStudentProfileStatus" AS ENUM (
  'REGISTERED',
  'ACTIVE',
  'INACTIVE',
  'CLOSED'
);

CREATE TYPE "EducationInstitutionRegistrationStatus" AS ENUM (
  'NOT_REGISTERED',
  'REGISTRATION_PENDING',
  'REGISTERED',
  'SUSPENDED',
  'CLOSED'
);

CREATE TYPE "EducationLicenseLifecycleStatus" AS ENUM (
  'NOT_ISSUED',
  'APPLICATION_PENDING',
  'ISSUED',
  'EFFECTIVE',
  'EXPIRED',
  'REVOKED',
  'SUSPENDED'
);

CREATE TYPE "EducationAccreditationStatus" AS ENUM (
  'NOT_ACCREDITED',
  'APPLICATION_PENDING',
  'ACCREDITED',
  'PROVISIONAL',
  'SUSPENDED',
  'REVOKED'
);

CREATE TYPE "EducationEnrollmentStatus" AS ENUM (
  'PROPOSED',
  'ACTIVE',
  'TRANSFER_PENDING',
  'COMPLETED',
  'WITHDRAWN'
);

CREATE TYPE "EducationExternalDependencyType" AS ENUM (
  'SCHOOL_REFERENCE',
  'UNIVERSITY_REFERENCE',
  'EXAMINATION_BODY',
  'EDUCATION_REGISTRY',
  'STUDENT_INFORMATION_SYSTEM'
);

CREATE TYPE "EducationExternalDependencyRecordedBy" AS ENUM (
  'OFFICIAL',
  'SYSTEM',
  'INTEGRATION_GATEWAY'
);

CREATE TYPE "EducationRecordCorrectionStatus" AS ENUM (
  'DRAFT',
  'SUBMITTED',
  'UNDER_REVIEW',
  'RESOLVED',
  'REJECTED'
);

CREATE TYPE "ScholarshipApplicationProfileStatus" AS ENUM (
  'LINKED',
  'ACTIVE',
  'WITHDRAWN',
  'CLOSED'
);

CREATE TYPE "ScholarshipAwardStatus" AS ENUM (
  'NOT_AWARDED',
  'PENDING_DECISION',
  'AWARDED',
  'DECLINED',
  'REVOKED'
);

CREATE TYPE "EducationEnrollmentApplicationProfileStatus" AS ENUM (
  'LINKED',
  'ACTIVE',
  'WITHDRAWN',
  'CLOSED'
);

CREATE TYPE "EducationGrantApplicationProfileStatus" AS ENUM (
  'LINKED',
  'ACTIVE',
  'WITHDRAWN',
  'CLOSED'
);

CREATE TABLE "education_student_profiles" (
  "id" UUID NOT NULL,
  "profileNumber" TEXT NOT NULL,
  "subjectIdentityId" UUID NOT NULL,
  "jurisdictionId" UUID,
  "status" "EducationStudentProfileStatus" NOT NULL DEFAULT 'REGISTERED',
  "dataClassification" "EducationDataClassification" NOT NULL DEFAULT 'PROTECTED_STUDENT',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "education_student_profiles_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "education_guardian_relationships" (
  "id" UUID NOT NULL,
  "guardianIdentityId" UUID NOT NULL,
  "studentProfileId" UUID NOT NULL,
  "relationshipType" "DependentRelationshipType" NOT NULL,
  "status" "EducationGuardianRelationshipStatus" NOT NULL DEFAULT 'PROPOSED',
  "authorizedScope" JSONB NOT NULL DEFAULT '{}',
  "effectiveFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "effectiveUntil" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "education_guardian_relationships_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "education_institution_registry_records" (
  "id" UUID NOT NULL,
  "registryNumber" TEXT NOT NULL,
  "organizationId" UUID NOT NULL,
  "jurisdictionId" UUID,
  "registrationStatus" "EducationInstitutionRegistrationStatus" NOT NULL DEFAULT 'NOT_REGISTERED',
  "doesNotSelfAccredit" BOOLEAN NOT NULL DEFAULT true,
  "dataClassification" "EducationDataClassification" NOT NULL DEFAULT 'PROTECTED_EDUCATION',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "education_institution_registry_records_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "education_institution_license_records" (
  "id" UUID NOT NULL,
  "licenseNumber" TEXT NOT NULL,
  "institutionRegistryRecordId" UUID NOT NULL,
  "organizationId" UUID NOT NULL,
  "lifecycleStatus" "EducationLicenseLifecycleStatus" NOT NULL DEFAULT 'NOT_ISSUED',
  "governmentDecisionId" UUID,
  "validFrom" TIMESTAMP(3),
  "validUntil" TIMESTAMP(3),
  "publicVerificationToken" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "education_institution_license_records_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "education_accreditation_records" (
  "id" UUID NOT NULL,
  "accreditationNumber" TEXT NOT NULL,
  "institutionRegistryRecordId" UUID NOT NULL,
  "organizationId" UUID NOT NULL,
  "status" "EducationAccreditationStatus" NOT NULL DEFAULT 'NOT_ACCREDITED',
  "governmentDecisionId" UUID,
  "grantedByOrganizationId" UUID,
  "publicVerificationToken" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "education_accreditation_records_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "educator_license_records" (
  "id" UUID NOT NULL,
  "licenseNumber" TEXT NOT NULL,
  "subjectIdentityId" UUID NOT NULL,
  "lifecycleStatus" "EducationLicenseLifecycleStatus" NOT NULL DEFAULT 'NOT_ISSUED',
  "governmentDecisionId" UUID,
  "publicVerificationToken" TEXT,
  "validFrom" TIMESTAMP(3),
  "validUntil" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "educator_license_records_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "education_enrollment_records" (
  "id" UUID NOT NULL,
  "enrollmentReference" TEXT NOT NULL,
  "studentProfileId" UUID NOT NULL,
  "institutionOrganizationId" UUID NOT NULL,
  "institutionRegistryRecordId" UUID,
  "status" "EducationEnrollmentStatus" NOT NULL DEFAULT 'PROPOSED',
  "effectiveFrom" TIMESTAMP(3),
  "effectiveUntil" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "education_enrollment_records_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "education_enrollment_application_profiles" (
  "id" UUID NOT NULL,
  "profileNumber" TEXT NOT NULL,
  "studentProfileId" UUID NOT NULL,
  "caseId" UUID NOT NULL,
  "applicationId" UUID NOT NULL,
  "status" "EducationEnrollmentApplicationProfileStatus" NOT NULL DEFAULT 'LINKED',
  "doesNotGrantEnrollment" BOOLEAN NOT NULL DEFAULT true,
  "submissionAcknowledgedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "education_enrollment_application_profiles_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "scholarship_application_profiles" (
  "id" UUID NOT NULL,
  "profileNumber" TEXT NOT NULL,
  "studentProfileId" UUID NOT NULL,
  "caseId" UUID NOT NULL,
  "applicationId" UUID NOT NULL,
  "status" "ScholarshipApplicationProfileStatus" NOT NULL DEFAULT 'LINKED',
  "doesNotCreateAward" BOOLEAN NOT NULL DEFAULT true,
  "recommendationOnly" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "scholarship_application_profiles_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "scholarship_award_records" (
  "id" UUID NOT NULL,
  "awardReference" TEXT NOT NULL,
  "scholarshipApplicationProfileId" UUID NOT NULL,
  "status" "ScholarshipAwardStatus" NOT NULL DEFAULT 'NOT_AWARDED',
  "requiresDecisionWorkflow" BOOLEAN NOT NULL DEFAULT true,
  "governmentDecisionId" UUID,
  "awardedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "scholarship_award_records_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "education_grant_application_profiles" (
  "id" UUID NOT NULL,
  "profileNumber" TEXT NOT NULL,
  "caseId" UUID NOT NULL,
  "applicationId" UUID NOT NULL,
  "organizationId" UUID,
  "status" "EducationGrantApplicationProfileStatus" NOT NULL DEFAULT 'LINKED',
  "doesNotGrantFunds" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "education_grant_application_profiles_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "education_academic_record_references" (
  "id" UUID NOT NULL,
  "referenceToken" TEXT NOT NULL,
  "studentProfileId" UUID NOT NULL,
  "institutionOrganizationId" UUID,
  "summaryLabel" TEXT,
  "isOfficialTranscript" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "education_academic_record_references_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "education_credential_references" (
  "id" UUID NOT NULL,
  "credentialReference" TEXT NOT NULL,
  "studentProfileId" UUID NOT NULL,
  "credentialTypeCode" TEXT NOT NULL,
  "publicVerificationToken" TEXT,
  "isGovernmentRecognized" BOOLEAN NOT NULL DEFAULT false,
  "governmentDecisionId" UUID,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "education_credential_references_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "education_record_corrections" (
  "id" UUID NOT NULL,
  "correctionReference" TEXT NOT NULL,
  "studentProfileId" UUID NOT NULL,
  "applicantIdentityId" UUID NOT NULL,
  "caseId" UUID,
  "status" "EducationRecordCorrectionStatus" NOT NULL DEFAULT 'DRAFT',
  "correctionSummary" TEXT,
  "governmentDecisionId" UUID,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "education_record_corrections_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "education_record_correction_history" (
  "id" UUID NOT NULL,
  "educationRecordCorrectionId" UUID NOT NULL,
  "fromStatus" "EducationRecordCorrectionStatus",
  "toStatus" "EducationRecordCorrectionStatus" NOT NULL,
  "changedFieldSummary" TEXT,
  "actorIdentityId" UUID,
  "actorPersona" "EducationActorPersona" NOT NULL,
  "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "education_record_correction_history_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "education_institution_inspection_references" (
  "id" UUID NOT NULL,
  "inspectionRecordId" UUID NOT NULL,
  "institutionRegistryRecordId" UUID,
  "organizationId" UUID NOT NULL,
  "findingSummary" TEXT,
  "isFinalComplianceDecision" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "education_institution_inspection_references_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "education_external_dependencies" (
  "id" UUID NOT NULL,
  "dependencyReference" TEXT NOT NULL,
  "caseId" UUID,
  "studentProfileId" UUID,
  "externalAuthorityId" UUID,
  "dependencyType" "EducationExternalDependencyType" NOT NULL,
  "integrationGatewayRouteCode" TEXT,
  "resolutionStatusCode" TEXT NOT NULL DEFAULT 'PENDING',
  "isRequired" BOOLEAN NOT NULL DEFAULT false,
  "blocksDecisionWhenRequired" BOOLEAN NOT NULL DEFAULT false,
  "recordedBy" "EducationExternalDependencyRecordedBy" NOT NULL,
  "recordedByIdentityId" UUID,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "education_external_dependencies_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "education_student_profiles_profileNumber_key" ON "education_student_profiles"("profileNumber");
CREATE INDEX "education_student_profiles_subjectIdentityId_idx" ON "education_student_profiles"("subjectIdentityId");
CREATE INDEX "education_student_profiles_jurisdictionId_idx" ON "education_student_profiles"("jurisdictionId");

CREATE UNIQUE INDEX "education_guardian_relationships_guardianIdentityId_student_key" ON "education_guardian_relationships"("guardianIdentityId", "studentProfileId", "relationshipType");
CREATE INDEX "education_guardian_relationships_studentProfileId_status_idx" ON "education_guardian_relationships"("studentProfileId", "status");

CREATE UNIQUE INDEX "education_institution_registry_records_registryNumber_key" ON "education_institution_registry_records"("registryNumber");
CREATE INDEX "education_institution_registry_records_organizationId_idx" ON "education_institution_registry_records"("organizationId");

CREATE UNIQUE INDEX "education_institution_license_records_licenseNumber_key" ON "education_institution_license_records"("licenseNumber");
CREATE UNIQUE INDEX "education_institution_license_records_publicVerificationToken_key" ON "education_institution_license_records"("publicVerificationToken");
CREATE INDEX "education_institution_license_records_organizationId_idx" ON "education_institution_license_records"("organizationId");
CREATE INDEX "education_institution_license_records_lifecycleStatus_idx" ON "education_institution_license_records"("lifecycleStatus");

CREATE UNIQUE INDEX "education_accreditation_records_accreditationNumber_key" ON "education_accreditation_records"("accreditationNumber");
CREATE UNIQUE INDEX "education_accreditation_records_publicVerificationToken_key" ON "education_accreditation_records"("publicVerificationToken");
CREATE INDEX "education_accreditation_records_organizationId_idx" ON "education_accreditation_records"("organizationId");
CREATE INDEX "education_accreditation_records_status_idx" ON "education_accreditation_records"("status");

CREATE UNIQUE INDEX "educator_license_records_licenseNumber_key" ON "educator_license_records"("licenseNumber");
CREATE UNIQUE INDEX "educator_license_records_publicVerificationToken_key" ON "educator_license_records"("publicVerificationToken");
CREATE INDEX "educator_license_records_subjectIdentityId_idx" ON "educator_license_records"("subjectIdentityId");

CREATE UNIQUE INDEX "education_enrollment_records_enrollmentReference_key" ON "education_enrollment_records"("enrollmentReference");
CREATE INDEX "education_enrollment_records_studentProfileId_idx" ON "education_enrollment_records"("studentProfileId");
CREATE INDEX "education_enrollment_records_institutionOrganizationId_idx" ON "education_enrollment_records"("institutionOrganizationId");

CREATE UNIQUE INDEX "education_enrollment_application_profiles_profileNumber_key" ON "education_enrollment_application_profiles"("profileNumber");
CREATE UNIQUE INDEX "education_enrollment_application_profiles_caseId_key" ON "education_enrollment_application_profiles"("caseId");
CREATE UNIQUE INDEX "education_enrollment_application_profiles_applicationId_key" ON "education_enrollment_application_profiles"("applicationId");
CREATE INDEX "education_enrollment_application_profiles_studentProfileId_idx" ON "education_enrollment_application_profiles"("studentProfileId");

CREATE UNIQUE INDEX "scholarship_application_profiles_profileNumber_key" ON "scholarship_application_profiles"("profileNumber");
CREATE UNIQUE INDEX "scholarship_application_profiles_caseId_key" ON "scholarship_application_profiles"("caseId");
CREATE UNIQUE INDEX "scholarship_application_profiles_applicationId_key" ON "scholarship_application_profiles"("applicationId");
CREATE INDEX "scholarship_application_profiles_studentProfileId_idx" ON "scholarship_application_profiles"("studentProfileId");

CREATE UNIQUE INDEX "scholarship_award_records_awardReference_key" ON "scholarship_award_records"("awardReference");
CREATE UNIQUE INDEX "scholarship_award_records_scholarshipApplicationProfileId_key" ON "scholarship_award_records"("scholarshipApplicationProfileId");
CREATE INDEX "scholarship_award_records_status_idx" ON "scholarship_award_records"("status");

CREATE UNIQUE INDEX "education_grant_application_profiles_profileNumber_key" ON "education_grant_application_profiles"("profileNumber");
CREATE UNIQUE INDEX "education_grant_application_profiles_caseId_key" ON "education_grant_application_profiles"("caseId");
CREATE UNIQUE INDEX "education_grant_application_profiles_applicationId_key" ON "education_grant_application_profiles"("applicationId");

CREATE UNIQUE INDEX "education_academic_record_references_referenceToken_key" ON "education_academic_record_references"("referenceToken");
CREATE INDEX "education_academic_record_references_studentProfileId_idx" ON "education_academic_record_references"("studentProfileId");

CREATE UNIQUE INDEX "education_credential_references_credentialReference_key" ON "education_credential_references"("credentialReference");
CREATE UNIQUE INDEX "education_credential_references_publicVerificationToken_key" ON "education_credential_references"("publicVerificationToken");
CREATE INDEX "education_credential_references_studentProfileId_idx" ON "education_credential_references"("studentProfileId");

CREATE UNIQUE INDEX "education_record_corrections_correctionReference_key" ON "education_record_corrections"("correctionReference");
CREATE INDEX "education_record_corrections_studentProfileId_idx" ON "education_record_corrections"("studentProfileId");

CREATE INDEX "education_record_correction_history_educationRecordCorrection_idx" ON "education_record_correction_history"("educationRecordCorrectionId");

CREATE INDEX "education_institution_inspection_references_inspectionRecordId_idx" ON "education_institution_inspection_references"("inspectionRecordId");
CREATE INDEX "education_institution_inspection_references_organizationId_idx" ON "education_institution_inspection_references"("organizationId");

CREATE UNIQUE INDEX "education_external_dependencies_dependencyReference_key" ON "education_external_dependencies"("dependencyReference");
CREATE INDEX "education_external_dependencies_caseId_idx" ON "education_external_dependencies"("caseId");
CREATE INDEX "education_external_dependencies_studentProfileId_idx" ON "education_external_dependencies"("studentProfileId");

ALTER TABLE "education_student_profiles" ADD CONSTRAINT "education_student_profiles_subjectIdentityId_fkey" FOREIGN KEY ("subjectIdentityId") REFERENCES "identities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "education_student_profiles" ADD CONSTRAINT "education_student_profiles_jurisdictionId_fkey" FOREIGN KEY ("jurisdictionId") REFERENCES "jurisdictions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "education_guardian_relationships" ADD CONSTRAINT "education_guardian_relationships_guardianIdentityId_fkey" FOREIGN KEY ("guardianIdentityId") REFERENCES "identities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "education_guardian_relationships" ADD CONSTRAINT "education_guardian_relationships_studentProfileId_fkey" FOREIGN KEY ("studentProfileId") REFERENCES "education_student_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "education_institution_registry_records" ADD CONSTRAINT "education_institution_registry_records_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "education_institution_registry_records" ADD CONSTRAINT "education_institution_registry_records_jurisdictionId_fkey" FOREIGN KEY ("jurisdictionId") REFERENCES "jurisdictions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "education_institution_license_records" ADD CONSTRAINT "education_institution_license_records_institutionRegistryRecord_fkey" FOREIGN KEY ("institutionRegistryRecordId") REFERENCES "education_institution_registry_records"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "education_institution_license_records" ADD CONSTRAINT "education_institution_license_records_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "education_institution_license_records" ADD CONSTRAINT "education_institution_license_records_governmentDecisionId_fkey" FOREIGN KEY ("governmentDecisionId") REFERENCES "government_decisions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "education_accreditation_records" ADD CONSTRAINT "education_accreditation_records_institutionRegistryRecordId_fkey" FOREIGN KEY ("institutionRegistryRecordId") REFERENCES "education_institution_registry_records"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "education_accreditation_records" ADD CONSTRAINT "education_accreditation_records_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "education_accreditation_records" ADD CONSTRAINT "education_accreditation_records_governmentDecisionId_fkey" FOREIGN KEY ("governmentDecisionId") REFERENCES "government_decisions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "educator_license_records" ADD CONSTRAINT "educator_license_records_subjectIdentityId_fkey" FOREIGN KEY ("subjectIdentityId") REFERENCES "identities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "educator_license_records" ADD CONSTRAINT "educator_license_records_governmentDecisionId_fkey" FOREIGN KEY ("governmentDecisionId") REFERENCES "government_decisions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "education_enrollment_records" ADD CONSTRAINT "education_enrollment_records_studentProfileId_fkey" FOREIGN KEY ("studentProfileId") REFERENCES "education_student_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "education_enrollment_records" ADD CONSTRAINT "education_enrollment_records_institutionOrganizationId_fkey" FOREIGN KEY ("institutionOrganizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "education_enrollment_records" ADD CONSTRAINT "education_enrollment_records_institutionRegistryRecordId_fkey" FOREIGN KEY ("institutionRegistryRecordId") REFERENCES "education_institution_registry_records"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "education_enrollment_application_profiles" ADD CONSTRAINT "education_enrollment_application_profiles_studentProfileId_fkey" FOREIGN KEY ("studentProfileId") REFERENCES "education_student_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "education_enrollment_application_profiles" ADD CONSTRAINT "education_enrollment_application_profiles_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "cases"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "education_enrollment_application_profiles" ADD CONSTRAINT "education_enrollment_application_profiles_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "applications"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "scholarship_application_profiles" ADD CONSTRAINT "scholarship_application_profiles_studentProfileId_fkey" FOREIGN KEY ("studentProfileId") REFERENCES "education_student_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "scholarship_application_profiles" ADD CONSTRAINT "scholarship_application_profiles_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "cases"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "scholarship_application_profiles" ADD CONSTRAINT "scholarship_application_profiles_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "applications"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "scholarship_award_records" ADD CONSTRAINT "scholarship_award_records_scholarshipApplicationProfileId_fkey" FOREIGN KEY ("scholarshipApplicationProfileId") REFERENCES "scholarship_application_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "scholarship_award_records" ADD CONSTRAINT "scholarship_award_records_governmentDecisionId_fkey" FOREIGN KEY ("governmentDecisionId") REFERENCES "government_decisions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "education_grant_application_profiles" ADD CONSTRAINT "education_grant_application_profiles_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "cases"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "education_grant_application_profiles" ADD CONSTRAINT "education_grant_application_profiles_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "applications"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "education_academic_record_references" ADD CONSTRAINT "education_academic_record_references_studentProfileId_fkey" FOREIGN KEY ("studentProfileId") REFERENCES "education_student_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "education_credential_references" ADD CONSTRAINT "education_credential_references_studentProfileId_fkey" FOREIGN KEY ("studentProfileId") REFERENCES "education_student_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "education_record_corrections" ADD CONSTRAINT "education_record_corrections_studentProfileId_fkey" FOREIGN KEY ("studentProfileId") REFERENCES "education_student_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "education_record_corrections" ADD CONSTRAINT "education_record_corrections_applicantIdentityId_fkey" FOREIGN KEY ("applicantIdentityId") REFERENCES "identities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "education_record_corrections" ADD CONSTRAINT "education_record_corrections_governmentDecisionId_fkey" FOREIGN KEY ("governmentDecisionId") REFERENCES "government_decisions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "education_record_correction_history" ADD CONSTRAINT "education_record_correction_history_educationRecordCorrectionId_fkey" FOREIGN KEY ("educationRecordCorrectionId") REFERENCES "education_record_corrections"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "education_record_correction_history" ADD CONSTRAINT "education_record_correction_history_actorIdentityId_fkey" FOREIGN KEY ("actorIdentityId") REFERENCES "identities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "education_institution_inspection_references" ADD CONSTRAINT "education_institution_inspection_references_inspectionRecordId_fkey" FOREIGN KEY ("inspectionRecordId") REFERENCES "inspection_records"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "education_institution_inspection_references" ADD CONSTRAINT "education_institution_inspection_references_institutionRegistry_fkey" FOREIGN KEY ("institutionRegistryRecordId") REFERENCES "education_institution_registry_records"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "education_institution_inspection_references" ADD CONSTRAINT "education_institution_inspection_references_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "education_external_dependencies" ADD CONSTRAINT "education_external_dependencies_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "cases"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "education_external_dependencies" ADD CONSTRAINT "education_external_dependencies_studentProfileId_fkey" FOREIGN KEY ("studentProfileId") REFERENCES "education_student_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "education_external_dependencies" ADD CONSTRAINT "education_external_dependencies_externalAuthorityId_fkey" FOREIGN KEY ("externalAuthorityId") REFERENCES "external_authorities"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "education_external_dependencies" ADD CONSTRAINT "education_external_dependencies_recordedByIdentityId_fkey" FOREIGN KEY ("recordedByIdentityId") REFERENCES "identities"("id") ON DELETE SET NULL ON UPDATE CASCADE;
