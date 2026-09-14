-- Phase 9B: Compliance submissions, evidence links, and reviews

CREATE TYPE "ComplianceSubmissionStatus" AS ENUM (
    'RECEIVED',
    'INCOMPLETE',
    'COMPLETE_FOR_REVIEW',
    'UNDER_REVIEW',
    'CORRECTION_REQUESTED',
    'WITHDRAWN',
    'SUPERSEDED'
);

CREATE TYPE "ObligationEvidenceLinkRole" AS ENUM (
    'HOLDER_SUBMITTED',
    'INDEPENDENTLY_VERIFIED',
    'PROFESSIONAL_CERTIFICATION',
    'GOVERNMENT_OBSERVATION',
    'OTHER_REFERENCE'
);

CREATE TYPE "ComplianceReviewStatus" AS ENUM (
    'PENDING',
    'IN_REVIEW',
    'SATISFACTORY_FOR_STATED_PURPOSE',
    'DEFICIENCY_IDENTIFIED',
    'MORE_INFORMATION_REQUIRED',
    'DISPUTED',
    'SAFE_HALTED'
);

ALTER TABLE "continuing_obligations"
    ADD COLUMN "extensionAuthorityReference" TEXT,
    ADD COLUMN "extensionGrantedAt" TIMESTAMP(3),
    ADD COLUMN "effectiveExtendedDueDate" TIMESTAMP(3);

CREATE TABLE "compliance_submissions" (
    "id" UUID NOT NULL,
    "submissionNumber" TEXT NOT NULL,
    "complianceMatterId" UUID NOT NULL,
    "continuingObligationId" UUID NOT NULL,
    "reportingPeriodStart" TIMESTAMP(3) NOT NULL,
    "reportingPeriodEnd" TIMESTAMP(3) NOT NULL,
    "submittedByIdentityId" UUID NOT NULL,
    "representativeAuthorityId" UUID,
    "submittedAt" TIMESTAMP(3),
    "status" "ComplianceSubmissionStatus" NOT NULL DEFAULT 'RECEIVED',
    "declarationReference" TEXT,
    "currentVersionId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "compliance_submissions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "compliance_submission_versions" (
    "id" UUID NOT NULL,
    "submissionId" UUID NOT NULL,
    "version" INTEGER NOT NULL,
    "answersData" JSONB NOT NULL DEFAULT '{}',
    "documentReferences" JSONB NOT NULL DEFAULT '[]',
    "evidenceReferences" JSONB NOT NULL DEFAULT '[]',
    "payloadHash" TEXT NOT NULL,
    "submittedAt" TIMESTAMP(3) NOT NULL,
    "supersedesVersionId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "compliance_submission_versions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "obligation_evidence_links" (
    "id" UUID NOT NULL,
    "continuingObligationId" UUID NOT NULL,
    "evidenceRecordId" UUID NOT NULL,
    "linkRole" "ObligationEvidenceLinkRole" NOT NULL,
    "isHolderSubmitted" BOOLEAN NOT NULL DEFAULT true,
    "linkedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "linkedByIdentityId" UUID NOT NULL,
    "evidenceVerificationId" UUID,
    "evidencePurposeAcceptanceId" UUID,
    "notes" TEXT,
    CONSTRAINT "obligation_evidence_links_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "compliance_reviews" (
    "id" UUID NOT NULL,
    "reviewNumber" TEXT NOT NULL,
    "reviewerIdentityId" UUID NOT NULL,
    "reviewerOfficeholderId" UUID,
    "functionAuthorityRecordId" UUID,
    "continuingObligationId" UUID NOT NULL,
    "complianceSubmissionId" UUID NOT NULL,
    "submissionVersionId" UUID NOT NULL,
    "criteria" JSONB NOT NULL DEFAULT '[]',
    "findings" JSONB NOT NULL DEFAULT '[]',
    "unresolvedIssues" JSONB NOT NULL DEFAULT '[]',
    "reviewDate" TIMESTAMP(3),
    "authorityEvaluationRecordId" UUID,
    "status" "ComplianceReviewStatus" NOT NULL DEFAULT 'PENDING',
    "isAiProposed" BOOLEAN NOT NULL DEFAULT false,
    "finalizedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "compliance_reviews_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "compliance_review_items" (
    "id" UUID NOT NULL,
    "complianceReviewId" UUID NOT NULL,
    "sequence" INTEGER NOT NULL,
    "criterionReference" TEXT NOT NULL,
    "assessment" TEXT,
    "evidenceRecordIds" JSONB NOT NULL DEFAULT '[]',
    "deficiencyNotes" TEXT,
    "status" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "compliance_review_items_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "compliance_submissions_submissionNumber_key" ON "compliance_submissions"("submissionNumber");
CREATE UNIQUE INDEX "compliance_submissions_currentVersionId_key" ON "compliance_submissions"("currentVersionId");
CREATE UNIQUE INDEX "compliance_submission_versions_submissionId_version_key" ON "compliance_submission_versions"("submissionId", "version");
CREATE UNIQUE INDEX "compliance_reviews_reviewNumber_key" ON "compliance_reviews"("reviewNumber");
CREATE UNIQUE INDEX "compliance_review_items_complianceReviewId_sequence_key" ON "compliance_review_items"("complianceReviewId", "sequence");

CREATE INDEX "compliance_submissions_complianceMatterId_idx" ON "compliance_submissions"("complianceMatterId");
CREATE INDEX "compliance_submissions_continuingObligationId_idx" ON "compliance_submissions"("continuingObligationId");
CREATE INDEX "compliance_submissions_status_idx" ON "compliance_submissions"("status");
CREATE INDEX "compliance_submissions_submittedAt_idx" ON "compliance_submissions"("submittedAt");
CREATE INDEX "compliance_submission_versions_submissionId_idx" ON "compliance_submission_versions"("submissionId");
CREATE INDEX "compliance_submission_versions_submittedAt_idx" ON "compliance_submission_versions"("submittedAt");
CREATE INDEX "obligation_evidence_links_continuingObligationId_idx" ON "obligation_evidence_links"("continuingObligationId");
CREATE INDEX "obligation_evidence_links_evidenceRecordId_idx" ON "obligation_evidence_links"("evidenceRecordId");
CREATE INDEX "obligation_evidence_links_isHolderSubmitted_idx" ON "obligation_evidence_links"("isHolderSubmitted");
CREATE INDEX "compliance_reviews_continuingObligationId_idx" ON "compliance_reviews"("continuingObligationId");
CREATE INDEX "compliance_reviews_submissionVersionId_idx" ON "compliance_reviews"("submissionVersionId");
CREATE INDEX "compliance_reviews_status_idx" ON "compliance_reviews"("status");
CREATE INDEX "compliance_reviews_reviewerIdentityId_idx" ON "compliance_reviews"("reviewerIdentityId");
CREATE INDEX "compliance_review_items_complianceReviewId_idx" ON "compliance_review_items"("complianceReviewId");

ALTER TABLE "compliance_submissions" ADD CONSTRAINT "compliance_submissions_complianceMatterId_fkey" FOREIGN KEY ("complianceMatterId") REFERENCES "compliance_matters"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "compliance_submissions" ADD CONSTRAINT "compliance_submissions_continuingObligationId_fkey" FOREIGN KEY ("continuingObligationId") REFERENCES "continuing_obligations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "compliance_submissions" ADD CONSTRAINT "compliance_submissions_submittedByIdentityId_fkey" FOREIGN KEY ("submittedByIdentityId") REFERENCES "identities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "compliance_submissions" ADD CONSTRAINT "compliance_submissions_representativeAuthorityId_fkey" FOREIGN KEY ("representativeAuthorityId") REFERENCES "representative_authorities"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "compliance_submissions" ADD CONSTRAINT "compliance_submissions_currentVersionId_fkey" FOREIGN KEY ("currentVersionId") REFERENCES "compliance_submission_versions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "compliance_submission_versions" ADD CONSTRAINT "compliance_submission_versions_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "compliance_submissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "compliance_submission_versions" ADD CONSTRAINT "compliance_submission_versions_supersedesVersionId_fkey" FOREIGN KEY ("supersedesVersionId") REFERENCES "compliance_submission_versions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "obligation_evidence_links" ADD CONSTRAINT "obligation_evidence_links_continuingObligationId_fkey" FOREIGN KEY ("continuingObligationId") REFERENCES "continuing_obligations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "obligation_evidence_links" ADD CONSTRAINT "obligation_evidence_links_evidenceRecordId_fkey" FOREIGN KEY ("evidenceRecordId") REFERENCES "evidence_records"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "obligation_evidence_links" ADD CONSTRAINT "obligation_evidence_links_linkedByIdentityId_fkey" FOREIGN KEY ("linkedByIdentityId") REFERENCES "identities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "obligation_evidence_links" ADD CONSTRAINT "obligation_evidence_links_evidenceVerificationId_fkey" FOREIGN KEY ("evidenceVerificationId") REFERENCES "evidence_verifications"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "obligation_evidence_links" ADD CONSTRAINT "obligation_evidence_links_evidencePurposeAcceptanceId_fkey" FOREIGN KEY ("evidencePurposeAcceptanceId") REFERENCES "evidence_purpose_acceptances"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "compliance_reviews" ADD CONSTRAINT "compliance_reviews_reviewerIdentityId_fkey" FOREIGN KEY ("reviewerIdentityId") REFERENCES "identities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "compliance_reviews" ADD CONSTRAINT "compliance_reviews_reviewerOfficeholderId_fkey" FOREIGN KEY ("reviewerOfficeholderId") REFERENCES "officeholders"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "compliance_reviews" ADD CONSTRAINT "compliance_reviews_functionAuthorityRecordId_fkey" FOREIGN KEY ("functionAuthorityRecordId") REFERENCES "function_authority_records"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "compliance_reviews" ADD CONSTRAINT "compliance_reviews_continuingObligationId_fkey" FOREIGN KEY ("continuingObligationId") REFERENCES "continuing_obligations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "compliance_reviews" ADD CONSTRAINT "compliance_reviews_complianceSubmissionId_fkey" FOREIGN KEY ("complianceSubmissionId") REFERENCES "compliance_submissions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "compliance_reviews" ADD CONSTRAINT "compliance_reviews_submissionVersionId_fkey" FOREIGN KEY ("submissionVersionId") REFERENCES "compliance_submission_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "compliance_reviews" ADD CONSTRAINT "compliance_reviews_authorityEvaluationRecordId_fkey" FOREIGN KEY ("authorityEvaluationRecordId") REFERENCES "authority_evaluation_records"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "compliance_review_items" ADD CONSTRAINT "compliance_review_items_complianceReviewId_fkey" FOREIGN KEY ("complianceReviewId") REFERENCES "compliance_reviews"("id") ON DELETE CASCADE ON UPDATE CASCADE;
