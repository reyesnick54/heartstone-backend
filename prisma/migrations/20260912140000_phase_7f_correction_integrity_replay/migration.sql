-- Phase 7F: Correction without erasure, integrity events, access history, and record replay

CREATE TYPE "EvidenceItemStatus" AS ENUM ('PENDING', 'RECEIVED', 'UNDER_REVIEW', 'VERIFIED', 'DISPUTED', 'SUPERSEDED', 'REJECTED', 'ARCHIVED');
CREATE TYPE "EvidenceDocumentVersionStatus" AS ENUM ('DRAFT', 'ACTIVE', 'SUPERSEDED', 'DISPUTED');
CREATE TYPE "EvidenceReviewStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETE', 'DISPUTED', 'SUPERSEDED');
CREATE TYPE "GovernmentResponseStatus" AS ENUM ('DRAFT', 'ISSUED', 'SUPERSEDED');
CREATE TYPE "ProfessionalFindingStatus" AS ENUM ('DRAFT', 'ISSUED', 'DISPUTED', 'SUPERSEDED');
CREATE TYPE "RecordCorrectionStatus" AS ENUM ('REQUESTED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'IMPLEMENTED', 'SUPERSEDED');
CREATE TYPE "RecordIntegrityEventType" AS ENUM ('CREATED', 'HASHED', 'VERIFIED', 'VERSIONED', 'SUPERSEDED', 'CORRECTED', 'EXPORTED', 'RESTORED', 'ARCHIVED', 'MIGRATED');
CREATE TYPE "RecordAccessEventType" AS ENUM ('VIEW', 'DOWNLOAD', 'EXPORT', 'PRINT_REQUEST', 'SHARE_AUTHORIZED', 'ADMIN_ACCESS');
CREATE TYPE "RecordAccessResult" AS ENUM ('ALLOWED', 'DENIED');
CREATE TYPE "RecordsReplayMode" AS ENUM ('HISTORICAL_REPLAY', 'CURRENT_VIEW');

CREATE TABLE "master_administrative_file_versions" (
    "id" UUID NOT NULL,
    "masterAdministrativeFileId" UUID NOT NULL,
    "versionNumber" INTEGER NOT NULL,
    "snapshot" JSONB NOT NULL,
    "contentHash" TEXT NOT NULL,
    "effectiveAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "supersededAt" TIMESTAMP(3),
    "supersededById" UUID,
    "createdByIdentityId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "master_administrative_file_versions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "evidence_documents" (
    "id" UUID NOT NULL,
    "masterAdministrativeFileId" UUID NOT NULL,
    "documentCode" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "classification" "MasterAdministrativeFileSecurityClassification" NOT NULL DEFAULT 'OFFICIAL',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "evidence_documents_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "evidence_document_versions" (
    "id" UUID NOT NULL,
    "documentId" UUID NOT NULL,
    "versionNumber" INTEGER NOT NULL,
    "contentReference" TEXT NOT NULL,
    "contentHash" TEXT NOT NULL,
    "status" "EvidenceDocumentVersionStatus" NOT NULL DEFAULT 'ACTIVE',
    "effectiveAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "supersededAt" TIMESTAMP(3),
    "supersededById" UUID,
    "createdByIdentityId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "evidence_document_versions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "evidence_items" (
    "id" UUID NOT NULL,
    "masterAdministrativeFileId" UUID NOT NULL,
    "evidenceCode" TEXT NOT NULL,
    "evidenceType" TEXT NOT NULL,
    "status" "EvidenceItemStatus" NOT NULL DEFAULT 'PENDING',
    "statusChangedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "contentReference" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "evidence_items_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "evidence_item_status_history" (
    "id" UUID NOT NULL,
    "evidenceItemId" UUID NOT NULL,
    "fromStatus" "EvidenceItemStatus",
    "toStatus" "EvidenceItemStatus" NOT NULL,
    "reason" TEXT,
    "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actorIdentityId" UUID,
    CONSTRAINT "evidence_item_status_history_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "evidence_packets" (
    "id" UUID NOT NULL,
    "masterAdministrativeFileId" UUID NOT NULL,
    "packetNumber" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "evidence_packets_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "evidence_packet_versions" (
    "id" UUID NOT NULL,
    "packetId" UUID NOT NULL,
    "versionNumber" INTEGER NOT NULL,
    "frozenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "contentHash" TEXT NOT NULL,
    "itemReferences" JSONB NOT NULL DEFAULT '[]',
    "workflowVersionReference" TEXT,
    "authorityReferences" JSONB NOT NULL DEFAULT '[]',
    "supersededAt" TIMESTAMP(3),
    "createdByIdentityId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "evidence_packet_versions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "evidence_reviews" (
    "id" UUID NOT NULL,
    "masterAdministrativeFileId" UUID NOT NULL,
    "reviewReference" TEXT NOT NULL,
    "status" "EvidenceReviewStatus" NOT NULL DEFAULT 'PENDING',
    "reviewerIdentityId" UUID,
    "reviewerOfficeholderId" UUID,
    "authorityEvaluationRecordId" UUID,
    "findings" TEXT,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "evidence_reviews_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "government_responses" (
    "id" UUID NOT NULL,
    "masterAdministrativeFileId" UUID NOT NULL,
    "responseReference" TEXT NOT NULL,
    "respondingInstitutionId" UUID NOT NULL,
    "status" "GovernmentResponseStatus" NOT NULL DEFAULT 'DRAFT',
    "responseContent" TEXT NOT NULL,
    "issuedAt" TIMESTAMP(3),
    "supersededAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "government_responses_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "professional_findings" (
    "id" UUID NOT NULL,
    "masterAdministrativeFileId" UUID NOT NULL,
    "findingReference" TEXT NOT NULL,
    "professionalBodyRef" TEXT NOT NULL,
    "status" "ProfessionalFindingStatus" NOT NULL DEFAULT 'DRAFT',
    "findingContent" TEXT NOT NULL,
    "issuedAt" TIMESTAMP(3),
    "supersededAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "professional_findings_pkey" PRIMARY KEY ("id")
);

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

CREATE UNIQUE INDEX "master_administrative_file_versions_masterAdministrativeFileId_versionNumber_key" ON "master_administrative_file_versions"("masterAdministrativeFileId", "versionNumber");
CREATE INDEX "master_administrative_file_versions_masterAdministrativeFileId_effectiveAt_idx" ON "master_administrative_file_versions"("masterAdministrativeFileId", "effectiveAt");
CREATE UNIQUE INDEX "evidence_documents_masterAdministrativeFileId_documentCode_key" ON "evidence_documents"("masterAdministrativeFileId", "documentCode");
CREATE INDEX "evidence_documents_masterAdministrativeFileId_idx" ON "evidence_documents"("masterAdministrativeFileId");
CREATE UNIQUE INDEX "evidence_document_versions_documentId_versionNumber_key" ON "evidence_document_versions"("documentId", "versionNumber");
CREATE INDEX "evidence_document_versions_documentId_effectiveAt_idx" ON "evidence_document_versions"("documentId", "effectiveAt");
CREATE UNIQUE INDEX "evidence_items_masterAdministrativeFileId_evidenceCode_key" ON "evidence_items"("masterAdministrativeFileId", "evidenceCode");
CREATE INDEX "evidence_items_masterAdministrativeFileId_status_idx" ON "evidence_items"("masterAdministrativeFileId", "status");
CREATE INDEX "evidence_item_status_history_evidenceItemId_changedAt_idx" ON "evidence_item_status_history"("evidenceItemId", "changedAt");
CREATE UNIQUE INDEX "evidence_packets_masterAdministrativeFileId_packetNumber_key" ON "evidence_packets"("masterAdministrativeFileId", "packetNumber");
CREATE INDEX "evidence_packets_masterAdministrativeFileId_idx" ON "evidence_packets"("masterAdministrativeFileId");
CREATE UNIQUE INDEX "evidence_packet_versions_packetId_versionNumber_key" ON "evidence_packet_versions"("packetId", "versionNumber");
CREATE INDEX "evidence_packet_versions_packetId_frozenAt_idx" ON "evidence_packet_versions"("packetId", "frozenAt");
CREATE UNIQUE INDEX "evidence_reviews_reviewReference_key" ON "evidence_reviews"("reviewReference");
CREATE INDEX "evidence_reviews_masterAdministrativeFileId_status_idx" ON "evidence_reviews"("masterAdministrativeFileId", "status");
CREATE UNIQUE INDEX "government_responses_responseReference_key" ON "government_responses"("responseReference");
CREATE INDEX "government_responses_masterAdministrativeFileId_status_idx" ON "government_responses"("masterAdministrativeFileId", "status");
CREATE UNIQUE INDEX "professional_findings_findingReference_key" ON "professional_findings"("findingReference");
CREATE INDEX "professional_findings_masterAdministrativeFileId_status_idx" ON "professional_findings"("masterAdministrativeFileId", "status");
CREATE INDEX "record_corrections_targetRecordType_targetRecordId_idx" ON "record_corrections"("targetRecordType", "targetRecordId");
CREATE INDEX "record_corrections_status_idx" ON "record_corrections"("status");
CREATE INDEX "record_corrections_requestedBy_idx" ON "record_corrections"("requestedBy");
CREATE INDEX "record_integrity_events_recordType_recordId_occurredAt_idx" ON "record_integrity_events"("recordType", "recordId", "occurredAt");
CREATE INDEX "record_integrity_events_eventType_idx" ON "record_integrity_events"("eventType");
CREATE INDEX "record_access_events_recordType_recordId_occurredAt_idx" ON "record_access_events"("recordType", "recordId", "occurredAt");
CREATE INDEX "record_access_events_identityId_idx" ON "record_access_events"("identityId");
CREATE INDEX "record_access_events_accessType_idx" ON "record_access_events"("accessType");

ALTER TABLE "master_administrative_file_versions" ADD CONSTRAINT "master_administrative_file_versions_masterAdministrativeFileId_fkey" FOREIGN KEY ("masterAdministrativeFileId") REFERENCES "master_administrative_files"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "master_administrative_file_versions" ADD CONSTRAINT "master_administrative_file_versions_supersededById_fkey" FOREIGN KEY ("supersededById") REFERENCES "master_administrative_file_versions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "evidence_documents" ADD CONSTRAINT "evidence_documents_masterAdministrativeFileId_fkey" FOREIGN KEY ("masterAdministrativeFileId") REFERENCES "master_administrative_files"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "evidence_document_versions" ADD CONSTRAINT "evidence_document_versions_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "evidence_documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "evidence_document_versions" ADD CONSTRAINT "evidence_document_versions_supersededById_fkey" FOREIGN KEY ("supersededById") REFERENCES "evidence_document_versions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "evidence_items" ADD CONSTRAINT "evidence_items_masterAdministrativeFileId_fkey" FOREIGN KEY ("masterAdministrativeFileId") REFERENCES "master_administrative_files"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "evidence_item_status_history" ADD CONSTRAINT "evidence_item_status_history_evidenceItemId_fkey" FOREIGN KEY ("evidenceItemId") REFERENCES "evidence_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "evidence_packets" ADD CONSTRAINT "evidence_packets_masterAdministrativeFileId_fkey" FOREIGN KEY ("masterAdministrativeFileId") REFERENCES "master_administrative_files"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "evidence_packet_versions" ADD CONSTRAINT "evidence_packet_versions_packetId_fkey" FOREIGN KEY ("packetId") REFERENCES "evidence_packets"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "evidence_reviews" ADD CONSTRAINT "evidence_reviews_masterAdministrativeFileId_fkey" FOREIGN KEY ("masterAdministrativeFileId") REFERENCES "master_administrative_files"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "evidence_reviews" ADD CONSTRAINT "evidence_reviews_authorityEvaluationRecordId_fkey" FOREIGN KEY ("authorityEvaluationRecordId") REFERENCES "authority_evaluation_records"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "government_responses" ADD CONSTRAINT "government_responses_masterAdministrativeFileId_fkey" FOREIGN KEY ("masterAdministrativeFileId") REFERENCES "master_administrative_files"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "government_responses" ADD CONSTRAINT "government_responses_respondingInstitutionId_fkey" FOREIGN KEY ("respondingInstitutionId") REFERENCES "institutions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "professional_findings" ADD CONSTRAINT "professional_findings_masterAdministrativeFileId_fkey" FOREIGN KEY ("masterAdministrativeFileId") REFERENCES "master_administrative_files"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "record_corrections" ADD CONSTRAINT "record_corrections_requestedBy_fkey" FOREIGN KEY ("requestedBy") REFERENCES "identities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "record_corrections" ADD CONSTRAINT "record_corrections_approvedByIdentityId_fkey" FOREIGN KEY ("approvedByIdentityId") REFERENCES "identities"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "record_corrections" ADD CONSTRAINT "record_corrections_approvedByOfficeholderId_fkey" FOREIGN KEY ("approvedByOfficeholderId") REFERENCES "officeholders"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "record_corrections" ADD CONSTRAINT "record_corrections_authorityEvaluationRecordId_fkey" FOREIGN KEY ("authorityEvaluationRecordId") REFERENCES "authority_evaluation_records"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "record_corrections" ADD CONSTRAINT "record_corrections_correctionAuthorityFunctionId_fkey" FOREIGN KEY ("correctionAuthorityFunctionId") REFERENCES "function_authority_records"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "record_integrity_events" ADD CONSTRAINT "record_integrity_events_actorIdentityId_fkey" FOREIGN KEY ("actorIdentityId") REFERENCES "identities"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "record_integrity_events" ADD CONSTRAINT "record_integrity_events_actorOfficeholderId_fkey" FOREIGN KEY ("actorOfficeholderId") REFERENCES "officeholders"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "record_access_events" ADD CONSTRAINT "record_access_events_identityId_fkey" FOREIGN KEY ("identityId") REFERENCES "identities"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "record_access_events" ADD CONSTRAINT "record_access_events_officeholderId_fkey" FOREIGN KEY ("officeholderId") REFERENCES "officeholders"("id") ON DELETE SET NULL ON UPDATE CASCADE;
