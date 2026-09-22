-- Immigration, visa, residency & citizenship foundation (jurisdiction-neutral)

CREATE TYPE "ImmigrationDataClassification" AS ENUM (
  'PUBLIC',
  'OFFICIAL',
  'OFFICIAL_SENSITIVE',
  'PROTECTED_IMMIGRATION',
  'PROTECTED_BIOMETRIC',
  'PROTECTED_SECURITY'
);

CREATE TYPE "ImmigrationTravelDocumentType" AS ENUM (
  'PASSPORT',
  'EMERGENCY_TRAVEL_DOCUMENT',
  'NATIONAL_ID_TRAVEL',
  'REFUGEE_TRAVEL_DOCUMENT',
  'OTHER_AUTHORIZED'
);

CREATE TYPE "TravelDocumentReferenceStatus" AS ENUM (
  'REFERENCED',
  'VALIDATION_PENDING',
  'VALIDATED',
  'VALIDATION_FAILED',
  'EXPIRED',
  'SUPERSEDED',
  'WITHDRAWN'
);

CREATE TYPE "ImmigrationStatusCategory" AS ENUM (
  'OVERALL',
  'ENTRY',
  'VISA',
  'RESIDENCY',
  'CITIZENSHIP'
);

CREATE TYPE "ImmigrationApplicationProfileStatus" AS ENUM (
  'LINKED',
  'ACTIVE',
  'WITHDRAWN',
  'CLOSED'
);

CREATE TYPE "ImmigrationCredentialLifecycleStatus" AS ENUM (
  'NOT_ISSUED',
  'PENDING_ISSUANCE',
  'ISSUED',
  'EFFECTIVE',
  'EXPIRED',
  'REVOKED',
  'SUSPENDED',
  'SUPERSEDED',
  'SURRENDERED'
);

CREATE TYPE "ImmigrationRequirementAssessmentOutcome" AS ENUM (
  'INCOMPLETE',
  'INFORMATION_ONLY',
  'ELIGIBILITY_GUIDANCE',
  'REQUIRES_EXTERNAL_DETERMINATION',
  'REQUIRES_DECISION'
);

CREATE TYPE "ImmigrationInterviewStatus" AS ENUM (
  'SCHEDULED',
  'COMPLETED',
  'CANCELLED',
  'NO_SHOW',
  'RESCHEDULED'
);

CREATE TYPE "BiometricRequirementStatus" AS ENUM (
  'REQUIRED',
  'SCHEDULED',
  'CAPTURED',
  'VERIFIED',
  'WAIVED_BY_AUTHORIZED_ACTION',
  'FAILED'
);

CREATE TYPE "ImmigrationExternalCheckType" AS ENUM (
  'BORDER_AUTHORITY',
  'LAW_ENFORCEMENT',
  'SECURITY_SCREENING',
  'HEALTH_SCREENING',
  'LABOUR_AUTHORITY',
  'CIVIL_REGISTRY',
  'DIPLOMATIC_CONSULAR',
  'TRAVEL_DOCUMENT_VALIDATION'
);

CREATE TYPE "ImmigrationExternalCheckRecordedBy" AS ENUM (
  'EXTERNAL_AUTHORITY_LIAISON',
  'INTEGRATION_SYSTEM',
  'IMMIGRATION_OFFICER',
  'SYSTEM'
);

CREATE TYPE "ImmigrationActorPersona" AS ENUM (
  'APPLICANT',
  'SPONSOR',
  'DEPENDENT',
  'AUTHORIZED_REPRESENTATIVE',
  'IMMIGRATION_OFFICER',
  'SENIOR_DECISION_OFFICER',
  'EXTERNAL_AUTHORITY_LIAISON',
  'TECHNICAL_ADMIN',
  'AI_ASSISTANCE',
  'PAYMENT_SYSTEM',
  'SYSTEM'
);

CREATE TYPE "ImmigrationSponsorshipStatus" AS ENUM (
  'PROPOSED',
  'ACTIVE',
  'LIMITED',
  'WITHDRAWN',
  'CLOSED'
);

CREATE TYPE "DependentRelationshipType" AS ENUM (
  'SPOUSE',
  'CHILD',
  'PARENT',
  'OTHER_AUTHORIZED'
);

CREATE TYPE "ImmigrationRestrictionType" AS ENUM (
  'TRAVEL',
  'EMPLOYMENT',
  'RESIDENCY_CONDITION',
  'REPORTING',
  'OTHER_AUTHORIZED'
);

CREATE TABLE "immigration_profiles" (
  "id" UUID NOT NULL,
  "profileNumber" TEXT NOT NULL,
  "subjectIdentityId" UUID NOT NULL,
  "jurisdictionId" UUID,
  "masterAdministrativeFileId" UUID,
  "recordsClassificationReference" TEXT,
  "dataClassification" "ImmigrationDataClassification" NOT NULL DEFAULT 'PROTECTED_IMMIGRATION',
  "dataCompartmentCode" TEXT,
  "currentStatusRecordId" UUID,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "immigration_profiles_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "travel_document_references" (
  "id" UUID NOT NULL,
  "immigrationProfileId" UUID NOT NULL,
  "documentType" "ImmigrationTravelDocumentType" NOT NULL,
  "documentReferenceToken" TEXT NOT NULL,
  "issuingCountryCode" TEXT,
  "externalValidationReference" TEXT,
  "validatedAt" TIMESTAMP(3),
  "expiresAt" TIMESTAMP(3),
  "status" "TravelDocumentReferenceStatus" NOT NULL DEFAULT 'REFERENCED',
  "dataClassification" "ImmigrationDataClassification" NOT NULL DEFAULT 'PROTECTED_IMMIGRATION',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "travel_document_references_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "immigration_status_records" (
  "id" UUID NOT NULL,
  "immigrationProfileId" UUID NOT NULL,
  "statusCategory" "ImmigrationStatusCategory" NOT NULL,
  "statusCode" TEXT NOT NULL,
  "effectiveFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "effectiveUntil" TIMESTAMP(3),
  "isCurrent" BOOLEAN NOT NULL DEFAULT true,
  "supersededAt" TIMESTAMP(3),
  "governmentDecisionId" UUID,
  "officialInstrumentId" UUID,
  "dataClassification" "ImmigrationDataClassification" NOT NULL DEFAULT 'PROTECTED_IMMIGRATION',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "immigration_status_records_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "visa_application_profiles" (
  "id" UUID NOT NULL,
  "profileNumber" TEXT NOT NULL,
  "immigrationProfileId" UUID NOT NULL,
  "caseId" UUID NOT NULL,
  "applicationId" UUID NOT NULL,
  "serviceCategoryCode" TEXT,
  "intendedPurposeCode" TEXT,
  "status" "ImmigrationApplicationProfileStatus" NOT NULL DEFAULT 'LINKED',
  "submissionAcknowledgedAt" TIMESTAMP(3),
  "doesNotIssueVisa" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "visa_application_profiles_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "residency_application_profiles" (
  "id" UUID NOT NULL,
  "profileNumber" TEXT NOT NULL,
  "immigrationProfileId" UUID NOT NULL,
  "caseId" UUID NOT NULL,
  "applicationId" UUID NOT NULL,
  "residencyProgramCode" TEXT,
  "status" "ImmigrationApplicationProfileStatus" NOT NULL DEFAULT 'LINKED',
  "submissionAcknowledgedAt" TIMESTAMP(3),
  "doesNotCreateResidency" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "residency_application_profiles_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "citizenship_application_profiles" (
  "id" UUID NOT NULL,
  "profileNumber" TEXT NOT NULL,
  "immigrationProfileId" UUID NOT NULL,
  "caseId" UUID NOT NULL,
  "applicationId" UUID NOT NULL,
  "programCode" TEXT,
  "status" "ImmigrationApplicationProfileStatus" NOT NULL DEFAULT 'LINKED',
  "submissionAcknowledgedAt" TIMESTAMP(3),
  "doesNotGrantCitizenship" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "citizenship_application_profiles_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "visa_permission_records" (
  "id" UUID NOT NULL,
  "permissionNumber" TEXT NOT NULL,
  "immigrationProfileId" UUID NOT NULL,
  "visaApplicationProfileId" UUID,
  "officialInstrumentId" UUID,
  "governmentDecisionId" UUID,
  "permissionTypeCode" TEXT,
  "validFrom" TIMESTAMP(3),
  "validUntil" TIMESTAMP(3),
  "lifecycleStatus" "ImmigrationCredentialLifecycleStatus" NOT NULL DEFAULT 'NOT_ISSUED',
  "dataClassification" "ImmigrationDataClassification" NOT NULL DEFAULT 'PROTECTED_IMMIGRATION',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "visa_permission_records_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "residency_status_records" (
  "id" UUID NOT NULL,
  "immigrationProfileId" UUID NOT NULL,
  "statusCode" TEXT NOT NULL,
  "effectiveFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "effectiveUntil" TIMESTAMP(3),
  "isCurrent" BOOLEAN NOT NULL DEFAULT true,
  "supersededAt" TIMESTAMP(3),
  "governmentDecisionId" UUID,
  "workLinkPolicyReference" TEXT,
  "dataClassification" "ImmigrationDataClassification" NOT NULL DEFAULT 'PROTECTED_IMMIGRATION',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "residency_status_records_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "residency_permit_records" (
  "id" UUID NOT NULL,
  "permitNumber" TEXT NOT NULL,
  "immigrationProfileId" UUID NOT NULL,
  "residencyStatusRecordId" UUID,
  "officialInstrumentId" UUID,
  "governmentDecisionId" UUID,
  "permitTypeCode" TEXT,
  "validFrom" TIMESTAMP(3),
  "validUntil" TIMESTAMP(3),
  "renewalOfPermitId" UUID,
  "lifecycleStatus" "ImmigrationCredentialLifecycleStatus" NOT NULL DEFAULT 'NOT_ISSUED',
  "dataClassification" "ImmigrationDataClassification" NOT NULL DEFAULT 'PROTECTED_IMMIGRATION',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "residency_permit_records_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "citizenship_status_records" (
  "id" UUID NOT NULL,
  "immigrationProfileId" UUID NOT NULL,
  "statusCode" TEXT NOT NULL,
  "effectiveFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "effectiveUntil" TIMESTAMP(3),
  "isCurrent" BOOLEAN NOT NULL DEFAULT true,
  "isNaturalized" BOOLEAN,
  "supersededAt" TIMESTAMP(3),
  "governmentDecisionId" UUID,
  "dataClassification" "ImmigrationDataClassification" NOT NULL DEFAULT 'PROTECTED_SECURITY',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "citizenship_status_records_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "immigration_sponsorships" (
  "id" UUID NOT NULL,
  "sponsorshipNumber" TEXT NOT NULL,
  "sponsorIdentityId" UUID,
  "sponsorOrganizationId" UUID,
  "sponsoredProfileId" UUID NOT NULL,
  "caseId" UUID,
  "sponsorshipTypeCode" TEXT,
  "authorizedScope" JSONB NOT NULL DEFAULT '{}',
  "status" "ImmigrationSponsorshipStatus" NOT NULL DEFAULT 'PROPOSED',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "immigration_sponsorships_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "dependent_relationships" (
  "id" UUID NOT NULL,
  "primaryProfileId" UUID NOT NULL,
  "dependentProfileId" UUID NOT NULL,
  "caseId" UUID,
  "relationshipType" "DependentRelationshipType" NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "dependent_relationships_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "immigration_requirement_assessments" (
  "id" UUID NOT NULL,
  "assessmentNumber" TEXT NOT NULL,
  "caseId" UUID NOT NULL,
  "assessmentTypeCode" TEXT NOT NULL,
  "outcome" "ImmigrationRequirementAssessmentOutcome" NOT NULL,
  "isImmigrationDecision" BOOLEAN NOT NULL DEFAULT false,
  "summary" TEXT,
  "assessedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "assessedByIdentityId" UUID,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "immigration_requirement_assessments_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "immigration_interviews" (
  "id" UUID NOT NULL,
  "caseId" UUID NOT NULL,
  "serviceAppointmentId" UUID,
  "interviewTypeCode" TEXT,
  "status" "ImmigrationInterviewStatus" NOT NULL DEFAULT 'SCHEDULED',
  "outcomeReference" TEXT,
  "isDecision" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "immigration_interviews_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "biometric_requirements" (
  "id" UUID NOT NULL,
  "immigrationProfileId" UUID NOT NULL,
  "caseId" UUID,
  "serviceAppointmentId" UUID,
  "status" "BiometricRequirementStatus" NOT NULL DEFAULT 'REQUIRED',
  "capturedAt" TIMESTAMP(3),
  "dataClassification" "ImmigrationDataClassification" NOT NULL DEFAULT 'PROTECTED_BIOMETRIC',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "biometric_requirements_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "immigration_external_checks" (
  "id" UUID NOT NULL,
  "checkReference" TEXT NOT NULL,
  "caseId" UUID NOT NULL,
  "immigrationProfileId" UUID,
  "externalAuthorityId" UUID NOT NULL,
  "checkType" "ImmigrationExternalCheckType" NOT NULL,
  "determinationStatus" "ExternalDeterminationStatus" NOT NULL DEFAULT 'PENDING',
  "isRequired" BOOLEAN NOT NULL DEFAULT true,
  "blocksDecisionWhenRequired" BOOLEAN NOT NULL DEFAULT true,
  "isAuthenticated" BOOLEAN NOT NULL DEFAULT false,
  "authenticatedPayloadHash" TEXT,
  "recordedBy" "ImmigrationExternalCheckRecordedBy" NOT NULL,
  "recordedByIdentityId" UUID,
  "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "immigration_external_checks_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "immigration_status_history" (
  "id" UUID NOT NULL,
  "immigrationProfileId" UUID NOT NULL,
  "fromStatusRecordId" UUID,
  "toStatusRecordId" UUID NOT NULL,
  "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "actorIdentityId" UUID,
  "actorPersona" "ImmigrationActorPersona" NOT NULL,
  "reason" TEXT,
  "metadata" JSONB NOT NULL DEFAULT '{}',
  CONSTRAINT "immigration_status_history_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "immigration_restrictions" (
  "id" UUID NOT NULL,
  "immigrationProfileId" UUID NOT NULL,
  "restrictionType" "ImmigrationRestrictionType" NOT NULL,
  "description" TEXT,
  "effectiveFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "effectiveUntil" TIMESTAMP(3),
  "sourceDecisionId" UUID,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "immigration_restrictions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "immigration_case_projections" (
  "id" UUID NOT NULL,
  "caseId" UUID NOT NULL,
  "projectedStatusLabel" TEXT NOT NULL,
  "disclaimer" TEXT NOT NULL DEFAULT 'Non-authoritative operational projection; not an immigration decision or status.',
  "lastDerivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "metadata" JSONB NOT NULL DEFAULT '{}',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "immigration_case_projections_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "immigration_profiles_profileNumber_key" ON "immigration_profiles"("profileNumber");
CREATE UNIQUE INDEX "immigration_profiles_currentStatusRecordId_key" ON "immigration_profiles"("currentStatusRecordId");
CREATE UNIQUE INDEX "visa_application_profiles_profileNumber_key" ON "visa_application_profiles"("profileNumber");
CREATE UNIQUE INDEX "visa_application_profiles_caseId_key" ON "visa_application_profiles"("caseId");
CREATE UNIQUE INDEX "visa_application_profiles_applicationId_key" ON "visa_application_profiles"("applicationId");
CREATE UNIQUE INDEX "residency_application_profiles_profileNumber_key" ON "residency_application_profiles"("profileNumber");
CREATE UNIQUE INDEX "residency_application_profiles_caseId_key" ON "residency_application_profiles"("caseId");
CREATE UNIQUE INDEX "residency_application_profiles_applicationId_key" ON "residency_application_profiles"("applicationId");
CREATE UNIQUE INDEX "citizenship_application_profiles_profileNumber_key" ON "citizenship_application_profiles"("profileNumber");
CREATE UNIQUE INDEX "citizenship_application_profiles_caseId_key" ON "citizenship_application_profiles"("caseId");
CREATE UNIQUE INDEX "citizenship_application_profiles_applicationId_key" ON "citizenship_application_profiles"("applicationId");
CREATE UNIQUE INDEX "visa_permission_records_permissionNumber_key" ON "visa_permission_records"("permissionNumber");
CREATE UNIQUE INDEX "residency_permit_records_permitNumber_key" ON "residency_permit_records"("permitNumber");
CREATE UNIQUE INDEX "residency_permit_records_renewalOfPermitId_key" ON "residency_permit_records"("renewalOfPermitId");
CREATE UNIQUE INDEX "immigration_sponsorships_sponsorshipNumber_key" ON "immigration_sponsorships"("sponsorshipNumber");
CREATE UNIQUE INDEX "dependent_relationships_primaryProfileId_dependentProfileId_relationshipType_key" ON "dependent_relationships"("primaryProfileId", "dependentProfileId", "relationshipType");
CREATE UNIQUE INDEX "immigration_requirement_assessments_assessmentNumber_key" ON "immigration_requirement_assessments"("assessmentNumber");
CREATE UNIQUE INDEX "immigration_interviews_serviceAppointmentId_key" ON "immigration_interviews"("serviceAppointmentId");
CREATE UNIQUE INDEX "biometric_requirements_serviceAppointmentId_key" ON "biometric_requirements"("serviceAppointmentId");
CREATE UNIQUE INDEX "immigration_external_checks_checkReference_key" ON "immigration_external_checks"("checkReference");
CREATE UNIQUE INDEX "immigration_case_projections_caseId_key" ON "immigration_case_projections"("caseId");

CREATE INDEX "immigration_profiles_subjectIdentityId_idx" ON "immigration_profiles"("subjectIdentityId");
CREATE INDEX "immigration_profiles_jurisdictionId_idx" ON "immigration_profiles"("jurisdictionId");
CREATE INDEX "immigration_profiles_masterAdministrativeFileId_idx" ON "immigration_profiles"("masterAdministrativeFileId");
CREATE INDEX "travel_document_references_immigrationProfileId_idx" ON "travel_document_references"("immigrationProfileId");
CREATE INDEX "travel_document_references_status_idx" ON "travel_document_references"("status");
CREATE INDEX "immigration_status_records_immigrationProfileId_statusCategory_isCurrent_idx" ON "immigration_status_records"("immigrationProfileId", "statusCategory", "isCurrent");
CREATE INDEX "immigration_status_records_governmentDecisionId_idx" ON "immigration_status_records"("governmentDecisionId");
CREATE INDEX "immigration_status_records_officialInstrumentId_idx" ON "immigration_status_records"("officialInstrumentId");
CREATE INDEX "visa_application_profiles_immigrationProfileId_idx" ON "visa_application_profiles"("immigrationProfileId");
CREATE INDEX "residency_application_profiles_immigrationProfileId_idx" ON "residency_application_profiles"("immigrationProfileId");
CREATE INDEX "citizenship_application_profiles_immigrationProfileId_idx" ON "citizenship_application_profiles"("immigrationProfileId");
CREATE INDEX "visa_permission_records_immigrationProfileId_idx" ON "visa_permission_records"("immigrationProfileId");
CREATE INDEX "visa_permission_records_lifecycleStatus_idx" ON "visa_permission_records"("lifecycleStatus");
CREATE INDEX "visa_permission_records_validUntil_idx" ON "visa_permission_records"("validUntil");
CREATE INDEX "residency_status_records_immigrationProfileId_isCurrent_idx" ON "residency_status_records"("immigrationProfileId", "isCurrent");
CREATE INDEX "residency_permit_records_immigrationProfileId_idx" ON "residency_permit_records"("immigrationProfileId");
CREATE INDEX "residency_permit_records_lifecycleStatus_idx" ON "residency_permit_records"("lifecycleStatus");
CREATE INDEX "residency_permit_records_validUntil_idx" ON "residency_permit_records"("validUntil");
CREATE INDEX "citizenship_status_records_immigrationProfileId_isCurrent_idx" ON "citizenship_status_records"("immigrationProfileId", "isCurrent");
CREATE INDEX "immigration_sponsorships_sponsoredProfileId_idx" ON "immigration_sponsorships"("sponsoredProfileId");
CREATE INDEX "immigration_sponsorships_sponsorIdentityId_idx" ON "immigration_sponsorships"("sponsorIdentityId");
CREATE INDEX "immigration_sponsorships_caseId_idx" ON "immigration_sponsorships"("caseId");
CREATE INDEX "dependent_relationships_caseId_idx" ON "dependent_relationships"("caseId");
CREATE INDEX "immigration_requirement_assessments_caseId_idx" ON "immigration_requirement_assessments"("caseId");
CREATE INDEX "immigration_interviews_caseId_idx" ON "immigration_interviews"("caseId");
CREATE INDEX "biometric_requirements_immigrationProfileId_idx" ON "biometric_requirements"("immigrationProfileId");
CREATE INDEX "biometric_requirements_caseId_idx" ON "biometric_requirements"("caseId");
CREATE INDEX "immigration_external_checks_caseId_idx" ON "immigration_external_checks"("caseId");
CREATE INDEX "immigration_external_checks_immigrationProfileId_idx" ON "immigration_external_checks"("immigrationProfileId");
CREATE INDEX "immigration_external_checks_externalAuthorityId_idx" ON "immigration_external_checks"("externalAuthorityId");
CREATE INDEX "immigration_external_checks_determinationStatus_idx" ON "immigration_external_checks"("determinationStatus");
CREATE INDEX "immigration_status_history_immigrationProfileId_changedAt_idx" ON "immigration_status_history"("immigrationProfileId", "changedAt");
CREATE INDEX "immigration_restrictions_immigrationProfileId_idx" ON "immigration_restrictions"("immigrationProfileId");

ALTER TABLE "immigration_profiles" ADD CONSTRAINT "immigration_profiles_subjectIdentityId_fkey" FOREIGN KEY ("subjectIdentityId") REFERENCES "identities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "immigration_profiles" ADD CONSTRAINT "immigration_profiles_jurisdictionId_fkey" FOREIGN KEY ("jurisdictionId") REFERENCES "jurisdictions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "immigration_profiles" ADD CONSTRAINT "immigration_profiles_masterAdministrativeFileId_fkey" FOREIGN KEY ("masterAdministrativeFileId") REFERENCES "master_administrative_files"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "immigration_profiles" ADD CONSTRAINT "immigration_profiles_currentStatusRecordId_fkey" FOREIGN KEY ("currentStatusRecordId") REFERENCES "immigration_status_records"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "travel_document_references" ADD CONSTRAINT "travel_document_references_immigrationProfileId_fkey" FOREIGN KEY ("immigrationProfileId") REFERENCES "immigration_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "immigration_status_records" ADD CONSTRAINT "immigration_status_records_immigrationProfileId_fkey" FOREIGN KEY ("immigrationProfileId") REFERENCES "immigration_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "immigration_status_records" ADD CONSTRAINT "immigration_status_records_governmentDecisionId_fkey" FOREIGN KEY ("governmentDecisionId") REFERENCES "government_decisions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "immigration_status_records" ADD CONSTRAINT "immigration_status_records_officialInstrumentId_fkey" FOREIGN KEY ("officialInstrumentId") REFERENCES "official_instruments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "visa_application_profiles" ADD CONSTRAINT "visa_application_profiles_immigrationProfileId_fkey" FOREIGN KEY ("immigrationProfileId") REFERENCES "immigration_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "visa_application_profiles" ADD CONSTRAINT "visa_application_profiles_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "cases"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "visa_application_profiles" ADD CONSTRAINT "visa_application_profiles_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "applications"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "residency_application_profiles" ADD CONSTRAINT "residency_application_profiles_immigrationProfileId_fkey" FOREIGN KEY ("immigrationProfileId") REFERENCES "immigration_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "residency_application_profiles" ADD CONSTRAINT "residency_application_profiles_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "cases"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "residency_application_profiles" ADD CONSTRAINT "residency_application_profiles_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "applications"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "citizenship_application_profiles" ADD CONSTRAINT "citizenship_application_profiles_immigrationProfileId_fkey" FOREIGN KEY ("immigrationProfileId") REFERENCES "immigration_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "citizenship_application_profiles" ADD CONSTRAINT "citizenship_application_profiles_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "cases"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "citizenship_application_profiles" ADD CONSTRAINT "citizenship_application_profiles_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "applications"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "visa_permission_records" ADD CONSTRAINT "visa_permission_records_immigrationProfileId_fkey" FOREIGN KEY ("immigrationProfileId") REFERENCES "immigration_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "visa_permission_records" ADD CONSTRAINT "visa_permission_records_visaApplicationProfileId_fkey" FOREIGN KEY ("visaApplicationProfileId") REFERENCES "visa_application_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "visa_permission_records" ADD CONSTRAINT "visa_permission_records_officialInstrumentId_fkey" FOREIGN KEY ("officialInstrumentId") REFERENCES "official_instruments"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "visa_permission_records" ADD CONSTRAINT "visa_permission_records_governmentDecisionId_fkey" FOREIGN KEY ("governmentDecisionId") REFERENCES "government_decisions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "residency_status_records" ADD CONSTRAINT "residency_status_records_immigrationProfileId_fkey" FOREIGN KEY ("immigrationProfileId") REFERENCES "immigration_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "residency_status_records" ADD CONSTRAINT "residency_status_records_governmentDecisionId_fkey" FOREIGN KEY ("governmentDecisionId") REFERENCES "government_decisions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "residency_permit_records" ADD CONSTRAINT "residency_permit_records_immigrationProfileId_fkey" FOREIGN KEY ("immigrationProfileId") REFERENCES "immigration_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "residency_permit_records" ADD CONSTRAINT "residency_permit_records_residencyStatusRecordId_fkey" FOREIGN KEY ("residencyStatusRecordId") REFERENCES "residency_status_records"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "residency_permit_records" ADD CONSTRAINT "residency_permit_records_officialInstrumentId_fkey" FOREIGN KEY ("officialInstrumentId") REFERENCES "official_instruments"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "residency_permit_records" ADD CONSTRAINT "residency_permit_records_governmentDecisionId_fkey" FOREIGN KEY ("governmentDecisionId") REFERENCES "government_decisions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "residency_permit_records" ADD CONSTRAINT "residency_permit_records_renewalOfPermitId_fkey" FOREIGN KEY ("renewalOfPermitId") REFERENCES "residency_permit_records"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "citizenship_status_records" ADD CONSTRAINT "citizenship_status_records_immigrationProfileId_fkey" FOREIGN KEY ("immigrationProfileId") REFERENCES "immigration_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "citizenship_status_records" ADD CONSTRAINT "citizenship_status_records_governmentDecisionId_fkey" FOREIGN KEY ("governmentDecisionId") REFERENCES "government_decisions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "immigration_sponsorships" ADD CONSTRAINT "immigration_sponsorships_sponsorIdentityId_fkey" FOREIGN KEY ("sponsorIdentityId") REFERENCES "identities"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "immigration_sponsorships" ADD CONSTRAINT "immigration_sponsorships_sponsorOrganizationId_fkey" FOREIGN KEY ("sponsorOrganizationId") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "immigration_sponsorships" ADD CONSTRAINT "immigration_sponsorships_sponsoredProfileId_fkey" FOREIGN KEY ("sponsoredProfileId") REFERENCES "immigration_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "immigration_sponsorships" ADD CONSTRAINT "immigration_sponsorships_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "cases"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "dependent_relationships" ADD CONSTRAINT "dependent_relationships_primaryProfileId_fkey" FOREIGN KEY ("primaryProfileId") REFERENCES "immigration_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "dependent_relationships" ADD CONSTRAINT "dependent_relationships_dependentProfileId_fkey" FOREIGN KEY ("dependentProfileId") REFERENCES "immigration_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "dependent_relationships" ADD CONSTRAINT "dependent_relationships_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "cases"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "immigration_requirement_assessments" ADD CONSTRAINT "immigration_requirement_assessments_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "cases"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "immigration_requirement_assessments" ADD CONSTRAINT "immigration_requirement_assessments_assessedByIdentityId_fkey" FOREIGN KEY ("assessedByIdentityId") REFERENCES "identities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "immigration_interviews" ADD CONSTRAINT "immigration_interviews_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "cases"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "immigration_interviews" ADD CONSTRAINT "immigration_interviews_serviceAppointmentId_fkey" FOREIGN KEY ("serviceAppointmentId") REFERENCES "service_appointments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "biometric_requirements" ADD CONSTRAINT "biometric_requirements_immigrationProfileId_fkey" FOREIGN KEY ("immigrationProfileId") REFERENCES "immigration_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "biometric_requirements" ADD CONSTRAINT "biometric_requirements_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "cases"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "biometric_requirements" ADD CONSTRAINT "biometric_requirements_serviceAppointmentId_fkey" FOREIGN KEY ("serviceAppointmentId") REFERENCES "service_appointments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "immigration_external_checks" ADD CONSTRAINT "immigration_external_checks_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "cases"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "immigration_external_checks" ADD CONSTRAINT "immigration_external_checks_immigrationProfileId_fkey" FOREIGN KEY ("immigrationProfileId") REFERENCES "immigration_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "immigration_external_checks" ADD CONSTRAINT "immigration_external_checks_externalAuthorityId_fkey" FOREIGN KEY ("externalAuthorityId") REFERENCES "external_authorities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "immigration_external_checks" ADD CONSTRAINT "immigration_external_checks_recordedByIdentityId_fkey" FOREIGN KEY ("recordedByIdentityId") REFERENCES "identities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "immigration_status_history" ADD CONSTRAINT "immigration_status_history_immigrationProfileId_fkey" FOREIGN KEY ("immigrationProfileId") REFERENCES "immigration_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "immigration_status_history" ADD CONSTRAINT "immigration_status_history_fromStatusRecordId_fkey" FOREIGN KEY ("fromStatusRecordId") REFERENCES "immigration_status_records"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "immigration_status_history" ADD CONSTRAINT "immigration_status_history_toStatusRecordId_fkey" FOREIGN KEY ("toStatusRecordId") REFERENCES "immigration_status_records"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "immigration_status_history" ADD CONSTRAINT "immigration_status_history_actorIdentityId_fkey" FOREIGN KEY ("actorIdentityId") REFERENCES "identities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "immigration_restrictions" ADD CONSTRAINT "immigration_restrictions_immigrationProfileId_fkey" FOREIGN KEY ("immigrationProfileId") REFERENCES "immigration_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "immigration_restrictions" ADD CONSTRAINT "immigration_restrictions_sourceDecisionId_fkey" FOREIGN KEY ("sourceDecisionId") REFERENCES "government_decisions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "immigration_case_projections" ADD CONSTRAINT "immigration_case_projections_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "cases"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
