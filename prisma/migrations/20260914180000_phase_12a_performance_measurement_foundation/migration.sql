-- Phase 12A: Performance Measurement and Evidence-of-Value Foundation

CREATE TYPE "MetricCategory" AS ENUM (
  'SERVICE_TIMELINESS',
  'COMPLETENESS',
  'DECISION_INTEGRITY',
  'APPLICANT_EXPERIENCE',
  'SECURITY_PRIVACY',
  'OPERATIONAL_RESILIENCE',
  'INSTITUTIONAL_COORDINATION',
  'AI_GOVERNANCE',
  'ECONOMIC_DEVELOPMENT',
  'FINANCIAL',
  'COMPLIANCE',
  'REDRESS',
  'INTEGRATION',
  'WORKFORCE',
  'OTHER_APPROVED'
);

CREATE TYPE "MetricDefinitionStatus" AS ENUM (
  'DRAFT',
  'UNDER_REVIEW',
  'ACTIVE',
  'SUSPENDED',
  'SUPERSEDED',
  'RETIRED'
);

CREATE TYPE "MetricDefinitionVersionStatus" AS ENUM (
  'DRAFT',
  'ACTIVE',
  'SUPERSEDED',
  'RETIRED'
);

CREATE TYPE "MetricAggregationMethod" AS ENUM (
  'COUNT',
  'SUM',
  'AVERAGE',
  'MEDIAN',
  'PERCENTILE',
  'RATIO',
  'RATE',
  'OTHER_APPROVED'
);

CREATE TYPE "MetricCalculationMethodType" AS ENUM (
  'DETERMINISTIC_RULE',
  'APPROVED_FORMULA_SPECIFICATION',
  'MANUAL_AUTHORIZED_CALCULATION'
);

CREATE TYPE "MetricReportingFrequency" AS ENUM (
  'REAL_TIME',
  'DAILY',
  'WEEKLY',
  'MONTHLY',
  'QUARTERLY',
  'ANNUAL',
  'AD_HOC'
);

CREATE TYPE "MetricBaselineQualityStatus" AS ENUM (
  'ACCEPTABLE',
  'QUALIFIED',
  'BASELINE_UNAVAILABLE',
  'UNRELIABLE'
);

CREATE TYPE "MetricBaselineMethod" AS ENUM (
  'HISTORICAL_PERIOD',
  'PEER_COMPARISON',
  'POLICY_TARGET',
  'AUTHORIZED_ESTIMATE',
  'BASELINE_UNAVAILABLE'
);

CREATE TYPE "MetricDependencyTimeClassification" AS ENUM (
  'ABSEZ_CONTROLLED_TIME',
  'APPLICANT_TIME',
  'EXTERNAL_DEPENDENCY_TIME',
  'PROFESSIONAL_DEPENDENCY_TIME',
  'GOVERNMENT_RETAINED_TIME',
  'SYSTEM_OUTAGE_TIME',
  'EXCLUDED_AUTHORIZED_TIME'
);

CREATE TYPE "MetricDataQualityDimension" AS ENUM (
  'COMPLETENESS',
  'FRESHNESS',
  'VALIDITY',
  'CONSISTENCY',
  'PROVENANCE',
  'DUPLICATION',
  'SOURCE_CONFLICT',
  'MISSINGNESS'
);

CREATE TYPE "MetricDataQualityResult" AS ENUM (
  'ACCEPTABLE',
  'QUALIFIED',
  'MATERIAL_LIMITATION',
  'UNRELIABLE',
  'SAFE_HALTED'
);

CREATE TYPE "PerformanceClaimStatus" AS ENUM (
  'DRAFT',
  'UNDER_REVIEW',
  'VERIFIED_FOR_STATED_PURPOSE',
  'QUALIFIED',
  'APPROVED_FOR_INTERNAL_USE',
  'APPROVED_FOR_PUBLICATION',
  'WITHDRAWN',
  'SUPERSEDED',
  'EXPIRED',
  'SAFE_HALTED'
);

CREATE TYPE "PerformanceAttributionClassification" AS ENUM (
  'OBSERVED',
  'ASSOCIATED',
  'CONTRIBUTORY',
  'PLAUSIBLE_CONTRIBUTION',
  'CAUSAL_WITH_APPROVED_METHOD',
  'NOT_ESTABLISHED'
);

CREATE TYPE "PerformanceClaimReviewOutcome" AS ENUM (
  'SUPPORTED',
  'QUALIFIED_SUPPORT',
  'NOT_SUPPORTED',
  'DEFERRED',
  'WITHDRAWN'
);

CREATE TABLE "performance_frameworks" (
  "id" UUID NOT NULL,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "institutionId" UUID NOT NULL,
  "status" "StructuralLifecycleStatus" NOT NULL DEFAULT 'ACTIVE',
  "effectiveFrom" TIMESTAMP(3),
  "effectiveUntil" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "performance_frameworks_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "metric_definitions" (
  "id" UUID NOT NULL,
  "frameworkId" UUID NOT NULL,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "purpose" TEXT NOT NULL,
  "ownerInstitutionId" UUID NOT NULL,
  "ownerDepartmentId" UUID,
  "metricCategory" "MetricCategory" NOT NULL,
  "unit" TEXT NOT NULL,
  "aggregationMethod" "MetricAggregationMethod" NOT NULL,
  "calculationMethod" "MetricCalculationMethodType" NOT NULL,
  "sourceRequirements" JSONB NOT NULL DEFAULT '[]',
  "scope" TEXT NOT NULL,
  "reportingFrequency" "MetricReportingFrequency" NOT NULL,
  "qualityRequirements" JSONB NOT NULL DEFAULT '{}',
  "baselineRequired" BOOLEAN NOT NULL DEFAULT true,
  "effectiveFrom" TIMESTAMP(3),
  "effectiveUntil" TIMESTAMP(3),
  "status" "MetricDefinitionStatus" NOT NULL DEFAULT 'DRAFT',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "metric_definitions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "metric_definition_versions" (
  "id" UUID NOT NULL,
  "metricDefinitionId" UUID NOT NULL,
  "versionNumber" INTEGER NOT NULL,
  "status" "MetricDefinitionVersionStatus" NOT NULL DEFAULT 'DRAFT',
  "formulaSpecification" JSONB NOT NULL,
  "sourceDefinitions" JSONB NOT NULL DEFAULT '[]',
  "inclusions" JSONB NOT NULL DEFAULT '[]',
  "exclusions" JSONB NOT NULL DEFAULT '[]',
  "dependencyTimeClassification" "MetricDependencyTimeClassification",
  "roundingRule" TEXT,
  "percentileMethod" TEXT,
  "dataQualityThresholds" JSONB NOT NULL DEFAULT '{}',
  "materialityThreshold" TEXT,
  "revalidationIntervalDays" INTEGER,
  "activatedAt" TIMESTAMP(3),
  "supersededAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "metric_definition_versions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "metric_baselines" (
  "id" UUID NOT NULL,
  "metricVersionId" UUID NOT NULL,
  "periodStart" TIMESTAMP(3) NOT NULL,
  "periodEnd" TIMESTAMP(3) NOT NULL,
  "sourceRecords" JSONB NOT NULL DEFAULT '[]',
  "value" TEXT,
  "method" "MetricBaselineMethod" NOT NULL,
  "qualityStatus" "MetricBaselineQualityStatus" NOT NULL,
  "limitations" TEXT,
  "approvedByIdentityId" UUID,
  "approvedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "metric_baselines_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "metric_calculation_runs" (
  "id" UUID NOT NULL,
  "metricVersionId" UUID NOT NULL,
  "periodStart" TIMESTAMP(3) NOT NULL,
  "periodEnd" TIMESTAMP(3) NOT NULL,
  "inputRecordReferences" JSONB NOT NULL DEFAULT '[]',
  "inputCount" INTEGER NOT NULL,
  "excludedRecords" JSONB NOT NULL DEFAULT '[]',
  "exclusionReasons" JSONB NOT NULL DEFAULT '[]',
  "calculationTrace" JSONB NOT NULL,
  "resultValue" TEXT,
  "qualityFindings" JSONB NOT NULL DEFAULT '[]',
  "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "softwareVersion" TEXT NOT NULL,
  "integrityHash" TEXT NOT NULL,
  CONSTRAINT "metric_calculation_runs_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "metric_observations" (
  "id" UUID NOT NULL,
  "calculationRunId" UUID NOT NULL,
  "sourceReference" TEXT NOT NULL,
  "observedValue" TEXT,
  "observedAt" TIMESTAMP(3),
  "classification" "MetricDependencyTimeClassification",
  "metadata" JSONB NOT NULL DEFAULT '{}',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "metric_observations_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "metric_dependency_classifications" (
  "id" UUID NOT NULL,
  "metricVersionId" UUID NOT NULL,
  "classification" "MetricDependencyTimeClassification" NOT NULL,
  "ruleReference" TEXT NOT NULL,
  "description" TEXT,
  "relabelRequiresRule" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "metric_dependency_classifications_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "metric_data_quality_assessments" (
  "id" UUID NOT NULL,
  "calculationRunId" UUID NOT NULL,
  "dimension" "MetricDataQualityDimension" NOT NULL,
  "result" "MetricDataQualityResult" NOT NULL,
  "findings" TEXT,
  "assessedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "metric_data_quality_assessments_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "measured_performance_claims" (
  "id" UUID NOT NULL,
  "claimReference" TEXT NOT NULL,
  "claimStatement" TEXT NOT NULL,
  "metricDefinitionVersionId" UUID NOT NULL,
  "calculationRunId" UUID NOT NULL,
  "baselineId" UUID,
  "comparisonPeriodStart" TIMESTAMP(3),
  "comparisonPeriodEnd" TIMESTAMP(3),
  "ownerIdentityId" UUID NOT NULL,
  "reviewerIdentityId" UUID,
  "status" "PerformanceClaimStatus" NOT NULL DEFAULT 'DRAFT',
  "confidence" TEXT,
  "assumptions" TEXT,
  "limitations" TEXT,
  "externalFactors" TEXT,
  "attributionClassification" "PerformanceAttributionClassification" NOT NULL DEFAULT 'NOT_ESTABLISHED',
  "evidencePacketReference" TEXT,
  "effectivePeriodStart" TIMESTAMP(3),
  "effectivePeriodEnd" TIMESTAMP(3),
  "revalidationDate" TIMESTAMP(3),
  "supersededByClaimId" UUID,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "measured_performance_claims_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "measured_performance_claim_evidence_links" (
  "id" UUID NOT NULL,
  "performanceClaimId" UUID NOT NULL,
  "evidencePacketId" UUID NOT NULL,
  "linkPurpose" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "measured_performance_claim_evidence_links_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "measured_performance_claim_reviews" (
  "id" UUID NOT NULL,
  "performanceClaimId" UUID NOT NULL,
  "reviewerIdentityId" UUID NOT NULL,
  "outcome" "PerformanceClaimReviewOutcome" NOT NULL,
  "findings" TEXT,
  "limitationsNoted" TEXT,
  "reviewedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "measured_performance_claim_reviews_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "measured_performance_claim_revalidations" (
  "id" UUID NOT NULL,
  "performanceClaimId" UUID NOT NULL,
  "reviewerIdentityId" UUID NOT NULL,
  "revalidationDate" TIMESTAMP(3) NOT NULL,
  "outcome" TEXT NOT NULL,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "measured_performance_claim_revalidations_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "performance_frameworks_code_key" ON "performance_frameworks"("code");
CREATE INDEX "performance_frameworks_institutionId_idx" ON "performance_frameworks"("institutionId");
CREATE INDEX "performance_frameworks_status_idx" ON "performance_frameworks"("status");

CREATE UNIQUE INDEX "metric_definitions_frameworkId_code_key" ON "metric_definitions"("frameworkId", "code");
CREATE INDEX "metric_definitions_frameworkId_idx" ON "metric_definitions"("frameworkId");
CREATE INDEX "metric_definitions_ownerInstitutionId_idx" ON "metric_definitions"("ownerInstitutionId");
CREATE INDEX "metric_definitions_ownerDepartmentId_idx" ON "metric_definitions"("ownerDepartmentId");
CREATE INDEX "metric_definitions_metricCategory_idx" ON "metric_definitions"("metricCategory");
CREATE INDEX "metric_definitions_status_idx" ON "metric_definitions"("status");

CREATE UNIQUE INDEX "metric_definition_versions_metricDefinitionId_versionNumber_key" ON "metric_definition_versions"("metricDefinitionId", "versionNumber");
CREATE INDEX "metric_definition_versions_metricDefinitionId_idx" ON "metric_definition_versions"("metricDefinitionId");
CREATE INDEX "metric_definition_versions_status_idx" ON "metric_definition_versions"("status");

CREATE INDEX "metric_baselines_metricVersionId_idx" ON "metric_baselines"("metricVersionId");
CREATE INDEX "metric_baselines_qualityStatus_idx" ON "metric_baselines"("qualityStatus");

CREATE INDEX "metric_calculation_runs_metricVersionId_idx" ON "metric_calculation_runs"("metricVersionId");
CREATE INDEX "metric_calculation_runs_periodStart_periodEnd_idx" ON "metric_calculation_runs"("periodStart", "periodEnd");
CREATE INDEX "metric_calculation_runs_generatedAt_idx" ON "metric_calculation_runs"("generatedAt");

CREATE INDEX "metric_observations_calculationRunId_idx" ON "metric_observations"("calculationRunId");
CREATE INDEX "metric_observations_sourceReference_idx" ON "metric_observations"("sourceReference");

CREATE UNIQUE INDEX "metric_dependency_classifications_metricVersionId_classification_key" ON "metric_dependency_classifications"("metricVersionId", "classification");
CREATE INDEX "metric_dependency_classifications_metricVersionId_idx" ON "metric_dependency_classifications"("metricVersionId");

CREATE INDEX "metric_data_quality_assessments_calculationRunId_idx" ON "metric_data_quality_assessments"("calculationRunId");
CREATE INDEX "metric_data_quality_assessments_dimension_idx" ON "metric_data_quality_assessments"("dimension");
CREATE INDEX "metric_data_quality_assessments_result_idx" ON "metric_data_quality_assessments"("result");

CREATE UNIQUE INDEX "measured_performance_claims_claimReference_key" ON "measured_performance_claims"("claimReference");
CREATE UNIQUE INDEX "measured_performance_claims_supersededByClaimId_key" ON "measured_performance_claims"("supersededByClaimId");
CREATE INDEX "measured_performance_claims_metricDefinitionVersionId_idx" ON "measured_performance_claims"("metricDefinitionVersionId");
CREATE INDEX "measured_performance_claims_calculationRunId_idx" ON "measured_performance_claims"("calculationRunId");
CREATE INDEX "measured_performance_claims_baselineId_idx" ON "measured_performance_claims"("baselineId");
CREATE INDEX "measured_performance_claims_ownerIdentityId_idx" ON "measured_performance_claims"("ownerIdentityId");
CREATE INDEX "measured_performance_claims_reviewerIdentityId_idx" ON "measured_performance_claims"("reviewerIdentityId");
CREATE INDEX "measured_performance_claims_status_idx" ON "measured_performance_claims"("status");
CREATE INDEX "measured_performance_claims_revalidationDate_idx" ON "measured_performance_claims"("revalidationDate");

CREATE UNIQUE INDEX "measured_performance_claim_evidence_links_performanceClaimId_evidencePacketId_linkPurpose_key" ON "measured_performance_claim_evidence_links"("performanceClaimId", "evidencePacketId", "linkPurpose");
CREATE INDEX "measured_performance_claim_evidence_links_performanceClaimId_idx" ON "measured_performance_claim_evidence_links"("performanceClaimId");
CREATE INDEX "measured_performance_claim_evidence_links_evidencePacketId_idx" ON "measured_performance_claim_evidence_links"("evidencePacketId");

CREATE INDEX "measured_performance_claim_reviews_performanceClaimId_idx" ON "measured_performance_claim_reviews"("performanceClaimId");
CREATE INDEX "measured_performance_claim_reviews_reviewerIdentityId_idx" ON "measured_performance_claim_reviews"("reviewerIdentityId");

CREATE INDEX "measured_performance_claim_revalidations_performanceClaimId_idx" ON "measured_performance_claim_revalidations"("performanceClaimId");
CREATE INDEX "measured_performance_claim_revalidations_revalidationDate_idx" ON "measured_performance_claim_revalidations"("revalidationDate");

ALTER TABLE "performance_frameworks" ADD CONSTRAINT "performance_frameworks_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "institutions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "metric_definitions" ADD CONSTRAINT "metric_definitions_frameworkId_fkey" FOREIGN KEY ("frameworkId") REFERENCES "performance_frameworks"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "metric_definitions" ADD CONSTRAINT "metric_definitions_ownerInstitutionId_fkey" FOREIGN KEY ("ownerInstitutionId") REFERENCES "institutions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "metric_definitions" ADD CONSTRAINT "metric_definitions_ownerDepartmentId_fkey" FOREIGN KEY ("ownerDepartmentId") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "metric_definition_versions" ADD CONSTRAINT "metric_definition_versions_metricDefinitionId_fkey" FOREIGN KEY ("metricDefinitionId") REFERENCES "metric_definitions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "metric_baselines" ADD CONSTRAINT "metric_baselines_metricVersionId_fkey" FOREIGN KEY ("metricVersionId") REFERENCES "metric_definition_versions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "metric_baselines" ADD CONSTRAINT "metric_baselines_approvedByIdentityId_fkey" FOREIGN KEY ("approvedByIdentityId") REFERENCES "identities"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "metric_calculation_runs" ADD CONSTRAINT "metric_calculation_runs_metricVersionId_fkey" FOREIGN KEY ("metricVersionId") REFERENCES "metric_definition_versions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "metric_observations" ADD CONSTRAINT "metric_observations_calculationRunId_fkey" FOREIGN KEY ("calculationRunId") REFERENCES "metric_calculation_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "metric_dependency_classifications" ADD CONSTRAINT "metric_dependency_classifications_metricVersionId_fkey" FOREIGN KEY ("metricVersionId") REFERENCES "metric_definition_versions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "metric_data_quality_assessments" ADD CONSTRAINT "metric_data_quality_assessments_calculationRunId_fkey" FOREIGN KEY ("calculationRunId") REFERENCES "metric_calculation_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "measured_performance_claims" ADD CONSTRAINT "measured_performance_claims_metricDefinitionVersionId_fkey" FOREIGN KEY ("metricDefinitionVersionId") REFERENCES "metric_definition_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "measured_performance_claims" ADD CONSTRAINT "measured_performance_claims_calculationRunId_fkey" FOREIGN KEY ("calculationRunId") REFERENCES "metric_calculation_runs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "measured_performance_claims" ADD CONSTRAINT "measured_performance_claims_baselineId_fkey" FOREIGN KEY ("baselineId") REFERENCES "metric_baselines"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "measured_performance_claims" ADD CONSTRAINT "measured_performance_claims_ownerIdentityId_fkey" FOREIGN KEY ("ownerIdentityId") REFERENCES "identities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "measured_performance_claims" ADD CONSTRAINT "measured_performance_claims_reviewerIdentityId_fkey" FOREIGN KEY ("reviewerIdentityId") REFERENCES "identities"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "measured_performance_claims" ADD CONSTRAINT "measured_performance_claims_supersededByClaimId_fkey" FOREIGN KEY ("supersededByClaimId") REFERENCES "measured_performance_claims"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "measured_performance_claim_evidence_links" ADD CONSTRAINT "measured_performance_claim_evidence_links_performanceClaimId_fkey" FOREIGN KEY ("performanceClaimId") REFERENCES "measured_performance_claims"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "measured_performance_claim_evidence_links" ADD CONSTRAINT "measured_performance_claim_evidence_links_evidencePacketId_fkey" FOREIGN KEY ("evidencePacketId") REFERENCES "evidence_packets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "measured_performance_claim_reviews" ADD CONSTRAINT "measured_performance_claim_reviews_performanceClaimId_fkey" FOREIGN KEY ("performanceClaimId") REFERENCES "measured_performance_claims"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "measured_performance_claim_reviews" ADD CONSTRAINT "measured_performance_claim_reviews_reviewerIdentityId_fkey" FOREIGN KEY ("reviewerIdentityId") REFERENCES "identities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "measured_performance_claim_revalidations" ADD CONSTRAINT "measured_performance_claim_revalidations_performanceClaimId_fkey" FOREIGN KEY ("performanceClaimId") REFERENCES "measured_performance_claims"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "measured_performance_claim_revalidations" ADD CONSTRAINT "measured_performance_claim_revalidations_reviewerIdentityId_fkey" FOREIGN KEY ("reviewerIdentityId") REFERENCES "identities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
