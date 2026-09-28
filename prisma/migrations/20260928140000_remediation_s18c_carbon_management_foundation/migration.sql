-- S18C: Carbon Management and Trading Administration foundation

CREATE TYPE "CarbonManagementActorPersona" AS ENUM ('APPLICANT', 'AUTHORIZED_REPRESENTATIVE', 'PROGRAMME_OFFICER', 'EXTERNAL_VERIFIER', 'VERIFICATION_LIAISON', 'AI_ASSISTANCE', 'PAYMENT_SYSTEM', 'TECHNICAL_ADMIN');
CREATE TYPE "CarbonManagementDataClassification" AS ENUM ('PUBLIC_SUMMARY', 'REGULATORY_ACCESS', 'COMMERCIAL_CONFIDENTIAL', 'TECHNICAL_EVIDENCE');
CREATE TYPE "CarbonProgrammeStatus" AS ENUM ('DRAFT', 'ACTIVE', 'SUSPENDED', 'CLOSED');
CREATE TYPE "CarbonProjectStatus" AS ENUM ('DRAFT', 'ACTIVE', 'UNDER_REVIEW', 'SUSPENDED', 'CLOSED');
CREATE TYPE "CarbonExternalVerificationCategory" AS ENUM ('CONFIGURED_CATEGORY', 'METHODOLOGY_DOCUMENTATION', 'BASELINE_EVIDENCE', 'MONITORING_REPORT', 'INDEPENDENT_VERIFICATION', 'REGISTRY_SUBMISSION');
CREATE TYPE "CarbonExternalVerificationStatus" AS ENUM ('PENDING', 'UNDER_REVIEW', 'COMPLETE', 'REQUIRES_RESUBMISSION', 'WAIVED');
CREATE TYPE "CarbonExternalVerificationRecordedBy" AS ENUM ('PROGRAMME_OFFICER', 'VERIFICATION_LIAISON', 'INTEGRATION_SYSTEM', 'EXTERNAL_VERIFIER', 'SYSTEM');
CREATE TYPE "CarbonAdministrativeAuthorizationStatus" AS ENUM ('NOT_ISSUED', 'PENDING_DECISION', 'ISSUED', 'EFFECTIVE', 'SUSPENDED', 'REVOKED', 'EXPIRED');
CREATE TYPE "CarbonRegistryReferenceStatus" AS ENUM ('CONFIGURED', 'ACTIVE', 'SUPERSEDED', 'WITHDRAWN');

CREATE TABLE "carbon_management_configurations" (
    "id" UUID NOT NULL,
    "jurisdictionId" UUID NOT NULL,
    "programmeCategoryTaxonomy" JSONB NOT NULL DEFAULT '[]',
    "projectCategoryTaxonomy" JSONB NOT NULL DEFAULT '[]',
    "verificationCategoryTaxonomy" JSONB NOT NULL DEFAULT '[]',
    "configurableCreditUnitTaxonomy" JSONB NOT NULL DEFAULT '[]',
    "marketMechanicsExtensionModeCode" TEXT NOT NULL DEFAULT 'NOT_CONFIGURED',
    "publicSummaryModeCode" TEXT NOT NULL DEFAULT 'MINIMAL',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "carbon_management_configurations_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "carbon_programme_references" (
    "id" UUID NOT NULL,
    "programmeReferenceNumber" TEXT NOT NULL,
    "jurisdictionId" UUID NOT NULL,
    "programmeCode" TEXT NOT NULL,
    "programmeName" TEXT NOT NULL,
    "configuredProgrammeTypeCode" TEXT,
    "status" "CarbonProgrammeStatus" NOT NULL DEFAULT 'DRAFT',
    "dataClassification" "CarbonManagementDataClassification" NOT NULL DEFAULT 'REGULATORY_ACCESS',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "carbon_programme_references_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "carbon_project_references" (
    "id" UUID NOT NULL,
    "projectReferenceNumber" TEXT NOT NULL,
    "programmeId" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "jurisdictionId" UUID,
    "strategicProjectProfileId" UUID,
    "projectCategoryCode" TEXT NOT NULL,
    "status" "CarbonProjectStatus" NOT NULL DEFAULT 'DRAFT',
    "dataClassification" "CarbonManagementDataClassification" NOT NULL DEFAULT 'REGULATORY_ACCESS',
    "doesNotDuplicateOrganization" BOOLEAN NOT NULL DEFAULT true,
    "doesNotInferApprovalFromStrategicProject" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "carbon_project_references_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "carbon_application_references" (
    "id" UUID NOT NULL,
    "carbonProjectId" UUID NOT NULL,
    "applicationId" UUID,
    "caseId" UUID,
    "serviceCode" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "carbon_application_references_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "carbon_registry_references" (
    "id" UUID NOT NULL,
    "carbonProjectId" UUID NOT NULL,
    "registrySystemCode" TEXT NOT NULL,
    "externalRegistryReference" TEXT NOT NULL,
    "status" "CarbonRegistryReferenceStatus" NOT NULL DEFAULT 'CONFIGURED',
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "provenanceSummary" TEXT,
    "evidenceRecordId" UUID,
    "doesNotImplyGovernmentApproval" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "carbon_registry_references_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "carbon_external_verification_records" (
    "id" UUID NOT NULL,
    "carbonProjectId" UUID NOT NULL,
    "verificationCategory" "CarbonExternalVerificationCategory" NOT NULL,
    "configuredCategoryCode" TEXT,
    "status" "CarbonExternalVerificationStatus" NOT NULL DEFAULT 'PENDING',
    "providerOrganizationId" UUID,
    "verifierIdentityId" UUID,
    "externalReference" TEXT,
    "verificationDate" TIMESTAMP(3),
    "evidenceRecordId" UUID,
    "provenanceSummary" TEXT,
    "recordedBy" "CarbonExternalVerificationRecordedBy" NOT NULL,
    "recordedByIdentityId" UUID,
    "blocksFinalDecision" BOOLEAN NOT NULL DEFAULT false,
    "isOfficialApproval" BOOLEAN NOT NULL DEFAULT false,
    "doesNotSubstituteGovernmentDecision" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "carbon_external_verification_records_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "carbon_project_status_history" (
    "id" UUID NOT NULL,
    "carbonProjectId" UUID NOT NULL,
    "fromStatusCode" TEXT,
    "toStatusCode" TEXT NOT NULL,
    "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actorIdentityId" UUID,
    "actorPersona" "CarbonManagementActorPersona",
    "governmentDecisionId" UUID,
    "reasonSummary" TEXT,

    CONSTRAINT "carbon_project_status_history_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "carbon_administrative_authorization_records" (
    "id" UUID NOT NULL,
    "carbonProjectId" UUID NOT NULL,
    "authorizationReference" TEXT NOT NULL,
    "status" "CarbonAdministrativeAuthorizationStatus" NOT NULL DEFAULT 'NOT_ISSUED',
    "authorizationTypeCode" TEXT,
    "applicationId" UUID,
    "caseId" UUID,
    "governmentDecisionId" UUID,
    "officialInstrumentId" UUID,
    "effectiveFrom" TIMESTAMP(3),
    "effectiveUntil" TIMESTAMP(3),
    "renewalOfAuthorizationId" UUID,
    "doesNotSubstituteGovernmentDecision" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "carbon_administrative_authorization_records_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "carbon_compliance_references" (
    "id" UUID NOT NULL,
    "carbonProjectId" UUID NOT NULL,
    "complianceMatterId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "carbon_compliance_references_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "carbon_data_access_audits" (
    "id" UUID NOT NULL,
    "accessorIdentityId" UUID,
    "carbonProjectId" UUID,
    "externalVerificationId" UUID,
    "classification" "CarbonManagementDataClassification",
    "endpoint" TEXT NOT NULL,
    "granted" BOOLEAN NOT NULL,
    "reasonCode" TEXT,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "carbon_data_access_audits_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "carbon_management_configurations_jurisdictionId_key" ON "carbon_management_configurations"("jurisdictionId");
CREATE UNIQUE INDEX "carbon_programme_references_programmeReferenceNumber_key" ON "carbon_programme_references"("programmeReferenceNumber");
CREATE INDEX "carbon_programme_references_jurisdictionId_idx" ON "carbon_programme_references"("jurisdictionId");
CREATE INDEX "carbon_programme_references_status_idx" ON "carbon_programme_references"("status");

CREATE UNIQUE INDEX "carbon_project_references_projectReferenceNumber_key" ON "carbon_project_references"("projectReferenceNumber");
CREATE INDEX "carbon_project_references_programmeId_idx" ON "carbon_project_references"("programmeId");
CREATE INDEX "carbon_project_references_organizationId_idx" ON "carbon_project_references"("organizationId");
CREATE INDEX "carbon_project_references_jurisdictionId_idx" ON "carbon_project_references"("jurisdictionId");
CREATE INDEX "carbon_project_references_strategicProjectProfileId_idx" ON "carbon_project_references"("strategicProjectProfileId");
CREATE INDEX "carbon_project_references_status_idx" ON "carbon_project_references"("status");

CREATE INDEX "carbon_application_references_carbonProjectId_idx" ON "carbon_application_references"("carbonProjectId");
CREATE INDEX "carbon_application_references_applicationId_idx" ON "carbon_application_references"("applicationId");
CREATE INDEX "carbon_application_references_caseId_idx" ON "carbon_application_references"("caseId");

CREATE INDEX "carbon_registry_references_carbonProjectId_idx" ON "carbon_registry_references"("carbonProjectId");

CREATE INDEX "carbon_external_verification_records_carbonProjectId_idx" ON "carbon_external_verification_records"("carbonProjectId");
CREATE INDEX "carbon_external_verification_records_status_idx" ON "carbon_external_verification_records"("status");

CREATE INDEX "carbon_project_status_history_carbonProjectId_idx" ON "carbon_project_status_history"("carbonProjectId");

CREATE UNIQUE INDEX "carbon_administrative_authorization_records_authorizationReference_key" ON "carbon_administrative_authorization_records"("authorizationReference");
CREATE UNIQUE INDEX "carbon_administrative_authorization_records_renewalOfAuthorizationId_key" ON "carbon_administrative_authorization_records"("renewalOfAuthorizationId");
CREATE INDEX "carbon_administrative_authorization_records_carbonProjectId_idx" ON "carbon_administrative_authorization_records"("carbonProjectId");
CREATE INDEX "carbon_administrative_authorization_records_status_idx" ON "carbon_administrative_authorization_records"("status");

CREATE UNIQUE INDEX "carbon_compliance_references_complianceMatterId_key" ON "carbon_compliance_references"("complianceMatterId");
CREATE INDEX "carbon_compliance_references_carbonProjectId_idx" ON "carbon_compliance_references"("carbonProjectId");

CREATE INDEX "carbon_data_access_audits_accessorIdentityId_idx" ON "carbon_data_access_audits"("accessorIdentityId");
CREATE INDEX "carbon_data_access_audits_carbonProjectId_idx" ON "carbon_data_access_audits"("carbonProjectId");

ALTER TABLE "carbon_management_configurations" ADD CONSTRAINT "carbon_management_configurations_jurisdictionId_fkey" FOREIGN KEY ("jurisdictionId") REFERENCES "jurisdictions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "carbon_programme_references" ADD CONSTRAINT "carbon_programme_references_jurisdictionId_fkey" FOREIGN KEY ("jurisdictionId") REFERENCES "jurisdictions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "carbon_project_references" ADD CONSTRAINT "carbon_project_references_programmeId_fkey" FOREIGN KEY ("programmeId") REFERENCES "carbon_programme_references"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "carbon_project_references" ADD CONSTRAINT "carbon_project_references_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "carbon_project_references" ADD CONSTRAINT "carbon_project_references_jurisdictionId_fkey" FOREIGN KEY ("jurisdictionId") REFERENCES "jurisdictions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "carbon_project_references" ADD CONSTRAINT "carbon_project_references_strategicProjectProfileId_fkey" FOREIGN KEY ("strategicProjectProfileId") REFERENCES "strategic_project_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "carbon_application_references" ADD CONSTRAINT "carbon_application_references_carbonProjectId_fkey" FOREIGN KEY ("carbonProjectId") REFERENCES "carbon_project_references"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "carbon_application_references" ADD CONSTRAINT "carbon_application_references_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "applications"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "carbon_application_references" ADD CONSTRAINT "carbon_application_references_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "cases"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "carbon_registry_references" ADD CONSTRAINT "carbon_registry_references_carbonProjectId_fkey" FOREIGN KEY ("carbonProjectId") REFERENCES "carbon_project_references"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "carbon_registry_references" ADD CONSTRAINT "carbon_registry_references_evidenceRecordId_fkey" FOREIGN KEY ("evidenceRecordId") REFERENCES "evidence_records"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "carbon_external_verification_records" ADD CONSTRAINT "carbon_external_verification_records_carbonProjectId_fkey" FOREIGN KEY ("carbonProjectId") REFERENCES "carbon_project_references"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "carbon_external_verification_records" ADD CONSTRAINT "carbon_external_verification_records_providerOrganizationId_fkey" FOREIGN KEY ("providerOrganizationId") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "carbon_external_verification_records" ADD CONSTRAINT "carbon_external_verification_records_verifierIdentityId_fkey" FOREIGN KEY ("verifierIdentityId") REFERENCES "identities"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "carbon_external_verification_records" ADD CONSTRAINT "carbon_external_verification_records_evidenceRecordId_fkey" FOREIGN KEY ("evidenceRecordId") REFERENCES "evidence_records"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "carbon_external_verification_records" ADD CONSTRAINT "carbon_external_verification_records_recordedByIdentityId_fkey" FOREIGN KEY ("recordedByIdentityId") REFERENCES "identities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "carbon_project_status_history" ADD CONSTRAINT "carbon_project_status_history_carbonProjectId_fkey" FOREIGN KEY ("carbonProjectId") REFERENCES "carbon_project_references"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "carbon_project_status_history" ADD CONSTRAINT "carbon_project_status_history_actorIdentityId_fkey" FOREIGN KEY ("actorIdentityId") REFERENCES "identities"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "carbon_project_status_history" ADD CONSTRAINT "carbon_project_status_history_governmentDecisionId_fkey" FOREIGN KEY ("governmentDecisionId") REFERENCES "government_decisions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "carbon_administrative_authorization_records" ADD CONSTRAINT "carbon_administrative_authorization_records_carbonProjectId_fkey" FOREIGN KEY ("carbonProjectId") REFERENCES "carbon_project_references"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "carbon_administrative_authorization_records" ADD CONSTRAINT "carbon_administrative_authorization_records_governmentDecisionId_fkey" FOREIGN KEY ("governmentDecisionId") REFERENCES "government_decisions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "carbon_administrative_authorization_records" ADD CONSTRAINT "carbon_administrative_authorization_records_officialInstrumentId_fkey" FOREIGN KEY ("officialInstrumentId") REFERENCES "official_instruments"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "carbon_administrative_authorization_records" ADD CONSTRAINT "carbon_administrative_authorization_records_renewalOfAuthorizationId_fkey" FOREIGN KEY ("renewalOfAuthorizationId") REFERENCES "carbon_administrative_authorization_records"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "carbon_compliance_references" ADD CONSTRAINT "carbon_compliance_references_carbonProjectId_fkey" FOREIGN KEY ("carbonProjectId") REFERENCES "carbon_project_references"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "carbon_compliance_references" ADD CONSTRAINT "carbon_compliance_references_complianceMatterId_fkey" FOREIGN KEY ("complianceMatterId") REFERENCES "compliance_matters"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "carbon_data_access_audits" ADD CONSTRAINT "carbon_data_access_audits_accessorIdentityId_fkey" FOREIGN KEY ("accessorIdentityId") REFERENCES "identities"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "carbon_data_access_audits" ADD CONSTRAINT "carbon_data_access_audits_carbonProjectId_fkey" FOREIGN KEY ("carbonProjectId") REFERENCES "carbon_project_references"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "carbon_data_access_audits" ADD CONSTRAINT "carbon_data_access_audits_externalVerificationId_fkey" FOREIGN KEY ("externalVerificationId") REFERENCES "carbon_external_verification_records"("id") ON DELETE SET NULL ON UPDATE CASCADE;
