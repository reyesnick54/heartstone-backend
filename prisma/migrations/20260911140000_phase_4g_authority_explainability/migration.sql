-- Phase 4G: Authority explainability, replay, safe halt, and revalidation

-- Extend SecurityAuditEventType with authority events
ALTER TYPE "SecurityAuditEventType" ADD VALUE IF NOT EXISTS 'AUTHORITY_RECORD_CREATED';
ALTER TYPE "SecurityAuditEventType" ADD VALUE IF NOT EXISTS 'AUTHORITY_CLASSIFICATION_CHANGED';
ALTER TYPE "SecurityAuditEventType" ADD VALUE IF NOT EXISTS 'AUTHORITY_SOURCE_LINKED';
ALTER TYPE "SecurityAuditEventType" ADD VALUE IF NOT EXISTS 'AUTHORITY_ASSIGNMENT_CHANGED';
ALTER TYPE "SecurityAuditEventType" ADD VALUE IF NOT EXISTS 'AUTHORITY_FUNCTION_ACTIVATED';
ALTER TYPE "SecurityAuditEventType" ADD VALUE IF NOT EXISTS 'AUTHORITY_FUNCTION_SUSPENDED';
ALTER TYPE "SecurityAuditEventType" ADD VALUE IF NOT EXISTS 'AUTHORITY_EVALUATION_PERFORMED';
ALTER TYPE "SecurityAuditEventType" ADD VALUE IF NOT EXISTS 'AUTHORITY_SAFE_HALT_TRIGGERED';
ALTER TYPE "SecurityAuditEventType" ADD VALUE IF NOT EXISTS 'AUTHORITY_REVALIDATION_TRIGGERED';

-- CreateEnum
CREATE TYPE "AuthorityFunctionStatus" AS ENUM ('DRAFT', 'ACTIVE', 'SUSPENDED', 'ARCHIVED');
CREATE TYPE "AuthorityGoverningSourceStatus" AS ENUM ('DRAFT', 'ACTIVE', 'AMENDED', 'REVOKED', 'SUPERSEDED');
CREATE TYPE "AuthorityEvaluationResult" AS ENUM ('ALLOWED', 'NOT_AUTHORIZED', 'SAFE_HALT');
CREATE TYPE "AuthorityRevalidationState" AS ENUM ('CURRENT', 'REQUIRES_REVALIDATION', 'SUPERSEDED');
CREATE TYPE "AuthorityRevalidationTrigger" AS ENUM (
  'SOURCE_AMENDMENT',
  'SOURCE_REVOCATION',
  'SOURCE_SUPERSESSION',
  'NEW_CONTROLLING_SOURCE',
  'APPOINTMENT_CHANGE',
  'DELEGATION_CHANGE',
  'FUNCTION_LIFECYCLE_CHANGE',
  'DEPENDENCY_CHANGE',
  'CONFIGURED_REVALIDATION_DATE',
  'MATERIAL_POLICY_CHANGE'
);

-- CreateTable
CREATE TABLE "authority_functions" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" "AuthorityFunctionStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "authority_functions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "authority_governing_sources" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" "AuthorityGoverningSourceStatus" NOT NULL DEFAULT 'DRAFT',
    "isControlling" BOOLEAN NOT NULL DEFAULT false,
    "authenticatedAt" TIMESTAMP(3),
    "effectiveFrom" TIMESTAMP(3),
    "effectiveUntil" TIMESTAMP(3),
    "supersededById" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "authority_governing_sources_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "authority_assignments" (
    "id" UUID NOT NULL,
    "functionId" UUID NOT NULL,
    "governingSourceId" UUID NOT NULL,
    "officeId" UUID,
    "officeholderId" UUID,
    "revalidationState" "AuthorityRevalidationState" NOT NULL DEFAULT 'CURRENT',
    "revalidationDueAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "authority_assignments_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "authority_evaluation_records" (
    "id" UUID NOT NULL,
    "evaluatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actorIdentityId" UUID,
    "officeholderId" UUID,
    "functionId" UUID NOT NULL,
    "requestedAction" TEXT NOT NULL,
    "result" "AuthorityEvaluationResult" NOT NULL,
    "reasonCodes" TEXT[],
    "governingSourceRefs" JSONB NOT NULL,
    "assignmentId" UUID,
    "appointmentId" UUID,
    "delegationId" UUID,
    "conditionsEvaluated" JSONB NOT NULL,
    "dependencyOutcomes" JSONB NOT NULL,
    "effectiveAuthorityState" JSONB NOT NULL,
    "engineVersion" TEXT NOT NULL,
    "rulesetVersion" TEXT NOT NULL,
    "correlationId" TEXT,
    "contextReference" TEXT,
    "revalidationState" "AuthorityRevalidationState" NOT NULL DEFAULT 'CURRENT',
    "replaySnapshot" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "authority_evaluation_records_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "authority_revalidation_markers" (
    "id" UUID NOT NULL,
    "assignmentId" UUID,
    "functionId" UUID,
    "governingSourceId" UUID,
    "evaluationId" UUID,
    "trigger" "AuthorityRevalidationTrigger" NOT NULL,
    "triggerDetail" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "authority_revalidation_markers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "authority_functions_code_key" ON "authority_functions"("code");
CREATE UNIQUE INDEX "authority_governing_sources_code_version_key" ON "authority_governing_sources"("code", "version");
CREATE INDEX "authority_governing_sources_code_idx" ON "authority_governing_sources"("code");
CREATE INDEX "authority_governing_sources_status_idx" ON "authority_governing_sources"("status");
CREATE INDEX "authority_assignments_functionId_idx" ON "authority_assignments"("functionId");
CREATE INDEX "authority_assignments_governingSourceId_idx" ON "authority_assignments"("governingSourceId");
CREATE INDEX "authority_assignments_officeholderId_idx" ON "authority_assignments"("officeholderId");
CREATE INDEX "authority_assignments_revalidationState_idx" ON "authority_assignments"("revalidationState");
CREATE INDEX "authority_evaluation_records_functionId_idx" ON "authority_evaluation_records"("functionId");
CREATE INDEX "authority_evaluation_records_officeholderId_idx" ON "authority_evaluation_records"("officeholderId");
CREATE INDEX "authority_evaluation_records_result_idx" ON "authority_evaluation_records"("result");
CREATE INDEX "authority_evaluation_records_evaluatedAt_idx" ON "authority_evaluation_records"("evaluatedAt");
CREATE INDEX "authority_evaluation_records_correlationId_idx" ON "authority_evaluation_records"("correlationId");
CREATE INDEX "authority_evaluation_records_revalidationState_idx" ON "authority_evaluation_records"("revalidationState");
CREATE INDEX "authority_revalidation_markers_assignmentId_idx" ON "authority_revalidation_markers"("assignmentId");
CREATE INDEX "authority_revalidation_markers_functionId_idx" ON "authority_revalidation_markers"("functionId");
CREATE INDEX "authority_revalidation_markers_governingSourceId_idx" ON "authority_revalidation_markers"("governingSourceId");
CREATE INDEX "authority_revalidation_markers_evaluationId_idx" ON "authority_revalidation_markers"("evaluationId");
CREATE INDEX "authority_revalidation_markers_trigger_idx" ON "authority_revalidation_markers"("trigger");
CREATE INDEX "authority_revalidation_markers_resolvedAt_idx" ON "authority_revalidation_markers"("resolvedAt");

-- AddForeignKey
ALTER TABLE "authority_governing_sources" ADD CONSTRAINT "authority_governing_sources_supersededById_fkey" FOREIGN KEY ("supersededById") REFERENCES "authority_governing_sources"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "authority_assignments" ADD CONSTRAINT "authority_assignments_functionId_fkey" FOREIGN KEY ("functionId") REFERENCES "authority_functions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "authority_assignments" ADD CONSTRAINT "authority_assignments_governingSourceId_fkey" FOREIGN KEY ("governingSourceId") REFERENCES "authority_governing_sources"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "authority_evaluation_records" ADD CONSTRAINT "authority_evaluation_records_functionId_fkey" FOREIGN KEY ("functionId") REFERENCES "authority_functions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "authority_evaluation_records" ADD CONSTRAINT "authority_evaluation_records_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "authority_assignments"("id") ON DELETE SET NULL ON UPDATE CASCADE;
