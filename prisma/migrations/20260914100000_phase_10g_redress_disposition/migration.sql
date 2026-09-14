-- Phase 10G: Review Disposition, Remedies, Stays and Implementation

-- CreateEnum
CREATE TYPE "RedressRouteVersionStatus" AS ENUM ('DRAFT', 'ACTIVE', 'SUPERSEDED', 'RETIRED');
CREATE TYPE "RedressMatterStatus" AS ENUM ('FILED', 'UNDER_REVIEW', 'INTERIM_RELIEF_PENDING', 'DECISION_PENDING', 'DECIDED', 'IMPLEMENTATION_PENDING', 'IMPLEMENTATION_IN_PROGRESS', 'IMPLEMENTED', 'CLOSED', 'WITHDRAWN');
CREATE TYPE "RedressDecisionOutcome" AS ENUM ('AFFIRMED', 'VARIED', 'RETURNED_OR_REMANDED', 'CORRECTED', 'SET_ASIDE', 'REVERSED', 'PARTIALLY_AFFIRMED', 'PARTIALLY_VARIED', 'DISMISSED_BY_AUTHORIZED_DETERMINATION', 'WITHDRAWN', 'REFERRED', 'OTHER_AUTHORIZED_OUTCOME');
CREATE TYPE "RedressReasonSectionType" AS ENUM ('ISSUES', 'FINDINGS', 'AUTHORITY', 'EVIDENCE', 'STANDARD_OF_REVIEW', 'DISPUTED_EVIDENCE_TREATMENT', 'NEW_EVIDENCE', 'REASONS', 'LIMITATIONS', 'REMEDY');
CREATE TYPE "RedressRemedyType" AS ENUM ('CORRECT_RECORD', 'REISSUE_NOTICE', 'RECONSIDER', 'REPROCESS', 'REOPEN_EVIDENCE_REVIEW', 'NEW_DECISION_REQUIRED', 'AMEND_INSTRUMENT', 'REINSTATE_INSTRUMENT', 'SUSPEND_EFFECT', 'REFUND_IF_AUTHORIZED', 'REFER_EXTERNALLY', 'OTHER_AUTHORIZED_REMEDY');
CREATE TYPE "InterimReliefRequestType" AS ENUM ('STAY', 'PARTIAL_STAY', 'TEMPORARY_REINSTATEMENT', 'PRESERVATION_ORDER', 'TEMPORARY_ACCESS', 'INTERIM_OPERATIONAL_PROTECTION', 'OTHER_AUTHORIZED_INTERIM_RELIEF');
CREATE TYPE "InterimReliefRequestStatus" AS ENUM ('PENDING', 'DECIDED', 'WITHDRAWN', 'SUPERSEDED');
CREATE TYPE "InterimReliefDecisionOutcome" AS ENUM ('GRANTED', 'PARTIALLY_GRANTED', 'DENIED', 'DEFERRED');
CREATE TYPE "ReviewStayRecordStatus" AS ENUM ('PENDING', 'ACTIVE', 'EXPIRED', 'LIFTED', 'SUPERSEDED');
CREATE TYPE "RedressImplementationTargetType" AS ENUM ('APPLICATION_CASE', 'GOVERNMENT_DECISION', 'OFFICIAL_INSTRUMENT', 'PUBLIC_VERIFICATION', 'DECISION_CONDITION', 'FEE', 'COMMUNICATION', 'NOTIFICATION', 'GOVERNMENT_INTEGRATION', 'COMPLIANCE_MATTER', 'ENFORCEMENT_STATUS', 'MASTER_ADMINISTRATIVE_FILE', 'PUBLIC_REGISTER', 'HISTORICAL_RECORD', 'OTHER_AUTHORIZED_TARGET');
CREATE TYPE "RedressImplementationActionStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'FAILED', 'BLOCKED', 'SAFE_HALTED', 'SUPERSEDED');
CREATE TYPE "RedressImplementationVerificationOutcome" AS ENUM ('VERIFIED', 'FAILED', 'PARTIAL', 'DEFERRED');
CREATE TYPE "RedressNoticeStatus" AS ENUM ('DRAFT', 'PREPARED', 'DELIVERED', 'SUPERSEDED');

-- CreateTable
CREATE TABLE "redress_route_versions" (
    "id" UUID NOT NULL,
    "governmentServiceRedressRouteId" UUID NOT NULL,
    "routeCode" TEXT NOT NULL,
    "versionNumber" INTEGER NOT NULL,
    "status" "RedressRouteVersionStatus" NOT NULL DEFAULT 'DRAFT',
    "permissibleOutcomes" JSONB NOT NULL DEFAULT '[]',
    "permissibleRemedies" JSONB NOT NULL DEFAULT '[]',
    "permissibleInterimReliefTypes" JSONB NOT NULL DEFAULT '[]',
    "furtherReviewRights" JSONB NOT NULL DEFAULT '[]',
    "automaticStayOnFiling" BOOLEAN NOT NULL DEFAULT false,
    "requiresReasonedDetermination" BOOLEAN NOT NULL DEFAULT true,
    "requiresIndependenceFromOriginalReviewer" BOOLEAN NOT NULL DEFAULT false,
    "functionAuthorityRecordId" UUID NOT NULL,
    "effectiveFrom" TIMESTAMP(3),
    "effectiveUntil" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "redress_route_versions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "redress_matters" (
    "id" UUID NOT NULL,
    "redressMatterNumber" TEXT NOT NULL,
    "routeVersionId" UUID NOT NULL,
    "decisionReviewReferenceId" UUID,
    "challengedDecisionId" UUID NOT NULL,
    "challengedInstrumentId" UUID,
    "caseId" UUID,
    "masterAdministrativeFileId" UUID,
    "appellantIdentityId" UUID,
    "appellantOfficeholderId" UUID,
    "originalDecisionMakerOfficeholderId" UUID,
    "status" "RedressMatterStatus" NOT NULL DEFAULT 'FILED',
    "filedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "redress_matters_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "redress_review_record_snapshots" (
    "id" UUID NOT NULL,
    "redressMatterId" UUID NOT NULL,
    "snapshotData" JSONB NOT NULL,
    "capturedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "capturedByIdentityId" UUID,

    CONSTRAINT "redress_review_record_snapshots_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "redress_decisions" (
    "id" UUID NOT NULL,
    "redressDecisionNumber" TEXT NOT NULL,
    "redressMatterId" UUID NOT NULL,
    "routeVersionId" UUID NOT NULL,
    "reviewerIdentityId" UUID NOT NULL,
    "reviewerOfficeholderId" UUID NOT NULL,
    "functionAuthorityRecordId" UUID NOT NULL,
    "authorityEvaluationRecordId" UUID NOT NULL,
    "redressReviewRecordSnapshotId" UUID NOT NULL,
    "additionalEvidenceCutoff" TIMESTAMP(3),
    "outcome" "RedressDecisionOutcome" NOT NULL,
    "decidedAt" TIMESTAMP(3) NOT NULL,
    "effectiveAt" TIMESTAMP(3),
    "supersededDecisionId" UUID,
    "remandScope" JSONB,
    "remandIssues" JSONB NOT NULL DEFAULT '[]',
    "remandAuthorityReference" TEXT,
    "remandEvidenceConstraints" JSONB,
    "remandDeadline" TIMESTAMP(3),
    "originalDecisionStatusPreserved" TEXT,
    "remandInterimEffect" JSONB,
    "integrityHash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "redress_decisions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "redress_findings" (
    "id" UUID NOT NULL,
    "redressDecisionId" UUID NOT NULL,
    "issueReference" TEXT NOT NULL,
    "findingSummary" TEXT NOT NULL,
    "disposition" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "redress_findings_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "redress_reasons" (
    "id" UUID NOT NULL,
    "redressDecisionId" UUID NOT NULL,
    "sectionType" "RedressReasonSectionType" NOT NULL,
    "content" TEXT NOT NULL,
    "aiDrafted" BOOLEAN NOT NULL DEFAULT false,
    "humanConfirmed" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "redress_reasons_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "redress_remedies" (
    "id" UUID NOT NULL,
    "redressDecisionId" UUID NOT NULL,
    "remedyType" "RedressRemedyType" NOT NULL,
    "description" TEXT NOT NULL,
    "targetReference" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "redress_remedies_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "interim_relief_requests" (
    "id" UUID NOT NULL,
    "redressMatterId" UUID NOT NULL,
    "requestType" "InterimReliefRequestType" NOT NULL,
    "groundsSummary" TEXT NOT NULL,
    "status" "InterimReliefRequestStatus" NOT NULL DEFAULT 'PENDING',
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "requestedByIdentityId" UUID,

    CONSTRAINT "interim_relief_requests_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "interim_relief_decisions" (
    "id" UUID NOT NULL,
    "interimReliefRequestId" UUID NOT NULL,
    "outcome" "InterimReliefDecisionOutcome" NOT NULL,
    "reviewerIdentityId" UUID NOT NULL,
    "reviewerOfficeholderId" UUID NOT NULL,
    "functionAuthorityRecordId" UUID NOT NULL,
    "authorityEvaluationRecordId" UUID NOT NULL,
    "reasonsSummary" TEXT,
    "decidedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "interim_relief_decisions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "review_stay_records" (
    "id" UUID NOT NULL,
    "redressMatterId" UUID NOT NULL,
    "decisionReviewReferenceId" UUID,
    "interimReliefDecisionId" UUID,
    "challengedDecisionId" UUID NOT NULL,
    "challengedInstrumentId" UUID,
    "scope" TEXT NOT NULL,
    "authorityReference" TEXT NOT NULL,
    "groundsSummary" TEXT NOT NULL,
    "effectiveAt" TIMESTAMP(3) NOT NULL,
    "expiresAt" TIMESTAMP(3),
    "conditions" JSONB NOT NULL DEFAULT '[]',
    "status" "ReviewStayRecordStatus" NOT NULL DEFAULT 'PENDING',
    "deciderIdentityId" UUID NOT NULL,
    "deciderOfficeholderId" UUID NOT NULL,
    "functionAuthorityRecordId" UUID NOT NULL,
    "authorityEvaluationRecordId" UUID NOT NULL,
    "isReversal" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "review_stay_records_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "redress_implementation_plans" (
    "id" UUID NOT NULL,
    "redressDecisionId" UUID NOT NULL,
    "status" "RedressImplementationActionStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "redress_implementation_plans_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "redress_implementation_actions" (
    "id" UUID NOT NULL,
    "implementationPlanId" UUID NOT NULL,
    "targetType" "RedressImplementationTargetType" NOT NULL,
    "targetReference" TEXT NOT NULL,
    "requiredOperation" TEXT NOT NULL,
    "responsibleOfficeId" UUID,
    "responsibleIdentityId" UUID,
    "functionAuthorityRecordId" UUID,
    "status" "RedressImplementationActionStatus" NOT NULL DEFAULT 'PENDING',
    "completedAt" TIMESTAMP(3),
    "errorMessage" TEXT,
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "escalationReference" TEXT,
    "lifecycleServiceReference" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "redress_implementation_actions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "redress_implementation_verifications" (
    "id" UUID NOT NULL,
    "actionId" UUID NOT NULL,
    "outcome" "RedressImplementationVerificationOutcome" NOT NULL,
    "verifiedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "verifiedByIdentityId" UUID,
    "notes" TEXT,

    CONSTRAINT "redress_implementation_verifications_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "redress_notices" (
    "id" UUID NOT NULL,
    "redressDecisionId" UUID NOT NULL,
    "redressMatterId" UUID NOT NULL,
    "outcomeSummary" TEXT NOT NULL,
    "reasonsSummary" TEXT NOT NULL,
    "remedySummary" TEXT NOT NULL,
    "effectiveDate" TIMESTAMP(3),
    "implementationStatus" TEXT NOT NULL,
    "furtherReviewRights" JSONB NOT NULL DEFAULT '[]',
    "filingRoute" TEXT,
    "filingDeadline" TIMESTAMP(3),
    "stayEffectSummary" TEXT,
    "contactReference" TEXT,
    "status" "RedressNoticeStatus" NOT NULL DEFAULT 'DRAFT',
    "deliveredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "redress_notices_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "redress_route_versions_governmentServiceRedressRouteId_vers_key" ON "redress_route_versions"("governmentServiceRedressRouteId", "versionNumber");
CREATE INDEX "redress_route_versions_routeCode_status_idx" ON "redress_route_versions"("routeCode", "status");
CREATE INDEX "redress_route_versions_functionAuthorityRecordId_idx" ON "redress_route_versions"("functionAuthorityRecordId");

CREATE UNIQUE INDEX "redress_matters_redressMatterNumber_key" ON "redress_matters"("redressMatterNumber");
CREATE UNIQUE INDEX "redress_matters_decisionReviewReferenceId_key" ON "redress_matters"("decisionReviewReferenceId");
CREATE INDEX "redress_matters_routeVersionId_idx" ON "redress_matters"("routeVersionId");
CREATE INDEX "redress_matters_challengedDecisionId_idx" ON "redress_matters"("challengedDecisionId");
CREATE INDEX "redress_matters_challengedInstrumentId_idx" ON "redress_matters"("challengedInstrumentId");
CREATE INDEX "redress_matters_status_idx" ON "redress_matters"("status");

CREATE INDEX "redress_review_record_snapshots_redressMatterId_idx" ON "redress_review_record_snapshots"("redressMatterId");

CREATE UNIQUE INDEX "redress_decisions_redressDecisionNumber_key" ON "redress_decisions"("redressDecisionNumber");
CREATE INDEX "redress_decisions_redressMatterId_idx" ON "redress_decisions"("redressMatterId");
CREATE INDEX "redress_decisions_outcome_idx" ON "redress_decisions"("outcome");
CREATE INDEX "redress_decisions_decidedAt_idx" ON "redress_decisions"("decidedAt");

CREATE INDEX "redress_findings_redressDecisionId_idx" ON "redress_findings"("redressDecisionId");
CREATE INDEX "redress_reasons_redressDecisionId_idx" ON "redress_reasons"("redressDecisionId");
CREATE INDEX "redress_reasons_sectionType_idx" ON "redress_reasons"("sectionType");
CREATE INDEX "redress_remedies_redressDecisionId_idx" ON "redress_remedies"("redressDecisionId");

CREATE INDEX "interim_relief_requests_redressMatterId_idx" ON "interim_relief_requests"("redressMatterId");
CREATE INDEX "interim_relief_requests_status_idx" ON "interim_relief_requests"("status");

CREATE UNIQUE INDEX "interim_relief_decisions_interimReliefRequestId_key" ON "interim_relief_decisions"("interimReliefRequestId");
CREATE INDEX "interim_relief_decisions_outcome_idx" ON "interim_relief_decisions"("outcome");

CREATE UNIQUE INDEX "review_stay_records_interimReliefDecisionId_key" ON "review_stay_records"("interimReliefDecisionId");
CREATE INDEX "review_stay_records_redressMatterId_idx" ON "review_stay_records"("redressMatterId");
CREATE INDEX "review_stay_records_status_idx" ON "review_stay_records"("status");
CREATE INDEX "review_stay_records_challengedDecisionId_idx" ON "review_stay_records"("challengedDecisionId");

CREATE UNIQUE INDEX "redress_implementation_plans_redressDecisionId_key" ON "redress_implementation_plans"("redressDecisionId");
CREATE INDEX "redress_implementation_plans_status_idx" ON "redress_implementation_plans"("status");

CREATE INDEX "redress_implementation_actions_implementationPlanId_idx" ON "redress_implementation_actions"("implementationPlanId");
CREATE INDEX "redress_implementation_actions_status_idx" ON "redress_implementation_actions"("status");
CREATE INDEX "redress_implementation_actions_targetType_idx" ON "redress_implementation_actions"("targetType");

CREATE UNIQUE INDEX "redress_implementation_verifications_actionId_key" ON "redress_implementation_verifications"("actionId");
CREATE INDEX "redress_implementation_verifications_outcome_idx" ON "redress_implementation_verifications"("outcome");

CREATE UNIQUE INDEX "redress_notices_redressDecisionId_key" ON "redress_notices"("redressDecisionId");
CREATE INDEX "redress_notices_redressMatterId_idx" ON "redress_notices"("redressMatterId");
CREATE INDEX "redress_notices_status_idx" ON "redress_notices"("status");

-- AddForeignKey
ALTER TABLE "redress_route_versions" ADD CONSTRAINT "redress_route_versions_governmentServiceRedressRouteId_fkey" FOREIGN KEY ("governmentServiceRedressRouteId") REFERENCES "government_service_redress_routes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "redress_route_versions" ADD CONSTRAINT "redress_route_versions_functionAuthorityRecordId_fkey" FOREIGN KEY ("functionAuthorityRecordId") REFERENCES "function_authority_records"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "redress_matters" ADD CONSTRAINT "redress_matters_routeVersionId_fkey" FOREIGN KEY ("routeVersionId") REFERENCES "redress_route_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "redress_matters" ADD CONSTRAINT "redress_matters_decisionReviewReferenceId_fkey" FOREIGN KEY ("decisionReviewReferenceId") REFERENCES "decision_review_references"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "redress_matters" ADD CONSTRAINT "redress_matters_challengedDecisionId_fkey" FOREIGN KEY ("challengedDecisionId") REFERENCES "government_decisions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "redress_matters" ADD CONSTRAINT "redress_matters_challengedInstrumentId_fkey" FOREIGN KEY ("challengedInstrumentId") REFERENCES "official_instruments"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "redress_matters" ADD CONSTRAINT "redress_matters_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "cases"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "redress_matters" ADD CONSTRAINT "redress_matters_masterAdministrativeFileId_fkey" FOREIGN KEY ("masterAdministrativeFileId") REFERENCES "master_administrative_files"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "redress_review_record_snapshots" ADD CONSTRAINT "redress_review_record_snapshots_redressMatterId_fkey" FOREIGN KEY ("redressMatterId") REFERENCES "redress_matters"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "redress_review_record_snapshots" ADD CONSTRAINT "redress_review_record_snapshots_capturedByIdentityId_fkey" FOREIGN KEY ("capturedByIdentityId") REFERENCES "identities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "redress_decisions" ADD CONSTRAINT "redress_decisions_redressMatterId_fkey" FOREIGN KEY ("redressMatterId") REFERENCES "redress_matters"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "redress_decisions" ADD CONSTRAINT "redress_decisions_routeVersionId_fkey" FOREIGN KEY ("routeVersionId") REFERENCES "redress_route_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "redress_decisions" ADD CONSTRAINT "redress_decisions_reviewerIdentityId_fkey" FOREIGN KEY ("reviewerIdentityId") REFERENCES "identities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "redress_decisions" ADD CONSTRAINT "redress_decisions_reviewerOfficeholderId_fkey" FOREIGN KEY ("reviewerOfficeholderId") REFERENCES "officeholders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "redress_decisions" ADD CONSTRAINT "redress_decisions_functionAuthorityRecordId_fkey" FOREIGN KEY ("functionAuthorityRecordId") REFERENCES "function_authority_records"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "redress_decisions" ADD CONSTRAINT "redress_decisions_authorityEvaluationRecordId_fkey" FOREIGN KEY ("authorityEvaluationRecordId") REFERENCES "authority_evaluation_records"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "redress_decisions" ADD CONSTRAINT "redress_decisions_redressReviewRecordSnapshotId_fkey" FOREIGN KEY ("redressReviewRecordSnapshotId") REFERENCES "redress_review_record_snapshots"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "redress_decisions" ADD CONSTRAINT "redress_decisions_supersededDecisionId_fkey" FOREIGN KEY ("supersededDecisionId") REFERENCES "government_decisions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "redress_findings" ADD CONSTRAINT "redress_findings_redressDecisionId_fkey" FOREIGN KEY ("redressDecisionId") REFERENCES "redress_decisions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "redress_reasons" ADD CONSTRAINT "redress_reasons_redressDecisionId_fkey" FOREIGN KEY ("redressDecisionId") REFERENCES "redress_decisions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "redress_remedies" ADD CONSTRAINT "redress_remedies_redressDecisionId_fkey" FOREIGN KEY ("redressDecisionId") REFERENCES "redress_decisions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "interim_relief_requests" ADD CONSTRAINT "interim_relief_requests_redressMatterId_fkey" FOREIGN KEY ("redressMatterId") REFERENCES "redress_matters"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "interim_relief_decisions" ADD CONSTRAINT "interim_relief_decisions_interimReliefRequestId_fkey" FOREIGN KEY ("interimReliefRequestId") REFERENCES "interim_relief_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "interim_relief_decisions" ADD CONSTRAINT "interim_relief_decisions_reviewerIdentityId_fkey" FOREIGN KEY ("reviewerIdentityId") REFERENCES "identities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "interim_relief_decisions" ADD CONSTRAINT "interim_relief_decisions_reviewerOfficeholderId_fkey" FOREIGN KEY ("reviewerOfficeholderId") REFERENCES "officeholders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "interim_relief_decisions" ADD CONSTRAINT "interim_relief_decisions_functionAuthorityRecordId_fkey" FOREIGN KEY ("functionAuthorityRecordId") REFERENCES "function_authority_records"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "interim_relief_decisions" ADD CONSTRAINT "interim_relief_decisions_authorityEvaluationRecordId_fkey" FOREIGN KEY ("authorityEvaluationRecordId") REFERENCES "authority_evaluation_records"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "review_stay_records" ADD CONSTRAINT "review_stay_records_redressMatterId_fkey" FOREIGN KEY ("redressMatterId") REFERENCES "redress_matters"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "review_stay_records" ADD CONSTRAINT "review_stay_records_decisionReviewReferenceId_fkey" FOREIGN KEY ("decisionReviewReferenceId") REFERENCES "decision_review_references"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "review_stay_records" ADD CONSTRAINT "review_stay_records_interimReliefDecisionId_fkey" FOREIGN KEY ("interimReliefDecisionId") REFERENCES "interim_relief_decisions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "review_stay_records" ADD CONSTRAINT "review_stay_records_deciderIdentityId_fkey" FOREIGN KEY ("deciderIdentityId") REFERENCES "identities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "review_stay_records" ADD CONSTRAINT "review_stay_records_deciderOfficeholderId_fkey" FOREIGN KEY ("deciderOfficeholderId") REFERENCES "officeholders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "review_stay_records" ADD CONSTRAINT "review_stay_records_functionAuthorityRecordId_fkey" FOREIGN KEY ("functionAuthorityRecordId") REFERENCES "function_authority_records"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "review_stay_records" ADD CONSTRAINT "review_stay_records_authorityEvaluationRecordId_fkey" FOREIGN KEY ("authorityEvaluationRecordId") REFERENCES "authority_evaluation_records"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "redress_implementation_plans" ADD CONSTRAINT "redress_implementation_plans_redressDecisionId_fkey" FOREIGN KEY ("redressDecisionId") REFERENCES "redress_decisions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "redress_implementation_actions" ADD CONSTRAINT "redress_implementation_actions_implementationPlanId_fkey" FOREIGN KEY ("implementationPlanId") REFERENCES "redress_implementation_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "redress_implementation_actions" ADD CONSTRAINT "redress_implementation_actions_responsibleIdentityId_fkey" FOREIGN KEY ("responsibleIdentityId") REFERENCES "identities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "redress_implementation_verifications" ADD CONSTRAINT "redress_implementation_verifications_actionId_fkey" FOREIGN KEY ("actionId") REFERENCES "redress_implementation_actions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "redress_notices" ADD CONSTRAINT "redress_notices_redressDecisionId_fkey" FOREIGN KEY ("redressDecisionId") REFERENCES "redress_decisions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "redress_notices" ADD CONSTRAINT "redress_notices_redressMatterId_fkey" FOREIGN KEY ("redressMatterId") REFERENCES "redress_matters"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
