-- Phase 11E: Integration Registry, Dependencies and Authoritative Source Catalog

CREATE TYPE "TechnologyDependencyCategory" AS ENUM (
  'IDENTITY',
  'APPLICATION',
  'CASE_MANAGEMENT',
  'GOVERNMENT_REGISTRY',
  'PROFESSIONAL_REGISTRY',
  'PAYMENT_BANKING',
  'DOCUMENT_RECORDS',
  'GEOSPATIAL_LAND',
  'PLANNING',
  'ENVIRONMENT',
  'CUSTOMS',
  'TAX',
  'IMMIGRATION',
  'CORPORATE',
  'LABOUR',
  'HEALTH',
  'MARITIME',
  'TOURISM',
  'LICENSING',
  'SIGNATURE_SEAL_TIMESTAMP',
  'NOTIFICATION',
  'HOSTING',
  'TELECOM',
  'CYBERSECURITY',
  'DIGITAL_TWIN',
  'ANALYTICS',
  'AI_MODEL',
  'BACKUP_ARCHIVAL',
  'SOURCE_CODE_DEPLOYMENT',
  'VENDOR',
  'OTHER'
);

CREATE TYPE "IntegrationDefinitionStatus" AS ENUM (
  'DRAFT',
  'REGISTERED',
  'ACTIVE',
  'SUSPENDED',
  'RETIRED'
);

CREATE TYPE "IntegrationVersionStatus" AS ENUM (
  'DRAFT',
  'CONFIGURED',
  'TESTING',
  'ACTIVE',
  'SUPERSEDED',
  'SUSPENDED',
  'RETIRED'
);

CREATE TYPE "IntegrationDirection" AS ENUM (
  'INBOUND',
  'OUTBOUND',
  'BIDIRECTIONAL',
  'QUERY_ONLY',
  'EVENT_ONLY'
);

CREATE TYPE "AuthoritativeSourceStatus" AS ENUM (
  'AUTHORITATIVE',
  'IMPLEMENTING',
  'SUPPORTING',
  'REFERENCE_ONLY',
  'APPLICANT_PROVIDED',
  'PROFESSIONALLY_ISSUED',
  'THIRD_PARTY_REPORTED',
  'DERIVED',
  'MODELED',
  'UNVERIFIED'
);

CREATE TYPE "IntegrationAcceptanceState" AS ENUM (
  'DISCOVERED',
  'DESIGNED',
  'CONFIGURED',
  'TECHNICALLY_CONNECTED',
  'TESTED',
  'SECURITY_APPROVED',
  'PRIVACY_APPROVED',
  'INSTITUTIONALLY_ACCEPTED',
  'ACTIVE',
  'SUSPENDED',
  'RETIRED'
);

CREATE TYPE "IntegrationApprovalType" AS ENUM (
  'INSTITUTIONAL',
  'SECURITY',
  'PRIVACY',
  'RECORDS',
  'LEGAL',
  'TECHNICAL',
  'DATA_OWNER',
  'VENDOR',
  'GOVERNMENT'
);

CREATE TYPE "IntegrationApprovalStatus" AS ENUM (
  'PENDING',
  'APPROVED',
  'REJECTED',
  'WITHDRAWN'
);

CREATE TYPE "DataExchangeFieldClassification" AS ENUM (
  'PERMITTED',
  'PROHIBITED'
);

CREATE TYPE "FieldAuthorityConflictBehavior" AS ENUM (
  'REJECT_CONFLICT',
  'FLAG_FOR_REVIEW',
  'PREFER_DESIGNATED_SOURCE',
  'DEFER_TO_INSTITUTIONAL_DECISION'
);

CREATE TYPE "CredentialRotationStatus" AS ENUM (
  'CURRENT',
  'DUE_FOR_ROTATION',
  'ROTATION_IN_PROGRESS',
  'EXPIRED',
  'REVOKED'
);

CREATE TYPE "AuthoritativeDesignationStatus" AS ENUM (
  'DRAFT',
  'PROPOSED',
  'ACTIVE',
  'SUSPENDED',
  'REVOKED',
  'SUPERSEDED'
);

CREATE TYPE "TechnologyDependencyStatus" AS ENUM (
  'ACTIVE',
  'SUSPENDED',
  'RETIRED'
);

CREATE TABLE "technology_dependencies" (
  "id" UUID NOT NULL,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "category" "TechnologyDependencyCategory" NOT NULL,
  "vendor" TEXT,
  "versionLabel" TEXT,
  "status" "TechnologyDependencyStatus" NOT NULL DEFAULT 'ACTIVE',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "technology_dependencies_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "integration_definitions" (
  "id" UUID NOT NULL,
  "integrationCode" TEXT NOT NULL,
  "officialName" TEXT NOT NULL,
  "description" TEXT,
  "institutionalOwnerId" UUID NOT NULL,
  "systemOwner" TEXT NOT NULL,
  "provider" TEXT NOT NULL,
  "dependencyCategory" "TechnologyDependencyCategory" NOT NULL,
  "businessPurpose" TEXT NOT NULL,
  "status" "IntegrationDefinitionStatus" NOT NULL DEFAULT 'DRAFT',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "integration_definitions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "integration_versions" (
  "id" UUID NOT NULL,
  "integrationDefinitionId" UUID NOT NULL,
  "version" TEXT NOT NULL,
  "sourceSystem" TEXT NOT NULL,
  "destinationSystem" TEXT NOT NULL,
  "direction" "IntegrationDirection" NOT NULL,
  "protocol" TEXT NOT NULL,
  "dataContractVersion" TEXT,
  "securityProfile" TEXT,
  "privacyProfile" TEXT,
  "retentionProfile" TEXT,
  "availabilityExpectation" TEXT,
  "recoveryExpectation" TEXT,
  "fallbackProcedure" TEXT,
  "effectiveFrom" TIMESTAMP(3),
  "effectiveUntil" TIMESTAMP(3),
  "status" "IntegrationVersionStatus" NOT NULL DEFAULT 'DRAFT',
  "currentAcceptanceState" "IntegrationAcceptanceState" NOT NULL DEFAULT 'DISCOVERED',
  "supersededByVersionId" UUID,
  "acceptedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "integration_versions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "integration_endpoints" (
  "id" UUID NOT NULL,
  "integrationVersionId" UUID NOT NULL,
  "endpointCode" TEXT NOT NULL,
  "pathOrIdentifier" TEXT NOT NULL,
  "method" TEXT,
  "description" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "integration_endpoints_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "data_exchange_contracts" (
  "id" UUID NOT NULL,
  "integrationVersionId" UUID NOT NULL,
  "schemaIdentifier" TEXT NOT NULL,
  "schemaVersion" TEXT NOT NULL,
  "classification" TEXT NOT NULL,
  "purpose" TEXT NOT NULL,
  "minimumNecessaryRule" TEXT NOT NULL,
  "validationRules" JSONB NOT NULL DEFAULT '[]',
  "transformationRules" JSONB NOT NULL DEFAULT '[]',
  "retention" TEXT,
  "loggingRestrictions" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "data_exchange_contracts_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "data_exchange_fields" (
  "id" UUID NOT NULL,
  "dataExchangeContractId" UUID NOT NULL,
  "fieldName" TEXT NOT NULL,
  "classification" "DataExchangeFieldClassification" NOT NULL,
  "description" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "data_exchange_fields_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "integration_acceptance_records" (
  "id" UUID NOT NULL,
  "integrationVersionId" UUID NOT NULL,
  "acceptanceState" "IntegrationAcceptanceState" NOT NULL,
  "achievedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "achievedByIdentityId" UUID,
  "achievedByOfficeholderId" UUID,
  "previousState" "IntegrationAcceptanceState",
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "integration_acceptance_records_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "authoritative_source_designations" (
  "id" UUID NOT NULL,
  "integrationVersionId" UUID NOT NULL,
  "institutionId" UUID NOT NULL,
  "datasetResource" TEXT NOT NULL,
  "authoritySource" TEXT NOT NULL,
  "scope" TEXT NOT NULL,
  "effectiveFrom" TIMESTAMP(3),
  "effectiveUntil" TIMESTAMP(3),
  "designatingAuthorityIdentityId" UUID,
  "designatingOfficeholderId" UUID,
  "acceptanceRecordId" UUID,
  "sourceStatus" "AuthoritativeSourceStatus" NOT NULL DEFAULT 'UNVERIFIED',
  "designationStatus" "AuthoritativeDesignationStatus" NOT NULL DEFAULT 'DRAFT',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "authoritative_source_designations_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "field_authority_mappings" (
  "id" UUID NOT NULL,
  "authoritativeSourceDesignationId" UUID NOT NULL,
  "field" TEXT NOT NULL,
  "source" TEXT NOT NULL,
  "sourceStatus" "AuthoritativeSourceStatus" NOT NULL DEFAULT 'UNVERIFIED',
  "scope" TEXT,
  "validity" TEXT,
  "conflictBehavior" "FieldAuthorityConflictBehavior" NOT NULL DEFAULT 'FLAG_FOR_REVIEW',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "field_authority_mappings_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "integration_credential_references" (
  "id" UUID NOT NULL,
  "integrationVersionId" UUID NOT NULL,
  "credentialType" TEXT NOT NULL,
  "secretReference" TEXT,
  "certificateReference" TEXT,
  "serviceIdentity" TEXT,
  "effectiveFrom" TIMESTAMP(3),
  "expiration" TIMESTAMP(3),
  "rotationStatus" "CredentialRotationStatus" NOT NULL DEFAULT 'CURRENT',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "integration_credential_references_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "integration_institution_owners" (
  "id" UUID NOT NULL,
  "integrationDefinitionId" UUID NOT NULL,
  "institutionId" UUID NOT NULL,
  "ownershipRole" TEXT NOT NULL,
  "effectiveFrom" TIMESTAMP(3),
  "effectiveUntil" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "integration_institution_owners_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "integration_dependencies" (
  "id" UUID NOT NULL,
  "integrationDefinitionId" UUID NOT NULL,
  "technologyDependencyId" UUID NOT NULL,
  "relationshipType" TEXT NOT NULL,
  "isRequired" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "integration_dependencies_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "integration_approvals" (
  "id" UUID NOT NULL,
  "integrationVersionId" UUID NOT NULL,
  "approvalType" "IntegrationApprovalType" NOT NULL,
  "status" "IntegrationApprovalStatus" NOT NULL DEFAULT 'PENDING',
  "approvedByIdentityId" UUID,
  "approvedByOfficeholderId" UUID,
  "approvedAt" TIMESTAMP(3),
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "integration_approvals_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "technology_dependencies_code_key" ON "technology_dependencies"("code");
CREATE INDEX "technology_dependencies_category_idx" ON "technology_dependencies"("category");
CREATE INDEX "technology_dependencies_status_idx" ON "technology_dependencies"("status");

CREATE UNIQUE INDEX "integration_definitions_integrationCode_key" ON "integration_definitions"("integrationCode");
CREATE INDEX "integration_definitions_institutionalOwnerId_idx" ON "integration_definitions"("institutionalOwnerId");
CREATE INDEX "integration_definitions_dependencyCategory_idx" ON "integration_definitions"("dependencyCategory");
CREATE INDEX "integration_definitions_status_idx" ON "integration_definitions"("status");

CREATE UNIQUE INDEX "integration_versions_integrationDefinitionId_version_key" ON "integration_versions"("integrationDefinitionId", "version");
CREATE INDEX "integration_versions_integrationDefinitionId_idx" ON "integration_versions"("integrationDefinitionId");
CREATE INDEX "integration_versions_status_idx" ON "integration_versions"("status");
CREATE INDEX "integration_versions_currentAcceptanceState_idx" ON "integration_versions"("currentAcceptanceState");
CREATE INDEX "integration_versions_supersededByVersionId_idx" ON "integration_versions"("supersededByVersionId");

CREATE UNIQUE INDEX "integration_endpoints_integrationVersionId_endpointCode_key" ON "integration_endpoints"("integrationVersionId", "endpointCode");
CREATE INDEX "integration_endpoints_integrationVersionId_idx" ON "integration_endpoints"("integrationVersionId");

CREATE UNIQUE INDEX "data_exchange_contracts_integrationVersionId_schemaIdentifier_schemaVersion_key" ON "data_exchange_contracts"("integrationVersionId", "schemaIdentifier", "schemaVersion");
CREATE INDEX "data_exchange_contracts_integrationVersionId_idx" ON "data_exchange_contracts"("integrationVersionId");

CREATE UNIQUE INDEX "data_exchange_fields_dataExchangeContractId_fieldName_classification_key" ON "data_exchange_fields"("dataExchangeContractId", "fieldName", "classification");
CREATE INDEX "data_exchange_fields_dataExchangeContractId_idx" ON "data_exchange_fields"("dataExchangeContractId");

CREATE INDEX "integration_acceptance_records_integrationVersionId_idx" ON "integration_acceptance_records"("integrationVersionId");
CREATE INDEX "integration_acceptance_records_acceptanceState_idx" ON "integration_acceptance_records"("acceptanceState");
CREATE INDEX "integration_acceptance_records_achievedAt_idx" ON "integration_acceptance_records"("achievedAt");

CREATE INDEX "authoritative_source_designations_integrationVersionId_idx" ON "authoritative_source_designations"("integrationVersionId");
CREATE INDEX "authoritative_source_designations_institutionId_idx" ON "authoritative_source_designations"("institutionId");
CREATE INDEX "authoritative_source_designations_sourceStatus_idx" ON "authoritative_source_designations"("sourceStatus");
CREATE INDEX "authoritative_source_designations_designationStatus_idx" ON "authoritative_source_designations"("designationStatus");

CREATE UNIQUE INDEX "field_authority_mappings_authoritativeSourceDesignationId_field_key" ON "field_authority_mappings"("authoritativeSourceDesignationId", "field");
CREATE INDEX "field_authority_mappings_authoritativeSourceDesignationId_idx" ON "field_authority_mappings"("authoritativeSourceDesignationId");

CREATE INDEX "integration_credential_references_integrationVersionId_idx" ON "integration_credential_references"("integrationVersionId");
CREATE INDEX "integration_credential_references_rotationStatus_idx" ON "integration_credential_references"("rotationStatus");
CREATE INDEX "integration_credential_references_expiration_idx" ON "integration_credential_references"("expiration");

CREATE UNIQUE INDEX "integration_institution_owners_integrationDefinitionId_institutionId_ownershipRole_key" ON "integration_institution_owners"("integrationDefinitionId", "institutionId", "ownershipRole");
CREATE INDEX "integration_institution_owners_integrationDefinitionId_idx" ON "integration_institution_owners"("integrationDefinitionId");
CREATE INDEX "integration_institution_owners_institutionId_idx" ON "integration_institution_owners"("institutionId");

CREATE UNIQUE INDEX "integration_dependencies_integrationDefinitionId_technologyDependencyId_key" ON "integration_dependencies"("integrationDefinitionId", "technologyDependencyId");
CREATE INDEX "integration_dependencies_integrationDefinitionId_idx" ON "integration_dependencies"("integrationDefinitionId");
CREATE INDEX "integration_dependencies_technologyDependencyId_idx" ON "integration_dependencies"("technologyDependencyId");

CREATE UNIQUE INDEX "integration_approvals_integrationVersionId_approvalType_key" ON "integration_approvals"("integrationVersionId", "approvalType");
CREATE INDEX "integration_approvals_integrationVersionId_idx" ON "integration_approvals"("integrationVersionId");
CREATE INDEX "integration_approvals_approvalType_idx" ON "integration_approvals"("approvalType");
CREATE INDEX "integration_approvals_status_idx" ON "integration_approvals"("status");

ALTER TABLE "integration_definitions" ADD CONSTRAINT "integration_definitions_institutionalOwnerId_fkey" FOREIGN KEY ("institutionalOwnerId") REFERENCES "institutions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "integration_versions" ADD CONSTRAINT "integration_versions_integrationDefinitionId_fkey" FOREIGN KEY ("integrationDefinitionId") REFERENCES "integration_definitions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "integration_versions" ADD CONSTRAINT "integration_versions_supersededByVersionId_fkey" FOREIGN KEY ("supersededByVersionId") REFERENCES "integration_versions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "integration_endpoints" ADD CONSTRAINT "integration_endpoints_integrationVersionId_fkey" FOREIGN KEY ("integrationVersionId") REFERENCES "integration_versions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "data_exchange_contracts" ADD CONSTRAINT "data_exchange_contracts_integrationVersionId_fkey" FOREIGN KEY ("integrationVersionId") REFERENCES "integration_versions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "data_exchange_fields" ADD CONSTRAINT "data_exchange_fields_dataExchangeContractId_fkey" FOREIGN KEY ("dataExchangeContractId") REFERENCES "data_exchange_contracts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "integration_acceptance_records" ADD CONSTRAINT "integration_acceptance_records_integrationVersionId_fkey" FOREIGN KEY ("integrationVersionId") REFERENCES "integration_versions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "integration_acceptance_records" ADD CONSTRAINT "integration_acceptance_records_achievedByIdentityId_fkey" FOREIGN KEY ("achievedByIdentityId") REFERENCES "identities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "authoritative_source_designations" ADD CONSTRAINT "authoritative_source_designations_integrationVersionId_fkey" FOREIGN KEY ("integrationVersionId") REFERENCES "integration_versions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "authoritative_source_designations" ADD CONSTRAINT "authoritative_source_designations_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "institutions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "authoritative_source_designations" ADD CONSTRAINT "authoritative_source_designations_designatingAuthorityIdentityId_fkey" FOREIGN KEY ("designatingAuthorityIdentityId") REFERENCES "identities"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "authoritative_source_designations" ADD CONSTRAINT "authoritative_source_designations_acceptanceRecordId_fkey" FOREIGN KEY ("acceptanceRecordId") REFERENCES "integration_acceptance_records"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "field_authority_mappings" ADD CONSTRAINT "field_authority_mappings_authoritativeSourceDesignationId_fkey" FOREIGN KEY ("authoritativeSourceDesignationId") REFERENCES "authoritative_source_designations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "integration_credential_references" ADD CONSTRAINT "integration_credential_references_integrationVersionId_fkey" FOREIGN KEY ("integrationVersionId") REFERENCES "integration_versions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "integration_institution_owners" ADD CONSTRAINT "integration_institution_owners_integrationDefinitionId_fkey" FOREIGN KEY ("integrationDefinitionId") REFERENCES "integration_definitions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "integration_institution_owners" ADD CONSTRAINT "integration_institution_owners_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "institutions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "integration_dependencies" ADD CONSTRAINT "integration_dependencies_integrationDefinitionId_fkey" FOREIGN KEY ("integrationDefinitionId") REFERENCES "integration_definitions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "integration_dependencies" ADD CONSTRAINT "integration_dependencies_technologyDependencyId_fkey" FOREIGN KEY ("technologyDependencyId") REFERENCES "technology_dependencies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "integration_approvals" ADD CONSTRAINT "integration_approvals_integrationVersionId_fkey" FOREIGN KEY ("integrationVersionId") REFERENCES "integration_versions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "integration_approvals" ADD CONSTRAINT "integration_approvals_approvedByIdentityId_fkey" FOREIGN KEY ("approvedByIdentityId") REFERENCES "identities"("id") ON DELETE SET NULL ON UPDATE CASCADE;
