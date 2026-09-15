-- Phase 13C: Production Reliability, Observability, Performance and Service Health

CREATE TYPE "ServiceReliabilityDefinitionStatus" AS ENUM ('DRAFT', 'ACTIVE', 'SUSPENDED', 'ARCHIVED');
CREATE TYPE "ServiceLevelObjectiveStatus" AS ENUM ('DRAFT', 'APPROVED', 'ACTIVE', 'SUSPENDED', 'RETIRED');
CREATE TYPE "ServiceLevelIndicatorType" AS ENUM (
  'AVAILABILITY',
  'LATENCY',
  'ERROR_RATE',
  'QUEUE_DEPTH',
  'WORKFLOW_THROUGHPUT',
  'DATABASE_PERFORMANCE',
  'INTEGRATION_AVAILABILITY',
  'NOTIFICATION_DELIVERY',
  'PAYMENT_PROCESSING',
  'EVIDENCE_STORAGE',
  'AI_SERVICE_AVAILABILITY',
  'BACKGROUND_JOBS'
);
CREATE TYPE "SliMeasurementStatus" AS ENUM ('RECORDED', 'QUALIFIED', 'STALE', 'DISPUTED');
CREATE TYPE "TechnicalHealthState" AS ENUM ('LIVE', 'READY', 'DEGRADED', 'NOT_READY');
CREATE TYPE "DependencyType" AS ENUM (
  'DATABASE',
  'CACHE',
  'STORAGE',
  'EXTERNAL_INTEGRATION',
  'PAYMENT_PROVIDER',
  'NOTIFICATION_PROVIDER',
  'AI_PROVIDER',
  'IDENTITY_PROVIDER'
);
CREATE TYPE "DependencyHealthState" AS ENUM ('HEALTHY', 'DEGRADED', 'UNAVAILABLE', 'UNKNOWN', 'STALE');
CREATE TYPE "CapacityProfileStatus" AS ENUM ('DRAFT', 'ACTIVE', 'SUPERSEDED', 'ARCHIVED');
CREATE TYPE "CapacityAssessmentStatus" AS ENUM ('DRAFT', 'UNDER_REVIEW', 'APPROVED', 'ACTIVE', 'SUPERSEDED');
CREATE TYPE "PerformanceTestScenarioType" AS ENUM (
  'NORMAL',
  'PEAK',
  'BURST',
  'DEGRADED',
  'LARGE_DOCUMENT',
  'HIGH_CONCURRENCY',
  'QUEUE_BACKLOG',
  'SLOW_EXTERNAL_DEPENDENCY'
);
CREATE TYPE "PerformanceTestRunStatus" AS ENUM ('PLANNED', 'RUNNING', 'COMPLETED', 'FAILED', 'ABORTED');
CREATE TYPE "LoadTestRunStatus" AS ENUM ('PLANNED', 'RUNNING', 'COMPLETED', 'FAILED', 'ABORTED', 'BLOCKED_UNSAFE_TARGET');
CREATE TYPE "StressTestRunStatus" AS ENUM ('PLANNED', 'RUNNING', 'COMPLETED', 'FAILED', 'ABORTED', 'BLOCKED_UNSAFE_TARGET');
CREATE TYPE "ResourceSaturationLevel" AS ENUM ('NORMAL', 'ELEVATED', 'HIGH', 'CRITICAL', 'EXHAUSTED');
CREATE TYPE "OperationalHealthEventType" AS ENUM (
  'DEGRADATION',
  'RECOVERY',
  'CAPACITY_WARNING',
  'DEPENDENCY_FAILURE',
  'SLO_BREACH_SIGNAL',
  'RATE_LIMIT_PRESSURE',
  'PERFORMANCE_ANOMALY',
  'OTHER'
);
CREATE TYPE "ObservabilitySignalType" AS ENUM ('STRUCTURED_LOG', 'METRIC', 'TRACE', 'HEALTH_CHECK', 'DEPENDENCY_HEALTH');
CREATE TYPE "LogClassification" AS ENUM ('PUBLIC', 'OPERATIONAL', 'SECURITY_SENSITIVE', 'RESTRICTED', 'PII_RESTRICTED');
CREATE TYPE "OperationalAlertRuleStatus" AS ENUM ('DRAFT', 'ACTIVE', 'SUSPENDED', 'ARCHIVED');
CREATE TYPE "OperationalAlertSeverity" AS ENUM ('INFO', 'WARNING', 'CRITICAL');
CREATE TYPE "OperationalAlertEventStatus" AS ENUM ('FIRED', 'ACKNOWLEDGED', 'ESCALATED', 'RESOLVED', 'SUPPRESSED', 'FALSE_POSITIVE');
CREATE TYPE "OperationalRunbookStatus" AS ENUM ('DRAFT', 'ACTIVE', 'ARCHIVED');
CREATE TYPE "SupportEscalationRuleStatus" AS ENUM ('DRAFT', 'ACTIVE', 'SUSPENDED', 'ARCHIVED');
CREATE TYPE "RateLimitScope" AS ENUM ('AUTHENTICATION', 'PUBLIC_VERIFICATION', 'SEARCH', 'UPLOAD', 'WEBHOOK', 'ANALYTICS_AI');

CREATE TABLE "service_reliability_definitions" (
  "id" UUID NOT NULL,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "status" "ServiceReliabilityDefinitionStatus" NOT NULL DEFAULT 'DRAFT',
  "serviceReference" TEXT NOT NULL,
  "institutionalDisclaimer" TEXT NOT NULL DEFAULT 'Technical reliability definitions do not establish institutional service acceptance or legal authority.',
  "correlationId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "service_reliability_definitions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "service_level_objectives" (
  "id" UUID NOT NULL,
  "reliabilityDefinitionId" UUID NOT NULL,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "status" "ServiceLevelObjectiveStatus" NOT NULL DEFAULT 'DRAFT',
  "approvedTargetValue" TEXT NOT NULL,
  "approvedTargetUnit" TEXT NOT NULL,
  "approvedTargetReference" TEXT NOT NULL,
  "evaluationWindow" TEXT NOT NULL,
  "notGuaranteedDisclaimer" TEXT NOT NULL DEFAULT 'Configured service target is not a contractual SLA or guaranteed availability.',
  "effectiveFrom" TIMESTAMP(3) NOT NULL,
  "effectiveUntil" TIMESTAMP(3),
  "correlationId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "service_level_objectives_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "service_level_indicators" (
  "id" UUID NOT NULL,
  "objectiveId" UUID NOT NULL,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "indicatorType" "ServiceLevelIndicatorType" NOT NULL,
  "measurementUnit" TEXT NOT NULL,
  "approvedThreshold" TEXT NOT NULL,
  "approvedThresholdRef" TEXT NOT NULL,
  "correlationId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "service_level_indicators_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "availability_measurements" (
  "id" UUID NOT NULL,
  "objectiveId" UUID NOT NULL,
  "indicatorId" UUID NOT NULL,
  "measuredValue" TEXT NOT NULL,
  "measurementStatus" "SliMeasurementStatus" NOT NULL DEFAULT 'RECORDED',
  "windowStart" TIMESTAMP(3) NOT NULL,
  "windowEnd" TIMESTAMP(3) NOT NULL,
  "isHttp200Only" BOOLEAN NOT NULL DEFAULT false,
  "notes" TEXT,
  "correlationId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "availability_measurements_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "latency_measurements" (
  "id" UUID NOT NULL,
  "objectiveId" UUID NOT NULL,
  "indicatorId" UUID NOT NULL,
  "measuredValueMs" DOUBLE PRECISION NOT NULL,
  "measurementStatus" "SliMeasurementStatus" NOT NULL DEFAULT 'RECORDED',
  "percentile" TEXT,
  "windowStart" TIMESTAMP(3) NOT NULL,
  "windowEnd" TIMESTAMP(3) NOT NULL,
  "notes" TEXT,
  "correlationId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "latency_measurements_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "capacity_profiles" (
  "id" UUID NOT NULL,
  "reliabilityDefinitionId" UUID NOT NULL,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "status" "CapacityProfileStatus" NOT NULL DEFAULT 'DRAFT',
  "expectedUsers" INTEGER,
  "concurrentSessions" INTEGER,
  "requestsPerMinute" INTEGER,
  "caseVolumePerDay" INTEGER,
  "documentVolumePerDay" INTEGER,
  "storageBytes" BIGINT,
  "integrationThroughput" INTEGER,
  "notificationThroughput" INTEGER,
  "paymentThroughput" INTEGER,
  "aiWorkloadUnits" INTEGER,
  "effectiveFrom" TIMESTAMP(3) NOT NULL,
  "effectiveUntil" TIMESTAMP(3),
  "correlationId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "capacity_profiles_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "capacity_assessments" (
  "id" UUID NOT NULL,
  "profileId" UUID NOT NULL,
  "assessmentNumber" TEXT NOT NULL,
  "status" "CapacityAssessmentStatus" NOT NULL DEFAULT 'DRAFT',
  "assessedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "findings" TEXT NOT NULL,
  "headroomPercent" DOUBLE PRECISION,
  "exhaustionRisk" BOOLEAN NOT NULL DEFAULT false,
  "safeFailApplied" BOOLEAN NOT NULL DEFAULT false,
  "correlationId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "capacity_assessments_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "performance_test_runs" (
  "id" UUID NOT NULL,
  "reliabilityDefinitionId" UUID NOT NULL,
  "runNumber" TEXT NOT NULL,
  "scenarioType" "PerformanceTestScenarioType" NOT NULL,
  "status" "PerformanceTestRunStatus" NOT NULL DEFAULT 'PLANNED',
  "targetEnvironment" TEXT NOT NULL,
  "usesProductionData" BOOLEAN NOT NULL DEFAULT false,
  "productionDataApproved" BOOLEAN NOT NULL DEFAULT false,
  "startedAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "summary" TEXT,
  "correlationId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "performance_test_runs_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "load_test_runs" (
  "id" UUID NOT NULL,
  "reliabilityDefinitionId" UUID NOT NULL,
  "runNumber" TEXT NOT NULL,
  "scenarioType" "PerformanceTestScenarioType" NOT NULL,
  "status" "LoadTestRunStatus" NOT NULL DEFAULT 'PLANNED',
  "targetEnvironment" TEXT NOT NULL,
  "isProductionTarget" BOOLEAN NOT NULL DEFAULT false,
  "productionTestAuthorized" BOOLEAN NOT NULL DEFAULT false,
  "virtualUsers" INTEGER,
  "durationSeconds" INTEGER,
  "startedAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "summary" TEXT,
  "correlationId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "load_test_runs_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "stress_test_runs" (
  "id" UUID NOT NULL,
  "reliabilityDefinitionId" UUID NOT NULL,
  "runNumber" TEXT NOT NULL,
  "scenarioType" "PerformanceTestScenarioType" NOT NULL,
  "status" "StressTestRunStatus" NOT NULL DEFAULT 'PLANNED',
  "targetEnvironment" TEXT NOT NULL,
  "isProductionTarget" BOOLEAN NOT NULL DEFAULT false,
  "productionTestAuthorized" BOOLEAN NOT NULL DEFAULT false,
  "peakMultiplier" DOUBLE PRECISION,
  "startedAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "summary" TEXT,
  "correlationId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "stress_test_runs_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "resource_saturation_records" (
  "id" UUID NOT NULL,
  "profileId" UUID NOT NULL,
  "resourceType" TEXT NOT NULL,
  "saturationLevel" "ResourceSaturationLevel" NOT NULL,
  "utilizationPercent" DOUBLE PRECISION NOT NULL,
  "safeFailTriggered" BOOLEAN NOT NULL DEFAULT false,
  "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "notes" TEXT,
  "correlationId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "resource_saturation_records_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "operational_health_events" (
  "id" UUID NOT NULL,
  "eventNumber" TEXT NOT NULL,
  "eventType" "OperationalHealthEventType" NOT NULL,
  "technicalHealthState" "TechnicalHealthState" NOT NULL,
  "dependencyType" "DependencyType",
  "dependencyReference" TEXT,
  "dependencyHealthState" "DependencyHealthState",
  "isStaleIntegration" BOOLEAN NOT NULL DEFAULT false,
  "affectedCapabilityRef" TEXT,
  "summary" TEXT NOT NULL,
  "notInstitutionalStatus" BOOLEAN NOT NULL DEFAULT true,
  "correlationId" TEXT,
  "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "operational_health_events_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "observability_signal_definitions" (
  "id" UUID NOT NULL,
  "reliabilityDefinitionId" UUID NOT NULL,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "signalType" "ObservabilitySignalType" NOT NULL,
  "logClassification" "LogClassification" NOT NULL DEFAULT 'OPERATIONAL',
  "redactionPolicy" JSONB NOT NULL DEFAULT '[]',
  "correlationPropagation" BOOLEAN NOT NULL DEFAULT true,
  "metricName" TEXT,
  "traceSpanName" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "observability_signal_definitions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "operational_runbooks" (
  "id" UUID NOT NULL,
  "reliabilityDefinitionId" UUID NOT NULL,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "status" "OperationalRunbookStatus" NOT NULL DEFAULT 'DRAFT',
  "scenarioType" TEXT NOT NULL,
  "procedureMarkdown" TEXT NOT NULL,
  "escalationNotes" TEXT,
  "correlationId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "operational_runbooks_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "operational_alert_rules" (
  "id" UUID NOT NULL,
  "reliabilityDefinitionId" UUID NOT NULL,
  "objectiveId" UUID,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "status" "OperationalAlertRuleStatus" NOT NULL DEFAULT 'DRAFT',
  "severity" "OperationalAlertSeverity" NOT NULL,
  "conditionDescription" TEXT NOT NULL,
  "thresholdConfig" JSONB NOT NULL,
  "isIncident" BOOLEAN NOT NULL DEFAULT false,
  "notInstitutionalDecision" BOOLEAN NOT NULL DEFAULT true,
  "runbookId" UUID,
  "correlationId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "operational_alert_rules_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "operational_alert_events" (
  "id" UUID NOT NULL,
  "ruleId" UUID NOT NULL,
  "alertNumber" TEXT NOT NULL,
  "status" "OperationalAlertEventStatus" NOT NULL DEFAULT 'FIRED',
  "severity" "OperationalAlertSeverity" NOT NULL,
  "observedCondition" TEXT NOT NULL,
  "isIncident" BOOLEAN NOT NULL DEFAULT false,
  "notInstitutionalDecision" BOOLEAN NOT NULL DEFAULT true,
  "sloViolationObserved" BOOLEAN NOT NULL DEFAULT false,
  "requirementsWaived" BOOLEAN NOT NULL DEFAULT false,
  "correlationId" TEXT,
  "firedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "acknowledgedAt" TIMESTAMP(3),
  "resolvedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "operational_alert_events_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "support_escalation_rules" (
  "id" UUID NOT NULL,
  "reliabilityDefinitionId" UUID NOT NULL,
  "runbookId" UUID,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "status" "SupportEscalationRuleStatus" NOT NULL DEFAULT 'DRAFT',
  "triggerCondition" TEXT NOT NULL,
  "escalationTarget" TEXT NOT NULL,
  "mandatoryProcessFallback" TEXT,
  "correlationId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "support_escalation_rules_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "service_reliability_definitions_code_key" ON "service_reliability_definitions"("code");
CREATE INDEX "service_reliability_definitions_status_idx" ON "service_reliability_definitions"("status");
CREATE INDEX "service_reliability_definitions_serviceReference_idx" ON "service_reliability_definitions"("serviceReference");
CREATE INDEX "service_reliability_definitions_correlationId_idx" ON "service_reliability_definitions"("correlationId");

CREATE UNIQUE INDEX "service_level_objectives_reliabilityDefinitionId_code_key" ON "service_level_objectives"("reliabilityDefinitionId", "code");
CREATE INDEX "service_level_objectives_reliabilityDefinitionId_idx" ON "service_level_objectives"("reliabilityDefinitionId");
CREATE INDEX "service_level_objectives_status_idx" ON "service_level_objectives"("status");
CREATE INDEX "service_level_objectives_correlationId_idx" ON "service_level_objectives"("correlationId");

CREATE UNIQUE INDEX "service_level_indicators_objectiveId_code_key" ON "service_level_indicators"("objectiveId", "code");
CREATE INDEX "service_level_indicators_objectiveId_idx" ON "service_level_indicators"("objectiveId");
CREATE INDEX "service_level_indicators_indicatorType_idx" ON "service_level_indicators"("indicatorType");
CREATE INDEX "service_level_indicators_correlationId_idx" ON "service_level_indicators"("correlationId");

CREATE INDEX "availability_measurements_objectiveId_idx" ON "availability_measurements"("objectiveId");
CREATE INDEX "availability_measurements_indicatorId_idx" ON "availability_measurements"("indicatorId");
CREATE INDEX "availability_measurements_windowStart_idx" ON "availability_measurements"("windowStart");
CREATE INDEX "availability_measurements_correlationId_idx" ON "availability_measurements"("correlationId");

CREATE INDEX "latency_measurements_objectiveId_idx" ON "latency_measurements"("objectiveId");
CREATE INDEX "latency_measurements_indicatorId_idx" ON "latency_measurements"("indicatorId");
CREATE INDEX "latency_measurements_windowStart_idx" ON "latency_measurements"("windowStart");
CREATE INDEX "latency_measurements_correlationId_idx" ON "latency_measurements"("correlationId");

CREATE UNIQUE INDEX "capacity_profiles_reliabilityDefinitionId_code_key" ON "capacity_profiles"("reliabilityDefinitionId", "code");
CREATE INDEX "capacity_profiles_reliabilityDefinitionId_idx" ON "capacity_profiles"("reliabilityDefinitionId");
CREATE INDEX "capacity_profiles_status_idx" ON "capacity_profiles"("status");
CREATE INDEX "capacity_profiles_correlationId_idx" ON "capacity_profiles"("correlationId");

CREATE UNIQUE INDEX "capacity_assessments_assessmentNumber_key" ON "capacity_assessments"("assessmentNumber");
CREATE INDEX "capacity_assessments_profileId_idx" ON "capacity_assessments"("profileId");
CREATE INDEX "capacity_assessments_status_idx" ON "capacity_assessments"("status");
CREATE INDEX "capacity_assessments_correlationId_idx" ON "capacity_assessments"("correlationId");

CREATE UNIQUE INDEX "performance_test_runs_runNumber_key" ON "performance_test_runs"("runNumber");
CREATE INDEX "performance_test_runs_reliabilityDefinitionId_idx" ON "performance_test_runs"("reliabilityDefinitionId");
CREATE INDEX "performance_test_runs_status_idx" ON "performance_test_runs"("status");
CREATE INDEX "performance_test_runs_scenarioType_idx" ON "performance_test_runs"("scenarioType");
CREATE INDEX "performance_test_runs_correlationId_idx" ON "performance_test_runs"("correlationId");

CREATE UNIQUE INDEX "load_test_runs_runNumber_key" ON "load_test_runs"("runNumber");
CREATE INDEX "load_test_runs_reliabilityDefinitionId_idx" ON "load_test_runs"("reliabilityDefinitionId");
CREATE INDEX "load_test_runs_status_idx" ON "load_test_runs"("status");
CREATE INDEX "load_test_runs_correlationId_idx" ON "load_test_runs"("correlationId");

CREATE UNIQUE INDEX "stress_test_runs_runNumber_key" ON "stress_test_runs"("runNumber");
CREATE INDEX "stress_test_runs_reliabilityDefinitionId_idx" ON "stress_test_runs"("reliabilityDefinitionId");
CREATE INDEX "stress_test_runs_status_idx" ON "stress_test_runs"("status");
CREATE INDEX "stress_test_runs_correlationId_idx" ON "stress_test_runs"("correlationId");

CREATE INDEX "resource_saturation_records_profileId_idx" ON "resource_saturation_records"("profileId");
CREATE INDEX "resource_saturation_records_saturationLevel_idx" ON "resource_saturation_records"("saturationLevel");
CREATE INDEX "resource_saturation_records_recordedAt_idx" ON "resource_saturation_records"("recordedAt");
CREATE INDEX "resource_saturation_records_correlationId_idx" ON "resource_saturation_records"("correlationId");

CREATE UNIQUE INDEX "operational_health_events_eventNumber_key" ON "operational_health_events"("eventNumber");
CREATE INDEX "operational_health_events_eventType_idx" ON "operational_health_events"("eventType");
CREATE INDEX "operational_health_events_technicalHealthState_idx" ON "operational_health_events"("technicalHealthState");
CREATE INDEX "operational_health_events_dependencyType_idx" ON "operational_health_events"("dependencyType");
CREATE INDEX "operational_health_events_correlationId_idx" ON "operational_health_events"("correlationId");
CREATE INDEX "operational_health_events_recordedAt_idx" ON "operational_health_events"("recordedAt");

CREATE UNIQUE INDEX "observability_signal_definitions_reliabilityDefinitionId_code_key" ON "observability_signal_definitions"("reliabilityDefinitionId", "code");
CREATE INDEX "observability_signal_definitions_reliabilityDefinitionId_idx" ON "observability_signal_definitions"("reliabilityDefinitionId");
CREATE INDEX "observability_signal_definitions_signalType_idx" ON "observability_signal_definitions"("signalType");

CREATE UNIQUE INDEX "operational_runbooks_reliabilityDefinitionId_code_key" ON "operational_runbooks"("reliabilityDefinitionId", "code");
CREATE INDEX "operational_runbooks_reliabilityDefinitionId_idx" ON "operational_runbooks"("reliabilityDefinitionId");
CREATE INDEX "operational_runbooks_status_idx" ON "operational_runbooks"("status");
CREATE INDEX "operational_runbooks_scenarioType_idx" ON "operational_runbooks"("scenarioType");

CREATE UNIQUE INDEX "operational_alert_rules_reliabilityDefinitionId_code_key" ON "operational_alert_rules"("reliabilityDefinitionId", "code");
CREATE INDEX "operational_alert_rules_reliabilityDefinitionId_idx" ON "operational_alert_rules"("reliabilityDefinitionId");
CREATE INDEX "operational_alert_rules_objectiveId_idx" ON "operational_alert_rules"("objectiveId");
CREATE INDEX "operational_alert_rules_status_idx" ON "operational_alert_rules"("status");
CREATE INDEX "operational_alert_rules_correlationId_idx" ON "operational_alert_rules"("correlationId");

CREATE UNIQUE INDEX "operational_alert_events_alertNumber_key" ON "operational_alert_events"("alertNumber");
CREATE INDEX "operational_alert_events_ruleId_idx" ON "operational_alert_events"("ruleId");
CREATE INDEX "operational_alert_events_status_idx" ON "operational_alert_events"("status");
CREATE INDEX "operational_alert_events_correlationId_idx" ON "operational_alert_events"("correlationId");
CREATE INDEX "operational_alert_events_firedAt_idx" ON "operational_alert_events"("firedAt");

CREATE UNIQUE INDEX "support_escalation_rules_reliabilityDefinitionId_code_key" ON "support_escalation_rules"("reliabilityDefinitionId", "code");
CREATE INDEX "support_escalation_rules_reliabilityDefinitionId_idx" ON "support_escalation_rules"("reliabilityDefinitionId");
CREATE INDEX "support_escalation_rules_runbookId_idx" ON "support_escalation_rules"("runbookId");
CREATE INDEX "support_escalation_rules_status_idx" ON "support_escalation_rules"("status");

ALTER TABLE "service_level_objectives" ADD CONSTRAINT "service_level_objectives_reliabilityDefinitionId_fkey" FOREIGN KEY ("reliabilityDefinitionId") REFERENCES "service_reliability_definitions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "service_level_indicators" ADD CONSTRAINT "service_level_indicators_objectiveId_fkey" FOREIGN KEY ("objectiveId") REFERENCES "service_level_objectives"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "availability_measurements" ADD CONSTRAINT "availability_measurements_objectiveId_fkey" FOREIGN KEY ("objectiveId") REFERENCES "service_level_objectives"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "availability_measurements" ADD CONSTRAINT "availability_measurements_indicatorId_fkey" FOREIGN KEY ("indicatorId") REFERENCES "service_level_indicators"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "latency_measurements" ADD CONSTRAINT "latency_measurements_objectiveId_fkey" FOREIGN KEY ("objectiveId") REFERENCES "service_level_objectives"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "latency_measurements" ADD CONSTRAINT "latency_measurements_indicatorId_fkey" FOREIGN KEY ("indicatorId") REFERENCES "service_level_indicators"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "capacity_profiles" ADD CONSTRAINT "capacity_profiles_reliabilityDefinitionId_fkey" FOREIGN KEY ("reliabilityDefinitionId") REFERENCES "service_reliability_definitions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "capacity_assessments" ADD CONSTRAINT "capacity_assessments_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "capacity_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "performance_test_runs" ADD CONSTRAINT "performance_test_runs_reliabilityDefinitionId_fkey" FOREIGN KEY ("reliabilityDefinitionId") REFERENCES "service_reliability_definitions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "load_test_runs" ADD CONSTRAINT "load_test_runs_reliabilityDefinitionId_fkey" FOREIGN KEY ("reliabilityDefinitionId") REFERENCES "service_reliability_definitions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "stress_test_runs" ADD CONSTRAINT "stress_test_runs_reliabilityDefinitionId_fkey" FOREIGN KEY ("reliabilityDefinitionId") REFERENCES "service_reliability_definitions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "resource_saturation_records" ADD CONSTRAINT "resource_saturation_records_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "capacity_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "observability_signal_definitions" ADD CONSTRAINT "observability_signal_definitions_reliabilityDefinitionId_fkey" FOREIGN KEY ("reliabilityDefinitionId") REFERENCES "service_reliability_definitions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "operational_runbooks" ADD CONSTRAINT "operational_runbooks_reliabilityDefinitionId_fkey" FOREIGN KEY ("reliabilityDefinitionId") REFERENCES "service_reliability_definitions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "operational_alert_rules" ADD CONSTRAINT "operational_alert_rules_reliabilityDefinitionId_fkey" FOREIGN KEY ("reliabilityDefinitionId") REFERENCES "service_reliability_definitions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "operational_alert_rules" ADD CONSTRAINT "operational_alert_rules_objectiveId_fkey" FOREIGN KEY ("objectiveId") REFERENCES "service_level_objectives"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "operational_alert_rules" ADD CONSTRAINT "operational_alert_rules_runbookId_fkey" FOREIGN KEY ("runbookId") REFERENCES "operational_runbooks"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "operational_alert_events" ADD CONSTRAINT "operational_alert_events_ruleId_fkey" FOREIGN KEY ("ruleId") REFERENCES "operational_alert_rules"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "support_escalation_rules" ADD CONSTRAINT "support_escalation_rules_reliabilityDefinitionId_fkey" FOREIGN KEY ("reliabilityDefinitionId") REFERENCES "service_reliability_definitions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "support_escalation_rules" ADD CONSTRAINT "support_escalation_rules_runbookId_fkey" FOREIGN KEY ("runbookId") REFERENCES "operational_runbooks"("id") ON DELETE SET NULL ON UPDATE CASCADE;
