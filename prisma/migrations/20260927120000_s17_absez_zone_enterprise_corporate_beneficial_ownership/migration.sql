-- S17: ABSEZ zone enterprise, SEZ business licence, structured beneficial ownership

CREATE TYPE "CorporateBeneficialOwnerControlNature" AS ENUM ('OWNERSHIP', 'CONTROL', 'BOTH');
CREATE TYPE "CorporateBeneficialOwnerVerificationStatus" AS ENUM ('UNVERIFIED', 'PENDING_REVIEW', 'VERIFIED', 'REJECTED');
CREATE TYPE "CorporateBeneficialOwnershipChangeType" AS ENUM ('CREATE', 'AMEND', 'SUPERSEDE', 'VERIFY');
CREATE TYPE "ZoneEnterpriseZoneStatus" AS ENUM ('DRAFT', 'PENDING_LICENCE', 'LICENSED', 'SUSPENDED', 'EXITED');
CREATE TYPE "ZoneEnterpriseOperatingStatus" AS ENUM ('NOT_OPERATING', 'OPERATING', 'SUSPENDED', 'CEASED');
CREATE TYPE "SezBusinessLicenceLifecycleStatus" AS ENUM ('PENDING', 'ACTIVE', 'AMENDMENT_PENDING', 'RENEWAL_PENDING', 'SUSPENDED', 'REVOKED', 'EXPIRED');
CREATE TYPE "AbsezZoneEnterpriseActorPersona" AS ENUM ('BUSINESS_REPRESENTATIVE', 'REGISTRY_OFFICER', 'LICENSING_OFFICER', 'PAYMENT_SYSTEM', 'AI_ASSISTANCE', 'TECHNICAL_ADMIN');

ALTER TABLE "corporate_beneficial_ownership_declarations" ALTER COLUMN "restrictedSummary" DROP NOT NULL;

ALTER TABLE "corporate_certificates" ADD COLUMN "officialInstrumentId" UUID;
CREATE UNIQUE INDEX "corporate_certificates_officialInstrumentId_key" ON "corporate_certificates"("officialInstrumentId");
ALTER TABLE "corporate_certificates" ADD CONSTRAINT "corporate_certificates_officialInstrumentId_fkey" FOREIGN KEY ("officialInstrumentId") REFERENCES "official_instruments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "corporate_beneficial_owner_records" (
  "id" UUID NOT NULL,
  "profileId" UUID NOT NULL,
  "declarationId" UUID,
  "subjectPersonId" UUID,
  "subjectOrganizationId" UUID,
  "ownerReference" TEXT NOT NULL,
  "controlNature" "CorporateBeneficialOwnerControlNature" NOT NULL,
  "ownershipPercentage" DECIMAL(7,4),
  "effectiveFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "effectiveUntil" TIMESTAMP(3),
  "verificationStatus" "CorporateBeneficialOwnerVerificationStatus" NOT NULL DEFAULT 'UNVERIFIED',
  "provenanceSource" TEXT NOT NULL,
  "recordStatus" "CorporateRegistryRecordStatus" NOT NULL DEFAULT 'DRAFT',
  "supersededAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "corporate_beneficial_owner_records_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "corporate_beneficial_ownership_change_history" (
  "id" UUID NOT NULL,
  "profileId" UUID NOT NULL,
  "beneficialOwnerRecordId" UUID NOT NULL,
  "changeType" "CorporateBeneficialOwnershipChangeType" NOT NULL,
  "priorSnapshot" JSONB NOT NULL,
  "newSnapshot" JSONB NOT NULL,
  "changedByIdentityId" UUID,
  "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "corporate_beneficial_ownership_change_history_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "absez_zone_enterprise_configurations" (
  "id" UUID NOT NULL,
  "configurationKey" TEXT NOT NULL,
  "activityCategories" JSONB NOT NULL,
  "zoneStatusCatalog" JSONB NOT NULL,
  "operatingStatusCatalog" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "absez_zone_enterprise_configurations_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "absez_zone_enterprises" (
  "id" UUID NOT NULL,
  "organizationId" UUID NOT NULL,
  "institutionId" UUID NOT NULL,
  "corporateRegistryProfileId" UUID NOT NULL,
  "zoneEnterpriseReference" TEXT NOT NULL,
  "zoneStatus" "ZoneEnterpriseZoneStatus" NOT NULL DEFAULT 'DRAFT',
  "operatingStatus" "ZoneEnterpriseOperatingStatus" NOT NULL DEFAULT 'NOT_OPERATING',
  "currentSezLicenceId" UUID,
  "approvedActivityCategoryCodes" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "effectiveFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "effectiveUntil" TIMESTAMP(3),
  "developmentProjectId" UUID,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "absez_zone_enterprises_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "absez_zone_enterprise_conditions" (
  "id" UUID NOT NULL,
  "zoneEnterpriseId" UUID NOT NULL,
  "conditionCode" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "effectiveFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "supersededAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "absez_zone_enterprise_conditions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "absez_zone_enterprise_status_history" (
  "id" UUID NOT NULL,
  "zoneEnterpriseId" UUID NOT NULL,
  "fromZoneStatus" "ZoneEnterpriseZoneStatus",
  "toZoneStatus" "ZoneEnterpriseZoneStatus",
  "fromOperatingStatus" "ZoneEnterpriseOperatingStatus",
  "toOperatingStatus" "ZoneEnterpriseOperatingStatus",
  "summary" TEXT NOT NULL,
  "actorIdentityId" UUID,
  "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "absez_zone_enterprise_status_history_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "sez_business_licence_records" (
  "id" UUID NOT NULL,
  "zoneEnterpriseId" UUID NOT NULL,
  "institutionId" UUID NOT NULL,
  "licenceReference" TEXT NOT NULL,
  "lifecycleStatus" "SezBusinessLicenceLifecycleStatus" NOT NULL DEFAULT 'PENDING',
  "governmentDecisionId" UUID,
  "officialInstrumentId" UUID,
  "caseId" UUID,
  "applicationId" UUID,
  "effectiveFrom" TIMESTAMP(3),
  "effectiveUntil" TIMESTAMP(3),
  "conditions" JSONB NOT NULL DEFAULT '[]',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "sez_business_licence_records_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "sez_business_licence_status_history" (
  "id" UUID NOT NULL,
  "sezBusinessLicenceId" UUID NOT NULL,
  "fromStatus" "SezBusinessLicenceLifecycleStatus",
  "toStatus" "SezBusinessLicenceLifecycleStatus" NOT NULL,
  "summary" TEXT NOT NULL,
  "actorIdentityId" UUID,
  "governmentDecisionId" UUID,
  "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "sez_business_licence_status_history_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "sez_business_licence_payment_events" (
  "id" UUID NOT NULL,
  "sezBusinessLicenceId" UUID NOT NULL,
  "paymentReference" TEXT NOT NULL,
  "amount" DECIMAL(18,2) NOT NULL,
  "currencyCode" TEXT NOT NULL,
  "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "activatesLicence" BOOLEAN NOT NULL DEFAULT false,
  CONSTRAINT "sez_business_licence_payment_events_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "absez_zone_enterprise_configurations_configurationKey_key" ON "absez_zone_enterprise_configurations"("configurationKey");
CREATE UNIQUE INDEX "absez_zone_enterprises_zoneEnterpriseReference_key" ON "absez_zone_enterprises"("zoneEnterpriseReference");
CREATE UNIQUE INDEX "absez_zone_enterprises_organizationId_institutionId_key" ON "absez_zone_enterprises"("organizationId", "institutionId");
CREATE UNIQUE INDEX "absez_zone_enterprises_currentSezLicenceId_key" ON "absez_zone_enterprises"("currentSezLicenceId");
CREATE INDEX "absez_zone_enterprises_institutionId_idx" ON "absez_zone_enterprises"("institutionId");
CREATE INDEX "absez_zone_enterprises_zoneStatus_idx" ON "absez_zone_enterprises"("zoneStatus");
CREATE INDEX "absez_zone_enterprise_conditions_zoneEnterpriseId_idx" ON "absez_zone_enterprise_conditions"("zoneEnterpriseId");
CREATE INDEX "absez_zone_enterprise_status_history_zoneEnterpriseId_idx" ON "absez_zone_enterprise_status_history"("zoneEnterpriseId");
CREATE UNIQUE INDEX "sez_business_licence_records_licenceReference_key" ON "sez_business_licence_records"("licenceReference");
CREATE UNIQUE INDEX "sez_business_licence_records_officialInstrumentId_key" ON "sez_business_licence_records"("officialInstrumentId");
CREATE INDEX "sez_business_licence_records_zoneEnterpriseId_idx" ON "sez_business_licence_records"("zoneEnterpriseId");
CREATE INDEX "sez_business_licence_records_institutionId_idx" ON "sez_business_licence_records"("institutionId");
CREATE INDEX "sez_business_licence_records_lifecycleStatus_idx" ON "sez_business_licence_records"("lifecycleStatus");
CREATE INDEX "sez_business_licence_status_history_sezBusinessLicenceId_idx" ON "sez_business_licence_status_history"("sezBusinessLicenceId");
CREATE UNIQUE INDEX "sez_business_licence_payment_events_paymentReference_key" ON "sez_business_licence_payment_events"("paymentReference");
CREATE INDEX "sez_business_licence_payment_events_sezBusinessLicenceId_idx" ON "sez_business_licence_payment_events"("sezBusinessLicenceId");
CREATE INDEX "corporate_beneficial_owner_records_profileId_idx" ON "corporate_beneficial_owner_records"("profileId");
CREATE INDEX "corporate_beneficial_owner_records_declarationId_idx" ON "corporate_beneficial_owner_records"("declarationId");
CREATE INDEX "corporate_beneficial_owner_records_recordStatus_idx" ON "corporate_beneficial_owner_records"("recordStatus");
CREATE INDEX "corporate_beneficial_ownership_change_history_profileId_idx" ON "corporate_beneficial_ownership_change_history"("profileId");
CREATE INDEX "corporate_beneficial_ownership_change_history_beneficialOwnerRecordId_idx" ON "corporate_beneficial_ownership_change_history"("beneficialOwnerRecordId");

ALTER TABLE "corporate_beneficial_owner_records" ADD CONSTRAINT "corporate_beneficial_owner_records_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "corporate_registry_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "corporate_beneficial_owner_records" ADD CONSTRAINT "corporate_beneficial_owner_records_declarationId_fkey" FOREIGN KEY ("declarationId") REFERENCES "corporate_beneficial_ownership_declarations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "corporate_beneficial_owner_records" ADD CONSTRAINT "corporate_beneficial_owner_records_subjectPersonId_fkey" FOREIGN KEY ("subjectPersonId") REFERENCES "persons"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "corporate_beneficial_owner_records" ADD CONSTRAINT "corporate_beneficial_owner_records_subjectOrganizationId_fkey" FOREIGN KEY ("subjectOrganizationId") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "corporate_beneficial_ownership_change_history" ADD CONSTRAINT "corporate_beneficial_ownership_change_history_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "corporate_registry_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "corporate_beneficial_ownership_change_history" ADD CONSTRAINT "corporate_beneficial_ownership_change_history_beneficialOwnerRecordId_fkey" FOREIGN KEY ("beneficialOwnerRecordId") REFERENCES "corporate_beneficial_owner_records"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "corporate_beneficial_ownership_change_history" ADD CONSTRAINT "corporate_beneficial_ownership_change_history_changedByIdentityId_fkey" FOREIGN KEY ("changedByIdentityId") REFERENCES "identities"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "absez_zone_enterprises" ADD CONSTRAINT "absez_zone_enterprises_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "absez_zone_enterprises" ADD CONSTRAINT "absez_zone_enterprises_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "institutions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "absez_zone_enterprises" ADD CONSTRAINT "absez_zone_enterprises_corporateRegistryProfileId_fkey" FOREIGN KEY ("corporateRegistryProfileId") REFERENCES "corporate_registry_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "absez_zone_enterprises" ADD CONSTRAINT "absez_zone_enterprises_developmentProjectId_fkey" FOREIGN KEY ("developmentProjectId") REFERENCES "development_projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "absez_zone_enterprise_conditions" ADD CONSTRAINT "absez_zone_enterprise_conditions_zoneEnterpriseId_fkey" FOREIGN KEY ("zoneEnterpriseId") REFERENCES "absez_zone_enterprises"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "absez_zone_enterprise_status_history" ADD CONSTRAINT "absez_zone_enterprise_status_history_zoneEnterpriseId_fkey" FOREIGN KEY ("zoneEnterpriseId") REFERENCES "absez_zone_enterprises"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "absez_zone_enterprise_status_history" ADD CONSTRAINT "absez_zone_enterprise_status_history_actorIdentityId_fkey" FOREIGN KEY ("actorIdentityId") REFERENCES "identities"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "sez_business_licence_records" ADD CONSTRAINT "sez_business_licence_records_zoneEnterpriseId_fkey" FOREIGN KEY ("zoneEnterpriseId") REFERENCES "absez_zone_enterprises"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "sez_business_licence_records" ADD CONSTRAINT "sez_business_licence_records_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "institutions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "sez_business_licence_records" ADD CONSTRAINT "sez_business_licence_records_governmentDecisionId_fkey" FOREIGN KEY ("governmentDecisionId") REFERENCES "government_decisions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "sez_business_licence_records" ADD CONSTRAINT "sez_business_licence_records_officialInstrumentId_fkey" FOREIGN KEY ("officialInstrumentId") REFERENCES "official_instruments"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "sez_business_licence_records" ADD CONSTRAINT "sez_business_licence_records_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "cases"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "sez_business_licence_records" ADD CONSTRAINT "sez_business_licence_records_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "applications"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "sez_business_licence_status_history" ADD CONSTRAINT "sez_business_licence_status_history_sezBusinessLicenceId_fkey" FOREIGN KEY ("sezBusinessLicenceId") REFERENCES "sez_business_licence_records"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "sez_business_licence_status_history" ADD CONSTRAINT "sez_business_licence_status_history_actorIdentityId_fkey" FOREIGN KEY ("actorIdentityId") REFERENCES "identities"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "sez_business_licence_status_history" ADD CONSTRAINT "sez_business_licence_status_history_governmentDecisionId_fkey" FOREIGN KEY ("governmentDecisionId") REFERENCES "government_decisions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "sez_business_licence_payment_events" ADD CONSTRAINT "sez_business_licence_payment_events_sezBusinessLicenceId_fkey" FOREIGN KEY ("sezBusinessLicenceId") REFERENCES "sez_business_licence_records"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "absez_zone_enterprises" ADD CONSTRAINT "absez_zone_enterprises_currentSezLicenceId_fkey" FOREIGN KEY ("currentSezLicenceId") REFERENCES "sez_business_licence_records"("id") ON DELETE SET NULL ON UPDATE CASCADE;
