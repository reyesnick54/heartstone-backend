-- S18B: Digital Assets & Blockchain Administration foundation

CREATE TYPE "DigitalAssetsActorPersona" AS ENUM ('APPLICANT', 'AUTHORIZED_REPRESENTATIVE', 'REGULATORY_OFFICER', 'TECHNICAL_REVIEWER', 'PROFESSIONAL_REVIEWER', 'EXTERNAL_AUTHORITY_LIAISON', 'AI_ASSISTANCE', 'PAYMENT_SYSTEM', 'BLOCKCHAIN_VERIFICATION_SERVICE', 'TECHNICAL_ADMIN');
CREATE TYPE "DigitalAssetsDataClassification" AS ENUM ('PUBLIC_SUMMARY', 'REGULATORY_ACCESS', 'CONFIDENTIAL_TECHNICAL', 'BENEFICIAL_OWNERSHIP_RESTRICTED');
CREATE TYPE "DigitalAssetsOperatingStatus" AS ENUM ('DRAFT', 'ACTIVE', 'SUSPENDED', 'REVOKED', 'CEASED');
CREATE TYPE "DigitalAssetsExternalDependencyType" AS ENUM ('NATIONAL_FINANCIAL_REGULATOR', 'NATIONAL_SECURITY_REVIEW', 'PROFESSIONAL_REVIEWER', 'OTHER_COMPETENT_AUTHORITY', 'CONFIGURED_AUTHORITY');
CREATE TYPE "DigitalAssetsExternalDependencyRecordedBy" AS ENUM ('REGULATORY_OFFICER', 'INTEGRATION_SYSTEM', 'EXTERNAL_AUTHORITY_LIAISON', 'SYSTEM');
CREATE TYPE "DigitalAssetsExternalDependencyStatus" AS ENUM ('PENDING', 'RESOLVED', 'WAIVED');
CREATE TYPE "DigitalAssetsTechnicalReviewCategory" AS ENUM ('ARCHITECTURE_DOCUMENTATION', 'CUSTODY_CONTROL', 'CYBERSECURITY_EVIDENCE', 'OPERATIONAL_CONTROLS', 'BUSINESS_CONTINUITY', 'PROFESSIONAL_ATTESTATION', 'CONFIGURED_CATEGORY');
CREATE TYPE "DigitalAssetsTechnicalReviewStatus" AS ENUM ('PENDING', 'UNDER_REVIEW', 'COMPLETE', 'REQUIRES_RESUBMISSION');
CREATE TYPE "DigitalAssetsAuthorizationStatus" AS ENUM ('NOT_ISSUED', 'PENDING_DECISION', 'ISSUED', 'EFFECTIVE', 'SUSPENDED', 'REVOKED', 'EXPIRED');
CREATE TYPE "DigitalAssetsResponsiblePartyRole" AS ENUM ('COMPLIANCE_OFFICER', 'TECHNOLOGY_OFFICER', 'DIRECTOR', 'AUTHORIZED_REPRESENTATIVE', 'CONFIGURED_ROLE');

CREATE TABLE "digital_assets_configurations" (
    "id" UUID NOT NULL,
    "jurisdictionId" UUID NOT NULL,
    "activityCategoryTaxonomy" JSONB NOT NULL DEFAULT '[]',
    "applicantCategoryTaxonomy" JSONB NOT NULL DEFAULT '[]',
    "technicalReviewCategoryTaxonomy" JSONB NOT NULL DEFAULT '[]',
    "publicVerificationModeCode" TEXT NOT NULL DEFAULT 'MINIMAL',
    "consumesPlatformBlockchainVerification" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "digital_assets_configurations_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "digital_assets_regulated_entity_references" (
    "id" UUID NOT NULL,
    "entityReferenceNumber" TEXT NOT NULL,
    "organizationId" UUID NOT NULL,
    "jurisdictionId" UUID,
    "activityCategoryCode" TEXT NOT NULL,
    "operatingStatus" "DigitalAssetsOperatingStatus" NOT NULL DEFAULT 'DRAFT',
    "dataClassification" "DigitalAssetsDataClassification" NOT NULL DEFAULT 'REGULATORY_ACCESS',
    "masterAdministrativeFileId" UUID,
    "effectiveFrom" TIMESTAMP(3),
    "effectiveUntil" TIMESTAMP(3),
    "doesNotDuplicateOrganization" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "digital_assets_regulated_entity_references_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "digital_assets_application_references" (
    "id" UUID NOT NULL,
    "regulatedEntityId" UUID NOT NULL,
    "applicationId" UUID,
    "caseId" UUID,
    "licenceTypeCode" TEXT,
    "serviceCode" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "digital_assets_application_references_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "digital_assets_technology_profiles" (
    "id" UUID NOT NULL,
    "regulatedEntityId" UUID NOT NULL,
    "platformName" TEXT,
    "technologyStackSummary" TEXT,
    "custodyModelCode" TEXT,
    "evidenceRecordId" UUID,
    "dataClassification" "DigitalAssetsDataClassification" NOT NULL DEFAULT 'CONFIDENTIAL_TECHNICAL',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "digital_assets_technology_profiles_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "digital_assets_responsible_party_references" (
    "id" UUID NOT NULL,
    "regulatedEntityId" UUID NOT NULL,
    "identityId" UUID,
    "roleCode" "DigitalAssetsResponsiblePartyRole" NOT NULL,
    "configuredRoleCode" TEXT,
    "effectiveFrom" TIMESTAMP(3),
    "effectiveUntil" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "digital_assets_responsible_party_references_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "digital_assets_beneficial_ownership_references" (
    "id" UUID NOT NULL,
    "regulatedEntityId" UUID NOT NULL,
    "corporateBeneficialOwnershipDeclarationId" UUID,
    "restrictedSummary" TEXT,
    "dataClassification" "DigitalAssetsDataClassification" NOT NULL DEFAULT 'BENEFICIAL_OWNERSHIP_RESTRICTED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "digital_assets_beneficial_ownership_references_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "digital_assets_condition_records" (
    "id" UUID NOT NULL,
    "regulatedEntityId" UUID NOT NULL,
    "conditionCode" TEXT NOT NULL,
    "conditionSummary" TEXT NOT NULL,
    "effectiveFrom" TIMESTAMP(3),
    "effectiveUntil" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "digital_assets_condition_records_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "digital_assets_operating_status_history" (
    "id" UUID NOT NULL,
    "regulatedEntityId" UUID NOT NULL,
    "fromStatusCode" TEXT,
    "toStatusCode" TEXT NOT NULL,
    "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actorIdentityId" UUID,
    "actorPersona" "DigitalAssetsActorPersona",
    "governmentDecisionId" UUID,
    "reasonSummary" TEXT,

    CONSTRAINT "digital_assets_operating_status_history_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "digital_assets_authorization_records" (
    "id" UUID NOT NULL,
    "regulatedEntityId" UUID NOT NULL,
    "authorizationReference" TEXT NOT NULL,
    "status" "DigitalAssetsAuthorizationStatus" NOT NULL DEFAULT 'NOT_ISSUED',
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

    CONSTRAINT "digital_assets_authorization_records_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "digital_assets_technical_review_records" (
    "id" UUID NOT NULL,
    "regulatedEntityId" UUID NOT NULL,
    "reviewCategory" "DigitalAssetsTechnicalReviewCategory" NOT NULL,
    "configuredCategoryCode" TEXT,
    "status" "DigitalAssetsTechnicalReviewStatus" NOT NULL DEFAULT 'PENDING',
    "evidenceRecordId" UUID,
    "reviewerIdentityId" UUID,
    "reviewerPersona" "DigitalAssetsActorPersona",
    "isOfficialApproval" BOOLEAN NOT NULL DEFAULT false,
    "summaryNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "digital_assets_technical_review_records_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "digital_assets_external_dependencies" (
    "id" UUID NOT NULL,
    "regulatedEntityId" UUID NOT NULL,
    "dependencyType" "DigitalAssetsExternalDependencyType" NOT NULL,
    "externalAuthorityId" UUID,
    "blocksFinalDecision" BOOLEAN NOT NULL DEFAULT false,
    "status" "DigitalAssetsExternalDependencyStatus" NOT NULL DEFAULT 'PENDING',
    "isAuthenticated" BOOLEAN NOT NULL DEFAULT false,
    "authenticatedPayloadHash" TEXT,
    "recordedBy" "DigitalAssetsExternalDependencyRecordedBy" NOT NULL,
    "recordedByIdentityId" UUID,
    "responseAttributionSummary" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "digital_assets_external_dependencies_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "digital_assets_compliance_references" (
    "id" UUID NOT NULL,
    "regulatedEntityId" UUID NOT NULL,
    "complianceMatterId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "digital_assets_compliance_references_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "digital_assets_data_access_audits" (
    "id" UUID NOT NULL,
    "accessorIdentityId" UUID,
    "regulatedEntityId" UUID,
    "technicalReviewId" UUID,
    "classification" "DigitalAssetsDataClassification",
    "endpoint" TEXT NOT NULL,
    "granted" BOOLEAN NOT NULL,
    "reasonCode" TEXT,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "digital_assets_data_access_audits_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "digital_assets_configurations_jurisdictionId_key" ON "digital_assets_configurations"("jurisdictionId");
CREATE UNIQUE INDEX "digital_assets_regulated_entity_references_entityReferenceNumber_key" ON "digital_assets_regulated_entity_references"("entityReferenceNumber");
CREATE INDEX "digital_assets_regulated_entity_references_organizationId_idx" ON "digital_assets_regulated_entity_references"("organizationId");
CREATE INDEX "digital_assets_regulated_entity_references_jurisdictionId_idx" ON "digital_assets_regulated_entity_references"("jurisdictionId");
CREATE INDEX "digital_assets_regulated_entity_references_operatingStatus_idx" ON "digital_assets_regulated_entity_references"("operatingStatus");
CREATE INDEX "digital_assets_regulated_entity_references_activityCategoryCode_idx" ON "digital_assets_regulated_entity_references"("activityCategoryCode");

CREATE INDEX "digital_assets_application_references_regulatedEntityId_idx" ON "digital_assets_application_references"("regulatedEntityId");
CREATE INDEX "digital_assets_application_references_applicationId_idx" ON "digital_assets_application_references"("applicationId");
CREATE INDEX "digital_assets_application_references_caseId_idx" ON "digital_assets_application_references"("caseId");

CREATE INDEX "digital_assets_technology_profiles_regulatedEntityId_idx" ON "digital_assets_technology_profiles"("regulatedEntityId");
CREATE INDEX "digital_assets_responsible_party_references_regulatedEntityId_idx" ON "digital_assets_responsible_party_references"("regulatedEntityId");
CREATE INDEX "digital_assets_beneficial_ownership_references_regulatedEntityId_idx" ON "digital_assets_beneficial_ownership_references"("regulatedEntityId");
CREATE INDEX "digital_assets_condition_records_regulatedEntityId_idx" ON "digital_assets_condition_records"("regulatedEntityId");
CREATE INDEX "digital_assets_operating_status_history_regulatedEntityId_idx" ON "digital_assets_operating_status_history"("regulatedEntityId");

CREATE UNIQUE INDEX "digital_assets_authorization_records_authorizationReference_key" ON "digital_assets_authorization_records"("authorizationReference");
CREATE UNIQUE INDEX "digital_assets_authorization_records_renewalOfAuthorizationId_key" ON "digital_assets_authorization_records"("renewalOfAuthorizationId");
CREATE INDEX "digital_assets_authorization_records_regulatedEntityId_idx" ON "digital_assets_authorization_records"("regulatedEntityId");
CREATE INDEX "digital_assets_authorization_records_status_idx" ON "digital_assets_authorization_records"("status");

CREATE INDEX "digital_assets_technical_review_records_regulatedEntityId_idx" ON "digital_assets_technical_review_records"("regulatedEntityId");
CREATE INDEX "digital_assets_technical_review_records_status_idx" ON "digital_assets_technical_review_records"("status");

CREATE INDEX "digital_assets_external_dependencies_regulatedEntityId_idx" ON "digital_assets_external_dependencies"("regulatedEntityId");
CREATE INDEX "digital_assets_external_dependencies_status_idx" ON "digital_assets_external_dependencies"("status");

CREATE UNIQUE INDEX "digital_assets_compliance_references_complianceMatterId_key" ON "digital_assets_compliance_references"("complianceMatterId");
CREATE INDEX "digital_assets_compliance_references_regulatedEntityId_idx" ON "digital_assets_compliance_references"("regulatedEntityId");

CREATE INDEX "digital_assets_data_access_audits_accessorIdentityId_idx" ON "digital_assets_data_access_audits"("accessorIdentityId");
CREATE INDEX "digital_assets_data_access_audits_regulatedEntityId_idx" ON "digital_assets_data_access_audits"("regulatedEntityId");

ALTER TABLE "digital_assets_configurations" ADD CONSTRAINT "digital_assets_configurations_jurisdictionId_fkey" FOREIGN KEY ("jurisdictionId") REFERENCES "jurisdictions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "digital_assets_regulated_entity_references" ADD CONSTRAINT "digital_assets_regulated_entity_references_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "digital_assets_regulated_entity_references" ADD CONSTRAINT "digital_assets_regulated_entity_references_jurisdictionId_fkey" FOREIGN KEY ("jurisdictionId") REFERENCES "jurisdictions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "digital_assets_regulated_entity_references" ADD CONSTRAINT "digital_assets_regulated_entity_references_masterAdministrative_fkey" FOREIGN KEY ("masterAdministrativeFileId") REFERENCES "master_administrative_files"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "digital_assets_application_references" ADD CONSTRAINT "digital_assets_application_references_regulatedEntityId_fkey" FOREIGN KEY ("regulatedEntityId") REFERENCES "digital_assets_regulated_entity_references"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "digital_assets_application_references" ADD CONSTRAINT "digital_assets_application_references_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "applications"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "digital_assets_application_references" ADD CONSTRAINT "digital_assets_application_references_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "cases"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "digital_assets_technology_profiles" ADD CONSTRAINT "digital_assets_technology_profiles_regulatedEntityId_fkey" FOREIGN KEY ("regulatedEntityId") REFERENCES "digital_assets_regulated_entity_references"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "digital_assets_technology_profiles" ADD CONSTRAINT "digital_assets_technology_profiles_evidenceRecordId_fkey" FOREIGN KEY ("evidenceRecordId") REFERENCES "evidence_records"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "digital_assets_responsible_party_references" ADD CONSTRAINT "digital_assets_responsible_party_references_regulatedEntityId_fkey" FOREIGN KEY ("regulatedEntityId") REFERENCES "digital_assets_regulated_entity_references"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "digital_assets_responsible_party_references" ADD CONSTRAINT "digital_assets_responsible_party_references_identityId_fkey" FOREIGN KEY ("identityId") REFERENCES "identities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "digital_assets_beneficial_ownership_references" ADD CONSTRAINT "digital_assets_beneficial_ownership_references_regulatedEntity_fkey" FOREIGN KEY ("regulatedEntityId") REFERENCES "digital_assets_regulated_entity_references"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "digital_assets_beneficial_ownership_references" ADD CONSTRAINT "digital_assets_beneficial_ownership_references_corporateBenefic_fkey" FOREIGN KEY ("corporateBeneficialOwnershipDeclarationId") REFERENCES "corporate_beneficial_ownership_declarations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "digital_assets_condition_records" ADD CONSTRAINT "digital_assets_condition_records_regulatedEntityId_fkey" FOREIGN KEY ("regulatedEntityId") REFERENCES "digital_assets_regulated_entity_references"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "digital_assets_operating_status_history" ADD CONSTRAINT "digital_assets_operating_status_history_regulatedEntityId_fkey" FOREIGN KEY ("regulatedEntityId") REFERENCES "digital_assets_regulated_entity_references"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "digital_assets_operating_status_history" ADD CONSTRAINT "digital_assets_operating_status_history_actorIdentityId_fkey" FOREIGN KEY ("actorIdentityId") REFERENCES "identities"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "digital_assets_operating_status_history" ADD CONSTRAINT "digital_assets_operating_status_history_governmentDecisionId_fkey" FOREIGN KEY ("governmentDecisionId") REFERENCES "government_decisions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "digital_assets_authorization_records" ADD CONSTRAINT "digital_assets_authorization_records_regulatedEntityId_fkey" FOREIGN KEY ("regulatedEntityId") REFERENCES "digital_assets_regulated_entity_references"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "digital_assets_authorization_records" ADD CONSTRAINT "digital_assets_authorization_records_governmentDecisionId_fkey" FOREIGN KEY ("governmentDecisionId") REFERENCES "government_decisions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "digital_assets_authorization_records" ADD CONSTRAINT "digital_assets_authorization_records_officialInstrumentId_fkey" FOREIGN KEY ("officialInstrumentId") REFERENCES "official_instruments"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "digital_assets_authorization_records" ADD CONSTRAINT "digital_assets_authorization_records_renewalOfAuthorizationId_fkey" FOREIGN KEY ("renewalOfAuthorizationId") REFERENCES "digital_assets_authorization_records"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "digital_assets_technical_review_records" ADD CONSTRAINT "digital_assets_technical_review_records_regulatedEntityId_fkey" FOREIGN KEY ("regulatedEntityId") REFERENCES "digital_assets_regulated_entity_references"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "digital_assets_technical_review_records" ADD CONSTRAINT "digital_assets_technical_review_records_evidenceRecordId_fkey" FOREIGN KEY ("evidenceRecordId") REFERENCES "evidence_records"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "digital_assets_technical_review_records" ADD CONSTRAINT "digital_assets_technical_review_records_reviewerIdentityId_fkey" FOREIGN KEY ("reviewerIdentityId") REFERENCES "identities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "digital_assets_external_dependencies" ADD CONSTRAINT "digital_assets_external_dependencies_regulatedEntityId_fkey" FOREIGN KEY ("regulatedEntityId") REFERENCES "digital_assets_regulated_entity_references"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "digital_assets_external_dependencies" ADD CONSTRAINT "digital_assets_external_dependencies_externalAuthorityId_fkey" FOREIGN KEY ("externalAuthorityId") REFERENCES "external_authorities"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "digital_assets_external_dependencies" ADD CONSTRAINT "digital_assets_external_dependencies_recordedByIdentityId_fkey" FOREIGN KEY ("recordedByIdentityId") REFERENCES "identities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "digital_assets_compliance_references" ADD CONSTRAINT "digital_assets_compliance_references_regulatedEntityId_fkey" FOREIGN KEY ("regulatedEntityId") REFERENCES "digital_assets_regulated_entity_references"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "digital_assets_compliance_references" ADD CONSTRAINT "digital_assets_compliance_references_complianceMatterId_fkey" FOREIGN KEY ("complianceMatterId") REFERENCES "compliance_matters"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "digital_assets_data_access_audits" ADD CONSTRAINT "digital_assets_data_access_audits_accessorIdentityId_fkey" FOREIGN KEY ("accessorIdentityId") REFERENCES "identities"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "digital_assets_data_access_audits" ADD CONSTRAINT "digital_assets_data_access_audits_regulatedEntityId_fkey" FOREIGN KEY ("regulatedEntityId") REFERENCES "digital_assets_regulated_entity_references"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "digital_assets_data_access_audits" ADD CONSTRAINT "digital_assets_data_access_audits_technicalReviewId_fkey" FOREIGN KEY ("technicalReviewId") REFERENCES "digital_assets_technical_review_records"("id") ON DELETE SET NULL ON UPDATE CASCADE;
