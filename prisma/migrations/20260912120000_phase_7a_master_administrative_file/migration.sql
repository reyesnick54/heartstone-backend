-- Phase 7A: Master Administrative File foundation

ALTER TABLE "cases" ADD COLUMN "masterAdministrativeFileReference" TEXT;

-- CreateEnum
CREATE TYPE "MasterAdministrativeFileLifecycleStatus" AS ENUM ('OPEN', 'ACTIVE', 'RESTRICTED', 'SAFE_HALTED', 'CLOSURE_PENDING', 'CLOSED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "MasterAdministrativeFileSecurityClassification" AS ENUM ('PUBLIC', 'OFFICIAL', 'INTERNAL', 'RESTRICTED', 'SECRET');

-- CreateEnum
CREATE TYPE "MasterAdministrativeFilePrivacyClassification" AS ENUM ('STANDARD', 'PERSONAL', 'SENSITIVE_PERSONAL', 'SPECIAL_CATEGORY');

-- CreateEnum
CREATE TYPE "MasterAdministrativeFileIntegrityStatus" AS ENUM ('INTACT', 'INTEGRITY_REVIEW_REQUIRED', 'INTEGRITY_COMPROMISED');

-- CreateEnum
CREATE TYPE "MasterAdministrativeFileSectionType" AS ENUM (
    'FILE_CONTROL_AND_INDEX',
    'AUTHORITY_AND_PROCEDURE',
    'APPLICANT_AND_REPRESENTATION',
    'APPLICATION_HISTORY',
    'SUPPORTING_EVIDENCE',
    'COMPLETENESS_REVIEW',
    'SUBSTANTIVE_REVIEW',
    'GOVERNMENT_REFERRALS',
    'PROFESSIONAL_REVIEWS',
    'INSPECTIONS',
    'RECOMMENDATION_AND_DECISION',
    'ISSUANCE',
    'CONDITIONS_AND_COMPLIANCE',
    'FEES_AND_FINANCIAL_RECORDS',
    'COMMUNICATIONS_AND_NOTICES',
    'CONTINUING_OBLIGATIONS_AND_MONITORING',
    'COMPLAINT_RECONSIDERATION_APPEAL',
    'SUSPENSION_REVOCATION_ENFORCEMENT',
    'CLOSURE_AND_ARCHIVE',
    'AUDIT_AND_TECHNICAL_HISTORY'
);

-- CreateTable
CREATE TABLE "master_administrative_files" (
    "id" UUID NOT NULL,
    "fileNumber" TEXT NOT NULL,
    "caseId" UUID NOT NULL,
    "applicationId" UUID NOT NULL,
    "governmentServiceId" UUID NOT NULL,
    "governmentServiceVersionId" UUID NOT NULL,
    "responsibleInstitutionId" UUID NOT NULL,
    "responsibleDepartmentId" UUID NOT NULL,
    "administrativeOwnerOfficeId" UUID NOT NULL,
    "recordsCustodianOfficeId" UUID NOT NULL,
    "workflowVersionId" TEXT,
    "openedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closedAt" TIMESTAMP(3),
    "lifecycleStatus" "MasterAdministrativeFileLifecycleStatus" NOT NULL DEFAULT 'OPEN',
    "securityClassification" "MasterAdministrativeFileSecurityClassification" NOT NULL DEFAULT 'OFFICIAL',
    "privacyClassification" "MasterAdministrativeFilePrivacyClassification" NOT NULL DEFAULT 'STANDARD',
    "retentionCategoryCode" TEXT,
    "legalHoldIndicator" BOOLEAN NOT NULL DEFAULT false,
    "authoritativeRecordLocationReference" TEXT NOT NULL,
    "archiveLocationReference" TEXT,
    "integrityStatus" "MasterAdministrativeFileIntegrityStatus" NOT NULL DEFAULT 'INTACT',
    "lastReviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "master_administrative_files_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "master_administrative_file_sections" (
    "id" UUID NOT NULL,
    "masterAdministrativeFileId" UUID NOT NULL,
    "sectionType" "MasterAdministrativeFileSectionType" NOT NULL,
    "sectionNumber" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "isRestricted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "master_administrative_file_sections_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "master_administrative_files_fileNumber_key" ON "master_administrative_files"("fileNumber");

-- CreateIndex
CREATE UNIQUE INDEX "master_administrative_files_caseId_key" ON "master_administrative_files"("caseId");

-- CreateIndex
CREATE UNIQUE INDEX "master_administrative_files_applicationId_key" ON "master_administrative_files"("applicationId");

-- CreateIndex
CREATE INDEX "master_administrative_files_governmentServiceId_idx" ON "master_administrative_files"("governmentServiceId");

-- CreateIndex
CREATE INDEX "master_administrative_files_responsibleInstitutionId_idx" ON "master_administrative_files"("responsibleInstitutionId");

-- CreateIndex
CREATE INDEX "master_administrative_files_responsibleDepartmentId_idx" ON "master_administrative_files"("responsibleDepartmentId");

-- CreateIndex
CREATE INDEX "master_administrative_files_administrativeOwnerOfficeId_idx" ON "master_administrative_files"("administrativeOwnerOfficeId");

-- CreateIndex
CREATE INDEX "master_administrative_files_recordsCustodianOfficeId_idx" ON "master_administrative_files"("recordsCustodianOfficeId");

-- CreateIndex
CREATE INDEX "master_administrative_files_lifecycleStatus_idx" ON "master_administrative_files"("lifecycleStatus");

-- CreateIndex
CREATE UNIQUE INDEX "maf_sections_file_section_type_key" ON "master_administrative_file_sections"("masterAdministrativeFileId", "sectionType");

-- CreateIndex
CREATE INDEX "maf_sections_file_id_idx" ON "master_administrative_file_sections"("masterAdministrativeFileId");

-- AddForeignKey
ALTER TABLE "master_administrative_files" ADD CONSTRAINT "master_administrative_files_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "cases"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "master_administrative_files" ADD CONSTRAINT "master_administrative_files_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "applications"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "master_administrative_files" ADD CONSTRAINT "master_administrative_files_governmentServiceId_fkey" FOREIGN KEY ("governmentServiceId") REFERENCES "government_services"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "master_administrative_files" ADD CONSTRAINT "master_administrative_files_governmentServiceVersionId_fkey" FOREIGN KEY ("governmentServiceVersionId") REFERENCES "government_service_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "master_administrative_files" ADD CONSTRAINT "master_administrative_files_responsibleInstitutionId_fkey" FOREIGN KEY ("responsibleInstitutionId") REFERENCES "institutions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "master_administrative_files" ADD CONSTRAINT "master_administrative_files_responsibleDepartmentId_fkey" FOREIGN KEY ("responsibleDepartmentId") REFERENCES "departments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "master_administrative_files" ADD CONSTRAINT "master_administrative_files_administrativeOwnerOfficeId_fkey" FOREIGN KEY ("administrativeOwnerOfficeId") REFERENCES "offices"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "master_administrative_files" ADD CONSTRAINT "master_administrative_files_recordsCustodianOfficeId_fkey" FOREIGN KEY ("recordsCustodianOfficeId") REFERENCES "offices"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "master_administrative_file_sections" ADD CONSTRAINT "master_administrative_file_sections_masterAdministrativeFileId_fkey" FOREIGN KEY ("masterAdministrativeFileId") REFERENCES "master_administrative_files"("id") ON DELETE CASCADE ON UPDATE CASCADE;
