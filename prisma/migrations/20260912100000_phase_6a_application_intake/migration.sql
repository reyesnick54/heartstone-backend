-- Phase 6A: Application Intake & Immutable Submission Foundation

-- CreateEnum
CREATE TYPE "ApplicationStatus" AS ENUM ('DRAFT', 'READY_FOR_SUBMISSION', 'SUBMITTED', 'RECEIVED', 'CORRECTION_REQUESTED', 'RESUBMITTED', 'WITHDRAWN', 'CANCELLED', 'TRANSFERRED_TO_CASE');

-- CreateEnum
CREATE TYPE "SubmissionChannel" AS ENUM ('WEB_PORTAL', 'MOBILE_APP', 'API', 'COUNTER', 'REPRESENTATIVE_PORTAL');

-- CreateEnum
CREATE TYPE "SubmittedCapacity" AS ENUM ('SELF', 'REPRESENTATIVE', 'ORGANIZATION_MEMBER');

-- CreateTable
CREATE TABLE "applications" (
    "id" UUID NOT NULL,
    "applicationNumber" TEXT NOT NULL,
    "applicantIdentityId" UUID NOT NULL,
    "representativeAuthorityId" UUID,
    "organizationId" UUID,
    "governmentServiceId" UUID NOT NULL,
    "governmentServiceVersionId" UUID NOT NULL,
    "currentStatus" "ApplicationStatus" NOT NULL DEFAULT 'DRAFT',
    "submissionChannel" "SubmissionChannel" NOT NULL DEFAULT 'WEB_PORTAL',
    "draftAnswersPayload" JSONB,
    "draftFormVersionId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "applications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "application_submissions" (
    "id" UUID NOT NULL,
    "applicationId" UUID NOT NULL,
    "submissionSequence" INTEGER NOT NULL,
    "serviceVersionId" UUID NOT NULL,
    "formVersionId" UUID NOT NULL,
    "configurationFingerprint" TEXT NOT NULL,
    "pinnedConfiguration" JSONB NOT NULL,
    "answersPayload" JSONB NOT NULL,
    "submittedByIdentityId" UUID NOT NULL,
    "submittedCapacity" "SubmittedCapacity" NOT NULL,
    "representativeAuthorityId" UUID,
    "submissionChannel" "SubmissionChannel" NOT NULL,
    "submittedAt" TIMESTAMP(3) NOT NULL,
    "payloadHash" TEXT NOT NULL,
    "acknowledgmentReference" TEXT NOT NULL,
    "supersedesSubmissionId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "application_submissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "application_submission_idempotency_keys" (
    "id" UUID NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "applicationId" UUID NOT NULL,
    "submissionId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "application_submission_idempotency_keys_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "applications_applicationNumber_key" ON "applications"("applicationNumber");

-- CreateIndex
CREATE INDEX "applications_applicantIdentityId_idx" ON "applications"("applicantIdentityId");

-- CreateIndex
CREATE INDEX "applications_representativeAuthorityId_idx" ON "applications"("representativeAuthorityId");

-- CreateIndex
CREATE INDEX "applications_organizationId_idx" ON "applications"("organizationId");

-- CreateIndex
CREATE INDEX "applications_governmentServiceId_idx" ON "applications"("governmentServiceId");

-- CreateIndex
CREATE INDEX "applications_governmentServiceVersionId_idx" ON "applications"("governmentServiceVersionId");

-- CreateIndex
CREATE INDEX "applications_currentStatus_idx" ON "applications"("currentStatus");

-- CreateIndex
CREATE UNIQUE INDEX "application_submissions_acknowledgmentReference_key" ON "application_submissions"("acknowledgmentReference");

-- CreateIndex
CREATE INDEX "application_submissions_applicationId_idx" ON "application_submissions"("applicationId");

-- CreateIndex
CREATE INDEX "application_submissions_serviceVersionId_idx" ON "application_submissions"("serviceVersionId");

-- CreateIndex
CREATE INDEX "application_submissions_formVersionId_idx" ON "application_submissions"("formVersionId");

-- CreateIndex
CREATE INDEX "application_submissions_submittedByIdentityId_idx" ON "application_submissions"("submittedByIdentityId");

-- CreateIndex
CREATE UNIQUE INDEX "application_submissions_applicationId_submissionSequence_key" ON "application_submissions"("applicationId", "submissionSequence");

-- CreateIndex
CREATE UNIQUE INDEX "application_submission_idempotency_keys_idempotencyKey_key" ON "application_submission_idempotency_keys"("idempotencyKey");

-- CreateIndex
CREATE INDEX "application_submission_idempotency_keys_applicationId_idx" ON "application_submission_idempotency_keys"("applicationId");

-- CreateIndex
CREATE INDEX "application_submission_idempotency_keys_submissionId_idx" ON "application_submission_idempotency_keys"("submissionId");

-- AddForeignKey
ALTER TABLE "applications" ADD CONSTRAINT "applications_applicantIdentityId_fkey" FOREIGN KEY ("applicantIdentityId") REFERENCES "identities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "applications" ADD CONSTRAINT "applications_representativeAuthorityId_fkey" FOREIGN KEY ("representativeAuthorityId") REFERENCES "representative_authorities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "applications" ADD CONSTRAINT "applications_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "applications" ADD CONSTRAINT "applications_governmentServiceId_fkey" FOREIGN KEY ("governmentServiceId") REFERENCES "government_services"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "applications" ADD CONSTRAINT "applications_governmentServiceVersionId_fkey" FOREIGN KEY ("governmentServiceVersionId") REFERENCES "government_service_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "applications" ADD CONSTRAINT "applications_draftFormVersionId_fkey" FOREIGN KEY ("draftFormVersionId") REFERENCES "form_versions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "application_submissions" ADD CONSTRAINT "application_submissions_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "applications"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "application_submissions" ADD CONSTRAINT "application_submissions_serviceVersionId_fkey" FOREIGN KEY ("serviceVersionId") REFERENCES "government_service_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "application_submissions" ADD CONSTRAINT "application_submissions_formVersionId_fkey" FOREIGN KEY ("formVersionId") REFERENCES "form_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "application_submissions" ADD CONSTRAINT "application_submissions_submittedByIdentityId_fkey" FOREIGN KEY ("submittedByIdentityId") REFERENCES "identities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "application_submissions" ADD CONSTRAINT "application_submissions_representativeAuthorityId_fkey" FOREIGN KEY ("representativeAuthorityId") REFERENCES "representative_authorities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "application_submissions" ADD CONSTRAINT "application_submissions_supersedesSubmissionId_fkey" FOREIGN KEY ("supersedesSubmissionId") REFERENCES "application_submissions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "application_submission_idempotency_keys" ADD CONSTRAINT "application_submission_idempotency_keys_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "applications"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "application_submission_idempotency_keys" ADD CONSTRAINT "application_submission_idempotency_keys_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "application_submissions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
