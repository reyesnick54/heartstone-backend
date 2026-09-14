-- CreateEnum
CREATE TYPE "ReconsiderationReviewStandard" AS ENUM ('ORIGINAL_RECORD_ONLY', 'ORIGINAL_PLUS_PERMITTED_NEW_EVIDENCE', 'ERROR_REVIEW', 'MERITS_RECONSIDERATION', 'OTHER_AUTHORIZED_STANDARD');

-- CreateEnum
CREATE TYPE "ReviewProceedingStatus" AS ENUM ('DRAFT', 'OPEN', 'UNDER_REVIEW', 'PENDING_RECOMMENDATION', 'PENDING_DISPOSITION', 'CLOSED', 'WITHDRAWN');

-- CreateEnum
CREATE TYPE "ReviewAssignmentStatus" AS ENUM ('PENDING_VALIDATION', 'ACTIVE', 'BLOCKED_INDEPENDENCE', 'BLOCKED_AUTHORITY', 'BLOCKED_JURISDICTION', 'RECUSED', 'EXPIRED', 'REVOKED');

-- CreateEnum
CREATE TYPE "ReviewerIndependenceOutcome" AS ENUM ('INDEPENDENT', 'CONFLICT_IDENTIFIED', 'PRIOR_INVOLVEMENT_IDENTIFIED', 'REQUIRES_RECUSAL', 'REQUIRES_AUTHORIZED_EXCEPTION', 'UNRESOLVED');

-- CreateEnum
CREATE TYPE "InternalAdministrativeReviewGround" AS ENUM ('AUTHORITY_ERROR', 'PROCEDURAL_ERROR', 'EVIDENCE_OMISSION', 'INCORRECT_CRITERION', 'CONFLICT', 'REASONING_DEFECT', 'NOTICE_DEFECT', 'AUTOMATION_DEFECT', 'OTHER_PERMITTED_GROUND');

-- CreateEnum
CREATE TYPE "ReviewIssueStatus" AS ENUM ('RAISED', 'UNDER_EXAMINATION', 'ADDRESSED', 'DISMISSED', 'DEFERRED');

-- CreateEnum
CREATE TYPE "ReviewEvidenceClassification" AS ENUM ('ORIGINAL_RECORD', 'POST_DECISION_EVIDENCE');

-- CreateEnum
CREATE TYPE "ReviewRecommendationType" AS ENUM ('AFFIRM', 'REVERSE', 'VARY', 'REMAND', 'SET_ASIDE', 'DISMISS', 'REQUEST_INFORMATION', 'OTHER_NON_FINAL');

-- CreateEnum
CREATE TYPE "ReviewProceedingKind" AS ENUM ('RECONSIDERATION', 'INTERNAL_ADMINISTRATIVE');

-- CreateTable
CREATE TABLE "review_record_snapshots" (
    "id" UUID NOT NULL,
    "snapshotNumber" TEXT NOT NULL,
    "challengedDecisionId" UUID NOT NULL,
    "frozenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "snapshotHash" TEXT NOT NULL,
    "referenceManifest" JSONB NOT NULL DEFAULT '{}',
    "immutable" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "review_record_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reconsideration_proceedings" (
    "id" UUID NOT NULL,
    "proceedingNumber" TEXT NOT NULL,
    "challengedDecisionId" UUID NOT NULL,
    "caseId" UUID NOT NULL,
    "reviewRecordSnapshotId" UUID NOT NULL,
    "reviewStandard" "ReconsiderationReviewStandard" NOT NULL,
    "functionAuthorityRecordId" UUID NOT NULL,
    "jurisdictionId" UUID NOT NULL,
    "requiredReviewerLevel" TEXT NOT NULL,
    "status" "ReviewProceedingStatus" NOT NULL DEFAULT 'OPEN',
    "openedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closedAt" TIMESTAMP(3),
    "configurationReference" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reconsideration_proceedings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "internal_administrative_reviews" (
    "id" UUID NOT NULL,
    "reviewNumber" TEXT NOT NULL,
    "challengedDecisionId" UUID NOT NULL,
    "caseId" UUID NOT NULL,
    "reviewRecordSnapshotId" UUID NOT NULL,
    "functionAuthorityRecordId" UUID NOT NULL,
    "jurisdictionId" UUID NOT NULL,
    "requiredReviewerLevel" TEXT NOT NULL,
    "status" "ReviewProceedingStatus" NOT NULL DEFAULT 'OPEN',
    "openedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closedAt" TIMESTAMP(3),
    "configurationReference" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "internal_administrative_reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "review_issues" (
    "id" UUID NOT NULL,
    "internalAdministrativeReviewId" UUID NOT NULL,
    "ground" "InternalAdministrativeReviewGround" NOT NULL,
    "description" TEXT NOT NULL,
    "status" "ReviewIssueStatus" NOT NULL DEFAULT 'RAISED',
    "raisedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "review_issues_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "review_assignments" (
    "id" UUID NOT NULL,
    "assignmentNumber" TEXT NOT NULL,
    "proceedingKind" "ReviewProceedingKind" NOT NULL,
    "reconsiderationProceedingId" UUID,
    "internalAdministrativeReviewId" UUID,
    "reviewerIdentityId" UUID NOT NULL,
    "reviewerOfficeholderId" UUID NOT NULL,
    "appointmentId" UUID NOT NULL,
    "delegationId" UUID,
    "jurisdictionId" UUID NOT NULL,
    "functionAuthorityRecordId" UUID NOT NULL,
    "scope" TEXT NOT NULL,
    "requiredReviewerLevel" TEXT NOT NULL,
    "status" "ReviewAssignmentStatus" NOT NULL DEFAULT 'PENDING_VALIDATION',
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "effectiveUntil" TIMESTAMP(3),
    "authorityEvaluationRecordId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "review_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reviewer_independence_assessments" (
    "id" UUID NOT NULL,
    "reviewAssignmentId" UUID NOT NULL,
    "originalDecisionMakerIdentityId" UUID NOT NULL,
    "originalRecommenderIdentityId" UUID,
    "outcome" "ReviewerIndependenceOutcome" NOT NULL,
    "materialDirectionReference" TEXT,
    "sameReportingLineProhibited" BOOLEAN NOT NULL DEFAULT false,
    "priorAdvisoryInvolvement" BOOLEAN NOT NULL DEFAULT false,
    "personalFinancialConflict" BOOLEAN NOT NULL DEFAULT false,
    "professionalConflict" BOOLEAN NOT NULL DEFAULT false,
    "otherSeparationRequirements" JSONB NOT NULL DEFAULT '[]',
    "assessmentNotes" TEXT,
    "assessedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reviewer_independence_assessments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "review_authority_assessments" (
    "id" UUID NOT NULL,
    "reviewAssignmentId" UUID NOT NULL,
    "authorityEvaluationRecordId" UUID NOT NULL,
    "competenceVerified" BOOLEAN NOT NULL DEFAULT false,
    "accessRightsVerified" BOOLEAN NOT NULL DEFAULT false,
    "decisionScopeVerified" BOOLEAN NOT NULL DEFAULT false,
    "reviewerLevelVerified" BOOLEAN NOT NULL DEFAULT false,
    "assessedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "review_authority_assessments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "review_submissions" (
    "id" UUID NOT NULL,
    "submissionNumber" TEXT NOT NULL,
    "proceedingKind" "ReviewProceedingKind" NOT NULL,
    "reconsiderationProceedingId" UUID,
    "internalAdministrativeReviewId" UUID,
    "submittedByIdentityId" UUID NOT NULL,
    "contentReference" TEXT NOT NULL,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "review_submissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "review_evidence_admissions" (
    "id" UUID NOT NULL,
    "admissionNumber" TEXT NOT NULL,
    "proceedingKind" "ReviewProceedingKind" NOT NULL,
    "reconsiderationProceedingId" UUID,
    "internalAdministrativeReviewId" UUID,
    "evidenceReference" TEXT NOT NULL,
    "classification" "ReviewEvidenceClassification" NOT NULL,
    "admittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "admittedByIdentityId" UUID NOT NULL,
    "admissionNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "review_evidence_admissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "review_recommendations" (
    "id" UUID NOT NULL,
    "recommendationNumber" TEXT NOT NULL,
    "proceedingKind" "ReviewProceedingKind" NOT NULL,
    "reconsiderationProceedingId" UUID,
    "internalAdministrativeReviewId" UUID,
    "recommendationType" "ReviewRecommendationType" NOT NULL,
    "isFinal" BOOLEAN NOT NULL DEFAULT false,
    "aiGenerated" BOOLEAN NOT NULL DEFAULT false,
    "contentReference" TEXT NOT NULL,
    "summary" TEXT,
    "recommendedByIdentityId" UUID NOT NULL,
    "authorityEvaluationRecordId" UUID,
    "recommendedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "review_recommendations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "review_record_snapshots_snapshotNumber_key" ON "review_record_snapshots"("snapshotNumber");

-- CreateIndex
CREATE INDEX "review_record_snapshots_challengedDecisionId_idx" ON "review_record_snapshots"("challengedDecisionId");

-- CreateIndex
CREATE INDEX "review_record_snapshots_frozenAt_idx" ON "review_record_snapshots"("frozenAt");

-- CreateIndex
CREATE UNIQUE INDEX "reconsideration_proceedings_proceedingNumber_key" ON "reconsideration_proceedings"("proceedingNumber");

-- CreateIndex
CREATE INDEX "reconsideration_proceedings_challengedDecisionId_idx" ON "reconsideration_proceedings"("challengedDecisionId");

-- CreateIndex
CREATE INDEX "reconsideration_proceedings_caseId_idx" ON "reconsideration_proceedings"("caseId");

-- CreateIndex
CREATE INDEX "reconsideration_proceedings_status_idx" ON "reconsideration_proceedings"("status");

-- CreateIndex
CREATE INDEX "reconsideration_proceedings_reviewStandard_idx" ON "reconsideration_proceedings"("reviewStandard");

-- CreateIndex
CREATE UNIQUE INDEX "internal_administrative_reviews_reviewNumber_key" ON "internal_administrative_reviews"("reviewNumber");

-- CreateIndex
CREATE INDEX "internal_administrative_reviews_challengedDecisionId_idx" ON "internal_administrative_reviews"("challengedDecisionId");

-- CreateIndex
CREATE INDEX "internal_administrative_reviews_caseId_idx" ON "internal_administrative_reviews"("caseId");

-- CreateIndex
CREATE INDEX "internal_administrative_reviews_status_idx" ON "internal_administrative_reviews"("status");

-- CreateIndex
CREATE INDEX "review_issues_internalAdministrativeReviewId_idx" ON "review_issues"("internalAdministrativeReviewId");

-- CreateIndex
CREATE INDEX "review_issues_ground_idx" ON "review_issues"("ground");

-- CreateIndex
CREATE INDEX "review_issues_status_idx" ON "review_issues"("status");

-- CreateIndex
CREATE UNIQUE INDEX "review_assignments_assignmentNumber_key" ON "review_assignments"("assignmentNumber");

-- CreateIndex
CREATE INDEX "review_assignments_reconsiderationProceedingId_idx" ON "review_assignments"("reconsiderationProceedingId");

-- CreateIndex
CREATE INDEX "review_assignments_internalAdministrativeReviewId_idx" ON "review_assignments"("internalAdministrativeReviewId");

-- CreateIndex
CREATE INDEX "review_assignments_reviewerIdentityId_idx" ON "review_assignments"("reviewerIdentityId");

-- CreateIndex
CREATE INDEX "review_assignments_reviewerOfficeholderId_idx" ON "review_assignments"("reviewerOfficeholderId");

-- CreateIndex
CREATE INDEX "review_assignments_status_idx" ON "review_assignments"("status");

-- CreateIndex
CREATE UNIQUE INDEX "reviewer_independence_assessments_reviewAssignmentId_key" ON "reviewer_independence_assessments"("reviewAssignmentId");

-- CreateIndex
CREATE INDEX "reviewer_independence_assessments_outcome_idx" ON "reviewer_independence_assessments"("outcome");

-- CreateIndex
CREATE UNIQUE INDEX "review_authority_assessments_reviewAssignmentId_key" ON "review_authority_assessments"("reviewAssignmentId");

-- CreateIndex
CREATE INDEX "review_authority_assessments_authorityEvaluationRecordId_idx" ON "review_authority_assessments"("authorityEvaluationRecordId");

-- CreateIndex
CREATE UNIQUE INDEX "review_submissions_submissionNumber_key" ON "review_submissions"("submissionNumber");

-- CreateIndex
CREATE INDEX "review_submissions_reconsiderationProceedingId_idx" ON "review_submissions"("reconsiderationProceedingId");

-- CreateIndex
CREATE INDEX "review_submissions_internalAdministrativeReviewId_idx" ON "review_submissions"("internalAdministrativeReviewId");

-- CreateIndex
CREATE INDEX "review_submissions_submittedByIdentityId_idx" ON "review_submissions"("submittedByIdentityId");

-- CreateIndex
CREATE UNIQUE INDEX "review_evidence_admissions_admissionNumber_key" ON "review_evidence_admissions"("admissionNumber");

-- CreateIndex
CREATE INDEX "review_evidence_admissions_reconsiderationProceedingId_idx" ON "review_evidence_admissions"("reconsiderationProceedingId");

-- CreateIndex
CREATE INDEX "review_evidence_admissions_internalAdministrativeReviewId_idx" ON "review_evidence_admissions"("internalAdministrativeReviewId");

-- CreateIndex
CREATE INDEX "review_evidence_admissions_classification_idx" ON "review_evidence_admissions"("classification");

-- CreateIndex
CREATE UNIQUE INDEX "review_recommendations_recommendationNumber_key" ON "review_recommendations"("recommendationNumber");

-- CreateIndex
CREATE INDEX "review_recommendations_reconsiderationProceedingId_idx" ON "review_recommendations"("reconsiderationProceedingId");

-- CreateIndex
CREATE INDEX "review_recommendations_internalAdministrativeReviewId_idx" ON "review_recommendations"("internalAdministrativeReviewId");

-- CreateIndex
CREATE INDEX "review_recommendations_isFinal_idx" ON "review_recommendations"("isFinal");

-- CreateIndex
CREATE INDEX "review_recommendations_aiGenerated_idx" ON "review_recommendations"("aiGenerated");

-- AddForeignKey
ALTER TABLE "review_record_snapshots" ADD CONSTRAINT "review_record_snapshots_challengedDecisionId_fkey" FOREIGN KEY ("challengedDecisionId") REFERENCES "government_decisions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reconsideration_proceedings" ADD CONSTRAINT "reconsideration_proceedings_challengedDecisionId_fkey" FOREIGN KEY ("challengedDecisionId") REFERENCES "government_decisions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reconsideration_proceedings" ADD CONSTRAINT "reconsideration_proceedings_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "cases"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reconsideration_proceedings" ADD CONSTRAINT "reconsideration_proceedings_reviewRecordSnapshotId_fkey" FOREIGN KEY ("reviewRecordSnapshotId") REFERENCES "review_record_snapshots"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reconsideration_proceedings" ADD CONSTRAINT "reconsideration_proceedings_functionAuthorityRecordId_fkey" FOREIGN KEY ("functionAuthorityRecordId") REFERENCES "function_authority_records"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reconsideration_proceedings" ADD CONSTRAINT "reconsideration_proceedings_jurisdictionId_fkey" FOREIGN KEY ("jurisdictionId") REFERENCES "jurisdictions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "internal_administrative_reviews" ADD CONSTRAINT "internal_administrative_reviews_challengedDecisionId_fkey" FOREIGN KEY ("challengedDecisionId") REFERENCES "government_decisions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "internal_administrative_reviews" ADD CONSTRAINT "internal_administrative_reviews_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "cases"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "internal_administrative_reviews" ADD CONSTRAINT "internal_administrative_reviews_reviewRecordSnapshotId_fkey" FOREIGN KEY ("reviewRecordSnapshotId") REFERENCES "review_record_snapshots"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "internal_administrative_reviews" ADD CONSTRAINT "internal_administrative_reviews_functionAuthorityRecordId_fkey" FOREIGN KEY ("functionAuthorityRecordId") REFERENCES "function_authority_records"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "internal_administrative_reviews" ADD CONSTRAINT "internal_administrative_reviews_jurisdictionId_fkey" FOREIGN KEY ("jurisdictionId") REFERENCES "jurisdictions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "review_issues" ADD CONSTRAINT "review_issues_internalAdministrativeReviewId_fkey" FOREIGN KEY ("internalAdministrativeReviewId") REFERENCES "internal_administrative_reviews"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "review_assignments" ADD CONSTRAINT "review_assignments_reconsiderationProceedingId_fkey" FOREIGN KEY ("reconsiderationProceedingId") REFERENCES "reconsideration_proceedings"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "review_assignments" ADD CONSTRAINT "review_assignments_internalAdministrativeReviewId_fkey" FOREIGN KEY ("internalAdministrativeReviewId") REFERENCES "internal_administrative_reviews"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "review_assignments" ADD CONSTRAINT "review_assignments_reviewerIdentityId_fkey" FOREIGN KEY ("reviewerIdentityId") REFERENCES "identities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "review_assignments" ADD CONSTRAINT "review_assignments_reviewerOfficeholderId_fkey" FOREIGN KEY ("reviewerOfficeholderId") REFERENCES "officeholders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "review_assignments" ADD CONSTRAINT "review_assignments_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "appointments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "review_assignments" ADD CONSTRAINT "review_assignments_delegationId_fkey" FOREIGN KEY ("delegationId") REFERENCES "delegations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "review_assignments" ADD CONSTRAINT "review_assignments_jurisdictionId_fkey" FOREIGN KEY ("jurisdictionId") REFERENCES "jurisdictions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "review_assignments" ADD CONSTRAINT "review_assignments_functionAuthorityRecordId_fkey" FOREIGN KEY ("functionAuthorityRecordId") REFERENCES "function_authority_records"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "review_assignments" ADD CONSTRAINT "review_assignments_authorityEvaluationRecordId_fkey" FOREIGN KEY ("authorityEvaluationRecordId") REFERENCES "authority_evaluation_records"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviewer_independence_assessments" ADD CONSTRAINT "reviewer_independence_assessments_reviewAssignmentId_fkey" FOREIGN KEY ("reviewAssignmentId") REFERENCES "review_assignments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "review_authority_assessments" ADD CONSTRAINT "review_authority_assessments_reviewAssignmentId_fkey" FOREIGN KEY ("reviewAssignmentId") REFERENCES "review_assignments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "review_authority_assessments" ADD CONSTRAINT "review_authority_assessments_authorityEvaluationRecordId_fkey" FOREIGN KEY ("authorityEvaluationRecordId") REFERENCES "authority_evaluation_records"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "review_submissions" ADD CONSTRAINT "review_submissions_reconsiderationProceedingId_fkey" FOREIGN KEY ("reconsiderationProceedingId") REFERENCES "reconsideration_proceedings"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "review_submissions" ADD CONSTRAINT "review_submissions_internalAdministrativeReviewId_fkey" FOREIGN KEY ("internalAdministrativeReviewId") REFERENCES "internal_administrative_reviews"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "review_submissions" ADD CONSTRAINT "review_submissions_submittedByIdentityId_fkey" FOREIGN KEY ("submittedByIdentityId") REFERENCES "identities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "review_evidence_admissions" ADD CONSTRAINT "review_evidence_admissions_reconsiderationProceedingId_fkey" FOREIGN KEY ("reconsiderationProceedingId") REFERENCES "reconsideration_proceedings"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "review_evidence_admissions" ADD CONSTRAINT "review_evidence_admissions_internalAdministrativeReviewId_fkey" FOREIGN KEY ("internalAdministrativeReviewId") REFERENCES "internal_administrative_reviews"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "review_evidence_admissions" ADD CONSTRAINT "review_evidence_admissions_admittedByIdentityId_fkey" FOREIGN KEY ("admittedByIdentityId") REFERENCES "identities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "review_recommendations" ADD CONSTRAINT "review_recommendations_reconsiderationProceedingId_fkey" FOREIGN KEY ("reconsiderationProceedingId") REFERENCES "reconsideration_proceedings"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "review_recommendations" ADD CONSTRAINT "review_recommendations_internalAdministrativeReviewId_fkey" FOREIGN KEY ("internalAdministrativeReviewId") REFERENCES "internal_administrative_reviews"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "review_recommendations" ADD CONSTRAINT "review_recommendations_recommendedByIdentityId_fkey" FOREIGN KEY ("recommendedByIdentityId") REFERENCES "identities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "review_recommendations" ADD CONSTRAINT "review_recommendations_authorityEvaluationRecordId_fkey" FOREIGN KEY ("authorityEvaluationRecordId") REFERENCES "authority_evaluation_records"("id") ON DELETE SET NULL ON UPDATE CASCADE;
