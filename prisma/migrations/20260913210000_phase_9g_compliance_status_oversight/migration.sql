-- ─── Phase 9G: Compliance enums ────────────────────────────────────────────────

DO $$ BEGIN
    CREATE TYPE "ComplianceProjectionStatus" AS ENUM (
        'NO_CURRENT_ASSESSMENT', 'MONITORING', 'SATISFACTORY', 'ACTION_REQUIRED',
        'UNDER_CORRECTIVE_ACTION', 'UNDER_INSPECTION', 'UNDER_REVIEW', 'ESCALATED',
        'REFERRED_EXTERNALLY', 'SUSPENDED_BY_SEPARATE_DECISION', 'REVOKED_BY_SEPARATE_DECISION',
        'EXPIRED', 'CLOSED', 'UNRESOLVED'
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE "ComplianceDashboardAudience" AS ENUM (
        'HOLDER', 'OFFICIAL', 'DEPARTMENT_HEAD', 'EXECUTIVE_OVERSIGHT'
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE "ComplianceIndicatorType" AS ENUM (
        'OBLIGATIONS_DUE', 'OBLIGATIONS_OVERDUE', 'REPORTS_PENDING_REVIEW', 'OPEN_FINDINGS',
        'CRITICAL_FINDINGS', 'CORRECTIVE_ACTIONS_OVERDUE', 'UPCOMING_INSPECTIONS',
        'REINSPECTION_REQUIRED', 'EXPIRING_EVIDENCE', 'EXPIRING_INSTRUMENT',
        'UNRESOLVED_EXTERNAL_DEPENDENCIES'
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE "MonitoringRuleType" AS ENUM (
        'DUE_DATE_WARNING', 'EXPIRY_WARNING', 'MISSED_FILING_DETECTION', 'OPEN_FINDING_AGE',
        'CORRECTIVE_ACTION_DEADLINE', 'INSPECTION_SCHEDULE', 'EVIDENCE_EXPIRY',
        'REQUIRED_REVIEW_INTERVAL'
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE "MonitoringRuleStatus" AS ENUM (
        'DRAFT', 'ACTIVE', 'SUSPENDED', 'RETIRED'
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE "ComplianceAlertLevel" AS ENUM (
        'INFORMATION', 'ATTENTION', 'ELEVATED', 'CRITICAL'
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE "ComplianceAlertStatus" AS ENUM (
        'OPEN', 'ACKNOWLEDGED', 'RESOLVED', 'SUPERSEDED'
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE "ComplianceMonitoringEventType" AS ENUM (
        'RULE_EVALUATED', 'PROJECTION_REFRESHED', 'ALERT_RAISED', 'ALERT_RESOLVED',
        'REVALIDATION_TRIGGERED', 'CACHE_INVALIDATED'
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE "ComplianceRevalidationTrigger" AS ENUM (
        'MATERIAL_CONDITION_CHANGE', 'INSTRUMENT_AMENDED', 'OWNERSHIP_CONTROL_CHANGE',
        'CRITICAL_INCIDENT', 'NEW_GOVERNING_REQUIREMENT', 'MATERIAL_INSPECTION_FINDING',
        'PROFESSIONAL_STANDING_CHANGE', 'GOVERNMENT_DETERMINATION_CHANGE',
        'SCHEDULED_REVALIDATION_REACHED'
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ─── Phase 9G: Compliance tables ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "compliance_status_projections" (
    "id" UUID NOT NULL,
    "audience" "ComplianceDashboardAudience" NOT NULL,
    "subjectIdentityId" UUID,
    "subjectOfficeholderId" UUID,
    "subjectDepartmentId" UUID,
    "subjectInstitutionId" UUID,
    "caseId" UUID,
    "masterAdministrativeFileId" UUID,
    "officialInstrumentId" UUID,
    "status" "ComplianceProjectionStatus" NOT NULL DEFAULT 'NO_CURRENT_ASSESSMENT',
    "projectionDisclaimer" TEXT NOT NULL,
    "underlyingAssessmentType" TEXT,
    "underlyingAssessmentId" UUID,
    "evidenceCutoffAt" TIMESTAMP(3),
    "openFindingRefs" JSONB NOT NULL DEFAULT '[]',
    "openCorrectiveActionRefs" JSONB NOT NULL DEFAULT '[]',
    "instrumentStatusSnapshot" TEXT,
    "functionAuthorityRecordId" UUID,
    "authorityEvaluationRecordId" UUID,
    "lastReviewedAt" TIMESTAMP(3),
    "nextReviewAt" TIMESTAMP(3),
    "projectionVersion" INTEGER NOT NULL DEFAULT 1,
    "lastDerivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "compliance_status_projections_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "compliance_indicators" (
    "id" UUID NOT NULL,
    "projectionId" UUID NOT NULL,
    "indicatorType" "ComplianceIndicatorType" NOT NULL,
    "displayLabel" TEXT NOT NULL,
    "countValue" INTEGER NOT NULL DEFAULT 0,
    "drillDownReferences" JSONB NOT NULL DEFAULT '[]',
    "computedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "compliance_indicators_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "monitoring_rules" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "ruleType" "MonitoringRuleType" NOT NULL,
    "status" "MonitoringRuleStatus" NOT NULL DEFAULT 'DRAFT',
    "institutionId" UUID,
    "departmentId" UUID,
    "structuredConfig" JSONB NOT NULL DEFAULT '{}',
    "warningDaysBefore" INTEGER,
    "criticalDaysBefore" INTEGER,
    "reviewIntervalDays" INTEGER,
    "effectiveFrom" TIMESTAMP(3),
    "effectiveUntil" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "monitoring_rules_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "compliance_monitoring_events" (
    "id" UUID NOT NULL,
    "projectionId" UUID,
    "monitoringRuleId" UUID,
    "eventType" "ComplianceMonitoringEventType" NOT NULL,
    "eventSummary" TEXT NOT NULL,
    "sourceDataRefs" JSONB NOT NULL DEFAULT '[]',
    "uncertaintyNotes" TEXT,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "compliance_monitoring_events_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "compliance_alerts" (
    "id" UUID NOT NULL,
    "projectionId" UUID NOT NULL,
    "monitoringRuleId" UUID,
    "alertLevel" "ComplianceAlertLevel" NOT NULL,
    "status" "ComplianceAlertStatus" NOT NULL DEFAULT 'OPEN',
    "title" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "sourceDataRefs" JSONB NOT NULL DEFAULT '[]',
    "uncertaintyNotes" TEXT,
    "isViolation" BOOLEAN NOT NULL DEFAULT false,
    "isEnforcementDecision" BOOLEAN NOT NULL DEFAULT false,
    "methodologyVersion" TEXT,
    "inputsSnapshot" JSONB NOT NULL DEFAULT '{}',
    "limitations" TEXT,
    "humanReviewRequired" BOOLEAN NOT NULL DEFAULT true,
    "humanReviewedAt" TIMESTAMP(3),
    "humanReviewedByIdentityId" UUID,
    "raisedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),

    CONSTRAINT "compliance_alerts_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "compliance_revalidation_records" (
    "id" UUID NOT NULL,
    "projectionId" UUID NOT NULL,
    "trigger" "ComplianceRevalidationTrigger" NOT NULL,
    "triggerSummary" TEXT NOT NULL,
    "sourceDataRefs" JSONB NOT NULL DEFAULT '[]',
    "priorAssessmentId" UUID,
    "priorAssessmentType" TEXT,
    "doesNotRenewInstrument" BOOLEAN NOT NULL DEFAULT true,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "recordedByIdentityId" UUID,

    CONSTRAINT "compliance_revalidation_records_pkey" PRIMARY KEY ("id")
);

-- ─── Phase 9G: Compliance indexes ────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS "compliance_status_projections_audience_idx"
    ON "compliance_status_projections"("audience");
CREATE INDEX IF NOT EXISTS "compliance_status_projections_status_idx"
    ON "compliance_status_projections"("status");
CREATE INDEX IF NOT EXISTS "compliance_status_projections_caseId_idx"
    ON "compliance_status_projections"("caseId");
CREATE INDEX IF NOT EXISTS "compliance_status_projections_subjectIdentityId_idx"
    ON "compliance_status_projections"("subjectIdentityId");
CREATE INDEX IF NOT EXISTS "compliance_status_projections_subjectDepartmentId_idx"
    ON "compliance_status_projections"("subjectDepartmentId");
CREATE INDEX IF NOT EXISTS "compliance_status_projections_lastDerivedAt_idx"
    ON "compliance_status_projections"("lastDerivedAt");

CREATE UNIQUE INDEX IF NOT EXISTS "compliance_indicators_projectionId_indicatorType_key"
    ON "compliance_indicators"("projectionId", "indicatorType");
CREATE INDEX IF NOT EXISTS "compliance_indicators_indicatorType_idx"
    ON "compliance_indicators"("indicatorType");

CREATE UNIQUE INDEX IF NOT EXISTS "monitoring_rules_code_key"
    ON "monitoring_rules"("code");
CREATE INDEX IF NOT EXISTS "monitoring_rules_ruleType_status_idx"
    ON "monitoring_rules"("ruleType", "status");
CREATE INDEX IF NOT EXISTS "monitoring_rules_institutionId_idx"
    ON "monitoring_rules"("institutionId");

CREATE INDEX IF NOT EXISTS "compliance_monitoring_events_projectionId_idx"
    ON "compliance_monitoring_events"("projectionId");
CREATE INDEX IF NOT EXISTS "compliance_monitoring_events_monitoringRuleId_idx"
    ON "compliance_monitoring_events"("monitoringRuleId");
CREATE INDEX IF NOT EXISTS "compliance_monitoring_events_eventType_idx"
    ON "compliance_monitoring_events"("eventType");
CREATE INDEX IF NOT EXISTS "compliance_monitoring_events_occurredAt_idx"
    ON "compliance_monitoring_events"("occurredAt");

CREATE INDEX IF NOT EXISTS "compliance_alerts_projectionId_idx"
    ON "compliance_alerts"("projectionId");
CREATE INDEX IF NOT EXISTS "compliance_alerts_alertLevel_idx"
    ON "compliance_alerts"("alertLevel");
CREATE INDEX IF NOT EXISTS "compliance_alerts_status_idx"
    ON "compliance_alerts"("status");

CREATE INDEX IF NOT EXISTS "compliance_revalidation_records_projectionId_idx"
    ON "compliance_revalidation_records"("projectionId");
CREATE INDEX IF NOT EXISTS "compliance_revalidation_records_trigger_idx"
    ON "compliance_revalidation_records"("trigger");

-- ─── Phase 9G: Compliance foreign keys ─────────────────────────────────────────

DO $$ BEGIN
    ALTER TABLE "compliance_status_projections"
        ADD CONSTRAINT "compliance_status_projections_subjectIdentityId_fkey"
        FOREIGN KEY ("subjectIdentityId") REFERENCES "identities"("id")
        ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE "compliance_status_projections"
        ADD CONSTRAINT "compliance_status_projections_subjectOfficeholderId_fkey"
        FOREIGN KEY ("subjectOfficeholderId") REFERENCES "officeholders"("id")
        ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE "compliance_status_projections"
        ADD CONSTRAINT "compliance_status_projections_subjectDepartmentId_fkey"
        FOREIGN KEY ("subjectDepartmentId") REFERENCES "departments"("id")
        ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE "compliance_status_projections"
        ADD CONSTRAINT "compliance_status_projections_subjectInstitutionId_fkey"
        FOREIGN KEY ("subjectInstitutionId") REFERENCES "institutions"("id")
        ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE "compliance_status_projections"
        ADD CONSTRAINT "compliance_status_projections_caseId_fkey"
        FOREIGN KEY ("caseId") REFERENCES "cases"("id")
        ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE "compliance_status_projections"
        ADD CONSTRAINT "compliance_status_projections_masterAdministrativeFileId_fkey"
        FOREIGN KEY ("masterAdministrativeFileId") REFERENCES "master_administrative_files"("id")
        ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE "compliance_status_projections"
        ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE "compliance_status_projections"
        ADD CONSTRAINT "compliance_status_projections_officialInstrumentId_fkey"
        FOREIGN KEY ("officialInstrumentId") REFERENCES "official_instruments"("id")
        ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE "compliance_status_projections"
        ADD CONSTRAINT "compliance_status_projections_functionAuthorityRecordId_fkey"
        FOREIGN KEY ("functionAuthorityRecordId") REFERENCES "function_authority_records"("id")
        ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE "compliance_status_projections"
        ADD CONSTRAINT "compliance_status_projections_authorityEvaluationRecordId_fkey"
        FOREIGN KEY ("authorityEvaluationRecordId") REFERENCES "authority_evaluation_records"("id")
        ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE "compliance_indicators"
        ADD CONSTRAINT "compliance_indicators_projectionId_fkey"
        FOREIGN KEY ("projectionId") REFERENCES "compliance_status_projections"("id")
        ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE "monitoring_rules"
        ADD CONSTRAINT "monitoring_rules_institutionId_fkey"
        FOREIGN KEY ("institutionId") REFERENCES "institutions"("id")
        ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE "monitoring_rules"
        ADD CONSTRAINT "monitoring_rules_departmentId_fkey"
        FOREIGN KEY ("departmentId") REFERENCES "departments"("id")
        ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE "compliance_monitoring_events"
        ADD CONSTRAINT "compliance_monitoring_events_projectionId_fkey"
        FOREIGN KEY ("projectionId") REFERENCES "compliance_status_projections"("id")
        ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE "compliance_monitoring_events"
        ADD CONSTRAINT "compliance_monitoring_events_monitoringRuleId_fkey"
        FOREIGN KEY ("monitoringRuleId") REFERENCES "monitoring_rules"("id")
        ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE "compliance_alerts"
        ADD CONSTRAINT "compliance_alerts_projectionId_fkey"
        FOREIGN KEY ("projectionId") REFERENCES "compliance_status_projections"("id")
        ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE "compliance_alerts"
        ADD CONSTRAINT "compliance_alerts_monitoringRuleId_fkey"
        FOREIGN KEY ("monitoringRuleId") REFERENCES "monitoring_rules"("id")
        ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE "compliance_alerts"
        ADD CONSTRAINT "compliance_alerts_humanReviewedByIdentityId_fkey"
        FOREIGN KEY ("humanReviewedByIdentityId") REFERENCES "identities"("id")
        ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE "compliance_revalidation_records"
        ADD CONSTRAINT "compliance_revalidation_records_projectionId_fkey"
        FOREIGN KEY ("projectionId") REFERENCES "compliance_status_projections"("id")
        ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE "compliance_revalidation_records"
        ADD CONSTRAINT "compliance_revalidation_records_recordedByIdentityId_fkey"
        FOREIGN KEY ("recordedByIdentityId") REFERENCES "identities"("id")
        ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
