-- Service Pack manifest validation layer (additive to deployment lifecycle)

CREATE TYPE "ServicePackManifestValidationStatus" AS ENUM (
  'DRAFT',
  'VALIDATING',
  'INVALID',
  'VALIDATED',
  'PENDING_REVIEW'
);

CREATE TYPE "ServicePackComponentKind" AS ENUM (
  'JURISDICTION',
  'INSTITUTION',
  'DEPARTMENT',
  'SERVICE',
  'AUTHORITY_MAPPING',
  'FORM',
  'EVIDENCE_REQUIREMENT',
  'WORKFLOW',
  'FEE',
  'OUTPUT',
  'SLA_RULE',
  'COMMUNICATION',
  'INTEGRATION',
  'RENEWAL',
  'COMPLIANCE',
  'REDRESS',
  'DASHBOARD_DEFINITION'
);

CREATE TYPE "ServicePackDependencyKind" AS ENUM (
  'DEPARTMENT',
  'EXTERNAL_AUTHORITY',
  'EXTERNAL_REGISTRY',
  'PAYMENT_PROVIDER',
  'IDENTITY_PROVIDER',
  'INTEGRATION',
  'PROFESSIONAL'
);

CREATE TYPE "ServicePackDependencyControlScope" AS ENUM (
  'HEARTSTONE_CONTROLLED',
  'EXTERNAL'
);

CREATE TYPE "ServicePackValidationOutcome" AS ENUM (
  'PASSED',
  'FAILED'
);

CREATE TYPE "ServicePackImportStatus" AS ENUM (
  'RECEIVED',
  'VALIDATING',
  'VALIDATED',
  'REJECTED'
);

ALTER TABLE "service_packs" ADD COLUMN "jurisdictionId" UUID;
CREATE INDEX "service_packs_jurisdictionId_idx" ON "service_packs"("jurisdictionId");
ALTER TABLE "service_packs" ADD CONSTRAINT "service_packs_jurisdictionId_fkey" FOREIGN KEY ("jurisdictionId") REFERENCES "jurisdictions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "service_pack_versions" ADD COLUMN "manifestVersion" TEXT NOT NULL DEFAULT 'heartstone.service-pack/v1';
ALTER TABLE "service_pack_versions" ADD COLUMN "manifestValidationStatus" "ServicePackManifestValidationStatus" NOT NULL DEFAULT 'DRAFT';
ALTER TABLE "service_pack_versions" ADD COLUMN "manifestChecksum" TEXT;
ALTER TABLE "service_pack_versions" ADD COLUMN "immutable" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "service_pack_versions" ADD COLUMN "acceptedByIdentityId" UUID;
CREATE INDEX "service_pack_versions_manifestValidationStatus_idx" ON "service_pack_versions"("manifestValidationStatus");
CREATE INDEX "service_pack_versions_manifestChecksum_idx" ON "service_pack_versions"("manifestChecksum");
ALTER TABLE "service_pack_versions" ADD CONSTRAINT "service_pack_versions_acceptedByIdentityId_fkey" FOREIGN KEY ("acceptedByIdentityId") REFERENCES "identities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "service_pack_components" (
  "id" UUID NOT NULL,
  "servicePackVersionId" UUID NOT NULL,
  "componentKind" "ServicePackComponentKind" NOT NULL,
  "componentCode" TEXT NOT NULL,
  "manifestPath" TEXT NOT NULL,
  "targetDomain" TEXT,
  "targetReferenceId" UUID,
  "configuration" JSONB NOT NULL DEFAULT '{}',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "service_pack_components_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "service_pack_dependencies" (
  "id" UUID NOT NULL,
  "servicePackVersionId" UUID NOT NULL,
  "dependencyKind" "ServicePackDependencyKind" NOT NULL,
  "dependencyCode" TEXT NOT NULL,
  "referenceKind" TEXT NOT NULL,
  "referenceId" UUID,
  "referenceCode" TEXT,
  "controlScope" "ServicePackDependencyControlScope" NOT NULL DEFAULT 'EXTERNAL',
  "isRequired" BOOLEAN NOT NULL DEFAULT true,
  "manifestPath" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "service_pack_dependencies_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "service_pack_imports" (
  "id" UUID NOT NULL,
  "servicePackId" UUID NOT NULL,
  "servicePackVersionId" UUID,
  "manifestPayload" JSONB NOT NULL,
  "manifestChecksum" TEXT NOT NULL,
  "status" "ServicePackImportStatus" NOT NULL DEFAULT 'RECEIVED',
  "importedByIdentityId" UUID,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "service_pack_imports_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "service_pack_validation_results" (
  "id" UUID NOT NULL,
  "servicePackVersionId" UUID NOT NULL,
  "importId" UUID,
  "outcome" "ServicePackValidationOutcome" NOT NULL,
  "issues" JSONB NOT NULL DEFAULT '[]',
  "manifestVersion" TEXT NOT NULL,
  "manifestChecksum" TEXT NOT NULL,
  "validatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "validatedByIdentityId" UUID,
  CONSTRAINT "service_pack_validation_results_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "service_pack_components_servicePackVersionId_componentKind_componentCode_key" ON "service_pack_components"("servicePackVersionId", "componentKind", "componentCode");
CREATE INDEX "service_pack_components_servicePackVersionId_idx" ON "service_pack_components"("servicePackVersionId");

CREATE UNIQUE INDEX "service_pack_dependencies_servicePackVersionId_dependencyCode_key" ON "service_pack_dependencies"("servicePackVersionId", "dependencyCode");
CREATE INDEX "service_pack_dependencies_servicePackVersionId_idx" ON "service_pack_dependencies"("servicePackVersionId");
CREATE INDEX "service_pack_dependencies_referenceKind_referenceId_idx" ON "service_pack_dependencies"("referenceKind", "referenceId");

CREATE INDEX "service_pack_imports_servicePackId_idx" ON "service_pack_imports"("servicePackId");
CREATE INDEX "service_pack_imports_servicePackVersionId_idx" ON "service_pack_imports"("servicePackVersionId");
CREATE INDEX "service_pack_imports_status_idx" ON "service_pack_imports"("status");

CREATE INDEX "service_pack_validation_results_servicePackVersionId_idx" ON "service_pack_validation_results"("servicePackVersionId");
CREATE INDEX "service_pack_validation_results_importId_idx" ON "service_pack_validation_results"("importId");
CREATE INDEX "service_pack_validation_results_outcome_idx" ON "service_pack_validation_results"("outcome");

ALTER TABLE "service_pack_components" ADD CONSTRAINT "service_pack_components_servicePackVersionId_fkey" FOREIGN KEY ("servicePackVersionId") REFERENCES "service_pack_versions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "service_pack_dependencies" ADD CONSTRAINT "service_pack_dependencies_servicePackVersionId_fkey" FOREIGN KEY ("servicePackVersionId") REFERENCES "service_pack_versions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "service_pack_imports" ADD CONSTRAINT "service_pack_imports_servicePackId_fkey" FOREIGN KEY ("servicePackId") REFERENCES "service_packs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "service_pack_imports" ADD CONSTRAINT "service_pack_imports_servicePackVersionId_fkey" FOREIGN KEY ("servicePackVersionId") REFERENCES "service_pack_versions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "service_pack_imports" ADD CONSTRAINT "service_pack_imports_importedByIdentityId_fkey" FOREIGN KEY ("importedByIdentityId") REFERENCES "identities"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "service_pack_validation_results" ADD CONSTRAINT "service_pack_validation_results_servicePackVersionId_fkey" FOREIGN KEY ("servicePackVersionId") REFERENCES "service_pack_versions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "service_pack_validation_results" ADD CONSTRAINT "service_pack_validation_results_importId_fkey" FOREIGN KEY ("importId") REFERENCES "service_pack_imports"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "service_pack_validation_results" ADD CONSTRAINT "service_pack_validation_results_validatedByIdentityId_fkey" FOREIGN KEY ("validatedByIdentityId") REFERENCES "identities"("id") ON DELETE SET NULL ON UPDATE CASCADE;
