-- Phase 7F: Correction without erasure, integrity, access, and replay

CREATE TYPE "RecordCorrectionStatus" AS ENUM (
  'REQUESTED',
  'UNDER_REVIEW',
  'APPROVED',
  'REJECTED',
  'IMPLEMENTED',
  'SUPERSEDED'
);

CREATE TYPE "RecordIntegrityEventType" AS ENUM (
  'CREATED',
  'HASHED',
  'VERIFIED',
  'VERSIONED',
  'SUPERSEDED',
  'CORRECTED',
  'EXPORTED',
  'RESTORED',
  'ARCHIVED',
  'MIGRATED'
);

CREATE TYPE "RecordAccessEventType" AS ENUM (
  'VIEW',
  'DOWNLOAD',
  'EXPORT',
  'PRINT_REQUEST',
  'SHARE_AUTHORIZED',
  'ADMIN_ACCESS'
);

CREATE TYPE "RecordAccessResult" AS ENUM ('ALLOWED', 'DENIED');

CREATE TYPE "RecordsReplayMode" AS ENUM ('HISTORICAL_REPLAY', 'CURRENT_VIEW');

CREATE TABLE "record_corrections" (
  "id" UUID NOT NULL,
  "targetRecordType" TEXT NOT NULL,
  "targetRecordId" UUID NOT NULL,
  "targetVersionId" UUID,
  "requestedBy" UUID NOT NULL,
  "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "errorOrDisputeDescription" TEXT NOT NULL,
  "supportingEvidenceIds" JSONB NOT NULL DEFAULT '[]',
  "correctionAuthorityFunctionId" UUID,
  "authorityEvaluationRecordId" UUID,
  "approvedByIdentityId" UUID,
  "approvedByOfficeholderId" UUID,
  "approvedAt" TIMESTAMP(3),
  "replacementRecordReference" TEXT,
  "downstreamAffectedReferences" JSONB NOT NULL DEFAULT '[]',
  "reassessmentRequired" BOOLEAN NOT NULL DEFAULT false,
  "noticeRequired" BOOLEAN NOT NULL DEFAULT false,
  "status" "RecordCorrectionStatus" NOT NULL DEFAULT 'REQUESTED',
  "reason" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "record_corrections_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "record_integrity_events" (
  "id" UUID NOT NULL,
  "recordType" TEXT NOT NULL,
  "recordId" UUID NOT NULL,
  "recordVersionId" UUID,
  "eventType" "RecordIntegrityEventType" NOT NULL,
  "hashAlgorithm" TEXT NOT NULL DEFAULT 'SHA-256',
  "contentHash" TEXT NOT NULL,
  "priorIntegrityEventHash" TEXT,
  "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "actorIdentityId" UUID,
  "actorOfficeholderId" UUID,
  "systemComponent" TEXT NOT NULL,
  "reason" TEXT,
  "metadata" JSONB NOT NULL DEFAULT '{}',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "record_integrity_events_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "record_access_events" (
  "id" UUID NOT NULL,
  "recordType" TEXT NOT NULL,
  "recordId" UUID NOT NULL,
  "accessType" "RecordAccessEventType" NOT NULL,
  "identityId" UUID,
  "officeholderId" UUID,
  "purpose" TEXT NOT NULL,
  "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "result" "RecordAccessResult" NOT NULL,
  "correlationId" TEXT,
  "securityAuditEventId" UUID,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "record_access_events_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "record_corrections_targetRecordType_targetRecordId_idx"
  ON "record_corrections"("targetRecordType", "targetRecordId");
CREATE INDEX "record_corrections_status_idx" ON "record_corrections"("status");
CREATE INDEX "record_corrections_requestedBy_idx" ON "record_corrections"("requestedBy");

CREATE INDEX "record_integrity_events_recordType_recordId_occurredAt_idx"
  ON "record_integrity_events"("recordType", "recordId", "occurredAt");
CREATE INDEX "record_integrity_events_eventType_idx" ON "record_integrity_events"("eventType");

CREATE INDEX "record_access_events_recordType_recordId_occurredAt_idx"
  ON "record_access_events"("recordType", "recordId", "occurredAt");
CREATE INDEX "record_access_events_identityId_idx" ON "record_access_events"("identityId");
CREATE INDEX "record_access_events_accessType_idx" ON "record_access_events"("accessType");

ALTER TABLE "record_corrections"
  ADD CONSTRAINT "record_corrections_requestedBy_fkey"
  FOREIGN KEY ("requestedBy") REFERENCES "identities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "record_corrections"
  ADD CONSTRAINT "record_corrections_approvedByIdentityId_fkey"
  FOREIGN KEY ("approvedByIdentityId") REFERENCES "identities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "record_corrections"
  ADD CONSTRAINT "record_corrections_approvedByOfficeholderId_fkey"
  FOREIGN KEY ("approvedByOfficeholderId") REFERENCES "officeholders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "record_corrections"
  ADD CONSTRAINT "record_corrections_authorityEvaluationRecordId_fkey"
  FOREIGN KEY ("authorityEvaluationRecordId") REFERENCES "authority_evaluation_records"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "record_corrections"
  ADD CONSTRAINT "record_corrections_correctionAuthorityFunctionId_fkey"
  FOREIGN KEY ("correctionAuthorityFunctionId") REFERENCES "function_authority_records"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "record_integrity_events"
  ADD CONSTRAINT "record_integrity_events_actorIdentityId_fkey"
  FOREIGN KEY ("actorIdentityId") REFERENCES "identities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "record_integrity_events"
  ADD CONSTRAINT "record_integrity_events_actorOfficeholderId_fkey"
  FOREIGN KEY ("actorOfficeholderId") REFERENCES "officeholders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "record_access_events"
  ADD CONSTRAINT "record_access_events_identityId_fkey"
  FOREIGN KEY ("identityId") REFERENCES "identities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "record_access_events"
  ADD CONSTRAINT "record_access_events_officeholderId_fkey"
  FOREIGN KEY ("officeholderId") REFERENCES "officeholders"("id") ON DELETE SET NULL ON UPDATE CASCADE;
