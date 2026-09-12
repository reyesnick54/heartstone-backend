-- CreateEnum
CREATE TYPE "CaseStatus" AS ENUM ('RECEIVED', 'IDENTITY_PENDING', 'COMPLETENESS_REVIEW', 'INCOMPLETE', 'COMPLETE', 'SUBSTANTIVE_REVIEW', 'EXTERNAL_REFERRAL', 'PROFESSIONAL_REVIEW', 'INSPECTION', 'DECISION_PENDING', 'DECIDED', 'ISSUED', 'UNDER_CONTINUING_OVERSIGHT', 'UNDER_COMPLAINT_OR_APPEAL', 'SUSPENDED', 'REVOKED', 'WITHDRAWN', 'CLOSED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "CaseLegalStatus" AS ENUM ('NONE', 'PENDING', 'UNRESOLVED', 'EXTERNAL_STATUS_PENDING');

-- CreateEnum
CREATE TYPE "CasePriority" AS ENUM ('LOW', 'NORMAL', 'HIGH', 'URGENT');

-- CreateEnum
CREATE TYPE "CaseRelationshipType" AS ENUM ('RELATED_CASE', 'PARENT_CHILD', 'RELATED_SERVICE_MATTER', 'ORGANIZATION_PROJECT_REFERENCE');

-- CreateTable
CREATE TABLE "cases" (
    "id" UUID NOT NULL,
    "caseNumber" TEXT NOT NULL,
    "applicationId" UUID NOT NULL,
    "applicationSubmissionId" UUID NOT NULL,
    "governmentServiceId" UUID NOT NULL,
    "governmentServiceVersionId" UUID NOT NULL,
    "responsibleInstitutionId" UUID NOT NULL,
    "responsibleDepartmentId" UUID NOT NULL,
    "caseStatus" "CaseStatus" NOT NULL DEFAULT 'RECEIVED',
    "legalStatus" "CaseLegalStatus" NOT NULL DEFAULT 'NONE',
    "priority" "CasePriority" NOT NULL DEFAULT 'NORMAL',
    "openedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closedAt" TIMESTAMP(3),
    "currentCaseManagerOfficeholderId" UUID,
    "currentAssignedOfficeId" UUID,
    "applicantIdentityId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "case_status_history" (
    "id" UUID NOT NULL,
    "caseId" UUID NOT NULL,
    "previousStatus" "CaseStatus",
    "newStatus" "CaseStatus" NOT NULL,
    "previousLegalStatus" "CaseLegalStatus",
    "newLegalStatus" "CaseLegalStatus" NOT NULL,
    "actorIdentityId" UUID NOT NULL,
    "officeholderId" UUID,
    "reason" TEXT,
    "correlationId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "case_status_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "case_relationships" (
    "id" UUID NOT NULL,
    "sourceCaseId" UUID NOT NULL,
    "targetCaseId" UUID,
    "relationshipType" "CaseRelationshipType" NOT NULL,
    "relatedServiceMatterRef" TEXT,
    "organizationProjectRef" TEXT,
    "parentCaseId" UUID,
    "childCaseId" UUID,
    "establishedByIdentityId" UUID NOT NULL,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "case_relationships_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "cases_caseNumber_key" ON "cases"("caseNumber");

-- CreateIndex
CREATE UNIQUE INDEX "cases_applicationId_key" ON "cases"("applicationId");

-- CreateIndex
CREATE UNIQUE INDEX "cases_applicationSubmissionId_key" ON "cases"("applicationSubmissionId");

-- CreateIndex
CREATE INDEX "cases_applicantIdentityId_idx" ON "cases"("applicantIdentityId");

-- CreateIndex
CREATE INDEX "cases_responsibleDepartmentId_idx" ON "cases"("responsibleDepartmentId");

-- CreateIndex
CREATE INDEX "cases_responsibleInstitutionId_idx" ON "cases"("responsibleInstitutionId");

-- CreateIndex
CREATE INDEX "cases_caseStatus_idx" ON "cases"("caseStatus");

-- CreateIndex
CREATE INDEX "cases_legalStatus_idx" ON "cases"("legalStatus");

-- CreateIndex
CREATE INDEX "case_status_history_caseId_idx" ON "case_status_history"("caseId");

-- CreateIndex
CREATE INDEX "case_status_history_actorIdentityId_idx" ON "case_status_history"("actorIdentityId");

-- CreateIndex
CREATE INDEX "case_status_history_createdAt_idx" ON "case_status_history"("createdAt");

-- CreateIndex
CREATE INDEX "case_relationships_sourceCaseId_idx" ON "case_relationships"("sourceCaseId");

-- CreateIndex
CREATE INDEX "case_relationships_targetCaseId_idx" ON "case_relationships"("targetCaseId");

-- CreateIndex
CREATE INDEX "case_relationships_parentCaseId_idx" ON "case_relationships"("parentCaseId");

-- CreateIndex
CREATE INDEX "case_relationships_childCaseId_idx" ON "case_relationships"("childCaseId");

-- AddForeignKey
ALTER TABLE "cases" ADD CONSTRAINT "cases_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "applications"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cases" ADD CONSTRAINT "cases_applicationSubmissionId_fkey" FOREIGN KEY ("applicationSubmissionId") REFERENCES "application_submissions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cases" ADD CONSTRAINT "cases_governmentServiceId_fkey" FOREIGN KEY ("governmentServiceId") REFERENCES "government_services"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cases" ADD CONSTRAINT "cases_governmentServiceVersionId_fkey" FOREIGN KEY ("governmentServiceVersionId") REFERENCES "government_service_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cases" ADD CONSTRAINT "cases_responsibleInstitutionId_fkey" FOREIGN KEY ("responsibleInstitutionId") REFERENCES "institutions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cases" ADD CONSTRAINT "cases_responsibleDepartmentId_fkey" FOREIGN KEY ("responsibleDepartmentId") REFERENCES "departments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cases" ADD CONSTRAINT "cases_applicantIdentityId_fkey" FOREIGN KEY ("applicantIdentityId") REFERENCES "identities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cases" ADD CONSTRAINT "cases_currentCaseManagerOfficeholderId_fkey" FOREIGN KEY ("currentCaseManagerOfficeholderId") REFERENCES "officeholders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cases" ADD CONSTRAINT "cases_currentAssignedOfficeId_fkey" FOREIGN KEY ("currentAssignedOfficeId") REFERENCES "offices"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "case_status_history" ADD CONSTRAINT "case_status_history_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "cases"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "case_status_history" ADD CONSTRAINT "case_status_history_actorIdentityId_fkey" FOREIGN KEY ("actorIdentityId") REFERENCES "identities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "case_status_history" ADD CONSTRAINT "case_status_history_officeholderId_fkey" FOREIGN KEY ("officeholderId") REFERENCES "officeholders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "case_relationships" ADD CONSTRAINT "case_relationships_sourceCaseId_fkey" FOREIGN KEY ("sourceCaseId") REFERENCES "cases"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "case_relationships" ADD CONSTRAINT "case_relationships_targetCaseId_fkey" FOREIGN KEY ("targetCaseId") REFERENCES "cases"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "case_relationships" ADD CONSTRAINT "case_relationships_establishedByIdentityId_fkey" FOREIGN KEY ("establishedByIdentityId") REFERENCES "identities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
