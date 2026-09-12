-- Phase 6E: Completeness review and request-for-information loop

CREATE TYPE "ApplicationCaseStatus" AS ENUM ('OPEN', 'CLOSED', 'SAFE_HALTED');
CREATE TYPE "CaseWorkflowStage" AS ENUM (
  'SUBMITTED',
  'COMPLETENESS_REVIEW',
  'INCOMPLETE',
  'WAITING_APPLICANT',
  'RESUBMITTED',
  'ADMINISTRATIVELY_COMPLETE',
  'SUBSTANTIVE_REVIEW',
  'SAFE_HALTED'
);
CREATE TYPE "CompletenessReviewStatus" AS ENUM (
  'PENDING',
  'IN_REVIEW',
  'INCOMPLETE',
  'COMPLETE',
  'UNRESOLVED',
  'SAFE_HALTED'
);
CREATE TYPE "CompletenessReviewItemStatus" AS ENUM (
  'PRESENT',
  'MISSING',
  'ILLEGIBLE',
  'CORRUPTED',
  'APPARENTLY_INCONSISTENT',
  'SUBSTITUTION_PENDING',
  'NOT_APPLICABLE',
  'UNRESOLVED'
);
CREATE TYPE "DeficiencyNoticeStatus" AS ENUM (
  'DRAFT',
  'ISSUED',
  'RESPONDED',
  'EXPIRED',
  'SUPERSEDED',
  'WITHDRAWN'
);
CREATE TYPE "ApplicantInformationRequestStatus" AS ENUM ('OPEN', 'RESPONDED', 'CLOSED', 'EXPIRED');
CREATE TYPE "ApplicationCaseNotificationOutboxStatus" AS ENUM ('PENDING', 'DISPATCHED', 'FAILED');

CREATE TABLE "application_cases" (
  "id" UUID NOT NULL,
  "caseReference" TEXT NOT NULL,
  "governmentServiceId" UUID NOT NULL,
  "governmentServiceVersionId" UUID NOT NULL,
  "configurationFingerprint" TEXT NOT NULL,
  "applicantIdentityId" UUID NOT NULL,
  "status" "ApplicationCaseStatus" NOT NULL DEFAULT 'OPEN',
  "currentWorkflowStage" "CaseWorkflowStage" NOT NULL DEFAULT 'SUBMITTED',
  "workflowStageEnteredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "application_cases_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "application_submissions" (
  "id" UUID NOT NULL,
  "caseId" UUID NOT NULL,
  "submissionSequence" INTEGER NOT NULL,
  "governmentServiceVersionId" UUID NOT NULL,
  "formVersionId" UUID,
  "configurationFingerprint" TEXT NOT NULL,
  "pinnedChecklistItemIds" JSONB NOT NULL,
  "pinnedChecklistFingerprint" TEXT NOT NULL,
  "answers" JSONB NOT NULL DEFAULT '{}',
  "submittedAt" TIMESTAMP(3) NOT NULL,
  "submittedByIdentityId" UUID NOT NULL,
  "priorSubmissionId" UUID,
  "triggeredByDeficiencyNoticeId" UUID,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "application_submissions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "case_workflow_transitions" (
  "id" UUID NOT NULL,
  "caseId" UUID NOT NULL,
  "fromStage" "CaseWorkflowStage" NOT NULL,
  "toStage" "CaseWorkflowStage" NOT NULL,
  "reason" TEXT,
  "actorIdentityId" UUID,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "case_workflow_transitions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "completeness_reviews" (
  "id" UUID NOT NULL,
  "caseId" UUID NOT NULL,
  "applicationSubmissionId" UUID NOT NULL,
  "governmentServiceVersionId" UUID NOT NULL,
  "checklistConfigurationFingerprint" TEXT NOT NULL,
  "reviewerIdentityId" UUID,
  "reviewerOfficeholderId" UUID,
  "status" "CompletenessReviewStatus" NOT NULL DEFAULT 'PENDING',
  "reviewSequence" INTEGER NOT NULL DEFAULT 1,
  "startedAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "authorityEvaluationRecordId" UUID,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "completeness_reviews_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "completeness_review_items" (
  "id" UUID NOT NULL,
  "completenessReviewId" UUID NOT NULL,
  "checklistItemId" UUID NOT NULL,
  "checklistItemCode" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "isRequired" BOOLEAN NOT NULL DEFAULT true,
  "status" "CompletenessReviewItemStatus" NOT NULL DEFAULT 'UNRESOLVED',
  "reviewerNotes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "completeness_review_items_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "deficiency_notices" (
  "id" UUID NOT NULL,
  "reference" TEXT NOT NULL,
  "caseId" UUID NOT NULL,
  "applicationSubmissionId" UUID NOT NULL,
  "completenessReviewId" UUID NOT NULL,
  "requiredApplicantAction" TEXT NOT NULL,
  "responseDeadline" TIMESTAMP(3) NOT NULL,
  "departmentContactReference" TEXT NOT NULL,
  "issuedByIdentityId" UUID NOT NULL,
  "issuedByOfficeholderId" UUID,
  "issuedAt" TIMESTAMP(3) NOT NULL,
  "status" "DeficiencyNoticeStatus" NOT NULL DEFAULT 'ISSUED',
  "isProceduralNotice" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "deficiency_notices_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "deficiency_notice_items" (
  "id" UUID NOT NULL,
  "deficiencyNoticeId" UUID NOT NULL,
  "completenessReviewItemId" UUID NOT NULL,
  "checklistItemCode" TEXT NOT NULL,
  "deficiencyDescription" TEXT NOT NULL,
  "requiredAction" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "deficiency_notice_items_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "applicant_information_requests" (
  "id" UUID NOT NULL,
  "caseId" UUID NOT NULL,
  "deficiencyNoticeId" UUID NOT NULL,
  "originalSubmissionId" UUID NOT NULL,
  "responseSubmissionId" UUID,
  "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "responseDeadline" TIMESTAMP(3) NOT NULL,
  "status" "ApplicantInformationRequestStatus" NOT NULL DEFAULT 'OPEN',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "applicant_information_requests_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "application_case_notification_outbox" (
  "id" UUID NOT NULL,
  "caseId" UUID NOT NULL,
  "eventType" TEXT NOT NULL,
  "payload" JSONB NOT NULL DEFAULT '{}',
  "status" "ApplicationCaseNotificationOutboxStatus" NOT NULL DEFAULT 'PENDING',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "application_case_notification_outbox_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "application_cases_caseReference_key" ON "application_cases"("caseReference");
CREATE INDEX "application_cases_governmentServiceId_idx" ON "application_cases"("governmentServiceId");
CREATE INDEX "application_cases_governmentServiceVersionId_idx" ON "application_cases"("governmentServiceVersionId");
CREATE INDEX "application_cases_applicantIdentityId_idx" ON "application_cases"("applicantIdentityId");
CREATE INDEX "application_cases_currentWorkflowStage_idx" ON "application_cases"("currentWorkflowStage");

CREATE UNIQUE INDEX "application_submissions_caseId_submissionSequence_key" ON "application_submissions"("caseId", "submissionSequence");
CREATE INDEX "application_submissions_caseId_idx" ON "application_submissions"("caseId");
CREATE INDEX "application_submissions_governmentServiceVersionId_idx" ON "application_submissions"("governmentServiceVersionId");
CREATE INDEX "application_submissions_submittedByIdentityId_idx" ON "application_submissions"("submittedByIdentityId");
CREATE INDEX "application_submissions_priorSubmissionId_idx" ON "application_submissions"("priorSubmissionId");

CREATE INDEX "case_workflow_transitions_caseId_idx" ON "case_workflow_transitions"("caseId");
CREATE INDEX "case_workflow_transitions_createdAt_idx" ON "case_workflow_transitions"("createdAt");

CREATE INDEX "completeness_reviews_caseId_idx" ON "completeness_reviews"("caseId");
CREATE INDEX "completeness_reviews_applicationSubmissionId_idx" ON "completeness_reviews"("applicationSubmissionId");
CREATE INDEX "completeness_reviews_governmentServiceVersionId_idx" ON "completeness_reviews"("governmentServiceVersionId");
CREATE INDEX "completeness_reviews_status_idx" ON "completeness_reviews"("status");

CREATE UNIQUE INDEX "completeness_review_items_completenessReviewId_checklistItem_key" ON "completeness_review_items"("completenessReviewId", "checklistItemCode");
CREATE INDEX "completeness_review_items_completenessReviewId_idx" ON "completeness_review_items"("completenessReviewId");
CREATE INDEX "completeness_review_items_checklistItemId_idx" ON "completeness_review_items"("checklistItemId");

CREATE UNIQUE INDEX "deficiency_notices_reference_key" ON "deficiency_notices"("reference");
CREATE INDEX "deficiency_notices_caseId_idx" ON "deficiency_notices"("caseId");
CREATE INDEX "deficiency_notices_applicationSubmissionId_idx" ON "deficiency_notices"("applicationSubmissionId");
CREATE INDEX "deficiency_notices_completenessReviewId_idx" ON "deficiency_notices"("completenessReviewId");
CREATE INDEX "deficiency_notices_status_idx" ON "deficiency_notices"("status");

CREATE INDEX "deficiency_notice_items_deficiencyNoticeId_idx" ON "deficiency_notice_items"("deficiencyNoticeId");
CREATE INDEX "deficiency_notice_items_completenessReviewItemId_idx" ON "deficiency_notice_items"("completenessReviewItemId");

CREATE INDEX "applicant_information_requests_caseId_idx" ON "applicant_information_requests"("caseId");
CREATE INDEX "applicant_information_requests_deficiencyNoticeId_idx" ON "applicant_information_requests"("deficiencyNoticeId");
CREATE INDEX "applicant_information_requests_originalSubmissionId_idx" ON "applicant_information_requests"("originalSubmissionId");
CREATE INDEX "applicant_information_requests_status_idx" ON "applicant_information_requests"("status");

CREATE INDEX "application_case_notification_outbox_caseId_idx" ON "application_case_notification_outbox"("caseId");
CREATE INDEX "application_case_notification_outbox_status_idx" ON "application_case_notification_outbox"("status");

ALTER TABLE "application_cases"
  ADD CONSTRAINT "application_cases_governmentServiceId_fkey"
  FOREIGN KEY ("governmentServiceId") REFERENCES "government_services"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "application_cases"
  ADD CONSTRAINT "application_cases_governmentServiceVersionId_fkey"
  FOREIGN KEY ("governmentServiceVersionId") REFERENCES "government_service_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "application_cases"
  ADD CONSTRAINT "application_cases_applicantIdentityId_fkey"
  FOREIGN KEY ("applicantIdentityId") REFERENCES "identities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "application_submissions"
  ADD CONSTRAINT "application_submissions_caseId_fkey"
  FOREIGN KEY ("caseId") REFERENCES "application_cases"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "application_submissions"
  ADD CONSTRAINT "application_submissions_governmentServiceVersionId_fkey"
  FOREIGN KEY ("governmentServiceVersionId") REFERENCES "government_service_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "application_submissions"
  ADD CONSTRAINT "application_submissions_submittedByIdentityId_fkey"
  FOREIGN KEY ("submittedByIdentityId") REFERENCES "identities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "application_submissions"
  ADD CONSTRAINT "application_submissions_priorSubmissionId_fkey"
  FOREIGN KEY ("priorSubmissionId") REFERENCES "application_submissions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "application_submissions"
  ADD CONSTRAINT "application_submissions_triggeredByDeficiencyNoticeId_fkey"
  FOREIGN KEY ("triggeredByDeficiencyNoticeId") REFERENCES "deficiency_notices"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "case_workflow_transitions"
  ADD CONSTRAINT "case_workflow_transitions_caseId_fkey"
  FOREIGN KEY ("caseId") REFERENCES "application_cases"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "completeness_reviews"
  ADD CONSTRAINT "completeness_reviews_caseId_fkey"
  FOREIGN KEY ("caseId") REFERENCES "application_cases"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "completeness_reviews"
  ADD CONSTRAINT "completeness_reviews_applicationSubmissionId_fkey"
  FOREIGN KEY ("applicationSubmissionId") REFERENCES "application_submissions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "completeness_reviews"
  ADD CONSTRAINT "completeness_reviews_governmentServiceVersionId_fkey"
  FOREIGN KEY ("governmentServiceVersionId") REFERENCES "government_service_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "completeness_reviews"
  ADD CONSTRAINT "completeness_reviews_reviewerIdentityId_fkey"
  FOREIGN KEY ("reviewerIdentityId") REFERENCES "identities"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "completeness_reviews"
  ADD CONSTRAINT "completeness_reviews_reviewerOfficeholderId_fkey"
  FOREIGN KEY ("reviewerOfficeholderId") REFERENCES "officeholders"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "completeness_reviews"
  ADD CONSTRAINT "completeness_reviews_authorityEvaluationRecordId_fkey"
  FOREIGN KEY ("authorityEvaluationRecordId") REFERENCES "authority_evaluation_records"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "completeness_review_items"
  ADD CONSTRAINT "completeness_review_items_completenessReviewId_fkey"
  FOREIGN KEY ("completenessReviewId") REFERENCES "completeness_reviews"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "deficiency_notices"
  ADD CONSTRAINT "deficiency_notices_caseId_fkey"
  FOREIGN KEY ("caseId") REFERENCES "application_cases"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "deficiency_notices"
  ADD CONSTRAINT "deficiency_notices_applicationSubmissionId_fkey"
  FOREIGN KEY ("applicationSubmissionId") REFERENCES "application_submissions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "deficiency_notices"
  ADD CONSTRAINT "deficiency_notices_completenessReviewId_fkey"
  FOREIGN KEY ("completenessReviewId") REFERENCES "completeness_reviews"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "deficiency_notices"
  ADD CONSTRAINT "deficiency_notices_issuedByIdentityId_fkey"
  FOREIGN KEY ("issuedByIdentityId") REFERENCES "identities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "deficiency_notices"
  ADD CONSTRAINT "deficiency_notices_issuedByOfficeholderId_fkey"
  FOREIGN KEY ("issuedByOfficeholderId") REFERENCES "officeholders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "deficiency_notice_items"
  ADD CONSTRAINT "deficiency_notice_items_deficiencyNoticeId_fkey"
  FOREIGN KEY ("deficiencyNoticeId") REFERENCES "deficiency_notices"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "deficiency_notice_items"
  ADD CONSTRAINT "deficiency_notice_items_completenessReviewItemId_fkey"
  FOREIGN KEY ("completenessReviewItemId") REFERENCES "completeness_review_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "applicant_information_requests"
  ADD CONSTRAINT "applicant_information_requests_caseId_fkey"
  FOREIGN KEY ("caseId") REFERENCES "application_cases"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "applicant_information_requests"
  ADD CONSTRAINT "applicant_information_requests_deficiencyNoticeId_fkey"
  FOREIGN KEY ("deficiencyNoticeId") REFERENCES "deficiency_notices"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "applicant_information_requests"
  ADD CONSTRAINT "applicant_information_requests_originalSubmissionId_fkey"
  FOREIGN KEY ("originalSubmissionId") REFERENCES "application_submissions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "applicant_information_requests"
  ADD CONSTRAINT "applicant_information_requests_responseSubmissionId_fkey"
  FOREIGN KEY ("responseSubmissionId") REFERENCES "application_submissions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "application_case_notification_outbox"
  ADD CONSTRAINT "application_case_notification_outbox_caseId_fkey"
  FOREIGN KEY ("caseId") REFERENCES "application_cases"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
