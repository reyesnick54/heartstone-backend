-- Phase 6G reconciliation: extend canonical Phase 6A case timeline tables.

-- ApplicationStatus: add RECEIVED
ALTER TYPE "ApplicationStatus" ADD VALUE IF NOT EXISTS 'RECEIVED';

-- CaseStatus: extend with timeline and coordination values
ALTER TYPE "CaseStatus" ADD VALUE IF NOT EXISTS 'OPEN';
ALTER TYPE "CaseStatus" ADD VALUE IF NOT EXISTS 'IN_PROGRESS';
ALTER TYPE "CaseStatus" ADD VALUE IF NOT EXISTS 'REFERRAL_PENDING';
ALTER TYPE "CaseStatus" ADD VALUE IF NOT EXISTS 'PROFESSIONAL_REVIEW';
ALTER TYPE "CaseStatus" ADD VALUE IF NOT EXISTS 'INSPECTION';
ALTER TYPE "CaseStatus" ADD VALUE IF NOT EXISTS 'SAFE_HALT';
ALTER TYPE "CaseStatus" ADD VALUE IF NOT EXISTS 'WITHDRAWN';
ALTER TYPE "CaseStatus" ADD VALUE IF NOT EXISTS 'ARCHIVED';

CREATE TYPE "CaseLegalStatus" AS ENUM ('NONE', 'PENDING', 'UNRESOLVED', 'EXTERNAL_STATUS_PENDING');
CREATE TYPE "CasePriority" AS ENUM ('LOW', 'NORMAL', 'HIGH', 'URGENT');
CREATE TYPE "CaseEventPublicVisibility" AS ENUM ('INTERNAL', 'OFFICIAL', 'APPLICANT_VISIBLE');
CREATE TYPE "CaseCommunicationType" AS ENUM (
  'APPLICANT_MESSAGE',
  'DEFICIENCY_NOTICE',
  'REQUEST_FOR_INFORMATION',
  'STATUS_UPDATE',
  'REFERRAL_NOTICE',
  'INTERNAL_NOTE',
  'EXTERNAL_CORRESPONDENCE',
  'SYSTEM_NOTICE'
);
CREATE TYPE "CaseCommunicationChannel" AS ENUM ('PORTAL', 'EMAIL', 'SMS', 'POSTAL', 'COUNTER', 'SYSTEM');
CREATE TYPE "CaseCommunicationDeliveryStatus" AS ENUM (
  'DRAFT',
  'QUEUED',
  'SENT',
  'DELIVERED',
  'FAILED',
  'RECEIVED'
);
CREATE TYPE "CaseRecipientType" AS ENUM (
  'APPLICANT',
  'OFFICEHOLDER',
  'DEPARTMENT',
  'EXTERNAL_AUTHORITY',
  'INTERNAL',
  'SYSTEM'
);
CREATE TYPE "CaseRecordClassification" AS ENUM (
  'PUBLIC',
  'OFFICIAL',
  'INTERNAL',
  'RESTRICTED',
  'PRIVILEGED'
);
CREATE TYPE "CaseMilestoneStatus" AS ENUM (
  'UPCOMING',
  'IN_PROGRESS',
  'AT_RISK',
  'DELAYED',
  'COMPLETED',
  'CANCELLED'
);
CREATE TYPE "CasePublicStatusStage" AS ENUM (
  'RECEIVED',
  'CHECKING_SUBMISSION',
  'MORE_INFORMATION_NEEDED',
  'UNDER_REVIEW',
  'WAITING_ON_OTHER_AUTHORITY',
  'PROFESSIONAL_REVIEW',
  'INSPECTION',
  'DECISION_PENDING',
  'COMPLETED',
  'CLOSED'
);

-- CaseEventType extensions
ALTER TYPE "CaseEventType" ADD VALUE IF NOT EXISTS 'CASE_OPENED';
ALTER TYPE "CaseEventType" ADD VALUE IF NOT EXISTS 'CASE_ASSIGNED';
ALTER TYPE "CaseEventType" ADD VALUE IF NOT EXISTS 'COMPLETENESS_STARTED';
ALTER TYPE "CaseEventType" ADD VALUE IF NOT EXISTS 'COMPLETENESS_COMPLETED';
ALTER TYPE "CaseEventType" ADD VALUE IF NOT EXISTS 'APPLICANT_RESPONSE_RECEIVED';
ALTER TYPE "CaseEventType" ADD VALUE IF NOT EXISTS 'REFERRED';
ALTER TYPE "CaseEventType" ADD VALUE IF NOT EXISTS 'PROFESSIONAL_REVIEW_REQUESTED';
ALTER TYPE "CaseEventType" ADD VALUE IF NOT EXISTS 'INSPECTION_REQUESTED';
ALTER TYPE "CaseEventType" ADD VALUE IF NOT EXISTS 'ISSUE_ESCALATED';
ALTER TYPE "CaseEventType" ADD VALUE IF NOT EXISTS 'WORKFLOW_PAUSED';
ALTER TYPE "CaseEventType" ADD VALUE IF NOT EXISTS 'WORKFLOW_RESUMED';
ALTER TYPE "CaseEventType" ADD VALUE IF NOT EXISTS 'DECISION_PENDING';
ALTER TYPE "CaseEventType" ADD VALUE IF NOT EXISTS 'WITHDRAWN';
ALTER TYPE "CaseEventType" ADD VALUE IF NOT EXISTS 'CLOSED';

ALTER TABLE "cases" ADD COLUMN IF NOT EXISTS "applicantIdentityId" UUID;
ALTER TABLE "cases" ADD COLUMN IF NOT EXISTS "governmentServiceId" UUID;
ALTER TABLE "cases" ADD COLUMN IF NOT EXISTS "responsibleInstitutionId" UUID;
ALTER TABLE "cases" ADD COLUMN IF NOT EXISTS "responsibleDepartmentId" UUID;
ALTER TABLE "cases" ADD COLUMN IF NOT EXISTS "legalStatus" "CaseLegalStatus" NOT NULL DEFAULT 'NONE';
ALTER TABLE "cases" ADD COLUMN IF NOT EXISTS "priority" "CasePriority" NOT NULL DEFAULT 'NORMAL';
ALTER TABLE "cases" ADD COLUMN IF NOT EXISTS "openedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "cases" ADD COLUMN IF NOT EXISTS "closedAt" TIMESTAMP(3);
ALTER TABLE "cases" ADD COLUMN IF NOT EXISTS "currentCaseManagerOfficeholderId" UUID;

UPDATE "cases" c
SET
  "applicantIdentityId" = a."applicantIdentityId",
  "governmentServiceId" = a."governmentServiceId",
  "responsibleInstitutionId" = gs."responsibleInstitutionId",
  "responsibleDepartmentId" = gs."responsibleDepartmentId"
FROM "applications" a
JOIN "government_services" gs ON gs."id" = a."governmentServiceId"
WHERE c."applicationId" = a."id"
  AND c."applicantIdentityId" IS NULL;

ALTER TABLE "cases" ALTER COLUMN "applicantIdentityId" SET NOT NULL;
ALTER TABLE "cases" ALTER COLUMN "governmentServiceId" SET NOT NULL;
ALTER TABLE "cases" ALTER COLUMN "responsibleInstitutionId" SET NOT NULL;
ALTER TABLE "cases" ALTER COLUMN "responsibleDepartmentId" SET NOT NULL;

ALTER TABLE "case_events" ADD COLUMN IF NOT EXISTS "metadata" JSONB NOT NULL DEFAULT '{}';
ALTER TABLE "case_events" ADD COLUMN IF NOT EXISTS "officeholderId" UUID;
ALTER TABLE "case_events" ADD COLUMN IF NOT EXISTS "institutionId" UUID;
ALTER TABLE "case_events" ADD COLUMN IF NOT EXISTS "departmentId" UUID;
ALTER TABLE "case_events" ADD COLUMN IF NOT EXISTS "workflowInstanceId" UUID;
ALTER TABLE "case_events" ADD COLUMN IF NOT EXISTS "stepInstanceId" UUID;
ALTER TABLE "case_events" ADD COLUMN IF NOT EXISTS "correlationId" TEXT;
ALTER TABLE "case_events" ADD COLUMN IF NOT EXISTS "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "case_events" ADD COLUMN IF NOT EXISTS "publicVisibility" "CaseEventPublicVisibility" NOT NULL DEFAULT 'INTERNAL';
ALTER TABLE "case_events" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

UPDATE "case_events" SET "occurredAt" = "recordedAt" WHERE "occurredAt" IS NULL;

ALTER TABLE "case_communications" ADD COLUMN IF NOT EXISTS "communicationType" "CaseCommunicationType";
ALTER TABLE "case_communications" ADD COLUMN IF NOT EXISTS "senderIdentityId" UUID;
ALTER TABLE "case_communications" ADD COLUMN IF NOT EXISTS "senderOfficeholderId" UUID;
ALTER TABLE "case_communications" ADD COLUMN IF NOT EXISTS "recipientType" "CaseRecipientType";
ALTER TABLE "case_communications" ADD COLUMN IF NOT EXISTS "recipientReference" TEXT;
ALTER TABLE "case_communications" ADD COLUMN IF NOT EXISTS "channel" "CaseCommunicationChannel";
ALTER TABLE "case_communications" ADD COLUMN IF NOT EXISTS "templateReference" TEXT;
ALTER TABLE "case_communications" ADD COLUMN IF NOT EXISTS "templateVersion" TEXT;
ALTER TABLE "case_communications" ADD COLUMN IF NOT EXISTS "sentAt" TIMESTAMP(3);
ALTER TABLE "case_communications" ADD COLUMN IF NOT EXISTS "receivedAt" TIMESTAMP(3);
ALTER TABLE "case_communications" ADD COLUMN IF NOT EXISTS "deliveryStatus" "CaseCommunicationDeliveryStatus" NOT NULL DEFAULT 'DRAFT';
ALTER TABLE "case_communications" ADD COLUMN IF NOT EXISTS "classification" "CaseRecordClassification" NOT NULL DEFAULT 'OFFICIAL';
ALTER TABLE "case_communications" ADD COLUMN IF NOT EXISTS "publicVisibility" "CaseEventPublicVisibility" NOT NULL DEFAULT 'INTERNAL';
ALTER TABLE "case_communications" ADD COLUMN IF NOT EXISTS "caseEventId" UUID;
ALTER TABLE "case_communications" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "case_communications" ALTER COLUMN "subject" DROP NOT NULL;

ALTER TABLE "case_milestones" ADD COLUMN IF NOT EXISTS "name" TEXT;
ALTER TABLE "case_milestones" ADD COLUMN IF NOT EXISTS "targetDate" TIMESTAMP(3);
ALTER TABLE "case_milestones" ADD COLUMN IF NOT EXISTS "actualDate" TIMESTAMP(3);
ALTER TABLE "case_milestones" ADD COLUMN IF NOT EXISTS "status" "CaseMilestoneStatus" NOT NULL DEFAULT 'UPCOMING';
ALTER TABLE "case_milestones" ADD COLUMN IF NOT EXISTS "responsiblePartyRef" TEXT;
ALTER TABLE "case_milestones" ADD COLUMN IF NOT EXISTS "sourceSlaReference" TEXT;
ALTER TABLE "case_milestones" ADD COLUMN IF NOT EXISTS "dependencyReference" TEXT;
ALTER TABLE "case_milestones" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "case_milestones" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "case_milestones" ALTER COLUMN "milestoneType" DROP NOT NULL;
ALTER TABLE "case_milestones" ALTER COLUMN "reachedAt" DROP NOT NULL;

UPDATE "case_milestones" SET "name" = "label" WHERE "name" IS NULL;

ALTER TABLE "case_milestones" ALTER COLUMN "name" SET NOT NULL;
ALTER TABLE "case_milestones" DROP COLUMN IF EXISTS "label";

ALTER TABLE "case_public_status_projections" ADD COLUMN IF NOT EXISTS "publicStage" "CasePublicStatusStage";
ALTER TABLE "case_public_status_projections" ADD COLUMN IF NOT EXISTS "publicStageLabel" TEXT;
ALTER TABLE "case_public_status_projections" ADD COLUMN IF NOT EXISTS "publicStageDetail" TEXT;
ALTER TABLE "case_public_status_projections" ADD COLUMN IF NOT EXISTS "sourceLegalStatus" "CaseLegalStatus" NOT NULL DEFAULT 'NONE';
ALTER TABLE "case_public_status_projections" ADD COLUMN IF NOT EXISTS "currentMilestoneId" UUID;
ALTER TABLE "case_public_status_projections" ADD COLUMN IF NOT EXISTS "applicantDisclaimer" TEXT;
ALTER TABLE "case_public_status_projections" ADD COLUMN IF NOT EXISTS "projectionVersion" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "case_public_status_projections" ADD COLUMN IF NOT EXISTS "lastDerivedAt" TIMESTAMP(3);
ALTER TABLE "case_public_status_projections" ADD COLUMN IF NOT EXISTS "sourceEventId" UUID;
ALTER TABLE "case_public_status_projections" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "case_public_status_projections" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

UPDATE "case_public_status_projections"
SET
  "publicStageLabel" = "publicStatusLabel",
  "lastDerivedAt" = "lastUpdatedAt"
WHERE "publicStageLabel" IS NULL;

CREATE TABLE IF NOT EXISTS "case_communication_outbox" (
  "id" UUID NOT NULL,
  "communicationId" UUID NOT NULL,
  "channel" "CaseCommunicationChannel" NOT NULL,
  "payload" JSONB NOT NULL DEFAULT '{}',
  "queuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "processedAt" TIMESTAMP(3),
  "status" TEXT NOT NULL DEFAULT 'QUEUED',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "case_communication_outbox_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "cases_applicantIdentityId_idx" ON "cases"("applicantIdentityId");
CREATE INDEX IF NOT EXISTS "cases_governmentServiceId_idx" ON "cases"("governmentServiceId");
CREATE INDEX IF NOT EXISTS "cases_responsibleDepartmentId_idx" ON "cases"("responsibleDepartmentId");
CREATE INDEX IF NOT EXISTS "cases_currentCaseManagerOfficeholderId_idx" ON "cases"("currentCaseManagerOfficeholderId");
CREATE INDEX IF NOT EXISTS "case_events_caseId_occurredAt_idx" ON "case_events"("caseId", "occurredAt");
CREATE INDEX IF NOT EXISTS "case_events_publicVisibility_idx" ON "case_events"("publicVisibility");
CREATE INDEX IF NOT EXISTS "case_events_correlationId_idx" ON "case_events"("correlationId");
CREATE INDEX IF NOT EXISTS "case_communications_caseId_createdAt_idx" ON "case_communications"("caseId", "createdAt");
CREATE INDEX IF NOT EXISTS "case_communications_communicationType_idx" ON "case_communications"("communicationType");
CREATE INDEX IF NOT EXISTS "case_communications_publicVisibility_idx" ON "case_communications"("publicVisibility");
CREATE INDEX IF NOT EXISTS "case_milestones_status_idx" ON "case_milestones"("status");
CREATE INDEX IF NOT EXISTS "case_public_status_projections_publicStage_idx" ON "case_public_status_projections"("publicStage");
CREATE INDEX IF NOT EXISTS "case_communication_outbox_communicationId_idx" ON "case_communication_outbox"("communicationId");
CREATE INDEX IF NOT EXISTS "case_communication_outbox_status_idx" ON "case_communication_outbox"("status");

ALTER TABLE "cases" DROP CONSTRAINT IF EXISTS "cases_applicantIdentityId_fkey";
ALTER TABLE "cases" ADD CONSTRAINT "cases_applicantIdentityId_fkey"
  FOREIGN KEY ("applicantIdentityId") REFERENCES "identities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "cases" DROP CONSTRAINT IF EXISTS "cases_governmentServiceId_fkey";
ALTER TABLE "cases" ADD CONSTRAINT "cases_governmentServiceId_fkey"
  FOREIGN KEY ("governmentServiceId") REFERENCES "government_services"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "cases" DROP CONSTRAINT IF EXISTS "cases_responsibleInstitutionId_fkey";
ALTER TABLE "cases" ADD CONSTRAINT "cases_responsibleInstitutionId_fkey"
  FOREIGN KEY ("responsibleInstitutionId") REFERENCES "institutions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "cases" DROP CONSTRAINT IF EXISTS "cases_responsibleDepartmentId_fkey";
ALTER TABLE "cases" ADD CONSTRAINT "cases_responsibleDepartmentId_fkey"
  FOREIGN KEY ("responsibleDepartmentId") REFERENCES "departments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "cases" DROP CONSTRAINT IF EXISTS "cases_currentCaseManagerOfficeholderId_fkey";
ALTER TABLE "cases" ADD CONSTRAINT "cases_currentCaseManagerOfficeholderId_fkey"
  FOREIGN KEY ("currentCaseManagerOfficeholderId") REFERENCES "officeholders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "case_events" DROP CONSTRAINT IF EXISTS "case_events_actorIdentityId_fkey";
ALTER TABLE "case_events" ADD CONSTRAINT "case_events_actorIdentityId_fkey"
  FOREIGN KEY ("actorIdentityId") REFERENCES "identities"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "case_events" DROP CONSTRAINT IF EXISTS "case_events_officeholderId_fkey";
ALTER TABLE "case_events" ADD CONSTRAINT "case_events_officeholderId_fkey"
  FOREIGN KEY ("officeholderId") REFERENCES "officeholders"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "case_events" DROP CONSTRAINT IF EXISTS "case_events_workflowInstanceId_fkey";
ALTER TABLE "case_events" ADD CONSTRAINT "case_events_workflowInstanceId_fkey"
  FOREIGN KEY ("workflowInstanceId") REFERENCES "case_workflow_instances"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "case_events" DROP CONSTRAINT IF EXISTS "case_events_stepInstanceId_fkey";
ALTER TABLE "case_events" ADD CONSTRAINT "case_events_stepInstanceId_fkey"
  FOREIGN KEY ("stepInstanceId") REFERENCES "case_workflow_step_instances"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "case_communications" DROP CONSTRAINT IF EXISTS "case_communications_senderIdentityId_fkey";
ALTER TABLE "case_communications" ADD CONSTRAINT "case_communications_senderIdentityId_fkey"
  FOREIGN KEY ("senderIdentityId") REFERENCES "identities"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "case_communications" DROP CONSTRAINT IF EXISTS "case_communications_senderOfficeholderId_fkey";
ALTER TABLE "case_communications" ADD CONSTRAINT "case_communications_senderOfficeholderId_fkey"
  FOREIGN KEY ("senderOfficeholderId") REFERENCES "officeholders"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "case_communications" DROP CONSTRAINT IF EXISTS "case_communications_caseEventId_fkey";
ALTER TABLE "case_communications" ADD CONSTRAINT "case_communications_caseEventId_fkey"
  FOREIGN KEY ("caseEventId") REFERENCES "case_events"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "case_communication_outbox" DROP CONSTRAINT IF EXISTS "case_communication_outbox_communicationId_fkey";
ALTER TABLE "case_communication_outbox" ADD CONSTRAINT "case_communication_outbox_communicationId_fkey"
  FOREIGN KEY ("communicationId") REFERENCES "case_communications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "case_public_status_projections" DROP CONSTRAINT IF EXISTS "case_public_status_projections_currentMilestoneId_fkey";
ALTER TABLE "case_public_status_projections" ADD CONSTRAINT "case_public_status_projections_currentMilestoneId_fkey"
  FOREIGN KEY ("currentMilestoneId") REFERENCES "case_milestones"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "case_public_status_projections" DROP CONSTRAINT IF EXISTS "case_public_status_projections_sourceEventId_fkey";
ALTER TABLE "case_public_status_projections" ADD CONSTRAINT "case_public_status_projections_sourceEventId_fkey"
  FOREIGN KEY ("sourceEventId") REFERENCES "case_events"("id") ON DELETE SET NULL ON UPDATE CASCADE;
