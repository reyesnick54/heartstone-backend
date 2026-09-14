-- CreateEnum
CREATE TYPE "public"."MetricDefinitionStatus" AS ENUM ('DRAFT', 'ACTIVE', 'SUSPENDED', 'RETIRED');

-- CreateEnum
CREATE TYPE "public"."MetricCalculationRunStatus" AS ENUM ('PENDING', 'CALCULATED', 'FAILED', 'SUPERSEDED');

-- CreateEnum
CREATE TYPE "public"."InstitutionalMetricClaimStatus" AS ENUM ('DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'EXPIRED', 'INVALIDATED', 'SUPERSEDED');

-- CreateEnum
CREATE TYPE "public"."InstitutionalMetricClaimRevalidationState" AS ENUM ('CURRENT', 'FLAGGED_FOR_REVALIDATION', 'INVALIDATED');

-- CreateEnum
CREATE TYPE "public"."ReportingDashboardIndicatorStatus" AS ENUM ('ACTIVE', 'SUPERSEDED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "public"."ReportingDashboardSnapshotStatus" AS ENUM ('CAPTURED', 'SUPERSEDED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "public"."ReportType" AS ENUM ('INTERNAL_OPERATIONAL', 'DEPARTMENTAL', 'EXECUTIVE', 'MANAGEMENT_COMMITTEE', 'ASSURANCE', 'PERFORMANCE', 'COMPLIANCE', 'AI_GOVERNANCE', 'SECURITY', 'CONTINUITY', 'ECONOMIC_DEVELOPMENT', 'PUBLIC', 'GOVERNMENT_SUBMISSION', 'OTHER_APPROVED');

-- CreateEnum
CREATE TYPE "public"."ReportDefinitionStatus" AS ENUM ('DRAFT', 'ACTIVE', 'SUSPENDED', 'RETIRED');

-- CreateEnum
CREATE TYPE "public"."ReportClassification" AS ENUM ('PUBLIC', 'INTERNAL', 'RESTRICTED', 'CONFIDENTIAL', 'PROTECTED_PERSONAL');

-- CreateEnum
CREATE TYPE "public"."ReportFrequency" AS ENUM ('AD_HOC', 'DAILY', 'WEEKLY', 'MONTHLY', 'QUARTERLY', 'ANNUAL', 'ON_DEMAND');

-- CreateEnum
CREATE TYPE "public"."ReportDefinitionVersionStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'SUPERSEDED', 'RETIRED');

-- CreateEnum
CREATE TYPE "public"."ReportGenerationRunStatus" AS ENUM ('DRAFT', 'GENERATING', 'GENERATED', 'UNDER_REVIEW', 'APPROVED', 'PUBLISHED', 'CORRECTED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "public"."ReportOutcomeClassification" AS ENUM ('POSITIVE', 'NEUTRAL', 'ADVERSE', 'MIXED', 'INCONCLUSIVE');

-- CreateEnum
CREATE TYPE "public"."ReportClaimStatus" AS ENUM ('GENERATED', 'PENDING_REVIEW', 'APPROVED', 'REJECTED', 'EXPIRED', 'SUPERSEDED');

-- CreateEnum
CREATE TYPE "public"."ReportReviewType" AS ENUM ('CONTENT', 'PRIVACY', 'SECURITY', 'RECORDS');

-- CreateEnum
CREATE TYPE "public"."ReportReviewStatus" AS ENUM ('PENDING', 'IN_REVIEW', 'SATISFACTORY', 'DEFICIENCY_IDENTIFIED', 'REJECTED');

-- CreateEnum
CREATE TYPE "public"."ReportApprovalStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'SUPERSEDED');

-- CreateEnum
CREATE TYPE "public"."ReportPublicationStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'CORRECTED', 'WITHDRAWN');

-- CreateEnum
CREATE TYPE "public"."ReportCorrectionStatus" AS ENUM ('REQUESTED', 'APPROVED', 'PUBLISHED', 'SUPERSEDED');

-- CreateEnum
CREATE TYPE "public"."ReportRevalidationTrigger" AS ENUM ('LAW_OR_POLICY_CHANGE', 'AUTHORITY_CHANGE', 'WORKFLOW_CHANGE', 'STAFFING_CHANGE', 'DATA_SOURCE_CHANGE', 'MEASUREMENT_METHOD_CHANGE', 'TECHNOLOGY_CHANGE', 'INTEGRATION_CHANGE', 'AI_MODEL_CHANGE', 'POPULATION_CHANGE', 'ECONOMIC_CONDITIONS_CHANGE', 'DEPARTMENT_CHANGE', 'PROFESSIONAL_REQUIREMENT_CHANGE');

-- CreateTable
CREATE TABLE "public"."metric_definitions" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "methodologyVersion" TEXT NOT NULL,
    "institutionId" UUID NOT NULL,
    "departmentId" UUID,
    "status" "public"."MetricDefinitionStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "metric_definitions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."metric_calculation_runs" (
    "id" UUID NOT NULL,
    "metricDefinitionId" UUID NOT NULL,
    "runNumber" TEXT NOT NULL,
    "methodologyVersion" TEXT NOT NULL,
    "inputsSnapshot" JSONB NOT NULL DEFAULT '{}',
    "resultValue" JSONB NOT NULL DEFAULT '{}',
    "resultNumeric" DECIMAL(20,6),
    "dataCutoffAt" TIMESTAMP(3) NOT NULL,
    "sourceVersions" JSONB NOT NULL DEFAULT '{}',
    "calculatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "calculatedByIdentityId" UUID NOT NULL,
    "status" "public"."MetricCalculationRunStatus" NOT NULL DEFAULT 'CALCULATED',
    "integrityHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "metric_calculation_runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."institutional_metric_claims" (
    "id" UUID NOT NULL,
    "claimNumber" TEXT NOT NULL,
    "metricCalculationRunId" UUID NOT NULL,
    "claimText" TEXT NOT NULL,
    "status" "public"."InstitutionalMetricClaimStatus" NOT NULL DEFAULT 'DRAFT',
    "outcomeClassification" "public"."ReportOutcomeClassification" NOT NULL,
    "validFrom" TIMESTAMP(3) NOT NULL,
    "validUntil" TIMESTAMP(3),
    "revalidationState" "public"."InstitutionalMetricClaimRevalidationState" NOT NULL DEFAULT 'CURRENT',
    "representsGovernmentStatistic" BOOLEAN NOT NULL DEFAULT false,
    "governmentStatisticConfirmed" BOOLEAN NOT NULL DEFAULT false,
    "isApproved" BOOLEAN NOT NULL DEFAULT false,
    "approvedAt" TIMESTAMP(3),
    "approvedByOfficeholderId" UUID,
    "associationOnly" BOOLEAN NOT NULL DEFAULT true,
    "causationDeclared" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "institutional_metric_claims_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."reporting_dashboard_indicators" (
    "id" UUID NOT NULL,
    "indicatorCode" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "metricCalculationRunId" UUID NOT NULL,
    "countValue" INTEGER,
    "displayValue" TEXT,
    "drillDownReferences" JSONB NOT NULL DEFAULT '[]',
    "methodologyVersion" TEXT NOT NULL,
    "audience" "public"."ComplianceDashboardAudience" NOT NULL,
    "institutionId" UUID NOT NULL,
    "departmentId" UUID,
    "snapshotAt" TIMESTAMP(3) NOT NULL,
    "status" "public"."ReportingDashboardIndicatorStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reporting_dashboard_indicators_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."reporting_dashboard_snapshots" (
    "id" UUID NOT NULL,
    "snapshotNumber" TEXT NOT NULL,
    "institutionId" UUID NOT NULL,
    "departmentId" UUID,
    "audience" "public"."ComplianceDashboardAudience" NOT NULL,
    "indicatorsSnapshot" JSONB NOT NULL DEFAULT '[]',
    "contentHash" TEXT NOT NULL,
    "capturedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "capturedByIdentityId" UUID NOT NULL,
    "dataCutoffAt" TIMESTAMP(3) NOT NULL,
    "status" "public"."ReportingDashboardSnapshotStatus" NOT NULL DEFAULT 'CAPTURED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reporting_dashboard_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."report_definitions" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "reportType" "public"."ReportType" NOT NULL,
    "purpose" TEXT NOT NULL,
    "audience" TEXT NOT NULL,
    "ownerIdentityId" UUID NOT NULL,
    "ownerOfficeholderId" UUID,
    "institutionId" UUID NOT NULL,
    "departmentId" UUID,
    "classification" "public"."ReportClassification" NOT NULL,
    "frequency" "public"."ReportFrequency" NOT NULL,
    "retentionPolicy" TEXT NOT NULL,
    "requiresPrivacyReview" BOOLEAN NOT NULL DEFAULT false,
    "requiresSecurityReview" BOOLEAN NOT NULL DEFAULT false,
    "requiresRecordsReview" BOOLEAN NOT NULL DEFAULT true,
    "status" "public"."ReportDefinitionStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "report_definitions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."report_definition_versions" (
    "id" UUID NOT NULL,
    "reportDefinitionId" UUID NOT NULL,
    "versionNumber" TEXT NOT NULL,
    "purpose" TEXT NOT NULL,
    "audience" TEXT NOT NULL,
    "ownerIdentityId" UUID NOT NULL,
    "ownerOfficeholderId" UUID,
    "classification" "public"."ReportClassification" NOT NULL,
    "metricsConfig" JSONB NOT NULL DEFAULT '[]',
    "claimsConfig" JSONB NOT NULL DEFAULT '[]',
    "requiredSources" JSONB NOT NULL DEFAULT '[]',
    "reviewersConfig" JSONB NOT NULL DEFAULT '[]',
    "publicationAuthorityFunctionId" UUID,
    "frequency" "public"."ReportFrequency" NOT NULL,
    "retentionPolicy" TEXT NOT NULL,
    "redactionRules" JSONB NOT NULL DEFAULT '[]',
    "effectiveFrom" TIMESTAMP(3),
    "effectiveUntil" TIMESTAMP(3),
    "status" "public"."ReportDefinitionVersionStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "report_definition_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."report_sections" (
    "id" UUID NOT NULL,
    "reportDefinitionVersionId" UUID NOT NULL,
    "sectionKey" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "orderIndex" INTEGER NOT NULL,
    "contentTemplate" TEXT,
    "allowOutcomeClassification" "public"."ReportOutcomeClassification",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "report_sections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."report_generation_runs" (
    "id" UUID NOT NULL,
    "runNumber" TEXT NOT NULL,
    "reportDefinitionVersionId" UUID NOT NULL,
    "status" "public"."ReportGenerationRunStatus" NOT NULL DEFAULT 'DRAFT',
    "dataCutoffAt" TIMESTAMP(3) NOT NULL,
    "sourceVersions" JSONB NOT NULL DEFAULT '{}',
    "aiAssistanceRecord" JSONB NOT NULL DEFAULT '{}',
    "frozenContent" JSONB NOT NULL DEFAULT '{}',
    "contentHash" TEXT,
    "redactedContent" JSONB NOT NULL DEFAULT '{}',
    "initiatedByIdentityId" UUID NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "report_generation_runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."report_generation_run_metric_pins" (
    "id" UUID NOT NULL,
    "reportGenerationRunId" UUID NOT NULL,
    "metricCalculationRunId" UUID NOT NULL,
    "pinnedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "report_generation_run_metric_pins_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."report_generation_run_dashboard_pins" (
    "id" UUID NOT NULL,
    "reportGenerationRunId" UUID NOT NULL,
    "reportingDashboardIndicatorId" UUID NOT NULL,
    "pinnedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "report_generation_run_dashboard_pins_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."report_generation_run_snapshot_pins" (
    "id" UUID NOT NULL,
    "reportGenerationRunId" UUID NOT NULL,
    "reportingDashboardSnapshotId" UUID NOT NULL,
    "pinnedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "report_generation_run_snapshot_pins_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."report_generation_run_claim_pins" (
    "id" UUID NOT NULL,
    "reportGenerationRunId" UUID NOT NULL,
    "institutionalMetricClaimId" UUID NOT NULL,
    "pinnedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "report_generation_run_claim_pins_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."report_generation_run_evidence_pins" (
    "id" UUID NOT NULL,
    "reportGenerationRunId" UUID NOT NULL,
    "evidencePacketVersionId" UUID NOT NULL,
    "pinnedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "report_generation_run_evidence_pins_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."report_claims" (
    "id" UUID NOT NULL,
    "reportGenerationRunId" UUID NOT NULL,
    "reportSectionId" UUID,
    "institutionalMetricClaimId" UUID NOT NULL,
    "generatedSentence" TEXT NOT NULL,
    "claimText" TEXT NOT NULL,
    "status" "public"."ReportClaimStatus" NOT NULL DEFAULT 'GENERATED',
    "outcomeClassification" "public"."ReportOutcomeClassification" NOT NULL,
    "isOfficialClaim" BOOLEAN NOT NULL DEFAULT false,
    "causationDeclared" BOOLEAN NOT NULL DEFAULT false,
    "representsGovernmentStatistic" BOOLEAN NOT NULL DEFAULT false,
    "governmentStatisticConfirmed" BOOLEAN NOT NULL DEFAULT false,
    "redactedSentence" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "report_claims_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."report_evidence_manifests" (
    "id" UUID NOT NULL,
    "reportGenerationRunId" UUID NOT NULL,
    "manifestContent" JSONB NOT NULL DEFAULT '{}',
    "manifestHash" TEXT NOT NULL,
    "evidenceRecordIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "institutionalMetricClaimIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "report_evidence_manifests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."report_reviews" (
    "id" UUID NOT NULL,
    "reportGenerationRunId" UUID NOT NULL,
    "reviewerIdentityId" UUID NOT NULL,
    "reviewType" "public"."ReportReviewType" NOT NULL,
    "status" "public"."ReportReviewStatus" NOT NULL DEFAULT 'PENDING',
    "findings" TEXT,
    "isAiProposed" BOOLEAN NOT NULL DEFAULT false,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "report_reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."report_approvals" (
    "id" UUID NOT NULL,
    "reportGenerationRunId" UUID NOT NULL,
    "approverIdentityId" UUID NOT NULL,
    "approverOfficeholderId" UUID,
    "authorityEvaluationRecordId" UUID,
    "status" "public"."ReportApprovalStatus" NOT NULL DEFAULT 'PENDING',
    "isAiActor" BOOLEAN NOT NULL DEFAULT false,
    "approvedAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "report_approvals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."report_publications" (
    "id" UUID NOT NULL,
    "reportGenerationRunId" UUID NOT NULL,
    "publisherIdentityId" UUID NOT NULL,
    "publisherOfficeholderId" UUID,
    "authorityEvaluationRecordId" UUID,
    "classification" "public"."ReportClassification" NOT NULL,
    "publishedAt" TIMESTAMP(3),
    "publicationReference" TEXT,
    "frozenSnapshotHash" TEXT NOT NULL,
    "frozenContent" JSONB NOT NULL DEFAULT '{}',
    "status" "public"."ReportPublicationStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "report_publications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."report_corrections" (
    "id" UUID NOT NULL,
    "reportPublicationId" UUID NOT NULL,
    "originalContent" JSONB NOT NULL,
    "correctedContent" JSONB NOT NULL,
    "reason" TEXT NOT NULL,
    "authorityEvaluationRecordId" UUID,
    "correctedByIdentityId" UUID NOT NULL,
    "correctedByOfficeholderId" UUID,
    "correctedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notificationSent" BOOLEAN NOT NULL DEFAULT false,
    "notificationSentAt" TIMESTAMP(3),
    "status" "public"."ReportCorrectionStatus" NOT NULL DEFAULT 'REQUESTED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "report_corrections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."report_correction_affected_claims" (
    "id" UUID NOT NULL,
    "reportCorrectionId" UUID NOT NULL,
    "reportClaimId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "report_correction_affected_claims_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."evidence_dashboard_decision_traces" (
    "id" UUID NOT NULL,
    "traceNumber" TEXT NOT NULL,
    "sourceRecordType" TEXT NOT NULL,
    "sourceRecordId" UUID NOT NULL,
    "evidenceRecordId" UUID,
    "metricCalculationRunId" UUID,
    "institutionalMetricClaimId" UUID,
    "reportingDashboardIndicatorId" UUID,
    "reportGenerationRunId" UUID,
    "reportClaimId" UUID,
    "reportReviewId" UUID,
    "governmentDecisionId" UUID,
    "traceSnapshot" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "evidence_dashboard_decision_traces_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."report_claim_revalidation_records" (
    "id" UUID NOT NULL,
    "reportClaimId" UUID NOT NULL,
    "trigger" "public"."ReportRevalidationTrigger" NOT NULL,
    "reason" TEXT NOT NULL,
    "priorRevalidationState" "public"."InstitutionalMetricClaimRevalidationState" NOT NULL,
    "newRevalidationState" "public"."InstitutionalMetricClaimRevalidationState" NOT NULL,
    "recordedByIdentityId" UUID NOT NULL,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "report_claim_revalidation_records_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "metric_definitions_institutionId_idx" ON "public"."metric_definitions"("institutionId");

-- CreateIndex
CREATE INDEX "metric_definitions_departmentId_idx" ON "public"."metric_definitions"("departmentId");

-- CreateIndex
CREATE INDEX "metric_definitions_status_idx" ON "public"."metric_definitions"("status");

-- CreateIndex
CREATE UNIQUE INDEX "metric_definitions_institutionId_code_key" ON "public"."metric_definitions"("institutionId", "code");

-- CreateIndex
CREATE INDEX "metric_calculation_runs_metricDefinitionId_idx" ON "public"."metric_calculation_runs"("metricDefinitionId");

-- CreateIndex
CREATE INDEX "metric_calculation_runs_calculatedByIdentityId_idx" ON "public"."metric_calculation_runs"("calculatedByIdentityId");

-- CreateIndex
CREATE INDEX "metric_calculation_runs_dataCutoffAt_idx" ON "public"."metric_calculation_runs"("dataCutoffAt");

-- CreateIndex
CREATE INDEX "metric_calculation_runs_status_idx" ON "public"."metric_calculation_runs"("status");

-- CreateIndex
CREATE UNIQUE INDEX "metric_calculation_runs_metricDefinitionId_runNumber_key" ON "public"."metric_calculation_runs"("metricDefinitionId", "runNumber");

-- CreateIndex
CREATE UNIQUE INDEX "institutional_metric_claims_claimNumber_key" ON "public"."institutional_metric_claims"("claimNumber");

-- CreateIndex
CREATE INDEX "institutional_metric_claims_metricCalculationRunId_idx" ON "public"."institutional_metric_claims"("metricCalculationRunId");

-- CreateIndex
CREATE INDEX "institutional_metric_claims_status_idx" ON "public"."institutional_metric_claims"("status");

-- CreateIndex
CREATE INDEX "institutional_metric_claims_revalidationState_idx" ON "public"."institutional_metric_claims"("revalidationState");

-- CreateIndex
CREATE INDEX "institutional_metric_claims_validUntil_idx" ON "public"."institutional_metric_claims"("validUntil");

-- CreateIndex
CREATE INDEX "reporting_dashboard_indicators_metricCalculationRunId_idx" ON "public"."reporting_dashboard_indicators"("metricCalculationRunId");

-- CreateIndex
CREATE INDEX "reporting_dashboard_indicators_institutionId_idx" ON "public"."reporting_dashboard_indicators"("institutionId");

-- CreateIndex
CREATE INDEX "reporting_dashboard_indicators_departmentId_idx" ON "public"."reporting_dashboard_indicators"("departmentId");

-- CreateIndex
CREATE INDEX "reporting_dashboard_indicators_indicatorCode_idx" ON "public"."reporting_dashboard_indicators"("indicatorCode");

-- CreateIndex
CREATE INDEX "reporting_dashboard_indicators_status_idx" ON "public"."reporting_dashboard_indicators"("status");

-- CreateIndex
CREATE UNIQUE INDEX "reporting_dashboard_snapshots_snapshotNumber_key" ON "public"."reporting_dashboard_snapshots"("snapshotNumber");

-- CreateIndex
CREATE INDEX "reporting_dashboard_snapshots_institutionId_idx" ON "public"."reporting_dashboard_snapshots"("institutionId");

-- CreateIndex
CREATE INDEX "reporting_dashboard_snapshots_departmentId_idx" ON "public"."reporting_dashboard_snapshots"("departmentId");

-- CreateIndex
CREATE INDEX "reporting_dashboard_snapshots_capturedByIdentityId_idx" ON "public"."reporting_dashboard_snapshots"("capturedByIdentityId");

-- CreateIndex
CREATE INDEX "reporting_dashboard_snapshots_dataCutoffAt_idx" ON "public"."reporting_dashboard_snapshots"("dataCutoffAt");

-- CreateIndex
CREATE INDEX "report_definitions_institutionId_idx" ON "public"."report_definitions"("institutionId");

-- CreateIndex
CREATE INDEX "report_definitions_departmentId_idx" ON "public"."report_definitions"("departmentId");

-- CreateIndex
CREATE INDEX "report_definitions_reportType_idx" ON "public"."report_definitions"("reportType");

-- CreateIndex
CREATE INDEX "report_definitions_status_idx" ON "public"."report_definitions"("status");

-- CreateIndex
CREATE UNIQUE INDEX "report_definitions_institutionId_code_key" ON "public"."report_definitions"("institutionId", "code");

-- CreateIndex
CREATE INDEX "report_definition_versions_reportDefinitionId_idx" ON "public"."report_definition_versions"("reportDefinitionId");

-- CreateIndex
CREATE INDEX "report_definition_versions_status_idx" ON "public"."report_definition_versions"("status");

-- CreateIndex
CREATE UNIQUE INDEX "report_definition_versions_reportDefinitionId_versionNumber_key" ON "public"."report_definition_versions"("reportDefinitionId", "versionNumber");

-- CreateIndex
CREATE INDEX "report_sections_reportDefinitionVersionId_idx" ON "public"."report_sections"("reportDefinitionVersionId");

-- CreateIndex
CREATE UNIQUE INDEX "report_sections_reportDefinitionVersionId_sectionKey_key" ON "public"."report_sections"("reportDefinitionVersionId", "sectionKey");

-- CreateIndex
CREATE UNIQUE INDEX "report_generation_runs_runNumber_key" ON "public"."report_generation_runs"("runNumber");

-- CreateIndex
CREATE INDEX "report_generation_runs_reportDefinitionVersionId_idx" ON "public"."report_generation_runs"("reportDefinitionVersionId");

-- CreateIndex
CREATE INDEX "report_generation_runs_initiatedByIdentityId_idx" ON "public"."report_generation_runs"("initiatedByIdentityId");

-- CreateIndex
CREATE INDEX "report_generation_runs_dataCutoffAt_idx" ON "public"."report_generation_runs"("dataCutoffAt");

-- CreateIndex
CREATE INDEX "report_generation_runs_status_idx" ON "public"."report_generation_runs"("status");

-- CreateIndex
CREATE INDEX "report_generation_run_metric_pins_reportGenerationRunId_idx" ON "public"."report_generation_run_metric_pins"("reportGenerationRunId");

-- CreateIndex
CREATE INDEX "report_generation_run_metric_pins_metricCalculationRunId_idx" ON "public"."report_generation_run_metric_pins"("metricCalculationRunId");

-- CreateIndex
CREATE UNIQUE INDEX "report_generation_run_metric_pins_reportGenerationRunId_met_key" ON "public"."report_generation_run_metric_pins"("reportGenerationRunId", "metricCalculationRunId");

-- CreateIndex
CREATE INDEX "report_generation_run_dashboard_pins_reportGenerationRunId_idx" ON "public"."report_generation_run_dashboard_pins"("reportGenerationRunId");

-- CreateIndex
CREATE INDEX "report_generation_run_dashboard_pins_reportingDashboardIndicatorId_idx" ON "public"."report_generation_run_dashboard_pins"("reportingDashboardIndicatorId");

-- CreateIndex
CREATE UNIQUE INDEX "report_generation_run_dashboard_pins_reportGenerationRunId__key" ON "public"."report_generation_run_dashboard_pins"("reportGenerationRunId", "reportingDashboardIndicatorId");

-- CreateIndex
CREATE INDEX "report_generation_run_snapshot_pins_reportGenerationRunId_idx" ON "public"."report_generation_run_snapshot_pins"("reportGenerationRunId");

-- CreateIndex
CREATE INDEX "report_generation_run_snapshot_pins_reportingDashboardSnapshotId_idx" ON "public"."report_generation_run_snapshot_pins"("reportingDashboardSnapshotId");

-- CreateIndex
CREATE UNIQUE INDEX "report_generation_run_snapshot_pins_reportGenerationRunId_d_key" ON "public"."report_generation_run_snapshot_pins"("reportGenerationRunId", "reportingDashboardSnapshotId");

-- CreateIndex
CREATE INDEX "report_generation_run_claim_pins_reportGenerationRunId_idx" ON "public"."report_generation_run_claim_pins"("reportGenerationRunId");

-- CreateIndex
CREATE INDEX "report_generation_run_claim_pins_institutionalMetricClaimId_idx" ON "public"."report_generation_run_claim_pins"("institutionalMetricClaimId");

-- CreateIndex
CREATE UNIQUE INDEX "report_generation_run_claim_pins_reportGenerationRunId_perf_key" ON "public"."report_generation_run_claim_pins"("reportGenerationRunId", "institutionalMetricClaimId");

-- CreateIndex
CREATE INDEX "report_generation_run_evidence_pins_reportGenerationRunId_idx" ON "public"."report_generation_run_evidence_pins"("reportGenerationRunId");

-- CreateIndex
CREATE INDEX "report_generation_run_evidence_pins_evidencePacketVersionId_idx" ON "public"."report_generation_run_evidence_pins"("evidencePacketVersionId");

-- CreateIndex
CREATE UNIQUE INDEX "report_generation_run_evidence_pins_reportGenerationRunId_e_key" ON "public"."report_generation_run_evidence_pins"("reportGenerationRunId", "evidencePacketVersionId");

-- CreateIndex
CREATE INDEX "report_claims_reportGenerationRunId_idx" ON "public"."report_claims"("reportGenerationRunId");

-- CreateIndex
CREATE INDEX "report_claims_reportSectionId_idx" ON "public"."report_claims"("reportSectionId");

-- CreateIndex
CREATE INDEX "report_claims_institutionalMetricClaimId_idx" ON "public"."report_claims"("institutionalMetricClaimId");

-- CreateIndex
CREATE INDEX "report_claims_status_idx" ON "public"."report_claims"("status");

-- CreateIndex
CREATE INDEX "report_evidence_manifests_reportGenerationRunId_idx" ON "public"."report_evidence_manifests"("reportGenerationRunId");

-- CreateIndex
CREATE INDEX "report_evidence_manifests_manifestHash_idx" ON "public"."report_evidence_manifests"("manifestHash");

-- CreateIndex
CREATE INDEX "report_reviews_reportGenerationRunId_idx" ON "public"."report_reviews"("reportGenerationRunId");

-- CreateIndex
CREATE INDEX "report_reviews_reviewerIdentityId_idx" ON "public"."report_reviews"("reviewerIdentityId");

-- CreateIndex
CREATE INDEX "report_reviews_reviewType_idx" ON "public"."report_reviews"("reviewType");

-- CreateIndex
CREATE INDEX "report_reviews_status_idx" ON "public"."report_reviews"("status");

-- CreateIndex
CREATE INDEX "report_approvals_reportGenerationRunId_idx" ON "public"."report_approvals"("reportGenerationRunId");

-- CreateIndex
CREATE INDEX "report_approvals_approverIdentityId_idx" ON "public"."report_approvals"("approverIdentityId");

-- CreateIndex
CREATE INDEX "report_approvals_status_idx" ON "public"."report_approvals"("status");

-- CreateIndex
CREATE UNIQUE INDEX "report_publications_publicationReference_key" ON "public"."report_publications"("publicationReference");

-- CreateIndex
CREATE INDEX "report_publications_reportGenerationRunId_idx" ON "public"."report_publications"("reportGenerationRunId");

-- CreateIndex
CREATE INDEX "report_publications_publisherIdentityId_idx" ON "public"."report_publications"("publisherIdentityId");

-- CreateIndex
CREATE INDEX "report_publications_status_idx" ON "public"."report_publications"("status");

-- CreateIndex
CREATE INDEX "report_corrections_reportPublicationId_idx" ON "public"."report_corrections"("reportPublicationId");

-- CreateIndex
CREATE INDEX "report_corrections_correctedByIdentityId_idx" ON "public"."report_corrections"("correctedByIdentityId");

-- CreateIndex
CREATE INDEX "report_corrections_status_idx" ON "public"."report_corrections"("status");

-- CreateIndex
CREATE INDEX "report_correction_affected_claims_reportCorrectionId_idx" ON "public"."report_correction_affected_claims"("reportCorrectionId");

-- CreateIndex
CREATE INDEX "report_correction_affected_claims_reportClaimId_idx" ON "public"."report_correction_affected_claims"("reportClaimId");

-- CreateIndex
CREATE UNIQUE INDEX "report_correction_affected_claims_reportCorrectionId_report_key" ON "public"."report_correction_affected_claims"("reportCorrectionId", "reportClaimId");

-- CreateIndex
CREATE UNIQUE INDEX "evidence_dashboard_decision_traces_traceNumber_key" ON "public"."evidence_dashboard_decision_traces"("traceNumber");

-- CreateIndex
CREATE INDEX "evidence_dashboard_decision_traces_sourceRecordType_sourceR_idx" ON "public"."evidence_dashboard_decision_traces"("sourceRecordType", "sourceRecordId");

-- CreateIndex
CREATE INDEX "evidence_dashboard_decision_traces_evidenceRecordId_idx" ON "public"."evidence_dashboard_decision_traces"("evidenceRecordId");

-- CreateIndex
CREATE INDEX "evidence_dashboard_decision_traces_metricCalculationRunId_idx" ON "public"."evidence_dashboard_decision_traces"("metricCalculationRunId");

-- CreateIndex
CREATE INDEX "evidence_dashboard_decision_traces_institutionalMetricClaimId_idx" ON "public"."evidence_dashboard_decision_traces"("institutionalMetricClaimId");

-- CreateIndex
CREATE INDEX "evidence_dashboard_decision_traces_reportingDashboardIndicatorId_idx" ON "public"."evidence_dashboard_decision_traces"("reportingDashboardIndicatorId");

-- CreateIndex
CREATE INDEX "evidence_dashboard_decision_traces_reportGenerationRunId_idx" ON "public"."evidence_dashboard_decision_traces"("reportGenerationRunId");

-- CreateIndex
CREATE INDEX "evidence_dashboard_decision_traces_reportClaimId_idx" ON "public"."evidence_dashboard_decision_traces"("reportClaimId");

-- CreateIndex
CREATE INDEX "report_claim_revalidation_records_reportClaimId_idx" ON "public"."report_claim_revalidation_records"("reportClaimId");

-- CreateIndex
CREATE INDEX "report_claim_revalidation_records_recordedByIdentityId_idx" ON "public"."report_claim_revalidation_records"("recordedByIdentityId");

-- AddForeignKey
ALTER TABLE "public"."metric_definitions" ADD CONSTRAINT "metric_definitions_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "public"."institutions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."metric_definitions" ADD CONSTRAINT "metric_definitions_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "public"."departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."metric_calculation_runs" ADD CONSTRAINT "metric_calculation_runs_metricDefinitionId_fkey" FOREIGN KEY ("metricDefinitionId") REFERENCES "public"."metric_definitions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."metric_calculation_runs" ADD CONSTRAINT "metric_calculation_runs_calculatedByIdentityId_fkey" FOREIGN KEY ("calculatedByIdentityId") REFERENCES "public"."identities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."institutional_metric_claims" ADD CONSTRAINT "institutional_metric_claims_metricCalculationRunId_fkey" FOREIGN KEY ("metricCalculationRunId") REFERENCES "public"."metric_calculation_runs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."institutional_metric_claims" ADD CONSTRAINT "institutional_metric_claims_approvedByOfficeholderId_fkey" FOREIGN KEY ("approvedByOfficeholderId") REFERENCES "public"."officeholders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."reporting_dashboard_indicators" ADD CONSTRAINT "reporting_dashboard_indicators_metricCalculationRunId_fkey" FOREIGN KEY ("metricCalculationRunId") REFERENCES "public"."metric_calculation_runs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."reporting_dashboard_indicators" ADD CONSTRAINT "reporting_dashboard_indicators_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "public"."institutions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."reporting_dashboard_indicators" ADD CONSTRAINT "reporting_dashboard_indicators_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "public"."departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."reporting_dashboard_snapshots" ADD CONSTRAINT "reporting_dashboard_snapshots_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "public"."institutions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."reporting_dashboard_snapshots" ADD CONSTRAINT "reporting_dashboard_snapshots_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "public"."departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."reporting_dashboard_snapshots" ADD CONSTRAINT "reporting_dashboard_snapshots_capturedByIdentityId_fkey" FOREIGN KEY ("capturedByIdentityId") REFERENCES "public"."identities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."report_definitions" ADD CONSTRAINT "report_definitions_ownerIdentityId_fkey" FOREIGN KEY ("ownerIdentityId") REFERENCES "public"."identities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."report_definitions" ADD CONSTRAINT "report_definitions_ownerOfficeholderId_fkey" FOREIGN KEY ("ownerOfficeholderId") REFERENCES "public"."officeholders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."report_definitions" ADD CONSTRAINT "report_definitions_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "public"."institutions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."report_definitions" ADD CONSTRAINT "report_definitions_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "public"."departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."report_definition_versions" ADD CONSTRAINT "report_definition_versions_reportDefinitionId_fkey" FOREIGN KEY ("reportDefinitionId") REFERENCES "public"."report_definitions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."report_definition_versions" ADD CONSTRAINT "report_definition_versions_ownerIdentityId_fkey" FOREIGN KEY ("ownerIdentityId") REFERENCES "public"."identities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."report_definition_versions" ADD CONSTRAINT "report_definition_versions_ownerOfficeholderId_fkey" FOREIGN KEY ("ownerOfficeholderId") REFERENCES "public"."officeholders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."report_definition_versions" ADD CONSTRAINT "report_definition_versions_publicationAuthorityFunctionId_fkey" FOREIGN KEY ("publicationAuthorityFunctionId") REFERENCES "public"."function_authority_records"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."report_sections" ADD CONSTRAINT "report_sections_reportDefinitionVersionId_fkey" FOREIGN KEY ("reportDefinitionVersionId") REFERENCES "public"."report_definition_versions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."report_generation_runs" ADD CONSTRAINT "report_generation_runs_reportDefinitionVersionId_fkey" FOREIGN KEY ("reportDefinitionVersionId") REFERENCES "public"."report_definition_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."report_generation_runs" ADD CONSTRAINT "report_generation_runs_initiatedByIdentityId_fkey" FOREIGN KEY ("initiatedByIdentityId") REFERENCES "public"."identities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."report_generation_run_metric_pins" ADD CONSTRAINT "report_generation_run_metric_pins_reportGenerationRunId_fkey" FOREIGN KEY ("reportGenerationRunId") REFERENCES "public"."report_generation_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."report_generation_run_metric_pins" ADD CONSTRAINT "report_generation_run_metric_pins_metricCalculationRunId_fkey" FOREIGN KEY ("metricCalculationRunId") REFERENCES "public"."metric_calculation_runs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."report_generation_run_dashboard_pins" ADD CONSTRAINT "report_generation_run_dashboard_pins_reportGenerationRunId_fkey" FOREIGN KEY ("reportGenerationRunId") REFERENCES "public"."report_generation_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."report_generation_run_dashboard_pins" ADD CONSTRAINT "report_generation_run_dashboard_pins_reportingDashboardIndicatorId_fkey" FOREIGN KEY ("reportingDashboardIndicatorId") REFERENCES "public"."reporting_dashboard_indicators"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."report_generation_run_snapshot_pins" ADD CONSTRAINT "report_generation_run_snapshot_pins_reportGenerationRunId_fkey" FOREIGN KEY ("reportGenerationRunId") REFERENCES "public"."report_generation_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."report_generation_run_snapshot_pins" ADD CONSTRAINT "report_generation_run_snapshot_pins_reportingDashboardSnapshotId_fkey" FOREIGN KEY ("reportingDashboardSnapshotId") REFERENCES "public"."reporting_dashboard_snapshots"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."report_generation_run_claim_pins" ADD CONSTRAINT "report_generation_run_claim_pins_reportGenerationRunId_fkey" FOREIGN KEY ("reportGenerationRunId") REFERENCES "public"."report_generation_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."report_generation_run_claim_pins" ADD CONSTRAINT "report_generation_run_claim_pins_institutionalMetricClaimId_fkey" FOREIGN KEY ("institutionalMetricClaimId") REFERENCES "public"."institutional_metric_claims"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."report_generation_run_evidence_pins" ADD CONSTRAINT "report_generation_run_evidence_pins_reportGenerationRunId_fkey" FOREIGN KEY ("reportGenerationRunId") REFERENCES "public"."report_generation_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."report_generation_run_evidence_pins" ADD CONSTRAINT "report_generation_run_evidence_pins_evidencePacketVersionI_fkey" FOREIGN KEY ("evidencePacketVersionId") REFERENCES "public"."evidence_packet_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."report_claims" ADD CONSTRAINT "report_claims_reportGenerationRunId_fkey" FOREIGN KEY ("reportGenerationRunId") REFERENCES "public"."report_generation_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."report_claims" ADD CONSTRAINT "report_claims_reportSectionId_fkey" FOREIGN KEY ("reportSectionId") REFERENCES "public"."report_sections"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."report_claims" ADD CONSTRAINT "report_claims_institutionalMetricClaimId_fkey" FOREIGN KEY ("institutionalMetricClaimId") REFERENCES "public"."institutional_metric_claims"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."report_evidence_manifests" ADD CONSTRAINT "report_evidence_manifests_reportGenerationRunId_fkey" FOREIGN KEY ("reportGenerationRunId") REFERENCES "public"."report_generation_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."report_reviews" ADD CONSTRAINT "report_reviews_reportGenerationRunId_fkey" FOREIGN KEY ("reportGenerationRunId") REFERENCES "public"."report_generation_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."report_reviews" ADD CONSTRAINT "report_reviews_reviewerIdentityId_fkey" FOREIGN KEY ("reviewerIdentityId") REFERENCES "public"."identities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."report_approvals" ADD CONSTRAINT "report_approvals_reportGenerationRunId_fkey" FOREIGN KEY ("reportGenerationRunId") REFERENCES "public"."report_generation_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."report_approvals" ADD CONSTRAINT "report_approvals_approverIdentityId_fkey" FOREIGN KEY ("approverIdentityId") REFERENCES "public"."identities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."report_approvals" ADD CONSTRAINT "report_approvals_approverOfficeholderId_fkey" FOREIGN KEY ("approverOfficeholderId") REFERENCES "public"."officeholders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."report_approvals" ADD CONSTRAINT "report_approvals_authorityEvaluationRecordId_fkey" FOREIGN KEY ("authorityEvaluationRecordId") REFERENCES "public"."authority_evaluation_records"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."report_publications" ADD CONSTRAINT "report_publications_reportGenerationRunId_fkey" FOREIGN KEY ("reportGenerationRunId") REFERENCES "public"."report_generation_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."report_publications" ADD CONSTRAINT "report_publications_publisherIdentityId_fkey" FOREIGN KEY ("publisherIdentityId") REFERENCES "public"."identities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."report_publications" ADD CONSTRAINT "report_publications_publisherOfficeholderId_fkey" FOREIGN KEY ("publisherOfficeholderId") REFERENCES "public"."officeholders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."report_publications" ADD CONSTRAINT "report_publications_authorityEvaluationRecordId_fkey" FOREIGN KEY ("authorityEvaluationRecordId") REFERENCES "public"."authority_evaluation_records"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."report_corrections" ADD CONSTRAINT "report_corrections_reportPublicationId_fkey" FOREIGN KEY ("reportPublicationId") REFERENCES "public"."report_publications"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."report_corrections" ADD CONSTRAINT "report_corrections_authorityEvaluationRecordId_fkey" FOREIGN KEY ("authorityEvaluationRecordId") REFERENCES "public"."authority_evaluation_records"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."report_corrections" ADD CONSTRAINT "report_corrections_correctedByIdentityId_fkey" FOREIGN KEY ("correctedByIdentityId") REFERENCES "public"."identities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."report_corrections" ADD CONSTRAINT "report_corrections_correctedByOfficeholderId_fkey" FOREIGN KEY ("correctedByOfficeholderId") REFERENCES "public"."officeholders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."report_correction_affected_claims" ADD CONSTRAINT "report_correction_affected_claims_reportCorrectionId_fkey" FOREIGN KEY ("reportCorrectionId") REFERENCES "public"."report_corrections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."report_correction_affected_claims" ADD CONSTRAINT "report_correction_affected_claims_reportClaimId_fkey" FOREIGN KEY ("reportClaimId") REFERENCES "public"."report_claims"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."evidence_dashboard_decision_traces" ADD CONSTRAINT "evidence_dashboard_decision_traces_evidenceRecordId_fkey" FOREIGN KEY ("evidenceRecordId") REFERENCES "public"."evidence_records"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."evidence_dashboard_decision_traces" ADD CONSTRAINT "evidence_dashboard_decision_traces_metricCalculationRunId_fkey" FOREIGN KEY ("metricCalculationRunId") REFERENCES "public"."metric_calculation_runs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."evidence_dashboard_decision_traces" ADD CONSTRAINT "evidence_dashboard_decision_traces_institutionalMetricClaimId_fkey" FOREIGN KEY ("institutionalMetricClaimId") REFERENCES "public"."institutional_metric_claims"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."evidence_dashboard_decision_traces" ADD CONSTRAINT "evidence_dashboard_decision_traces_reportingDashboardIndicatorId_fkey" FOREIGN KEY ("reportingDashboardIndicatorId") REFERENCES "public"."reporting_dashboard_indicators"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."evidence_dashboard_decision_traces" ADD CONSTRAINT "evidence_dashboard_decision_traces_reportGenerationRunId_fkey" FOREIGN KEY ("reportGenerationRunId") REFERENCES "public"."report_generation_runs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."evidence_dashboard_decision_traces" ADD CONSTRAINT "evidence_dashboard_decision_traces_reportClaimId_fkey" FOREIGN KEY ("reportClaimId") REFERENCES "public"."report_claims"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."evidence_dashboard_decision_traces" ADD CONSTRAINT "evidence_dashboard_decision_traces_reportReviewId_fkey" FOREIGN KEY ("reportReviewId") REFERENCES "public"."report_reviews"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."evidence_dashboard_decision_traces" ADD CONSTRAINT "evidence_dashboard_decision_traces_governmentDecisionId_fkey" FOREIGN KEY ("governmentDecisionId") REFERENCES "public"."government_decisions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."report_claim_revalidation_records" ADD CONSTRAINT "report_claim_revalidation_records_recordedByIdentityId_fkey" FOREIGN KEY ("recordedByIdentityId") REFERENCES "public"."identities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

