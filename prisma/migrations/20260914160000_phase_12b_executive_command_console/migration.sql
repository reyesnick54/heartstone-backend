-- Phase 12B: Executive Command Console and Departmental Intelligence

CREATE TYPE "DashboardConsoleType" AS ENUM ('EXECUTIVE_COMMAND', 'DEPARTMENTAL', 'SERVICE_OPERATIONS');
CREATE TYPE "DashboardDefinitionStatus" AS ENUM ('DRAFT', 'ACTIVE', 'SUSPENDED', 'RETIRED');
CREATE TYPE "DashboardVersionStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'SUPERSEDED', 'RETIRED');
CREATE TYPE "DashboardWidgetType" AS ENUM ('INDICATOR_TILE', 'INDICATOR_LIST', 'FILTER_PANEL', 'SUMMARY_TABLE', 'TREND_CHART', 'DRILLDOWN_PANEL');
CREATE TYPE "DashboardIndicatorCategory" AS ENUM (
  'SERVICE_VOLUMES', 'PENDING_DECISIONS', 'APPROACHING_DEADLINES', 'STRATEGIC_PROJECTS',
  'AUTHORITY_QUESTIONS', 'GOVERNMENT_DEPENDENCIES', 'APPROVAL_BOTTLENECKS', 'EVIDENCE_DEFICIENCIES',
  'COMPLIANCE_OBLIGATIONS', 'CORRECTIVE_ACTIONS', 'WORKFORCE_CONSTRAINTS', 'FINANCIAL_DEPENDENCIES',
  'INTEGRATION_CONDITIONS', 'SECURITY_CONDITIONS', 'CONTINUITY_ISSUES', 'REDRESS_BACKLOG',
  'INSTITUTIONAL_PERFORMANCE', 'EXECUTIVE_ESCALATION', 'ASSIGNED_CASES', 'UNASSIGNED_CASES',
  'INTAKE', 'COMPLETENESS', 'REVIEWS', 'INSPECTIONS', 'GOVERNMENT_REFERRALS', 'PROFESSIONAL_REPORTS',
  'DECISION_PACKETS', 'CONDITIONS', 'COMPLIANCE_MATTERS', 'APPEALS', 'RENEWALS', 'SERVICE_DEADLINES',
  'STAFF_WORKLOAD', 'DEPENDENCIES'
);
CREATE TYPE "DashboardColorSemantic" AS ENUM ('NEUTRAL', 'INFORMATIONAL', 'ATTENTION', 'ELEVATED', 'CRITICAL', 'POSITIVE_PRESENTATION', 'CAUTION_PRESENTATION');
CREATE TYPE "DashboardDataQuality" AS ENUM ('VERIFIED', 'REPORTED', 'ACHIEVED', 'ESTIMATED', 'DISPUTED', 'MODELED', 'EXTERNAL_REPORTED', 'STALE_CACHED');
CREATE TYPE "DashboardStalenessState" AS ENUM ('FRESH', 'APPROACHING_STALE', 'STALE', 'SOURCE_UNAVAILABLE');
CREATE TYPE "DashboardSourceAvailability" AS ENUM ('AVAILABLE', 'PARTIALLY_AVAILABLE', 'UNAVAILABLE', 'DEGRADED');
CREATE TYPE "DashboardAccessPurpose" AS ENUM ('OPERATIONAL_OVERSIGHT', 'EXECUTIVE_BRIEFING', 'DEPARTMENT_MANAGEMENT', 'CASE_WORK', 'AUDIT_REVIEW', 'TECHNICAL_OPERATIONS');
CREATE TYPE "DashboardSensitivityLevel" AS ENUM ('PUBLIC_SUMMARY', 'OFFICIAL', 'RESTRICTED', 'HIGHLY_RESTRICTED');
CREATE TYPE "DashboardFilterDimension" AS ENUM ('DEPARTMENT', 'SERVICE', 'PROJECT', 'SECTOR', 'GEOGRAPHY', 'OWNER', 'AUTHORITY_STATUS', 'RISK_LEVEL', 'DEADLINE', 'EVIDENCE_STATUS', 'DECISION_GATE', 'EXTERNAL_DEPENDENCY');
CREATE TYPE "DashboardDrilldownReferenceType" AS ENUM ('METRIC_DEFINITION', 'CALCULATION_RUN', 'UNDERLYING_RECORD', 'EVIDENCE_PACKET', 'SOURCE_STATUS');
CREATE TYPE "DashboardQueryAuditResult" AS ENUM ('GRANTED', 'DENIED_INSUFFICIENT_PURPOSE', 'DENIED_SENSITIVITY', 'DENIED_INSTITUTIONAL_BOUNDARY', 'DENIED_TECHNICAL_ONLY', 'DENIED_DEPARTMENT_SCOPE');
CREATE TYPE "DashboardStatusDictionaryOwnerType" AS ENUM ('PLATFORM', 'INSTITUTION', 'DEPARTMENT');

CREATE TABLE "dashboard_status_dictionary_entries" (
  "id" UUID NOT NULL,
  "code" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "meaning" TEXT NOT NULL,
  "colorSemantic" "DashboardColorSemantic" NOT NULL,
  "sourceRequirements" JSONB NOT NULL DEFAULT '[]',
  "calculationRule" TEXT NOT NULL,
  "limitations" TEXT NOT NULL,
  "permittedTransitions" JSONB NOT NULL DEFAULT '[]',
  "stalenessRule" TEXT NOT NULL,
  "ownerType" "DashboardStatusDictionaryOwnerType" NOT NULL,
  "ownerReference" TEXT NOT NULL,
  "version" INTEGER NOT NULL DEFAULT 1,
  "institutionId" UUID,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "dashboard_status_dictionary_entries_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "dashboard_definitions" (
  "id" UUID NOT NULL,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "consoleType" "DashboardConsoleType" NOT NULL,
  "status" "DashboardDefinitionStatus" NOT NULL DEFAULT 'DRAFT',
  "institutionId" UUID,
  "departmentId" UUID,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "dashboard_definitions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "dashboard_versions" (
  "id" UUID NOT NULL,
  "dashboardDefinitionId" UUID NOT NULL,
  "versionNumber" INTEGER NOT NULL,
  "status" "DashboardVersionStatus" NOT NULL DEFAULT 'DRAFT',
  "filterDimensions" "DashboardFilterDimension"[],
  "effectiveFrom" TIMESTAMP(3),
  "effectiveUntil" TIMESTAMP(3),
  "projectionDisclaimer" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "dashboard_versions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "dashboard_indicator_definitions" (
  "id" UUID NOT NULL,
  "code" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "category" "DashboardIndicatorCategory" NOT NULL,
  "statusDictionaryEntryId" UUID NOT NULL,
  "calculationRuleRef" TEXT NOT NULL,
  "sourceRequirements" JSONB NOT NULL DEFAULT '[]',
  "requiresEvidencePacket" BOOLEAN NOT NULL DEFAULT false,
  "drilldownRequired" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "dashboard_indicator_definitions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "dashboard_widget_definitions" (
  "id" UUID NOT NULL,
  "dashboardVersionId" UUID NOT NULL,
  "code" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "widgetType" "DashboardWidgetType" NOT NULL,
  "indicatorDefinitionId" UUID,
  "displayOrder" INTEGER NOT NULL DEFAULT 0,
  "filterConfig" JSONB NOT NULL DEFAULT '{}',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "dashboard_widget_definitions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "dashboard_indicator_projections" (
  "id" UUID NOT NULL,
  "indicatorDefinitionId" UUID NOT NULL,
  "dashboardVersionId" UUID NOT NULL,
  "statusDictionaryEntryId" UUID NOT NULL,
  "institutionId" UUID,
  "departmentId" UUID,
  "caseId" UUID,
  "countValue" INTEGER NOT NULL DEFAULT 0,
  "scoreValue" DOUBLE PRECISION,
  "displayLabel" TEXT NOT NULL,
  "dataQuality" "DashboardDataQuality" NOT NULL,
  "calculatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "sourceFreshness" TIMESTAMP(3),
  "staleAfter" TIMESTAMP(3),
  "currentStaleness" "DashboardStalenessState" NOT NULL DEFAULT 'FRESH',
  "sourceAvailability" "DashboardSourceAvailability" NOT NULL DEFAULT 'AVAILABLE',
  "limitations" TEXT,
  "ownerIdentityId" UUID,
  "effectiveDate" TIMESTAMP(3),
  "lastRefresh" TIMESTAMP(3),
  "revalidationDate" TIMESTAMP(3),
  "projectionVersion" INTEGER NOT NULL DEFAULT 1,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "dashboard_indicator_projections_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "dashboard_drilldown_references" (
  "id" UUID NOT NULL,
  "indicatorProjectionId" UUID NOT NULL,
  "referenceType" "DashboardDrilldownReferenceType" NOT NULL,
  "referenceId" UUID NOT NULL,
  "referenceLabel" TEXT NOT NULL,
  "evidencePacketId" UUID,
  "sourceStatus" TEXT NOT NULL,
  "ownerReference" TEXT NOT NULL,
  "effectiveDate" TIMESTAMP(3),
  "lastRefresh" TIMESTAMP(3),
  "revalidationDate" TIMESTAMP(3),
  "limitations" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "dashboard_drilldown_references_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "dashboard_snapshots" (
  "id" UUID NOT NULL,
  "dashboardVersionId" UUID NOT NULL,
  "capturedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "capturedByIdentityId" UUID NOT NULL,
  "snapshotPayload" JSONB NOT NULL,
  "snapshotHash" TEXT NOT NULL,
  "replayToken" TEXT NOT NULL,
  "isImmutable" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "dashboard_snapshots_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "dashboard_query_audits" (
  "id" UUID NOT NULL,
  "identityId" UUID NOT NULL,
  "dashboardDefinitionId" UUID,
  "dashboardVersionId" UUID,
  "institutionId" UUID,
  "departmentId" UUID,
  "purpose" "DashboardAccessPurpose" NOT NULL,
  "sensitivityScope" "DashboardSensitivityLevel" NOT NULL,
  "technicalPermissionOnly" BOOLEAN NOT NULL DEFAULT false,
  "queryFilters" JSONB NOT NULL DEFAULT '{}',
  "accessResult" "DashboardQueryAuditResult" NOT NULL,
  "resultSummary" TEXT,
  "queriedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "dashboard_query_audits_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "dashboard_access_policies" (
  "id" UUID NOT NULL,
  "dashboardDefinitionId" UUID NOT NULL,
  "identityId" UUID,
  "institutionId" UUID,
  "departmentId" UUID,
  "caseAssignmentRequired" BOOLEAN NOT NULL DEFAULT false,
  "purpose" "DashboardAccessPurpose" NOT NULL,
  "sensitivityLevel" "DashboardSensitivityLevel" NOT NULL,
  "securityClearanceLevel" TEXT,
  "technicalPermissionCode" TEXT,
  "requiresInstitutionalBoundary" BOOLEAN NOT NULL DEFAULT true,
  "substantiveAccessRequired" BOOLEAN NOT NULL DEFAULT true,
  "effectiveFrom" TIMESTAMP(3),
  "effectiveUntil" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "dashboard_access_policies_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "dashboard_status_dictionary_entries_code_version_institutionId_key" ON "dashboard_status_dictionary_entries"("code", "version", "institutionId");
CREATE INDEX "dashboard_status_dictionary_entries_institutionId_idx" ON "dashboard_status_dictionary_entries"("institutionId");
CREATE INDEX "dashboard_status_dictionary_entries_isActive_idx" ON "dashboard_status_dictionary_entries"("isActive");

CREATE UNIQUE INDEX "dashboard_definitions_code_institutionId_departmentId_key" ON "dashboard_definitions"("code", "institutionId", "departmentId");
CREATE INDEX "dashboard_definitions_consoleType_idx" ON "dashboard_definitions"("consoleType");
CREATE INDEX "dashboard_definitions_institutionId_idx" ON "dashboard_definitions"("institutionId");
CREATE INDEX "dashboard_definitions_departmentId_idx" ON "dashboard_definitions"("departmentId");

CREATE UNIQUE INDEX "dashboard_versions_dashboardDefinitionId_versionNumber_key" ON "dashboard_versions"("dashboardDefinitionId", "versionNumber");
CREATE INDEX "dashboard_versions_status_idx" ON "dashboard_versions"("status");

CREATE UNIQUE INDEX "dashboard_indicator_definitions_code_key" ON "dashboard_indicator_definitions"("code");
CREATE INDEX "dashboard_indicator_definitions_category_idx" ON "dashboard_indicator_definitions"("category");
CREATE INDEX "dashboard_indicator_definitions_statusDictionaryEntryId_idx" ON "dashboard_indicator_definitions"("statusDictionaryEntryId");

CREATE UNIQUE INDEX "dashboard_widget_definitions_dashboardVersionId_code_key" ON "dashboard_widget_definitions"("dashboardVersionId", "code");
CREATE INDEX "dashboard_widget_definitions_indicatorDefinitionId_idx" ON "dashboard_widget_definitions"("indicatorDefinitionId");

CREATE INDEX "dashboard_indicator_projections_indicatorDefinitionId_idx" ON "dashboard_indicator_projections"("indicatorDefinitionId");
CREATE INDEX "dashboard_indicator_projections_dashboardVersionId_idx" ON "dashboard_indicator_projections"("dashboardVersionId");
CREATE INDEX "dashboard_indicator_projections_departmentId_idx" ON "dashboard_indicator_projections"("departmentId");
CREATE INDEX "dashboard_indicator_projections_institutionId_idx" ON "dashboard_indicator_projections"("institutionId");
CREATE INDEX "dashboard_indicator_projections_currentStaleness_idx" ON "dashboard_indicator_projections"("currentStaleness");

CREATE INDEX "dashboard_drilldown_references_indicatorProjectionId_idx" ON "dashboard_drilldown_references"("indicatorProjectionId");
CREATE INDEX "dashboard_drilldown_references_referenceType_idx" ON "dashboard_drilldown_references"("referenceType");
CREATE INDEX "dashboard_drilldown_references_referenceId_idx" ON "dashboard_drilldown_references"("referenceId");

CREATE UNIQUE INDEX "dashboard_snapshots_replayToken_key" ON "dashboard_snapshots"("replayToken");
CREATE INDEX "dashboard_snapshots_dashboardVersionId_idx" ON "dashboard_snapshots"("dashboardVersionId");
CREATE INDEX "dashboard_snapshots_capturedAt_idx" ON "dashboard_snapshots"("capturedAt");

CREATE INDEX "dashboard_query_audits_identityId_idx" ON "dashboard_query_audits"("identityId");
CREATE INDEX "dashboard_query_audits_dashboardDefinitionId_idx" ON "dashboard_query_audits"("dashboardDefinitionId");
CREATE INDEX "dashboard_query_audits_queriedAt_idx" ON "dashboard_query_audits"("queriedAt");

CREATE INDEX "dashboard_access_policies_dashboardDefinitionId_idx" ON "dashboard_access_policies"("dashboardDefinitionId");
CREATE INDEX "dashboard_access_policies_identityId_idx" ON "dashboard_access_policies"("identityId");
CREATE INDEX "dashboard_access_policies_institutionId_idx" ON "dashboard_access_policies"("institutionId");
CREATE INDEX "dashboard_access_policies_departmentId_idx" ON "dashboard_access_policies"("departmentId");

ALTER TABLE "dashboard_status_dictionary_entries" ADD CONSTRAINT "dashboard_status_dictionary_entries_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "institutions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "dashboard_definitions" ADD CONSTRAINT "dashboard_definitions_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "institutions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "dashboard_definitions" ADD CONSTRAINT "dashboard_definitions_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "dashboard_versions" ADD CONSTRAINT "dashboard_versions_dashboardDefinitionId_fkey" FOREIGN KEY ("dashboardDefinitionId") REFERENCES "dashboard_definitions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "dashboard_indicator_definitions" ADD CONSTRAINT "dashboard_indicator_definitions_statusDictionaryEntryId_fkey" FOREIGN KEY ("statusDictionaryEntryId") REFERENCES "dashboard_status_dictionary_entries"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "dashboard_widget_definitions" ADD CONSTRAINT "dashboard_widget_definitions_dashboardVersionId_fkey" FOREIGN KEY ("dashboardVersionId") REFERENCES "dashboard_versions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "dashboard_widget_definitions" ADD CONSTRAINT "dashboard_widget_definitions_indicatorDefinitionId_fkey" FOREIGN KEY ("indicatorDefinitionId") REFERENCES "dashboard_indicator_definitions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "dashboard_indicator_projections" ADD CONSTRAINT "dashboard_indicator_projections_indicatorDefinitionId_fkey" FOREIGN KEY ("indicatorDefinitionId") REFERENCES "dashboard_indicator_definitions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "dashboard_indicator_projections" ADD CONSTRAINT "dashboard_indicator_projections_dashboardVersionId_fkey" FOREIGN KEY ("dashboardVersionId") REFERENCES "dashboard_versions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "dashboard_indicator_projections" ADD CONSTRAINT "dashboard_indicator_projections_statusDictionaryEntryId_fkey" FOREIGN KEY ("statusDictionaryEntryId") REFERENCES "dashboard_status_dictionary_entries"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "dashboard_indicator_projections" ADD CONSTRAINT "dashboard_indicator_projections_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "institutions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "dashboard_indicator_projections" ADD CONSTRAINT "dashboard_indicator_projections_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "dashboard_indicator_projections" ADD CONSTRAINT "dashboard_indicator_projections_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "cases"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "dashboard_indicator_projections" ADD CONSTRAINT "dashboard_indicator_projections_ownerIdentityId_fkey" FOREIGN KEY ("ownerIdentityId") REFERENCES "identities"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "dashboard_drilldown_references" ADD CONSTRAINT "dashboard_drilldown_references_indicatorProjectionId_fkey" FOREIGN KEY ("indicatorProjectionId") REFERENCES "dashboard_indicator_projections"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "dashboard_drilldown_references" ADD CONSTRAINT "dashboard_drilldown_references_evidencePacketId_fkey" FOREIGN KEY ("evidencePacketId") REFERENCES "evidence_packets"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "dashboard_snapshots" ADD CONSTRAINT "dashboard_snapshots_dashboardVersionId_fkey" FOREIGN KEY ("dashboardVersionId") REFERENCES "dashboard_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "dashboard_snapshots" ADD CONSTRAINT "dashboard_snapshots_capturedByIdentityId_fkey" FOREIGN KEY ("capturedByIdentityId") REFERENCES "identities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "dashboard_query_audits" ADD CONSTRAINT "dashboard_query_audits_identityId_fkey" FOREIGN KEY ("identityId") REFERENCES "identities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "dashboard_query_audits" ADD CONSTRAINT "dashboard_query_audits_dashboardDefinitionId_fkey" FOREIGN KEY ("dashboardDefinitionId") REFERENCES "dashboard_definitions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "dashboard_query_audits" ADD CONSTRAINT "dashboard_query_audits_dashboardVersionId_fkey" FOREIGN KEY ("dashboardVersionId") REFERENCES "dashboard_versions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "dashboard_access_policies" ADD CONSTRAINT "dashboard_access_policies_dashboardDefinitionId_fkey" FOREIGN KEY ("dashboardDefinitionId") REFERENCES "dashboard_definitions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "dashboard_access_policies" ADD CONSTRAINT "dashboard_access_policies_identityId_fkey" FOREIGN KEY ("identityId") REFERENCES "identities"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "dashboard_access_policies" ADD CONSTRAINT "dashboard_access_policies_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "institutions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "dashboard_access_policies" ADD CONSTRAINT "dashboard_access_policies_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;
