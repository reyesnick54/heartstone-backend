-- CreateEnum
CREATE TYPE "MetricDefinitionStatus" AS ENUM ('DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'ACTIVE', 'SUPERSEDED', 'RETIRED');

-- CreateEnum
CREATE TYPE "MetricCalculationRunStatus" AS ENUM ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED', 'SAFE_HALTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "MetricDataQualityStatus" AS ENUM ('NOT_ASSESSED', 'ACCEPTABLE', 'DEGRADED', 'UNRELIABLE', 'REJECTED');

-- CreateEnum
CREATE TYPE "PerformanceClaimStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'VERIFIED', 'REJECTED', 'SUPERSEDED', 'WITHDRAWN');

-- CreateEnum
CREATE TYPE "PerformanceClaimReviewOutcome" AS ENUM ('CONFIRMED', 'PARTIALLY_CONFIRMED', 'REJECTED', 'REQUIRES_REVALIDATION');

-- CreateEnum
CREATE TYPE "DashboardDefinitionStatus" AS ENUM ('DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'ACTIVE', 'SUPERSEDED', 'RETIRED');

-- CreateEnum
CREATE TYPE "DashboardIndicatorStatus" AS ENUM ('CURRENT', 'STALE', 'UNAVAILABLE', 'SAFE_HALTED');

-- CreateEnum
CREATE TYPE "StrategicProjectMilestoneStatus" AS ENUM ('REPORTED', 'VERIFIED', 'COMPLETED');

-- CreateEnum
CREATE TYPE "AIModelStatus" AS ENUM ('DRAFT', 'EVALUATION', 'APPROVED', 'ACTIVE', 'SUSPENDED', 'RETIRED');

-- CreateEnum
CREATE TYPE "AIUseCaseStatus" AS ENUM ('DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'ACTIVE', 'SUSPENDED', 'RETIRED');

-- CreateEnum
CREATE TYPE "AIAgentStatus" AS ENUM ('DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'ACTIVE', 'SUSPENDED', 'RETIRED');

-- CreateEnum
CREATE TYPE "AIExecutionStatus" AS ENUM ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED', 'SAFE_HALTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "AISuspensionReason" AS ENUM ('SAFETY_INCIDENT', 'EVALUATION_FAILURE', 'DATA_ENTITLEMENT_VIOLATION', 'POLICY_CHANGE', 'HUMAN_OVERSIGHT_REQUIRED', 'OPERATIONAL_RISK', 'OTHER');

-- CreateEnum
CREATE TYPE "AIHumanDispositionType" AS ENUM ('ACCEPTED', 'ACCEPTED_WITH_MODIFICATION', 'REJECTED', 'ESCALATED', 'DEFERRED', 'NO_ACTION_REQUIRED');

-- CreateEnum
CREATE TYPE "AnalysisRequestStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'SAFE_HALTED');

-- CreateEnum
CREATE TYPE "AnalysisRunStatus" AS ENUM ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED', 'SAFE_HALTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "MonitoringAlertStatus" AS ENUM ('OPEN', 'VERIFIED', 'CLOSED');

-- CreateEnum
CREATE TYPE "AlertVerificationOutcome" AS ENUM ('CONFIRMED', 'PARTIALLY_CONFIRMED', 'NOT_CONFIRMED', 'INCONCLUSIVE', 'REQUIRES_FURTHER_MONITORING');

-- CreateEnum
CREATE TYPE "RiskAssessmentStatus" AS ENUM ('DRAFT', 'IN_PROGRESS', 'COMPLETED', 'SUPERSEDED', 'SAFE_HALTED');

-- CreateEnum
CREATE TYPE "DigitalTwinStatus" AS ENUM ('ACTIVE', 'STALE', 'SAFE_HALTED');

-- CreateEnum
CREATE TYPE "SimulationRunStatus" AS ENUM ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED', 'SAFE_HALTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "SimulationOutputType" AS ENUM ('PROJECTION', 'SCENARIO_COMPARISON', 'SENSITIVITY_ANALYSIS', 'RISK_INDICATOR', 'RECOMMENDATION', 'DIAGNOSTIC');

-- CreateEnum
CREATE TYPE "ReportDefinitionStatus" AS ENUM ('DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'ACTIVE', 'SUPERSEDED', 'RETIRED');

-- CreateEnum
CREATE TYPE "ReportGenerationRunStatus" AS ENUM ('PENDING', 'GENERATING', 'COMPLETED', 'FAILED', 'SAFE_HALTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ReportClaimStatus" AS ENUM ('DRAFT', 'ASSERTED', 'UNDER_REVIEW', 'VERIFIED', 'REJECTED', 'SUPERSEDED');

-- CreateEnum
CREATE TYPE "ReportPublicationStatus" AS ENUM ('DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'PUBLISHED', 'WITHDRAWN', 'SUPERSEDED');

-- CreateEnum
CREATE TYPE "ProcessingTimeComponent" AS ENUM ('ABSEZ', 'APPLICANT', 'EXTERNAL_DEPENDENCY');

-- CreateTable
CREATE TABLE "performance_frameworks" (
    "id" UUID NOT NULL,
    "institutionId" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "effectiveFrom" TIMESTAMP(3),
    "effectiveUntil" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "performance_frameworks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "metric_definitions" (
    "id" UUID NOT NULL,
    "performanceFrameworkId" UUID NOT NULL,
    "institutionId" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "unit" TEXT,
    "status" "MetricDefinitionStatus" NOT NULL DEFAULT 'DRAFT',
    "currentVersionId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "metric_definitions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "metric_definition_versions" (
    "id" UUID NOT NULL,
    "metricDefinitionId" UUID NOT NULL,
    "versionNumber" INTEGER NOT NULL,
    "definitionConfig" JSONB NOT NULL DEFAULT '{}',
    "methodology" TEXT,
    "limitations" TEXT,
    "uncertaintyNotes" TEXT,
    "effectiveFrom" TIMESTAMP(3),
    "effectiveUntil" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "metric_definition_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "metric_baselines" (
    "id" UUID NOT NULL,
    "metricDefinitionId" UUID NOT NULL,
    "metricDefinitionVersionId" UUID NOT NULL,
    "institutionId" UUID NOT NULL,
    "baselineValue" DECIMAL(20,6) NOT NULL,
    "baselinePeriodStart" TIMESTAMP(3) NOT NULL,
    "baselinePeriodEnd" TIMESTAMP(3) NOT NULL,
    "methodology" TEXT,
    "uncertaintyNotes" TEXT,
    "sourceDataRefs" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "metric_baselines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "metric_calculation_runs" (
    "id" UUID NOT NULL,
    "metricDefinitionVersionId" UUID NOT NULL,
    "institutionId" UUID NOT NULL,
    "runReference" TEXT NOT NULL,
    "status" "MetricCalculationRunStatus" NOT NULL DEFAULT 'PENDING',
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "inputsSnapshot" JSONB NOT NULL DEFAULT '{}',
    "limitations" TEXT,
    "uncertaintyNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "metric_calculation_runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "metric_observations" (
    "id" UUID NOT NULL,
    "metricCalculationRunId" UUID,
    "metricDefinitionVersionId" UUID NOT NULL,
    "institutionId" UUID NOT NULL,
    "observedValue" DECIMAL(20,6) NOT NULL,
    "observedAt" TIMESTAMP(3) NOT NULL,
    "periodStart" TIMESTAMP(3),
    "periodEnd" TIMESTAMP(3),
    "uncertaintyNotes" TEXT,
    "sourceDataRefs" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "metric_observations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "metric_data_quality_assessments" (
    "id" UUID NOT NULL,
    "metricObservationId" UUID,
    "metricCalculationRunId" UUID,
    "institutionId" UUID NOT NULL,
    "status" "MetricDataQualityStatus" NOT NULL DEFAULT 'NOT_ASSESSED',
    "assessedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "assessedByIdentityId" UUID,
    "findings" TEXT,
    "limitations" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "metric_data_quality_assessments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "performance_claims" (
    "id" UUID NOT NULL,
    "institutionId" UUID NOT NULL,
    "metricDefinitionId" UUID,
    "metricObservationId" UUID,
    "evidencePacketId" UUID,
    "evidencePacketVersionId" UUID,
    "governmentDecisionId" UUID,
    "caseId" UUID,
    "claimReference" TEXT NOT NULL,
    "status" "PerformanceClaimStatus" NOT NULL DEFAULT 'DRAFT',
    "claimStatement" TEXT NOT NULL,
    "claimedValue" DECIMAL(20,6),
    "claimedAt" TIMESTAMP(3),
    "sourceDataRefs" JSONB NOT NULL DEFAULT '[]',
    "evidenceTraceabilityRefs" JSONB NOT NULL DEFAULT '[]',
    "underlyingRecordRefs" JSONB NOT NULL DEFAULT '[]',
    "methodologyVersion" TEXT,
    "limitations" TEXT,
    "uncertaintyNotes" TEXT,
    "createdByIdentityId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "performance_claims_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "performance_claim_reviews" (
    "id" UUID NOT NULL,
    "performanceClaimId" UUID NOT NULL,
    "reviewerIdentityId" UUID NOT NULL,
    "outcome" "PerformanceClaimReviewOutcome" NOT NULL,
    "reviewedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "findings" TEXT,
    "limitations" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "performance_claim_reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "performance_claim_revalidations" (
    "id" UUID NOT NULL,
    "performanceClaimId" UUID NOT NULL,
    "trigger" TEXT NOT NULL,
    "revalidatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revalidatedByIdentityId" UUID,
    "priorStatus" "PerformanceClaimStatus" NOT NULL,
    "newStatus" "PerformanceClaimStatus" NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "performance_claim_revalidations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dashboard_definitions" (
    "id" UUID NOT NULL,
    "institutionId" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" "DashboardDefinitionStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "dashboard_definitions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dashboard_versions" (
    "id" UUID NOT NULL,
    "dashboardDefinitionId" UUID NOT NULL,
    "versionNumber" INTEGER NOT NULL,
    "layoutConfig" JSONB NOT NULL DEFAULT '{}',
    "status" "DashboardDefinitionStatus" NOT NULL DEFAULT 'DRAFT',
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "dashboard_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dashboard_widget_definitions" (
    "id" UUID NOT NULL,
    "dashboardVersionId" UUID NOT NULL,
    "widgetType" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "config" JSONB NOT NULL DEFAULT '{}',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "dashboard_widget_definitions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dashboard_indicator_definitions" (
    "id" UUID NOT NULL,
    "dashboardVersionId" UUID NOT NULL,
    "metricDefinitionId" UUID,
    "indicatorCode" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "config" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "dashboard_indicator_definitions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dashboard_indicator_projections" (
    "id" UUID NOT NULL,
    "dashboardIndicatorDefinitionId" UUID NOT NULL,
    "institutionId" UUID NOT NULL,
    "status" "DashboardIndicatorStatus" NOT NULL DEFAULT 'CURRENT',
    "computedValue" DECIMAL(20,6),
    "displayValue" TEXT,
    "computedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sourceStaleAt" TIMESTAMP(3),
    "isStale" BOOLEAN NOT NULL DEFAULT false,
    "disclaimer" TEXT,
    "sourceDataRefs" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "dashboard_indicator_projections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dashboard_snapshots" (
    "id" UUID NOT NULL,
    "dashboardVersionId" UUID NOT NULL,
    "institutionId" UUID NOT NULL,
    "snapshotAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "snapshotData" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "dashboard_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dashboard_status_dictionary_entries" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "description" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isTerminal" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "dashboard_status_dictionary_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "strategic_project_profiles" (
    "id" UUID NOT NULL,
    "institutionId" UUID NOT NULL,
    "sponsorInstitutionId" UUID,
    "projectCode" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "strategic_project_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "strategic_project_milestones" (
    "id" UUID NOT NULL,
    "strategicProjectProfileId" UUID NOT NULL,
    "milestoneCode" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" "StrategicProjectMilestoneStatus" NOT NULL DEFAULT 'REPORTED',
    "reportedAt" TIMESTAMP(3),
    "verifiedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "strategic_project_milestones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "capital_evidence_records" (
    "id" UUID NOT NULL,
    "strategicProjectProfileId" UUID NOT NULL,
    "institutionId" UUID NOT NULL,
    "evidenceType" TEXT NOT NULL,
    "amount" DECIMAL(20,2),
    "currency" TEXT NOT NULL DEFAULT 'XCD',
    "periodStart" TIMESTAMP(3),
    "periodEnd" TIMESTAMP(3),
    "sourceDataRefs" JSONB NOT NULL DEFAULT '[]',
    "evidencePacketVersionId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "capital_evidence_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "employment_evidence_records" (
    "id" UUID NOT NULL,
    "strategicProjectProfileId" UUID NOT NULL,
    "institutionId" UUID NOT NULL,
    "jobsCreated" INTEGER,
    "jobsRetained" INTEGER,
    "reportingPeriodStart" TIMESTAMP(3),
    "reportingPeriodEnd" TIMESTAMP(3),
    "sourceDataRefs" JSONB NOT NULL DEFAULT '[]',
    "evidencePacketVersionId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "employment_evidence_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "infrastructure_delivery_records" (
    "id" UUID NOT NULL,
    "strategicProjectProfileId" UUID NOT NULL,
    "institutionId" UUID NOT NULL,
    "deliveryType" TEXT NOT NULL,
    "deliveryStatus" TEXT NOT NULL,
    "reportedCompletion" DECIMAL(5,2),
    "verifiedCompletion" DECIMAL(5,2),
    "sourceDataRefs" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "infrastructure_delivery_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_status_projections" (
    "id" UUID NOT NULL,
    "strategicProjectProfileId" UUID NOT NULL,
    "institutionId" UUID NOT NULL,
    "projectedStatus" TEXT NOT NULL,
    "computedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sourceStaleAt" TIMESTAMP(3),
    "isStale" BOOLEAN NOT NULL DEFAULT false,
    "disclaimer" TEXT,
    "sourceDataRefs" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "project_status_projections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_model_definitions" (
    "id" UUID NOT NULL,
    "institutionId" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "provider" TEXT,
    "status" "AIModelStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ai_model_definitions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_model_versions" (
    "id" UUID NOT NULL,
    "aiModelDefinitionId" UUID NOT NULL,
    "versionNumber" INTEGER NOT NULL,
    "modelIdentifier" TEXT NOT NULL,
    "limitations" TEXT,
    "uncertaintyNotes" TEXT,
    "capabilitySummary" TEXT,
    "trainingDataCutoff" TIMESTAMP(3),
    "status" "AIModelStatus" NOT NULL DEFAULT 'DRAFT',
    "effectiveFrom" TIMESTAMP(3),
    "effectiveUntil" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ai_model_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_use_cases" (
    "id" UUID NOT NULL,
    "institutionId" UUID NOT NULL,
    "aiModelDefinitionId" UUID,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" "AIUseCaseStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ai_use_cases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_use_case_versions" (
    "id" UUID NOT NULL,
    "aiUseCaseId" UUID NOT NULL,
    "versionNumber" INTEGER NOT NULL,
    "purpose" TEXT NOT NULL,
    "scope" TEXT,
    "limitations" TEXT,
    "uncertaintyNotes" TEXT,
    "humanOversightRequired" BOOLEAN NOT NULL DEFAULT true,
    "status" "AIUseCaseStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ai_use_case_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_agent_definitions" (
    "id" UUID NOT NULL,
    "institutionId" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" "AIAgentStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ai_agent_definitions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_agent_versions" (
    "id" UUID NOT NULL,
    "aiAgentDefinitionId" UUID NOT NULL,
    "versionNumber" INTEGER NOT NULL,
    "agentConfig" JSONB NOT NULL DEFAULT '{}',
    "toolsAllowed" JSONB NOT NULL DEFAULT '[]',
    "limitations" TEXT,
    "uncertaintyNotes" TEXT,
    "status" "AIAgentStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ai_agent_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_data_entitlements" (
    "id" UUID NOT NULL,
    "aiModelVersionId" UUID,
    "aiUseCaseVersionId" UUID,
    "institutionId" UUID,
    "identityId" UUID,
    "entitlementScope" TEXT NOT NULL,
    "dataDomain" TEXT NOT NULL,
    "effectiveFrom" TIMESTAMP(3),
    "effectiveUntil" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ai_data_entitlements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_tool_entitlements" (
    "id" UUID NOT NULL,
    "aiAgentVersionId" UUID NOT NULL,
    "institutionId" UUID,
    "toolCode" TEXT NOT NULL,
    "entitlementScope" TEXT NOT NULL,
    "effectiveFrom" TIMESTAMP(3),
    "effectiveUntil" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ai_tool_entitlements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_evaluations" (
    "id" UUID NOT NULL,
    "aiModelVersionId" UUID,
    "aiAgentVersionId" UUID,
    "evaluationType" TEXT NOT NULL,
    "score" DECIMAL(10,4),
    "findings" TEXT,
    "limitations" TEXT,
    "uncertaintyNotes" TEXT,
    "evaluatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "evaluatorIdentityId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ai_evaluations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_incidents" (
    "id" UUID NOT NULL,
    "institutionId" UUID NOT NULL,
    "aiExecutionRecordId" UUID,
    "aiModelVersionId" UUID,
    "aiAgentVersionId" UUID,
    "incidentType" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "reportedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ai_incidents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_suspension_records" (
    "id" UUID NOT NULL,
    "aiModelVersionId" UUID,
    "aiAgentVersionId" UUID,
    "aiUseCaseVersionId" UUID,
    "reason" "AISuspensionReason" NOT NULL,
    "suspendedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "suspendedByIdentityId" UUID,
    "liftedAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ai_suspension_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_execution_records" (
    "id" UUID NOT NULL,
    "institutionId" UUID NOT NULL,
    "executionReference" TEXT NOT NULL,
    "aiUseCaseVersionId" UUID,
    "aiAgentVersionId" UUID,
    "aiModelVersionId" UUID,
    "caseId" UUID,
    "status" "AIExecutionStatus" NOT NULL DEFAULT 'PENDING',
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "inputsSnapshot" JSONB NOT NULL DEFAULT '{}',
    "outputsSnapshot" JSONB NOT NULL DEFAULT '{}',
    "limitations" TEXT,
    "uncertaintyNotes" TEXT,
    "isRecommendatoryOnly" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ai_execution_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_human_dispositions" (
    "id" UUID NOT NULL,
    "aiExecutionRecordId" UUID NOT NULL,
    "dispositionType" "AIHumanDispositionType" NOT NULL,
    "disposedByIdentityId" UUID NOT NULL,
    "disposedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "rationale" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ai_human_dispositions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "analysis_requests" (
    "id" UUID NOT NULL,
    "institutionId" UUID NOT NULL,
    "caseId" UUID,
    "requestReference" TEXT NOT NULL,
    "requestType" TEXT NOT NULL,
    "status" "AnalysisRequestStatus" NOT NULL DEFAULT 'DRAFT',
    "requestedByIdentityId" UUID NOT NULL,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "scope" TEXT,
    "limitations" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "analysis_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "analysis_runs" (
    "id" UUID NOT NULL,
    "analysisRequestId" UUID NOT NULL,
    "institutionId" UUID NOT NULL,
    "runReference" TEXT NOT NULL,
    "status" "AnalysisRunStatus" NOT NULL DEFAULT 'PENDING',
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "methodology" TEXT,
    "inputsSnapshot" JSONB NOT NULL DEFAULT '{}',
    "limitations" TEXT,
    "uncertaintyNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "analysis_runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "analysis_findings" (
    "id" UUID NOT NULL,
    "analysisRunId" UUID NOT NULL,
    "findingType" TEXT NOT NULL,
    "severity" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "sourceDataRefs" JSONB NOT NULL DEFAULT '[]',
    "uncertaintyNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "analysis_findings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "analysis_options" (
    "id" UUID NOT NULL,
    "analysisRunId" UUID NOT NULL,
    "optionLabel" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "tradeoffs" TEXT,
    "uncertaintyNotes" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "analysis_options_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "monitoring_observations" (
    "id" UUID NOT NULL,
    "institutionId" UUID NOT NULL,
    "monitoringRuleId" UUID,
    "observationType" TEXT NOT NULL,
    "observedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "summary" TEXT NOT NULL,
    "sourceDataRefs" JSONB NOT NULL DEFAULT '[]',
    "uncertaintyNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "monitoring_observations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "monitoring_alerts" (
    "id" UUID NOT NULL,
    "institutionId" UUID NOT NULL,
    "monitoringRuleId" UUID,
    "monitoringObservationId" UUID,
    "alertReference" TEXT NOT NULL,
    "status" "MonitoringAlertStatus" NOT NULL DEFAULT 'OPEN',
    "title" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "raisedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "verifiedAt" TIMESTAMP(3),
    "closedAt" TIMESTAMP(3),
    "isViolation" BOOLEAN NOT NULL DEFAULT false,
    "sourceDataRefs" JSONB NOT NULL DEFAULT '[]',
    "limitations" TEXT,
    "uncertaintyNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "monitoring_alerts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "alert_verifications" (
    "id" UUID NOT NULL,
    "monitoringAlertId" UUID NOT NULL,
    "verifierIdentityId" UUID NOT NULL,
    "outcome" "AlertVerificationOutcome" NOT NULL,
    "verifiedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "findings" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "alert_verifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "risk_assessments" (
    "id" UUID NOT NULL,
    "institutionId" UUID NOT NULL,
    "caseId" UUID,
    "analysisRunId" UUID,
    "assessmentReference" TEXT NOT NULL,
    "status" "RiskAssessmentStatus" NOT NULL DEFAULT 'DRAFT',
    "assessedAt" TIMESTAMP(3),
    "riskLevel" TEXT,
    "methodology" TEXT,
    "findings" TEXT,
    "uncertaintyNotes" TEXT,
    "limitations" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "risk_assessments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "digital_twin_definitions" (
    "id" UUID NOT NULL,
    "institutionId" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "digital_twin_definitions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "digital_twin_versions" (
    "id" UUID NOT NULL,
    "digitalTwinDefinitionId" UUID NOT NULL,
    "versionNumber" INTEGER NOT NULL,
    "twinConfig" JSONB NOT NULL DEFAULT '{}',
    "status" "DigitalTwinStatus" NOT NULL DEFAULT 'ACTIVE',
    "staleAt" TIMESTAMP(3),
    "isStale" BOOLEAN NOT NULL DEFAULT false,
    "consequentialUseHalted" BOOLEAN NOT NULL DEFAULT false,
    "limitations" TEXT,
    "uncertaintyNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "digital_twin_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "digital_twin_snapshots" (
    "id" UUID NOT NULL,
    "digitalTwinVersionId" UUID NOT NULL,
    "snapshotAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "snapshotData" JSONB NOT NULL DEFAULT '{}',
    "staleAt" TIMESTAMP(3),
    "isStale" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "digital_twin_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "simulation_scenarios" (
    "id" UUID NOT NULL,
    "digitalTwinVersionId" UUID NOT NULL,
    "scenarioCode" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "parameters" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "simulation_scenarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "simulation_runs" (
    "id" UUID NOT NULL,
    "simulationScenarioId" UUID NOT NULL,
    "institutionId" UUID NOT NULL,
    "runReference" TEXT NOT NULL,
    "status" "SimulationRunStatus" NOT NULL DEFAULT 'PENDING',
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "runConfig" JSONB NOT NULL DEFAULT '{}',
    "limitations" TEXT,
    "uncertaintyNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "simulation_runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "simulation_outputs" (
    "id" UUID NOT NULL,
    "simulationRunId" UUID NOT NULL,
    "outputType" "SimulationOutputType" NOT NULL,
    "outputData" JSONB NOT NULL DEFAULT '{}',
    "uncertaintyNotes" TEXT,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "simulation_outputs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "consequential_use_reviews" (
    "id" UUID NOT NULL,
    "simulationRunId" UUID,
    "digitalTwinVersionId" UUID,
    "reviewerIdentityId" UUID NOT NULL,
    "reviewOutcome" TEXT NOT NULL,
    "reviewedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "rationale" TEXT,
    "consequentialUseApproved" BOOLEAN NOT NULL DEFAULT false,
    "limitations" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "consequential_use_reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "simulation_to_live_transition_records" (
    "id" UUID NOT NULL,
    "simulationRunId" UUID NOT NULL,
    "digitalTwinVersionId" UUID NOT NULL,
    "transitionedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "transitionedByIdentityId" UUID,
    "consequentialUseReviewId" UUID,
    "liveConfigSnapshot" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "simulation_to_live_transition_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "report_definitions" (
    "id" UUID NOT NULL,
    "institutionId" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" "ReportDefinitionStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "report_definitions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "report_generation_runs" (
    "id" UUID NOT NULL,
    "reportDefinitionId" UUID NOT NULL,
    "institutionId" UUID NOT NULL,
    "runReference" TEXT NOT NULL,
    "status" "ReportGenerationRunStatus" NOT NULL DEFAULT 'PENDING',
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "inputsSnapshot" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "report_generation_runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "report_claims" (
    "id" UUID NOT NULL,
    "reportGenerationRunId" UUID NOT NULL,
    "claimReference" TEXT NOT NULL,
    "status" "ReportClaimStatus" NOT NULL DEFAULT 'DRAFT',
    "claimStatement" TEXT NOT NULL,
    "claimedValue" TEXT,
    "sourceDataRefs" JSONB NOT NULL DEFAULT '[]',
    "evidencePacketVersionId" UUID,
    "evidenceTraceabilityRefs" JSONB NOT NULL DEFAULT '[]',
    "underlyingRecordRefs" JSONB NOT NULL DEFAULT '[]',
    "limitations" TEXT,
    "uncertaintyNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "report_claims_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "report_reviews" (
    "id" UUID NOT NULL,
    "reportGenerationRunId" UUID,
    "reportClaimId" UUID,
    "reviewerIdentityId" UUID NOT NULL,
    "reviewedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "outcome" TEXT NOT NULL,
    "findings" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "report_reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "report_approvals" (
    "id" UUID NOT NULL,
    "reportGenerationRunId" UUID NOT NULL,
    "approverIdentityId" UUID NOT NULL,
    "approvedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "conditions" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "report_approvals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "report_publications" (
    "id" UUID NOT NULL,
    "reportGenerationRunId" UUID NOT NULL,
    "publicationReference" TEXT NOT NULL,
    "status" "ReportPublicationStatus" NOT NULL DEFAULT 'DRAFT',
    "publishedAt" TIMESTAMP(3),
    "audience" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "report_publications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "report_corrections" (
    "id" UUID NOT NULL,
    "reportPublicationId" UUID NOT NULL,
    "correctionStatement" TEXT NOT NULL,
    "correctedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "correctedByIdentityId" UUID,
    "supersedesPublicationId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "report_corrections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "evidence_dashboard_decision_traces" (
    "id" UUID NOT NULL,
    "institutionId" UUID NOT NULL,
    "caseId" UUID,
    "governmentDecisionId" UUID,
    "officialInstrumentId" UUID,
    "evidencePacketId" UUID,
    "evidencePacketVersionId" UUID,
    "dashboardSnapshotId" UUID,
    "traceReference" TEXT NOT NULL,
    "decisionTrace" JSONB NOT NULL DEFAULT '{}',
    "processingTimeBreakdown" JSONB NOT NULL DEFAULT '{}',
    "absezProcessingMinutes" INTEGER,
    "applicantProcessingMinutes" INTEGER,
    "externalDependencyProcessingMinutes" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "evidence_dashboard_decision_traces_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "performance_frameworks_institutionId_idx" ON "performance_frameworks"("institutionId");

-- CreateIndex
CREATE UNIQUE INDEX "performance_frameworks_institutionId_code_key" ON "performance_frameworks"("institutionId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "metric_definitions_currentVersionId_key" ON "metric_definitions"("currentVersionId");

-- CreateIndex
CREATE INDEX "metric_definitions_performanceFrameworkId_idx" ON "metric_definitions"("performanceFrameworkId");

-- CreateIndex
CREATE INDEX "metric_definitions_institutionId_idx" ON "metric_definitions"("institutionId");

-- CreateIndex
CREATE INDEX "metric_definitions_status_idx" ON "metric_definitions"("status");

-- CreateIndex
CREATE UNIQUE INDEX "metric_definitions_institutionId_code_key" ON "metric_definitions"("institutionId", "code");

-- CreateIndex
CREATE INDEX "metric_definition_versions_metricDefinitionId_idx" ON "metric_definition_versions"("metricDefinitionId");

-- CreateIndex
CREATE UNIQUE INDEX "metric_definition_versions_metricDefinitionId_versionNumber_key" ON "metric_definition_versions"("metricDefinitionId", "versionNumber");

-- CreateIndex
CREATE INDEX "metric_baselines_metricDefinitionId_idx" ON "metric_baselines"("metricDefinitionId");

-- CreateIndex
CREATE INDEX "metric_baselines_metricDefinitionVersionId_idx" ON "metric_baselines"("metricDefinitionVersionId");

-- CreateIndex
CREATE INDEX "metric_baselines_institutionId_idx" ON "metric_baselines"("institutionId");

-- CreateIndex
CREATE UNIQUE INDEX "metric_calculation_runs_runReference_key" ON "metric_calculation_runs"("runReference");

-- CreateIndex
CREATE INDEX "metric_calculation_runs_metricDefinitionVersionId_idx" ON "metric_calculation_runs"("metricDefinitionVersionId");

-- CreateIndex
CREATE INDEX "metric_calculation_runs_institutionId_idx" ON "metric_calculation_runs"("institutionId");

-- CreateIndex
CREATE INDEX "metric_calculation_runs_status_idx" ON "metric_calculation_runs"("status");

-- CreateIndex
CREATE INDEX "metric_observations_metricCalculationRunId_idx" ON "metric_observations"("metricCalculationRunId");

-- CreateIndex
CREATE INDEX "metric_observations_metricDefinitionVersionId_idx" ON "metric_observations"("metricDefinitionVersionId");

-- CreateIndex
CREATE INDEX "metric_observations_institutionId_idx" ON "metric_observations"("institutionId");

-- CreateIndex
CREATE INDEX "metric_observations_observedAt_idx" ON "metric_observations"("observedAt");

-- CreateIndex
CREATE INDEX "metric_data_quality_assessments_metricObservationId_idx" ON "metric_data_quality_assessments"("metricObservationId");

-- CreateIndex
CREATE INDEX "metric_data_quality_assessments_metricCalculationRunId_idx" ON "metric_data_quality_assessments"("metricCalculationRunId");

-- CreateIndex
CREATE INDEX "metric_data_quality_assessments_institutionId_idx" ON "metric_data_quality_assessments"("institutionId");

-- CreateIndex
CREATE INDEX "metric_data_quality_assessments_status_idx" ON "metric_data_quality_assessments"("status");

-- CreateIndex
CREATE UNIQUE INDEX "performance_claims_claimReference_key" ON "performance_claims"("claimReference");

-- CreateIndex
CREATE INDEX "performance_claims_institutionId_idx" ON "performance_claims"("institutionId");

-- CreateIndex
CREATE INDEX "performance_claims_metricDefinitionId_idx" ON "performance_claims"("metricDefinitionId");

-- CreateIndex
CREATE INDEX "performance_claims_metricObservationId_idx" ON "performance_claims"("metricObservationId");

-- CreateIndex
CREATE INDEX "performance_claims_evidencePacketId_idx" ON "performance_claims"("evidencePacketId");

-- CreateIndex
CREATE INDEX "performance_claims_evidencePacketVersionId_idx" ON "performance_claims"("evidencePacketVersionId");

-- CreateIndex
CREATE INDEX "performance_claims_governmentDecisionId_idx" ON "performance_claims"("governmentDecisionId");

-- CreateIndex
CREATE INDEX "performance_claims_caseId_idx" ON "performance_claims"("caseId");

-- CreateIndex
CREATE INDEX "performance_claims_status_idx" ON "performance_claims"("status");

-- CreateIndex
CREATE INDEX "performance_claim_reviews_performanceClaimId_idx" ON "performance_claim_reviews"("performanceClaimId");

-- CreateIndex
CREATE INDEX "performance_claim_reviews_reviewerIdentityId_idx" ON "performance_claim_reviews"("reviewerIdentityId");

-- CreateIndex
CREATE INDEX "performance_claim_revalidations_performanceClaimId_idx" ON "performance_claim_revalidations"("performanceClaimId");

-- CreateIndex
CREATE INDEX "performance_claim_revalidations_revalidatedByIdentityId_idx" ON "performance_claim_revalidations"("revalidatedByIdentityId");

-- CreateIndex
CREATE INDEX "dashboard_definitions_institutionId_idx" ON "dashboard_definitions"("institutionId");

-- CreateIndex
CREATE INDEX "dashboard_definitions_status_idx" ON "dashboard_definitions"("status");

-- CreateIndex
CREATE UNIQUE INDEX "dashboard_definitions_institutionId_code_key" ON "dashboard_definitions"("institutionId", "code");

-- CreateIndex
CREATE INDEX "dashboard_versions_dashboardDefinitionId_idx" ON "dashboard_versions"("dashboardDefinitionId");

-- CreateIndex
CREATE UNIQUE INDEX "dashboard_versions_dashboardDefinitionId_versionNumber_key" ON "dashboard_versions"("dashboardDefinitionId", "versionNumber");

-- CreateIndex
CREATE INDEX "dashboard_widget_definitions_dashboardVersionId_idx" ON "dashboard_widget_definitions"("dashboardVersionId");

-- CreateIndex
CREATE INDEX "dashboard_indicator_definitions_dashboardVersionId_idx" ON "dashboard_indicator_definitions"("dashboardVersionId");

-- CreateIndex
CREATE INDEX "dashboard_indicator_definitions_metricDefinitionId_idx" ON "dashboard_indicator_definitions"("metricDefinitionId");

-- CreateIndex
CREATE UNIQUE INDEX "dashboard_indicator_definitions_dashboardVersionId_indicato_key" ON "dashboard_indicator_definitions"("dashboardVersionId", "indicatorCode");

-- CreateIndex
CREATE INDEX "dashboard_indicator_projections_dashboardIndicatorDefinitio_idx" ON "dashboard_indicator_projections"("dashboardIndicatorDefinitionId");

-- CreateIndex
CREATE INDEX "dashboard_indicator_projections_institutionId_idx" ON "dashboard_indicator_projections"("institutionId");

-- CreateIndex
CREATE INDEX "dashboard_indicator_projections_status_idx" ON "dashboard_indicator_projections"("status");

-- CreateIndex
CREATE INDEX "dashboard_indicator_projections_isStale_idx" ON "dashboard_indicator_projections"("isStale");

-- CreateIndex
CREATE INDEX "dashboard_snapshots_dashboardVersionId_idx" ON "dashboard_snapshots"("dashboardVersionId");

-- CreateIndex
CREATE INDEX "dashboard_snapshots_institutionId_idx" ON "dashboard_snapshots"("institutionId");

-- CreateIndex
CREATE INDEX "dashboard_snapshots_snapshotAt_idx" ON "dashboard_snapshots"("snapshotAt");

-- CreateIndex
CREATE UNIQUE INDEX "dashboard_status_dictionary_entries_code_key" ON "dashboard_status_dictionary_entries"("code");

-- CreateIndex
CREATE INDEX "strategic_project_profiles_institutionId_idx" ON "strategic_project_profiles"("institutionId");

-- CreateIndex
CREATE INDEX "strategic_project_profiles_sponsorInstitutionId_idx" ON "strategic_project_profiles"("sponsorInstitutionId");

-- CreateIndex
CREATE UNIQUE INDEX "strategic_project_profiles_institutionId_projectCode_key" ON "strategic_project_profiles"("institutionId", "projectCode");

-- CreateIndex
CREATE INDEX "strategic_project_milestones_strategicProjectProfileId_idx" ON "strategic_project_milestones"("strategicProjectProfileId");

-- CreateIndex
CREATE INDEX "strategic_project_milestones_status_idx" ON "strategic_project_milestones"("status");

-- CreateIndex
CREATE UNIQUE INDEX "strategic_project_milestones_strategicProjectProfileId_mile_key" ON "strategic_project_milestones"("strategicProjectProfileId", "milestoneCode");

-- CreateIndex
CREATE INDEX "capital_evidence_records_strategicProjectProfileId_idx" ON "capital_evidence_records"("strategicProjectProfileId");

-- CreateIndex
CREATE INDEX "capital_evidence_records_institutionId_idx" ON "capital_evidence_records"("institutionId");

-- CreateIndex
CREATE INDEX "capital_evidence_records_evidencePacketVersionId_idx" ON "capital_evidence_records"("evidencePacketVersionId");

-- CreateIndex
CREATE INDEX "employment_evidence_records_strategicProjectProfileId_idx" ON "employment_evidence_records"("strategicProjectProfileId");

-- CreateIndex
CREATE INDEX "employment_evidence_records_institutionId_idx" ON "employment_evidence_records"("institutionId");

-- CreateIndex
CREATE INDEX "employment_evidence_records_evidencePacketVersionId_idx" ON "employment_evidence_records"("evidencePacketVersionId");

-- CreateIndex
CREATE INDEX "infrastructure_delivery_records_strategicProjectProfileId_idx" ON "infrastructure_delivery_records"("strategicProjectProfileId");

-- CreateIndex
CREATE INDEX "infrastructure_delivery_records_institutionId_idx" ON "infrastructure_delivery_records"("institutionId");

-- CreateIndex
CREATE INDEX "project_status_projections_strategicProjectProfileId_idx" ON "project_status_projections"("strategicProjectProfileId");

-- CreateIndex
CREATE INDEX "project_status_projections_institutionId_idx" ON "project_status_projections"("institutionId");

-- CreateIndex
CREATE INDEX "project_status_projections_isStale_idx" ON "project_status_projections"("isStale");

-- CreateIndex
CREATE INDEX "ai_model_definitions_institutionId_idx" ON "ai_model_definitions"("institutionId");

-- CreateIndex
CREATE INDEX "ai_model_definitions_status_idx" ON "ai_model_definitions"("status");

-- CreateIndex
CREATE UNIQUE INDEX "ai_model_definitions_institutionId_code_key" ON "ai_model_definitions"("institutionId", "code");

-- CreateIndex
CREATE INDEX "ai_model_versions_aiModelDefinitionId_idx" ON "ai_model_versions"("aiModelDefinitionId");

-- CreateIndex
CREATE INDEX "ai_model_versions_status_idx" ON "ai_model_versions"("status");

-- CreateIndex
CREATE UNIQUE INDEX "ai_model_versions_aiModelDefinitionId_versionNumber_key" ON "ai_model_versions"("aiModelDefinitionId", "versionNumber");

-- CreateIndex
CREATE INDEX "ai_use_cases_institutionId_idx" ON "ai_use_cases"("institutionId");

-- CreateIndex
CREATE INDEX "ai_use_cases_aiModelDefinitionId_idx" ON "ai_use_cases"("aiModelDefinitionId");

-- CreateIndex
CREATE INDEX "ai_use_cases_status_idx" ON "ai_use_cases"("status");

-- CreateIndex
CREATE UNIQUE INDEX "ai_use_cases_institutionId_code_key" ON "ai_use_cases"("institutionId", "code");

-- CreateIndex
CREATE INDEX "ai_use_case_versions_aiUseCaseId_idx" ON "ai_use_case_versions"("aiUseCaseId");

-- CreateIndex
CREATE UNIQUE INDEX "ai_use_case_versions_aiUseCaseId_versionNumber_key" ON "ai_use_case_versions"("aiUseCaseId", "versionNumber");

-- CreateIndex
CREATE INDEX "ai_agent_definitions_institutionId_idx" ON "ai_agent_definitions"("institutionId");

-- CreateIndex
CREATE INDEX "ai_agent_definitions_status_idx" ON "ai_agent_definitions"("status");

-- CreateIndex
CREATE UNIQUE INDEX "ai_agent_definitions_institutionId_code_key" ON "ai_agent_definitions"("institutionId", "code");

-- CreateIndex
CREATE INDEX "ai_agent_versions_aiAgentDefinitionId_idx" ON "ai_agent_versions"("aiAgentDefinitionId");

-- CreateIndex
CREATE UNIQUE INDEX "ai_agent_versions_aiAgentDefinitionId_versionNumber_key" ON "ai_agent_versions"("aiAgentDefinitionId", "versionNumber");

-- CreateIndex
CREATE INDEX "ai_data_entitlements_aiModelVersionId_idx" ON "ai_data_entitlements"("aiModelVersionId");

-- CreateIndex
CREATE INDEX "ai_data_entitlements_aiUseCaseVersionId_idx" ON "ai_data_entitlements"("aiUseCaseVersionId");

-- CreateIndex
CREATE INDEX "ai_data_entitlements_institutionId_idx" ON "ai_data_entitlements"("institutionId");

-- CreateIndex
CREATE INDEX "ai_data_entitlements_identityId_idx" ON "ai_data_entitlements"("identityId");

-- CreateIndex
CREATE INDEX "ai_tool_entitlements_aiAgentVersionId_idx" ON "ai_tool_entitlements"("aiAgentVersionId");

-- CreateIndex
CREATE INDEX "ai_tool_entitlements_institutionId_idx" ON "ai_tool_entitlements"("institutionId");

-- CreateIndex
CREATE INDEX "ai_evaluations_aiModelVersionId_idx" ON "ai_evaluations"("aiModelVersionId");

-- CreateIndex
CREATE INDEX "ai_evaluations_aiAgentVersionId_idx" ON "ai_evaluations"("aiAgentVersionId");

-- CreateIndex
CREATE INDEX "ai_evaluations_evaluatorIdentityId_idx" ON "ai_evaluations"("evaluatorIdentityId");

-- CreateIndex
CREATE INDEX "ai_incidents_institutionId_idx" ON "ai_incidents"("institutionId");

-- CreateIndex
CREATE INDEX "ai_incidents_aiExecutionRecordId_idx" ON "ai_incidents"("aiExecutionRecordId");

-- CreateIndex
CREATE INDEX "ai_incidents_aiModelVersionId_idx" ON "ai_incidents"("aiModelVersionId");

-- CreateIndex
CREATE INDEX "ai_incidents_aiAgentVersionId_idx" ON "ai_incidents"("aiAgentVersionId");

-- CreateIndex
CREATE INDEX "ai_suspension_records_aiModelVersionId_idx" ON "ai_suspension_records"("aiModelVersionId");

-- CreateIndex
CREATE INDEX "ai_suspension_records_aiAgentVersionId_idx" ON "ai_suspension_records"("aiAgentVersionId");

-- CreateIndex
CREATE INDEX "ai_suspension_records_aiUseCaseVersionId_idx" ON "ai_suspension_records"("aiUseCaseVersionId");

-- CreateIndex
CREATE INDEX "ai_suspension_records_suspendedByIdentityId_idx" ON "ai_suspension_records"("suspendedByIdentityId");

-- CreateIndex
CREATE UNIQUE INDEX "ai_execution_records_executionReference_key" ON "ai_execution_records"("executionReference");

-- CreateIndex
CREATE INDEX "ai_execution_records_institutionId_idx" ON "ai_execution_records"("institutionId");

-- CreateIndex
CREATE INDEX "ai_execution_records_aiUseCaseVersionId_idx" ON "ai_execution_records"("aiUseCaseVersionId");

-- CreateIndex
CREATE INDEX "ai_execution_records_aiAgentVersionId_idx" ON "ai_execution_records"("aiAgentVersionId");

-- CreateIndex
CREATE INDEX "ai_execution_records_aiModelVersionId_idx" ON "ai_execution_records"("aiModelVersionId");

-- CreateIndex
CREATE INDEX "ai_execution_records_caseId_idx" ON "ai_execution_records"("caseId");

-- CreateIndex
CREATE INDEX "ai_execution_records_status_idx" ON "ai_execution_records"("status");

-- CreateIndex
CREATE INDEX "ai_human_dispositions_aiExecutionRecordId_idx" ON "ai_human_dispositions"("aiExecutionRecordId");

-- CreateIndex
CREATE INDEX "ai_human_dispositions_disposedByIdentityId_idx" ON "ai_human_dispositions"("disposedByIdentityId");

-- CreateIndex
CREATE UNIQUE INDEX "analysis_requests_requestReference_key" ON "analysis_requests"("requestReference");

-- CreateIndex
CREATE INDEX "analysis_requests_institutionId_idx" ON "analysis_requests"("institutionId");

-- CreateIndex
CREATE INDEX "analysis_requests_caseId_idx" ON "analysis_requests"("caseId");

-- CreateIndex
CREATE INDEX "analysis_requests_requestedByIdentityId_idx" ON "analysis_requests"("requestedByIdentityId");

-- CreateIndex
CREATE INDEX "analysis_requests_status_idx" ON "analysis_requests"("status");

-- CreateIndex
CREATE UNIQUE INDEX "analysis_runs_runReference_key" ON "analysis_runs"("runReference");

-- CreateIndex
CREATE INDEX "analysis_runs_analysisRequestId_idx" ON "analysis_runs"("analysisRequestId");

-- CreateIndex
CREATE INDEX "analysis_runs_institutionId_idx" ON "analysis_runs"("institutionId");

-- CreateIndex
CREATE INDEX "analysis_runs_status_idx" ON "analysis_runs"("status");

-- CreateIndex
CREATE INDEX "analysis_findings_analysisRunId_idx" ON "analysis_findings"("analysisRunId");

-- CreateIndex
CREATE INDEX "analysis_options_analysisRunId_idx" ON "analysis_options"("analysisRunId");

-- CreateIndex
CREATE INDEX "monitoring_observations_institutionId_idx" ON "monitoring_observations"("institutionId");

-- CreateIndex
CREATE INDEX "monitoring_observations_monitoringRuleId_idx" ON "monitoring_observations"("monitoringRuleId");

-- CreateIndex
CREATE INDEX "monitoring_observations_observedAt_idx" ON "monitoring_observations"("observedAt");

-- CreateIndex
CREATE UNIQUE INDEX "monitoring_alerts_alertReference_key" ON "monitoring_alerts"("alertReference");

-- CreateIndex
CREATE INDEX "monitoring_alerts_institutionId_idx" ON "monitoring_alerts"("institutionId");

-- CreateIndex
CREATE INDEX "monitoring_alerts_monitoringRuleId_idx" ON "monitoring_alerts"("monitoringRuleId");

-- CreateIndex
CREATE INDEX "monitoring_alerts_monitoringObservationId_idx" ON "monitoring_alerts"("monitoringObservationId");

-- CreateIndex
CREATE INDEX "monitoring_alerts_status_idx" ON "monitoring_alerts"("status");

-- CreateIndex
CREATE INDEX "alert_verifications_monitoringAlertId_idx" ON "alert_verifications"("monitoringAlertId");

-- CreateIndex
CREATE INDEX "alert_verifications_verifierIdentityId_idx" ON "alert_verifications"("verifierIdentityId");

-- CreateIndex
CREATE UNIQUE INDEX "risk_assessments_assessmentReference_key" ON "risk_assessments"("assessmentReference");

-- CreateIndex
CREATE INDEX "risk_assessments_institutionId_idx" ON "risk_assessments"("institutionId");

-- CreateIndex
CREATE INDEX "risk_assessments_caseId_idx" ON "risk_assessments"("caseId");

-- CreateIndex
CREATE INDEX "risk_assessments_analysisRunId_idx" ON "risk_assessments"("analysisRunId");

-- CreateIndex
CREATE INDEX "risk_assessments_status_idx" ON "risk_assessments"("status");

-- CreateIndex
CREATE INDEX "digital_twin_definitions_institutionId_idx" ON "digital_twin_definitions"("institutionId");

-- CreateIndex
CREATE UNIQUE INDEX "digital_twin_definitions_institutionId_code_key" ON "digital_twin_definitions"("institutionId", "code");

-- CreateIndex
CREATE INDEX "digital_twin_versions_digitalTwinDefinitionId_idx" ON "digital_twin_versions"("digitalTwinDefinitionId");

-- CreateIndex
CREATE INDEX "digital_twin_versions_status_idx" ON "digital_twin_versions"("status");

-- CreateIndex
CREATE INDEX "digital_twin_versions_isStale_idx" ON "digital_twin_versions"("isStale");

-- CreateIndex
CREATE UNIQUE INDEX "digital_twin_versions_digitalTwinDefinitionId_versionNumber_key" ON "digital_twin_versions"("digitalTwinDefinitionId", "versionNumber");

-- CreateIndex
CREATE INDEX "digital_twin_snapshots_digitalTwinVersionId_idx" ON "digital_twin_snapshots"("digitalTwinVersionId");

-- CreateIndex
CREATE INDEX "digital_twin_snapshots_snapshotAt_idx" ON "digital_twin_snapshots"("snapshotAt");

-- CreateIndex
CREATE INDEX "simulation_scenarios_digitalTwinVersionId_idx" ON "simulation_scenarios"("digitalTwinVersionId");

-- CreateIndex
CREATE UNIQUE INDEX "simulation_scenarios_digitalTwinVersionId_scenarioCode_key" ON "simulation_scenarios"("digitalTwinVersionId", "scenarioCode");

-- CreateIndex
CREATE UNIQUE INDEX "simulation_runs_runReference_key" ON "simulation_runs"("runReference");

-- CreateIndex
CREATE INDEX "simulation_runs_simulationScenarioId_idx" ON "simulation_runs"("simulationScenarioId");

-- CreateIndex
CREATE INDEX "simulation_runs_institutionId_idx" ON "simulation_runs"("institutionId");

-- CreateIndex
CREATE INDEX "simulation_runs_status_idx" ON "simulation_runs"("status");

-- CreateIndex
CREATE INDEX "simulation_outputs_simulationRunId_idx" ON "simulation_outputs"("simulationRunId");

-- CreateIndex
CREATE INDEX "simulation_outputs_outputType_idx" ON "simulation_outputs"("outputType");

-- CreateIndex
CREATE INDEX "consequential_use_reviews_simulationRunId_idx" ON "consequential_use_reviews"("simulationRunId");

-- CreateIndex
CREATE INDEX "consequential_use_reviews_digitalTwinVersionId_idx" ON "consequential_use_reviews"("digitalTwinVersionId");

-- CreateIndex
CREATE INDEX "consequential_use_reviews_reviewerIdentityId_idx" ON "consequential_use_reviews"("reviewerIdentityId");

-- CreateIndex
CREATE INDEX "simulation_to_live_transition_records_simulationRunId_idx" ON "simulation_to_live_transition_records"("simulationRunId");

-- CreateIndex
CREATE INDEX "simulation_to_live_transition_records_digitalTwinVersionId_idx" ON "simulation_to_live_transition_records"("digitalTwinVersionId");

-- CreateIndex
CREATE INDEX "simulation_to_live_transition_records_transitionedByIdentit_idx" ON "simulation_to_live_transition_records"("transitionedByIdentityId");

-- CreateIndex
CREATE INDEX "report_definitions_institutionId_idx" ON "report_definitions"("institutionId");

-- CreateIndex
CREATE INDEX "report_definitions_status_idx" ON "report_definitions"("status");

-- CreateIndex
CREATE UNIQUE INDEX "report_definitions_institutionId_code_key" ON "report_definitions"("institutionId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "report_generation_runs_runReference_key" ON "report_generation_runs"("runReference");

-- CreateIndex
CREATE INDEX "report_generation_runs_reportDefinitionId_idx" ON "report_generation_runs"("reportDefinitionId");

-- CreateIndex
CREATE INDEX "report_generation_runs_institutionId_idx" ON "report_generation_runs"("institutionId");

-- CreateIndex
CREATE INDEX "report_generation_runs_status_idx" ON "report_generation_runs"("status");

-- CreateIndex
CREATE UNIQUE INDEX "report_claims_claimReference_key" ON "report_claims"("claimReference");

-- CreateIndex
CREATE INDEX "report_claims_reportGenerationRunId_idx" ON "report_claims"("reportGenerationRunId");

-- CreateIndex
CREATE INDEX "report_claims_evidencePacketVersionId_idx" ON "report_claims"("evidencePacketVersionId");

-- CreateIndex
CREATE INDEX "report_claims_status_idx" ON "report_claims"("status");

-- CreateIndex
CREATE INDEX "report_reviews_reportGenerationRunId_idx" ON "report_reviews"("reportGenerationRunId");

-- CreateIndex
CREATE INDEX "report_reviews_reportClaimId_idx" ON "report_reviews"("reportClaimId");

-- CreateIndex
CREATE INDEX "report_reviews_reviewerIdentityId_idx" ON "report_reviews"("reviewerIdentityId");

-- CreateIndex
CREATE INDEX "report_approvals_reportGenerationRunId_idx" ON "report_approvals"("reportGenerationRunId");

-- CreateIndex
CREATE INDEX "report_approvals_approverIdentityId_idx" ON "report_approvals"("approverIdentityId");

-- CreateIndex
CREATE UNIQUE INDEX "report_publications_publicationReference_key" ON "report_publications"("publicationReference");

-- CreateIndex
CREATE INDEX "report_publications_reportGenerationRunId_idx" ON "report_publications"("reportGenerationRunId");

-- CreateIndex
CREATE INDEX "report_publications_status_idx" ON "report_publications"("status");

-- CreateIndex
CREATE INDEX "report_corrections_reportPublicationId_idx" ON "report_corrections"("reportPublicationId");

-- CreateIndex
CREATE INDEX "report_corrections_correctedByIdentityId_idx" ON "report_corrections"("correctedByIdentityId");

-- CreateIndex
CREATE UNIQUE INDEX "evidence_dashboard_decision_traces_traceReference_key" ON "evidence_dashboard_decision_traces"("traceReference");

-- CreateIndex
CREATE INDEX "evidence_dashboard_decision_traces_institutionId_idx" ON "evidence_dashboard_decision_traces"("institutionId");

-- CreateIndex
CREATE INDEX "evidence_dashboard_decision_traces_caseId_idx" ON "evidence_dashboard_decision_traces"("caseId");

-- CreateIndex
CREATE INDEX "evidence_dashboard_decision_traces_governmentDecisionId_idx" ON "evidence_dashboard_decision_traces"("governmentDecisionId");

-- CreateIndex
CREATE INDEX "evidence_dashboard_decision_traces_officialInstrumentId_idx" ON "evidence_dashboard_decision_traces"("officialInstrumentId");

-- CreateIndex
CREATE INDEX "evidence_dashboard_decision_traces_evidencePacketId_idx" ON "evidence_dashboard_decision_traces"("evidencePacketId");

-- CreateIndex
CREATE INDEX "evidence_dashboard_decision_traces_evidencePacketVersionId_idx" ON "evidence_dashboard_decision_traces"("evidencePacketVersionId");

-- CreateIndex
CREATE INDEX "evidence_dashboard_decision_traces_dashboardSnapshotId_idx" ON "evidence_dashboard_decision_traces"("dashboardSnapshotId");

-- AddForeignKey
ALTER TABLE "performance_frameworks" ADD CONSTRAINT "performance_frameworks_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "institutions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "metric_definitions" ADD CONSTRAINT "metric_definitions_performanceFrameworkId_fkey" FOREIGN KEY ("performanceFrameworkId") REFERENCES "performance_frameworks"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "metric_definitions" ADD CONSTRAINT "metric_definitions_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "institutions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "metric_definitions" ADD CONSTRAINT "metric_definitions_currentVersionId_fkey" FOREIGN KEY ("currentVersionId") REFERENCES "metric_definition_versions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "metric_definition_versions" ADD CONSTRAINT "metric_definition_versions_metricDefinitionId_fkey" FOREIGN KEY ("metricDefinitionId") REFERENCES "metric_definitions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "metric_baselines" ADD CONSTRAINT "metric_baselines_metricDefinitionId_fkey" FOREIGN KEY ("metricDefinitionId") REFERENCES "metric_definitions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "metric_baselines" ADD CONSTRAINT "metric_baselines_metricDefinitionVersionId_fkey" FOREIGN KEY ("metricDefinitionVersionId") REFERENCES "metric_definition_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "metric_baselines" ADD CONSTRAINT "metric_baselines_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "institutions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "metric_calculation_runs" ADD CONSTRAINT "metric_calculation_runs_metricDefinitionVersionId_fkey" FOREIGN KEY ("metricDefinitionVersionId") REFERENCES "metric_definition_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "metric_calculation_runs" ADD CONSTRAINT "metric_calculation_runs_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "institutions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "metric_observations" ADD CONSTRAINT "metric_observations_metricCalculationRunId_fkey" FOREIGN KEY ("metricCalculationRunId") REFERENCES "metric_calculation_runs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "metric_observations" ADD CONSTRAINT "metric_observations_metricDefinitionVersionId_fkey" FOREIGN KEY ("metricDefinitionVersionId") REFERENCES "metric_definition_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "metric_observations" ADD CONSTRAINT "metric_observations_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "institutions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "metric_data_quality_assessments" ADD CONSTRAINT "metric_data_quality_assessments_metricObservationId_fkey" FOREIGN KEY ("metricObservationId") REFERENCES "metric_observations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "metric_data_quality_assessments" ADD CONSTRAINT "metric_data_quality_assessments_metricCalculationRunId_fkey" FOREIGN KEY ("metricCalculationRunId") REFERENCES "metric_calculation_runs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "metric_data_quality_assessments" ADD CONSTRAINT "metric_data_quality_assessments_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "institutions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "metric_data_quality_assessments" ADD CONSTRAINT "metric_data_quality_assessments_assessedByIdentityId_fkey" FOREIGN KEY ("assessedByIdentityId") REFERENCES "identities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "performance_claims" ADD CONSTRAINT "performance_claims_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "institutions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "performance_claims" ADD CONSTRAINT "performance_claims_metricDefinitionId_fkey" FOREIGN KEY ("metricDefinitionId") REFERENCES "metric_definitions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "performance_claims" ADD CONSTRAINT "performance_claims_metricObservationId_fkey" FOREIGN KEY ("metricObservationId") REFERENCES "metric_observations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "performance_claims" ADD CONSTRAINT "performance_claims_evidencePacketId_fkey" FOREIGN KEY ("evidencePacketId") REFERENCES "evidence_packets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "performance_claims" ADD CONSTRAINT "performance_claims_evidencePacketVersionId_fkey" FOREIGN KEY ("evidencePacketVersionId") REFERENCES "evidence_packet_versions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "performance_claims" ADD CONSTRAINT "performance_claims_governmentDecisionId_fkey" FOREIGN KEY ("governmentDecisionId") REFERENCES "government_decisions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "performance_claims" ADD CONSTRAINT "performance_claims_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "cases"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "performance_claims" ADD CONSTRAINT "performance_claims_createdByIdentityId_fkey" FOREIGN KEY ("createdByIdentityId") REFERENCES "identities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "performance_claim_reviews" ADD CONSTRAINT "performance_claim_reviews_performanceClaimId_fkey" FOREIGN KEY ("performanceClaimId") REFERENCES "performance_claims"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "performance_claim_reviews" ADD CONSTRAINT "performance_claim_reviews_reviewerIdentityId_fkey" FOREIGN KEY ("reviewerIdentityId") REFERENCES "identities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "performance_claim_revalidations" ADD CONSTRAINT "performance_claim_revalidations_performanceClaimId_fkey" FOREIGN KEY ("performanceClaimId") REFERENCES "performance_claims"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "performance_claim_revalidations" ADD CONSTRAINT "performance_claim_revalidations_revalidatedByIdentityId_fkey" FOREIGN KEY ("revalidatedByIdentityId") REFERENCES "identities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dashboard_definitions" ADD CONSTRAINT "dashboard_definitions_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "institutions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dashboard_versions" ADD CONSTRAINT "dashboard_versions_dashboardDefinitionId_fkey" FOREIGN KEY ("dashboardDefinitionId") REFERENCES "dashboard_definitions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dashboard_widget_definitions" ADD CONSTRAINT "dashboard_widget_definitions_dashboardVersionId_fkey" FOREIGN KEY ("dashboardVersionId") REFERENCES "dashboard_versions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dashboard_indicator_definitions" ADD CONSTRAINT "dashboard_indicator_definitions_dashboardVersionId_fkey" FOREIGN KEY ("dashboardVersionId") REFERENCES "dashboard_versions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dashboard_indicator_definitions" ADD CONSTRAINT "dashboard_indicator_definitions_metricDefinitionId_fkey" FOREIGN KEY ("metricDefinitionId") REFERENCES "metric_definitions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dashboard_indicator_projections" ADD CONSTRAINT "dashboard_indicator_projections_dashboardIndicatorDefiniti_fkey" FOREIGN KEY ("dashboardIndicatorDefinitionId") REFERENCES "dashboard_indicator_definitions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dashboard_indicator_projections" ADD CONSTRAINT "dashboard_indicator_projections_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "institutions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dashboard_snapshots" ADD CONSTRAINT "dashboard_snapshots_dashboardVersionId_fkey" FOREIGN KEY ("dashboardVersionId") REFERENCES "dashboard_versions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dashboard_snapshots" ADD CONSTRAINT "dashboard_snapshots_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "institutions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "strategic_project_profiles" ADD CONSTRAINT "strategic_project_profiles_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "institutions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "strategic_project_profiles" ADD CONSTRAINT "strategic_project_profiles_sponsorInstitutionId_fkey" FOREIGN KEY ("sponsorInstitutionId") REFERENCES "institutions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "strategic_project_milestones" ADD CONSTRAINT "strategic_project_milestones_strategicProjectProfileId_fkey" FOREIGN KEY ("strategicProjectProfileId") REFERENCES "strategic_project_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "capital_evidence_records" ADD CONSTRAINT "capital_evidence_records_strategicProjectProfileId_fkey" FOREIGN KEY ("strategicProjectProfileId") REFERENCES "strategic_project_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "capital_evidence_records" ADD CONSTRAINT "capital_evidence_records_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "institutions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "capital_evidence_records" ADD CONSTRAINT "capital_evidence_records_evidencePacketVersionId_fkey" FOREIGN KEY ("evidencePacketVersionId") REFERENCES "evidence_packet_versions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employment_evidence_records" ADD CONSTRAINT "employment_evidence_records_strategicProjectProfileId_fkey" FOREIGN KEY ("strategicProjectProfileId") REFERENCES "strategic_project_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employment_evidence_records" ADD CONSTRAINT "employment_evidence_records_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "institutions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employment_evidence_records" ADD CONSTRAINT "employment_evidence_records_evidencePacketVersionId_fkey" FOREIGN KEY ("evidencePacketVersionId") REFERENCES "evidence_packet_versions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "infrastructure_delivery_records" ADD CONSTRAINT "infrastructure_delivery_records_strategicProjectProfileId_fkey" FOREIGN KEY ("strategicProjectProfileId") REFERENCES "strategic_project_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "infrastructure_delivery_records" ADD CONSTRAINT "infrastructure_delivery_records_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "institutions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_status_projections" ADD CONSTRAINT "project_status_projections_strategicProjectProfileId_fkey" FOREIGN KEY ("strategicProjectProfileId") REFERENCES "strategic_project_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_status_projections" ADD CONSTRAINT "project_status_projections_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "institutions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_model_definitions" ADD CONSTRAINT "ai_model_definitions_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "institutions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_model_versions" ADD CONSTRAINT "ai_model_versions_aiModelDefinitionId_fkey" FOREIGN KEY ("aiModelDefinitionId") REFERENCES "ai_model_definitions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_use_cases" ADD CONSTRAINT "ai_use_cases_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "institutions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_use_cases" ADD CONSTRAINT "ai_use_cases_aiModelDefinitionId_fkey" FOREIGN KEY ("aiModelDefinitionId") REFERENCES "ai_model_definitions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_use_case_versions" ADD CONSTRAINT "ai_use_case_versions_aiUseCaseId_fkey" FOREIGN KEY ("aiUseCaseId") REFERENCES "ai_use_cases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_agent_definitions" ADD CONSTRAINT "ai_agent_definitions_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "institutions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_agent_versions" ADD CONSTRAINT "ai_agent_versions_aiAgentDefinitionId_fkey" FOREIGN KEY ("aiAgentDefinitionId") REFERENCES "ai_agent_definitions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_data_entitlements" ADD CONSTRAINT "ai_data_entitlements_aiModelVersionId_fkey" FOREIGN KEY ("aiModelVersionId") REFERENCES "ai_model_versions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_data_entitlements" ADD CONSTRAINT "ai_data_entitlements_aiUseCaseVersionId_fkey" FOREIGN KEY ("aiUseCaseVersionId") REFERENCES "ai_use_case_versions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_data_entitlements" ADD CONSTRAINT "ai_data_entitlements_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "institutions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_data_entitlements" ADD CONSTRAINT "ai_data_entitlements_identityId_fkey" FOREIGN KEY ("identityId") REFERENCES "identities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_tool_entitlements" ADD CONSTRAINT "ai_tool_entitlements_aiAgentVersionId_fkey" FOREIGN KEY ("aiAgentVersionId") REFERENCES "ai_agent_versions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_tool_entitlements" ADD CONSTRAINT "ai_tool_entitlements_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "institutions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_evaluations" ADD CONSTRAINT "ai_evaluations_aiModelVersionId_fkey" FOREIGN KEY ("aiModelVersionId") REFERENCES "ai_model_versions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_evaluations" ADD CONSTRAINT "ai_evaluations_aiAgentVersionId_fkey" FOREIGN KEY ("aiAgentVersionId") REFERENCES "ai_agent_versions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_evaluations" ADD CONSTRAINT "ai_evaluations_evaluatorIdentityId_fkey" FOREIGN KEY ("evaluatorIdentityId") REFERENCES "identities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_incidents" ADD CONSTRAINT "ai_incidents_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "institutions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_incidents" ADD CONSTRAINT "ai_incidents_aiExecutionRecordId_fkey" FOREIGN KEY ("aiExecutionRecordId") REFERENCES "ai_execution_records"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_incidents" ADD CONSTRAINT "ai_incidents_aiModelVersionId_fkey" FOREIGN KEY ("aiModelVersionId") REFERENCES "ai_model_versions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_incidents" ADD CONSTRAINT "ai_incidents_aiAgentVersionId_fkey" FOREIGN KEY ("aiAgentVersionId") REFERENCES "ai_agent_versions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_suspension_records" ADD CONSTRAINT "ai_suspension_records_aiModelVersionId_fkey" FOREIGN KEY ("aiModelVersionId") REFERENCES "ai_model_versions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_suspension_records" ADD CONSTRAINT "ai_suspension_records_aiAgentVersionId_fkey" FOREIGN KEY ("aiAgentVersionId") REFERENCES "ai_agent_versions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_suspension_records" ADD CONSTRAINT "ai_suspension_records_aiUseCaseVersionId_fkey" FOREIGN KEY ("aiUseCaseVersionId") REFERENCES "ai_use_case_versions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_suspension_records" ADD CONSTRAINT "ai_suspension_records_suspendedByIdentityId_fkey" FOREIGN KEY ("suspendedByIdentityId") REFERENCES "identities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_execution_records" ADD CONSTRAINT "ai_execution_records_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "institutions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_execution_records" ADD CONSTRAINT "ai_execution_records_aiUseCaseVersionId_fkey" FOREIGN KEY ("aiUseCaseVersionId") REFERENCES "ai_use_case_versions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_execution_records" ADD CONSTRAINT "ai_execution_records_aiAgentVersionId_fkey" FOREIGN KEY ("aiAgentVersionId") REFERENCES "ai_agent_versions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_execution_records" ADD CONSTRAINT "ai_execution_records_aiModelVersionId_fkey" FOREIGN KEY ("aiModelVersionId") REFERENCES "ai_model_versions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_execution_records" ADD CONSTRAINT "ai_execution_records_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "cases"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_human_dispositions" ADD CONSTRAINT "ai_human_dispositions_aiExecutionRecordId_fkey" FOREIGN KEY ("aiExecutionRecordId") REFERENCES "ai_execution_records"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_human_dispositions" ADD CONSTRAINT "ai_human_dispositions_disposedByIdentityId_fkey" FOREIGN KEY ("disposedByIdentityId") REFERENCES "identities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "analysis_requests" ADD CONSTRAINT "analysis_requests_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "institutions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "analysis_requests" ADD CONSTRAINT "analysis_requests_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "cases"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "analysis_requests" ADD CONSTRAINT "analysis_requests_requestedByIdentityId_fkey" FOREIGN KEY ("requestedByIdentityId") REFERENCES "identities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "analysis_runs" ADD CONSTRAINT "analysis_runs_analysisRequestId_fkey" FOREIGN KEY ("analysisRequestId") REFERENCES "analysis_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "analysis_runs" ADD CONSTRAINT "analysis_runs_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "institutions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "analysis_findings" ADD CONSTRAINT "analysis_findings_analysisRunId_fkey" FOREIGN KEY ("analysisRunId") REFERENCES "analysis_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "analysis_options" ADD CONSTRAINT "analysis_options_analysisRunId_fkey" FOREIGN KEY ("analysisRunId") REFERENCES "analysis_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "monitoring_observations" ADD CONSTRAINT "monitoring_observations_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "institutions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "monitoring_observations" ADD CONSTRAINT "monitoring_observations_monitoringRuleId_fkey" FOREIGN KEY ("monitoringRuleId") REFERENCES "monitoring_rules"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "monitoring_alerts" ADD CONSTRAINT "monitoring_alerts_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "institutions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "monitoring_alerts" ADD CONSTRAINT "monitoring_alerts_monitoringRuleId_fkey" FOREIGN KEY ("monitoringRuleId") REFERENCES "monitoring_rules"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "monitoring_alerts" ADD CONSTRAINT "monitoring_alerts_monitoringObservationId_fkey" FOREIGN KEY ("monitoringObservationId") REFERENCES "monitoring_observations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alert_verifications" ADD CONSTRAINT "alert_verifications_monitoringAlertId_fkey" FOREIGN KEY ("monitoringAlertId") REFERENCES "monitoring_alerts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alert_verifications" ADD CONSTRAINT "alert_verifications_verifierIdentityId_fkey" FOREIGN KEY ("verifierIdentityId") REFERENCES "identities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "risk_assessments" ADD CONSTRAINT "risk_assessments_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "institutions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "risk_assessments" ADD CONSTRAINT "risk_assessments_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "cases"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "risk_assessments" ADD CONSTRAINT "risk_assessments_analysisRunId_fkey" FOREIGN KEY ("analysisRunId") REFERENCES "analysis_runs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "digital_twin_definitions" ADD CONSTRAINT "digital_twin_definitions_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "institutions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "digital_twin_versions" ADD CONSTRAINT "digital_twin_versions_digitalTwinDefinitionId_fkey" FOREIGN KEY ("digitalTwinDefinitionId") REFERENCES "digital_twin_definitions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "digital_twin_snapshots" ADD CONSTRAINT "digital_twin_snapshots_digitalTwinVersionId_fkey" FOREIGN KEY ("digitalTwinVersionId") REFERENCES "digital_twin_versions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "simulation_scenarios" ADD CONSTRAINT "simulation_scenarios_digitalTwinVersionId_fkey" FOREIGN KEY ("digitalTwinVersionId") REFERENCES "digital_twin_versions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "simulation_runs" ADD CONSTRAINT "simulation_runs_simulationScenarioId_fkey" FOREIGN KEY ("simulationScenarioId") REFERENCES "simulation_scenarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "simulation_runs" ADD CONSTRAINT "simulation_runs_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "institutions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "simulation_outputs" ADD CONSTRAINT "simulation_outputs_simulationRunId_fkey" FOREIGN KEY ("simulationRunId") REFERENCES "simulation_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consequential_use_reviews" ADD CONSTRAINT "consequential_use_reviews_simulationRunId_fkey" FOREIGN KEY ("simulationRunId") REFERENCES "simulation_runs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consequential_use_reviews" ADD CONSTRAINT "consequential_use_reviews_digitalTwinVersionId_fkey" FOREIGN KEY ("digitalTwinVersionId") REFERENCES "digital_twin_versions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consequential_use_reviews" ADD CONSTRAINT "consequential_use_reviews_reviewerIdentityId_fkey" FOREIGN KEY ("reviewerIdentityId") REFERENCES "identities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "simulation_to_live_transition_records" ADD CONSTRAINT "simulation_to_live_transition_records_simulationRunId_fkey" FOREIGN KEY ("simulationRunId") REFERENCES "simulation_runs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "simulation_to_live_transition_records" ADD CONSTRAINT "simulation_to_live_transition_records_digitalTwinVersionId_fkey" FOREIGN KEY ("digitalTwinVersionId") REFERENCES "digital_twin_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "simulation_to_live_transition_records" ADD CONSTRAINT "simulation_to_live_transition_records_consequentialUseRevi_fkey" FOREIGN KEY ("consequentialUseReviewId") REFERENCES "consequential_use_reviews"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "simulation_to_live_transition_records" ADD CONSTRAINT "simulation_to_live_transition_records_transitionedByIdenti_fkey" FOREIGN KEY ("transitionedByIdentityId") REFERENCES "identities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "report_definitions" ADD CONSTRAINT "report_definitions_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "institutions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "report_generation_runs" ADD CONSTRAINT "report_generation_runs_reportDefinitionId_fkey" FOREIGN KEY ("reportDefinitionId") REFERENCES "report_definitions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "report_generation_runs" ADD CONSTRAINT "report_generation_runs_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "institutions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "report_claims" ADD CONSTRAINT "report_claims_reportGenerationRunId_fkey" FOREIGN KEY ("reportGenerationRunId") REFERENCES "report_generation_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "report_claims" ADD CONSTRAINT "report_claims_evidencePacketVersionId_fkey" FOREIGN KEY ("evidencePacketVersionId") REFERENCES "evidence_packet_versions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "report_reviews" ADD CONSTRAINT "report_reviews_reportGenerationRunId_fkey" FOREIGN KEY ("reportGenerationRunId") REFERENCES "report_generation_runs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "report_reviews" ADD CONSTRAINT "report_reviews_reportClaimId_fkey" FOREIGN KEY ("reportClaimId") REFERENCES "report_claims"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "report_reviews" ADD CONSTRAINT "report_reviews_reviewerIdentityId_fkey" FOREIGN KEY ("reviewerIdentityId") REFERENCES "identities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "report_approvals" ADD CONSTRAINT "report_approvals_reportGenerationRunId_fkey" FOREIGN KEY ("reportGenerationRunId") REFERENCES "report_generation_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "report_approvals" ADD CONSTRAINT "report_approvals_approverIdentityId_fkey" FOREIGN KEY ("approverIdentityId") REFERENCES "identities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "report_publications" ADD CONSTRAINT "report_publications_reportGenerationRunId_fkey" FOREIGN KEY ("reportGenerationRunId") REFERENCES "report_generation_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "report_corrections" ADD CONSTRAINT "report_corrections_reportPublicationId_fkey" FOREIGN KEY ("reportPublicationId") REFERENCES "report_publications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "report_corrections" ADD CONSTRAINT "report_corrections_correctedByIdentityId_fkey" FOREIGN KEY ("correctedByIdentityId") REFERENCES "identities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evidence_dashboard_decision_traces" ADD CONSTRAINT "evidence_dashboard_decision_traces_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "institutions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evidence_dashboard_decision_traces" ADD CONSTRAINT "evidence_dashboard_decision_traces_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "cases"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evidence_dashboard_decision_traces" ADD CONSTRAINT "evidence_dashboard_decision_traces_governmentDecisionId_fkey" FOREIGN KEY ("governmentDecisionId") REFERENCES "government_decisions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evidence_dashboard_decision_traces" ADD CONSTRAINT "evidence_dashboard_decision_traces_officialInstrumentId_fkey" FOREIGN KEY ("officialInstrumentId") REFERENCES "official_instruments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evidence_dashboard_decision_traces" ADD CONSTRAINT "evidence_dashboard_decision_traces_evidencePacketId_fkey" FOREIGN KEY ("evidencePacketId") REFERENCES "evidence_packets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evidence_dashboard_decision_traces" ADD CONSTRAINT "evidence_dashboard_decision_traces_evidencePacketVersionId_fkey" FOREIGN KEY ("evidencePacketVersionId") REFERENCES "evidence_packet_versions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evidence_dashboard_decision_traces" ADD CONSTRAINT "evidence_dashboard_decision_traces_dashboardSnapshotId_fkey" FOREIGN KEY ("dashboardSnapshotId") REFERENCES "dashboard_snapshots"("id") ON DELETE SET NULL ON UPDATE CASCADE;

