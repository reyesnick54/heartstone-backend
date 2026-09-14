-- Phase 9E reconciliation: supersede interim Phase 8G lifecycle tables on official_instruments.
DROP TABLE IF EXISTS "decision_review_references" CASCADE;
DROP TABLE IF EXISTS "instrument_surrender_records" CASCADE;
DROP TABLE IF EXISTS "instrument_replacement_records" CASCADE;
DROP TABLE IF EXISTS "instrument_reinstatement_records" CASCADE;
DROP TABLE IF EXISTS "instrument_revocation_records" CASCADE;
DROP TABLE IF EXISTS "instrument_suspension_records" CASCADE;
DROP TABLE IF EXISTS "instrument_renewal_records" CASCADE;
DROP TABLE IF EXISTS "instrument_amendment_records" CASCADE;
DROP TABLE IF EXISTS "instrument_lifecycle_decision_links" CASCADE;
DROP TABLE IF EXISTS "instrument_lifecycle_events" CASCADE;

-- CreateEnum
CREATE TYPE "InstrumentControllingDecisionType" AS ENUM ('APPROVE', 'APPROVE_WITH_CONDITIONS', 'REFUSE', 'DEFER', 'SUSPEND', 'PARTIALLY_SUSPEND', 'REVOKE', 'REVOCATION_DECIDED', 'REINSTATE', 'AMEND', 'VARY', 'RENEW', 'REPLACE', 'CORRECT_CLERICAL', 'SURRENDER_ACCEPT', 'CLOSE', 'OTHER');

-- CreateEnum
CREATE TYPE "InstrumentControllingDecisionStatus" AS ENUM ('DRAFT', 'PENDING', 'FINALIZED', 'SUPERSEDED', 'WITHDRAWN');

-- CreateEnum
CREATE TYPE "LifecycleOfficialInstrumentType" AS ENUM ('LICENSE', 'PERMIT', 'CERTIFICATE', 'AUTHORIZATION', 'REGISTRATION', 'APPROVAL', 'OTHER');

-- CreateEnum
DO $$ BEGIN CREATE TYPE "InstrumentJurisdictionScope" AS ENUM ('NATIONAL', 'ABSEZ', 'INSTITUTIONAL', 'OTHER'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- CreateEnum
CREATE TYPE "LifecycleOfficialInstrumentStatus" AS ENUM ('DRAFT', 'ISSUED', 'EFFECTIVE', 'AMENDED', 'VARIED', 'RENEWED', 'SUSPENDED', 'PARTIALLY_SUSPENDED', 'REVOCATION_DECIDED', 'REVOKED', 'REINSTATED', 'EXPIRED', 'SURRENDERED', 'SUPERSEDED', 'REPLACED', 'CLOSED');

-- CreateEnum
DO $$ BEGIN CREATE TYPE "InstrumentLifecycleEventType" AS ENUM ('ISSUED', 'BECAME_EFFECTIVE', 'AMENDED', 'VARIED', 'RENEWED', 'CORRECTED_CLERICAL', 'REPLACED', 'SUSPENDED', 'PARTIALLY_SUSPENDED', 'REVOCATION_DECIDED', 'REVOKED', 'REINSTATED', 'EXPIRED', 'SURRENDERED', 'SUPERSEDED', 'CLOSED'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- CreateEnum
DO $$ BEGIN CREATE TYPE "ReviewStayStatus" AS ENUM ('NONE', 'INTERIM_STAY_AUTHORIZED', 'STAY_DENIED', 'STAY_EXPIRED', 'STAY_LIFTED'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- CreateEnum
DO $$ BEGIN CREATE TYPE "ReviewInterimEffect" AS ENUM ('NONE', 'PARTIAL_STAY', 'FULL_STAY', 'OPERATIONAL_CONTINUATION'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- CreateEnum
DO $$ BEGIN CREATE TYPE "SurrenderType" AS ENUM ('APPLICANT_REQUEST', 'INSTITUTIONAL_ACCEPTANCE', 'VOLUNTARY_CESSATION'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- CreateEnum
DO $$ BEGIN CREATE TYPE "PriorVersionTreatment" AS ENUM ('SUPERSEDED', 'PARTIALLY_SUPERSEDED', 'RETAINED_HISTORICAL', 'REPLACED'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- CreateEnum
DO $$ BEGIN CREATE TYPE "ComplianceMatterStatus" AS ENUM ('OPEN', 'UNDER_REVIEW', 'CORRECTIVE_ACTION', 'VERIFICATION', 'CLOSED', 'REOPENED', 'ESCALATED', 'ROUTED_IMMEDIATE_ACTION'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- CreateEnum
CREATE TYPE "ComplianceRiskLevel" AS ENUM ('LOW', 'MODERATE', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "ComplianceImmediateActionRoute" AS ENUM ('NONE', 'IMMEDIATE_RESTRICTION', 'PHASE_8_SUSPENSION', 'PHASE_8_REVOCATION', 'RETAINED_NATIONAL_REFERRAL', 'EMERGENCY_ACTION');

-- CreateEnum
DO $$ BEGIN CREATE TYPE "InspectionFindingStatus" AS ENUM ('OPEN', 'CORRECTIVE_ACTION_REQUIRED', 'EVIDENCE_SUBMITTED', 'VERIFICATION_PENDING', 'PARTIALLY_VERIFIED', 'CLOSED', 'REOPENED'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- CreateEnum
CREATE TYPE "CorrectiveActionPlanStatus" AS ENUM ('PROPOSED', 'REVIEW_REQUIRED', 'APPROVED', 'IN_PROGRESS', 'EVIDENCE_SUBMITTED', 'VERIFICATION_PENDING', 'PARTIALLY_VERIFIED', 'VERIFIED_COMPLETE', 'OVERDUE', 'FAILED', 'ESCALATED', 'SUPERSEDED', 'CLOSED');

-- CreateEnum
CREATE TYPE "CorrectiveActionItemStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'EVIDENCE_SUBMITTED', 'PARTIALLY_VERIFIED', 'VERIFIED', 'FAILED', 'OVERDUE');

-- CreateEnum
CREATE TYPE "CorrectiveActionSubmissionStatus" AS ENUM ('SUBMITTED', 'UNDER_REVIEW', 'ACCEPTED_FOR_VERIFICATION', 'REJECTED');

-- CreateEnum
CREATE TYPE "CorrectiveActionVerificationResult" AS ENUM ('VERIFIED', 'PARTIALLY_VERIFIED', 'NOT_VERIFIED', 'UNRESOLVED', 'REINSPECTION_REQUIRED');

-- CreateEnum
CREATE TYPE "ReinspectionRequirementStatus" AS ENUM ('REQUIRED', 'SCHEDULED', 'COMPLETED', 'WAIVED_BY_AUTHORIZED_DECISION');

-- CreateEnum
CREATE TYPE "ComplianceFindingClosureStatus" AS ENUM ('ACTIVE', 'SUPERSEDED_BY_REOPENING');

-- CreateEnum
CREATE TYPE "ComplianceFindingReopeningReason" AS ENUM ('MATERIAL_NEW_EVIDENCE', 'FALSE_OR_MISLEADING_EVIDENCE', 'CORRECTIVE_ACTION_FAILED', 'RECURRENCE', 'AUTHORIZED_REVIEW_MATERIAL_DEFECT');

-- CreateEnum
CREATE TYPE "RootCauseAnalysisMethod" AS ENUM ('STRUCTURED_FIVE_WHY', 'STRUCTURED_FISHBONE', 'STRUCTURED_FAULT_TREE', 'INSTITUTIONAL_REVIEW', 'AI_ASSISTED_DRAFT', 'OTHER_CONTROLLED');

-- CreateTable
CREATE TABLE "instrument_controlling_decisions" (
    "id" UUID NOT NULL,
    "decisionNumber" TEXT NOT NULL,
    "decisionType" "InstrumentControllingDecisionType" NOT NULL,
    "status" "InstrumentControllingDecisionStatus" NOT NULL DEFAULT 'DRAFT',
    "caseId" UUID,
    "masterAdministrativeFileId" UUID,
    "governmentServiceVersionId" UUID,
    "decidingOfficeholderId" UUID NOT NULL,
    "decidingIdentityId" UUID NOT NULL,
    "authorityEvaluationRecordId" UUID,
    "functionAuthorityRecordId" UUID,
    "outcomeSummary" TEXT NOT NULL,
    "reasonsReference" TEXT,
    "effectiveAt" TIMESTAMP(3),
    "finalizedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "instrument_controlling_decisions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lifecycle_official_instruments" (
    "id" UUID NOT NULL,
    "instrumentNumber" TEXT NOT NULL,
    "instrumentType" "LifecycleOfficialInstrumentType" NOT NULL,
    "jurisdictionScope" "InstrumentJurisdictionScope" NOT NULL DEFAULT 'NATIONAL',
    "currentStatus" "LifecycleOfficialInstrumentStatus" NOT NULL DEFAULT 'DRAFT',
    "holderIdentityId" UUID,
    "holderOfficeholderId" UUID,
    "caseId" UUID,
    "masterAdministrativeFileId" UUID,
    "governmentServiceVersionId" UUID,
    "issuingInstitutionId" UUID NOT NULL,
    "originalDecisionId" UUID NOT NULL,
    "currentVersionId" UUID,
    "effectiveFrom" TIMESTAMP(3),
    "effectiveUntil" TIMESTAMP(3),
    "publicVerificationToken" TEXT NOT NULL,
    "publicVerificationStatus" TEXT NOT NULL,
    "publicVerificationUpdatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lifecycle_official_instruments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lifecycle_official_instrument_versions" (
    "id" UUID NOT NULL,
    "instrumentId" UUID NOT NULL,
    "versionNumber" INTEGER NOT NULL,
    "isCurrent" BOOLEAN NOT NULL DEFAULT false,
    "supersededByVersionId" UUID,
    "contentReference" TEXT NOT NULL,
    "contentHash" TEXT NOT NULL,
    "scopeDescription" TEXT,
    "rightsAndObligations" JSONB NOT NULL DEFAULT '{}',
    "conditions" JSONB NOT NULL DEFAULT '[]',
    "effectiveFrom" TIMESTAMP(3),
    "effectiveUntil" TIMESTAMP(3),
    "priorVersionTreatment" "PriorVersionTreatment",
    "createdByDecisionId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lifecycle_official_instrument_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "instrument_lifecycle_events" (
    "id" UUID NOT NULL,
    "instrumentId" UUID NOT NULL,
    "eventType" "InstrumentLifecycleEventType" NOT NULL,
    "controllingDecisionId" UUID,
    "priorStatus" "LifecycleOfficialInstrumentStatus",
    "newStatus" "LifecycleOfficialInstrumentStatus" NOT NULL,
    "effectiveAt" TIMESTAMP(3) NOT NULL,
    "actorIdentityId" UUID,
    "actorOfficeholderId" UUID,
    "reason" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "instrument_lifecycle_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "instrument_lifecycle_decision_links" (
    "id" UUID NOT NULL,
    "lifecycleEventId" UUID NOT NULL,
    "governmentDecisionId" UUID NOT NULL,
    "linkRole" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "instrument_lifecycle_decision_links_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "instrument_amendment_records" (
    "id" UUID NOT NULL,
    "instrumentId" UUID NOT NULL,
    "priorVersionId" UUID NOT NULL,
    "newVersionId" UUID NOT NULL,
    "controllingDecisionId" UUID NOT NULL,
    "authorityReference" TEXT NOT NULL,
    "affectedScope" TEXT NOT NULL,
    "affectedRights" JSONB NOT NULL DEFAULT '[]',
    "affectedConditions" JSONB NOT NULL DEFAULT '[]',
    "evidenceIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "consultationRequired" BOOLEAN NOT NULL DEFAULT false,
    "consultationCompleted" BOOLEAN NOT NULL DEFAULT false,
    "noticeReference" TEXT,
    "reviewRightsReference" TEXT,
    "effectiveAt" TIMESTAMP(3) NOT NULL,
    "priorVersionTreatment" "PriorVersionTreatment" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "instrument_amendment_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "instrument_renewal_records" (
    "id" UUID NOT NULL,
    "instrumentId" UUID NOT NULL,
    "priorVersionId" UUID NOT NULL,
    "newVersionId" UUID,
    "controllingDecisionId" UUID NOT NULL,
    "authorityReference" TEXT NOT NULL,
    "currentEvidenceIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "identityVerified" BOOLEAN NOT NULL DEFAULT false,
    "ownershipVerified" BOOLEAN NOT NULL DEFAULT false,
    "conditionsPerformanceVerified" BOOLEAN NOT NULL DEFAULT false,
    "inspectionHistoryVerified" BOOLEAN NOT NULL DEFAULT false,
    "professionalStatusVerified" BOOLEAN NOT NULL DEFAULT false,
    "feesVerified" BOOLEAN NOT NULL DEFAULT false,
    "priorApprovalReliedUpon" BOOLEAN NOT NULL DEFAULT false,
    "paymentReceived" BOOLEAN NOT NULL DEFAULT false,
    "newEffectiveFrom" TIMESTAMP(3) NOT NULL,
    "newEffectiveUntil" TIMESTAMP(3),
    "noticeReference" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "instrument_renewal_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "instrument_suspension_records" (
    "id" UUID NOT NULL,
    "instrumentId" UUID NOT NULL,
    "controllingDecisionId" UUID NOT NULL,
    "authorityReference" TEXT NOT NULL,
    "triggerReference" TEXT NOT NULL,
    "evidenceIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "urgencyLevel" TEXT,
    "scopeDescription" TEXT,
    "partialScope" JSONB,
    "noticeReference" TEXT,
    "opportunityToRespondProvided" BOOLEAN NOT NULL DEFAULT false,
    "interimActionReference" TEXT,
    "reasonsReference" TEXT NOT NULL,
    "effectiveAt" TIMESTAMP(3) NOT NULL,
    "durationUntil" TIMESTAMP(3),
    "conditions" JSONB NOT NULL DEFAULT '[]',
    "reviewRightsReference" TEXT,
    "downstreamNotifications" JSONB NOT NULL DEFAULT '[]',
    "executedByIdentityId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "instrument_suspension_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "instrument_revocation_records" (
    "id" UUID NOT NULL,
    "instrumentId" UUID NOT NULL,
    "controllingDecisionId" UUID NOT NULL,
    "authorityReference" TEXT NOT NULL,
    "groundsReference" TEXT NOT NULL,
    "evidenceIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "noticeReference" TEXT,
    "opportunityToRespondProvided" BOOLEAN NOT NULL DEFAULT false,
    "reasonsReference" TEXT NOT NULL,
    "effectiveAt" TIMESTAMP(3) NOT NULL,
    "continuingObligations" JSONB NOT NULL DEFAULT '[]',
    "reviewRightsReference" TEXT,
    "downstreamNotifications" JSONB NOT NULL DEFAULT '[]',
    "closureRemediationReference" TEXT,
    "representsNationalRevocation" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "instrument_revocation_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "instrument_reinstatement_records" (
    "id" UUID NOT NULL,
    "instrumentId" UUID NOT NULL,
    "controllingDecisionId" UUID NOT NULL,
    "priorSuspensionRecordId" UUID,
    "priorRevocationRecordId" UUID,
    "authorityReference" TEXT NOT NULL,
    "correctiveEvidenceIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "inspectionVerified" BOOLEAN NOT NULL DEFAULT false,
    "professionalVerified" BOOLEAN NOT NULL DEFAULT false,
    "effectiveAt" TIMESTAMP(3) NOT NULL,
    "continuingConditions" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "instrument_reinstatement_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "instrument_replacement_records" (
    "id" UUID NOT NULL,
    "instrumentId" UUID NOT NULL,
    "priorVersionId" UUID NOT NULL,
    "replacementVersionId" UUID NOT NULL,
    "controllingDecisionId" UUID NOT NULL,
    "authorityReference" TEXT NOT NULL,
    "replacementReason" TEXT NOT NULL,
    "effectiveAt" TIMESTAMP(3) NOT NULL,
    "noticeReference" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "instrument_replacement_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "instrument_surrender_records" (
    "id" UUID NOT NULL,
    "instrumentId" UUID NOT NULL,
    "controllingDecisionId" UUID,
    "surrenderType" "SurrenderType" NOT NULL,
    "applicantRequestReference" TEXT,
    "institutionalAcceptanceReference" TEXT,
    "effectiveAt" TIMESTAMP(3) NOT NULL,
    "continuingObligations" JSONB NOT NULL DEFAULT '[]',
    "recordsRetentionReference" TEXT,
    "downstreamEffects" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "instrument_surrender_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "decision_review_references" (
    "id" UUID NOT NULL,
    "challengedDecisionId" UUID NOT NULL,
    "challengedInstrumentId" UUID,
    "reviewRoute" TEXT NOT NULL,
    "reviewAuthority" TEXT NOT NULL,
    "filedAt" TIMESTAMP(3) NOT NULL,
    "deadline" TIMESTAMP(3),
    "appellantIdentityId" UUID,
    "appellantOfficeholderId" UUID,
    "groundsReference" TEXT,
    "interimEffect" "ReviewInterimEffect" NOT NULL DEFAULT 'NONE',
    "stayStatus" "ReviewStayStatus" NOT NULL DEFAULT 'NONE',
    "finalDispositionReference" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "decision_review_references_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "corrective_action_plans" (
    "id" UUID NOT NULL,
    "planNumber" TEXT NOT NULL,
    "complianceMatterId" UUID NOT NULL,
    "inspectionFindingId" UUID NOT NULL,
    "authoritySource" TEXT NOT NULL,
    "rootCauseDescription" TEXT NOT NULL,
    "rootCauseAnalysisMethod" "RootCauseAnalysisMethod",
    "aiAssistanceMetadata" JSONB NOT NULL DEFAULT '{}',
    "requiredActions" TEXT NOT NULL,
    "responsibleParty" TEXT NOT NULL,
    "interimProtection" TEXT,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "evidenceRequired" TEXT NOT NULL,
    "verificationMethod" TEXT NOT NULL,
    "escalationRule" TEXT,
    "status" "CorrectiveActionPlanStatus" NOT NULL DEFAULT 'PROPOSED',
    "approvedByOfficeholderId" UUID,
    "approvedByIdentityId" UUID,
    "approvedAt" TIMESTAMP(3),
    "authorityEvaluationRecordId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "corrective_action_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "corrective_action_items" (
    "id" UUID NOT NULL,
    "correctiveActionPlanId" UUID NOT NULL,
    "itemNumber" INTEGER NOT NULL,
    "actionDescription" TEXT NOT NULL,
    "responsibleParty" TEXT NOT NULL,
    "dueDate" TIMESTAMP(3),
    "evidenceRequired" TEXT,
    "status" "CorrectiveActionItemStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "corrective_action_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "corrective_action_submissions" (
    "id" UUID NOT NULL,
    "correctiveActionPlanId" UUID NOT NULL,
    "correctiveActionItemId" UUID,
    "submittedByIdentityId" UUID NOT NULL,
    "submissionSummary" TEXT NOT NULL,
    "status" "CorrectiveActionSubmissionStatus" NOT NULL DEFAULT 'SUBMITTED',
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "corrective_action_submissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "corrective_action_submission_evidence" (
    "id" UUID NOT NULL,
    "submissionId" UUID NOT NULL,
    "evidenceRecordId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "corrective_action_submission_evidence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "corrective_action_verifications" (
    "id" UUID NOT NULL,
    "correctiveActionPlanId" UUID NOT NULL,
    "correctiveActionItemId" UUID,
    "actionVerified" TEXT NOT NULL,
    "evidenceSummary" TEXT NOT NULL,
    "verificationMethod" TEXT NOT NULL,
    "verifierIdentityId" UUID NOT NULL,
    "verifierOfficeholderId" UUID NOT NULL,
    "authorityEvaluationRecordId" UUID,
    "verifiedAt" TIMESTAMP(3) NOT NULL,
    "result" "CorrectiveActionVerificationResult" NOT NULL,
    "limitations" TEXT,
    "followUpRequired" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "corrective_action_verifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "corrective_action_verification_evidence" (
    "id" UUID NOT NULL,
    "verificationId" UUID NOT NULL,
    "evidenceRecordId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "corrective_action_verification_evidence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reinspection_requirements" (
    "id" UUID NOT NULL,
    "inspectionFindingId" UUID NOT NULL,
    "requirementDescription" TEXT NOT NULL,
    "status" "ReinspectionRequirementStatus" NOT NULL DEFAULT 'REQUIRED',
    "scheduledInspectionRecordId" UUID,
    "completedInspectionRecordId" UUID,
    "waivedByOfficeholderId" UUID,
    "waivedAt" TIMESTAMP(3),
    "waiverAuthorityReference" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reinspection_requirements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "compliance_finding_closures" (
    "id" UUID NOT NULL,
    "inspectionFindingId" UUID NOT NULL,
    "closureNumber" TEXT NOT NULL,
    "status" "ComplianceFindingClosureStatus" NOT NULL DEFAULT 'ACTIVE',
    "closureSummary" TEXT NOT NULL,
    "requiredActionsCompleted" BOOLEAN NOT NULL DEFAULT false,
    "requiredEvidenceVerified" BOOLEAN NOT NULL DEFAULT false,
    "reinspectionCompleted" BOOLEAN NOT NULL DEFAULT false,
    "relatedIssuesResolved" BOOLEAN NOT NULL DEFAULT false,
    "recordsPreserved" BOOLEAN NOT NULL DEFAULT true,
    "reviewerOfficeholderId" UUID NOT NULL,
    "reviewerIdentityId" UUID NOT NULL,
    "authorityEvaluationRecordId" UUID,
    "authorityReference" TEXT,
    "closedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "compliance_finding_closures_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "compliance_finding_reopenings" (
    "id" UUID NOT NULL,
    "inspectionFindingId" UUID NOT NULL,
    "priorClosureId" UUID NOT NULL,
    "reopeningNumber" TEXT NOT NULL,
    "reason" "ComplianceFindingReopeningReason" NOT NULL,
    "reasonDetail" TEXT NOT NULL,
    "reviewerOfficeholderId" UUID NOT NULL,
    "reviewerIdentityId" UUID NOT NULL,
    "authorityReference" TEXT,
    "reopenedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "compliance_finding_reopenings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "instrument_controlling_decisions_decisionNumber_key" ON "instrument_controlling_decisions"("decisionNumber");

-- CreateIndex
CREATE INDEX "instrument_controlling_decisions_caseId_idx" ON "instrument_controlling_decisions"("caseId");

-- CreateIndex
CREATE INDEX "instrument_controlling_decisions_status_idx" ON "instrument_controlling_decisions"("status");

-- CreateIndex
CREATE INDEX "instrument_controlling_decisions_decisionType_idx" ON "instrument_controlling_decisions"("decisionType");

-- CreateIndex
CREATE INDEX "instrument_controlling_decisions_decidingOfficeholderId_idx" ON "instrument_controlling_decisions"("decidingOfficeholderId");

-- CreateIndex
CREATE UNIQUE INDEX "lifecycle_official_instruments_instrumentNumber_key" ON "lifecycle_official_instruments"("instrumentNumber");

-- CreateIndex
CREATE UNIQUE INDEX "lifecycle_official_instruments_currentVersionId_key" ON "lifecycle_official_instruments"("currentVersionId");

-- CreateIndex
CREATE UNIQUE INDEX "lifecycle_official_instruments_publicVerificationToken_key" ON "lifecycle_official_instruments"("publicVerificationToken");

-- CreateIndex
CREATE INDEX "lifecycle_official_instruments_currentStatus_idx" ON "lifecycle_official_instruments"("currentStatus");

-- CreateIndex
CREATE INDEX "lifecycle_official_instruments_instrumentType_idx" ON "lifecycle_official_instruments"("instrumentType");

-- CreateIndex
CREATE INDEX "lifecycle_official_instruments_jurisdictionScope_idx" ON "lifecycle_official_instruments"("jurisdictionScope");

-- CreateIndex
CREATE INDEX "lifecycle_official_instruments_caseId_idx" ON "lifecycle_official_instruments"("caseId");

-- CreateIndex
CREATE INDEX "lifecycle_official_instruments_holderIdentityId_idx" ON "lifecycle_official_instruments"("holderIdentityId");

-- CreateIndex
CREATE INDEX "lifecycle_official_instruments_publicVerificationToken_idx" ON "lifecycle_official_instruments"("publicVerificationToken");

-- CreateIndex
CREATE UNIQUE INDEX "lifecycle_official_instrument_versions_supersededByVersionI_key" ON "lifecycle_official_instrument_versions"("supersededByVersionId");

-- CreateIndex
CREATE INDEX "lifecycle_official_instrument_versions_instrumentId_idx" ON "lifecycle_official_instrument_versions"("instrumentId");

-- CreateIndex
CREATE INDEX "lifecycle_official_instrument_versions_isCurrent_idx" ON "lifecycle_official_instrument_versions"("isCurrent");

-- CreateIndex
CREATE UNIQUE INDEX "lifecycle_official_instrument_versions_instrumentId_version_key" ON "lifecycle_official_instrument_versions"("instrumentId", "versionNumber");

-- CreateIndex
CREATE INDEX "instrument_lifecycle_events_instrumentId_effectiveAt_idx" ON "instrument_lifecycle_events"("instrumentId", "effectiveAt");

-- CreateIndex
CREATE INDEX "instrument_lifecycle_events_eventType_idx" ON "instrument_lifecycle_events"("eventType");

-- CreateIndex
CREATE INDEX "instrument_lifecycle_events_controllingDecisionId_idx" ON "instrument_lifecycle_events"("controllingDecisionId");

-- CreateIndex
CREATE INDEX "instrument_lifecycle_decision_links_governmentDecisionId_idx" ON "instrument_lifecycle_decision_links"("governmentDecisionId");

-- CreateIndex
CREATE UNIQUE INDEX "instrument_lifecycle_decision_links_lifecycleEventId_govern_key" ON "instrument_lifecycle_decision_links"("lifecycleEventId", "governmentDecisionId", "linkRole");

-- CreateIndex
CREATE INDEX "instrument_amendment_records_instrumentId_idx" ON "instrument_amendment_records"("instrumentId");

-- CreateIndex
CREATE INDEX "instrument_amendment_records_controllingDecisionId_idx" ON "instrument_amendment_records"("controllingDecisionId");

-- CreateIndex
CREATE INDEX "instrument_renewal_records_instrumentId_idx" ON "instrument_renewal_records"("instrumentId");

-- CreateIndex
CREATE INDEX "instrument_renewal_records_controllingDecisionId_idx" ON "instrument_renewal_records"("controllingDecisionId");

-- CreateIndex
CREATE INDEX "instrument_suspension_records_instrumentId_idx" ON "instrument_suspension_records"("instrumentId");

-- CreateIndex
CREATE INDEX "instrument_suspension_records_controllingDecisionId_idx" ON "instrument_suspension_records"("controllingDecisionId");

-- CreateIndex
CREATE INDEX "instrument_revocation_records_instrumentId_idx" ON "instrument_revocation_records"("instrumentId");

-- CreateIndex
CREATE INDEX "instrument_revocation_records_controllingDecisionId_idx" ON "instrument_revocation_records"("controllingDecisionId");

-- CreateIndex
CREATE INDEX "instrument_reinstatement_records_instrumentId_idx" ON "instrument_reinstatement_records"("instrumentId");

-- CreateIndex
CREATE INDEX "instrument_reinstatement_records_controllingDecisionId_idx" ON "instrument_reinstatement_records"("controllingDecisionId");

-- CreateIndex
CREATE INDEX "instrument_replacement_records_instrumentId_idx" ON "instrument_replacement_records"("instrumentId");

-- CreateIndex
CREATE INDEX "instrument_replacement_records_controllingDecisionId_idx" ON "instrument_replacement_records"("controllingDecisionId");

-- CreateIndex
CREATE INDEX "instrument_surrender_records_instrumentId_idx" ON "instrument_surrender_records"("instrumentId");

-- CreateIndex
CREATE INDEX "decision_review_references_challengedDecisionId_idx" ON "decision_review_references"("challengedDecisionId");

-- CreateIndex
CREATE INDEX "decision_review_references_challengedInstrumentId_idx" ON "decision_review_references"("challengedInstrumentId");

-- CreateIndex
CREATE INDEX "decision_review_references_stayStatus_idx" ON "decision_review_references"("stayStatus");

-- CreateIndex

-- CreateIndex

-- CreateIndex

-- CreateIndex

-- CreateIndex

-- CreateIndex

-- CreateIndex

-- CreateIndex

-- CreateIndex
CREATE UNIQUE INDEX "corrective_action_plans_planNumber_key" ON "corrective_action_plans"("planNumber");

-- CreateIndex
CREATE INDEX "corrective_action_plans_complianceMatterId_idx" ON "corrective_action_plans"("complianceMatterId");

-- CreateIndex
CREATE INDEX "corrective_action_plans_inspectionFindingId_idx" ON "corrective_action_plans"("inspectionFindingId");

-- CreateIndex
CREATE INDEX "corrective_action_plans_status_idx" ON "corrective_action_plans"("status");

-- CreateIndex
CREATE INDEX "corrective_action_plans_dueDate_idx" ON "corrective_action_plans"("dueDate");

-- CreateIndex
CREATE INDEX "corrective_action_items_correctiveActionPlanId_idx" ON "corrective_action_items"("correctiveActionPlanId");

-- CreateIndex
CREATE INDEX "corrective_action_items_status_idx" ON "corrective_action_items"("status");

-- CreateIndex
CREATE UNIQUE INDEX "corrective_action_items_correctiveActionPlanId_itemNumber_key" ON "corrective_action_items"("correctiveActionPlanId", "itemNumber");

-- CreateIndex
CREATE INDEX "corrective_action_submissions_correctiveActionPlanId_idx" ON "corrective_action_submissions"("correctiveActionPlanId");

-- CreateIndex
CREATE INDEX "corrective_action_submissions_correctiveActionItemId_idx" ON "corrective_action_submissions"("correctiveActionItemId");

-- CreateIndex
CREATE INDEX "corrective_action_submissions_submittedByIdentityId_idx" ON "corrective_action_submissions"("submittedByIdentityId");

-- CreateIndex
CREATE INDEX "corrective_action_submission_evidence_evidenceRecordId_idx" ON "corrective_action_submission_evidence"("evidenceRecordId");

-- CreateIndex
CREATE UNIQUE INDEX "corrective_action_submission_evidence_submissionId_evidence_key" ON "corrective_action_submission_evidence"("submissionId", "evidenceRecordId");

-- CreateIndex
CREATE INDEX "corrective_action_verifications_correctiveActionPlanId_idx" ON "corrective_action_verifications"("correctiveActionPlanId");

-- CreateIndex
CREATE INDEX "corrective_action_verifications_correctiveActionItemId_idx" ON "corrective_action_verifications"("correctiveActionItemId");

-- CreateIndex
CREATE INDEX "corrective_action_verifications_verifierOfficeholderId_idx" ON "corrective_action_verifications"("verifierOfficeholderId");

-- CreateIndex
CREATE INDEX "corrective_action_verifications_result_idx" ON "corrective_action_verifications"("result");

-- CreateIndex
CREATE INDEX "corrective_action_verification_evidence_evidenceRecordId_idx" ON "corrective_action_verification_evidence"("evidenceRecordId");

-- CreateIndex
CREATE UNIQUE INDEX "corrective_action_verification_evidence_verificationId_evid_key" ON "corrective_action_verification_evidence"("verificationId", "evidenceRecordId");

-- CreateIndex
CREATE INDEX "reinspection_requirements_inspectionFindingId_idx" ON "reinspection_requirements"("inspectionFindingId");

-- CreateIndex
CREATE INDEX "reinspection_requirements_status_idx" ON "reinspection_requirements"("status");

-- CreateIndex
CREATE UNIQUE INDEX "compliance_finding_closures_closureNumber_key" ON "compliance_finding_closures"("closureNumber");

-- CreateIndex
CREATE INDEX "compliance_finding_closures_inspectionFindingId_idx" ON "compliance_finding_closures"("inspectionFindingId");

-- CreateIndex
CREATE INDEX "compliance_finding_closures_status_idx" ON "compliance_finding_closures"("status");

-- CreateIndex
CREATE UNIQUE INDEX "compliance_finding_reopenings_priorClosureId_key" ON "compliance_finding_reopenings"("priorClosureId");

-- CreateIndex
CREATE UNIQUE INDEX "compliance_finding_reopenings_reopeningNumber_key" ON "compliance_finding_reopenings"("reopeningNumber");

-- CreateIndex
CREATE INDEX "compliance_finding_reopenings_inspectionFindingId_idx" ON "compliance_finding_reopenings"("inspectionFindingId");

-- AddForeignKey
ALTER TABLE "instrument_controlling_decisions" ADD CONSTRAINT "instrument_controlling_decisions_decidingOfficeholderId_fkey" FOREIGN KEY ("decidingOfficeholderId") REFERENCES "officeholders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "instrument_controlling_decisions" ADD CONSTRAINT "instrument_controlling_decisions_decidingIdentityId_fkey" FOREIGN KEY ("decidingIdentityId") REFERENCES "identities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "instrument_controlling_decisions" ADD CONSTRAINT "instrument_controlling_decisions_authorityEvaluationRecord_fkey" FOREIGN KEY ("authorityEvaluationRecordId") REFERENCES "authority_evaluation_records"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "instrument_controlling_decisions" ADD CONSTRAINT "instrument_controlling_decisions_functionAuthorityRecordId_fkey" FOREIGN KEY ("functionAuthorityRecordId") REFERENCES "function_authority_records"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "instrument_controlling_decisions" ADD CONSTRAINT "instrument_controlling_decisions_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "cases"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "instrument_controlling_decisions" ADD CONSTRAINT "instrument_controlling_decisions_masterAdministrativeFileI_fkey" FOREIGN KEY ("masterAdministrativeFileId") REFERENCES "master_administrative_files"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "instrument_controlling_decisions" ADD CONSTRAINT "instrument_controlling_decisions_governmentServiceVersionI_fkey" FOREIGN KEY ("governmentServiceVersionId") REFERENCES "government_service_versions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lifecycle_official_instruments" ADD CONSTRAINT "lifecycle_official_instruments_holderIdentityId_fkey" FOREIGN KEY ("holderIdentityId") REFERENCES "identities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lifecycle_official_instruments" ADD CONSTRAINT "lifecycle_official_instruments_holderOfficeholderId_fkey" FOREIGN KEY ("holderOfficeholderId") REFERENCES "officeholders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lifecycle_official_instruments" ADD CONSTRAINT "lifecycle_official_instruments_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "cases"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lifecycle_official_instruments" ADD CONSTRAINT "lifecycle_official_instruments_masterAdministrativeFileId_fkey" FOREIGN KEY ("masterAdministrativeFileId") REFERENCES "master_administrative_files"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lifecycle_official_instruments" ADD CONSTRAINT "lifecycle_official_instruments_governmentServiceVersionId_fkey" FOREIGN KEY ("governmentServiceVersionId") REFERENCES "government_service_versions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lifecycle_official_instruments" ADD CONSTRAINT "lifecycle_official_instruments_issuingInstitutionId_fkey" FOREIGN KEY ("issuingInstitutionId") REFERENCES "institutions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lifecycle_official_instruments" ADD CONSTRAINT "lifecycle_official_instruments_originalDecisionId_fkey" FOREIGN KEY ("originalDecisionId") REFERENCES "instrument_controlling_decisions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lifecycle_official_instruments" ADD CONSTRAINT "lifecycle_official_instruments_currentVersionId_fkey" FOREIGN KEY ("currentVersionId") REFERENCES "lifecycle_official_instrument_versions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lifecycle_official_instrument_versions" ADD CONSTRAINT "lifecycle_official_instrument_versions_instrumentId_fkey" FOREIGN KEY ("instrumentId") REFERENCES "lifecycle_official_instruments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lifecycle_official_instrument_versions" ADD CONSTRAINT "lifecycle_official_instrument_versions_supersededByVersion_fkey" FOREIGN KEY ("supersededByVersionId") REFERENCES "lifecycle_official_instrument_versions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lifecycle_official_instrument_versions" ADD CONSTRAINT "lifecycle_official_instrument_versions_createdByDecisionId_fkey" FOREIGN KEY ("createdByDecisionId") REFERENCES "instrument_controlling_decisions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "instrument_lifecycle_events" ADD CONSTRAINT "instrument_lifecycle_events_instrumentId_fkey" FOREIGN KEY ("instrumentId") REFERENCES "lifecycle_official_instruments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "instrument_lifecycle_events" ADD CONSTRAINT "instrument_lifecycle_events_controllingDecisionId_fkey" FOREIGN KEY ("controllingDecisionId") REFERENCES "instrument_controlling_decisions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "instrument_lifecycle_events" ADD CONSTRAINT "instrument_lifecycle_events_actorIdentityId_fkey" FOREIGN KEY ("actorIdentityId") REFERENCES "identities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "instrument_lifecycle_events" ADD CONSTRAINT "instrument_lifecycle_events_actorOfficeholderId_fkey" FOREIGN KEY ("actorOfficeholderId") REFERENCES "officeholders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "instrument_lifecycle_decision_links" ADD CONSTRAINT "instrument_lifecycle_decision_links_lifecycleEventId_fkey" FOREIGN KEY ("lifecycleEventId") REFERENCES "instrument_lifecycle_events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "instrument_lifecycle_decision_links" ADD CONSTRAINT "instrument_lifecycle_decision_links_governmentDecisionId_fkey" FOREIGN KEY ("governmentDecisionId") REFERENCES "instrument_controlling_decisions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "instrument_amendment_records" ADD CONSTRAINT "instrument_amendment_records_instrumentId_fkey" FOREIGN KEY ("instrumentId") REFERENCES "lifecycle_official_instruments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "instrument_amendment_records" ADD CONSTRAINT "instrument_amendment_records_priorVersionId_fkey" FOREIGN KEY ("priorVersionId") REFERENCES "lifecycle_official_instrument_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "instrument_amendment_records" ADD CONSTRAINT "instrument_amendment_records_newVersionId_fkey" FOREIGN KEY ("newVersionId") REFERENCES "lifecycle_official_instrument_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "instrument_amendment_records" ADD CONSTRAINT "instrument_amendment_records_controllingDecisionId_fkey" FOREIGN KEY ("controllingDecisionId") REFERENCES "instrument_controlling_decisions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "instrument_renewal_records" ADD CONSTRAINT "instrument_renewal_records_instrumentId_fkey" FOREIGN KEY ("instrumentId") REFERENCES "lifecycle_official_instruments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "instrument_renewal_records" ADD CONSTRAINT "instrument_renewal_records_priorVersionId_fkey" FOREIGN KEY ("priorVersionId") REFERENCES "lifecycle_official_instrument_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "instrument_renewal_records" ADD CONSTRAINT "instrument_renewal_records_newVersionId_fkey" FOREIGN KEY ("newVersionId") REFERENCES "lifecycle_official_instrument_versions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "instrument_renewal_records" ADD CONSTRAINT "instrument_renewal_records_controllingDecisionId_fkey" FOREIGN KEY ("controllingDecisionId") REFERENCES "instrument_controlling_decisions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "instrument_suspension_records" ADD CONSTRAINT "instrument_suspension_records_instrumentId_fkey" FOREIGN KEY ("instrumentId") REFERENCES "lifecycle_official_instruments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "instrument_suspension_records" ADD CONSTRAINT "instrument_suspension_records_controllingDecisionId_fkey" FOREIGN KEY ("controllingDecisionId") REFERENCES "instrument_controlling_decisions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "instrument_suspension_records" ADD CONSTRAINT "instrument_suspension_records_executedByIdentityId_fkey" FOREIGN KEY ("executedByIdentityId") REFERENCES "identities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "instrument_revocation_records" ADD CONSTRAINT "instrument_revocation_records_instrumentId_fkey" FOREIGN KEY ("instrumentId") REFERENCES "lifecycle_official_instruments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "instrument_revocation_records" ADD CONSTRAINT "instrument_revocation_records_controllingDecisionId_fkey" FOREIGN KEY ("controllingDecisionId") REFERENCES "instrument_controlling_decisions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "instrument_reinstatement_records" ADD CONSTRAINT "instrument_reinstatement_records_instrumentId_fkey" FOREIGN KEY ("instrumentId") REFERENCES "lifecycle_official_instruments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "instrument_reinstatement_records" ADD CONSTRAINT "instrument_reinstatement_records_controllingDecisionId_fkey" FOREIGN KEY ("controllingDecisionId") REFERENCES "instrument_controlling_decisions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "instrument_replacement_records" ADD CONSTRAINT "instrument_replacement_records_instrumentId_fkey" FOREIGN KEY ("instrumentId") REFERENCES "lifecycle_official_instruments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "instrument_replacement_records" ADD CONSTRAINT "instrument_replacement_records_priorVersionId_fkey" FOREIGN KEY ("priorVersionId") REFERENCES "lifecycle_official_instrument_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "instrument_replacement_records" ADD CONSTRAINT "instrument_replacement_records_replacementVersionId_fkey" FOREIGN KEY ("replacementVersionId") REFERENCES "lifecycle_official_instrument_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "instrument_replacement_records" ADD CONSTRAINT "instrument_replacement_records_controllingDecisionId_fkey" FOREIGN KEY ("controllingDecisionId") REFERENCES "instrument_controlling_decisions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "instrument_surrender_records" ADD CONSTRAINT "instrument_surrender_records_instrumentId_fkey" FOREIGN KEY ("instrumentId") REFERENCES "lifecycle_official_instruments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "instrument_surrender_records" ADD CONSTRAINT "instrument_surrender_records_controllingDecisionId_fkey" FOREIGN KEY ("controllingDecisionId") REFERENCES "instrument_controlling_decisions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "decision_review_references" ADD CONSTRAINT "decision_review_references_challengedDecisionId_fkey" FOREIGN KEY ("challengedDecisionId") REFERENCES "instrument_controlling_decisions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "decision_review_references" ADD CONSTRAINT "decision_review_references_challengedInstrumentId_fkey" FOREIGN KEY ("challengedInstrumentId") REFERENCES "lifecycle_official_instruments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "decision_review_references" ADD CONSTRAINT "decision_review_references_appellantIdentityId_fkey" FOREIGN KEY ("appellantIdentityId") REFERENCES "identities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "decision_review_references" ADD CONSTRAINT "decision_review_references_appellantOfficeholderId_fkey" FOREIGN KEY ("appellantOfficeholderId") REFERENCES "officeholders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey

-- AddForeignKey

-- AddForeignKey

-- AddForeignKey

-- AddForeignKey

-- AddForeignKey

-- AddForeignKey

-- AddForeignKey

-- AddForeignKey
ALTER TABLE "corrective_action_plans" ADD CONSTRAINT "corrective_action_plans_approvedByOfficeholderId_fkey" FOREIGN KEY ("approvedByOfficeholderId") REFERENCES "officeholders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "corrective_action_plans" ADD CONSTRAINT "corrective_action_plans_approvedByIdentityId_fkey" FOREIGN KEY ("approvedByIdentityId") REFERENCES "identities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "corrective_action_plans" ADD CONSTRAINT "corrective_action_plans_authorityEvaluationRecordId_fkey" FOREIGN KEY ("authorityEvaluationRecordId") REFERENCES "authority_evaluation_records"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "corrective_action_items" ADD CONSTRAINT "corrective_action_items_correctiveActionPlanId_fkey" FOREIGN KEY ("correctiveActionPlanId") REFERENCES "corrective_action_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "corrective_action_submissions" ADD CONSTRAINT "corrective_action_submissions_correctiveActionPlanId_fkey" FOREIGN KEY ("correctiveActionPlanId") REFERENCES "corrective_action_plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "corrective_action_submissions" ADD CONSTRAINT "corrective_action_submissions_correctiveActionItemId_fkey" FOREIGN KEY ("correctiveActionItemId") REFERENCES "corrective_action_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "corrective_action_submissions" ADD CONSTRAINT "corrective_action_submissions_submittedByIdentityId_fkey" FOREIGN KEY ("submittedByIdentityId") REFERENCES "identities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "corrective_action_submission_evidence" ADD CONSTRAINT "corrective_action_submission_evidence_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "corrective_action_submissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "corrective_action_submission_evidence" ADD CONSTRAINT "corrective_action_submission_evidence_evidenceRecordId_fkey" FOREIGN KEY ("evidenceRecordId") REFERENCES "evidence_records"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "corrective_action_verifications" ADD CONSTRAINT "corrective_action_verifications_correctiveActionPlanId_fkey" FOREIGN KEY ("correctiveActionPlanId") REFERENCES "corrective_action_plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "corrective_action_verifications" ADD CONSTRAINT "corrective_action_verifications_correctiveActionItemId_fkey" FOREIGN KEY ("correctiveActionItemId") REFERENCES "corrective_action_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "corrective_action_verifications" ADD CONSTRAINT "corrective_action_verifications_verifierIdentityId_fkey" FOREIGN KEY ("verifierIdentityId") REFERENCES "identities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "corrective_action_verifications" ADD CONSTRAINT "corrective_action_verifications_verifierOfficeholderId_fkey" FOREIGN KEY ("verifierOfficeholderId") REFERENCES "officeholders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "corrective_action_verifications" ADD CONSTRAINT "corrective_action_verifications_authorityEvaluationRecordI_fkey" FOREIGN KEY ("authorityEvaluationRecordId") REFERENCES "authority_evaluation_records"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "corrective_action_verification_evidence" ADD CONSTRAINT "corrective_action_verification_evidence_verificationId_fkey" FOREIGN KEY ("verificationId") REFERENCES "corrective_action_verifications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "corrective_action_verification_evidence" ADD CONSTRAINT "corrective_action_verification_evidence_evidenceRecordId_fkey" FOREIGN KEY ("evidenceRecordId") REFERENCES "evidence_records"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey

-- AddForeignKey
ALTER TABLE "reinspection_requirements" ADD CONSTRAINT "reinspection_requirements_scheduledInspectionRecordId_fkey" FOREIGN KEY ("scheduledInspectionRecordId") REFERENCES "inspection_records"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reinspection_requirements" ADD CONSTRAINT "reinspection_requirements_completedInspectionRecordId_fkey" FOREIGN KEY ("completedInspectionRecordId") REFERENCES "inspection_records"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reinspection_requirements" ADD CONSTRAINT "reinspection_requirements_waivedByOfficeholderId_fkey" FOREIGN KEY ("waivedByOfficeholderId") REFERENCES "officeholders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey

-- AddForeignKey
ALTER TABLE "compliance_finding_closures" ADD CONSTRAINT "compliance_finding_closures_reviewerOfficeholderId_fkey" FOREIGN KEY ("reviewerOfficeholderId") REFERENCES "officeholders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "compliance_finding_closures" ADD CONSTRAINT "compliance_finding_closures_reviewerIdentityId_fkey" FOREIGN KEY ("reviewerIdentityId") REFERENCES "identities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "compliance_finding_closures" ADD CONSTRAINT "compliance_finding_closures_authorityEvaluationRecordId_fkey" FOREIGN KEY ("authorityEvaluationRecordId") REFERENCES "authority_evaluation_records"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey

-- AddForeignKey
ALTER TABLE "compliance_finding_reopenings" ADD CONSTRAINT "compliance_finding_reopenings_priorClosureId_fkey" FOREIGN KEY ("priorClosureId") REFERENCES "compliance_finding_closures"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "compliance_finding_reopenings" ADD CONSTRAINT "compliance_finding_reopenings_reviewerOfficeholderId_fkey" FOREIGN KEY ("reviewerOfficeholderId") REFERENCES "officeholders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "compliance_finding_reopenings" ADD CONSTRAINT "compliance_finding_reopenings_reviewerIdentityId_fkey" FOREIGN KEY ("reviewerIdentityId") REFERENCES "identities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;