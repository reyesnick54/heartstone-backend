-- Phase 6C: Versioned Workflow Definition Engine

CREATE TYPE "WorkflowVersionStatus" AS ENUM (
  'DRAFT',
  'AUTHORITY_REVIEW',
  'PROCEDURE_APPROVED',
  'CONFIGURED',
  'TESTED',
  'ACCEPTED',
  'ACTIVE',
  'PAUSED',
  'RESTRICTED',
  'SUSPENDED',
  'SUPERSEDED',
  'RETIRED'
);

CREATE TYPE "WorkflowConsequenceLevel" AS ENUM (
  'INFORMATIONAL',
  'PROCEDURAL',
  'SUBSTANTIVE',
  'HIGH_CONSEQUENCE'
);

CREATE TYPE "WorkflowStageType" AS ENUM (
  'INTAKE',
  'COMPLETENESS',
  'SUBSTANTIVE_REVIEW',
  'EXTERNAL_REFERRAL',
  'PROFESSIONAL_REVIEW',
  'INSPECTION',
  'RECOMMENDATION',
  'DECISION_GATE',
  'ISSUANCE_GATE',
  'NOTICE',
  'OVERSIGHT',
  'CLOSURE',
  'CUSTOM_ADMINISTRATIVE'
);

CREATE TYPE "WorkflowStepType" AS ENUM (
  'ADMINISTRATIVE_TASK',
  'REVIEW',
  'VERIFICATION',
  'EXTERNAL_REFERRAL',
  'PROFESSIONAL_REFERRAL',
  'RECOMMENDATION',
  'DECISION',
  'ISSUANCE',
  'NOTICE',
  'WAIT',
  'CUSTOM'
);

CREATE TYPE "WorkflowTransitionType" AS ENUM (
  'NORMAL',
  'CONDITIONAL',
  'RETURN_FOR_CORRECTION',
  'ESCALATION',
  'EXTERNAL_REFERRAL',
  'PROFESSIONAL_REFERRAL',
  'SAFE_HALT',
  'WITHDRAWAL',
  'CLOSURE'
);

CREATE TABLE "workflow_definitions" (
  "id" UUID NOT NULL,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "governmentServiceId" UUID NOT NULL,
  "responsibleDepartmentId" UUID NOT NULL,
  "institutionalOwnerOfficeId" UUID,
  "description" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "workflow_definitions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "workflow_versions" (
  "id" UUID NOT NULL,
  "workflowDefinitionId" UUID NOT NULL,
  "version" TEXT NOT NULL,
  "governmentServiceVersionId" UUID NOT NULL,
  "status" "WorkflowVersionStatus" NOT NULL DEFAULT 'DRAFT',
  "consequenceLevel" "WorkflowConsequenceLevel" NOT NULL DEFAULT 'PROCEDURAL',
  "effectiveFrom" TIMESTAMP(3),
  "effectiveUntil" TIMESTAMP(3),
  "supersededByVersionId" UUID,
  "activationFunctionAuthorityRecordId" UUID,
  "manualFallbackReference" TEXT,
  "entryConditions" JSONB NOT NULL DEFAULT '{}',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "workflow_versions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "workflow_stage_definitions" (
  "id" UUID NOT NULL,
  "workflowVersionId" UUID NOT NULL,
  "stageKey" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "sequence" INTEGER NOT NULL,
  "stageType" "WorkflowStageType" NOT NULL,
  "description" TEXT,
  "entryRules" JSONB NOT NULL DEFAULT '{}',
  "completionRules" JSONB NOT NULL DEFAULT '{}',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "workflow_stage_definitions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "workflow_step_definitions" (
  "id" UUID NOT NULL,
  "workflowVersionId" UUID NOT NULL,
  "stageId" UUID NOT NULL,
  "stepKey" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "stepType" "WorkflowStepType" NOT NULL,
  "sequence" INTEGER NOT NULL,
  "responsibleDepartmentId" UUID,
  "responsibleOfficeId" UUID,
  "functionAuthorityRecordId" UUID,
  "requiredAuthorityAction" "AuthorityActionType",
  "requiredEvidence" JSONB NOT NULL DEFAULT '[]',
  "routingConfiguration" JSONB NOT NULL DEFAULT '{}',
  "deadlineConfiguration" JSONB NOT NULL DEFAULT '{}',
  "pauseConfiguration" JSONB NOT NULL DEFAULT '{}',
  "escalationConfiguration" JSONB NOT NULL DEFAULT '{}',
  "safeHaltConfiguration" JSONB NOT NULL DEFAULT '{}',
  "manualAllowed" BOOLEAN NOT NULL DEFAULT true,
  "isConsequential" BOOLEAN NOT NULL DEFAULT false,
  "isStartingStep" BOOLEAN NOT NULL DEFAULT false,
  "parallelForkGroupKey" TEXT,
  "parallelJoinGroupKey" TEXT,
  "permitsCycle" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "workflow_step_definitions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "workflow_transition_definitions" (
  "id" UUID NOT NULL,
  "workflowVersionId" UUID NOT NULL,
  "fromStepId" UUID NOT NULL,
  "toStepId" UUID NOT NULL,
  "transitionType" "WorkflowTransitionType" NOT NULL DEFAULT 'NORMAL',
  "conditionConfig" JSONB NOT NULL DEFAULT '{}',
  "priority" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "workflow_transition_definitions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "workflow_definitions_code_key" ON "workflow_definitions"("code");
CREATE INDEX "workflow_definitions_governmentServiceId_idx" ON "workflow_definitions"("governmentServiceId");
CREATE INDEX "workflow_definitions_responsibleDepartmentId_idx" ON "workflow_definitions"("responsibleDepartmentId");
CREATE INDEX "workflow_definitions_institutionalOwnerOfficeId_idx" ON "workflow_definitions"("institutionalOwnerOfficeId");

CREATE UNIQUE INDEX "workflow_versions_workflowDefinitionId_version_key" ON "workflow_versions"("workflowDefinitionId", "version");
CREATE INDEX "workflow_versions_workflowDefinitionId_idx" ON "workflow_versions"("workflowDefinitionId");
CREATE INDEX "workflow_versions_governmentServiceVersionId_idx" ON "workflow_versions"("governmentServiceVersionId");
CREATE INDEX "workflow_versions_status_idx" ON "workflow_versions"("status");
CREATE INDEX "workflow_versions_activationFunctionAuthorityRecordId_idx" ON "workflow_versions"("activationFunctionAuthorityRecordId");

CREATE UNIQUE INDEX "workflow_stage_definitions_workflowVersionId_stageKey_key" ON "workflow_stage_definitions"("workflowVersionId", "stageKey");
CREATE INDEX "workflow_stage_definitions_workflowVersionId_idx" ON "workflow_stage_definitions"("workflowVersionId");

CREATE UNIQUE INDEX "workflow_step_definitions_workflowVersionId_stepKey_key" ON "workflow_step_definitions"("workflowVersionId", "stepKey");
CREATE INDEX "workflow_step_definitions_workflowVersionId_idx" ON "workflow_step_definitions"("workflowVersionId");
CREATE INDEX "workflow_step_definitions_stageId_idx" ON "workflow_step_definitions"("stageId");
CREATE INDEX "workflow_step_definitions_responsibleDepartmentId_idx" ON "workflow_step_definitions"("responsibleDepartmentId");
CREATE INDEX "workflow_step_definitions_responsibleOfficeId_idx" ON "workflow_step_definitions"("responsibleOfficeId");
CREATE INDEX "workflow_step_definitions_functionAuthorityRecordId_idx" ON "workflow_step_definitions"("functionAuthorityRecordId");

CREATE INDEX "workflow_transition_definitions_workflowVersionId_idx" ON "workflow_transition_definitions"("workflowVersionId");
CREATE INDEX "workflow_transition_definitions_fromStepId_idx" ON "workflow_transition_definitions"("fromStepId");
CREATE INDEX "workflow_transition_definitions_toStepId_idx" ON "workflow_transition_definitions"("toStepId");

ALTER TABLE "workflow_definitions"
  ADD CONSTRAINT "workflow_definitions_governmentServiceId_fkey"
  FOREIGN KEY ("governmentServiceId") REFERENCES "government_services"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "workflow_definitions"
  ADD CONSTRAINT "workflow_definitions_responsibleDepartmentId_fkey"
  FOREIGN KEY ("responsibleDepartmentId") REFERENCES "departments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "workflow_definitions"
  ADD CONSTRAINT "workflow_definitions_institutionalOwnerOfficeId_fkey"
  FOREIGN KEY ("institutionalOwnerOfficeId") REFERENCES "offices"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "workflow_versions"
  ADD CONSTRAINT "workflow_versions_workflowDefinitionId_fkey"
  FOREIGN KEY ("workflowDefinitionId") REFERENCES "workflow_definitions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "workflow_versions"
  ADD CONSTRAINT "workflow_versions_governmentServiceVersionId_fkey"
  FOREIGN KEY ("governmentServiceVersionId") REFERENCES "government_service_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "workflow_versions"
  ADD CONSTRAINT "workflow_versions_activationFunctionAuthorityRecordId_fkey"
  FOREIGN KEY ("activationFunctionAuthorityRecordId") REFERENCES "function_authority_records"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "workflow_versions"
  ADD CONSTRAINT "workflow_versions_supersededByVersionId_fkey"
  FOREIGN KEY ("supersededByVersionId") REFERENCES "workflow_versions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "workflow_stage_definitions"
  ADD CONSTRAINT "workflow_stage_definitions_workflowVersionId_fkey"
  FOREIGN KEY ("workflowVersionId") REFERENCES "workflow_versions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "workflow_step_definitions"
  ADD CONSTRAINT "workflow_step_definitions_workflowVersionId_fkey"
  FOREIGN KEY ("workflowVersionId") REFERENCES "workflow_versions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "workflow_step_definitions"
  ADD CONSTRAINT "workflow_step_definitions_stageId_fkey"
  FOREIGN KEY ("stageId") REFERENCES "workflow_stage_definitions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "workflow_step_definitions"
  ADD CONSTRAINT "workflow_step_definitions_responsibleDepartmentId_fkey"
  FOREIGN KEY ("responsibleDepartmentId") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "workflow_step_definitions"
  ADD CONSTRAINT "workflow_step_definitions_responsibleOfficeId_fkey"
  FOREIGN KEY ("responsibleOfficeId") REFERENCES "offices"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "workflow_step_definitions"
  ADD CONSTRAINT "workflow_step_definitions_functionAuthorityRecordId_fkey"
  FOREIGN KEY ("functionAuthorityRecordId") REFERENCES "function_authority_records"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "workflow_transition_definitions"
  ADD CONSTRAINT "workflow_transition_definitions_workflowVersionId_fkey"
  FOREIGN KEY ("workflowVersionId") REFERENCES "workflow_versions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "workflow_transition_definitions"
  ADD CONSTRAINT "workflow_transition_definitions_fromStepId_fkey"
  FOREIGN KEY ("fromStepId") REFERENCES "workflow_step_definitions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "workflow_transition_definitions"
  ADD CONSTRAINT "workflow_transition_definitions_toStepId_fkey"
  FOREIGN KEY ("toStepId") REFERENCES "workflow_step_definitions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
