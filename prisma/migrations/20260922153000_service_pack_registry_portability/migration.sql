-- CreateEnum
CREATE TYPE "ServicePackExportRestriction" AS ENUM ('TEMPLATE_PORTABLE', 'INSTITUTION_RESTRICTED');

-- CreateEnum
CREATE TYPE "ServicePackJurisdictionBindingKind" AS ENUM ('OPERATIONAL', 'TEMPLATE');

-- AlterEnum
ALTER TYPE "ServicePackManifestValidationStatus" ADD VALUE 'DRAFT_IMPORTED';

-- AlterEnum
ALTER TYPE "ServicePackImportStatus" ADD VALUE 'DRAFT_IMPORTED';

-- AlterTable
ALTER TABLE "service_packs" ADD COLUMN "departmentCode" TEXT,
ADD COLUMN "exportRestriction" "ServicePackExportRestriction" NOT NULL DEFAULT 'INSTITUTION_RESTRICTED',
ADD COLUMN "responsibleOwnerIdentityId" UUID,
ADD COLUMN "templateSourceServicePackId" UUID;

-- CreateTable
CREATE TABLE "service_pack_jurisdiction_bindings" (
    "id" UUID NOT NULL,
    "servicePackId" UUID NOT NULL,
    "jurisdictionId" UUID NOT NULL,
    "bindingKind" "ServicePackJurisdictionBindingKind" NOT NULL DEFAULT 'OPERATIONAL',
    "authorityMappingsRevalidationRequired" BOOLEAN NOT NULL DEFAULT true,
    "governingSourcesRevalidationRequired" BOOLEAN NOT NULL DEFAULT true,
    "institutionsRevalidationRequired" BOOLEAN NOT NULL DEFAULT true,
    "feesRevalidationRequired" BOOLEAN NOT NULL DEFAULT true,
    "eligibilityRevalidationRequired" BOOLEAN NOT NULL DEFAULT true,
    "integrationsRevalidationRequired" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "service_pack_jurisdiction_bindings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "service_packs_responsibleOwnerIdentityId_idx" ON "service_packs"("responsibleOwnerIdentityId");

-- CreateIndex
CREATE INDEX "service_packs_templateSourceServicePackId_idx" ON "service_packs"("templateSourceServicePackId");

-- CreateIndex
CREATE UNIQUE INDEX "service_pack_jurisdiction_bindings_servicePackId_jurisdictionI_key" ON "service_pack_jurisdiction_bindings"("servicePackId", "jurisdictionId");

-- CreateIndex
CREATE INDEX "service_pack_jurisdiction_bindings_jurisdictionId_idx" ON "service_pack_jurisdiction_bindings"("jurisdictionId");

-- AddForeignKey
ALTER TABLE "service_packs" ADD CONSTRAINT "service_packs_responsibleOwnerIdentityId_fkey" FOREIGN KEY ("responsibleOwnerIdentityId") REFERENCES "identities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_packs" ADD CONSTRAINT "service_packs_templateSourceServicePackId_fkey" FOREIGN KEY ("templateSourceServicePackId") REFERENCES "service_packs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_pack_jurisdiction_bindings" ADD CONSTRAINT "service_pack_jurisdiction_bindings_servicePackId_fkey" FOREIGN KEY ("servicePackId") REFERENCES "service_packs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_pack_jurisdiction_bindings" ADD CONSTRAINT "service_pack_jurisdiction_bindings_jurisdictionId_fkey" FOREIGN KEY ("jurisdictionId") REFERENCES "jurisdictions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
