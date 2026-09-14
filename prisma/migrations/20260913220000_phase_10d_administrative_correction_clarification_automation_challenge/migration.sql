-- ─── Phase 10D: Redress enums ─────────────────────────────────────────────────

DO $$ BEGIN
    CREATE TYPE "AdministrativeCorrectionCategory" AS ENUM (
        'TYPOGRAPHICAL_ERROR', 'CONTACT_INFORMATION', 'CLERICAL_MISSTATEMENT',
        'DUPLICATE_RECORD', 'DOCUMENT_ASSOCIATION', 'CALCULATION_ERROR',
        'STATUS_DISPLAY_ERROR', 'DELIVERY_ERROR', 'OTHER_AUTHORIZED_NONSUBSTANTIVE_ERROR'
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE "AdministrativeCorrectionMatterStatus" AS ENUM (
        'REQUESTED', 'UNDER_REVIEW', 'APPROVED', 'IMPLEMENTED', 'REJECTED', 'ROUTED_TO_ALTERNATE_REDRESS'
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE "RedressRouteType" AS ENUM (
        'ADMINISTRATIVE_CORRECTION', 'CLARIFICATION', 'RECONSIDERATION',
        'INTERNAL_REVIEW', 'STATUTORY_APPEAL', 'AUTOMATION_CHALLENGE'
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE "ClarificationRequestStatus" AS ENUM (
        'REQUESTED', 'RESPONDED', 'CLOSED', 'REJECTED'
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE "AutomationChallengeGround" AS ENUM (
        'INCORRECT_INPUT_DATA', 'MISTAKEN_IDENTITY', 'FALSE_MATCH',
        'INAPPROPRIATE_CLASSIFICATION', 'UNEXPLAINED_SCORE', 'INCONSISTENT_RECOMMENDATION',
        'IRRELEVANT_DATA', 'BIASED_OR_DISCRIMINATORY_EFFECT', 'OUTDATED_SOURCE',
        'UNSUPPORTED_INFERENCE', 'MISSING_HUMAN_REVIEW', 'OUTSIDE_APPROVED_AUTOMATION_BOUNDARY',
        'OTHER_AUTHORIZED_GROUND'
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE "AutomationChallengeStatus" AS ENUM (
        'FILED', 'EXPLANATION_REQUESTED', 'EXPLANATION_PROVIDED', 'UNDER_REVIEW',
        'DISPOSED', 'ROUTED_TO_CORRECTION', 'ROUTED_TO_RECONSIDERATION'
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE "AutomationChallengeDispositionType" AS ENUM (
        'CORRECT_INPUT', 'RERUN_AUTHORIZED_PROCESS', 'EXCLUDE_FAULTY_OUTPUT',
        'REQUIRE_HUMAN_REVIEW', 'REOPEN_REVIEW', 'REFER_FOR_RECONSIDERATION',
        'NO_DEFECT_FOUND', 'OTHER_AUTHORIZED_REMEDY'
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ─── Phase 10D: Tables ────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "administrative_correction_matters" (
    "id" UUID NOT NULL,
    "matterNumber" TEXT NOT NULL,
    "category" "AdministrativeCorrectionCategory" NOT NULL,
    "status" "AdministrativeCorrectionMatterStatus" NOT NULL DEFAULT 'REQUESTED',
    "targetRecordType" TEXT NOT NULL,
    "targetRecordId" UUID NOT NULL,
    "targetVersionId" UUID,
    "requestedByIdentityId" UUID NOT NULL,
    "requesterOfficeholderId" UUID,
    "correctionAuthorityFunctionId" UUID,
    "reason" TEXT NOT NULL,
    "requestedChangeDescription" TEXT NOT NULL,
    "requestedChanges" JSONB NOT NULL DEFAULT '{}',
    "originalRecordSnapshot" JSONB,
    "supportingEvidenceIds" JSONB NOT NULL DEFAULT '[]',
    "recordCorrectionId" UUID,
    "reviewerIdentityId" UUID,
    "reviewerOfficeholderId" UUID,
    "approvedAt" TIMESTAMP(3),
    "authorityEvaluationRecordId" UUID,
    "correctedRecordReference" TEXT,
    "downstreamRecordsRequiringUpdate" JSONB NOT NULL DEFAULT '[]',
    "notificationReferences" JSONB NOT NULL DEFAULT '[]',
    "routedToRoute" "RedressRouteType",
    "routedRouteGuidance" TEXT,
    "caseId" UUID,
    "masterAdministrativeFileId" UUID,
    "governmentDecisionId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "administrative_correction_matters_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "clarification_requests" (
    "id" UUID NOT NULL,
    "requestNumber" TEXT NOT NULL,
    "status" "ClarificationRequestStatus" NOT NULL DEFAULT 'REQUESTED',
    "requesterIdentityId" UUID NOT NULL,
    "requestedSubject" TEXT NOT NULL,
    "clarificationQuestion" TEXT NOT NULL,
    "relatedDecisionId" UUID,
    "relatedInstrumentId" UUID,
    "relatedNoticeReference" TEXT,
    "caseId" UUID,
    "masterAdministrativeFileId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "clarification_requests_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "clarification_responses" (
    "id" UUID NOT NULL,
    "clarificationRequestId" UUID NOT NULL,
    "responderIdentityId" UUID NOT NULL,
    "responderOfficeholderId" UUID,
    "responseContent" TEXT NOT NULL,
    "proceduralExplanation" TEXT,
    "referencedRequirement" TEXT,
    "applicableDeadline" TIMESTAMP(3),
    "availableRoutes" JSONB NOT NULL DEFAULT '[]',
    "displayedDataExplanation" TEXT,
    "recordAccessGuidance" TEXT,
    "authorityEvaluationRecordId" UUID,
    "respondedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "clarification_responses_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "automation_explanation_records" (
    "id" UUID NOT NULL,
    "automationUsed" BOOLEAN NOT NULL DEFAULT true,
    "approvedPurpose" TEXT NOT NULL,
    "systemIdentifier" TEXT NOT NULL,
    "modelIdentifier" TEXT,
    "version" TEXT NOT NULL,
    "materialInputs" JSONB NOT NULL DEFAULT '{}',
    "output" JSONB NOT NULL DEFAULT '{}',
    "workflowRole" TEXT NOT NULL,
    "limitations" TEXT,
    "humanReviewerIdentityId" UUID,
    "finalDecisionMakerIdentityId" UUID,
    "dataSourceReferences" JSONB NOT NULL DEFAULT '[]',
    "rerunAvailable" BOOLEAN NOT NULL DEFAULT false,
    "exclusionAvailable" BOOLEAN NOT NULL DEFAULT false,
    "correctionRouteReference" TEXT,
    "reconsiderationRouteReference" TEXT,
    "protectedRedactedElements" JSONB NOT NULL DEFAULT '[]',
    "explanationSummary" TEXT NOT NULL,
    "securityAuditEventId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "automation_explanation_records_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "automation_challenge_dispositions" (
    "id" UUID NOT NULL,
    "automationChallengeId" UUID NOT NULL,
    "dispositionType" "AutomationChallengeDispositionType" NOT NULL,
    "disposedByIdentityId" UUID NOT NULL,
    "disposedByOfficeholderId" UUID,
    "authorityEvaluationRecordId" UUID,
    "rationale" TEXT NOT NULL,
    "excludedOutputReference" TEXT,
    "historicalOutputPreserved" BOOLEAN NOT NULL DEFAULT true,
    "recordCorrectionId" UUID,
    "reconsiderationRouteReference" TEXT,
    "disposedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "automation_challenge_dispositions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "automation_challenges" (
    "id" UUID NOT NULL,
    "challengeNumber" TEXT NOT NULL,
    "status" "AutomationChallengeStatus" NOT NULL DEFAULT 'FILED',
    "grounds" "AutomationChallengeGround" NOT NULL,
    "challengedAutomationReference" TEXT NOT NULL,
    "decisionAssistanceRecordRef" TEXT,
    "challengerIdentityId" UUID NOT NULL,
    "description" TEXT NOT NULL,
    "relatedDecisionId" UUID,
    "relatedCaseId" UUID,
    "explanationRecordId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "automation_challenges_pkey" PRIMARY KEY ("id")
);

-- Unique constraints
CREATE UNIQUE INDEX IF NOT EXISTS "administrative_correction_matters_matterNumber_key" ON "administrative_correction_matters"("matterNumber");
CREATE UNIQUE INDEX IF NOT EXISTS "clarification_requests_requestNumber_key" ON "clarification_requests"("requestNumber");
CREATE UNIQUE INDEX IF NOT EXISTS "automation_challenges_challengeNumber_key" ON "automation_challenges"("challengeNumber");
CREATE UNIQUE INDEX IF NOT EXISTS "automation_challenges_explanationRecordId_key" ON "automation_challenges"("explanationRecordId");
CREATE UNIQUE INDEX IF NOT EXISTS "automation_challenge_dispositions_automationChallengeId_key" ON "automation_challenge_dispositions"("automationChallengeId");

-- Indexes
CREATE INDEX IF NOT EXISTS "administrative_correction_matters_status_idx" ON "administrative_correction_matters"("status");
CREATE INDEX IF NOT EXISTS "administrative_correction_matters_category_idx" ON "administrative_correction_matters"("category");
CREATE INDEX IF NOT EXISTS "administrative_correction_matters_targetRecordType_targetRecordId_idx" ON "administrative_correction_matters"("targetRecordType", "targetRecordId");
CREATE INDEX IF NOT EXISTS "administrative_correction_matters_caseId_idx" ON "administrative_correction_matters"("caseId");
CREATE INDEX IF NOT EXISTS "administrative_correction_matters_requestedByIdentityId_idx" ON "administrative_correction_matters"("requestedByIdentityId");
CREATE INDEX IF NOT EXISTS "clarification_requests_status_idx" ON "clarification_requests"("status");
CREATE INDEX IF NOT EXISTS "clarification_requests_requesterIdentityId_idx" ON "clarification_requests"("requesterIdentityId");
CREATE INDEX IF NOT EXISTS "clarification_requests_relatedDecisionId_idx" ON "clarification_requests"("relatedDecisionId");
CREATE INDEX IF NOT EXISTS "clarification_responses_clarificationRequestId_idx" ON "clarification_responses"("clarificationRequestId");
CREATE INDEX IF NOT EXISTS "automation_explanation_records_systemIdentifier_idx" ON "automation_explanation_records"("systemIdentifier");
CREATE INDEX IF NOT EXISTS "automation_explanation_records_modelIdentifier_idx" ON "automation_explanation_records"("modelIdentifier");
CREATE INDEX IF NOT EXISTS "automation_challenge_dispositions_dispositionType_idx" ON "automation_challenge_dispositions"("dispositionType");
CREATE INDEX IF NOT EXISTS "automation_challenge_dispositions_disposedByIdentityId_idx" ON "automation_challenge_dispositions"("disposedByIdentityId");
CREATE INDEX IF NOT EXISTS "automation_challenges_status_idx" ON "automation_challenges"("status");
CREATE INDEX IF NOT EXISTS "automation_challenges_grounds_idx" ON "automation_challenges"("grounds");
CREATE INDEX IF NOT EXISTS "automation_challenges_challengerIdentityId_idx" ON "automation_challenges"("challengerIdentityId");
CREATE INDEX IF NOT EXISTS "automation_challenges_relatedDecisionId_idx" ON "automation_challenges"("relatedDecisionId");

-- Foreign keys
ALTER TABLE "administrative_correction_matters" ADD CONSTRAINT "administrative_correction_matters_requestedByIdentityId_fkey" FOREIGN KEY ("requestedByIdentityId") REFERENCES "identities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "administrative_correction_matters" ADD CONSTRAINT "administrative_correction_matters_requesterOfficeholderId_fkey" FOREIGN KEY ("requesterOfficeholderId") REFERENCES "officeholders"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "administrative_correction_matters" ADD CONSTRAINT "administrative_correction_matters_reviewerIdentityId_fkey" FOREIGN KEY ("reviewerIdentityId") REFERENCES "identities"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "administrative_correction_matters" ADD CONSTRAINT "administrative_correction_matters_reviewerOfficeholderId_fkey" FOREIGN KEY ("reviewerOfficeholderId") REFERENCES "officeholders"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "administrative_correction_matters" ADD CONSTRAINT "administrative_correction_matters_correctionAuthorityFunctionId_fkey" FOREIGN KEY ("correctionAuthorityFunctionId") REFERENCES "function_authority_records"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "administrative_correction_matters" ADD CONSTRAINT "administrative_correction_matters_authorityEvaluationRecordId_fkey" FOREIGN KEY ("authorityEvaluationRecordId") REFERENCES "authority_evaluation_records"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "administrative_correction_matters" ADD CONSTRAINT "administrative_correction_matters_recordCorrectionId_fkey" FOREIGN KEY ("recordCorrectionId") REFERENCES "record_corrections"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "administrative_correction_matters" ADD CONSTRAINT "administrative_correction_matters_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "cases"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "administrative_correction_matters" ADD CONSTRAINT "administrative_correction_matters_masterAdministrativeFileId_fkey" FOREIGN KEY ("masterAdministrativeFileId") REFERENCES "master_administrative_files"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "administrative_correction_matters" ADD CONSTRAINT "administrative_correction_matters_governmentDecisionId_fkey" FOREIGN KEY ("governmentDecisionId") REFERENCES "government_decisions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "clarification_requests" ADD CONSTRAINT "clarification_requests_requesterIdentityId_fkey" FOREIGN KEY ("requesterIdentityId") REFERENCES "identities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "clarification_requests" ADD CONSTRAINT "clarification_requests_relatedDecisionId_fkey" FOREIGN KEY ("relatedDecisionId") REFERENCES "government_decisions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "clarification_requests" ADD CONSTRAINT "clarification_requests_relatedInstrumentId_fkey" FOREIGN KEY ("relatedInstrumentId") REFERENCES "official_instruments"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "clarification_requests" ADD CONSTRAINT "clarification_requests_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "cases"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "clarification_requests" ADD CONSTRAINT "clarification_requests_masterAdministrativeFileId_fkey" FOREIGN KEY ("masterAdministrativeFileId") REFERENCES "master_administrative_files"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "clarification_responses" ADD CONSTRAINT "clarification_responses_clarificationRequestId_fkey" FOREIGN KEY ("clarificationRequestId") REFERENCES "clarification_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "clarification_responses" ADD CONSTRAINT "clarification_responses_responderIdentityId_fkey" FOREIGN KEY ("responderIdentityId") REFERENCES "identities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "clarification_responses" ADD CONSTRAINT "clarification_responses_responderOfficeholderId_fkey" FOREIGN KEY ("responderOfficeholderId") REFERENCES "officeholders"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "clarification_responses" ADD CONSTRAINT "clarification_responses_authorityEvaluationRecordId_fkey" FOREIGN KEY ("authorityEvaluationRecordId") REFERENCES "authority_evaluation_records"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "automation_explanation_records" ADD CONSTRAINT "automation_explanation_records_humanReviewerIdentityId_fkey" FOREIGN KEY ("humanReviewerIdentityId") REFERENCES "identities"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "automation_explanation_records" ADD CONSTRAINT "automation_explanation_records_finalDecisionMakerIdentityId_fkey" FOREIGN KEY ("finalDecisionMakerIdentityId") REFERENCES "identities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "automation_challenge_dispositions" ADD CONSTRAINT "automation_challenge_dispositions_automationChallengeId_fkey" FOREIGN KEY ("automationChallengeId") REFERENCES "automation_challenges"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "automation_challenge_dispositions" ADD CONSTRAINT "automation_challenge_dispositions_disposedByIdentityId_fkey" FOREIGN KEY ("disposedByIdentityId") REFERENCES "identities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "automation_challenge_dispositions" ADD CONSTRAINT "automation_challenge_dispositions_disposedByOfficeholderId_fkey" FOREIGN KEY ("disposedByOfficeholderId") REFERENCES "officeholders"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "automation_challenge_dispositions" ADD CONSTRAINT "automation_challenge_dispositions_authorityEvaluationRecordId_fkey" FOREIGN KEY ("authorityEvaluationRecordId") REFERENCES "authority_evaluation_records"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "automation_challenge_dispositions" ADD CONSTRAINT "automation_challenge_dispositions_recordCorrectionId_fkey" FOREIGN KEY ("recordCorrectionId") REFERENCES "record_corrections"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "automation_challenges" ADD CONSTRAINT "automation_challenges_challengerIdentityId_fkey" FOREIGN KEY ("challengerIdentityId") REFERENCES "identities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "automation_challenges" ADD CONSTRAINT "automation_challenges_relatedDecisionId_fkey" FOREIGN KEY ("relatedDecisionId") REFERENCES "government_decisions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "automation_challenges" ADD CONSTRAINT "automation_challenges_relatedCaseId_fkey" FOREIGN KEY ("relatedCaseId") REFERENCES "cases"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "automation_challenges" ADD CONSTRAINT "automation_challenges_explanationRecordId_fkey" FOREIGN KEY ("explanationRecordId") REFERENCES "automation_explanation_records"("id") ON DELETE SET NULL ON UPDATE CASCADE;
