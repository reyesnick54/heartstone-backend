-- S18E: Cannabis Administration and Licensing foundation

CREATE TYPE "CannabisAdministrationActorPersona" AS ENUM ('APPLICANT', 'AUTHORIZED_REPRESENTATIVE', 'REGULATORY_OFFICER', 'COMPLIANCE_OFFICER', 'INSPECTOR', 'PROFESSIONAL_REVIEWER', 'EXTERNAL_AUTHORITY_LIAISON', 'AI_ASSISTANCE', 'PAYMENT_SYSTEM', 'TECHNICAL_ADMIN', 'SYSTEM');
CREATE TYPE "CannabisAdministrationDataClassification" AS ENUM ('PUBLIC_SUMMARY', 'REGULATORY_ACCESS', 'FACILITY_SITE_RESTRICTED', 'BENEFICIAL_OWNERSHIP_RESTRICTED', 'PROTECTED_COMPLIANCE');
CREATE TYPE "CannabisOperatingStatus" AS ENUM ('DRAFT', 'ACTIVE', 'SUSPENDED', 'REVOKED', 'CEASED');
CREATE TYPE "CannabisDelegatedLicenceFunctionActivation" AS ENUM ('INACTIVE', 'ACTIVE');
CREATE TYPE "CannabisServiceOperationalActivation" AS ENUM ('DRAFT', 'INACTIVE', 'ACTIVE');
CREATE TYPE "CannabisLicenceLifecycleStatus" AS ENUM ('NOT_ISSUED', 'PENDING_ISSUANCE', 'ISSUED', 'EFFECTIVE', 'SUSPENDED', 'REVOKED', 'EXPIRED', 'AMENDED', 'SUPERSEDED');
CREATE TYPE "CannabisExternalDependencyStatus" AS ENUM ('PENDING', 'REFERRED', 'RESOLVED', 'WAIVED', 'BLOCKED');
CREATE TYPE "CannabisExternalDependencyRecordedBy" AS ENUM ('REGULATORY_OFFICER', 'EXTERNAL_AUTHORITY_LIAISON', 'INTEGRATION_SYSTEM', 'SYSTEM');
CREATE TYPE "CannabisResponsiblePartyRole" AS ENUM ('RESPONSIBLE_PERSON', 'FACILITY_MANAGER', 'COMPLIANCE_OFFICER', 'AUTHORIZED_REPRESENTATIVE', 'CONFIGURED_ROLE');

CREATE TABLE "cannabis_administration_configurations" (
    "id" UUID NOT NULL,
    "jurisdictionId" UUID NOT NULL,
    "licenceCategoryTaxonomy" JSONB NOT NULL DEFAULT '[]',
    "serviceOperationalActivation" "CannabisServiceOperationalActivation" NOT NULL DEFAULT 'INACTIVE',
    "governingAuthorityInstrumentId" UUID,
    "publicVerificationModeCode" TEXT NOT NULL DEFAULT 'MINIMAL',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cannabis_administration_configurations_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "cannabis_regulated_entity_references" (
    "id" UUID NOT NULL,
    "entityReferenceNumber" TEXT NOT NULL,
    "organizationId" UUID NOT NULL,
    "jurisdictionId" UUID,
    "licenceCategoryCode" TEXT NOT NULL,
    "operatingStatus" "CannabisOperatingStatus" NOT NULL DEFAULT 'DRAFT',
    "delegatedLicenceFunctionActivation" "CannabisDelegatedLicenceFunctionActivation" NOT NULL DEFAULT 'INACTIVE',
    "dataClassification" "CannabisAdministrationDataClassification" NOT NULL DEFAULT 'REGULATORY_ACCESS',
    "effectiveFrom" TIMESTAMP(3),
    "effectiveUntil" TIMESTAMP(3),
    "doesNotDuplicateOrganization" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cannabis_regulated_entity_references_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "cannabis_application_references" (
    "id" UUID NOT NULL,
    "regulatedEntityId" UUID NOT NULL,
    "applicationId" UUID,
    "caseId" UUID,
    "licenceCategoryCode" TEXT,
    "serviceCode" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cannabis_application_references_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "cannabis_facility_site_references" (
    "id" UUID NOT NULL,
    "regulatedEntityId" UUID NOT NULL,
    "siteLabel" TEXT,
    "landParcelId" UUID,
    "propertyParcelId" UUID,
    "developmentProjectId" UUID,
    "developmentPermitId" UUID,
    "publicSafetyEngagementId" UUID,
    "doesNotCreateLandOrPlanningRecords" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cannabis_facility_site_references_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "cannabis_responsible_party_references" (
    "id" UUID NOT NULL,
    "regulatedEntityId" UUID NOT NULL,
    "identityId" UUID,
    "roleCode" "CannabisResponsiblePartyRole" NOT NULL,
    "configuredRoleCode" TEXT,
    "effectiveFrom" TIMESTAMP(3),
    "effectiveUntil" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cannabis_responsible_party_references_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "cannabis_beneficial_ownership_references" (
    "id" UUID NOT NULL,
    "regulatedEntityId" UUID NOT NULL,
    "corporateBeneficialOwnerRecordId" UUID NOT NULL,
    "dataClassification" "CannabisAdministrationDataClassification" NOT NULL DEFAULT 'BENEFICIAL_OWNERSHIP_RESTRICTED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cannabis_beneficial_ownership_references_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "cannabis_condition_records" (
    "id" UUID NOT NULL,
    "regulatedEntityId" UUID NOT NULL,
    "conditionCode" TEXT NOT NULL,
    "conditionSummary" TEXT,
    "effectiveFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "effectiveUntil" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cannabis_condition_records_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "cannabis_licence_records" (
    "id" UUID NOT NULL,
    "licenceNumber" TEXT NOT NULL,
    "regulatedEntityId" UUID NOT NULL,
    "licenceCategoryCode" TEXT NOT NULL,
    "lifecycleStatus" "CannabisLicenceLifecycleStatus" NOT NULL DEFAULT 'NOT_ISSUED',
    "governmentDecisionId" UUID,
    "officialInstrumentId" UUID,
    "authorityEvaluationRecordId" UUID,
    "functionAuthorityRecordId" UUID,
    "validFrom" TIMESTAMP(3),
    "validUntil" TIMESTAMP(3),
    "renewalOfLicenceId" UUID,
    "doesNotSubstituteGovernmentDecision" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cannabis_licence_records_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "cannabis_licence_status_history" (
    "id" UUID NOT NULL,
    "cannabisLicenceRecordId" UUID NOT NULL,
    "fromStatus" "CannabisLicenceLifecycleStatus",
    "toStatus" "CannabisLicenceLifecycleStatus" NOT NULL,
    "actorIdentityId" UUID,
    "actorPersona" "CannabisAdministrationActorPersona" NOT NULL,
    "reason" TEXT,
    "governmentDecisionId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cannabis_licence_status_history_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "cannabis_operating_status_history" (
    "id" UUID NOT NULL,
    "regulatedEntityId" UUID NOT NULL,
    "fromStatus" "CannabisOperatingStatus",
    "toStatus" "CannabisOperatingStatus" NOT NULL,
    "actorIdentityId" UUID,
    "actorPersona" "CannabisAdministrationActorPersona",
    "governmentDecisionId" UUID,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cannabis_operating_status_history_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "cannabis_external_dependencies" (
    "id" UUID NOT NULL,
    "regulatedEntityId" UUID NOT NULL,
    "dependencyCode" TEXT NOT NULL,
    "dependencyLabel" TEXT,
    "status" "CannabisExternalDependencyStatus" NOT NULL DEFAULT 'PENDING',
    "blocksFinalDecision" BOOLEAN NOT NULL DEFAULT true,
    "recordedBy" "CannabisExternalDependencyRecordedBy" NOT NULL,
    "recordedByIdentityId" UUID,
    "responseAttributionSummary" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cannabis_external_dependencies_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "cannabis_inspection_references" (
    "id" UUID NOT NULL,
    "regulatedEntityId" UUID NOT NULL,
    "inspectionRecordId" UUID NOT NULL,
    "linkageRole" TEXT NOT NULL DEFAULT 'SUBJECT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cannabis_inspection_references_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "cannabis_compliance_references" (
    "id" UUID NOT NULL,
    "regulatedEntityId" UUID NOT NULL,
    "complianceMatterId" UUID NOT NULL,
    "linkageRole" TEXT NOT NULL DEFAULT 'SUBJECT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cannabis_compliance_references_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "cannabis_data_access_audits" (
    "id" UUID NOT NULL,
    "accessorIdentityId" UUID,
    "regulatedEntityId" UUID,
    "classification" "CannabisAdministrationDataClassification",
    "endpoint" TEXT NOT NULL,
    "granted" BOOLEAN NOT NULL,
    "reasonCode" TEXT,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cannabis_data_access_audits_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "cannabis_administration_configurations_jurisdictionId_key" ON "cannabis_administration_configurations"("jurisdictionId");
CREATE UNIQUE INDEX "cannabis_regulated_entity_references_entityReferenceNumber_key" ON "cannabis_regulated_entity_references"("entityReferenceNumber");
CREATE UNIQUE INDEX "cannabis_licence_records_licenceNumber_key" ON "cannabis_licence_records"("licenceNumber");
CREATE UNIQUE INDEX "cannabis_licence_records_renewalOfLicenceId_key" ON "cannabis_licence_records"("renewalOfLicenceId");
CREATE UNIQUE INDEX "cannabis_inspection_references_inspectionRecordId_key" ON "cannabis_inspection_references"("inspectionRecordId");
CREATE UNIQUE INDEX "cannabis_compliance_references_complianceMatterId_key" ON "cannabis_compliance_references"("complianceMatterId");

CREATE INDEX "cannabis_regulated_entity_references_organizationId_idx" ON "cannabis_regulated_entity_references"("organizationId");
CREATE INDEX "cannabis_regulated_entity_references_jurisdictionId_idx" ON "cannabis_regulated_entity_references"("jurisdictionId");
CREATE INDEX "cannabis_application_references_regulatedEntityId_idx" ON "cannabis_application_references"("regulatedEntityId");
CREATE INDEX "cannabis_facility_site_references_regulatedEntityId_idx" ON "cannabis_facility_site_references"("regulatedEntityId");
CREATE INDEX "cannabis_licence_records_regulatedEntityId_idx" ON "cannabis_licence_records"("regulatedEntityId");
CREATE INDEX "cannabis_external_dependencies_regulatedEntityId_idx" ON "cannabis_external_dependencies"("regulatedEntityId");
CREATE INDEX "cannabis_compliance_references_regulatedEntityId_idx" ON "cannabis_compliance_references"("regulatedEntityId");

ALTER TABLE "cannabis_administration_configurations" ADD CONSTRAINT "cannabis_administration_configurations_jurisdictionId_fkey" FOREIGN KEY ("jurisdictionId") REFERENCES "jurisdictions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "cannabis_administration_configurations" ADD CONSTRAINT "cannabis_administration_configurations_governingAuthorityInstrumentId_fkey" FOREIGN KEY ("governingAuthorityInstrumentId") REFERENCES "official_instruments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "cannabis_regulated_entity_references" ADD CONSTRAINT "cannabis_regulated_entity_references_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "cannabis_regulated_entity_references" ADD CONSTRAINT "cannabis_regulated_entity_references_jurisdictionId_fkey" FOREIGN KEY ("jurisdictionId") REFERENCES "jurisdictions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "cannabis_application_references" ADD CONSTRAINT "cannabis_application_references_regulatedEntityId_fkey" FOREIGN KEY ("regulatedEntityId") REFERENCES "cannabis_regulated_entity_references"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "cannabis_application_references" ADD CONSTRAINT "cannabis_application_references_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "applications"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "cannabis_application_references" ADD CONSTRAINT "cannabis_application_references_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "cases"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "cannabis_facility_site_references" ADD CONSTRAINT "cannabis_facility_site_references_regulatedEntityId_fkey" FOREIGN KEY ("regulatedEntityId") REFERENCES "cannabis_regulated_entity_references"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "cannabis_facility_site_references" ADD CONSTRAINT "cannabis_facility_site_references_landParcelId_fkey" FOREIGN KEY ("landParcelId") REFERENCES "land_parcels"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "cannabis_facility_site_references" ADD CONSTRAINT "cannabis_facility_site_references_propertyParcelId_fkey" FOREIGN KEY ("propertyParcelId") REFERENCES "property_parcels"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "cannabis_facility_site_references" ADD CONSTRAINT "cannabis_facility_site_references_developmentProjectId_fkey" FOREIGN KEY ("developmentProjectId") REFERENCES "development_projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "cannabis_facility_site_references" ADD CONSTRAINT "cannabis_facility_site_references_developmentPermitId_fkey" FOREIGN KEY ("developmentPermitId") REFERENCES "development_permits"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "cannabis_facility_site_references" ADD CONSTRAINT "cannabis_facility_site_references_publicSafetyEngagementId_fkey" FOREIGN KEY ("publicSafetyEngagementId") REFERENCES "public_safety_engagements"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "cannabis_responsible_party_references" ADD CONSTRAINT "cannabis_responsible_party_references_regulatedEntityId_fkey" FOREIGN KEY ("regulatedEntityId") REFERENCES "cannabis_regulated_entity_references"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "cannabis_responsible_party_references" ADD CONSTRAINT "cannabis_responsible_party_references_identityId_fkey" FOREIGN KEY ("identityId") REFERENCES "identities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "cannabis_beneficial_ownership_references" ADD CONSTRAINT "cannabis_beneficial_ownership_references_regulatedEntityId_fkey" FOREIGN KEY ("regulatedEntityId") REFERENCES "cannabis_regulated_entity_references"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "cannabis_beneficial_ownership_references" ADD CONSTRAINT "cannabis_beneficial_ownership_references_corporateBeneficialOwnerRecordId_fkey" FOREIGN KEY ("corporateBeneficialOwnerRecordId") REFERENCES "corporate_beneficial_owner_records"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "cannabis_condition_records" ADD CONSTRAINT "cannabis_condition_records_regulatedEntityId_fkey" FOREIGN KEY ("regulatedEntityId") REFERENCES "cannabis_regulated_entity_references"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "cannabis_licence_records" ADD CONSTRAINT "cannabis_licence_records_regulatedEntityId_fkey" FOREIGN KEY ("regulatedEntityId") REFERENCES "cannabis_regulated_entity_references"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "cannabis_licence_records" ADD CONSTRAINT "cannabis_licence_records_governmentDecisionId_fkey" FOREIGN KEY ("governmentDecisionId") REFERENCES "government_decisions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "cannabis_licence_records" ADD CONSTRAINT "cannabis_licence_records_officialInstrumentId_fkey" FOREIGN KEY ("officialInstrumentId") REFERENCES "official_instruments"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "cannabis_licence_records" ADD CONSTRAINT "cannabis_licence_records_authorityEvaluationRecordId_fkey" FOREIGN KEY ("authorityEvaluationRecordId") REFERENCES "authority_evaluation_records"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "cannabis_licence_records" ADD CONSTRAINT "cannabis_licence_records_functionAuthorityRecordId_fkey" FOREIGN KEY ("functionAuthorityRecordId") REFERENCES "function_authority_records"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "cannabis_licence_records" ADD CONSTRAINT "cannabis_licence_records_renewalOfLicenceId_fkey" FOREIGN KEY ("renewalOfLicenceId") REFERENCES "cannabis_licence_records"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "cannabis_licence_status_history" ADD CONSTRAINT "cannabis_licence_status_history_cannabisLicenceRecordId_fkey" FOREIGN KEY ("cannabisLicenceRecordId") REFERENCES "cannabis_licence_records"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "cannabis_licence_status_history" ADD CONSTRAINT "cannabis_licence_status_history_actorIdentityId_fkey" FOREIGN KEY ("actorIdentityId") REFERENCES "identities"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "cannabis_licence_status_history" ADD CONSTRAINT "cannabis_licence_status_history_governmentDecisionId_fkey" FOREIGN KEY ("governmentDecisionId") REFERENCES "government_decisions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "cannabis_operating_status_history" ADD CONSTRAINT "cannabis_operating_status_history_regulatedEntityId_fkey" FOREIGN KEY ("regulatedEntityId") REFERENCES "cannabis_regulated_entity_references"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "cannabis_operating_status_history" ADD CONSTRAINT "cannabis_operating_status_history_actorIdentityId_fkey" FOREIGN KEY ("actorIdentityId") REFERENCES "identities"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "cannabis_operating_status_history" ADD CONSTRAINT "cannabis_operating_status_history_governmentDecisionId_fkey" FOREIGN KEY ("governmentDecisionId") REFERENCES "government_decisions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "cannabis_external_dependencies" ADD CONSTRAINT "cannabis_external_dependencies_regulatedEntityId_fkey" FOREIGN KEY ("regulatedEntityId") REFERENCES "cannabis_regulated_entity_references"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "cannabis_external_dependencies" ADD CONSTRAINT "cannabis_external_dependencies_recordedByIdentityId_fkey" FOREIGN KEY ("recordedByIdentityId") REFERENCES "identities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "cannabis_inspection_references" ADD CONSTRAINT "cannabis_inspection_references_regulatedEntityId_fkey" FOREIGN KEY ("regulatedEntityId") REFERENCES "cannabis_regulated_entity_references"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "cannabis_inspection_references" ADD CONSTRAINT "cannabis_inspection_references_inspectionRecordId_fkey" FOREIGN KEY ("inspectionRecordId") REFERENCES "inspection_records"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "cannabis_compliance_references" ADD CONSTRAINT "cannabis_compliance_references_regulatedEntityId_fkey" FOREIGN KEY ("regulatedEntityId") REFERENCES "cannabis_regulated_entity_references"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "cannabis_compliance_references" ADD CONSTRAINT "cannabis_compliance_references_complianceMatterId_fkey" FOREIGN KEY ("complianceMatterId") REFERENCES "compliance_matters"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "cannabis_data_access_audits" ADD CONSTRAINT "cannabis_data_access_audits_accessorIdentityId_fkey" FOREIGN KEY ("accessorIdentityId") REFERENCES "identities"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "cannabis_data_access_audits" ADD CONSTRAINT "cannabis_data_access_audits_regulatedEntityId_fkey" FOREIGN KEY ("regulatedEntityId") REFERENCES "cannabis_regulated_entity_references"("id") ON DELETE SET NULL ON UPDATE CASCADE;
