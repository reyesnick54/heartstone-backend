-- Phase 13D: Business Continuity, Backup, Disaster Recovery, Manual Fallback and Institutional Resumption

CREATE TYPE "ConfigurationConfirmationStatus" AS ENUM ('CONFIRMED', 'UNCONFIRMED', 'TBD');
CREATE TYPE "CriticalServiceCriticality" AS ENUM ('TIER_1_ESSENTIAL', 'TIER_2_IMPORTANT', 'TIER_3_SUPPORTING', 'UNCLASSIFIED');
CREATE TYPE "CriticalServiceDefinitionStatus" AS ENUM ('DRAFT', 'UNDER_REVIEW', 'ACTIVE', 'SUSPENDED', 'RETIRED');
CREATE TYPE "ContinuityScenarioType" AS ENUM (
  'DATABASE_OUTAGE',
  'STORAGE_OUTAGE',
  'HOSTING_OUTAGE',
  'NETWORK_OUTAGE',
  'IDENTITY_OUTAGE',
  'INTEGRATION_OUTAGE',
  'PAYMENT_OUTAGE',
  'NOTIFICATION_OUTAGE',
  'AI_PROVIDER_OUTAGE',
  'CYBERATTACK',
  'CREDENTIAL_COMPROMISE',
  'RECORDS_CORRUPTION',
  'DATA_LOSS',
  'WORKFORCE_DISRUPTION',
  'PARTNER_OUTAGE'
);
CREATE TYPE "ContinuityDependencyType" AS ENUM (
  'INTERNAL_SYSTEM',
  'EXTERNAL_INTEGRATION',
  'IDENTITY_PROVIDER',
  'PAYMENT_PROVIDER',
  'NOTIFICATION_PROVIDER',
  'AI_PROVIDER',
  'PARTNER_ORGANIZATION',
  'WORKFORCE',
  'OTHER_APPROVED'
);
CREATE TYPE "SinglePointOfFailureStatus" AS ENUM ('IDENTIFIED', 'MITIGATED', 'ACCEPTED_RISK', 'CLOSED');
CREATE TYPE "ContinuityProcedureStatus" AS ENUM ('DRAFT', 'APPROVED', 'SUSPENDED', 'RETIRED');
CREATE TYPE "ManualOperationProcedureStatus" AS ENUM ('DRAFT', 'APPROVED', 'SUSPENDED', 'RETIRED');
CREATE TYPE "ManualOperationAuthorizationStatus" AS ENUM ('REQUESTED', 'AUTHORIZED', 'ACTIVE', 'EXPIRED', 'REVOKED', 'REJECTED');
CREATE TYPE "ContinuityEventStatus" AS ENUM (
  'DETECTED',
  'ASSESSED',
  'CONTINUITY_MODE_ACTIVE',
  'RECOVERING',
  'RESUMPTION_PENDING',
  'RESOLVED',
  'SAFE_HALTED'
);
CREATE TYPE "ContinuityOperatingMode" AS ENUM ('NORMAL', 'CONTINUITY', 'MANUAL', 'SAFE_HALT');
CREATE TYPE "ContinuityDecisionType" AS ENUM (
  'SAFE_HALT',
  'CONTINUE_UNAFFECTED',
  'ACTIVATE_MANUAL',
  'ACTIVATE_CONTINUITY_MODE',
  'DECLARE_DISASTER',
  'OTHER_APPROVED'
);
CREATE TYPE "BackupTargetType" AS ENUM ('SYSTEM', 'DATABASE', 'STORAGE');
CREATE TYPE "BackupLocationClass" AS ENUM ('ON_PREMISES', 'OFFSITE', 'CLOUD', 'AIR_GAP', 'TBD');
CREATE TYPE "BackupDefinitionStatus" AS ENUM ('DRAFT', 'ACTIVE', 'SUSPENDED', 'RETIRED');
CREATE TYPE "BackupRecoverabilityStatus" AS ENUM ('UNVERIFIED', 'VERIFIED', 'FAILED_VERIFICATION');
CREATE TYPE "RestoreTestResult" AS ENUM ('PASSED', 'PASSED_WITH_LIMITATIONS', 'FAILED', 'UNVERIFIED');
CREATE TYPE "RecoveryExerciseStatus" AS ENUM ('PLANNED', 'IN_PROGRESS', 'COMPLETED', 'FAILED', 'CANCELLED');
CREATE TYPE "RecoveryActionStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'COMPLETED', 'FAILED', 'DEFERRED');
CREATE TYPE "BacklogRecoveryPlanStatus" AS ENUM ('DRAFT', 'APPROVED', 'ACTIVE', 'COMPLETED', 'SUSPENDED');
CREATE TYPE "BacklogPriorityBasis" AS ENUM (
  'APPROVED_LAWFUL_CRITERION',
  'HIGH_VALUE_INVESTOR',
  'POLITICALLY_IMPORTANT_APPLICANT',
  'EXECUTIVE_REQUEST',
  'LARGEST_FEE'
);
CREATE TYPE "ManualDigitalReconciliationStatus" AS ENUM ('PENDING', 'RECONCILED', 'DISCREPANCY_FOUND', 'CORRECTED', 'VERIFIED');
CREATE TYPE "ResumptionReadinessStatus" AS ENUM ('DRAFT', 'UNDER_REVIEW', 'READY_FOR_AUTHORIZATION', 'NOT_READY', 'AUTHORIZED');
CREATE TYPE "ResumptionAuthorizationStatus" AS ENUM ('PENDING', 'GRANTED', 'DENIED', 'EXPIRED', 'REVOKED');
CREATE TYPE "ContinuityCorrectiveActionStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'CLOSED', 'VERIFIED');
CREATE TYPE "ContinuityCorrectiveActionSourceType" AS ENUM (
  'RESTORE_TEST',
  'RECOVERY_EXERCISE',
  'RESUMPTION',
  'CONTINUITY_EVENT',
  'BACKUP_EXECUTION',
  'OTHER_APPROVED'
);
CREATE TYPE "BusinessImpactAssessmentStatus" AS ENUM ('DRAFT', 'UNDER_REVIEW', 'APPROVED', 'SUPERSEDED');
CREATE TYPE "RecoveryObjectiveType" AS ENUM ('RTO', 'RPO', 'MTI', 'MINIMUM_SERVICE', 'OTHER_APPROVED');

CREATE TABLE "critical_service_definitions" (
  "id" UUID NOT NULL,
  "serviceCode" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "institutionalOwnerInstitutionId" UUID NOT NULL,
  "authorityBasisReference" TEXT NOT NULL,
  "authorityBasisConfirmationStatus" "ConfigurationConfirmationStatus" NOT NULL DEFAULT 'TBD',
  "criticality" "CriticalServiceCriticality" NOT NULL DEFAULT 'UNCLASSIFIED',
  "minimumServiceDescription" TEXT NOT NULL,
  "maximumTolerableInterruptionMinutes" INTEGER,
  "mtiConfirmationStatus" "ConfigurationConfirmationStatus" NOT NULL DEFAULT 'TBD',
  "rtoMinutes" INTEGER,
  "rtoConfirmationStatus" "ConfigurationConfirmationStatus" NOT NULL DEFAULT 'TBD',
  "rpoMinutes" INTEGER,
  "rpoConfirmationStatus" "ConfigurationConfirmationStatus" NOT NULL DEFAULT 'TBD',
  "fallbackDescription" TEXT,
  "fallbackConfirmationStatus" "ConfigurationConfirmationStatus" NOT NULL DEFAULT 'TBD',
  "recoveryPriority" INTEGER,
  "recoveryPriorityConfirmationStatus" "ConfigurationConfirmationStatus" NOT NULL DEFAULT 'TBD',
  "safeHaltConditions" TEXT,
  "status" "CriticalServiceDefinitionStatus" NOT NULL DEFAULT 'DRAFT',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "critical_service_definitions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "business_impact_assessments" (
  "id" UUID NOT NULL,
  "assessmentNumber" TEXT NOT NULL,
  "criticalServiceDefinitionId" UUID NOT NULL,
  "impactSummary" TEXT NOT NULL,
  "financialImpactNotes" TEXT,
  "operationalImpactNotes" TEXT,
  "reputationalImpactNotes" TEXT,
  "assessedByIdentityId" UUID NOT NULL,
  "institutionId" UUID,
  "status" "BusinessImpactAssessmentStatus" NOT NULL DEFAULT 'DRAFT',
  "assessedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "business_impact_assessments_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "recovery_objectives" (
  "id" UUID NOT NULL,
  "criticalServiceDefinitionId" UUID NOT NULL,
  "objectiveType" "RecoveryObjectiveType" NOT NULL,
  "targetValueMinutes" INTEGER,
  "confirmationStatus" "ConfigurationConfirmationStatus" NOT NULL DEFAULT 'TBD',
  "lawfulBasisReference" TEXT,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "recovery_objectives_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "continuity_dependencies" (
  "id" UUID NOT NULL,
  "criticalServiceDefinitionId" UUID NOT NULL,
  "dependencyType" "ContinuityDependencyType" NOT NULL,
  "dependencyReference" TEXT NOT NULL,
  "dependencyDescription" TEXT NOT NULL,
  "isCritical" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "continuity_dependencies_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "single_points_of_failure" (
  "id" UUID NOT NULL,
  "criticalServiceDefinitionId" UUID NOT NULL,
  "componentReference" TEXT NOT NULL,
  "componentDescription" TEXT NOT NULL,
  "mitigationReference" TEXT,
  "status" "SinglePointOfFailureStatus" NOT NULL DEFAULT 'IDENTIFIED',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "single_points_of_failure_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "continuity_procedures" (
  "id" UUID NOT NULL,
  "procedureCode" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "criticalServiceDefinitionId" UUID,
  "scenarioTypes" JSONB NOT NULL DEFAULT '[]',
  "steps" JSONB NOT NULL DEFAULT '[]',
  "status" "ContinuityProcedureStatus" NOT NULL DEFAULT 'DRAFT',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "continuity_procedures_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "manual_operation_procedures" (
  "id" UUID NOT NULL,
  "procedureCode" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "preservesIdentity" BOOLEAN NOT NULL DEFAULT true,
  "preservesOfficeholder" BOOLEAN NOT NULL DEFAULT true,
  "preservesAuthority" BOOLEAN NOT NULL DEFAULT true,
  "preservesSegregationOfDuties" BOOLEAN NOT NULL DEFAULT true,
  "preservesDateTime" BOOLEAN NOT NULL DEFAULT true,
  "preservesEvidence" BOOLEAN NOT NULL DEFAULT true,
  "preservesRecordNumber" BOOLEAN NOT NULL DEFAULT true,
  "preservesDecisionProvenance" BOOLEAN NOT NULL DEFAULT true,
  "preservesNotice" BOOLEAN NOT NULL DEFAULT true,
  "preservesFinancialControls" BOOLEAN NOT NULL DEFAULT true,
  "preservesLaterReconciliation" BOOLEAN NOT NULL DEFAULT true,
  "segregationOfDutiesRequirements" TEXT NOT NULL,
  "evidenceRequirements" TEXT NOT NULL,
  "financialControlRequirements" TEXT NOT NULL,
  "status" "ManualOperationProcedureStatus" NOT NULL DEFAULT 'DRAFT',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "manual_operation_procedures_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "continuity_events" (
  "id" UUID NOT NULL,
  "eventNumber" TEXT NOT NULL,
  "scenarioType" "ContinuityScenarioType" NOT NULL,
  "detectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "status" "ContinuityEventStatus" NOT NULL DEFAULT 'DETECTED',
  "operatingMode" "ContinuityOperatingMode" NOT NULL DEFAULT 'NORMAL',
  "impactSummary" TEXT,
  "detectedByIdentityId" UUID,
  "safeHaltScope" TEXT,
  "technicalRecoveryCompletedAt" TIMESTAMP(3),
  "institutionalResumptionAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "continuity_events_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "manual_operation_authorizations" (
  "id" UUID NOT NULL,
  "authorizationReference" TEXT NOT NULL,
  "manualOperationProcedureId" UUID NOT NULL,
  "continuityEventId" UUID,
  "authorizedByOfficeholderId" UUID NOT NULL,
  "authorizedByIdentityId" UUID NOT NULL,
  "functionAuthorityRecordId" UUID NOT NULL,
  "appointmentId" UUID NOT NULL,
  "delegationId" UUID,
  "actorIdentityId" UUID NOT NULL,
  "segregatedApproverIdentityId" UUID NOT NULL,
  "emergencyAuthorityReference" TEXT,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "status" "ManualOperationAuthorizationStatus" NOT NULL DEFAULT 'REQUESTED',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "manual_operation_authorizations_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "continuity_decisions" (
  "id" UUID NOT NULL,
  "continuityEventId" UUID NOT NULL,
  "decisionType" "ContinuityDecisionType" NOT NULL,
  "decidedByOfficeholderId" UUID NOT NULL,
  "decidedByIdentityId" UUID NOT NULL,
  "functionAuthorityRecordId" UUID NOT NULL,
  "appointmentId" UUID NOT NULL,
  "delegationId" UUID,
  "decisionNotes" TEXT NOT NULL,
  "decidedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "emergencyAuthorityExpiresAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "continuity_decisions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "backup_definitions" (
  "id" UUID NOT NULL,
  "backupCode" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "targetType" "BackupTargetType" NOT NULL,
  "scopeDescription" TEXT NOT NULL,
  "scheduleExpression" TEXT,
  "scheduleConfirmationStatus" "ConfigurationConfirmationStatus" NOT NULL DEFAULT 'TBD',
  "encryptionMethod" TEXT,
  "encryptionConfirmationStatus" "ConfigurationConfirmationStatus" NOT NULL DEFAULT 'TBD',
  "retentionPolicyDescription" TEXT,
  "retentionConfirmationStatus" "ConfigurationConfirmationStatus" NOT NULL DEFAULT 'TBD',
  "locationClass" "BackupLocationClass" NOT NULL DEFAULT 'TBD',
  "ownerIdentityId" UUID NOT NULL,
  "ownerInstitutionId" UUID,
  "verificationProcedureReference" TEXT,
  "lastSuccessfulBackupAt" TIMESTAMP(3),
  "lastTestedRestoreAt" TIMESTAMP(3),
  "recoverabilityStatus" "BackupRecoverabilityStatus" NOT NULL DEFAULT 'UNVERIFIED',
  "status" "BackupDefinitionStatus" NOT NULL DEFAULT 'DRAFT',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "backup_definitions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "backup_execution_records" (
  "id" UUID NOT NULL,
  "backupDefinitionId" UUID NOT NULL,
  "executionStartedAt" TIMESTAMP(3) NOT NULL,
  "executionCompletedAt" TIMESTAMP(3),
  "success" BOOLEAN NOT NULL DEFAULT false,
  "backupLocationReference" TEXT,
  "encryptionVerified" BOOLEAN NOT NULL DEFAULT false,
  "sizeBytes" BIGINT,
  "checksumHash" TEXT,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "backup_execution_records_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "restore_tests" (
  "id" UUID NOT NULL,
  "testReference" TEXT NOT NULL,
  "backupDefinitionId" UUID NOT NULL,
  "backupExecutionRecordId" UUID,
  "testStartedAt" TIMESTAMP(3) NOT NULL,
  "testCompletedAt" TIMESTAMP(3),
  "result" "RestoreTestResult" NOT NULL DEFAULT 'UNVERIFIED',
  "backupAvailabilityVerified" BOOLEAN NOT NULL DEFAULT false,
  "decryptionVerified" BOOLEAN NOT NULL DEFAULT false,
  "integrityVerified" BOOLEAN NOT NULL DEFAULT false,
  "completenessVerified" BOOLEAN NOT NULL DEFAULT false,
  "databaseConsistencyVerified" BOOLEAN NOT NULL DEFAULT false,
  "objectIntegrityVerified" BOOLEAN NOT NULL DEFAULT false,
  "auditHistoryVerified" BOOLEAN NOT NULL DEFAULT false,
  "signatureHashVerified" BOOLEAN NOT NULL DEFAULT false,
  "applicationCompatibilityVerified" BOOLEAN NOT NULL DEFAULT false,
  "rpoAchieved" BOOLEAN NOT NULL DEFAULT false,
  "rtoAchieved" BOOLEAN NOT NULL DEFAULT false,
  "limitationsNotes" TEXT,
  "testedByIdentityId" UUID NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "restore_tests_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "recovery_exercises" (
  "id" UUID NOT NULL,
  "exerciseReference" TEXT NOT NULL,
  "scenarioType" "ContinuityScenarioType" NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "status" "RecoveryExerciseStatus" NOT NULL DEFAULT 'PLANNED',
  "isArchitectureTest" BOOLEAN NOT NULL DEFAULT true,
  "doesNotGuaranteeRecovery" BOOLEAN NOT NULL DEFAULT true,
  "institutionId" UUID,
  "leadIdentityId" UUID NOT NULL,
  "plannedAt" TIMESTAMP(3),
  "startedAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "recovery_exercises_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "recovery_actions" (
  "id" UUID NOT NULL,
  "recoveryExerciseId" UUID,
  "continuityEventId" UUID,
  "actionDescription" TEXT NOT NULL,
  "status" "RecoveryActionStatus" NOT NULL DEFAULT 'OPEN',
  "assignedToIdentityId" UUID,
  "dueAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "recovery_actions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "backlog_recovery_plans" (
  "id" UUID NOT NULL,
  "planReference" TEXT NOT NULL,
  "continuityEventId" UUID,
  "prioritizationCriteriaReference" TEXT NOT NULL,
  "approvedCriteriaDocumentReference" TEXT NOT NULL,
  "forbiddenFavoritismAcknowledged" BOOLEAN NOT NULL DEFAULT true,
  "status" "BacklogRecoveryPlanStatus" NOT NULL DEFAULT 'DRAFT',
  "backlogItems" JSONB NOT NULL DEFAULT '[]',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "backlog_recovery_plans_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "manual_digital_reconciliations" (
  "id" UUID NOT NULL,
  "reconciliationReference" TEXT NOT NULL,
  "manualRecordReference" TEXT NOT NULL,
  "digitizedRepresentationReference" TEXT NOT NULL,
  "reconcilerIdentityId" UUID NOT NULL,
  "comparisonNotes" TEXT NOT NULL,
  "discrepancyDescription" TEXT,
  "correctionNotes" TEXT,
  "verificationNotes" TEXT,
  "auditLinkReference" TEXT,
  "manualOriginalPreserved" BOOLEAN NOT NULL DEFAULT true,
  "status" "ManualDigitalReconciliationStatus" NOT NULL DEFAULT 'PENDING',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "manual_digital_reconciliations_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "resumption_readiness_assessments" (
  "id" UUID NOT NULL,
  "assessmentReference" TEXT NOT NULL,
  "continuityEventId" UUID NOT NULL,
  "identityTrustEvaluated" BOOLEAN NOT NULL DEFAULT false,
  "identityTrustNotes" TEXT,
  "authorityEvaluated" BOOLEAN NOT NULL DEFAULT false,
  "authorityNotes" TEXT,
  "recordIntegrityEvaluated" BOOLEAN NOT NULL DEFAULT false,
  "recordIntegrityNotes" TEXT,
  "securityPostureEvaluated" BOOLEAN NOT NULL DEFAULT false,
  "securityPostureNotes" TEXT,
  "dependenciesEvaluated" BOOLEAN NOT NULL DEFAULT false,
  "dependenciesNotes" TEXT,
  "requiredPersonnelEvaluated" BOOLEAN NOT NULL DEFAULT false,
  "requiredPersonnelNotes" TEXT,
  "dataStateEvaluated" BOOLEAN NOT NULL DEFAULT false,
  "dataStateNotes" TEXT,
  "integrationsEvaluated" BOOLEAN NOT NULL DEFAULT false,
  "integrationsNotes" TEXT,
  "backlogEvaluated" BOOLEAN NOT NULL DEFAULT false,
  "backlogNotes" TEXT,
  "knownDefectsEvaluated" BOOLEAN NOT NULL DEFAULT false,
  "knownDefectsNotes" TEXT,
  "residualRiskEvaluated" BOOLEAN NOT NULL DEFAULT false,
  "residualRiskNotes" TEXT,
  "monitoringEvaluated" BOOLEAN NOT NULL DEFAULT false,
  "monitoringNotes" TEXT,
  "fallbackEvaluated" BOOLEAN NOT NULL DEFAULT false,
  "fallbackNotes" TEXT,
  "overallStatus" "ResumptionReadinessStatus" NOT NULL DEFAULT 'DRAFT',
  "technicalRecommendationNotes" TEXT,
  "technicalRecommenderIdentityId" UUID,
  "technicalRecoveryComplete" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "resumption_readiness_assessments_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "resumption_authorizations" (
  "id" UUID NOT NULL,
  "authorizationReference" TEXT NOT NULL,
  "resumptionReadinessAssessmentId" UUID NOT NULL,
  "authorizingOfficeholderId" UUID NOT NULL,
  "authorizingIdentityId" UUID NOT NULL,
  "functionAuthorityRecordId" UUID NOT NULL,
  "appointmentId" UUID NOT NULL,
  "delegationId" UUID,
  "status" "ResumptionAuthorizationStatus" NOT NULL DEFAULT 'PENDING',
  "authorizedAt" TIMESTAMP(3),
  "expiresAt" TIMESTAMP(3),
  "denialReason" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "resumption_authorizations_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "continuity_corrective_actions" (
  "id" UUID NOT NULL,
  "correctiveActionReference" TEXT NOT NULL,
  "sourceType" "ContinuityCorrectiveActionSourceType" NOT NULL,
  "sourceReferenceId" UUID NOT NULL,
  "restoreTestId" UUID,
  "recoveryExerciseId" UUID,
  "description" TEXT NOT NULL,
  "status" "ContinuityCorrectiveActionStatus" NOT NULL DEFAULT 'OPEN',
  "assignedToIdentityId" UUID,
  "dueAt" TIMESTAMP(3),
  "closedAt" TIMESTAMP(3),
  "verificationNotes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "continuity_corrective_actions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "critical_service_definitions_serviceCode_key" ON "critical_service_definitions"("serviceCode");
CREATE INDEX "critical_service_definitions_institutionalOwnerInstitutionId_idx" ON "critical_service_definitions"("institutionalOwnerInstitutionId");
CREATE INDEX "critical_service_definitions_status_idx" ON "critical_service_definitions"("status");

CREATE UNIQUE INDEX "business_impact_assessments_assessmentNumber_key" ON "business_impact_assessments"("assessmentNumber");
CREATE INDEX "business_impact_assessments_criticalServiceDefinitionId_idx" ON "business_impact_assessments"("criticalServiceDefinitionId");
CREATE INDEX "business_impact_assessments_status_idx" ON "business_impact_assessments"("status");

CREATE INDEX "recovery_objectives_criticalServiceDefinitionId_idx" ON "recovery_objectives"("criticalServiceDefinitionId");
CREATE INDEX "continuity_dependencies_criticalServiceDefinitionId_idx" ON "continuity_dependencies"("criticalServiceDefinitionId");
CREATE INDEX "single_points_of_failure_criticalServiceDefinitionId_idx" ON "single_points_of_failure"("criticalServiceDefinitionId");

CREATE UNIQUE INDEX "continuity_procedures_procedureCode_key" ON "continuity_procedures"("procedureCode");
CREATE INDEX "continuity_procedures_criticalServiceDefinitionId_idx" ON "continuity_procedures"("criticalServiceDefinitionId");
CREATE INDEX "continuity_procedures_status_idx" ON "continuity_procedures"("status");

CREATE UNIQUE INDEX "manual_operation_procedures_procedureCode_key" ON "manual_operation_procedures"("procedureCode");
CREATE INDEX "manual_operation_procedures_status_idx" ON "manual_operation_procedures"("status");

CREATE UNIQUE INDEX "continuity_events_eventNumber_key" ON "continuity_events"("eventNumber");
CREATE INDEX "continuity_events_status_idx" ON "continuity_events"("status");
CREATE INDEX "continuity_events_scenarioType_idx" ON "continuity_events"("scenarioType");

CREATE UNIQUE INDEX "manual_operation_authorizations_authorizationReference_key" ON "manual_operation_authorizations"("authorizationReference");
CREATE INDEX "manual_operation_authorizations_manualOperationProcedureId_idx" ON "manual_operation_authorizations"("manualOperationProcedureId");
CREATE INDEX "manual_operation_authorizations_continuityEventId_idx" ON "manual_operation_authorizations"("continuityEventId");
CREATE INDEX "manual_operation_authorizations_status_idx" ON "manual_operation_authorizations"("status");
CREATE INDEX "manual_operation_authorizations_expiresAt_idx" ON "manual_operation_authorizations"("expiresAt");

CREATE INDEX "continuity_decisions_continuityEventId_idx" ON "continuity_decisions"("continuityEventId");

CREATE UNIQUE INDEX "backup_definitions_backupCode_key" ON "backup_definitions"("backupCode");
CREATE INDEX "backup_definitions_status_idx" ON "backup_definitions"("status");
CREATE INDEX "backup_definitions_recoverabilityStatus_idx" ON "backup_definitions"("recoverabilityStatus");

CREATE INDEX "backup_execution_records_backupDefinitionId_idx" ON "backup_execution_records"("backupDefinitionId");
CREATE INDEX "backup_execution_records_executionStartedAt_idx" ON "backup_execution_records"("executionStartedAt");

CREATE UNIQUE INDEX "restore_tests_testReference_key" ON "restore_tests"("testReference");
CREATE INDEX "restore_tests_backupDefinitionId_idx" ON "restore_tests"("backupDefinitionId");
CREATE INDEX "restore_tests_result_idx" ON "restore_tests"("result");

CREATE UNIQUE INDEX "recovery_exercises_exerciseReference_key" ON "recovery_exercises"("exerciseReference");
CREATE INDEX "recovery_exercises_scenarioType_idx" ON "recovery_exercises"("scenarioType");
CREATE INDEX "recovery_exercises_status_idx" ON "recovery_exercises"("status");

CREATE INDEX "recovery_actions_recoveryExerciseId_idx" ON "recovery_actions"("recoveryExerciseId");
CREATE INDEX "recovery_actions_continuityEventId_idx" ON "recovery_actions"("continuityEventId");
CREATE INDEX "recovery_actions_status_idx" ON "recovery_actions"("status");

CREATE UNIQUE INDEX "backlog_recovery_plans_planReference_key" ON "backlog_recovery_plans"("planReference");
CREATE INDEX "backlog_recovery_plans_continuityEventId_idx" ON "backlog_recovery_plans"("continuityEventId");
CREATE INDEX "backlog_recovery_plans_status_idx" ON "backlog_recovery_plans"("status");

CREATE UNIQUE INDEX "manual_digital_reconciliations_reconciliationReference_key" ON "manual_digital_reconciliations"("reconciliationReference");
CREATE INDEX "manual_digital_reconciliations_status_idx" ON "manual_digital_reconciliations"("status");

CREATE UNIQUE INDEX "resumption_readiness_assessments_assessmentReference_key" ON "resumption_readiness_assessments"("assessmentReference");
CREATE INDEX "resumption_readiness_assessments_continuityEventId_idx" ON "resumption_readiness_assessments"("continuityEventId");
CREATE INDEX "resumption_readiness_assessments_overallStatus_idx" ON "resumption_readiness_assessments"("overallStatus");

CREATE UNIQUE INDEX "resumption_authorizations_authorizationReference_key" ON "resumption_authorizations"("authorizationReference");
CREATE INDEX "resumption_authorizations_resumptionReadinessAssessmentId_idx" ON "resumption_authorizations"("resumptionReadinessAssessmentId");
CREATE INDEX "resumption_authorizations_status_idx" ON "resumption_authorizations"("status");

CREATE UNIQUE INDEX "continuity_corrective_actions_correctiveActionReference_key" ON "continuity_corrective_actions"("correctiveActionReference");
CREATE INDEX "continuity_corrective_actions_status_idx" ON "continuity_corrective_actions"("status");
CREATE INDEX "continuity_corrective_actions_sourceType_idx" ON "continuity_corrective_actions"("sourceType");

ALTER TABLE "critical_service_definitions" ADD CONSTRAINT "critical_service_definitions_institutionalOwnerInstitutionId_fkey" FOREIGN KEY ("institutionalOwnerInstitutionId") REFERENCES "institutions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "business_impact_assessments" ADD CONSTRAINT "business_impact_assessments_criticalServiceDefinitionId_fkey" FOREIGN KEY ("criticalServiceDefinitionId") REFERENCES "critical_service_definitions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "business_impact_assessments" ADD CONSTRAINT "business_impact_assessments_assessedByIdentityId_fkey" FOREIGN KEY ("assessedByIdentityId") REFERENCES "identities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "business_impact_assessments" ADD CONSTRAINT "business_impact_assessments_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "institutions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "recovery_objectives" ADD CONSTRAINT "recovery_objectives_criticalServiceDefinitionId_fkey" FOREIGN KEY ("criticalServiceDefinitionId") REFERENCES "critical_service_definitions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "continuity_dependencies" ADD CONSTRAINT "continuity_dependencies_criticalServiceDefinitionId_fkey" FOREIGN KEY ("criticalServiceDefinitionId") REFERENCES "critical_service_definitions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "single_points_of_failure" ADD CONSTRAINT "single_points_of_failure_criticalServiceDefinitionId_fkey" FOREIGN KEY ("criticalServiceDefinitionId") REFERENCES "critical_service_definitions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "continuity_procedures" ADD CONSTRAINT "continuity_procedures_criticalServiceDefinitionId_fkey" FOREIGN KEY ("criticalServiceDefinitionId") REFERENCES "critical_service_definitions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "continuity_events" ADD CONSTRAINT "continuity_events_detectedByIdentityId_fkey" FOREIGN KEY ("detectedByIdentityId") REFERENCES "identities"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "manual_operation_authorizations" ADD CONSTRAINT "manual_operation_authorizations_manualOperationProcedureId_fkey" FOREIGN KEY ("manualOperationProcedureId") REFERENCES "manual_operation_procedures"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "manual_operation_authorizations" ADD CONSTRAINT "manual_operation_authorizations_continuityEventId_fkey" FOREIGN KEY ("continuityEventId") REFERENCES "continuity_events"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "manual_operation_authorizations" ADD CONSTRAINT "manual_operation_authorizations_authorizedByOfficeholderId_fkey" FOREIGN KEY ("authorizedByOfficeholderId") REFERENCES "officeholders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "manual_operation_authorizations" ADD CONSTRAINT "manual_operation_authorizations_authorizedByIdentityId_fkey" FOREIGN KEY ("authorizedByIdentityId") REFERENCES "identities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "manual_operation_authorizations" ADD CONSTRAINT "manual_operation_authorizations_actorIdentityId_fkey" FOREIGN KEY ("actorIdentityId") REFERENCES "identities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "manual_operation_authorizations" ADD CONSTRAINT "manual_operation_authorizations_segregatedApproverIdentityId_fkey" FOREIGN KEY ("segregatedApproverIdentityId") REFERENCES "identities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "manual_operation_authorizations" ADD CONSTRAINT "manual_operation_authorizations_functionAuthorityRecordId_fkey" FOREIGN KEY ("functionAuthorityRecordId") REFERENCES "function_authority_records"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "manual_operation_authorizations" ADD CONSTRAINT "manual_operation_authorizations_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "appointments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "manual_operation_authorizations" ADD CONSTRAINT "manual_operation_authorizations_delegationId_fkey" FOREIGN KEY ("delegationId") REFERENCES "delegations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "continuity_decisions" ADD CONSTRAINT "continuity_decisions_continuityEventId_fkey" FOREIGN KEY ("continuityEventId") REFERENCES "continuity_events"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "continuity_decisions" ADD CONSTRAINT "continuity_decisions_decidedByOfficeholderId_fkey" FOREIGN KEY ("decidedByOfficeholderId") REFERENCES "officeholders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "continuity_decisions" ADD CONSTRAINT "continuity_decisions_decidedByIdentityId_fkey" FOREIGN KEY ("decidedByIdentityId") REFERENCES "identities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "continuity_decisions" ADD CONSTRAINT "continuity_decisions_functionAuthorityRecordId_fkey" FOREIGN KEY ("functionAuthorityRecordId") REFERENCES "function_authority_records"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "continuity_decisions" ADD CONSTRAINT "continuity_decisions_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "appointments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "continuity_decisions" ADD CONSTRAINT "continuity_decisions_delegationId_fkey" FOREIGN KEY ("delegationId") REFERENCES "delegations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "backup_definitions" ADD CONSTRAINT "backup_definitions_ownerIdentityId_fkey" FOREIGN KEY ("ownerIdentityId") REFERENCES "identities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "backup_definitions" ADD CONSTRAINT "backup_definitions_ownerInstitutionId_fkey" FOREIGN KEY ("ownerInstitutionId") REFERENCES "institutions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "backup_execution_records" ADD CONSTRAINT "backup_execution_records_backupDefinitionId_fkey" FOREIGN KEY ("backupDefinitionId") REFERENCES "backup_definitions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "restore_tests" ADD CONSTRAINT "restore_tests_backupDefinitionId_fkey" FOREIGN KEY ("backupDefinitionId") REFERENCES "backup_definitions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "restore_tests" ADD CONSTRAINT "restore_tests_backupExecutionRecordId_fkey" FOREIGN KEY ("backupExecutionRecordId") REFERENCES "backup_execution_records"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "restore_tests" ADD CONSTRAINT "restore_tests_testedByIdentityId_fkey" FOREIGN KEY ("testedByIdentityId") REFERENCES "identities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "recovery_exercises" ADD CONSTRAINT "recovery_exercises_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "institutions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "recovery_exercises" ADD CONSTRAINT "recovery_exercises_leadIdentityId_fkey" FOREIGN KEY ("leadIdentityId") REFERENCES "identities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "recovery_actions" ADD CONSTRAINT "recovery_actions_recoveryExerciseId_fkey" FOREIGN KEY ("recoveryExerciseId") REFERENCES "recovery_exercises"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "recovery_actions" ADD CONSTRAINT "recovery_actions_continuityEventId_fkey" FOREIGN KEY ("continuityEventId") REFERENCES "continuity_events"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "recovery_actions" ADD CONSTRAINT "recovery_actions_assignedToIdentityId_fkey" FOREIGN KEY ("assignedToIdentityId") REFERENCES "identities"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "backlog_recovery_plans" ADD CONSTRAINT "backlog_recovery_plans_continuityEventId_fkey" FOREIGN KEY ("continuityEventId") REFERENCES "continuity_events"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "manual_digital_reconciliations" ADD CONSTRAINT "manual_digital_reconciliations_reconcilerIdentityId_fkey" FOREIGN KEY ("reconcilerIdentityId") REFERENCES "identities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "resumption_readiness_assessments" ADD CONSTRAINT "resumption_readiness_assessments_continuityEventId_fkey" FOREIGN KEY ("continuityEventId") REFERENCES "continuity_events"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "resumption_readiness_assessments" ADD CONSTRAINT "resumption_readiness_assessments_technicalRecommenderIdentityId_fkey" FOREIGN KEY ("technicalRecommenderIdentityId") REFERENCES "identities"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "resumption_authorizations" ADD CONSTRAINT "resumption_authorizations_resumptionReadinessAssessmentId_fkey" FOREIGN KEY ("resumptionReadinessAssessmentId") REFERENCES "resumption_readiness_assessments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "resumption_authorizations" ADD CONSTRAINT "resumption_authorizations_authorizingOfficeholderId_fkey" FOREIGN KEY ("authorizingOfficeholderId") REFERENCES "officeholders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "resumption_authorizations" ADD CONSTRAINT "resumption_authorizations_authorizingIdentityId_fkey" FOREIGN KEY ("authorizingIdentityId") REFERENCES "identities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "resumption_authorizations" ADD CONSTRAINT "resumption_authorizations_functionAuthorityRecordId_fkey" FOREIGN KEY ("functionAuthorityRecordId") REFERENCES "function_authority_records"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "resumption_authorizations" ADD CONSTRAINT "resumption_authorizations_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "appointments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "resumption_authorizations" ADD CONSTRAINT "resumption_authorizations_delegationId_fkey" FOREIGN KEY ("delegationId") REFERENCES "delegations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "continuity_corrective_actions" ADD CONSTRAINT "continuity_corrective_actions_restoreTestId_fkey" FOREIGN KEY ("restoreTestId") REFERENCES "restore_tests"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "continuity_corrective_actions" ADD CONSTRAINT "continuity_corrective_actions_recoveryExerciseId_fkey" FOREIGN KEY ("recoveryExerciseId") REFERENCES "recovery_exercises"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "continuity_corrective_actions" ADD CONSTRAINT "continuity_corrective_actions_assignedToIdentityId_fkey" FOREIGN KEY ("assignedToIdentityId") REFERENCES "identities"("id") ON DELETE SET NULL ON UPDATE CASCADE;
