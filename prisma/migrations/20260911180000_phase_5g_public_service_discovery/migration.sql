-- CreateEnum
CREATE TYPE "CatalogServiceType" AS ENUM ('APPLICATION', 'REGISTRATION', 'LICENCE', 'PERMIT', 'CERTIFICATION', 'INFORMATION', 'OTHER');

-- CreateEnum
CREATE TYPE "FormVersionStatus" AS ENUM ('DRAFT', 'ACTIVE', 'SUPERSEDED', 'ARCHIVED');

-- AlterTable
ALTER TABLE "government_services" ADD COLUMN "catalogServiceType" "CatalogServiceType",
ADD COLUMN "internalNotes" TEXT,
ADD COLUMN "sensitiveConfig" JSONB;

-- AlterTable
ALTER TABLE "government_service_versions" ADD COLUMN "publicDisclaimer" TEXT,
ADD COLUMN "authorityClassificationSummary" TEXT,
ADD COLUMN "majorDependencies" JSONB NOT NULL DEFAULT '[]',
ADD COLUMN "internalGoverningSourceMaterial" TEXT,
ADD COLUMN "restrictedSecurityNotes" TEXT,
ADD COLUMN "supersededAt" TIMESTAMP(3),
ADD COLUMN "formDefinitionId" UUID,
ADD COLUMN "formVersionId" UUID;

-- CreateTable
CREATE TABLE "form_definitions" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "form_definitions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "form_versions" (
    "id" UUID NOT NULL,
    "formDefinitionId" UUID NOT NULL,
    "versionNumber" INTEGER NOT NULL,
    "status" "FormVersionStatus" NOT NULL DEFAULT 'DRAFT',
    "schema" JSONB NOT NULL,
    "activatedAt" TIMESTAMP(3),
    "supersededAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "form_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "government_service_fee_definitions" (
    "id" UUID NOT NULL,
    "governmentServiceVersionId" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "description" TEXT,
    "amountCents" INTEGER,
    "currency" TEXT NOT NULL DEFAULT 'XCD',
    "isVariable" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "government_service_fee_definitions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "government_service_eligibility_rules" (
    "id" UUID NOT NULL,
    "governmentServiceVersionId" UUID NOT NULL,
    "ruleCode" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "configuration" JSONB NOT NULL DEFAULT '{}',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isRequired" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "government_service_eligibility_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "government_service_checklist_items" (
    "id" UUID NOT NULL,
    "governmentServiceVersionId" UUID NOT NULL,
    "itemCode" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "description" TEXT,
    "conditionExpression" JSONB,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isRequired" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "government_service_checklist_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "government_service_output_definitions" (
    "id" UUID NOT NULL,
    "governmentServiceVersionId" UUID NOT NULL,
    "outputCode" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "description" TEXT,
    "validityLabel" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "government_service_output_definitions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "government_service_redress_routes" (
    "id" UUID NOT NULL,
    "governmentServiceVersionId" UUID NOT NULL,
    "routeCode" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "description" TEXT,
    "contactReference" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "government_service_redress_routes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "form_definitions_code_key" ON "form_definitions"("code");

-- CreateIndex
CREATE INDEX "form_versions_formDefinitionId_idx" ON "form_versions"("formDefinitionId");

-- CreateIndex
CREATE INDEX "form_versions_status_idx" ON "form_versions"("status");

-- CreateIndex
CREATE UNIQUE INDEX "form_versions_formDefinitionId_versionNumber_key" ON "form_versions"("formDefinitionId", "versionNumber");

-- CreateIndex
CREATE INDEX "government_services_catalogServiceType_idx" ON "government_services"("catalogServiceType");

-- CreateIndex
CREATE INDEX "government_service_versions_formDefinitionId_idx" ON "government_service_versions"("formDefinitionId");

-- CreateIndex
CREATE INDEX "government_service_versions_formVersionId_idx" ON "government_service_versions"("formVersionId");

-- CreateIndex
CREATE INDEX "government_service_fee_definitions_governmentServiceVersionI_idx" ON "government_service_fee_definitions"("governmentServiceVersionId");

-- CreateIndex
CREATE UNIQUE INDEX "government_service_fee_definitions_governmentServiceVersionI_key" ON "government_service_fee_definitions"("governmentServiceVersionId", "code");

-- CreateIndex
CREATE INDEX "government_service_eligibility_rules_governmentServiceVersio_idx" ON "government_service_eligibility_rules"("governmentServiceVersionId");

-- CreateIndex
CREATE UNIQUE INDEX "government_service_eligibility_rules_governmentServiceVersio_key" ON "government_service_eligibility_rules"("governmentServiceVersionId", "ruleCode");

-- CreateIndex
CREATE INDEX "government_service_checklist_items_governmentServiceVersionI_idx" ON "government_service_checklist_items"("governmentServiceVersionId");

-- CreateIndex
CREATE UNIQUE INDEX "government_service_checklist_items_governmentServiceVersionI_key" ON "government_service_checklist_items"("governmentServiceVersionId", "itemCode");

-- CreateIndex
CREATE INDEX "government_service_output_definitions_governmentServiceVersi_idx" ON "government_service_output_definitions"("governmentServiceVersionId");

-- CreateIndex
CREATE UNIQUE INDEX "government_service_output_definitions_governmentServiceVersi_key" ON "government_service_output_definitions"("governmentServiceVersionId", "outputCode");

-- CreateIndex
CREATE INDEX "government_service_redress_routes_governmentServiceVersionId_idx" ON "government_service_redress_routes"("governmentServiceVersionId");

-- CreateIndex
CREATE UNIQUE INDEX "government_service_redress_routes_governmentServiceVersionId_key" ON "government_service_redress_routes"("governmentServiceVersionId", "routeCode");

-- AddForeignKey
ALTER TABLE "form_versions" ADD CONSTRAINT "form_versions_formDefinitionId_fkey" FOREIGN KEY ("formDefinitionId") REFERENCES "form_definitions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "government_service_versions" ADD CONSTRAINT "government_service_versions_formDefinitionId_fkey" FOREIGN KEY ("formDefinitionId") REFERENCES "form_definitions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "government_service_versions" ADD CONSTRAINT "government_service_versions_formVersionId_fkey" FOREIGN KEY ("formVersionId") REFERENCES "form_versions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "government_service_fee_definitions" ADD CONSTRAINT "government_service_fee_definitions_governmentServiceVersionI_fkey" FOREIGN KEY ("governmentServiceVersionId") REFERENCES "government_service_versions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "government_service_eligibility_rules" ADD CONSTRAINT "government_service_eligibility_rules_governmentServiceVersio_fkey" FOREIGN KEY ("governmentServiceVersionId") REFERENCES "government_service_versions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "government_service_checklist_items" ADD CONSTRAINT "government_service_checklist_items_governmentServiceVersionI_fkey" FOREIGN KEY ("governmentServiceVersionId") REFERENCES "government_service_versions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "government_service_output_definitions" ADD CONSTRAINT "government_service_output_definitions_governmentServiceVersi_fkey" FOREIGN KEY ("governmentServiceVersionId") REFERENCES "government_service_versions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "government_service_redress_routes" ADD CONSTRAINT "government_service_redress_routes_governmentServiceVersionId_fkey" FOREIGN KEY ("governmentServiceVersionId") REFERENCES "government_service_versions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
