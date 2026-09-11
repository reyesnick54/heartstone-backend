-- CreateEnum
CREATE TYPE "GovernmentServiceMaturityStatus" AS ENUM ('DRAFT', 'RECOGNIZED', 'APPROVED', 'CONFIGURED', 'TESTED', 'ACCEPTED', 'ACTIVE', 'SUSPENDED', 'SUPERSEDED', 'RETIRED');

-- CreateEnum
CREATE TYPE "GovernmentServicePublicAvailability" AS ENUM ('HIDDEN', 'INFORMATION_ONLY', 'PRE_APPLICATION', 'PILOT_ONLY', 'ACTIVE', 'SUSPENDED', 'UNAVAILABLE', 'UNDER_DEVELOPMENT');

-- CreateEnum
CREATE TYPE "ApplicantCategory" AS ENUM ('INDIVIDUAL', 'CITIZEN', 'RESIDENT', 'NON_RESIDENT', 'BUSINESS', 'COMPANY', 'INVESTOR', 'EMPLOYER', 'EMPLOYEE', 'AUTHORIZED_REPRESENTATIVE', 'PROFESSIONAL', 'GOVERNMENT_ENTITY', 'PARTNER_ORGANIZATION', 'OTHER');

-- CreateEnum
CREATE TYPE "ServiceFunctionMappingStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'SUSPENDED');

-- CreateTable
CREATE TABLE "service_families" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" "StructuralLifecycleStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "service_families_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "government_services" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "officialName" TEXT NOT NULL,
    "publicName" TEXT NOT NULL,
    "summary" TEXT,
    "responsibleInstitutionId" UUID NOT NULL,
    "responsibleDepartmentId" UUID NOT NULL,
    "serviceFamilyId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "government_services_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "government_service_versions" (
    "id" UUID NOT NULL,
    "governmentServiceId" UUID NOT NULL,
    "version" TEXT NOT NULL,
    "purpose" TEXT,
    "coveredActivities" TEXT,
    "excludedActivities" TEXT,
    "geographicScope" TEXT,
    "publicDescription" TEXT,
    "typicalValidityDescription" TEXT,
    "effectiveFrom" TIMESTAMP(3),
    "effectiveUntil" TIMESTAMP(3),
    "informationLastVerifiedAt" TIMESTAMP(3),
    "maturityStatus" "GovernmentServiceMaturityStatus" NOT NULL DEFAULT 'DRAFT',
    "publicAvailability" "GovernmentServicePublicAvailability" NOT NULL DEFAULT 'HIDDEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "government_service_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "government_service_version_applicant_categories" (
    "id" UUID NOT NULL,
    "governmentServiceVersionId" UUID NOT NULL,
    "category" "ApplicantCategory" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "government_service_version_applicant_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "service_function_mappings" (
    "id" UUID NOT NULL,
    "governmentServiceVersionId" UUID NOT NULL,
    "functionAuthorityRecordId" UUID NOT NULL,
    "sequenceOrder" INTEGER NOT NULL DEFAULT 0,
    "isConsequential" BOOLEAN NOT NULL DEFAULT true,
    "publicStageLabel" TEXT,
    "status" "ServiceFunctionMappingStatus" NOT NULL DEFAULT 'ACTIVE',
    "effectiveFrom" TIMESTAMP(3),
    "effectiveUntil" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "service_function_mappings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "service_families_code_key" ON "service_families"("code");

-- CreateIndex
CREATE UNIQUE INDEX "government_services_code_key" ON "government_services"("code");

-- CreateIndex
CREATE UNIQUE INDEX "government_services_slug_key" ON "government_services"("slug");

-- CreateIndex
CREATE INDEX "government_services_responsibleInstitutionId_idx" ON "government_services"("responsibleInstitutionId");

-- CreateIndex
CREATE INDEX "government_services_responsibleDepartmentId_idx" ON "government_services"("responsibleDepartmentId");

-- CreateIndex
CREATE INDEX "government_services_serviceFamilyId_idx" ON "government_services"("serviceFamilyId");

-- CreateIndex
CREATE INDEX "government_service_versions_governmentServiceId_idx" ON "government_service_versions"("governmentServiceId");

-- CreateIndex
CREATE INDEX "government_service_versions_maturityStatus_idx" ON "government_service_versions"("maturityStatus");

-- CreateIndex
CREATE INDEX "government_service_versions_publicAvailability_idx" ON "government_service_versions"("publicAvailability");

-- CreateIndex
CREATE UNIQUE INDEX "government_service_versions_governmentServiceId_version_key" ON "government_service_versions"("governmentServiceId", "version");

-- CreateIndex
CREATE INDEX "government_service_version_applicant_categories_governmentS_idx" ON "government_service_version_applicant_categories"("governmentServiceVersionId");

-- CreateIndex
CREATE UNIQUE INDEX "government_service_version_applicant_categories_governmentS_key" ON "government_service_version_applicant_categories"("governmentServiceVersionId", "category");

-- CreateIndex
CREATE INDEX "service_function_mappings_governmentServiceVersionId_idx" ON "service_function_mappings"("governmentServiceVersionId");

-- CreateIndex
CREATE INDEX "service_function_mappings_functionAuthorityRecordId_idx" ON "service_function_mappings"("functionAuthorityRecordId");

-- CreateIndex
CREATE UNIQUE INDEX "service_function_mappings_governmentServiceVersionId_function_key" ON "service_function_mappings"("governmentServiceVersionId", "functionAuthorityRecordId");

-- AddForeignKey
ALTER TABLE "government_services" ADD CONSTRAINT "government_services_responsibleInstitutionId_fkey" FOREIGN KEY ("responsibleInstitutionId") REFERENCES "institutions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "government_services" ADD CONSTRAINT "government_services_responsibleDepartmentId_fkey" FOREIGN KEY ("responsibleDepartmentId") REFERENCES "departments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "government_services" ADD CONSTRAINT "government_services_serviceFamilyId_fkey" FOREIGN KEY ("serviceFamilyId") REFERENCES "service_families"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "government_service_versions" ADD CONSTRAINT "government_service_versions_governmentServiceId_fkey" FOREIGN KEY ("governmentServiceId") REFERENCES "government_services"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "government_service_version_applicant_categories" ADD CONSTRAINT "government_service_version_applicant_categories_governmentS_fkey" FOREIGN KEY ("governmentServiceVersionId") REFERENCES "government_service_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_function_mappings" ADD CONSTRAINT "service_function_mappings_governmentServiceVersionId_fkey" FOREIGN KEY ("governmentServiceVersionId") REFERENCES "government_service_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_function_mappings" ADD CONSTRAINT "service_function_mappings_functionAuthorityRecordId_fkey" FOREIGN KEY ("functionAuthorityRecordId") REFERENCES "function_authority_records"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
