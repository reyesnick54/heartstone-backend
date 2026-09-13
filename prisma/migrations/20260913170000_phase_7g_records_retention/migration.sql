-- Phase 7G: Records retention, legal hold, archival and controlled disposition

CREATE TYPE "RecordsClassificationStatus" AS ENUM ('DRAFT', 'ACTIVE', 'SUPERSEDED', 'ARCHIVED', 'SUSPENDED');
CREATE TYPE "RetentionScheduleStatus" AS ENUM ('DRAFT', 'APPROVED', 'ACTIVE', 'SUPERSEDED', 'SUSPENDED', 'ARCHIVED');
CREATE TYPE "RetentionTriggerType" AS ENUM (
  'DATE_CREATED',
  'DATE_RECEIVED',
  'DATE_OF_DECISION',
  'CASE_CLOSURE',
  'INSTRUMENT_EXPIRY',
  'END_OF_RELATIONSHIP',
  'PROJECT_COMPLETION',
  'FINAL_PAYMENT',
  'COMPLETION_OF_APPEAL',
  'CUSTOM_APPROVED_TRIGGER'
);
CREATE TYPE "RetentionDurationUnit" AS ENUM ('DAYS', 'MONTHS', 'YEARS', 'INDEFINITE', 'EVENT_DRIVEN');
CREATE TYPE "LegalHoldStatus" AS ENUM ('DRAFT', 'ACTIVE', 'RELEASED', 'SUPERSEDED');
CREATE TYPE "LegalHoldScope" AS ENUM ('NARROW', 'STANDARD', 'INSTITUTION_WIDE', 'CROSS_INSTITUTION');
CREATE TYPE "LegalHoldConfidentiality" AS ENUM ('STANDARD', 'RESTRICTED', 'PRIVILEGED');
CREATE TYPE "LegalHoldTargetType" AS ENUM (
  'MASTER_ADMINISTRATIVE_FILE',
  'CASE',
  'DOCUMENT',
  'EVIDENCE',
  'EVIDENCE_PACKET',
  'RECORD_CLASS',
  'PRESERVATION_COLLECTION'
);
CREATE TYPE "PreservationCollectionPurpose" AS ENUM (
  'APPEAL',
  'INVESTIGATION',
  'LITIGATION',
  'AUDIT',
  'INCIDENT',
  'INSTITUTIONAL_REVIEW',
  'OTHER_APPROVED'
);
CREATE TYPE "PreservationCollectionStatus" AS ENUM ('ACTIVE', 'RELEASED', 'ARCHIVED');
CREATE TYPE "ArchivalTransferStatus" AS ENUM (
  'DRAFT',
  'MANIFEST_PREPARED',
  'IN_TRANSIT',
  'RECEIVED',
  'ACKNOWLEDGED',
  'REJECTED',
  'CANCELLED'
);
CREATE TYPE "DispositionEligibilityStatus" AS ENUM (
  'NOT_EVALUATED',
  'NOT_ELIGIBLE',
  'ELIGIBLE_FOR_REVIEW',
  'BLOCKED'
);
CREATE TYPE "DispositionRequestStatus" AS ENUM (
  'DRAFT',
  'SUBMITTED',
  'UNDER_REVIEW',
  'APPROVED',
  'REJECTED',
  'EXECUTED',
  'CANCELLED',
  'SAFE_HALTED'
);
CREATE TYPE "DispositionSafeHaltReason" AS ENUM (
  'LEGAL_HOLD_ACTIVE',
  'RETENTION_AUTHORITY_UNRESOLVED',
  'RETENTION_PERIOD_UNRESOLVED',
  'APPEAL_ACTIVE',
  'INVESTIGATION_ACTIVE',
  'CONTINUING_OBLIGATION',
  'ARCHIVE_TRANSFER_INCOMPLETE',
  'CLASSIFICATION_UNRESOLVED',
  'REQUIRED_APPROVAL_MISSING',
  'INTEGRITY_CANNOT_BE_VERIFIED',
  'VENDOR_POLICY_CONFLICT',
  'ADVERSE_EVIDENCE_PROTECTED'
);
CREATE TYPE "DispositionMethod" AS ENUM (
  'SECURE_DESTRUCTION',
  'TRANSFER_TO_NATIONAL_ARCHIVES',
  'TRANSFER_TO_INSTITUTIONAL_ARCHIVES',
  'DEACCESSION',
  'OTHER_APPROVED'
);
CREATE TYPE "DispositionExecutionResult" AS ENUM ('COMPLETED', 'PARTIALLY_COMPLETED', 'FAILED', 'ABORTED');
CREATE TYPE "ExternalRecordsRepositoryStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'DECOMMISSIONED');

ALTER TABLE "cases" ADD COLUMN IF NOT EXISTS "masterAdministrativeFileReference" TEXT;
ALTER TABLE "cases" ADD COLUMN IF NOT EXISTS "documentRegisterReference" TEXT;
ALTER TABLE "cases" ADD COLUMN IF NOT EXISTS "evidencePacketReference" TEXT;
ALTER TABLE "cases" ADD COLUMN IF NOT EXISTS "recordsClassificationReference" TEXT;
ALTER TABLE "cases" ADD COLUMN IF NOT EXISTS "retentionLegalHoldReference" TEXT;

CREATE TABLE "records_classifications" (
  "id" UUID NOT NULL,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "securityClassification" TEXT NOT NULL,
  "privacyClassification" TEXT NOT NULL,
  "accessRestriction" TEXT,
  "archivalRequirement" TEXT,
  "integrityRequirement" TEXT,
  "reviewIntervalDays" INTEGER,
  "disposalApprovalRequired" BOOLEAN NOT NULL DEFAULT true,
  "governingSourceId" UUID,
  "status" "RecordsClassificationStatus" NOT NULL DEFAULT 'DRAFT',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "records_classifications_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "retention_schedules" (
  "id" UUID NOT NULL,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "recordsClassificationId" UUID NOT NULL,
  "versionNumber" INTEGER NOT NULL DEFAULT 1,
  "supersededByScheduleId" UUID,
  "retentionDurationValue" INTEGER,
  "retentionDurationUnit" "RetentionDurationUnit",
  "triggerType" "RetentionTriggerType" NOT NULL,
  "triggerConfiguration" JSONB NOT NULL DEFAULT '{}',
  "governingSourceId" UUID NOT NULL,
  "approvedByIdentityId" UUID,
  "approvedAt" TIMESTAMP(3),
  "effectiveFrom" TIMESTAMP(3) NOT NULL,
  "effectiveUntil" TIMESTAMP(3),
  "reviewAt" TIMESTAMP(3),
  "scheduleSnapshotHash" TEXT NOT NULL,
  "status" "RetentionScheduleStatus" NOT NULL DEFAULT 'DRAFT',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "retention_schedules_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "retention_rules" (
  "id" UUID NOT NULL,
  "retentionScheduleId" UUID NOT NULL,
  "ruleOrder" INTEGER NOT NULL DEFAULT 1,
  "label" TEXT NOT NULL,
  "triggerType" "RetentionTriggerType" NOT NULL,
  "triggerConfiguration" JSONB NOT NULL DEFAULT '{}',
  "durationValue" INTEGER,
  "durationUnit" "RetentionDurationUnit",
  "minimumRetention" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "retention_rules_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "record_retention_assignments" (
  "id" UUID NOT NULL,
  "targetType" "LegalHoldTargetType" NOT NULL,
  "targetReference" TEXT NOT NULL,
  "recordsClassificationId" UUID NOT NULL,
  "retentionScheduleId" UUID NOT NULL,
  "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "assignedByIdentityId" UUID NOT NULL,
  "triggerAnchorAt" TIMESTAMP(3),
  "retentionExpiresAt" TIMESTAMP(3),
  "scheduleVersionNumber" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "record_retention_assignments_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "legal_holds" (
  "id" UUID NOT NULL,
  "holdNumber" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "authorityReference" TEXT NOT NULL,
  "reason" TEXT NOT NULL,
  "issuedByIdentityId" UUID NOT NULL,
  "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "effectiveFrom" TIMESTAMP(3) NOT NULL,
  "releasedAt" TIMESTAMP(3),
  "status" "LegalHoldStatus" NOT NULL DEFAULT 'DRAFT',
  "scope" "LegalHoldScope" NOT NULL DEFAULT 'STANDARD',
  "confidentiality" "LegalHoldConfidentiality" NOT NULL DEFAULT 'STANDARD',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "legal_holds_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "legal_hold_targets" (
  "id" UUID NOT NULL,
  "legalHoldId" UUID NOT NULL,
  "targetType" "LegalHoldTargetType" NOT NULL,
  "targetReference" TEXT NOT NULL,
  "recordsClassificationId" UUID,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "legal_hold_targets_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "legal_hold_release_records" (
  "id" UUID NOT NULL,
  "legalHoldId" UUID NOT NULL,
  "releasedByIdentityId" UUID NOT NULL,
  "releaseAuthorityReference" TEXT NOT NULL,
  "releaseReason" TEXT NOT NULL,
  "releasedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "auditManifestHash" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "legal_hold_release_records_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "preservation_collections" (
  "id" UUID NOT NULL,
  "collectionReference" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "purpose" "PreservationCollectionPurpose" NOT NULL,
  "status" "PreservationCollectionStatus" NOT NULL DEFAULT 'ACTIVE',
  "frozenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "frozenByIdentityId" UUID NOT NULL,
  "integrityManifest" JSONB NOT NULL DEFAULT '[]',
  "manifestHash" TEXT NOT NULL,
  "releaseAuthorityRef" TEXT,
  "releasedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "preservation_collections_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "preservation_collection_items" (
  "id" UUID NOT NULL,
  "preservationCollectionId" UUID NOT NULL,
  "targetType" "LegalHoldTargetType" NOT NULL,
  "targetReference" TEXT NOT NULL,
  "versionReference" TEXT NOT NULL,
  "integrityHash" TEXT NOT NULL,
  "capturedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "preservation_collection_items_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "external_records_repositories" (
  "id" UUID NOT NULL,
  "code" TEXT NOT NULL,
  "provider" TEXT NOT NULL,
  "institutionalOwnership" TEXT NOT NULL,
  "systemOfRecord" BOOLEAN NOT NULL DEFAULT false,
  "location" TEXT NOT NULL,
  "exportCapability" TEXT NOT NULL,
  "retentionCompatibility" TEXT NOT NULL,
  "legalHoldCapability" TEXT NOT NULL,
  "backupTreatment" TEXT NOT NULL,
  "terminationExitRequirement" TEXT NOT NULL,
  "vendorDefaultDeletionPolicy" TEXT,
  "institutionalScheduleOverridesVendor" BOOLEAN NOT NULL DEFAULT true,
  "status" "ExternalRecordsRepositoryStatus" NOT NULL DEFAULT 'ACTIVE',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "external_records_repositories_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "archival_transfers" (
  "id" UUID NOT NULL,
  "transferNumber" TEXT NOT NULL,
  "sourceRepositoryId" UUID NOT NULL,
  "destinationRepositoryId" UUID NOT NULL,
  "manifest" JSONB NOT NULL DEFAULT '[]',
  "manifestHash" TEXT NOT NULL,
  "integrityVerification" TEXT NOT NULL,
  "metadataCompleteness" TEXT NOT NULL,
  "restrictions" TEXT,
  "transferDate" TIMESTAMP(3),
  "sendingCustodianIdentityId" UUID,
  "receivingAcknowledgedAt" TIMESTAMP(3),
  "receivingCustodianIdentityId" UUID,
  "status" "ArchivalTransferStatus" NOT NULL DEFAULT 'DRAFT',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "archival_transfers_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "archival_transfer_items" (
  "id" UUID NOT NULL,
  "archivalTransferId" UUID NOT NULL,
  "targetType" "LegalHoldTargetType" NOT NULL,
  "targetReference" TEXT NOT NULL,
  "versionReference" TEXT NOT NULL,
  "integrityHash" TEXT NOT NULL,
  "metadata" JSONB NOT NULL DEFAULT '{}',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "archival_transfer_items_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "record_disposition_requests" (
  "id" UUID NOT NULL,
  "requestReference" TEXT NOT NULL,
  "targetType" "LegalHoldTargetType" NOT NULL,
  "targetReference" TEXT NOT NULL,
  "retentionScheduleId" UUID,
  "eligibilityStatus" "DispositionEligibilityStatus" NOT NULL DEFAULT 'NOT_EVALUATED',
  "eligibilityCalculatedAt" TIMESTAMP(3),
  "eligibilityNotes" TEXT,
  "safeHaltReasons" "DispositionSafeHaltReason"[] DEFAULT ARRAY[]::"DispositionSafeHaltReason"[],
  "appealActive" BOOLEAN NOT NULL DEFAULT false,
  "investigationActive" BOOLEAN NOT NULL DEFAULT false,
  "adverseEvidenceProtected" BOOLEAN NOT NULL DEFAULT false,
  "requestedByIdentityId" UUID NOT NULL,
  "reason" TEXT NOT NULL,
  "status" "DispositionRequestStatus" NOT NULL DEFAULT 'DRAFT',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "record_disposition_requests_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "record_disposition_records" (
  "id" UUID NOT NULL,
  "dispositionRequestId" UUID NOT NULL,
  "authorizedByIdentityId" UUID NOT NULL,
  "authorityReference" TEXT NOT NULL,
  "dispositionDate" TIMESTAMP(3) NOT NULL,
  "method" "DispositionMethod" NOT NULL,
  "manifestCertificate" JSONB NOT NULL DEFAULT '{}',
  "manifestCertificateHash" TEXT NOT NULL,
  "verificationNotes" TEXT,
  "result" "DispositionExecutionResult" NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "record_disposition_records_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "records_classifications_code_key" ON "records_classifications"("code");
CREATE UNIQUE INDEX "retention_schedules_code_versionNumber_key" ON "retention_schedules"("code", "versionNumber");
CREATE UNIQUE INDEX "retention_schedules_supersededByScheduleId_key" ON "retention_schedules"("supersededByScheduleId");
CREATE UNIQUE INDEX "retention_rules_retentionScheduleId_ruleOrder_key" ON "retention_rules"("retentionScheduleId", "ruleOrder");
CREATE UNIQUE INDEX "record_retention_assignments_targetType_targetReference_retentionScheduleId_key" ON "record_retention_assignments"("targetType", "targetReference", "retentionScheduleId");
CREATE UNIQUE INDEX "legal_holds_holdNumber_key" ON "legal_holds"("holdNumber");
CREATE UNIQUE INDEX "legal_hold_targets_legalHoldId_targetType_targetReference_key" ON "legal_hold_targets"("legalHoldId", "targetType", "targetReference");
CREATE UNIQUE INDEX "preservation_collections_collectionReference_key" ON "preservation_collections"("collectionReference");
CREATE UNIQUE INDEX "preservation_collection_items_preservationCollectionId_targetType_targetReference_versionReference_key" ON "preservation_collection_items"("preservationCollectionId", "targetType", "targetReference", "versionReference");
CREATE UNIQUE INDEX "external_records_repositories_code_key" ON "external_records_repositories"("code");
CREATE UNIQUE INDEX "archival_transfers_transferNumber_key" ON "archival_transfers"("transferNumber");
CREATE UNIQUE INDEX "archival_transfer_items_archivalTransferId_targetType_targetReference_versionReference_key" ON "archival_transfer_items"("archivalTransferId", "targetType", "targetReference", "versionReference");
CREATE UNIQUE INDEX "record_disposition_requests_requestReference_key" ON "record_disposition_requests"("requestReference");

ALTER TABLE "records_classifications" ADD CONSTRAINT "records_classifications_governingSourceId_fkey" FOREIGN KEY ("governingSourceId") REFERENCES "governing_sources"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "retention_schedules" ADD CONSTRAINT "retention_schedules_recordsClassificationId_fkey" FOREIGN KEY ("recordsClassificationId") REFERENCES "records_classifications"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "retention_schedules" ADD CONSTRAINT "retention_schedules_governingSourceId_fkey" FOREIGN KEY ("governingSourceId") REFERENCES "governing_sources"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "retention_schedules" ADD CONSTRAINT "retention_schedules_supersededByScheduleId_fkey" FOREIGN KEY ("supersededByScheduleId") REFERENCES "retention_schedules"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "retention_rules" ADD CONSTRAINT "retention_rules_retentionScheduleId_fkey" FOREIGN KEY ("retentionScheduleId") REFERENCES "retention_schedules"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "record_retention_assignments" ADD CONSTRAINT "record_retention_assignments_recordsClassificationId_fkey" FOREIGN KEY ("recordsClassificationId") REFERENCES "records_classifications"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "record_retention_assignments" ADD CONSTRAINT "record_retention_assignments_retentionScheduleId_fkey" FOREIGN KEY ("retentionScheduleId") REFERENCES "retention_schedules"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "legal_hold_targets" ADD CONSTRAINT "legal_hold_targets_legalHoldId_fkey" FOREIGN KEY ("legalHoldId") REFERENCES "legal_holds"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "legal_hold_targets" ADD CONSTRAINT "legal_hold_targets_recordsClassificationId_fkey" FOREIGN KEY ("recordsClassificationId") REFERENCES "records_classifications"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "legal_hold_release_records" ADD CONSTRAINT "legal_hold_release_records_legalHoldId_fkey" FOREIGN KEY ("legalHoldId") REFERENCES "legal_holds"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "preservation_collection_items" ADD CONSTRAINT "preservation_collection_items_preservationCollectionId_fkey" FOREIGN KEY ("preservationCollectionId") REFERENCES "preservation_collections"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "archival_transfers" ADD CONSTRAINT "archival_transfers_sourceRepositoryId_fkey" FOREIGN KEY ("sourceRepositoryId") REFERENCES "external_records_repositories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "archival_transfers" ADD CONSTRAINT "archival_transfers_destinationRepositoryId_fkey" FOREIGN KEY ("destinationRepositoryId") REFERENCES "external_records_repositories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "archival_transfer_items" ADD CONSTRAINT "archival_transfer_items_archivalTransferId_fkey" FOREIGN KEY ("archivalTransferId") REFERENCES "archival_transfers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "record_disposition_requests" ADD CONSTRAINT "record_disposition_requests_retentionScheduleId_fkey" FOREIGN KEY ("retentionScheduleId") REFERENCES "retention_schedules"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "record_disposition_records" ADD CONSTRAINT "record_disposition_records_dispositionRequestId_fkey" FOREIGN KEY ("dispositionRequestId") REFERENCES "record_disposition_requests"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
