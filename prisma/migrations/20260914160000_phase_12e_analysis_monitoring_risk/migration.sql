-- Phase 12E: Evidence-Supported Analysis, Monitoring, Alerting and Risk

-- CreateEnum
CREATE TYPE "AnalysisFunctionType" AS ENUM ('REQUIREMENT_COMPARISON', 'SOURCE_TO_CLAIM_ANALYSIS', 'EVIDENCE_GAP_IDENTIFICATION', 'CONFLICTING_SOURCE_DETECTION', 'OPTION_DEVELOPMENT', 'RISK_CONSEQUENCE_ANALYSIS', 'QUESTION_PREPARATION', 'DECISION_SUPPORT_SUMMARY', 'PROFESSIONAL_REVIEW_IDENTIFICATION');

-- CreateEnum
CREATE TYPE "AnalysisRequestStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "AnalysisRunStatus" AS ENUM ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "AnalysisSourceStatus" AS ENUM ('APPROVED', 'PENDING_REVIEW', 'STALE', 'REJECTED', 'CONFLICTING');

-- CreateEnum
CREATE TYPE "IntelligenceMonitoringObjectType" AS ENUM ('GOVERNMENT_SERVICE', 'CASE', 'COMPLIANCE_MATTER', 'INSTITUTIONAL_PROCESS', 'DOCUMENT_RECORD', 'OTHER_INSTITUTIONAL_OBJECT');

-- CreateEnum
CREATE TYPE "ForbiddenMonitoringSubjectType" AS ENUM ('PERSON', 'COMMUNICATION', 'LOCATION', 'DEVICE', 'PROTECTED_INFORMATION');

-- CreateEnum
CREATE TYPE "IntelligenceMonitoringRuleStatus" AS ENUM ('DRAFT', 'ACTIVE', 'SUSPENDED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "IntelligenceMonitoringFrequency" AS ENUM ('REALTIME', 'HOURLY', 'DAILY', 'WEEKLY', 'MONTHLY', 'CUSTOM');

-- CreateEnum
CREATE TYPE "IntelligenceAlertStatus" AS ENUM ('GENERATED', 'UNDER_REVIEW', 'VERIFIED_EVENT', 'FALSE_POSITIVE', 'UNRESOLVED', 'ESCALATED', 'CLOSED', 'SUPERSEDED');

-- CreateEnum
CREATE TYPE "RiskEvidenceBasis" AS ENUM ('OBSERVED_FACT', 'EXPERT_JUDGMENT', 'MODEL_ESTIMATE', 'SCENARIO_ASSUMPTION', 'HISTORICAL_PATTERN');

-- CreateEnum
CREATE TYPE "RiskDefinitionStatus" AS ENUM ('DRAFT', 'ACTIVE', 'SUPERSEDED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "RiskAssessmentStatus" AS ENUM ('DRAFT', 'UNDER_REVIEW', 'ACTIVE', 'SUPERSEDED', 'CLOSED');

-- CreateEnum
CREATE TYPE "RiskMitigationStatus" AS ENUM ('PROPOSED', 'IN_PROGRESS', 'IMPLEMENTED', 'REJECTED', 'DEFERRED');

-- CreateTable
CREATE TABLE "analysis_requests" (
    "id" UUID NOT NULL,
    "requestNumber" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "functionType" "AnalysisFunctionType" NOT NULL,
    "status" "AnalysisRequestStatus" NOT NULL DEFAULT 'DRAFT',
    "institutionId" UUID,
    "caseId" UUID,
    "requestedByIdentityId" UUID NOT NULL,
    "outputClassification" TEXT NOT NULL DEFAULT 'NOT_LEGAL_ADVICE;NOT_PROFESSIONAL_CERTIFICATION;NOT_GOVERNMENT_DETERMINATION;NOT_FINAL_DECISION',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "analysis_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "analysis_runs" (
    "id" UUID NOT NULL,
    "runNumber" TEXT NOT NULL,
    "requestId" UUID NOT NULL,
    "status" "AnalysisRunStatus" NOT NULL DEFAULT 'PENDING',
    "method" TEXT NOT NULL,
    "assumptions" JSONB NOT NULL DEFAULT '[]',
    "limitations" TEXT NOT NULL,
    "outputReplayHash" TEXT,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "executedByIdentityId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "analysis_runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "analysis_sources" (
    "id" UUID NOT NULL,
    "runId" UUID NOT NULL,
    "sourceReference" TEXT NOT NULL,
    "sourceLabel" TEXT NOT NULL,
    "sourceStatus" "AnalysisSourceStatus" NOT NULL,
    "exactValue" JSONB NOT NULL,
    "retrievedAt" TIMESTAMP(3),
    "stalenessNotedAt" TIMESTAMP(3),
    "conflictGroupId" TEXT,
    "preservedConflict" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "analysis_sources_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "analysis_findings" (
    "id" UUID NOT NULL,
    "runId" UUID NOT NULL,
    "findingText" TEXT NOT NULL,
    "conclusionScope" TEXT NOT NULL,
    "isDecisionLike" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "analysis_findings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "analysis_options" (
    "id" UUID NOT NULL,
    "runId" UUID NOT NULL,
    "optionLabel" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "tradeoffs" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "analysis_options_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "analysis_uncertainties" (
    "id" UUID NOT NULL,
    "runId" UUID NOT NULL,
    "uncertaintyText" TEXT NOT NULL,
    "severity" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "analysis_uncertainties_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "analysis_human_reviews" (
    "id" UUID NOT NULL,
    "runId" UUID NOT NULL,
    "reviewerIdentityId" UUID NOT NULL,
    "reviewNotes" TEXT,
    "professionalReviewRequired" BOOLEAN NOT NULL DEFAULT false,
    "reviewedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "analysis_human_reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "intelligence_monitoring_rules" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "objectType" "IntelligenceMonitoringObjectType" NOT NULL,
    "objectReference" TEXT NOT NULL,
    "approvedSourceReference" TEXT NOT NULL,
    "approvedSourceLabel" TEXT NOT NULL,
    "conditionDescription" TEXT NOT NULL,
    "detectionRule" JSONB NOT NULL DEFAULT '{}',
    "thresholdConfig" JSONB NOT NULL DEFAULT '{}',
    "ownerIdentityId" UUID NOT NULL,
    "purpose" TEXT NOT NULL,
    "reviewerIdentityId" UUID NOT NULL,
    "frequency" "IntelligenceMonitoringFrequency" NOT NULL,
    "effectiveFrom" TIMESTAMP(3) NOT NULL,
    "effectiveUntil" TIMESTAMP(3),
    "institutionId" UUID,
    "lawfulBasis" TEXT,
    "accessApprovalRef" TEXT,
    "status" "IntelligenceMonitoringRuleStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "intelligence_monitoring_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "intelligence_monitoring_observations" (
    "id" UUID NOT NULL,
    "ruleId" UUID NOT NULL,
    "observedCondition" TEXT NOT NULL,
    "sourceReference" TEXT NOT NULL,
    "sourceStatus" "AnalysisSourceStatus" NOT NULL,
    "confidenceNotes" TEXT,
    "uncertaintyNotes" TEXT,
    "isStaleSource" BOOLEAN NOT NULL DEFAULT false,
    "observedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "intelligence_monitoring_observations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "intelligence_monitoring_alerts" (
    "id" UUID NOT NULL,
    "alertNumber" TEXT NOT NULL,
    "ruleId" UUID NOT NULL,
    "observationId" UUID,
    "monitoredObjectType" "IntelligenceMonitoringObjectType" NOT NULL,
    "monitoredObjectReference" TEXT NOT NULL,
    "sourceReference" TEXT NOT NULL,
    "observedCondition" TEXT NOT NULL,
    "observedAt" TIMESTAMP(3) NOT NULL,
    "confidenceNotes" TEXT,
    "uncertaintyNotes" TEXT,
    "affectedServiceIds" JSONB NOT NULL DEFAULT '[]',
    "recommendedReview" TEXT NOT NULL,
    "responsibleRecipientIdentityId" UUID NOT NULL,
    "status" "IntelligenceAlertStatus" NOT NULL DEFAULT 'GENERATED',
    "isViolation" BOOLEAN NOT NULL DEFAULT false,
    "isEmergency" BOOLEAN NOT NULL DEFAULT false,
    "isEnforcement" BOOLEAN NOT NULL DEFAULT false,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "intelligence_monitoring_alerts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "intelligence_alert_verifications" (
    "id" UUID NOT NULL,
    "alertId" UUID NOT NULL,
    "verifierIdentityId" UUID NOT NULL,
    "evidenceRefs" JSONB NOT NULL DEFAULT '[]',
    "verificationNotes" TEXT NOT NULL,
    "isAlgorithmic" BOOLEAN NOT NULL DEFAULT false,
    "verifiedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "intelligence_alert_verifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "intelligence_alert_dispositions" (
    "id" UUID NOT NULL,
    "alertId" UUID NOT NULL,
    "dispositionStatus" "IntelligenceAlertStatus" NOT NULL,
    "disposedByIdentityId" UUID NOT NULL,
    "dispositionNotes" TEXT,
    "disposedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "intelligence_alert_dispositions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "risk_definitions" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "methodology" TEXT NOT NULL,
    "methodologyVersion" TEXT NOT NULL,
    "institutionId" UUID,
    "effectiveFrom" TIMESTAMP(3) NOT NULL,
    "effectiveUntil" TIMESTAMP(3),
    "status" "RiskDefinitionStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "risk_definitions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "risk_assessments" (
    "id" UUID NOT NULL,
    "assessmentNumber" TEXT NOT NULL,
    "definitionId" UUID NOT NULL,
    "subjectType" TEXT NOT NULL,
    "subjectReference" TEXT NOT NULL,
    "status" "RiskAssessmentStatus" NOT NULL DEFAULT 'DRAFT',
    "overallScore" DOUBLE PRECISION,
    "scoreLabel" TEXT,
    "scoreIsMandatoryGateBypass" BOOLEAN NOT NULL DEFAULT false,
    "methodologyVersion" TEXT NOT NULL,
    "limitations" TEXT NOT NULL,
    "assessedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "risk_assessments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "risk_factors" (
    "id" UUID NOT NULL,
    "assessmentId" UUID NOT NULL,
    "factorLabel" TEXT NOT NULL,
    "basis" "RiskEvidenceBasis" NOT NULL,
    "score" DOUBLE PRECISION,
    "weight" DOUBLE PRECISION,
    "exactValue" JSONB,
    "basisLabel" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "risk_factors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "risk_mitigations" (
    "id" UUID NOT NULL,
    "assessmentId" UUID NOT NULL,
    "mitigationText" TEXT NOT NULL,
    "status" "RiskMitigationStatus" NOT NULL DEFAULT 'PROPOSED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "risk_mitigations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "risk_reviews" (
    "id" UUID NOT NULL,
    "assessmentId" UUID NOT NULL,
    "reviewerIdentityId" UUID NOT NULL,
    "reviewNotes" TEXT,
    "reviewedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "risk_reviews_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "analysis_requests_requestNumber_key" ON "analysis_requests"("requestNumber");

-- CreateIndex
CREATE INDEX "analysis_requests_status_idx" ON "analysis_requests"("status");

-- CreateIndex
CREATE INDEX "analysis_requests_institutionId_idx" ON "analysis_requests"("institutionId");

-- CreateIndex
CREATE INDEX "analysis_requests_caseId_idx" ON "analysis_requests"("caseId");

-- CreateIndex
CREATE UNIQUE INDEX "analysis_runs_runNumber_key" ON "analysis_runs"("runNumber");

-- CreateIndex
CREATE INDEX "analysis_runs_requestId_idx" ON "analysis_runs"("requestId");

-- CreateIndex
CREATE INDEX "analysis_runs_status_idx" ON "analysis_runs"("status");

-- CreateIndex
CREATE INDEX "analysis_sources_runId_idx" ON "analysis_sources"("runId");

-- CreateIndex
CREATE INDEX "analysis_sources_conflictGroupId_idx" ON "analysis_sources"("conflictGroupId");

-- CreateIndex
CREATE INDEX "analysis_findings_runId_idx" ON "analysis_findings"("runId");

-- CreateIndex
CREATE INDEX "analysis_options_runId_idx" ON "analysis_options"("runId");

-- CreateIndex
CREATE INDEX "analysis_uncertainties_runId_idx" ON "analysis_uncertainties"("runId");

-- CreateIndex
CREATE INDEX "analysis_human_reviews_runId_idx" ON "analysis_human_reviews"("runId");

-- CreateIndex
CREATE INDEX "analysis_human_reviews_reviewerIdentityId_idx" ON "analysis_human_reviews"("reviewerIdentityId");

-- CreateIndex
CREATE UNIQUE INDEX "intelligence_monitoring_rules_code_key" ON "intelligence_monitoring_rules"("code");

-- CreateIndex
CREATE INDEX "intelligence_monitoring_rules_status_idx" ON "intelligence_monitoring_rules"("status");

-- CreateIndex
CREATE INDEX "intelligence_monitoring_rules_objectType_objectReference_idx" ON "intelligence_monitoring_rules"("objectType", "objectReference");

-- CreateIndex
CREATE INDEX "intelligence_monitoring_rules_institutionId_idx" ON "intelligence_monitoring_rules"("institutionId");

-- CreateIndex
CREATE INDEX "intelligence_monitoring_observations_ruleId_idx" ON "intelligence_monitoring_observations"("ruleId");

-- CreateIndex
CREATE INDEX "intelligence_monitoring_observations_observedAt_idx" ON "intelligence_monitoring_observations"("observedAt");

-- CreateIndex
CREATE UNIQUE INDEX "intelligence_monitoring_alerts_alertNumber_key" ON "intelligence_monitoring_alerts"("alertNumber");

-- CreateIndex
CREATE INDEX "intelligence_monitoring_alerts_ruleId_idx" ON "intelligence_monitoring_alerts"("ruleId");

-- CreateIndex
CREATE INDEX "intelligence_monitoring_alerts_status_idx" ON "intelligence_monitoring_alerts"("status");

-- CreateIndex
CREATE INDEX "intelligence_monitoring_alerts_observedAt_idx" ON "intelligence_monitoring_alerts"("observedAt");

-- CreateIndex
CREATE INDEX "intelligence_alert_verifications_alertId_idx" ON "intelligence_alert_verifications"("alertId");

-- CreateIndex
CREATE INDEX "intelligence_alert_dispositions_alertId_idx" ON "intelligence_alert_dispositions"("alertId");

-- CreateIndex
CREATE UNIQUE INDEX "risk_definitions_code_key" ON "risk_definitions"("code");

-- CreateIndex
CREATE INDEX "risk_definitions_status_idx" ON "risk_definitions"("status");

-- CreateIndex
CREATE INDEX "risk_definitions_institutionId_idx" ON "risk_definitions"("institutionId");

-- CreateIndex
CREATE UNIQUE INDEX "risk_assessments_assessmentNumber_key" ON "risk_assessments"("assessmentNumber");

-- CreateIndex
CREATE INDEX "risk_assessments_definitionId_idx" ON "risk_assessments"("definitionId");

-- CreateIndex
CREATE INDEX "risk_assessments_status_idx" ON "risk_assessments"("status");

-- CreateIndex
CREATE INDEX "risk_factors_assessmentId_idx" ON "risk_factors"("assessmentId");

-- CreateIndex
CREATE INDEX "risk_mitigations_assessmentId_idx" ON "risk_mitigations"("assessmentId");

-- CreateIndex
CREATE INDEX "risk_reviews_assessmentId_idx" ON "risk_reviews"("assessmentId");

-- AddForeignKey
ALTER TABLE "analysis_requests" ADD CONSTRAINT "analysis_requests_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "institutions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "analysis_requests" ADD CONSTRAINT "analysis_requests_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "cases"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "analysis_requests" ADD CONSTRAINT "analysis_requests_requestedByIdentityId_fkey" FOREIGN KEY ("requestedByIdentityId") REFERENCES "identities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "analysis_runs" ADD CONSTRAINT "analysis_runs_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "analysis_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "analysis_runs" ADD CONSTRAINT "analysis_runs_executedByIdentityId_fkey" FOREIGN KEY ("executedByIdentityId") REFERENCES "identities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "analysis_sources" ADD CONSTRAINT "analysis_sources_runId_fkey" FOREIGN KEY ("runId") REFERENCES "analysis_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "analysis_findings" ADD CONSTRAINT "analysis_findings_runId_fkey" FOREIGN KEY ("runId") REFERENCES "analysis_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "analysis_options" ADD CONSTRAINT "analysis_options_runId_fkey" FOREIGN KEY ("runId") REFERENCES "analysis_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "analysis_uncertainties" ADD CONSTRAINT "analysis_uncertainties_runId_fkey" FOREIGN KEY ("runId") REFERENCES "analysis_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "analysis_human_reviews" ADD CONSTRAINT "analysis_human_reviews_runId_fkey" FOREIGN KEY ("runId") REFERENCES "analysis_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "analysis_human_reviews" ADD CONSTRAINT "analysis_human_reviews_reviewerIdentityId_fkey" FOREIGN KEY ("reviewerIdentityId") REFERENCES "identities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "intelligence_monitoring_rules" ADD CONSTRAINT "intelligence_monitoring_rules_ownerIdentityId_fkey" FOREIGN KEY ("ownerIdentityId") REFERENCES "identities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "intelligence_monitoring_rules" ADD CONSTRAINT "intelligence_monitoring_rules_reviewerIdentityId_fkey" FOREIGN KEY ("reviewerIdentityId") REFERENCES "identities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "intelligence_monitoring_rules" ADD CONSTRAINT "intelligence_monitoring_rules_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "institutions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "intelligence_monitoring_observations" ADD CONSTRAINT "intelligence_monitoring_observations_ruleId_fkey" FOREIGN KEY ("ruleId") REFERENCES "intelligence_monitoring_rules"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "intelligence_monitoring_alerts" ADD CONSTRAINT "intelligence_monitoring_alerts_ruleId_fkey" FOREIGN KEY ("ruleId") REFERENCES "intelligence_monitoring_rules"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "intelligence_monitoring_alerts" ADD CONSTRAINT "intelligence_monitoring_alerts_observationId_fkey" FOREIGN KEY ("observationId") REFERENCES "intelligence_monitoring_observations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "intelligence_monitoring_alerts" ADD CONSTRAINT "intelligence_monitoring_alerts_responsibleRecipientIdentityId_fkey" FOREIGN KEY ("responsibleRecipientIdentityId") REFERENCES "identities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "intelligence_alert_verifications" ADD CONSTRAINT "intelligence_alert_verifications_alertId_fkey" FOREIGN KEY ("alertId") REFERENCES "intelligence_monitoring_alerts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "intelligence_alert_verifications" ADD CONSTRAINT "intelligence_alert_verifications_verifierIdentityId_fkey" FOREIGN KEY ("verifierIdentityId") REFERENCES "identities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "intelligence_alert_dispositions" ADD CONSTRAINT "intelligence_alert_dispositions_alertId_fkey" FOREIGN KEY ("alertId") REFERENCES "intelligence_monitoring_alerts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "intelligence_alert_dispositions" ADD CONSTRAINT "intelligence_alert_dispositions_disposedByIdentityId_fkey" FOREIGN KEY ("disposedByIdentityId") REFERENCES "identities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "risk_definitions" ADD CONSTRAINT "risk_definitions_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "institutions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "risk_assessments" ADD CONSTRAINT "risk_assessments_definitionId_fkey" FOREIGN KEY ("definitionId") REFERENCES "risk_definitions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "risk_factors" ADD CONSTRAINT "risk_factors_assessmentId_fkey" FOREIGN KEY ("assessmentId") REFERENCES "risk_assessments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "risk_mitigations" ADD CONSTRAINT "risk_mitigations_assessmentId_fkey" FOREIGN KEY ("assessmentId") REFERENCES "risk_assessments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "risk_reviews" ADD CONSTRAINT "risk_reviews_assessmentId_fkey" FOREIGN KEY ("assessmentId") REFERENCES "risk_assessments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "risk_reviews" ADD CONSTRAINT "risk_reviews_reviewerIdentityId_fkey" FOREIGN KEY ("reviewerIdentityId") REFERENCES "identities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
