-- Phase 6D: Workflow Runtime and Case Orchestration

CREATE TYPE "CaseStatus" AS ENUM (
  'OPEN',
  'IN_PROGRESS',
  'DECISION_PENDING',
  'AWAITING_ISSUANCE',
  'CLOSED',
  'CANCELLED'
);

CREATE TYPE "WorkflowVersionStatus" AS ENUM (
  'DRAFT',
  'ACTIVE',
  'SUSPENDED',
  'SUPERSEDED',
  'ARCHIVED'
);

CREATE TYPE "WorkflowStepType" AS ENUM (
  'ADMINISTRATIVE',
  'DECISION_GATE',
  'ISSUANCE_GATE',
  'PARALLEL_FORK',
  'PARALLEL_JOIN',
  'WAITING_APPLICANT',
  'WAITING_EXTERNAL',
  'WAITING_PROFESSIONAL'
);

CREATE TYPE "WorkflowTransitionConditionType" AS ENUM (
  'ALWAYS',
  'STEP_COMPLETED',
  'ALL_JOIN_BRANCHES_COMPLETE',
  'CORRECTION_RETURN',
  'ESCALATION'
);

CREATE TYPE "CaseWorkflowInstanceStatus" AS ENUM (
  'NOT_STARTED',
  'ACTIVE',
  'WAITING_APPLICANT',
  'WAITING_EXTERNAL',
  'WAITING_PROFESSIONAL',
  'PAUSED',
  'SAFE_HALTED',
  'SUSPENDED',
  'COMPLETED',
  'CANCELLED'
);

CREATE TYPE "CaseWorkflowStepInstanceStatus" AS ENUM (
  'PENDING',
  'READY',
  'IN_PROGRESS',
  'WAITING',
  'BLOCKED',
  'COMPLETED',
  'SKIPPED_AUTHORIZED',
  'SAFE_HALTED',
  'CANCELLED'
);

CREATE TYPE "CaseWorkflowTransitionEventType" AS ENUM (
  'WORKFLOW_STARTED',
  'STEP_STARTED',
  'STEP_COMPLETED',
  'TRANSITION_EVALUATED',
  'PARALLEL_FORK',
  'PARALLEL_JOIN',
  'PAUSE',
  'RESUME',
  'RETURN_FOR_CORRECTION',
  'ESCALATION',
  'SAFE_HALT',
  'WORKFLOW_COMPLETED',
  'WORKFLOW_CANCELLED'
);

CREATE TABLE "cases" (
  "id" UUID NOT NULL,
  "caseReference" TEXT NOT NULL,
  "governmentServiceVersionId" UUID NOT NULL,
  "status" "CaseStatus" NOT NULL DEFAULT 'OPEN',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "cases_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "workflow_definitions" (
  "id" UUID NOT NULL,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "governmentServiceVersionId" UUID NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "workflow_definitions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "workflow_versions" (
  "id" UUID NOT NULL,
  "workflowDefinitionId" UUID NOT NULL,
  "version" INTEGER NOT NULL,
  "status" "WorkflowVersionStatus" NOT NULL DEFAULT 'DRAFT',
  "effectiveFrom" TIMESTAMP(3),
  "effectiveUntil" TIMESTAMP(3),
  "suspendedAt" TIMESTAMP(3),
  "supersededByVersionId" UUID,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "workflow_versions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "workflow_steps" (
  "id" UUID NOT NULL,
  "workflowVersionId" UUID NOT NULL,
  "stepKey" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "stepType" "WorkflowStepType" NOT NULL,
  "stageKey" TEXT NOT NULL,
  "sequenceOrder" INTEGER NOT NULL DEFAULT 0,
  "functionAuthorityRecordId" UUID,
  "authorityAction" "AuthorityActionType",
  "isConsequential" BOOLEAN NOT NULL DEFAULT false,
  "isHumanRequired" BOOLEAN NOT NULL DEFAULT true,
  "parallelGroupKey" TEXT,
  "requiredJoinBranchKeys" JSONB NOT NULL DEFAULT '[]',
  "dependsOnStepKeys" JSONB NOT NULL DEFAULT '[]',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "workflow_steps_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "workflow_transitions" (
  "id" UUID NOT NULL,
  "workflowVersionId" UUID NOT NULL,
  "fromStepKey" TEXT NOT NULL,
  "toStepKey" TEXT NOT NULL,
  "transitionKey" TEXT NOT NULL,
  "conditionType" "WorkflowTransitionConditionType" NOT NULL DEFAULT 'ALWAYS',
  "conditionRules" JSONB NOT NULL DEFAULT '{}',
  "isDefault" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "workflow_transitions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "case_workflow_instances" (
  "id" UUID NOT NULL,
  "caseId" UUID NOT NULL,
  "workflowVersionId" UUID NOT NULL,
  "status" "CaseWorkflowInstanceStatus" NOT NULL DEFAULT 'NOT_STARTED',
  "currentStageKey" TEXT,
  "currentStageLabel" TEXT,
  "startedAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "pausedAt" TIMESTAMP(3),
  "suspendedAt" TIMESTAMP(3),
  "safeHaltReason" TEXT,
  "concurrencyVersion" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "case_workflow_instances_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "case_workflow_step_instances" (
  "id" UUID NOT NULL,
  "caseWorkflowInstanceId" UUID NOT NULL,
  "workflowStepId" UUID NOT NULL,
  "stepKey" TEXT NOT NULL,
  "status" "CaseWorkflowStepInstanceStatus" NOT NULL DEFAULT 'PENDING',
  "parallelBranchKey" TEXT,
  "startedAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "actorIdentityId" UUID,
  "officeholderId" UUID,
  "authorityEvaluationRecordId" UUID,
  "completionIdempotencyKey" TEXT,
  "concurrencyVersion" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "case_workflow_step_instances_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "case_workflow_transition_events" (
  "id" UUID NOT NULL,
  "caseWorkflowInstanceId" UUID NOT NULL,
  "caseWorkflowStepInstanceId" UUID,
  "eventType" "CaseWorkflowTransitionEventType" NOT NULL,
  "fromStatus" TEXT,
  "toStatus" TEXT,
  "fromStepKey" TEXT,
  "toStepKey" TEXT,
  "actorIdentityId" UUID,
  "officeholderId" UUID,
  "authorityEvaluationRecordId" UUID,
  "reason" TEXT,
  "notes" TEXT,
  "idempotencyKey" TEXT,
  "metadata" JSONB NOT NULL DEFAULT '{}',
  "occurredAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "case_workflow_transition_events_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "cases_caseReference_key" ON "cases"("caseReference");
CREATE INDEX "cases_governmentServiceVersionId_idx" ON "cases"("governmentServiceVersionId");
CREATE INDEX "cases_status_idx" ON "cases"("status");

CREATE UNIQUE INDEX "workflow_definitions_code_key" ON "workflow_definitions"("code");
CREATE INDEX "workflow_definitions_governmentServiceVersionId_idx" ON "workflow_definitions"("governmentServiceVersionId");

CREATE UNIQUE INDEX "workflow_versions_workflowDefinitionId_version_key" ON "workflow_versions"("workflowDefinitionId", "version");
CREATE INDEX "workflow_versions_workflowDefinitionId_idx" ON "workflow_versions"("workflowDefinitionId");
CREATE INDEX "workflow_versions_status_idx" ON "workflow_versions"("status");

CREATE UNIQUE INDEX "workflow_steps_workflowVersionId_stepKey_key" ON "workflow_steps"("workflowVersionId", "stepKey");
CREATE INDEX "workflow_steps_workflowVersionId_idx" ON "workflow_steps"("workflowVersionId");
CREATE INDEX "workflow_steps_functionAuthorityRecordId_idx" ON "workflow_steps"("functionAuthorityRecordId");

CREATE UNIQUE INDEX "workflow_transitions_workflowVersionId_transitionKey_key" ON "workflow_transitions"("workflowVersionId", "transitionKey");
CREATE INDEX "workflow_transitions_workflowVersionId_idx" ON "workflow_transitions"("workflowVersionId");
CREATE INDEX "workflow_transitions_fromStepKey_idx" ON "workflow_transitions"("fromStepKey");

CREATE INDEX "case_workflow_instances_caseId_idx" ON "case_workflow_instances"("caseId");
CREATE INDEX "case_workflow_instances_workflowVersionId_idx" ON "case_workflow_instances"("workflowVersionId");
CREATE INDEX "case_workflow_instances_status_idx" ON "case_workflow_instances"("status");

CREATE UNIQUE INDEX "case_workflow_step_instances_completionIdempotencyKey_key" ON "case_workflow_step_instances"("completionIdempotencyKey");
CREATE UNIQUE INDEX "case_workflow_step_instances_caseWorkflowInstanceId_stepKey_parallelBranchKey_key" ON "case_workflow_step_instances"("caseWorkflowInstanceId", "stepKey", "parallelBranchKey");
CREATE INDEX "case_workflow_step_instances_caseWorkflowInstanceId_idx" ON "case_workflow_step_instances"("caseWorkflowInstanceId");
CREATE INDEX "case_workflow_step_instances_workflowStepId_idx" ON "case_workflow_step_instances"("workflowStepId");
CREATE INDEX "case_workflow_step_instances_status_idx" ON "case_workflow_step_instances"("status");

CREATE UNIQUE INDEX "case_workflow_transition_events_idempotencyKey_key" ON "case_workflow_transition_events"("idempotencyKey");
CREATE INDEX "case_workflow_transition_events_caseWorkflowInstanceId_idx" ON "case_workflow_transition_events"("caseWorkflowInstanceId");
CREATE INDEX "case_workflow_transition_events_caseWorkflowStepInstanceId_idx" ON "case_workflow_transition_events"("caseWorkflowStepInstanceId");
CREATE INDEX "case_workflow_transition_events_occurredAt_idx" ON "case_workflow_transition_events"("occurredAt");

ALTER TABLE "cases" ADD CONSTRAINT "cases_governmentServiceVersionId_fkey" FOREIGN KEY ("governmentServiceVersionId") REFERENCES "government_service_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "workflow_definitions" ADD CONSTRAINT "workflow_definitions_governmentServiceVersionId_fkey" FOREIGN KEY ("governmentServiceVersionId") REFERENCES "government_service_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "workflow_versions" ADD CONSTRAINT "workflow_versions_workflowDefinitionId_fkey" FOREIGN KEY ("workflowDefinitionId") REFERENCES "workflow_definitions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "workflow_versions" ADD CONSTRAINT "workflow_versions_supersededByVersionId_fkey" FOREIGN KEY ("supersededByVersionId") REFERENCES "workflow_versions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "workflow_steps" ADD CONSTRAINT "workflow_steps_workflowVersionId_fkey" FOREIGN KEY ("workflowVersionId") REFERENCES "workflow_versions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "workflow_steps" ADD CONSTRAINT "workflow_steps_functionAuthorityRecordId_fkey" FOREIGN KEY ("functionAuthorityRecordId") REFERENCES "function_authority_records"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "workflow_transitions" ADD CONSTRAINT "workflow_transitions_workflowVersionId_fkey" FOREIGN KEY ("workflowVersionId") REFERENCES "workflow_versions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "case_workflow_instances" ADD CONSTRAINT "case_workflow_instances_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "cases"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "case_workflow_instances" ADD CONSTRAINT "case_workflow_instances_workflowVersionId_fkey" FOREIGN KEY ("workflowVersionId") REFERENCES "workflow_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "case_workflow_step_instances" ADD CONSTRAINT "case_workflow_step_instances_caseWorkflowInstanceId_fkey" FOREIGN KEY ("caseWorkflowInstanceId") REFERENCES "case_workflow_instances"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "case_workflow_step_instances" ADD CONSTRAINT "case_workflow_step_instances_workflowStepId_fkey" FOREIGN KEY ("workflowStepId") REFERENCES "workflow_steps"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "case_workflow_step_instances" ADD CONSTRAINT "case_workflow_step_instances_authorityEvaluationRecordId_fkey" FOREIGN KEY ("authorityEvaluationRecordId") REFERENCES "authority_evaluation_records"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "case_workflow_transition_events" ADD CONSTRAINT "case_workflow_transition_events_caseWorkflowInstanceId_fkey" FOREIGN KEY ("caseWorkflowInstanceId") REFERENCES "case_workflow_instances"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "case_workflow_transition_events" ADD CONSTRAINT "case_workflow_transition_events_caseWorkflowStepInstanceId_fkey" FOREIGN KEY ("caseWorkflowStepInstanceId") REFERENCES "case_workflow_step_instances"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "case_workflow_transition_events" ADD CONSTRAINT "case_workflow_transition_events_authorityEvaluationRecordId_fkey" FOREIGN KEY ("authorityEvaluationRecordId") REFERENCES "authority_evaluation_records"("id") ON DELETE SET NULL ON UPDATE CASCADE;
