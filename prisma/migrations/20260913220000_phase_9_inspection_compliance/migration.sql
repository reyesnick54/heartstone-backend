-- Phase 9: Inspection, Compliance and Corrective Action

CREATE TYPE "ComplianceMatterStatus" AS ENUM ('OPEN', 'UNDER_REVIEW', 'MONITORING', 'ESCALATED', 'CLOSED');
CREATE TYPE "ContinuingObligationStatus" AS ENUM ('ACTIVE', 'PENDING_VERIFICATION', 'SATISFIED', 'WAIVED', 'BREACHED', 'SUPERSEDED');
CREATE TYPE "ObligationScheduleFrequency" AS ENUM ('ONE_TIME', 'DAILY', 'WEEKLY', 'MONTHLY', 'QUARTERLY', 'ANNUAL', 'EVENT_DRIVEN');
CREATE TYPE "ComplianceSubmissionStatus" AS ENUM ('RECEIVED', 'UNDER_REVIEW', 'ACCEPTED_FOR_REVIEW', 'REJECTED', 'WITHDRAWN');
CREATE TYPE "ComplianceReviewOutcome" AS ENUM ('PENDING', 'OBLIGATION_NOT_SATISFIED', 'OBLIGATION_SATISFIED', 'ADDITIONAL_EVIDENCE_REQUIRED', 'REFERRED');
CREATE TYPE "InspectionPlanStatus" AS ENUM ('DRAFT', 'SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');
CREATE TYPE "InspectionAssignmentStatus" AS ENUM ('ASSIGNED', 'ACCEPTED', 'DECLINED', 'COMPLETED', 'REASSIGNED');
CREATE TYPE "InspectionSessionStatus" AS ENUM ('PLANNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');
CREATE TYPE "ComplianceObservationClassification" AS ENUM ('OBSERVATION', 'CONDITION_NOTED', 'POSITIVE_INDICATOR', 'INFORMATION_REQUESTED');
CREATE TYPE "ComplianceFindingSeverity" AS ENUM ('INFORMATIONAL', 'MINOR', 'MODERATE', 'MAJOR', 'CRITICAL');
CREATE TYPE "ComplianceFindingStatus" AS ENUM ('OPEN', 'UNDER_CORRECTIVE_ACTION', 'PENDING_VERIFICATION', 'CLOSED', 'REOPENED');
CREATE TYPE "CorrectiveActionPlanStatus" AS ENUM ('DRAFT', 'ACTIVE', 'COMPLETED', 'FAILED', 'SUPERSEDED');
CREATE TYPE "CorrectiveActionItemStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'VERIFIED', 'FAILED');
CREATE TYPE "CorrectiveActionVerificationOutcome" AS ENUM ('PENDING', 'VERIFIED_SATISFACTORY', 'VERIFIED_UNSATISFACTORY', 'REQUIRES_FOLLOW_UP');
CREATE TYPE "ComplianceAssessmentOutcome" AS ENUM ('COMPLIANT', 'PARTIALLY_COMPLIANT', 'NONCOMPLIANT', 'INCONCLUSIVE', 'PENDING');
CREATE TYPE "NoncomplianceFindingStatus" AS ENUM ('OPEN', 'UNDER_CORRECTIVE_ACTION', 'REFERRED', 'CLOSED');
CREATE TYPE "ComplianceEscalationLevel" AS ENUM ('SUPERVISOR', 'MANAGEMENT', 'EXECUTIVE', 'EXTERNAL');
CREATE TYPE "EnforcementReferralStatus" AS ENUM ('PREPARED', 'SUBMITTED', 'ACKNOWLEDGED', 'CLOSED');
CREATE TYPE "EmergencyInterimActionType" AS ENUM ('SAFETY_HOLD', 'OPERATIONAL_RESTRICTION', 'EVIDENCE_PRESERVATION', 'SITE_ACCESS_LIMIT', 'OTHER_INTERIM');
CREATE TYPE "ComplianceProjectionStatus" AS ENUM ('COMPLIANT', 'AT_RISK', 'NONCOMPLIANT', 'UNKNOWN');
CREATE TYPE "ComplianceMonitoringEventType" AS ENUM ('OBLIGATION_DUE', 'SUBMISSION_RECEIVED', 'REVIEW_COMPLETED', 'FINDING_RECORDED', 'CORRECTIVE_ACTION_DUE', 'ESCALATION_TRIGGERED', 'PROJECTION_UPDATED', 'ALERT_RAISED');
CREATE TYPE "ComplianceAlertSeverity" AS ENUM ('INFO', 'WARNING', 'URGENT', 'CRITICAL');
CREATE TYPE "ComplianceRevalidationOutcome" AS ENUM ('REINSTATED_COMPLIANT', 'REMAINS_NONCOMPLIANT', 'INCONCLUSIVE', 'PENDING');

CREATE TABLE "compliance_matters" (
    "id" UUID NOT NULL,
    "matterNumber" TEXT NOT NULL,
    "caseId" UUID,
    "officialInstrumentId" UUID,
    "masterAdministrativeFileId" UUID,
    "holderIdentityId" UUID,
    "holderOrganizationId" UUID,
    "status" "ComplianceMatterStatus" NOT NULL DEFAULT 'OPEN',
    "subject" TEXT NOT NULL,
    "openedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "compliance_matters_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "continuing_obligations" (
    "id" UUID NOT NULL,
    "complianceMatterId" UUID NOT NULL,
    "officialInstrumentId" UUID,
    "description" TEXT NOT NULL,
    "obligationType" TEXT NOT NULL,
    "status" "ContinuingObligationStatus" NOT NULL DEFAULT 'ACTIVE',
    "effectiveFrom" TIMESTAMP(3) NOT NULL,
    "effectiveUntil" TIMESTAMP(3),
    "sourceReference" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "continuing_obligations_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "obligation_schedules" (
    "id" UUID NOT NULL,
    "continuingObligationId" UUID NOT NULL,
    "frequency" "ObligationScheduleFrequency" NOT NULL,
    "nextDueAt" TIMESTAMP(3) NOT NULL,
    "lastDueAt" TIMESTAMP(3),
    "reminderDaysBefore" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "obligation_schedules_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "compliance_submissions" (
    "id" UUID NOT NULL,
    "continuingObligationId" UUID NOT NULL,
    "submittedByIdentityId" UUID NOT NULL,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" "ComplianceSubmissionStatus" NOT NULL DEFAULT 'RECEIVED',
    "evidenceRecordId" UUID,
    "receiptAcknowledgedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "compliance_submissions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "compliance_reviews" (
    "id" UUID NOT NULL,
    "complianceSubmissionId" UUID NOT NULL,
    "reviewerIdentityId" UUID,
    "reviewerOfficeholderId" UUID,
    "outcome" "ComplianceReviewOutcome" NOT NULL DEFAULT 'PENDING',
    "reviewedAt" TIMESTAMP(3),
    "notes" TEXT,
    "obligationSatisfied" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "compliance_reviews_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "inspection_type_definitions" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "inspectionType" "InspectionType" NOT NULL,
    "lifecycleStatus" "CatalogLifecycleStatus" NOT NULL DEFAULT 'DRAFT',
    "requiredAuthorityAction" "AuthorityActionType" NOT NULL DEFAULT 'INSPECT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "inspection_type_definitions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "inspection_plans" (
    "id" UUID NOT NULL,
    "planNumber" TEXT NOT NULL,
    "complianceMatterId" UUID,
    "officialInstrumentId" UUID,
    "inspectionTypeDefinitionId" UUID NOT NULL,
    "scheduledFor" TIMESTAMP(3) NOT NULL,
    "status" "InspectionPlanStatus" NOT NULL DEFAULT 'DRAFT',
    "scope" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "inspection_plans_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "inspection_assignments" (
    "id" UUID NOT NULL,
    "inspectionPlanId" UUID NOT NULL,
    "inspectorOfficeholderId" UUID NOT NULL,
    "inspectorIdentityId" UUID NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" "InspectionAssignmentStatus" NOT NULL DEFAULT 'ASSIGNED',
    "authorityEvaluationRecordId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "inspection_assignments_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "inspection_sessions" (
    "id" UUID NOT NULL,
    "sessionNumber" TEXT NOT NULL,
    "inspectionPlanId" UUID,
    "complianceMatterId" UUID,
    "caseId" UUID,
    "officialInstrumentId" UUID,
    "inspectionRecordId" UUID,
    "inspectionTypeDefinitionId" UUID,
    "functionAuthorityRecordId" UUID,
    "status" "InspectionSessionStatus" NOT NULL DEFAULT 'PLANNED',
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "inspection_sessions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "inspection_observations" (
    "id" UUID NOT NULL,
    "inspectionSessionId" UUID NOT NULL,
    "evidenceRecordId" UUID,
    "description" TEXT NOT NULL,
    "classification" "ComplianceObservationClassification" NOT NULL DEFAULT 'OBSERVATION',
    "observedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "observerIdentityId" UUID NOT NULL,
    "observerOfficeholderId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "inspection_observations_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "inspection_findings" (
    "id" UUID NOT NULL,
    "inspectionSessionId" UUID NOT NULL,
    "inspectionObservationId" UUID,
    "severity" "ComplianceFindingSeverity" NOT NULL,
    "status" "ComplianceFindingStatus" NOT NULL DEFAULT 'OPEN',
    "findingCode" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "isViolation" BOOLEAN NOT NULL DEFAULT false,
    "determinedByOfficeholderId" UUID NOT NULL,
    "determinedByIdentityId" UUID NOT NULL,
    "determinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "inspection_findings_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "corrective_action_plans" (
    "id" UUID NOT NULL,
    "planNumber" TEXT NOT NULL,
    "complianceMatterId" UUID,
    "inspectionFindingId" UUID,
    "status" "CorrectiveActionPlanStatus" NOT NULL DEFAULT 'DRAFT',
    "requiredBy" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "corrective_action_plans_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "corrective_action_items" (
    "id" UUID NOT NULL,
    "correctiveActionPlanId" UUID NOT NULL,
    "description" TEXT NOT NULL,
    "status" "CorrectiveActionItemStatus" NOT NULL DEFAULT 'PENDING',
    "dueAt" TIMESTAMP(3),
    "assignedToIdentityId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "corrective_action_items_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "corrective_action_verifications" (
    "id" UUID NOT NULL,
    "correctiveActionItemId" UUID NOT NULL,
    "verifierIdentityId" UUID NOT NULL,
    "verifierOfficeholderId" UUID NOT NULL,
    "outcome" "CorrectiveActionVerificationOutcome" NOT NULL DEFAULT 'PENDING',
    "verifiedAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "corrective_action_verifications_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "compliance_finding_closures" (
    "id" UUID NOT NULL,
    "inspectionFindingId" UUID NOT NULL,
    "closedByIdentityId" UUID NOT NULL,
    "closedByOfficeholderId" UUID NOT NULL,
    "closedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closureReason" TEXT NOT NULL,
    "remediationReference" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "compliance_finding_closures_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "compliance_finding_reopenings" (
    "id" UUID NOT NULL,
    "complianceFindingClosureId" UUID NOT NULL,
    "reopenedByIdentityId" UUID NOT NULL,
    "reopenedByOfficeholderId" UUID NOT NULL,
    "reopenedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reason" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "compliance_finding_reopenings_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "compliance_assessments" (
    "id" UUID NOT NULL,
    "complianceMatterId" UUID NOT NULL,
    "assessorIdentityId" UUID NOT NULL,
    "assessorOfficeholderId" UUID NOT NULL,
    "outcome" "ComplianceAssessmentOutcome" NOT NULL DEFAULT 'PENDING',
    "assessedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "summary" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "compliance_assessments_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "noncompliance_findings" (
    "id" UUID NOT NULL,
    "inspectionFindingId" UUID,
    "complianceMatterId" UUID NOT NULL,
    "status" "NoncomplianceFindingStatus" NOT NULL DEFAULT 'OPEN',
    "violationCode" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "severity" "ComplianceFindingSeverity" NOT NULL,
    "determinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "noncompliance_findings_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "compliance_escalations" (
    "id" UUID NOT NULL,
    "complianceMatterId" UUID,
    "noncomplianceFindingId" UUID,
    "level" "ComplianceEscalationLevel" NOT NULL,
    "escalatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "escalatedByIdentityId" UUID NOT NULL,
    "escalatedByOfficeholderId" UUID NOT NULL,
    "reason" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "compliance_escalations_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "enforcement_referrals" (
    "id" UUID NOT NULL,
    "complianceEscalationId" UUID,
    "noncomplianceFindingId" UUID,
    "referredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "referredByIdentityId" UUID NOT NULL,
    "referredByOfficeholderId" UUID NOT NULL,
    "targetAuthorityReference" TEXT NOT NULL,
    "status" "EnforcementReferralStatus" NOT NULL DEFAULT 'PREPARED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "enforcement_referrals_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "emergency_interim_action_records" (
    "id" UUID NOT NULL,
    "complianceMatterId" UUID,
    "officialInstrumentId" UUID,
    "actionType" "EmergencyInterimActionType" NOT NULL,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "recordedByIdentityId" UUID NOT NULL,
    "recordedByOfficeholderId" UUID NOT NULL,
    "reason" TEXT NOT NULL,
    "doesNotSuspendInstrument" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "emergency_interim_action_records_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "compliance_status_projections" (
    "id" UUID NOT NULL,
    "complianceMatterId" UUID,
    "officialInstrumentId" UUID,
    "projectedStatus" "ComplianceProjectionStatus" NOT NULL,
    "projectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "basisSummary" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "compliance_status_projections_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "compliance_monitoring_events" (
    "id" UUID NOT NULL,
    "complianceMatterId" UUID,
    "eventType" "ComplianceMonitoringEventType" NOT NULL,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "actorIdentityId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "compliance_monitoring_events_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "compliance_alerts" (
    "id" UUID NOT NULL,
    "complianceMatterId" UUID,
    "alertType" TEXT NOT NULL,
    "severity" "ComplianceAlertSeverity" NOT NULL,
    "message" TEXT NOT NULL,
    "triggeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "acknowledgedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "compliance_alerts_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "compliance_revalidation_records" (
    "id" UUID NOT NULL,
    "complianceMatterId" UUID,
    "officialInstrumentId" UUID,
    "outcome" "ComplianceRevalidationOutcome" NOT NULL DEFAULT 'PENDING',
    "revalidatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revalidatedByIdentityId" UUID NOT NULL,
    "revalidatedByOfficeholderId" UUID NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "compliance_revalidation_records_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "compliance_matters_matterNumber_key" ON "compliance_matters"("matterNumber");
CREATE INDEX "compliance_matters_caseId_idx" ON "compliance_matters"("caseId");
CREATE INDEX "compliance_matters_officialInstrumentId_idx" ON "compliance_matters"("officialInstrumentId");
CREATE INDEX "compliance_matters_masterAdministrativeFileId_idx" ON "compliance_matters"("masterAdministrativeFileId");
CREATE INDEX "compliance_matters_holderIdentityId_idx" ON "compliance_matters"("holderIdentityId");
CREATE INDEX "compliance_matters_status_idx" ON "compliance_matters"("status");

CREATE INDEX "continuing_obligations_complianceMatterId_idx" ON "continuing_obligations"("complianceMatterId");
CREATE INDEX "continuing_obligations_officialInstrumentId_idx" ON "continuing_obligations"("officialInstrumentId");
CREATE INDEX "continuing_obligations_status_idx" ON "continuing_obligations"("status");

CREATE INDEX "obligation_schedules_continuingObligationId_idx" ON "obligation_schedules"("continuingObligationId");
CREATE INDEX "obligation_schedules_nextDueAt_idx" ON "obligation_schedules"("nextDueAt");

CREATE INDEX "compliance_submissions_continuingObligationId_idx" ON "compliance_submissions"("continuingObligationId");
CREATE INDEX "compliance_submissions_submittedByIdentityId_idx" ON "compliance_submissions"("submittedByIdentityId");
CREATE INDEX "compliance_submissions_status_idx" ON "compliance_submissions"("status");

CREATE INDEX "compliance_reviews_complianceSubmissionId_idx" ON "compliance_reviews"("complianceSubmissionId");
CREATE INDEX "compliance_reviews_reviewerIdentityId_idx" ON "compliance_reviews"("reviewerIdentityId");

CREATE UNIQUE INDEX "inspection_type_definitions_code_key" ON "inspection_type_definitions"("code");

CREATE UNIQUE INDEX "inspection_plans_planNumber_key" ON "inspection_plans"("planNumber");
CREATE INDEX "inspection_plans_complianceMatterId_idx" ON "inspection_plans"("complianceMatterId");
CREATE INDEX "inspection_plans_officialInstrumentId_idx" ON "inspection_plans"("officialInstrumentId");
CREATE INDEX "inspection_plans_status_idx" ON "inspection_plans"("status");

CREATE UNIQUE INDEX "inspection_assignments_inspectionPlanId_inspectorOfficeholderId_key" ON "inspection_assignments"("inspectionPlanId", "inspectorOfficeholderId");
CREATE INDEX "inspection_assignments_inspectorIdentityId_idx" ON "inspection_assignments"("inspectorIdentityId");

CREATE UNIQUE INDEX "inspection_sessions_sessionNumber_key" ON "inspection_sessions"("sessionNumber");
CREATE INDEX "inspection_sessions_inspectionPlanId_idx" ON "inspection_sessions"("inspectionPlanId");
CREATE INDEX "inspection_sessions_complianceMatterId_idx" ON "inspection_sessions"("complianceMatterId");
CREATE INDEX "inspection_sessions_caseId_idx" ON "inspection_sessions"("caseId");
CREATE INDEX "inspection_sessions_inspectionRecordId_idx" ON "inspection_sessions"("inspectionRecordId");
CREATE INDEX "inspection_sessions_status_idx" ON "inspection_sessions"("status");

CREATE INDEX "inspection_observations_inspectionSessionId_idx" ON "inspection_observations"("inspectionSessionId");
CREATE INDEX "inspection_observations_evidenceRecordId_idx" ON "inspection_observations"("evidenceRecordId");

CREATE INDEX "inspection_findings_inspectionSessionId_idx" ON "inspection_findings"("inspectionSessionId");
CREATE INDEX "inspection_findings_status_idx" ON "inspection_findings"("status");

CREATE UNIQUE INDEX "corrective_action_plans_planNumber_key" ON "corrective_action_plans"("planNumber");
CREATE INDEX "corrective_action_plans_complianceMatterId_idx" ON "corrective_action_plans"("complianceMatterId");
CREATE INDEX "corrective_action_plans_inspectionFindingId_idx" ON "corrective_action_plans"("inspectionFindingId");
CREATE INDEX "corrective_action_plans_status_idx" ON "corrective_action_plans"("status");

CREATE INDEX "corrective_action_items_correctiveActionPlanId_idx" ON "corrective_action_items"("correctiveActionPlanId");
CREATE INDEX "corrective_action_items_assignedToIdentityId_idx" ON "corrective_action_items"("assignedToIdentityId");

CREATE INDEX "corrective_action_verifications_correctiveActionItemId_idx" ON "corrective_action_verifications"("correctiveActionItemId");
CREATE INDEX "corrective_action_verifications_verifierIdentityId_idx" ON "corrective_action_verifications"("verifierIdentityId");

CREATE INDEX "compliance_finding_closures_inspectionFindingId_idx" ON "compliance_finding_closures"("inspectionFindingId");
CREATE INDEX "compliance_finding_reopenings_complianceFindingClosureId_idx" ON "compliance_finding_reopenings"("complianceFindingClosureId");
CREATE INDEX "compliance_assessments_complianceMatterId_idx" ON "compliance_assessments"("complianceMatterId");

CREATE INDEX "noncompliance_findings_complianceMatterId_idx" ON "noncompliance_findings"("complianceMatterId");
CREATE INDEX "noncompliance_findings_inspectionFindingId_idx" ON "noncompliance_findings"("inspectionFindingId");
CREATE INDEX "noncompliance_findings_status_idx" ON "noncompliance_findings"("status");

CREATE INDEX "compliance_escalations_complianceMatterId_idx" ON "compliance_escalations"("complianceMatterId");
CREATE INDEX "compliance_escalations_noncomplianceFindingId_idx" ON "compliance_escalations"("noncomplianceFindingId");

CREATE INDEX "enforcement_referrals_complianceEscalationId_idx" ON "enforcement_referrals"("complianceEscalationId");
CREATE INDEX "enforcement_referrals_noncomplianceFindingId_idx" ON "enforcement_referrals"("noncomplianceFindingId");
CREATE INDEX "enforcement_referrals_status_idx" ON "enforcement_referrals"("status");

CREATE INDEX "emergency_interim_action_records_complianceMatterId_idx" ON "emergency_interim_action_records"("complianceMatterId");
CREATE INDEX "emergency_interim_action_records_officialInstrumentId_idx" ON "emergency_interim_action_records"("officialInstrumentId");

CREATE INDEX "compliance_status_projections_complianceMatterId_idx" ON "compliance_status_projections"("complianceMatterId");
CREATE INDEX "compliance_status_projections_officialInstrumentId_idx" ON "compliance_status_projections"("officialInstrumentId");

CREATE INDEX "compliance_monitoring_events_complianceMatterId_idx" ON "compliance_monitoring_events"("complianceMatterId");
CREATE INDEX "compliance_monitoring_events_eventType_idx" ON "compliance_monitoring_events"("eventType");
CREATE INDEX "compliance_monitoring_events_recordedAt_idx" ON "compliance_monitoring_events"("recordedAt");

CREATE INDEX "compliance_alerts_complianceMatterId_idx" ON "compliance_alerts"("complianceMatterId");
CREATE INDEX "compliance_alerts_severity_idx" ON "compliance_alerts"("severity");

CREATE INDEX "compliance_revalidation_records_complianceMatterId_idx" ON "compliance_revalidation_records"("complianceMatterId");
CREATE INDEX "compliance_revalidation_records_officialInstrumentId_idx" ON "compliance_revalidation_records"("officialInstrumentId");

ALTER TABLE "compliance_matters" ADD CONSTRAINT "compliance_matters_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "cases"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "compliance_matters" ADD CONSTRAINT "compliance_matters_officialInstrumentId_fkey" FOREIGN KEY ("officialInstrumentId") REFERENCES "official_instruments"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "compliance_matters" ADD CONSTRAINT "compliance_matters_masterAdministrativeFileId_fkey" FOREIGN KEY ("masterAdministrativeFileId") REFERENCES "master_administrative_files"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "compliance_matters" ADD CONSTRAINT "compliance_matters_holderIdentityId_fkey" FOREIGN KEY ("holderIdentityId") REFERENCES "identities"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "compliance_matters" ADD CONSTRAINT "compliance_matters_holderOrganizationId_fkey" FOREIGN KEY ("holderOrganizationId") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "continuing_obligations" ADD CONSTRAINT "continuing_obligations_complianceMatterId_fkey" FOREIGN KEY ("complianceMatterId") REFERENCES "compliance_matters"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "continuing_obligations" ADD CONSTRAINT "continuing_obligations_officialInstrumentId_fkey" FOREIGN KEY ("officialInstrumentId") REFERENCES "official_instruments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "obligation_schedules" ADD CONSTRAINT "obligation_schedules_continuingObligationId_fkey" FOREIGN KEY ("continuingObligationId") REFERENCES "continuing_obligations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "compliance_submissions" ADD CONSTRAINT "compliance_submissions_continuingObligationId_fkey" FOREIGN KEY ("continuingObligationId") REFERENCES "continuing_obligations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "compliance_submissions" ADD CONSTRAINT "compliance_submissions_submittedByIdentityId_fkey" FOREIGN KEY ("submittedByIdentityId") REFERENCES "identities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "compliance_submissions" ADD CONSTRAINT "compliance_submissions_evidenceRecordId_fkey" FOREIGN KEY ("evidenceRecordId") REFERENCES "evidence_records"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "compliance_reviews" ADD CONSTRAINT "compliance_reviews_complianceSubmissionId_fkey" FOREIGN KEY ("complianceSubmissionId") REFERENCES "compliance_submissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "compliance_reviews" ADD CONSTRAINT "compliance_reviews_reviewerIdentityId_fkey" FOREIGN KEY ("reviewerIdentityId") REFERENCES "identities"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "compliance_reviews" ADD CONSTRAINT "compliance_reviews_reviewerOfficeholderId_fkey" FOREIGN KEY ("reviewerOfficeholderId") REFERENCES "officeholders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "inspection_plans" ADD CONSTRAINT "inspection_plans_complianceMatterId_fkey" FOREIGN KEY ("complianceMatterId") REFERENCES "compliance_matters"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "inspection_plans" ADD CONSTRAINT "inspection_plans_officialInstrumentId_fkey" FOREIGN KEY ("officialInstrumentId") REFERENCES "official_instruments"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "inspection_plans" ADD CONSTRAINT "inspection_plans_inspectionTypeDefinitionId_fkey" FOREIGN KEY ("inspectionTypeDefinitionId") REFERENCES "inspection_type_definitions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "inspection_assignments" ADD CONSTRAINT "inspection_assignments_inspectionPlanId_fkey" FOREIGN KEY ("inspectionPlanId") REFERENCES "inspection_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "inspection_assignments" ADD CONSTRAINT "inspection_assignments_inspectorOfficeholderId_fkey" FOREIGN KEY ("inspectorOfficeholderId") REFERENCES "officeholders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "inspection_assignments" ADD CONSTRAINT "inspection_assignments_inspectorIdentityId_fkey" FOREIGN KEY ("inspectorIdentityId") REFERENCES "identities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "inspection_assignments" ADD CONSTRAINT "inspection_assignments_authorityEvaluationRecordId_fkey" FOREIGN KEY ("authorityEvaluationRecordId") REFERENCES "authority_evaluation_records"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "inspection_sessions" ADD CONSTRAINT "inspection_sessions_inspectionPlanId_fkey" FOREIGN KEY ("inspectionPlanId") REFERENCES "inspection_plans"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "inspection_sessions" ADD CONSTRAINT "inspection_sessions_complianceMatterId_fkey" FOREIGN KEY ("complianceMatterId") REFERENCES "compliance_matters"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "inspection_sessions" ADD CONSTRAINT "inspection_sessions_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "cases"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "inspection_sessions" ADD CONSTRAINT "inspection_sessions_officialInstrumentId_fkey" FOREIGN KEY ("officialInstrumentId") REFERENCES "official_instruments"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "inspection_sessions" ADD CONSTRAINT "inspection_sessions_inspectionRecordId_fkey" FOREIGN KEY ("inspectionRecordId") REFERENCES "inspection_records"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "inspection_sessions" ADD CONSTRAINT "inspection_sessions_inspectionTypeDefinitionId_fkey" FOREIGN KEY ("inspectionTypeDefinitionId") REFERENCES "inspection_type_definitions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "inspection_sessions" ADD CONSTRAINT "inspection_sessions_functionAuthorityRecordId_fkey" FOREIGN KEY ("functionAuthorityRecordId") REFERENCES "function_authority_records"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "inspection_observations" ADD CONSTRAINT "inspection_observations_inspectionSessionId_fkey" FOREIGN KEY ("inspectionSessionId") REFERENCES "inspection_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "inspection_observations" ADD CONSTRAINT "inspection_observations_evidenceRecordId_fkey" FOREIGN KEY ("evidenceRecordId") REFERENCES "evidence_records"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "inspection_observations" ADD CONSTRAINT "inspection_observations_observerIdentityId_fkey" FOREIGN KEY ("observerIdentityId") REFERENCES "identities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "inspection_observations" ADD CONSTRAINT "inspection_observations_observerOfficeholderId_fkey" FOREIGN KEY ("observerOfficeholderId") REFERENCES "officeholders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "inspection_findings" ADD CONSTRAINT "inspection_findings_inspectionSessionId_fkey" FOREIGN KEY ("inspectionSessionId") REFERENCES "inspection_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "inspection_findings" ADD CONSTRAINT "inspection_findings_inspectionObservationId_fkey" FOREIGN KEY ("inspectionObservationId") REFERENCES "inspection_observations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "inspection_findings" ADD CONSTRAINT "inspection_findings_determinedByOfficeholderId_fkey" FOREIGN KEY ("determinedByOfficeholderId") REFERENCES "officeholders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "inspection_findings" ADD CONSTRAINT "inspection_findings_determinedByIdentityId_fkey" FOREIGN KEY ("determinedByIdentityId") REFERENCES "identities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "corrective_action_plans" ADD CONSTRAINT "corrective_action_plans_complianceMatterId_fkey" FOREIGN KEY ("complianceMatterId") REFERENCES "compliance_matters"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "corrective_action_plans" ADD CONSTRAINT "corrective_action_plans_inspectionFindingId_fkey" FOREIGN KEY ("inspectionFindingId") REFERENCES "inspection_findings"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "corrective_action_items" ADD CONSTRAINT "corrective_action_items_correctiveActionPlanId_fkey" FOREIGN KEY ("correctiveActionPlanId") REFERENCES "corrective_action_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "corrective_action_items" ADD CONSTRAINT "corrective_action_items_assignedToIdentityId_fkey" FOREIGN KEY ("assignedToIdentityId") REFERENCES "identities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "corrective_action_verifications" ADD CONSTRAINT "corrective_action_verifications_correctiveActionItemId_fkey" FOREIGN KEY ("correctiveActionItemId") REFERENCES "corrective_action_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "corrective_action_verifications" ADD CONSTRAINT "corrective_action_verifications_verifierIdentityId_fkey" FOREIGN KEY ("verifierIdentityId") REFERENCES "identities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "corrective_action_verifications" ADD CONSTRAINT "corrective_action_verifications_verifierOfficeholderId_fkey" FOREIGN KEY ("verifierOfficeholderId") REFERENCES "officeholders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "compliance_finding_closures" ADD CONSTRAINT "compliance_finding_closures_inspectionFindingId_fkey" FOREIGN KEY ("inspectionFindingId") REFERENCES "inspection_findings"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "compliance_finding_closures" ADD CONSTRAINT "compliance_finding_closures_closedByIdentityId_fkey" FOREIGN KEY ("closedByIdentityId") REFERENCES "identities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "compliance_finding_closures" ADD CONSTRAINT "compliance_finding_closures_closedByOfficeholderId_fkey" FOREIGN KEY ("closedByOfficeholderId") REFERENCES "officeholders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "compliance_finding_reopenings" ADD CONSTRAINT "compliance_finding_reopenings_complianceFindingClosureId_fkey" FOREIGN KEY ("complianceFindingClosureId") REFERENCES "compliance_finding_closures"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "compliance_finding_reopenings" ADD CONSTRAINT "compliance_finding_reopenings_reopenedByIdentityId_fkey" FOREIGN KEY ("reopenedByIdentityId") REFERENCES "identities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "compliance_finding_reopenings" ADD CONSTRAINT "compliance_finding_reopenings_reopenedByOfficeholderId_fkey" FOREIGN KEY ("reopenedByOfficeholderId") REFERENCES "officeholders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "compliance_assessments" ADD CONSTRAINT "compliance_assessments_complianceMatterId_fkey" FOREIGN KEY ("complianceMatterId") REFERENCES "compliance_matters"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "compliance_assessments" ADD CONSTRAINT "compliance_assessments_assessorIdentityId_fkey" FOREIGN KEY ("assessorIdentityId") REFERENCES "identities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "compliance_assessments" ADD CONSTRAINT "compliance_assessments_assessorOfficeholderId_fkey" FOREIGN KEY ("assessorOfficeholderId") REFERENCES "officeholders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "noncompliance_findings" ADD CONSTRAINT "noncompliance_findings_inspectionFindingId_fkey" FOREIGN KEY ("inspectionFindingId") REFERENCES "inspection_findings"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "noncompliance_findings" ADD CONSTRAINT "noncompliance_findings_complianceMatterId_fkey" FOREIGN KEY ("complianceMatterId") REFERENCES "compliance_matters"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "compliance_escalations" ADD CONSTRAINT "compliance_escalations_complianceMatterId_fkey" FOREIGN KEY ("complianceMatterId") REFERENCES "compliance_matters"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "compliance_escalations" ADD CONSTRAINT "compliance_escalations_noncomplianceFindingId_fkey" FOREIGN KEY ("noncomplianceFindingId") REFERENCES "noncompliance_findings"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "compliance_escalations" ADD CONSTRAINT "compliance_escalations_escalatedByIdentityId_fkey" FOREIGN KEY ("escalatedByIdentityId") REFERENCES "identities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "compliance_escalations" ADD CONSTRAINT "compliance_escalations_escalatedByOfficeholderId_fkey" FOREIGN KEY ("escalatedByOfficeholderId") REFERENCES "officeholders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "enforcement_referrals" ADD CONSTRAINT "enforcement_referrals_complianceEscalationId_fkey" FOREIGN KEY ("complianceEscalationId") REFERENCES "compliance_escalations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "enforcement_referrals" ADD CONSTRAINT "enforcement_referrals_noncomplianceFindingId_fkey" FOREIGN KEY ("noncomplianceFindingId") REFERENCES "noncompliance_findings"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "enforcement_referrals" ADD CONSTRAINT "enforcement_referrals_referredByIdentityId_fkey" FOREIGN KEY ("referredByIdentityId") REFERENCES "identities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "enforcement_referrals" ADD CONSTRAINT "enforcement_referrals_referredByOfficeholderId_fkey" FOREIGN KEY ("referredByOfficeholderId") REFERENCES "officeholders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "emergency_interim_action_records" ADD CONSTRAINT "emergency_interim_action_records_complianceMatterId_fkey" FOREIGN KEY ("complianceMatterId") REFERENCES "compliance_matters"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "emergency_interim_action_records" ADD CONSTRAINT "emergency_interim_action_records_officialInstrumentId_fkey" FOREIGN KEY ("officialInstrumentId") REFERENCES "official_instruments"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "emergency_interim_action_records" ADD CONSTRAINT "emergency_interim_action_records_recordedByIdentityId_fkey" FOREIGN KEY ("recordedByIdentityId") REFERENCES "identities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "emergency_interim_action_records" ADD CONSTRAINT "emergency_interim_action_records_recordedByOfficeholderId_fkey" FOREIGN KEY ("recordedByOfficeholderId") REFERENCES "officeholders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "compliance_status_projections" ADD CONSTRAINT "compliance_status_projections_complianceMatterId_fkey" FOREIGN KEY ("complianceMatterId") REFERENCES "compliance_matters"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "compliance_status_projections" ADD CONSTRAINT "compliance_status_projections_officialInstrumentId_fkey" FOREIGN KEY ("officialInstrumentId") REFERENCES "official_instruments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "compliance_monitoring_events" ADD CONSTRAINT "compliance_monitoring_events_complianceMatterId_fkey" FOREIGN KEY ("complianceMatterId") REFERENCES "compliance_matters"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "compliance_monitoring_events" ADD CONSTRAINT "compliance_monitoring_events_actorIdentityId_fkey" FOREIGN KEY ("actorIdentityId") REFERENCES "identities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "compliance_alerts" ADD CONSTRAINT "compliance_alerts_complianceMatterId_fkey" FOREIGN KEY ("complianceMatterId") REFERENCES "compliance_matters"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "compliance_revalidation_records" ADD CONSTRAINT "compliance_revalidation_records_complianceMatterId_fkey" FOREIGN KEY ("complianceMatterId") REFERENCES "compliance_matters"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "compliance_revalidation_records" ADD CONSTRAINT "compliance_revalidation_records_officialInstrumentId_fkey" FOREIGN KEY ("officialInstrumentId") REFERENCES "official_instruments"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "compliance_revalidation_records" ADD CONSTRAINT "compliance_revalidation_records_revalidatedByIdentityId_fkey" FOREIGN KEY ("revalidatedByIdentityId") REFERENCES "identities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "compliance_revalidation_records" ADD CONSTRAINT "compliance_revalidation_records_revalidatedByOfficeholderId_fkey" FOREIGN KEY ("revalidatedByOfficeholderId") REFERENCES "officeholders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
