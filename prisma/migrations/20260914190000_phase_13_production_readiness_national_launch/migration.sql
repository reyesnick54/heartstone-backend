-- Phase 13: Production Readiness, National Launch and Exit

CREATE TYPE "ProductionDefectSeverity" AS ENUM (
  'CRITICAL',
  'MAJOR',
  'MODERATE',
  'MINOR'
);

CREATE TYPE "ProductionDefectStatus" AS ENUM (
  'OPEN',
  'UNDER_INVESTIGATION',
  'CORRECTIVE_ACTION_IN_PROGRESS',
  'PENDING_VERIFICATION',
  'CLOSED'
);

CREATE TYPE "ProductionCorrectiveActionStatus" AS ENUM (
  'OPEN',
  'IN_PROGRESS',
  'PENDING_VERIFICATION',
  'VERIFIED',
  'CLOSED'
);

CREATE TYPE "OperationalRevalidationOutcome" AS ENUM (
  'CONFIRM',
  'CONFIRM_WITH_CONDITIONS',
  'REDUCE_SCOPE',
  'RETURN_TO_PILOT',
  'SUSPEND',
  'REQUIRE_CORRECTIVE_ACTION',
  'RETIRE',
  'REPLACE'
);

CREATE TYPE "OperationalRevalidationTrigger" AS ENUM (
  'SCHEDULED_REVIEW',
  'LEGAL_SOURCE_CHANGE',
  'AUTHORITY_CHANGE',
  'OFFICEHOLDER_CHANGE',
  'SECURITY_INCIDENT',
  'MATERIAL_VULNERABILITY',
  'MAJOR_PRODUCTION_DEFECT',
  'ARCHITECTURE_CHANGE',
  'VENDOR_CHANGE',
  'INTEGRATION_CHANGE',
  'AI_MODEL_CHANGE',
  'CRYPTOGRAPHIC_CHANGE',
  'DATA_CLASSIFICATION_CHANGE',
  'CONTINUITY_FAILURE',
  'MATERIAL_PERFORMANCE_DEGRADATION'
);

CREATE TYPE "OperationalSuspensionScope" AS ENUM (
  'ENTIRE_PLATFORM',
  'DEPARTMENT',
  'SERVICE',
  'WORKFLOW',
  'INTEGRATION',
  'AI_USE_CASE',
  'AI_AGENT',
  'ISSUANCE_CAPABILITY',
  'PAYMENT_CAPABILITY',
  'NOTIFICATION_CAPABILITY'
);

CREATE TYPE "OperationalSuspensionStatus" AS ENUM (
  'ACTIVE',
  'LIFTED'
);

CREATE TYPE "LaunchEventType" AS ENUM (
  'SNAPSHOT_CREATED',
  'GATE_EVALUATED',
  'ACTIVATION_RECORDED',
  'STABILIZATION_STARTED',
  'STABILIZATION_COMPLETED',
  'SUSPENSION_ISSUED',
  'SUSPENSION_LIFTED',
  'REVALIDATION_REQUIRED',
  'REVALIDATION_COMPLETED',
  'DEFECT_RECORDED',
  'ROLLBACK_EXECUTED',
  'RETIREMENT_RECORDED',
  'DECOMMISSIONING_STARTED',
  'EXIT_ACCEPTED'
);

CREATE TYPE "LaunchGateOutcome" AS ENUM (
  'PASSED',
  'BLOCKED',
  'CONDITIONAL'
);

CREATE TYPE "OperationalActivationStatus" AS ENUM (
  'PENDING',
  'ACTIVATED',
  'BLOCKED',
  'SUSPENDED',
  'RETIRED'
);

CREATE TYPE "OperationalActivationOutcome" AS ENUM (
  'ACTIVATED',
  'BLOCKED',
  'REQUIRES_ACCEPTANCE',
  'REQUIRES_GATE',
  'REQUIRES_AUTHORITY',
  'REQUIRES_MONITORING',
  'REQUIRES_ROLLBACK_PLAN',
  'REQUIRES_CONTINUITY',
  'REQUIRES_QUALIFIED_STAFF',
  'REQUIRES_SUSPENSION_PATH'
);

CREATE TYPE "StabilizationPeriodStatus" AS ENUM (
  'PLANNED',
  'ACTIVE',
  'COMPLETED',
  'EXTENDED',
  'FAILED'
);

CREATE TYPE "StabilizationObservationCategory" AS ENUM (
  'ERRORS',
  'PERFORMANCE',
  'WORKFLOW_INTEGRITY',
  'AUTHORITY_FAILURES',
  'RECORDS_INTEGRITY',
  'SECURITY_EVENTS',
  'USER_ISSUES',
  'INTEGRATION_FAILURES',
  'PAYMENT_FAILURES',
  'NOTIFICATION_FAILURES',
  'AI_ANOMALIES',
  'ACCESS_ANOMALIES',
  'SUPPORT_VOLUME'
);

CREATE TYPE "ProductionMonitoringPlanStatus" AS ENUM (
  'DRAFT',
  'APPROVED',
  'ACTIVE',
  'SUPERSEDED'
);

CREATE TYPE "CapabilityReplacementStatus" AS ENUM (
  'PLANNED',
  'ACCEPTANCE_PENDING',
  'CUTOVER_IN_PROGRESS',
  'COMPLETED',
  'ROLLED_BACK'
);

CREATE TYPE "DecommissioningPlanStatus" AS ENUM (
  'DRAFT',
  'APPROVED',
  'IN_PROGRESS',
  'COMPLETED',
  'REJECTED'
);

CREATE TYPE "ExitAcceptanceOutcome" AS ENUM (
  'ACCEPTED',
  'REJECTED',
  'CONDITIONAL'
);

CREATE TABLE "launch_readiness_snapshots" (
  "id" UUID NOT NULL,
  "snapshotNumber" TEXT NOT NULL,
  "releaseCommit" TEXT NOT NULL,
  "artifactDigest" TEXT NOT NULL,
  "migrationState" TEXT NOT NULL,
  "configurationBaseline" JSONB NOT NULL DEFAULT '{}',
  "activeCapabilities" JSONB NOT NULL DEFAULT '[]',
  "institutionalAcceptanceDossiers" JSONB NOT NULL DEFAULT '[]',
  "activationDecisions" JSONB NOT NULL DEFAULT '[]',
  "staffQualifications" JSONB NOT NULL DEFAULT '[]',
  "securityReadiness" JSONB NOT NULL DEFAULT '{}',
  "privacyReadiness" JSONB NOT NULL DEFAULT '{}',
  "recordsReadiness" JSONB NOT NULL DEFAULT '{}',
  "continuityReadiness" JSONB NOT NULL DEFAULT '{}',
  "integrations" JSONB NOT NULL DEFAULT '[]',
  "aiModelVersions" JSONB NOT NULL DEFAULT '[]',
  "paymentProviders" JSONB NOT NULL DEFAULT '[]',
  "notificationProviders" JSONB NOT NULL DEFAULT '[]',
  "knownDefects" JSONB NOT NULL DEFAULT '[]',
  "residualRisks" JSONB NOT NULL DEFAULT '[]',
  "supportReadiness" JSONB NOT NULL DEFAULT '{}',
  "monitoringReadiness" JSONB NOT NULL DEFAULT '{}',
  "rollbackPlan" JSONB NOT NULL DEFAULT '{}',
  "safeHaltConditions" JSONB NOT NULL DEFAULT '[]',
  "integrityHash" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdByIdentityId" UUID NOT NULL,
  CONSTRAINT "launch_readiness_snapshots_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "launch_events" (
  "id" UUID NOT NULL,
  "eventType" "LaunchEventType" NOT NULL,
  "launchReadinessSnapshotId" UUID,
  "description" TEXT NOT NULL,
  "eventData" JSONB NOT NULL DEFAULT '{}',
  "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "recordedByIdentityId" UUID NOT NULL,
  CONSTRAINT "launch_events_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "operational_activation_records" (
  "id" UUID NOT NULL,
  "activationNumber" TEXT NOT NULL,
  "launchReadinessSnapshotId" UUID NOT NULL,
  "accountableOwnerIdentityId" UUID NOT NULL,
  "accountableOfficeholderId" UUID,
  "performedByIdentityId" UUID NOT NULL,
  "scopeDescription" TEXT NOT NULL,
  "scopeLimitations" JSONB NOT NULL DEFAULT '[]',
  "acceptedReleaseCommit" TEXT NOT NULL,
  "acceptedArtifactDigest" TEXT NOT NULL,
  "activationBasis" TEXT NOT NULL,
  "priorStatus" "OperationalActivationStatus" NOT NULL,
  "newStatus" "OperationalActivationStatus" NOT NULL,
  "authorityEvaluationRecordId" UUID,
  "outcome" "OperationalActivationOutcome" NOT NULL,
  "gateOutcome" "LaunchGateOutcome",
  "residualRisksAccepted" JSONB NOT NULL DEFAULT '[]',
  "effectiveAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "operational_activation_records_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "production_monitoring_plans" (
  "id" UUID NOT NULL,
  "planNumber" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "monitoringConfig" JSONB NOT NULL DEFAULT '{}',
  "slis" JSONB NOT NULL DEFAULT '[]',
  "slos" JSONB NOT NULL DEFAULT '[]',
  "alertRules" JSONB NOT NULL DEFAULT '[]',
  "incidentProcessRef" TEXT NOT NULL,
  "status" "ProductionMonitoringPlanStatus" NOT NULL DEFAULT 'DRAFT',
  "ownerIdentityId" UUID NOT NULL,
  "effectiveFrom" TIMESTAMP(3) NOT NULL,
  "effectiveUntil" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "production_monitoring_plans_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "stabilization_periods" (
  "id" UUID NOT NULL,
  "periodNumber" TEXT NOT NULL,
  "operationalActivationRecordId" UUID NOT NULL,
  "monitoringPlanId" UUID NOT NULL,
  "startAt" TIMESTAMP(3) NOT NULL,
  "plannedEndAt" TIMESTAMP(3) NOT NULL,
  "actualEndAt" TIMESTAMP(3),
  "successCriteria" JSONB NOT NULL DEFAULT '[]',
  "status" "StabilizationPeriodStatus" NOT NULL DEFAULT 'PLANNED',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "stabilization_periods_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "stabilization_observations" (
  "id" UUID NOT NULL,
  "stabilizationPeriodId" UUID NOT NULL,
  "category" "StabilizationObservationCategory" NOT NULL,
  "observationText" TEXT NOT NULL,
  "metricData" JSONB NOT NULL DEFAULT '{}',
  "severity" "ProductionDefectSeverity",
  "observedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "recordedByIdentityId" UUID NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "stabilization_observations_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "production_defects" (
  "id" UUID NOT NULL,
  "defectNumber" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "severity" "ProductionDefectSeverity" NOT NULL,
  "affectedCapabilityRef" TEXT NOT NULL,
  "discoveryContext" TEXT NOT NULL,
  "reportedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "reportedByIdentityId" UUID NOT NULL,
  "status" "ProductionDefectStatus" NOT NULL DEFAULT 'OPEN',
  "mayTriggerSafeHalt" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "production_defects_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "production_corrective_actions" (
  "id" UUID NOT NULL,
  "productionDefectId" UUID NOT NULL,
  "actionDescription" TEXT NOT NULL,
  "assignedToIdentityId" UUID NOT NULL,
  "verificationRequired" BOOLEAN NOT NULL DEFAULT true,
  "verificationNotes" TEXT,
  "verifiedByIdentityId" UUID,
  "verifiedAt" TIMESTAMP(3),
  "status" "ProductionCorrectiveActionStatus" NOT NULL DEFAULT 'OPEN',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "production_corrective_actions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "operational_revalidations" (
  "id" UUID NOT NULL,
  "revalidationNumber" TEXT NOT NULL,
  "triggerReason" "OperationalRevalidationTrigger" NOT NULL,
  "triggerDescription" TEXT NOT NULL,
  "targetCapabilityRef" TEXT NOT NULL,
  "scopeDescription" TEXT NOT NULL,
  "outcome" "OperationalRevalidationOutcome",
  "outcomeNotes" TEXT,
  "requiredBy" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "conductedByIdentityId" UUID,
  "authorityEvaluationRecordId" UUID,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "operational_revalidations_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "operational_suspensions" (
  "id" UUID NOT NULL,
  "suspensionNumber" TEXT NOT NULL,
  "scope" "OperationalSuspensionScope" NOT NULL,
  "targetReference" TEXT NOT NULL,
  "reason" TEXT NOT NULL,
  "suspensionEffects" JSONB NOT NULL DEFAULT '{}',
  "preserveRecords" BOOLEAN NOT NULL DEFAULT true,
  "preserveAudit" BOOLEAN NOT NULL DEFAULT true,
  "preserveAppealsAccess" BOOLEAN NOT NULL DEFAULT true,
  "revokedCredentialRefs" JSONB NOT NULL DEFAULT '[]',
  "disabledIntegrationRefs" JSONB NOT NULL DEFAULT '[]',
  "status" "OperationalSuspensionStatus" NOT NULL DEFAULT 'ACTIVE',
  "suspendedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "suspendedByIdentityId" UUID NOT NULL,
  "authorityEvaluationRecordId" UUID,
  "liftedAt" TIMESTAMP(3),
  "liftedByIdentityId" UUID,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "operational_suspensions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "capability_retirements" (
  "id" UUID NOT NULL,
  "retirementNumber" TEXT NOT NULL,
  "capabilityRef" TEXT NOT NULL,
  "capabilityType" TEXT NOT NULL,
  "reason" TEXT NOT NULL,
  "recordsPreserved" BOOLEAN NOT NULL DEFAULT true,
  "credentialsRevoked" BOOLEAN NOT NULL DEFAULT false,
  "integrationsShutdown" BOOLEAN NOT NULL DEFAULT false,
  "successorCapabilityRef" TEXT,
  "effectiveAt" TIMESTAMP(3) NOT NULL,
  "authorizedByIdentityId" UUID NOT NULL,
  "authorityEvaluationRecordId" UUID,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "capability_retirements_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "capability_replacements" (
  "id" UUID NOT NULL,
  "replacementNumber" TEXT NOT NULL,
  "predecessorCapabilityRef" TEXT NOT NULL,
  "successorCapabilityRef" TEXT NOT NULL,
  "predecessorRetirementId" UUID,
  "dataMigrationPlan" JSONB NOT NULL DEFAULT '{}',
  "recordsContinuityPlan" JSONB NOT NULL DEFAULT '{}',
  "credentialTransitionPlan" JSONB NOT NULL DEFAULT '{}',
  "integrationTransitionPlan" JSONB NOT NULL DEFAULT '{}',
  "userCommunicationPlan" JSONB NOT NULL DEFAULT '{}',
  "cutoverPlan" JSONB NOT NULL DEFAULT '{}',
  "rollbackPlan" JSONB NOT NULL DEFAULT '{}',
  "acceptanceRecordRef" TEXT,
  "status" "CapabilityReplacementStatus" NOT NULL DEFAULT 'PLANNED',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "capability_replacements_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "decommissioning_plans" (
  "id" UUID NOT NULL,
  "planNumber" TEXT NOT NULL,
  "targetSystemRef" TEXT NOT NULL,
  "openCasesDisposition" JSONB NOT NULL DEFAULT '{}',
  "recordsDisposition" JSONB NOT NULL DEFAULT '{}',
  "evidenceDisposition" JSONB NOT NULL DEFAULT '{}',
  "dataExportPlan" JSONB NOT NULL DEFAULT '{}',
  "legalHolds" JSONB NOT NULL DEFAULT '[]',
  "archivePlan" JSONB NOT NULL DEFAULT '{}',
  "credentialShutdownPlan" JSONB NOT NULL DEFAULT '{}',
  "integrationShutdownPlan" JSONB NOT NULL DEFAULT '{}',
  "status" "DecommissioningPlanStatus" NOT NULL DEFAULT 'DRAFT',
  "approvedAt" TIMESTAMP(3),
  "approvedByIdentityId" UUID,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "decommissioning_plans_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "decommissioning_executions" (
  "id" UUID NOT NULL,
  "decommissioningPlanId" UUID NOT NULL,
  "executionNotes" TEXT NOT NULL,
  "executedSteps" JSONB NOT NULL DEFAULT '[]',
  "executedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "executedByIdentityId" UUID NOT NULL,
  "evidenceRefs" JSONB NOT NULL DEFAULT '[]',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "decommissioning_executions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "data_export_manifests" (
  "id" UUID NOT NULL,
  "manifestNumber" TEXT NOT NULL,
  "exportScope" JSONB NOT NULL DEFAULT '{}',
  "dataCategories" JSONB NOT NULL DEFAULT '[]',
  "formatDescription" TEXT NOT NULL,
  "verificationHash" TEXT NOT NULL,
  "checksumAlgorithm" TEXT NOT NULL DEFAULT 'SHA-256',
  "exportedAt" TIMESTAMP(3),
  "exportedByIdentityId" UUID,
  "verifiedAt" TIMESTAMP(3),
  "verifiedByIdentityId" UUID,
  "isUsable" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "data_export_manifests_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "records_preservation_manifests" (
  "id" UUID NOT NULL,
  "manifestNumber" TEXT NOT NULL,
  "preservedRecords" JSONB NOT NULL DEFAULT '[]',
  "legalHolds" JSONB NOT NULL DEFAULT '[]',
  "archiveLocations" JSONB NOT NULL DEFAULT '[]',
  "accessPolicy" JSONB NOT NULL DEFAULT '{}',
  "verificationHash" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdByIdentityId" UUID NOT NULL,
  CONSTRAINT "records_preservation_manifests_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "credential_shutdown_records" (
  "id" UUID NOT NULL,
  "credentialRef" TEXT NOT NULL,
  "credentialType" TEXT NOT NULL,
  "shutdownReason" TEXT NOT NULL,
  "revokedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "revokedByIdentityId" UUID NOT NULL,
  "decommissioningExecutionId" UUID,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "credential_shutdown_records_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "integration_shutdown_records" (
  "id" UUID NOT NULL,
  "integrationDefinitionId" UUID,
  "integrationRef" TEXT NOT NULL,
  "shutdownReason" TEXT NOT NULL,
  "webhooksDisabled" BOOLEAN NOT NULL DEFAULT true,
  "jobsStopped" BOOLEAN NOT NULL DEFAULT true,
  "shutDownAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "shutDownByIdentityId" UUID NOT NULL,
  "decommissioningExecutionId" UUID,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "integration_shutdown_records_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "exit_acceptance_records" (
  "id" UUID NOT NULL,
  "acceptanceNumber" TEXT NOT NULL,
  "decommissioningExecutionId" UUID NOT NULL,
  "institutionalAcceptorIdentityId" UUID NOT NULL,
  "institutionalAcceptorOfficeholderId" UUID,
  "acceptanceOutcome" "ExitAcceptanceOutcome" NOT NULL,
  "acceptanceNotes" TEXT NOT NULL,
  "residualObligations" JSONB NOT NULL DEFAULT '[]',
  "acceptedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "exit_acceptance_records_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "launch_readiness_snapshots_snapshotNumber_key" ON "launch_readiness_snapshots"("snapshotNumber");
CREATE INDEX "launch_readiness_snapshots_createdAt_idx" ON "launch_readiness_snapshots"("createdAt");
CREATE INDEX "launch_readiness_snapshots_releaseCommit_idx" ON "launch_readiness_snapshots"("releaseCommit");

CREATE INDEX "launch_events_eventType_idx" ON "launch_events"("eventType");
CREATE INDEX "launch_events_launchReadinessSnapshotId_idx" ON "launch_events"("launchReadinessSnapshotId");
CREATE INDEX "launch_events_recordedAt_idx" ON "launch_events"("recordedAt");

CREATE UNIQUE INDEX "operational_activation_records_activationNumber_key" ON "operational_activation_records"("activationNumber");
CREATE INDEX "operational_activation_records_launchReadinessSnapshotId_idx" ON "operational_activation_records"("launchReadinessSnapshotId");
CREATE INDEX "operational_activation_records_newStatus_idx" ON "operational_activation_records"("newStatus");
CREATE INDEX "operational_activation_records_effectiveAt_idx" ON "operational_activation_records"("effectiveAt");

CREATE UNIQUE INDEX "production_monitoring_plans_planNumber_key" ON "production_monitoring_plans"("planNumber");
CREATE INDEX "production_monitoring_plans_status_idx" ON "production_monitoring_plans"("status");
CREATE INDEX "production_monitoring_plans_effectiveFrom_idx" ON "production_monitoring_plans"("effectiveFrom");

CREATE UNIQUE INDEX "stabilization_periods_periodNumber_key" ON "stabilization_periods"("periodNumber");
CREATE INDEX "stabilization_periods_operationalActivationRecordId_idx" ON "stabilization_periods"("operationalActivationRecordId");
CREATE INDEX "stabilization_periods_status_idx" ON "stabilization_periods"("status");

CREATE INDEX "stabilization_observations_stabilizationPeriodId_idx" ON "stabilization_observations"("stabilizationPeriodId");
CREATE INDEX "stabilization_observations_category_idx" ON "stabilization_observations"("category");
CREATE INDEX "stabilization_observations_observedAt_idx" ON "stabilization_observations"("observedAt");

CREATE UNIQUE INDEX "production_defects_defectNumber_key" ON "production_defects"("defectNumber");
CREATE INDEX "production_defects_severity_idx" ON "production_defects"("severity");
CREATE INDEX "production_defects_status_idx" ON "production_defects"("status");
CREATE INDEX "production_defects_affectedCapabilityRef_idx" ON "production_defects"("affectedCapabilityRef");

CREATE INDEX "production_corrective_actions_productionDefectId_idx" ON "production_corrective_actions"("productionDefectId");
CREATE INDEX "production_corrective_actions_status_idx" ON "production_corrective_actions"("status");

CREATE UNIQUE INDEX "operational_revalidations_revalidationNumber_key" ON "operational_revalidations"("revalidationNumber");
CREATE INDEX "operational_revalidations_targetCapabilityRef_idx" ON "operational_revalidations"("targetCapabilityRef");
CREATE INDEX "operational_revalidations_triggerReason_idx" ON "operational_revalidations"("triggerReason");
CREATE INDEX "operational_revalidations_outcome_idx" ON "operational_revalidations"("outcome");

CREATE UNIQUE INDEX "operational_suspensions_suspensionNumber_key" ON "operational_suspensions"("suspensionNumber");
CREATE INDEX "operational_suspensions_scope_idx" ON "operational_suspensions"("scope");
CREATE INDEX "operational_suspensions_targetReference_idx" ON "operational_suspensions"("targetReference");
CREATE INDEX "operational_suspensions_status_idx" ON "operational_suspensions"("status");

CREATE UNIQUE INDEX "capability_retirements_retirementNumber_key" ON "capability_retirements"("retirementNumber");
CREATE INDEX "capability_retirements_capabilityRef_idx" ON "capability_retirements"("capabilityRef");
CREATE INDEX "capability_retirements_effectiveAt_idx" ON "capability_retirements"("effectiveAt");

CREATE UNIQUE INDEX "capability_replacements_replacementNumber_key" ON "capability_replacements"("replacementNumber");
CREATE INDEX "capability_replacements_predecessorCapabilityRef_idx" ON "capability_replacements"("predecessorCapabilityRef");
CREATE INDEX "capability_replacements_successorCapabilityRef_idx" ON "capability_replacements"("successorCapabilityRef");
CREATE INDEX "capability_replacements_status_idx" ON "capability_replacements"("status");

CREATE UNIQUE INDEX "decommissioning_plans_planNumber_key" ON "decommissioning_plans"("planNumber");
CREATE INDEX "decommissioning_plans_targetSystemRef_idx" ON "decommissioning_plans"("targetSystemRef");
CREATE INDEX "decommissioning_plans_status_idx" ON "decommissioning_plans"("status");

CREATE INDEX "decommissioning_executions_decommissioningPlanId_idx" ON "decommissioning_executions"("decommissioningPlanId");
CREATE INDEX "decommissioning_executions_executedAt_idx" ON "decommissioning_executions"("executedAt");

CREATE UNIQUE INDEX "data_export_manifests_manifestNumber_key" ON "data_export_manifests"("manifestNumber");
CREATE INDEX "data_export_manifests_isUsable_idx" ON "data_export_manifests"("isUsable");

CREATE UNIQUE INDEX "records_preservation_manifests_manifestNumber_key" ON "records_preservation_manifests"("manifestNumber");

CREATE INDEX "credential_shutdown_records_credentialRef_idx" ON "credential_shutdown_records"("credentialRef");

CREATE INDEX "integration_shutdown_records_integrationRef_idx" ON "integration_shutdown_records"("integrationRef");

CREATE UNIQUE INDEX "exit_acceptance_records_acceptanceNumber_key" ON "exit_acceptance_records"("acceptanceNumber");
CREATE INDEX "exit_acceptance_records_decommissioningExecutionId_idx" ON "exit_acceptance_records"("decommissioningExecutionId");
CREATE INDEX "exit_acceptance_records_acceptanceOutcome_idx" ON "exit_acceptance_records"("acceptanceOutcome");

ALTER TABLE "launch_readiness_snapshots" ADD CONSTRAINT "launch_readiness_snapshots_createdByIdentityId_fkey" FOREIGN KEY ("createdByIdentityId") REFERENCES "identities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "launch_events" ADD CONSTRAINT "launch_events_launchReadinessSnapshotId_fkey" FOREIGN KEY ("launchReadinessSnapshotId") REFERENCES "launch_readiness_snapshots"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "launch_events" ADD CONSTRAINT "launch_events_recordedByIdentityId_fkey" FOREIGN KEY ("recordedByIdentityId") REFERENCES "identities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "operational_activation_records" ADD CONSTRAINT "operational_activation_records_launchReadinessSnapshotId_fkey" FOREIGN KEY ("launchReadinessSnapshotId") REFERENCES "launch_readiness_snapshots"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "operational_activation_records" ADD CONSTRAINT "operational_activation_records_accountableOwnerIdentityId_fkey" FOREIGN KEY ("accountableOwnerIdentityId") REFERENCES "identities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "operational_activation_records" ADD CONSTRAINT "operational_activation_records_performedByIdentityId_fkey" FOREIGN KEY ("performedByIdentityId") REFERENCES "identities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "operational_activation_records" ADD CONSTRAINT "operational_activation_records_accountableOfficeholderId_fkey" FOREIGN KEY ("accountableOfficeholderId") REFERENCES "officeholders"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "operational_activation_records" ADD CONSTRAINT "operational_activation_records_authorityEvaluationRecordId_fkey" FOREIGN KEY ("authorityEvaluationRecordId") REFERENCES "authority_evaluation_records"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "production_monitoring_plans" ADD CONSTRAINT "production_monitoring_plans_ownerIdentityId_fkey" FOREIGN KEY ("ownerIdentityId") REFERENCES "identities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "stabilization_periods" ADD CONSTRAINT "stabilization_periods_operationalActivationRecordId_fkey" FOREIGN KEY ("operationalActivationRecordId") REFERENCES "operational_activation_records"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "stabilization_periods" ADD CONSTRAINT "stabilization_periods_monitoringPlanId_fkey" FOREIGN KEY ("monitoringPlanId") REFERENCES "production_monitoring_plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "stabilization_observations" ADD CONSTRAINT "stabilization_observations_stabilizationPeriodId_fkey" FOREIGN KEY ("stabilizationPeriodId") REFERENCES "stabilization_periods"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "stabilization_observations" ADD CONSTRAINT "stabilization_observations_recordedByIdentityId_fkey" FOREIGN KEY ("recordedByIdentityId") REFERENCES "identities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "production_defects" ADD CONSTRAINT "production_defects_reportedByIdentityId_fkey" FOREIGN KEY ("reportedByIdentityId") REFERENCES "identities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "production_corrective_actions" ADD CONSTRAINT "production_corrective_actions_productionDefectId_fkey" FOREIGN KEY ("productionDefectId") REFERENCES "production_defects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "production_corrective_actions" ADD CONSTRAINT "production_corrective_actions_assignedToIdentityId_fkey" FOREIGN KEY ("assignedToIdentityId") REFERENCES "identities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "production_corrective_actions" ADD CONSTRAINT "production_corrective_actions_verifiedByIdentityId_fkey" FOREIGN KEY ("verifiedByIdentityId") REFERENCES "identities"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "operational_revalidations" ADD CONSTRAINT "operational_revalidations_conductedByIdentityId_fkey" FOREIGN KEY ("conductedByIdentityId") REFERENCES "identities"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "operational_revalidations" ADD CONSTRAINT "operational_revalidations_authorityEvaluationRecordId_fkey" FOREIGN KEY ("authorityEvaluationRecordId") REFERENCES "authority_evaluation_records"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "operational_suspensions" ADD CONSTRAINT "operational_suspensions_suspendedByIdentityId_fkey" FOREIGN KEY ("suspendedByIdentityId") REFERENCES "identities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "operational_suspensions" ADD CONSTRAINT "operational_suspensions_liftedByIdentityId_fkey" FOREIGN KEY ("liftedByIdentityId") REFERENCES "identities"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "operational_suspensions" ADD CONSTRAINT "operational_suspensions_authorityEvaluationRecordId_fkey" FOREIGN KEY ("authorityEvaluationRecordId") REFERENCES "authority_evaluation_records"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "capability_retirements" ADD CONSTRAINT "capability_retirements_authorizedByIdentityId_fkey" FOREIGN KEY ("authorizedByIdentityId") REFERENCES "identities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "capability_retirements" ADD CONSTRAINT "capability_retirements_authorityEvaluationRecordId_fkey" FOREIGN KEY ("authorityEvaluationRecordId") REFERENCES "authority_evaluation_records"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "capability_replacements" ADD CONSTRAINT "capability_replacements_predecessorRetirementId_fkey" FOREIGN KEY ("predecessorRetirementId") REFERENCES "capability_retirements"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "decommissioning_plans" ADD CONSTRAINT "decommissioning_plans_approvedByIdentityId_fkey" FOREIGN KEY ("approvedByIdentityId") REFERENCES "identities"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "decommissioning_executions" ADD CONSTRAINT "decommissioning_executions_decommissioningPlanId_fkey" FOREIGN KEY ("decommissioningPlanId") REFERENCES "decommissioning_plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "decommissioning_executions" ADD CONSTRAINT "decommissioning_executions_executedByIdentityId_fkey" FOREIGN KEY ("executedByIdentityId") REFERENCES "identities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "data_export_manifests" ADD CONSTRAINT "data_export_manifests_exportedByIdentityId_fkey" FOREIGN KEY ("exportedByIdentityId") REFERENCES "identities"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "data_export_manifests" ADD CONSTRAINT "data_export_manifests_verifiedByIdentityId_fkey" FOREIGN KEY ("verifiedByIdentityId") REFERENCES "identities"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "records_preservation_manifests" ADD CONSTRAINT "records_preservation_manifests_createdByIdentityId_fkey" FOREIGN KEY ("createdByIdentityId") REFERENCES "identities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "credential_shutdown_records" ADD CONSTRAINT "credential_shutdown_records_revokedByIdentityId_fkey" FOREIGN KEY ("revokedByIdentityId") REFERENCES "identities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "credential_shutdown_records" ADD CONSTRAINT "credential_shutdown_records_decommissioningExecutionId_fkey" FOREIGN KEY ("decommissioningExecutionId") REFERENCES "decommissioning_executions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "integration_shutdown_records" ADD CONSTRAINT "integration_shutdown_records_shutDownByIdentityId_fkey" FOREIGN KEY ("shutDownByIdentityId") REFERENCES "identities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "integration_shutdown_records" ADD CONSTRAINT "integration_shutdown_records_decommissioningExecutionId_fkey" FOREIGN KEY ("decommissioningExecutionId") REFERENCES "decommissioning_executions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "integration_shutdown_records" ADD CONSTRAINT "integration_shutdown_records_integrationDefinitionId_fkey" FOREIGN KEY ("integrationDefinitionId") REFERENCES "integration_definitions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "exit_acceptance_records" ADD CONSTRAINT "exit_acceptance_records_decommissioningExecutionId_fkey" FOREIGN KEY ("decommissioningExecutionId") REFERENCES "decommissioning_executions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "exit_acceptance_records" ADD CONSTRAINT "exit_acceptance_records_institutionalAcceptorIdentityId_fkey" FOREIGN KEY ("institutionalAcceptorIdentityId") REFERENCES "identities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "exit_acceptance_records" ADD CONSTRAINT "exit_acceptance_records_institutionalAcceptorOfficeholderId_fkey" FOREIGN KEY ("institutionalAcceptorOfficeholderId") REFERENCES "officeholders"("id") ON DELETE SET NULL ON UPDATE CASCADE;
