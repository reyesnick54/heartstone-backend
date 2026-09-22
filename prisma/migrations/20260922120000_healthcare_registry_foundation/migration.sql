-- CreateEnum
CREATE TYPE "HealthcareDataCategory" AS ENUM ('GENERAL_HEALTH', 'CLINICAL', 'MEDICATION', 'LABORATORY', 'IMAGING', 'GENETIC', 'REPRODUCTIVE', 'MENTAL_HEALTH', 'SUBSTANCE_USE', 'RESEARCH', 'HIGHLY_RESTRICTED');

-- CreateEnum
CREATE TYPE "HealthcareDataAccessPurpose" AS ENUM ('PATIENT_SELF', 'GUARDIAN_OR_LEGAL_REPRESENTATIVE', 'TREATING_PROVIDER', 'CARE_TEAM', 'CLINICAL_RESEARCH', 'REGULATORY_OVERSIGHT', 'EMERGENCY_BREAK_GLASS', 'EXPLICIT_PURPOSE_BOUND', 'OTHER_CONFIGURED');

-- CreateEnum
CREATE TYPE "HealthcareOrganizationStatus" AS ENUM ('DRAFT', 'REGISTERED', 'SUSPENDED', 'CLOSED');

-- CreateEnum
CREATE TYPE "HealthcareProfessionalRecordStatus" AS ENUM ('DRAFT', 'ACTIVE', 'SUSPENDED', 'INACTIVE');

-- CreateEnum
CREATE TYPE "HealthcareLicenseStatus" AS ENUM ('PENDING', 'ACTIVE', 'SUSPENDED', 'REVOKED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "HealthcareRegistryEntryStatus" AS ENUM ('DRAFT', 'OFFICIAL', 'SUPERSEDED');

-- CreateEnum
CREATE TYPE "HealthcareRegistryVerificationState" AS ENUM ('UNVERIFIED', 'VERIFIED', 'FAILED', 'REVOKED');

-- CreateEnum
CREATE TYPE "HealthcareRegulatoryStatusKind" AS ENUM ('COMPLIANT', 'CONDITIONAL', 'NON_COMPLIANT', 'UNDER_REVIEW', 'SUSPENDED', 'OTHER_CONFIGURED');

-- CreateEnum
CREATE TYPE "HealthcarePatientRelationshipKind" AS ENUM ('SELF', 'GUARDIAN', 'LEGAL_REPRESENTATIVE', 'TREATING_PROVIDER', 'CARE_TEAM_MEMBER', 'CLINICAL_RESEARCH_CONTACT', 'REGULATORY_CONTACT', 'OTHER_CONFIGURED');

-- CreateEnum
CREATE TYPE "HealthcareBreakGlassSessionStatus" AS ENUM ('ACTIVE', 'EXPIRED', 'REVOKED', 'PENDING_POST_ACCESS_REVIEW', 'REVIEWED');

-- CreateEnum
CREATE TYPE "HealthcareAccessAuditEventType" AS ENUM ('SENSITIVE_READ', 'SEARCH', 'BREAK_GLASS_ACTIVATED', 'BREAK_GLASS_READ', 'POLICY_DENIED');

-- CreateEnum
CREATE TYPE "HealthcareAccessDecision" AS ENUM ('ALLOW', 'DENY');

-- CreateEnum
CREATE TYPE "HealthcareAccreditationSubjectKind" AS ENUM ('ORGANIZATION', 'FACILITY');

-- CreateEnum
CREATE TYPE "HealthcareRegistrySubjectKind" AS ENUM ('PATIENT', 'PROFESSIONAL', 'ORGANIZATION', 'FACILITY');

-- CreateTable
CREATE TABLE "healthcare_jurisdiction_privacy_hooks" (
    "id" UUID NOT NULL,
    "jurisdictionId" UUID NOT NULL,
    "configurationKey" TEXT NOT NULL,
    "externalPolicyPackReference" TEXT NOT NULL,
    "description" TEXT,
    "configurationMetadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "healthcare_jurisdiction_privacy_hooks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "healthcare_organizations" (
    "id" UUID NOT NULL,
    "organizationReference" TEXT NOT NULL,
    "jurisdictionId" UUID NOT NULL,
    "institutionId" UUID,
    "platformOrganizationId" UUID,
    "registeredName" TEXT NOT NULL,
    "status" "HealthcareOrganizationStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "healthcare_organizations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "healthcare_facility_types" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "healthcare_facility_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "healthcare_facilities" (
    "id" UUID NOT NULL,
    "facilityReference" TEXT NOT NULL,
    "healthcareOrganizationId" UUID NOT NULL,
    "facilityTypeId" UUID NOT NULL,
    "displayName" TEXT NOT NULL,
    "operationalStatus" "HealthcareOrganizationStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "healthcare_facilities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "healthcare_service_locations" (
    "id" UUID NOT NULL,
    "locationReference" TEXT NOT NULL,
    "healthcareOrganizationId" UUID NOT NULL,
    "healthcareFacilityId" UUID,
    "label" TEXT NOT NULL,
    "isVirtual" BOOLEAN NOT NULL DEFAULT false,
    "addressSummary" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "healthcare_service_locations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "healthcare_professional_types" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "healthcare_professional_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "healthcare_professionals" (
    "id" UUID NOT NULL,
    "professionalReference" TEXT NOT NULL,
    "professionalTypeId" UUID NOT NULL,
    "linkedPlatformIdentityId" UUID,
    "personId" UUID,
    "recordStatus" "HealthcareProfessionalRecordStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "healthcare_professionals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "healthcare_professional_licenses" (
    "id" UUID NOT NULL,
    "healthcareProfessionalId" UUID NOT NULL,
    "licenseReference" TEXT NOT NULL,
    "licenseTypeCode" TEXT NOT NULL,
    "status" "HealthcareLicenseStatus" NOT NULL DEFAULT 'PENDING',
    "issuedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "applicationId" UUID,
    "caseId" UUID,
    "governmentServiceId" UUID,
    "governmentDecisionId" UUID,
    "authorityEvaluationRecordId" UUID,
    "issuanceEventId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "healthcare_professional_licenses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "healthcare_professional_specialties" (
    "id" UUID NOT NULL,
    "healthcareProfessionalId" UUID NOT NULL,
    "specialtyCode" TEXT NOT NULL,
    "effectiveFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "effectiveTo" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "healthcare_professional_specialties_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "healthcare_professional_credential_references" (
    "id" UUID NOT NULL,
    "healthcareProfessionalId" UUID NOT NULL,
    "credentialKind" TEXT NOT NULL,
    "externalReference" TEXT NOT NULL,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "healthcare_professional_credential_references_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "healthcare_professional_status_history" (
    "id" UUID NOT NULL,
    "healthcareProfessionalId" UUID NOT NULL,
    "fromStatus" "HealthcareProfessionalRecordStatus",
    "toStatus" "HealthcareProfessionalRecordStatus" NOT NULL,
    "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actorIdentityId" UUID,
    "reasonSummary" TEXT,

    CONSTRAINT "healthcare_professional_status_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "healthcare_accreditations" (
    "id" UUID NOT NULL,
    "subjectKind" "HealthcareAccreditationSubjectKind" NOT NULL,
    "healthcareOrganizationId" UUID,
    "healthcareFacilityId" UUID,
    "accreditationBodyReference" TEXT NOT NULL,
    "statusCode" TEXT NOT NULL,
    "effectiveFrom" TIMESTAMP(3) NOT NULL,
    "effectiveTo" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "healthcare_accreditations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "healthcare_facility_licenses" (
    "id" UUID NOT NULL,
    "healthcareFacilityId" UUID NOT NULL,
    "licenseReference" TEXT NOT NULL,
    "licenseTypeCode" TEXT NOT NULL,
    "status" "HealthcareLicenseStatus" NOT NULL DEFAULT 'PENDING',
    "issuedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "applicationId" UUID,
    "caseId" UUID,
    "governmentServiceId" UUID,
    "governmentDecisionId" UUID,
    "authorityEvaluationRecordId" UUID,
    "issuanceEventId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "healthcare_facility_licenses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "healthcare_regulatory_statuses" (
    "id" UUID NOT NULL,
    "statusKind" "HealthcareRegulatoryStatusKind" NOT NULL,
    "healthcareOrganizationId" UUID,
    "healthcareFacilityId" UUID,
    "healthcareProfessionalId" UUID,
    "regulatoryAuthorityReference" TEXT NOT NULL,
    "effectiveFrom" TIMESTAMP(3) NOT NULL,
    "effectiveTo" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "healthcare_regulatory_statuses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "patient_health_identities" (
    "id" UUID NOT NULL,
    "patientReference" TEXT NOT NULL,
    "jurisdictionId" UUID NOT NULL,
    "linkedPlatformIdentityId" UUID,
    "personId" UUID,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "patient_health_identities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "patient_healthcare_relationships" (
    "id" UUID NOT NULL,
    "patientHealthIdentityId" UUID NOT NULL,
    "relationshipKind" "HealthcarePatientRelationshipKind" NOT NULL,
    "relatedPlatformIdentityId" UUID,
    "healthcareProfessionalId" UUID,
    "healthcareOrganizationId" UUID,
    "effectiveFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "effectiveTo" TIMESTAMP(3),
    "purposeScope" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "patient_healthcare_relationships_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "healthcare_identifier_references" (
    "id" UUID NOT NULL,
    "patientHealthIdentityId" UUID NOT NULL,
    "identifierSystem" TEXT NOT NULL,
    "identifierValue" TEXT NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "healthcare_identifier_references_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "healthcare_registry_entries" (
    "id" UUID NOT NULL,
    "entryReference" TEXT NOT NULL,
    "subjectKind" "HealthcareRegistrySubjectKind" NOT NULL,
    "patientHealthIdentityId" UUID,
    "healthcareProfessionalId" UUID,
    "healthcareOrganizationId" UUID,
    "healthcareFacilityId" UUID,
    "jurisdictionId" UUID NOT NULL,
    "institutionId" UUID NOT NULL,
    "caseId" UUID NOT NULL,
    "governmentDecisionId" UUID NOT NULL,
    "authorityEvaluationRecordId" UUID NOT NULL,
    "status" "HealthcareRegistryEntryStatus" NOT NULL DEFAULT 'DRAFT',
    "registeredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "healthcare_registry_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "healthcare_registry_verifications" (
    "id" UUID NOT NULL,
    "healthcareRegistryEntryId" UUID NOT NULL,
    "verificationState" "HealthcareRegistryVerificationState" NOT NULL,
    "methodReference" TEXT NOT NULL,
    "verifiedAt" TIMESTAMP(3),
    "verifiedByIdentityId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "healthcare_registry_verifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "healthcare_registry_status_history" (
    "id" UUID NOT NULL,
    "healthcareRegistryEntryId" UUID NOT NULL,
    "fromStatus" "HealthcareRegistryEntryStatus",
    "toStatus" "HealthcareRegistryEntryStatus" NOT NULL,
    "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reasonSummary" TEXT,

    CONSTRAINT "healthcare_registry_status_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "healthcare_data_access_policies" (
    "id" UUID NOT NULL,
    "policyKey" TEXT NOT NULL,
    "jurisdictionPrivacyHookId" UUID,
    "institutionId" UUID,
    "accessPurpose" "HealthcareDataAccessPurpose" NOT NULL,
    "allowedDataCategories" "HealthcareDataCategory"[],
    "allowedRelationshipKinds" "HealthcarePatientRelationshipKind"[],
    "requiresExplicitConsent" BOOLEAN NOT NULL DEFAULT false,
    "requiresActiveProfessionalLicense" BOOLEAN NOT NULL DEFAULT false,
    "requiresTreatingRelationship" BOOLEAN NOT NULL DEFAULT false,
    "requiresInstitutionMembership" BOOLEAN NOT NULL DEFAULT false,
    "legalOrRegulatoryBasisReference" TEXT,
    "priority" INTEGER NOT NULL DEFAULT 100,
    "effectiveFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "effectiveTo" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "healthcare_data_access_policies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "healthcare_data_access_consents" (
    "id" UUID NOT NULL,
    "patientHealthIdentityId" UUID NOT NULL,
    "grantedToPlatformIdentityId" UUID,
    "grantedToProfessionalId" UUID,
    "purpose" "HealthcareDataAccessPurpose" NOT NULL,
    "dataCategories" "HealthcareDataCategory"[],
    "legalBasisReference" TEXT,
    "effectiveFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "effectiveTo" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "healthcare_data_access_consents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "healthcare_break_glass_access_sessions" (
    "id" UUID NOT NULL,
    "sessionReference" TEXT NOT NULL,
    "actorIdentityId" UUID NOT NULL,
    "patientHealthIdentityId" UUID NOT NULL,
    "resourceScope" JSONB NOT NULL DEFAULT '{}',
    "reasonSummary" TEXT NOT NULL,
    "policyBasisReference" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "status" "HealthcareBreakGlassSessionStatus" NOT NULL DEFAULT 'ACTIVE',
    "requiresPostAccessReview" BOOLEAN NOT NULL DEFAULT true,
    "activatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMP(3),
    "reviewedAt" TIMESTAMP(3),

    CONSTRAINT "healthcare_break_glass_access_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "healthcare_access_audit_events" (
    "id" UUID NOT NULL,
    "eventType" "HealthcareAccessAuditEventType" NOT NULL,
    "decision" "HealthcareAccessDecision" NOT NULL,
    "actorIdentityId" UUID,
    "patientHealthIdentityId" UUID,
    "dataCategory" "HealthcareDataCategory",
    "accessPurpose" "HealthcareDataAccessPurpose",
    "policyId" UUID,
    "breakGlassSessionId" UUID,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "healthcare_access_audit_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "healthcare_jurisdiction_privacy_hooks_jurisdictionId_idx" ON "healthcare_jurisdiction_privacy_hooks"("jurisdictionId");

-- CreateIndex
CREATE UNIQUE INDEX "healthcare_jurisdiction_privacy_hooks_jurisdictionId_config_key" ON "healthcare_jurisdiction_privacy_hooks"("jurisdictionId", "configurationKey");

-- CreateIndex
CREATE UNIQUE INDEX "healthcare_organizations_organizationReference_key" ON "healthcare_organizations"("organizationReference");

-- CreateIndex
CREATE INDEX "healthcare_organizations_jurisdictionId_idx" ON "healthcare_organizations"("jurisdictionId");

-- CreateIndex
CREATE INDEX "healthcare_organizations_institutionId_idx" ON "healthcare_organizations"("institutionId");

-- CreateIndex
CREATE INDEX "healthcare_organizations_platformOrganizationId_idx" ON "healthcare_organizations"("platformOrganizationId");

-- CreateIndex
CREATE INDEX "healthcare_organizations_status_idx" ON "healthcare_organizations"("status");

-- CreateIndex
CREATE UNIQUE INDEX "healthcare_facility_types_code_key" ON "healthcare_facility_types"("code");

-- CreateIndex
CREATE UNIQUE INDEX "healthcare_facilities_facilityReference_key" ON "healthcare_facilities"("facilityReference");

-- CreateIndex
CREATE INDEX "healthcare_facilities_healthcareOrganizationId_idx" ON "healthcare_facilities"("healthcareOrganizationId");

-- CreateIndex
CREATE INDEX "healthcare_facilities_facilityTypeId_idx" ON "healthcare_facilities"("facilityTypeId");

-- CreateIndex
CREATE UNIQUE INDEX "healthcare_service_locations_locationReference_key" ON "healthcare_service_locations"("locationReference");

-- CreateIndex
CREATE INDEX "healthcare_service_locations_healthcareOrganizationId_idx" ON "healthcare_service_locations"("healthcareOrganizationId");

-- CreateIndex
CREATE INDEX "healthcare_service_locations_healthcareFacilityId_idx" ON "healthcare_service_locations"("healthcareFacilityId");

-- CreateIndex
CREATE UNIQUE INDEX "healthcare_professional_types_code_key" ON "healthcare_professional_types"("code");

-- CreateIndex
CREATE UNIQUE INDEX "healthcare_professionals_professionalReference_key" ON "healthcare_professionals"("professionalReference");

-- CreateIndex
CREATE INDEX "healthcare_professionals_professionalTypeId_idx" ON "healthcare_professionals"("professionalTypeId");

-- CreateIndex
CREATE INDEX "healthcare_professionals_linkedPlatformIdentityId_idx" ON "healthcare_professionals"("linkedPlatformIdentityId");

-- CreateIndex
CREATE INDEX "healthcare_professionals_personId_idx" ON "healthcare_professionals"("personId");

-- CreateIndex
CREATE INDEX "healthcare_professionals_recordStatus_idx" ON "healthcare_professionals"("recordStatus");

-- CreateIndex
CREATE UNIQUE INDEX "healthcare_professional_licenses_licenseReference_key" ON "healthcare_professional_licenses"("licenseReference");

-- CreateIndex
CREATE INDEX "healthcare_professional_licenses_healthcareProfessionalId_idx" ON "healthcare_professional_licenses"("healthcareProfessionalId");

-- CreateIndex
CREATE INDEX "healthcare_professional_licenses_status_idx" ON "healthcare_professional_licenses"("status");

-- CreateIndex
CREATE INDEX "healthcare_professional_licenses_expiresAt_idx" ON "healthcare_professional_licenses"("expiresAt");

-- CreateIndex
CREATE INDEX "healthcare_professional_specialties_healthcareProfessionalI_idx" ON "healthcare_professional_specialties"("healthcareProfessionalId");

-- CreateIndex
CREATE INDEX "healthcare_professional_credential_references_healthcarePro_idx" ON "healthcare_professional_credential_references"("healthcareProfessionalId");

-- CreateIndex
CREATE INDEX "healthcare_professional_status_history_healthcareProfession_idx" ON "healthcare_professional_status_history"("healthcareProfessionalId");

-- CreateIndex
CREATE INDEX "healthcare_accreditations_healthcareOrganizationId_idx" ON "healthcare_accreditations"("healthcareOrganizationId");

-- CreateIndex
CREATE INDEX "healthcare_accreditations_healthcareFacilityId_idx" ON "healthcare_accreditations"("healthcareFacilityId");

-- CreateIndex
CREATE UNIQUE INDEX "healthcare_facility_licenses_licenseReference_key" ON "healthcare_facility_licenses"("licenseReference");

-- CreateIndex
CREATE INDEX "healthcare_facility_licenses_healthcareFacilityId_idx" ON "healthcare_facility_licenses"("healthcareFacilityId");

-- CreateIndex
CREATE INDEX "healthcare_facility_licenses_status_idx" ON "healthcare_facility_licenses"("status");

-- CreateIndex
CREATE INDEX "healthcare_regulatory_statuses_healthcareOrganizationId_idx" ON "healthcare_regulatory_statuses"("healthcareOrganizationId");

-- CreateIndex
CREATE INDEX "healthcare_regulatory_statuses_healthcareFacilityId_idx" ON "healthcare_regulatory_statuses"("healthcareFacilityId");

-- CreateIndex
CREATE INDEX "healthcare_regulatory_statuses_healthcareProfessionalId_idx" ON "healthcare_regulatory_statuses"("healthcareProfessionalId");

-- CreateIndex
CREATE UNIQUE INDEX "patient_health_identities_patientReference_key" ON "patient_health_identities"("patientReference");

-- CreateIndex
CREATE INDEX "patient_health_identities_jurisdictionId_idx" ON "patient_health_identities"("jurisdictionId");

-- CreateIndex
CREATE INDEX "patient_health_identities_linkedPlatformIdentityId_idx" ON "patient_health_identities"("linkedPlatformIdentityId");

-- CreateIndex
CREATE INDEX "patient_health_identities_personId_idx" ON "patient_health_identities"("personId");

-- CreateIndex
CREATE INDEX "patient_healthcare_relationships_patientHealthIdentityId_idx" ON "patient_healthcare_relationships"("patientHealthIdentityId");

-- CreateIndex
CREATE INDEX "patient_healthcare_relationships_relatedPlatformIdentityId_idx" ON "patient_healthcare_relationships"("relatedPlatformIdentityId");

-- CreateIndex
CREATE INDEX "patient_healthcare_relationships_healthcareProfessionalId_idx" ON "patient_healthcare_relationships"("healthcareProfessionalId");

-- CreateIndex
CREATE INDEX "patient_healthcare_relationships_healthcareOrganizationId_idx" ON "patient_healthcare_relationships"("healthcareOrganizationId");

-- CreateIndex
CREATE INDEX "healthcare_identifier_references_patientHealthIdentityId_idx" ON "healthcare_identifier_references"("patientHealthIdentityId");

-- CreateIndex
CREATE UNIQUE INDEX "healthcare_identifier_references_identifierSystem_identifie_key" ON "healthcare_identifier_references"("identifierSystem", "identifierValue");

-- CreateIndex
CREATE UNIQUE INDEX "healthcare_registry_entries_entryReference_key" ON "healthcare_registry_entries"("entryReference");

-- CreateIndex
CREATE INDEX "healthcare_registry_entries_patientHealthIdentityId_idx" ON "healthcare_registry_entries"("patientHealthIdentityId");

-- CreateIndex
CREATE INDEX "healthcare_registry_entries_healthcareProfessionalId_idx" ON "healthcare_registry_entries"("healthcareProfessionalId");

-- CreateIndex
CREATE INDEX "healthcare_registry_entries_healthcareOrganizationId_idx" ON "healthcare_registry_entries"("healthcareOrganizationId");

-- CreateIndex
CREATE INDEX "healthcare_registry_entries_caseId_idx" ON "healthcare_registry_entries"("caseId");

-- CreateIndex
CREATE INDEX "healthcare_registry_entries_status_idx" ON "healthcare_registry_entries"("status");

-- CreateIndex
CREATE INDEX "healthcare_registry_verifications_healthcareRegistryEntryId_idx" ON "healthcare_registry_verifications"("healthcareRegistryEntryId");

-- CreateIndex
CREATE INDEX "healthcare_registry_status_history_healthcareRegistryEntryI_idx" ON "healthcare_registry_status_history"("healthcareRegistryEntryId");

-- CreateIndex
CREATE UNIQUE INDEX "healthcare_data_access_policies_policyKey_key" ON "healthcare_data_access_policies"("policyKey");

-- CreateIndex
CREATE INDEX "healthcare_data_access_policies_accessPurpose_idx" ON "healthcare_data_access_policies"("accessPurpose");

-- CreateIndex
CREATE INDEX "healthcare_data_access_policies_institutionId_idx" ON "healthcare_data_access_policies"("institutionId");

-- CreateIndex
CREATE INDEX "healthcare_data_access_consents_patientHealthIdentityId_idx" ON "healthcare_data_access_consents"("patientHealthIdentityId");

-- CreateIndex
CREATE UNIQUE INDEX "healthcare_break_glass_access_sessions_sessionReference_key" ON "healthcare_break_glass_access_sessions"("sessionReference");

-- CreateIndex
CREATE INDEX "healthcare_break_glass_access_sessions_actorIdentityId_idx" ON "healthcare_break_glass_access_sessions"("actorIdentityId");

-- CreateIndex
CREATE INDEX "healthcare_break_glass_access_sessions_patientHealthIdentit_idx" ON "healthcare_break_glass_access_sessions"("patientHealthIdentityId");

-- CreateIndex
CREATE INDEX "healthcare_break_glass_access_sessions_status_idx" ON "healthcare_break_glass_access_sessions"("status");

-- CreateIndex
CREATE INDEX "healthcare_break_glass_access_sessions_expiresAt_idx" ON "healthcare_break_glass_access_sessions"("expiresAt");

-- CreateIndex
CREATE INDEX "healthcare_access_audit_events_patientHealthIdentityId_idx" ON "healthcare_access_audit_events"("patientHealthIdentityId");

-- CreateIndex
CREATE INDEX "healthcare_access_audit_events_actorIdentityId_idx" ON "healthcare_access_audit_events"("actorIdentityId");

-- CreateIndex
CREATE INDEX "healthcare_access_audit_events_eventType_idx" ON "healthcare_access_audit_events"("eventType");

-- CreateIndex
CREATE INDEX "healthcare_access_audit_events_recordedAt_idx" ON "healthcare_access_audit_events"("recordedAt");

-- AddForeignKey
ALTER TABLE "healthcare_jurisdiction_privacy_hooks" ADD CONSTRAINT "healthcare_jurisdiction_privacy_hooks_jurisdictionId_fkey" FOREIGN KEY ("jurisdictionId") REFERENCES "jurisdictions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "healthcare_organizations" ADD CONSTRAINT "healthcare_organizations_jurisdictionId_fkey" FOREIGN KEY ("jurisdictionId") REFERENCES "jurisdictions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "healthcare_organizations" ADD CONSTRAINT "healthcare_organizations_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "institutions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "healthcare_organizations" ADD CONSTRAINT "healthcare_organizations_platformOrganizationId_fkey" FOREIGN KEY ("platformOrganizationId") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "healthcare_facilities" ADD CONSTRAINT "healthcare_facilities_healthcareOrganizationId_fkey" FOREIGN KEY ("healthcareOrganizationId") REFERENCES "healthcare_organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "healthcare_facilities" ADD CONSTRAINT "healthcare_facilities_facilityTypeId_fkey" FOREIGN KEY ("facilityTypeId") REFERENCES "healthcare_facility_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "healthcare_service_locations" ADD CONSTRAINT "healthcare_service_locations_healthcareOrganizationId_fkey" FOREIGN KEY ("healthcareOrganizationId") REFERENCES "healthcare_organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "healthcare_service_locations" ADD CONSTRAINT "healthcare_service_locations_healthcareFacilityId_fkey" FOREIGN KEY ("healthcareFacilityId") REFERENCES "healthcare_facilities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "healthcare_professionals" ADD CONSTRAINT "healthcare_professionals_professionalTypeId_fkey" FOREIGN KEY ("professionalTypeId") REFERENCES "healthcare_professional_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "healthcare_professionals" ADD CONSTRAINT "healthcare_professionals_linkedPlatformIdentityId_fkey" FOREIGN KEY ("linkedPlatformIdentityId") REFERENCES "identities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "healthcare_professionals" ADD CONSTRAINT "healthcare_professionals_personId_fkey" FOREIGN KEY ("personId") REFERENCES "persons"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "healthcare_professional_licenses" ADD CONSTRAINT "healthcare_professional_licenses_healthcareProfessionalId_fkey" FOREIGN KEY ("healthcareProfessionalId") REFERENCES "healthcare_professionals"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "healthcare_professional_licenses" ADD CONSTRAINT "healthcare_professional_licenses_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "applications"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "healthcare_professional_licenses" ADD CONSTRAINT "healthcare_professional_licenses_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "cases"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "healthcare_professional_licenses" ADD CONSTRAINT "healthcare_professional_licenses_governmentServiceId_fkey" FOREIGN KEY ("governmentServiceId") REFERENCES "government_services"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "healthcare_professional_licenses" ADD CONSTRAINT "healthcare_professional_licenses_governmentDecisionId_fkey" FOREIGN KEY ("governmentDecisionId") REFERENCES "government_decisions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "healthcare_professional_licenses" ADD CONSTRAINT "healthcare_professional_licenses_authorityEvaluationRecord_fkey" FOREIGN KEY ("authorityEvaluationRecordId") REFERENCES "authority_evaluation_records"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "healthcare_professional_licenses" ADD CONSTRAINT "healthcare_professional_licenses_issuanceEventId_fkey" FOREIGN KEY ("issuanceEventId") REFERENCES "issuance_events"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "healthcare_professional_specialties" ADD CONSTRAINT "healthcare_professional_specialties_healthcareProfessional_fkey" FOREIGN KEY ("healthcareProfessionalId") REFERENCES "healthcare_professionals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "healthcare_professional_credential_references" ADD CONSTRAINT "healthcare_professional_credential_references_healthcarePr_fkey" FOREIGN KEY ("healthcareProfessionalId") REFERENCES "healthcare_professionals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "healthcare_professional_status_history" ADD CONSTRAINT "healthcare_professional_status_history_healthcareProfessio_fkey" FOREIGN KEY ("healthcareProfessionalId") REFERENCES "healthcare_professionals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "healthcare_professional_status_history" ADD CONSTRAINT "healthcare_professional_status_history_actorIdentityId_fkey" FOREIGN KEY ("actorIdentityId") REFERENCES "identities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "healthcare_accreditations" ADD CONSTRAINT "healthcare_accreditations_healthcareOrganizationId_fkey" FOREIGN KEY ("healthcareOrganizationId") REFERENCES "healthcare_organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "healthcare_accreditations" ADD CONSTRAINT "healthcare_accreditations_healthcareFacilityId_fkey" FOREIGN KEY ("healthcareFacilityId") REFERENCES "healthcare_facilities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "healthcare_facility_licenses" ADD CONSTRAINT "healthcare_facility_licenses_healthcareFacilityId_fkey" FOREIGN KEY ("healthcareFacilityId") REFERENCES "healthcare_facilities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "healthcare_facility_licenses" ADD CONSTRAINT "healthcare_facility_licenses_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "applications"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "healthcare_facility_licenses" ADD CONSTRAINT "healthcare_facility_licenses_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "cases"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "healthcare_facility_licenses" ADD CONSTRAINT "healthcare_facility_licenses_governmentServiceId_fkey" FOREIGN KEY ("governmentServiceId") REFERENCES "government_services"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "healthcare_facility_licenses" ADD CONSTRAINT "healthcare_facility_licenses_governmentDecisionId_fkey" FOREIGN KEY ("governmentDecisionId") REFERENCES "government_decisions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "healthcare_facility_licenses" ADD CONSTRAINT "healthcare_facility_licenses_authorityEvaluationRecordId_fkey" FOREIGN KEY ("authorityEvaluationRecordId") REFERENCES "authority_evaluation_records"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "healthcare_facility_licenses" ADD CONSTRAINT "healthcare_facility_licenses_issuanceEventId_fkey" FOREIGN KEY ("issuanceEventId") REFERENCES "issuance_events"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "healthcare_regulatory_statuses" ADD CONSTRAINT "healthcare_regulatory_statuses_healthcareOrganizationId_fkey" FOREIGN KEY ("healthcareOrganizationId") REFERENCES "healthcare_organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "healthcare_regulatory_statuses" ADD CONSTRAINT "healthcare_regulatory_statuses_healthcareFacilityId_fkey" FOREIGN KEY ("healthcareFacilityId") REFERENCES "healthcare_facilities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "healthcare_regulatory_statuses" ADD CONSTRAINT "healthcare_regulatory_statuses_healthcareProfessionalId_fkey" FOREIGN KEY ("healthcareProfessionalId") REFERENCES "healthcare_professionals"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patient_health_identities" ADD CONSTRAINT "patient_health_identities_jurisdictionId_fkey" FOREIGN KEY ("jurisdictionId") REFERENCES "jurisdictions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patient_health_identities" ADD CONSTRAINT "patient_health_identities_linkedPlatformIdentityId_fkey" FOREIGN KEY ("linkedPlatformIdentityId") REFERENCES "identities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patient_health_identities" ADD CONSTRAINT "patient_health_identities_personId_fkey" FOREIGN KEY ("personId") REFERENCES "persons"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patient_healthcare_relationships" ADD CONSTRAINT "patient_healthcare_relationships_patientHealthIdentityId_fkey" FOREIGN KEY ("patientHealthIdentityId") REFERENCES "patient_health_identities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patient_healthcare_relationships" ADD CONSTRAINT "patient_healthcare_relationships_relatedPlatformIdentityId_fkey" FOREIGN KEY ("relatedPlatformIdentityId") REFERENCES "identities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patient_healthcare_relationships" ADD CONSTRAINT "patient_healthcare_relationships_healthcareProfessionalId_fkey" FOREIGN KEY ("healthcareProfessionalId") REFERENCES "healthcare_professionals"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patient_healthcare_relationships" ADD CONSTRAINT "patient_healthcare_relationships_healthcareOrganizationId_fkey" FOREIGN KEY ("healthcareOrganizationId") REFERENCES "healthcare_organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "healthcare_identifier_references" ADD CONSTRAINT "healthcare_identifier_references_patientHealthIdentityId_fkey" FOREIGN KEY ("patientHealthIdentityId") REFERENCES "patient_health_identities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "healthcare_registry_entries" ADD CONSTRAINT "healthcare_registry_entries_patientHealthIdentityId_fkey" FOREIGN KEY ("patientHealthIdentityId") REFERENCES "patient_health_identities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "healthcare_registry_entries" ADD CONSTRAINT "healthcare_registry_entries_healthcareProfessionalId_fkey" FOREIGN KEY ("healthcareProfessionalId") REFERENCES "healthcare_professionals"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "healthcare_registry_entries" ADD CONSTRAINT "healthcare_registry_entries_healthcareOrganizationId_fkey" FOREIGN KEY ("healthcareOrganizationId") REFERENCES "healthcare_organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "healthcare_registry_entries" ADD CONSTRAINT "healthcare_registry_entries_healthcareFacilityId_fkey" FOREIGN KEY ("healthcareFacilityId") REFERENCES "healthcare_facilities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "healthcare_registry_entries" ADD CONSTRAINT "healthcare_registry_entries_jurisdictionId_fkey" FOREIGN KEY ("jurisdictionId") REFERENCES "jurisdictions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "healthcare_registry_entries" ADD CONSTRAINT "healthcare_registry_entries_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "institutions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "healthcare_registry_entries" ADD CONSTRAINT "healthcare_registry_entries_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "cases"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "healthcare_registry_entries" ADD CONSTRAINT "healthcare_registry_entries_governmentDecisionId_fkey" FOREIGN KEY ("governmentDecisionId") REFERENCES "government_decisions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "healthcare_registry_entries" ADD CONSTRAINT "healthcare_registry_entries_authorityEvaluationRecordId_fkey" FOREIGN KEY ("authorityEvaluationRecordId") REFERENCES "authority_evaluation_records"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "healthcare_registry_verifications" ADD CONSTRAINT "healthcare_registry_verifications_healthcareRegistryEntryI_fkey" FOREIGN KEY ("healthcareRegistryEntryId") REFERENCES "healthcare_registry_entries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "healthcare_registry_verifications" ADD CONSTRAINT "healthcare_registry_verifications_verifiedByIdentityId_fkey" FOREIGN KEY ("verifiedByIdentityId") REFERENCES "identities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "healthcare_registry_status_history" ADD CONSTRAINT "healthcare_registry_status_history_healthcareRegistryEntry_fkey" FOREIGN KEY ("healthcareRegistryEntryId") REFERENCES "healthcare_registry_entries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "healthcare_data_access_policies" ADD CONSTRAINT "healthcare_data_access_policies_jurisdictionPrivacyHookId_fkey" FOREIGN KEY ("jurisdictionPrivacyHookId") REFERENCES "healthcare_jurisdiction_privacy_hooks"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "healthcare_data_access_policies" ADD CONSTRAINT "healthcare_data_access_policies_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "institutions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "healthcare_data_access_consents" ADD CONSTRAINT "healthcare_data_access_consents_patientHealthIdentityId_fkey" FOREIGN KEY ("patientHealthIdentityId") REFERENCES "patient_health_identities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "healthcare_data_access_consents" ADD CONSTRAINT "healthcare_data_access_consents_grantedToPlatformIdentityI_fkey" FOREIGN KEY ("grantedToPlatformIdentityId") REFERENCES "identities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "healthcare_data_access_consents" ADD CONSTRAINT "healthcare_data_access_consents_grantedToProfessionalId_fkey" FOREIGN KEY ("grantedToProfessionalId") REFERENCES "healthcare_professionals"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "healthcare_break_glass_access_sessions" ADD CONSTRAINT "healthcare_break_glass_access_sessions_actorIdentityId_fkey" FOREIGN KEY ("actorIdentityId") REFERENCES "identities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "healthcare_break_glass_access_sessions" ADD CONSTRAINT "healthcare_break_glass_access_sessions_patientHealthIdenti_fkey" FOREIGN KEY ("patientHealthIdentityId") REFERENCES "patient_health_identities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "healthcare_access_audit_events" ADD CONSTRAINT "healthcare_access_audit_events_actorIdentityId_fkey" FOREIGN KEY ("actorIdentityId") REFERENCES "identities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "healthcare_access_audit_events" ADD CONSTRAINT "healthcare_access_audit_events_patientHealthIdentityId_fkey" FOREIGN KEY ("patientHealthIdentityId") REFERENCES "patient_health_identities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "healthcare_access_audit_events" ADD CONSTRAINT "healthcare_access_audit_events_policyId_fkey" FOREIGN KEY ("policyId") REFERENCES "healthcare_data_access_policies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "healthcare_access_audit_events" ADD CONSTRAINT "healthcare_access_audit_events_breakGlassSessionId_fkey" FOREIGN KEY ("breakGlassSessionId") REFERENCES "healthcare_break_glass_access_sessions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

