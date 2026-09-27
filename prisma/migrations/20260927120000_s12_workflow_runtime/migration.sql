-- CreateEnum
CREATE TYPE "WorkflowDurableJobStatus" AS ENUM ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED', 'DEAD');

-- CreateEnum
CREATE TYPE "WorkflowDurableJobKind" AS ENUM ('SLA_DEADLINE_EVALUATION', 'ESCALATION_EVALUATION', 'REMINDER', 'TIMEOUT_ACTION', 'RENEWAL_SCHEDULE_HOOK');

-- CreateEnum
CREATE TYPE "SafeHaltReasonCode" AS ENUM ('AUTHORITY_DEPENDENCY_UNAVAILABLE', 'EXTERNAL_DECISION_REQUIRED', 'GOVERNING_SOURCE_INACTIVE', 'REQUIRED_EVIDENCE_UNRESOLVED', 'MANDATORY_INTEGRATION_UNAVAILABLE');

-- AlterEnum
ALTER TYPE "CaseEventType" ADD VALUE 'RFI_ISSUED';
ALTER TYPE "CaseEventType" ADD VALUE 'WORKFLOW_BRANCH';
ALTER TYPE "CaseEventType" ADD VALUE 'RESUME_FROM_HALT';

-- CreateTable
CREATE TABLE "government_service_sla_rules" (
    "id" UUID NOT NULL,
    "governmentServiceVersionId" UUID NOT NULL,
    "ruleCode" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "targetDurationMs" INTEGER NOT NULL,
    "clockStartsAtStageKey" TEXT,
    "pauseOnRfi" BOOLEAN NOT NULL DEFAULT true,
    "escalationLadderCode" TEXT,
    "configuration" JSONB NOT NULL DEFAULT '{}',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "government_service_sla_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "government_service_escalation_ladders" (
    "id" UUID NOT NULL,
    "governmentServiceVersionId" UUID NOT NULL,
    "ladderCode" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "slaRuleCode" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "government_service_escalation_ladders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "government_service_escalation_ladder_steps" (
    "id" UUID NOT NULL,
    "escalationLadderId" UUID NOT NULL,
    "level" INTEGER NOT NULL,
    "label" TEXT NOT NULL,
    "triggerOverdueMs" INTEGER NOT NULL DEFAULT 0,
    "responsibleDepartmentId" UUID,
    "responsibleInstitutionId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "government_service_escalation_ladder_steps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workflow_durable_jobs" (
    "id" UUID NOT NULL,
    "jobKind" "WorkflowDurableJobKind" NOT NULL,
    "status" "WorkflowDurableJobStatus" NOT NULL DEFAULT 'PENDING',
    "idempotencyKey" TEXT NOT NULL,
    "payload" JSONB NOT NULL DEFAULT '{}',
    "scheduledFor" TIMESTAMP(3) NOT NULL,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "attemptCount" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 5,
    "lastError" TEXT,
    "leaseToken" TEXT,
    "leaseExpiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "workflow_durable_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "government_decision_number_sequences" (
    "year" INTEGER NOT NULL,
    "nextValue" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "government_decision_number_sequences_pkey" PRIMARY KEY ("year")
);

-- AlterTable
ALTER TABLE "applicant_information_requests" ADD COLUMN     "caseId" UUID,
ADD COLUMN     "issuedByIdentityId" UUID,
ADD COLUMN     "issuedByOfficeholderId" UUID,
ADD COLUMN     "functionAuthorityRecordId" UUID,
ADD COLUMN     "authorityEvaluationRecordId" UUID,
ADD COLUMN     "pausedClockKey" TEXT,
ADD COLUMN     "overrideResumedAt" TIMESTAMP(3),
ADD COLUMN     "overrideByIdentityId" UUID;

-- AlterTable
ALTER TABLE "case_sla_clocks" ADD COLUMN     "dueAt" TIMESTAMP(3),
ADD COLUMN     "serviceStandardRuleCode" TEXT,
ADD COLUMN     "governmentServiceVersionId" UUID,
ADD COLUMN     "standardConfiguration" JSONB NOT NULL DEFAULT '{}';

-- AlterTable
ALTER TABLE "case_escalations" ADD COLUMN     "escalationLevel" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "escalationLadderCode" TEXT,
ADD COLUMN     "idempotencyKey" TEXT,
ADD COLUMN     "slaClockKey" TEXT,
ADD COLUMN     "responsibleDepartmentId" UUID,
ADD COLUMN     "responsibleInstitutionId" UUID;

-- AlterTable
ALTER TABLE "case_workflow_instances" ADD COLUMN     "haltReasonCode" "SafeHaltReasonCode",
ADD COLUMN     "requiredResolution" TEXT;

-- CreateIndex
CREATE INDEX "government_service_sla_rules_governmentServiceVersionId_idx" ON "government_service_sla_rules"("governmentServiceVersionId");

-- CreateIndex
CREATE UNIQUE INDEX "government_service_sla_rules_governmentServiceVersionId_ruleC_key" ON "government_service_sla_rules"("governmentServiceVersionId", "ruleCode");

-- CreateIndex
CREATE INDEX "government_service_escalation_ladders_governmentServiceVers_idx" ON "government_service_escalation_ladders"("governmentServiceVersionId");

-- CreateIndex
CREATE UNIQUE INDEX "government_service_escalation_ladders_governmentServiceVersio_key" ON "government_service_escalation_ladders"("governmentServiceVersionId", "ladderCode");

-- CreateIndex
CREATE INDEX "government_service_escalation_ladder_steps_escalationLadderI_idx" ON "government_service_escalation_ladder_steps"("escalationLadderId");

-- CreateIndex
CREATE UNIQUE INDEX "government_service_escalation_ladder_steps_escalationLadder_key" ON "government_service_escalation_ladder_steps"("escalationLadderId", "level");

-- CreateIndex
CREATE UNIQUE INDEX "workflow_durable_jobs_idempotencyKey_key" ON "workflow_durable_jobs"("idempotencyKey");

-- CreateIndex
CREATE INDEX "workflow_durable_jobs_status_scheduledFor_idx" ON "workflow_durable_jobs"("status", "scheduledFor");

-- CreateIndex
CREATE INDEX "workflow_durable_jobs_jobKind_idx" ON "workflow_durable_jobs"("jobKind");

-- CreateIndex
CREATE INDEX "applicant_information_requests_caseId_idx" ON "applicant_information_requests"("caseId");

-- CreateIndex
CREATE INDEX "case_sla_clocks_dueAt_idx" ON "case_sla_clocks"("dueAt");

-- CreateIndex
CREATE UNIQUE INDEX "case_escalations_idempotencyKey_key" ON "case_escalations"("idempotencyKey");

-- CreateIndex
CREATE INDEX "case_escalations_caseId_escalationLevel_idx" ON "case_escalations"("caseId", "escalationLevel");

-- AddForeignKey
ALTER TABLE "government_service_sla_rules" ADD CONSTRAINT "government_service_sla_rules_governmentServiceVersionId_fkey" FOREIGN KEY ("governmentServiceVersionId") REFERENCES "government_service_versions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "government_service_escalation_ladders" ADD CONSTRAINT "government_service_escalation_ladders_governmentServiceVer_fkey" FOREIGN KEY ("governmentServiceVersionId") REFERENCES "government_service_versions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "government_service_escalation_ladder_steps" ADD CONSTRAINT "government_service_escalation_ladder_steps_escalationLadder_fkey" FOREIGN KEY ("escalationLadderId") REFERENCES "government_service_escalation_ladders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "applicant_information_requests" ADD CONSTRAINT "applicant_information_requests_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "cases"("id") ON DELETE SET NULL ON UPDATE CASCADE;
