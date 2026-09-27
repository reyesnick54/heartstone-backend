-- Remediation S11: layered platform / jurisdiction / institution setup configuration

CREATE TYPE "SetupConfigurationLayer" AS ENUM ('PLATFORM', 'JURISDICTION', 'INSTITUTION');
CREATE TYPE "SetupConfigurationInstallationStatus" AS ENUM ('INSTALLED', 'SUPERSEDED');
CREATE TYPE "SetupVocabularyKind" AS ENUM (
  'CASE_STATUS',
  'SERVICE_STATUS',
  'READINESS_LABEL',
  'WORKFLOW_LABEL',
  'INSTITUTIONAL_LABEL'
);

CREATE TABLE "setup_configuration_packages" (
    "id" UUID NOT NULL,
    "packageKey" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "layer" "SetupConfigurationLayer" NOT NULL,
    "title" TEXT NOT NULL,
    "sourceLabel" TEXT NOT NULL,
    "contentChecksum" TEXT NOT NULL,
    "manifest" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "setup_configuration_packages_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "setup_configuration_installations" (
    "id" UUID NOT NULL,
    "packageId" UUID NOT NULL,
    "layer" "SetupConfigurationLayer" NOT NULL,
    "scopeKey" TEXT NOT NULL,
    "jurisdictionId" UUID,
    "institutionId" UUID,
    "parentInstallationId" UUID,
    "status" "SetupConfigurationInstallationStatus" NOT NULL DEFAULT 'INSTALLED',
    "installedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "installationChecksum" TEXT NOT NULL,
    "effectiveStatus" TEXT NOT NULL,
    "metadata" JSONB NOT NULL DEFAULT '{}',

    CONSTRAINT "setup_configuration_installations_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "setup_configuration_overrides" (
    "id" UUID NOT NULL,
    "installationId" UUID NOT NULL,
    "configurationKey" TEXT NOT NULL,
    "overrideValue" JSONB NOT NULL,
    "inheritedFromLayer" "SetupConfigurationLayer" NOT NULL,
    "inheritedFromPackageKey" TEXT,
    "auditNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "setup_configuration_overrides_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "institution_case_categories" (
    "id" UUID NOT NULL,
    "institutionId" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "displayOrder" INT NOT NULL,
    "protocolReference" TEXT,
    "routingConfiguration" JSONB NOT NULL DEFAULT '{}',
    "status" "StructuralLifecycleStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "institution_case_categories_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "institution_service_standards" (
    "id" UUID NOT NULL,
    "institutionId" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "targetDurationHours" INTEGER,
    "targetDurationDays" INTEGER,
    "businessDaysOnly" BOOLEAN NOT NULL DEFAULT true,
    "protocolReference" TEXT,
    "policyConfiguration" JSONB NOT NULL DEFAULT '{}',
    "status" "StructuralLifecycleStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "institution_service_standards_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "institution_escalation_levels" (
    "id" UUID NOT NULL,
    "institutionId" UUID NOT NULL,
    "levelNumber" INTEGER NOT NULL,
    "code" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "policyConfiguration" JSONB NOT NULL DEFAULT '{}',
    "status" "StructuralLifecycleStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "institution_escalation_levels_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "setup_vocabulary_entries" (
    "id" UUID NOT NULL,
    "institutionId" UUID,
    "vocabularyKind" "SetupVocabularyKind" NOT NULL,
    "code" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "meaning" TEXT,
    "layer" "SetupConfigurationLayer" NOT NULL,
    "configuration" JSONB NOT NULL DEFAULT '{}',
    "status" "StructuralLifecycleStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "setup_vocabulary_entries_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "setup_configuration_packages_packageKey_version_key" ON "setup_configuration_packages"("packageKey", "version");
CREATE INDEX "setup_configuration_packages_layer_idx" ON "setup_configuration_packages"("layer");

CREATE UNIQUE INDEX "setup_configuration_installations_packageId_scopeKey_key" ON "setup_configuration_installations"("packageId", "scopeKey");
CREATE INDEX "setup_configuration_installations_jurisdictionId_idx" ON "setup_configuration_installations"("jurisdictionId");
CREATE INDEX "setup_configuration_installations_institutionId_idx" ON "setup_configuration_installations"("institutionId");
CREATE INDEX "setup_configuration_installations_parentInstallationId_idx" ON "setup_configuration_installations"("parentInstallationId");

CREATE UNIQUE INDEX "setup_configuration_overrides_installationId_configurationKey_key" ON "setup_configuration_overrides"("installationId", "configurationKey");
CREATE INDEX "setup_configuration_overrides_installationId_idx" ON "setup_configuration_overrides"("installationId");

CREATE UNIQUE INDEX "institution_case_categories_institutionId_code_key" ON "institution_case_categories"("institutionId", "code");
CREATE INDEX "institution_case_categories_institutionId_idx" ON "institution_case_categories"("institutionId");

CREATE UNIQUE INDEX "institution_service_standards_institutionId_code_key" ON "institution_service_standards"("institutionId", "code");
CREATE INDEX "institution_service_standards_institutionId_idx" ON "institution_service_standards"("institutionId");

CREATE UNIQUE INDEX "institution_escalation_levels_institutionId_levelNumber_key" ON "institution_escalation_levels"("institutionId", "levelNumber");
CREATE UNIQUE INDEX "institution_escalation_levels_institutionId_code_key" ON "institution_escalation_levels"("institutionId", "code");
CREATE INDEX "institution_escalation_levels_institutionId_idx" ON "institution_escalation_levels"("institutionId");

CREATE UNIQUE INDEX "setup_vocabulary_entries_vocabularyKind_code_institutionId_key" ON "setup_vocabulary_entries"("vocabularyKind", "code", "institutionId");
CREATE INDEX "setup_vocabulary_entries_institutionId_idx" ON "setup_vocabulary_entries"("institutionId");

ALTER TABLE "setup_configuration_installations" ADD CONSTRAINT "setup_configuration_installations_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "setup_configuration_packages"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "setup_configuration_installations" ADD CONSTRAINT "setup_configuration_installations_jurisdictionId_fkey" FOREIGN KEY ("jurisdictionId") REFERENCES "jurisdictions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "setup_configuration_installations" ADD CONSTRAINT "setup_configuration_installations_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "institutions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "setup_configuration_installations" ADD CONSTRAINT "setup_configuration_installations_parentInstallationId_fkey" FOREIGN KEY ("parentInstallationId") REFERENCES "setup_configuration_installations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "setup_configuration_overrides" ADD CONSTRAINT "setup_configuration_overrides_installationId_fkey" FOREIGN KEY ("installationId") REFERENCES "setup_configuration_installations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "institution_case_categories" ADD CONSTRAINT "institution_case_categories_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "institutions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "institution_service_standards" ADD CONSTRAINT "institution_service_standards_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "institutions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "institution_escalation_levels" ADD CONSTRAINT "institution_escalation_levels_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "institutions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "setup_vocabulary_entries" ADD CONSTRAINT "setup_vocabulary_entries_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "institutions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
