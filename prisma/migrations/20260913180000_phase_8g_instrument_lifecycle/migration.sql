-- Phase 8G (part 1): Extend authorized government decisions for lifecycle control.
-- Instrument lifecycle tables and official instrument extensions are reconciled after Phase 8E/8F.

CREATE TYPE "GovernmentDecisionType" AS ENUM (
  'APPROVE',
  'APPROVE_WITH_CONDITIONS',
  'REFUSE',
  'DEFER',
  'SUSPEND',
  'PARTIALLY_SUSPEND',
  'REVOKE',
  'REVOCATION_DECIDED',
  'REINSTATE',
  'AMEND',
  'VARY',
  'RENEW',
  'REPLACE',
  'CORRECT_CLERICAL',
  'SURRENDER_ACCEPT',
  'CLOSE',
  'OTHER'
);

ALTER TYPE "GovernmentDecisionStatus" ADD VALUE IF NOT EXISTS 'DRAFT';
ALTER TYPE "GovernmentDecisionStatus" ADD VALUE IF NOT EXISTS 'PENDING';
ALTER TYPE "GovernmentDecisionStatus" ADD VALUE IF NOT EXISTS 'FINALIZED';
ALTER TYPE "GovernmentDecisionStatus" ADD VALUE IF NOT EXISTS 'WITHDRAWN';

ALTER TABLE "government_decisions"
  ADD COLUMN "governmentServiceVersionId" UUID,
  ADD COLUMN "lifecycleDecisionType" "GovernmentDecisionType",
  ADD COLUMN "outcomeSummary" TEXT,
  ADD COLUMN "reasonsReference" TEXT,
  ADD COLUMN "finalizedAt" TIMESTAMP(3),
  ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE "government_decisions" ALTER COLUMN "caseId" DROP NOT NULL;
ALTER TABLE "government_decisions" ALTER COLUMN "masterAdministrativeFileId" DROP NOT NULL;
ALTER TABLE "government_decisions" ALTER COLUMN "decisionTypeVersionId" DROP NOT NULL;
ALTER TABLE "government_decisions" ALTER COLUMN "functionAuthorityRecordId" DROP NOT NULL;
ALTER TABLE "government_decisions" ALTER COLUMN "authorityEvaluationRecordId" DROP NOT NULL;
ALTER TABLE "government_decisions" ALTER COLUMN "decisionReadinessAssessmentId" DROP NOT NULL;
ALTER TABLE "government_decisions" ALTER COLUMN "evidencePacketVersionId" DROP NOT NULL;
ALTER TABLE "government_decisions" ALTER COLUMN "appointmentId" DROP NOT NULL;
ALTER TABLE "government_decisions" ALTER COLUMN "institutionId" DROP NOT NULL;
ALTER TABLE "government_decisions" ALTER COLUMN "departmentId" DROP NOT NULL;
ALTER TABLE "government_decisions" ALTER COLUMN "matterDecided" DROP NOT NULL;
ALTER TABLE "government_decisions" ALTER COLUMN "outcome" DROP NOT NULL;
ALTER TABLE "government_decisions" ALTER COLUMN "decidedAt" DROP NOT NULL;
ALTER TABLE "government_decisions" ALTER COLUMN "integrityHash" DROP NOT NULL;

CREATE INDEX "government_decisions_lifecycleDecisionType_idx" ON "government_decisions"("lifecycleDecisionType");

ALTER TABLE "government_decisions"
  ADD CONSTRAINT "government_decisions_governmentServiceVersionId_fkey"
  FOREIGN KEY ("governmentServiceVersionId") REFERENCES "government_service_versions"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
