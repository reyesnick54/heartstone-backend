-- CreateEnum
CREATE TYPE "CaseLegalStatus" AS ENUM ('NONE', 'PENDING', 'UNRESOLVED', 'EXTERNAL_STATUS_PENDING');

-- CreateEnum
CREATE TYPE "CasePriority" AS ENUM ('LOW', 'NORMAL', 'HIGH', 'URGENT');

-- CreateEnum
CREATE TYPE "CaseEventPublicVisibility" AS ENUM ('INTERNAL', 'OFFICIAL', 'APPLICANT_VISIBLE');

-- CreateEnum
CREATE TYPE "CaseCommunicationType" AS ENUM ('APPLICANT_MESSAGE', 'DEFICIENCY_NOTICE', 'REQUEST_FOR_INFORMATION', 'STATUS_UPDATE', 'REFERRAL_NOTICE', 'INTERNAL_NOTE', 'EXTERNAL_CORRESPONDENCE', 'SYSTEM_NOTICE');

-- CreateEnum
CREATE TYPE "CaseCommunicationChannel" AS ENUM ('PORTAL', 'EMAIL', 'SMS', 'POSTAL', 'COUNTER', 'SYSTEM');

-- CreateEnum
CREATE TYPE "CaseCommunicationDeliveryStatus" AS ENUM ('DRAFT', 'QUEUED', 'SENT', 'DELIVERED', 'FAILED', 'RECEIVED');

-- CreateEnum
CREATE TYPE "CaseRecipientType" AS ENUM ('APPLICANT', 'OFFICEHOLDER', 'DEPARTMENT', 'EXTERNAL_AUTHORITY', 'INTERNAL', 'SYSTEM');

-- CreateEnum
CREATE TYPE "CaseRecordClassification" AS ENUM ('PUBLIC', 'OFFICIAL', 'INTERNAL', 'RESTRICTED', 'PRIVILEGED');

-- CreateEnum
CREATE TYPE "CaseMilestoneStatus" AS ENUM ('UPCOMING', 'IN_PROGRESS', 'AT_RISK', 'DELAYED', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "CasePublicStatusStage" AS ENUM ('RECEIVED', 'CHECKING_SUBMISSION', 'MORE_INFORMATION_NEEDED', 'UNDER_REVIEW', 'WAITING_ON_OTHER_AUTHORITY', 'PROFESSIONAL_REVIEW', 'INSPECTION', 'DECISION_PENDING', 'COMPLETED', 'CLOSED');

-- CreateEnum
CREATE TYPE "EvidenceStatus" AS ENUM ('RECEIVED', 'VERIFIED', 'ACCEPTED', 'DISPUTED', 'WITHDRAWN', 'SUPERSEDED', 'EXPIRED', 'QUARANTINED');

-- CreateEnum
CREATE TYPE "EvidenceVerificationStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'VERIFIED', 'REJECTED', 'DISPUTED', 'SUPERSEDED');

-- CreateEnum
CREATE TYPE "EvidencePurposeType" AS ENUM ('IDENTITY_VERIFICATION', 'ELIGIBILITY_SUPPORT', 'TECHNICAL_COMPLIANCE', 'PROFESSIONAL_ATTESTATION', 'INSPECTION_RESULT', 'DECISION_SUPPORT', 'COMMUNICATION_RECORD', 'OTHER');

-- CreateEnum
CREATE TYPE "DocumentClassification" AS ENUM ('PUBLIC', 'OFFICIAL', 'INTERNAL', 'RESTRICTED', 'PRIVILEGED', 'LEGALLY_PRIVILEGED');

-- CreateEnum
CREATE TYPE "MasterAdministrativeFileStatus" AS ENUM ('OPEN', 'ACTIVE', 'CLOSED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "MasterAdministrativeFileSectionType" AS ENUM ('INTAKE', 'CORRESPONDENCE', 'EVIDENCE', 'REVIEW', 'INSPECTION', 'DECISION_SUPPORT', 'RETENTION', 'OTHER');

-- CreateEnum
CREATE TYPE "DocumentRecordStatus" AS ENUM ('REGISTERED', 'ACTIVE', 'SUPERSEDED', 'WITHDRAWN', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "DocumentAssociationType" AS ENUM ('CASE', 'APPLICATION', 'EVIDENCE', 'COMMUNICATION', 'REVIEW', 'INSPECTION', 'PACKET', 'OTHER');

-- CreateEnum
CREATE TYPE "EvidencePacketStatus" AS ENUM ('DRAFT', 'ASSEMBLED', 'SEALED', 'TRANSMITTED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "EvidenceCustodyEventType" AS ENUM ('RECEIVED', 'TRANSFERRED', 'SEALED', 'UNSEALED', 'COPIED', 'DESTROYED', 'QUARANTINED', 'RELEASED');

-- CreateEnum
CREATE TYPE "RecordCorrectionStatus" AS ENUM ('DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'APPLIED');

-- CreateEnum
CREATE TYPE "RecordIntegrityEventType" AS ENUM ('HASH_VERIFIED', 'HASH_MISMATCH', 'TAMPER_DETECTED', 'SEAL_APPLIED', 'SEAL_BROKEN', 'CORRECTION_APPLIED');

-- CreateEnum
CREATE TYPE "RecordAccessEventType" AS ENUM ('VIEW', 'DOWNLOAD', 'EXPORT', 'PRINT', 'REDACTED_VIEW', 'DENIED');

-- CreateEnum
CREATE TYPE "RetentionDispositionAction" AS ENUM ('RETAIN', 'REVIEW', 'TRANSFER', 'DESTROY');

-- CreateEnum
CREATE TYPE "RecordDispositionStatus" AS ENUM ('DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'EXECUTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "LegalHoldStatus" AS ENUM ('DRAFT', 'ACTIVE', 'RELEASED', 'SUPERSEDED');

-- CreateEnum
CREATE TYPE "LegalHoldTargetType" AS ENUM ('MASTER_ADMINISTRATIVE_FILE', 'DOCUMENT', 'EVIDENCE', 'PACKET', 'CASE', 'COLLECTION');

-- CreateEnum
CREATE TYPE "PreservationCollectionStatus" AS ENUM ('ACTIVE', 'COMPLETED', 'RELEASED');

-- CreateEnum
CREATE TYPE "ArchivalTransferStatus" AS ENUM ('PENDING', 'IN_TRANSIT', 'RECEIVED', 'REJECTED', 'COMPLETED');

-- CreateEnum
CREATE TYPE "ReviewRecordStatus" AS ENUM ('DRAFT', 'IN_PROGRESS', 'COMPLETED', 'SUPERSEDED');

-- CreateEnum
CREATE TYPE "InspectionRecordStatus" AS ENUM ('SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- AlterEnum
ALTER TYPE "ApplicationStatus" ADD VALUE 'RECEIVED';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "CaseEventType" ADD VALUE 'CASE_OPENED';
ALTER TYPE "CaseEventType" ADD VALUE 'CASE_ASSIGNED';
ALTER TYPE "CaseEventType" ADD VALUE 'COMPLETENESS_STARTED';
ALTER TYPE "CaseEventType" ADD VALUE 'COMPLETENESS_COMPLETED';
ALTER TYPE "CaseEventType" ADD VALUE 'APPLICANT_RESPONSE_RECEIVED';
ALTER TYPE "CaseEventType" ADD VALUE 'REFERRED';
ALTER TYPE "CaseEventType" ADD VALUE 'PROFESSIONAL_REVIEW_REQUESTED';
ALTER TYPE "CaseEventType" ADD VALUE 'INSPECTION_REQUESTED';
ALTER TYPE "CaseEventType" ADD VALUE 'ISSUE_ESCALATED';
ALTER TYPE "CaseEventType" ADD VALUE 'WORKFLOW_PAUSED';
ALTER TYPE "CaseEventType" ADD VALUE 'WORKFLOW_RESUMED';
ALTER TYPE "CaseEventType" ADD VALUE 'DECISION_PENDING';
ALTER TYPE "CaseEventType" ADD VALUE 'WITHDRAWN';
ALTER TYPE "CaseEventType" ADD VALUE 'CLOSED';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "CaseReferralResponseAuthStatus" ADD VALUE 'VERIFIED';
ALTER TYPE "CaseReferralResponseAuthStatus" ADD VALUE 'DISPUTED';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "CaseStatus" ADD VALUE 'OPEN';
ALTER TYPE "CaseStatus" ADD VALUE 'IN_PROGRESS';
ALTER TYPE "CaseStatus" ADD VALUE 'REFERRAL_PENDING';
ALTER TYPE "CaseStatus" ADD VALUE 'PROFESSIONAL_REVIEW';
ALTER TYPE "CaseStatus" ADD VALUE 'INSPECTION';
ALTER TYPE "CaseStatus" ADD VALUE 'SAFE_HALT';
ALTER TYPE "CaseStatus" ADD VALUE 'WITHDRAWN';
ALTER TYPE "CaseStatus" ADD VALUE 'ARCHIVED';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "CaseWorkflowInstanceStatus" ADD VALUE 'NOT_STARTED';
ALTER TYPE "CaseWorkflowInstanceStatus" ADD VALUE 'PAUSED';
ALTER TYPE "CaseWorkflowInstanceStatus" ADD VALUE 'SAFE_HALT';
ALTER TYPE "CaseWorkflowInstanceStatus" ADD VALUE 'CANCELLED';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "CaseWorkflowStepInstanceStatus" ADD VALUE 'IN_PROGRESS';
ALTER TYPE "CaseWorkflowStepInstanceStatus" ADD VALUE 'BLOCKED';

-- AlterTable
ALTER TABLE "case_communications" ADD COLUMN     "caseEventId" UUID,
ADD COLUMN     "channel" "CaseCommunicationChannel" NOT NULL,
ADD COLUMN     "classification" "CaseRecordClassification" NOT NULL DEFAULT 'OFFICIAL',
ADD COLUMN     "communicationType" "CaseCommunicationType" NOT NULL,
ADD COLUMN     "deliveryStatus" "CaseCommunicationDeliveryStatus" NOT NULL DEFAULT 'DRAFT',
ADD COLUMN     "publicVisibility" "CaseEventPublicVisibility" NOT NULL DEFAULT 'INTERNAL',
ADD COLUMN     "receivedAt" TIMESTAMP(3),
ADD COLUMN     "recipientReference" TEXT,
ADD COLUMN     "recipientType" "CaseRecipientType" NOT NULL,
ADD COLUMN     "senderIdentityId" UUID,
ADD COLUMN     "senderOfficeholderId" UUID,
ADD COLUMN     "sentAt" TIMESTAMP(3),
ADD COLUMN     "templateReference" TEXT,
ADD COLUMN     "templateVersion" TEXT,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ALTER COLUMN "visibility" DROP NOT NULL,
ALTER COLUMN "visibility" DROP DEFAULT,
ALTER COLUMN "subject" DROP NOT NULL;

-- AlterTable
ALTER TABLE "case_events" ADD COLUMN     "correlationId" TEXT,
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "departmentId" UUID,
ADD COLUMN     "institutionId" UUID,
ADD COLUMN     "metadata" JSONB NOT NULL DEFAULT '{}',
ADD COLUMN     "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "officeholderId" UUID,
ADD COLUMN     "publicVisibility" "CaseEventPublicVisibility" NOT NULL DEFAULT 'INTERNAL',
ADD COLUMN     "stepInstanceId" UUID,
ADD COLUMN     "workflowInstanceId" UUID;

-- AlterTable
ALTER TABLE "case_milestones" ADD COLUMN     "actualDate" TIMESTAMP(3),
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "dependencyReference" TEXT,
ADD COLUMN     "name" TEXT,
ADD COLUMN     "responsiblePartyRef" TEXT,
ADD COLUMN     "sourceSlaReference" TEXT,
ADD COLUMN     "status" "CaseMilestoneStatus",
ADD COLUMN     "targetDate" TIMESTAMP(3),
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ALTER COLUMN "milestoneType" DROP NOT NULL,
ALTER COLUMN "label" DROP NOT NULL,
ALTER COLUMN "reachedAt" DROP NOT NULL,
ALTER COLUMN "reachedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "case_public_status_projections" ADD COLUMN     "applicantDisclaimer" TEXT,
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "currentMilestoneId" UUID,
ADD COLUMN     "lastDerivedAt" TIMESTAMP(3),
ADD COLUMN     "projectionVersion" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "publicStage" "CasePublicStatusStage",
ADD COLUMN     "publicStageDetail" TEXT,
ADD COLUMN     "publicStageLabel" TEXT,
ADD COLUMN     "sourceEventId" UUID,
ADD COLUMN     "sourceLegalStatus" "CaseLegalStatus",
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ALTER COLUMN "publicStatusLabel" DROP NOT NULL,
ALTER COLUMN "lastUpdatedAt" DROP NOT NULL,
ALTER COLUMN "lastUpdatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "case_workflow_instances" ADD COLUMN     "currentStageKey" TEXT,
ADD COLUMN     "currentStageLabel" TEXT,
ADD COLUMN     "pausedAt" TIMESTAMP(3),
ADD COLUMN     "safeHaltActive" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "safeHaltPublicLabel" TEXT;

-- AlterTable
ALTER TABLE "cases" ADD COLUMN     "applicantIdentityId" UUID NOT NULL,
ADD COLUMN     "closedAt" TIMESTAMP(3),
ADD COLUMN     "currentCaseManagerOfficeholderId" UUID,
ADD COLUMN     "documentRegisterReference" TEXT,
ADD COLUMN     "evidencePacketReference" TEXT,
ADD COLUMN     "governmentServiceId" UUID NOT NULL,
ADD COLUMN     "legalStatus" "CaseLegalStatus" NOT NULL DEFAULT 'NONE',
ADD COLUMN     "masterAdministrativeFileReference" TEXT,
ADD COLUMN     "openedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "priority" "CasePriority" NOT NULL DEFAULT 'NORMAL',
ADD COLUMN     "recordsClassificationReference" TEXT,
ADD COLUMN     "responsibleDepartmentId" UUID NOT NULL,
ADD COLUMN     "responsibleInstitutionId" UUID NOT NULL,
ADD COLUMN     "retentionLegalHoldReference" TEXT;

-- DropEnum
DROP TYPE "ChecklistItemReviewStatus";

-- CreateTable
CREATE TABLE "case_communication_outbox" (
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

-- CreateTable
CREATE TABLE "master_administrative_files" (
    "id" UUID NOT NULL,
    "fileReference" TEXT NOT NULL,
    "caseId" UUID,
    "institutionId" UUID NOT NULL,
    "departmentId" UUID,
    "title" TEXT NOT NULL,
    "status" "MasterAdministrativeFileStatus" NOT NULL DEFAULT 'OPEN',
    "classification" "DocumentClassification" NOT NULL DEFAULT 'OFFICIAL',
    "openedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "master_administrative_files_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "master_administrative_file_sections" (
    "id" UUID NOT NULL,
    "masterAdministrativeFileId" UUID NOT NULL,
    "sectionKey" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "sectionType" "MasterAdministrativeFileSectionType" NOT NULL DEFAULT 'OTHER',
    "displayOrder" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "master_administrative_file_sections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "document_records" (
    "id" UUID NOT NULL,
    "documentReference" TEXT NOT NULL,
    "masterAdministrativeFileId" UUID,
    "sectionId" UUID,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "classification" "DocumentClassification" NOT NULL DEFAULT 'OFFICIAL',
    "status" "DocumentRecordStatus" NOT NULL DEFAULT 'REGISTERED',
    "registeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "document_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "document_versions" (
    "id" UUID NOT NULL,
    "documentRecordId" UUID NOT NULL,
    "versionNumber" INTEGER NOT NULL,
    "contentHash" TEXT NOT NULL,
    "storageReference" TEXT NOT NULL,
    "mimeType" TEXT,
    "byteSize" INTEGER,
    "registeredByIdentityId" UUID,
    "registeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "supersededAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "document_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "document_associations" (
    "id" UUID NOT NULL,
    "documentRecordId" UUID NOT NULL,
    "documentVersionId" UUID,
    "associationType" "DocumentAssociationType" NOT NULL,
    "targetReference" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "document_associations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "evidence_records" (
    "id" UUID NOT NULL,
    "evidenceReference" TEXT NOT NULL,
    "masterAdministrativeFileId" UUID,
    "sectionId" UUID,
    "documentRecordId" UUID,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" "EvidenceStatus" NOT NULL DEFAULT 'RECEIVED',
    "classification" "DocumentClassification" NOT NULL DEFAULT 'OFFICIAL',
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "evidence_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "evidence_verifications" (
    "id" UUID NOT NULL,
    "evidenceRecordId" UUID NOT NULL,
    "status" "EvidenceVerificationStatus" NOT NULL DEFAULT 'PENDING',
    "verifierIdentityId" UUID,
    "verifierOfficeholderId" UUID,
    "methodReference" TEXT,
    "findings" TEXT,
    "verifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "evidence_verifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "evidence_requirement_links" (
    "id" UUID NOT NULL,
    "evidenceRecordId" UUID NOT NULL,
    "requirementCode" TEXT NOT NULL,
    "requirementLabel" TEXT,
    "serviceVersionRef" TEXT,
    "satisfied" BOOLEAN NOT NULL DEFAULT false,
    "linkedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "evidence_requirement_links_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "evidence_purpose_acceptances" (
    "id" UUID NOT NULL,
    "evidenceRecordId" UUID NOT NULL,
    "purposeType" "EvidencePurposeType" NOT NULL,
    "acceptedByIdentityId" UUID,
    "acceptedByOfficeholderId" UUID,
    "acceptedAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "evidence_purpose_acceptances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "evidence_quality_assessments" (
    "id" UUID NOT NULL,
    "evidenceRecordId" UUID NOT NULL,
    "assessorIdentityId" UUID,
    "qualityScore" INTEGER,
    "assessmentNotes" TEXT,
    "assessedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "evidence_quality_assessments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "departmental_review_records" (
    "id" UUID NOT NULL,
    "reviewReference" TEXT NOT NULL,
    "masterAdministrativeFileId" UUID,
    "departmentId" UUID NOT NULL,
    "reviewerOfficeholderId" UUID,
    "status" "ReviewRecordStatus" NOT NULL DEFAULT 'DRAFT',
    "findings" TEXT,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "departmental_review_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "government_communication_records" (
    "id" UUID NOT NULL,
    "communicationReference" TEXT NOT NULL,
    "masterAdministrativeFileId" UUID,
    "caseCommunicationId" UUID,
    "channel" "CaseCommunicationChannel" NOT NULL,
    "subject" TEXT,
    "body" TEXT NOT NULL,
    "classification" "DocumentClassification" NOT NULL DEFAULT 'OFFICIAL',
    "sentAt" TIMESTAMP(3),
    "receivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "government_communication_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "professional_review_records" (
    "id" UUID NOT NULL,
    "reviewReference" TEXT NOT NULL,
    "masterAdministrativeFileId" UUID,
    "externalAuthorityId" UUID,
    "reviewerReference" TEXT,
    "status" "ReviewRecordStatus" NOT NULL DEFAULT 'DRAFT',
    "findings" TEXT,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "professional_review_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inspection_records" (
    "id" UUID NOT NULL,
    "inspectionReference" TEXT NOT NULL,
    "masterAdministrativeFileId" UUID,
    "inspectorOfficeholderId" UUID,
    "status" "InspectionRecordStatus" NOT NULL DEFAULT 'SCHEDULED',
    "scheduledAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "findings" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "inspection_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inspection_evidence_items" (
    "id" UUID NOT NULL,
    "inspectionRecordId" UUID NOT NULL,
    "evidenceRecordId" UUID NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "inspection_evidence_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "evidence_custody_events" (
    "id" UUID NOT NULL,
    "evidenceRecordId" UUID NOT NULL,
    "eventType" "EvidenceCustodyEventType" NOT NULL,
    "actorIdentityId" UUID,
    "actorOfficeholderId" UUID,
    "fromLocationRef" TEXT,
    "toLocationRef" TEXT,
    "notes" TEXT,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "evidence_custody_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "evidence_packets" (
    "id" UUID NOT NULL,
    "packetReference" TEXT NOT NULL,
    "masterAdministrativeFileId" UUID,
    "title" TEXT NOT NULL,
    "status" "EvidencePacketStatus" NOT NULL DEFAULT 'DRAFT',
    "sealedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "evidence_packets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "evidence_packet_versions" (
    "id" UUID NOT NULL,
    "evidencePacketId" UUID NOT NULL,
    "versionNumber" INTEGER NOT NULL,
    "manifestHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "evidence_packet_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "evidence_packet_items" (
    "id" UUID NOT NULL,
    "evidencePacketVersionId" UUID NOT NULL,
    "evidenceRecordId" UUID NOT NULL,
    "sequenceNumber" INTEGER NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "evidence_packet_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "evidence_packet_manifests" (
    "id" UUID NOT NULL,
    "evidencePacketVersionId" UUID NOT NULL,
    "manifestReference" TEXT NOT NULL,
    "manifestPayload" JSONB NOT NULL DEFAULT '{}',
    "contentHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "evidence_packet_manifests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "record_corrections" (
    "id" UUID NOT NULL,
    "correctionReference" TEXT NOT NULL,
    "targetRecordType" TEXT NOT NULL,
    "targetRecordId" UUID NOT NULL,
    "status" "RecordCorrectionStatus" NOT NULL DEFAULT 'DRAFT',
    "reason" TEXT NOT NULL,
    "correctionPayload" JSONB NOT NULL DEFAULT '{}',
    "requestedByIdentityId" UUID,
    "approvedByIdentityId" UUID,
    "appliedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "record_corrections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "record_integrity_events" (
    "id" UUID NOT NULL,
    "targetRecordType" TEXT NOT NULL,
    "targetRecordId" UUID NOT NULL,
    "eventType" "RecordIntegrityEventType" NOT NULL,
    "contentHash" TEXT,
    "details" JSONB NOT NULL DEFAULT '{}',
    "detectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "record_integrity_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "record_access_events" (
    "id" UUID NOT NULL,
    "targetRecordType" TEXT NOT NULL,
    "targetRecordId" UUID NOT NULL,
    "eventType" "RecordAccessEventType" NOT NULL,
    "actorIdentityId" UUID,
    "actorOfficeholderId" UUID,
    "accessGranted" BOOLEAN NOT NULL DEFAULT true,
    "reason" TEXT,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "record_access_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "retention_schedules" (
    "id" UUID NOT NULL,
    "scheduleCode" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "institutionId" UUID,
    "effectiveFrom" TIMESTAMP(3),
    "effectiveUntil" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "retention_schedules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "retention_rules" (
    "id" UUID NOT NULL,
    "retentionScheduleId" UUID NOT NULL,
    "ruleCode" TEXT NOT NULL,
    "recordCategory" TEXT NOT NULL,
    "retentionPeriodDays" INTEGER,
    "dispositionAction" "RetentionDispositionAction" NOT NULL DEFAULT 'RETAIN',
    "legalBasis" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "retention_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "record_retention_assignments" (
    "id" UUID NOT NULL,
    "retentionRuleId" UUID NOT NULL,
    "masterAdministrativeFileId" UUID,
    "documentRecordId" UUID,
    "evidenceRecordId" UUID,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewDueAt" TIMESTAMP(3),
    "dispositionDueAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "record_retention_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "legal_holds" (
    "id" UUID NOT NULL,
    "holdReference" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "status" "LegalHoldStatus" NOT NULL DEFAULT 'DRAFT',
    "reason" TEXT NOT NULL,
    "issuedByIdentityId" UUID,
    "effectiveFrom" TIMESTAMP(3),
    "releasedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "legal_holds_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "legal_hold_targets" (
    "id" UUID NOT NULL,
    "legalHoldId" UUID NOT NULL,
    "targetType" "LegalHoldTargetType" NOT NULL,
    "masterAdministrativeFileId" UUID,
    "documentRecordId" UUID,
    "evidenceRecordId" UUID,
    "evidencePacketId" UUID,
    "targetReference" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "legal_hold_targets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "preservation_collections" (
    "id" UUID NOT NULL,
    "legalHoldId" UUID NOT NULL,
    "collectionReference" TEXT NOT NULL,
    "status" "PreservationCollectionStatus" NOT NULL DEFAULT 'ACTIVE',
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "preservation_collections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "archival_transfers" (
    "id" UUID NOT NULL,
    "transferReference" TEXT NOT NULL,
    "preservationCollectionId" UUID,
    "status" "ArchivalTransferStatus" NOT NULL DEFAULT 'PENDING',
    "sourceLocationRef" TEXT,
    "destinationLocationRef" TEXT,
    "transferredAt" TIMESTAMP(3),
    "receivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "archival_transfers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "record_disposition_requests" (
    "id" UUID NOT NULL,
    "requestReference" TEXT NOT NULL,
    "recordRetentionAssignmentId" UUID NOT NULL,
    "status" "RecordDispositionStatus" NOT NULL DEFAULT 'DRAFT',
    "requestedAction" "RetentionDispositionAction" NOT NULL,
    "reason" TEXT NOT NULL,
    "requestedByIdentityId" UUID,
    "approvedByIdentityId" UUID,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "approvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "record_disposition_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "record_disposition_records" (
    "id" UUID NOT NULL,
    "recordDispositionRequestId" UUID NOT NULL,
    "dispositionReference" TEXT NOT NULL,
    "status" "RecordDispositionStatus" NOT NULL DEFAULT 'EXECUTED',
    "executedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "executedByIdentityId" UUID,
    "executionNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "record_disposition_records_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "case_communication_outbox_communicationId_idx" ON "case_communication_outbox"("communicationId");

-- CreateIndex
CREATE INDEX "case_communication_outbox_status_idx" ON "case_communication_outbox"("status");

-- CreateIndex
CREATE UNIQUE INDEX "master_administrative_files_fileReference_key" ON "master_administrative_files"("fileReference");

-- CreateIndex
CREATE UNIQUE INDEX "master_administrative_files_caseId_key" ON "master_administrative_files"("caseId");

-- CreateIndex
CREATE INDEX "master_administrative_files_institutionId_idx" ON "master_administrative_files"("institutionId");

-- CreateIndex
CREATE INDEX "master_administrative_files_departmentId_idx" ON "master_administrative_files"("departmentId");

-- CreateIndex
CREATE INDEX "master_administrative_files_status_idx" ON "master_administrative_files"("status");

-- CreateIndex
CREATE INDEX "master_administrative_file_sections_masterAdministrativeFil_idx" ON "master_administrative_file_sections"("masterAdministrativeFileId");

-- CreateIndex
CREATE UNIQUE INDEX "master_administrative_file_sections_masterAdministrativeFil_key" ON "master_administrative_file_sections"("masterAdministrativeFileId", "sectionKey");

-- CreateIndex
CREATE UNIQUE INDEX "document_records_documentReference_key" ON "document_records"("documentReference");

-- CreateIndex
CREATE INDEX "document_records_masterAdministrativeFileId_idx" ON "document_records"("masterAdministrativeFileId");

-- CreateIndex
CREATE INDEX "document_records_sectionId_idx" ON "document_records"("sectionId");

-- CreateIndex
CREATE INDEX "document_records_status_idx" ON "document_records"("status");

-- CreateIndex
CREATE INDEX "document_versions_documentRecordId_idx" ON "document_versions"("documentRecordId");

-- CreateIndex
CREATE UNIQUE INDEX "document_versions_documentRecordId_versionNumber_key" ON "document_versions"("documentRecordId", "versionNumber");

-- CreateIndex
CREATE INDEX "document_associations_documentRecordId_idx" ON "document_associations"("documentRecordId");

-- CreateIndex
CREATE INDEX "document_associations_documentVersionId_idx" ON "document_associations"("documentVersionId");

-- CreateIndex
CREATE INDEX "document_associations_associationType_idx" ON "document_associations"("associationType");

-- CreateIndex
CREATE UNIQUE INDEX "evidence_records_evidenceReference_key" ON "evidence_records"("evidenceReference");

-- CreateIndex
CREATE INDEX "evidence_records_masterAdministrativeFileId_idx" ON "evidence_records"("masterAdministrativeFileId");

-- CreateIndex
CREATE INDEX "evidence_records_sectionId_idx" ON "evidence_records"("sectionId");

-- CreateIndex
CREATE INDEX "evidence_records_documentRecordId_idx" ON "evidence_records"("documentRecordId");

-- CreateIndex
CREATE INDEX "evidence_records_status_idx" ON "evidence_records"("status");

-- CreateIndex
CREATE INDEX "evidence_verifications_evidenceRecordId_idx" ON "evidence_verifications"("evidenceRecordId");

-- CreateIndex
CREATE INDEX "evidence_verifications_status_idx" ON "evidence_verifications"("status");

-- CreateIndex
CREATE INDEX "evidence_requirement_links_evidenceRecordId_idx" ON "evidence_requirement_links"("evidenceRecordId");

-- CreateIndex
CREATE INDEX "evidence_requirement_links_requirementCode_idx" ON "evidence_requirement_links"("requirementCode");

-- CreateIndex
CREATE INDEX "evidence_purpose_acceptances_evidenceRecordId_idx" ON "evidence_purpose_acceptances"("evidenceRecordId");

-- CreateIndex
CREATE INDEX "evidence_purpose_acceptances_purposeType_idx" ON "evidence_purpose_acceptances"("purposeType");

-- CreateIndex
CREATE INDEX "evidence_quality_assessments_evidenceRecordId_idx" ON "evidence_quality_assessments"("evidenceRecordId");

-- CreateIndex
CREATE UNIQUE INDEX "departmental_review_records_reviewReference_key" ON "departmental_review_records"("reviewReference");

-- CreateIndex
CREATE INDEX "departmental_review_records_departmentId_idx" ON "departmental_review_records"("departmentId");

-- CreateIndex
CREATE INDEX "departmental_review_records_status_idx" ON "departmental_review_records"("status");

-- CreateIndex
CREATE UNIQUE INDEX "government_communication_records_communicationReference_key" ON "government_communication_records"("communicationReference");

-- CreateIndex
CREATE INDEX "government_communication_records_masterAdministrativeFileId_idx" ON "government_communication_records"("masterAdministrativeFileId");

-- CreateIndex
CREATE UNIQUE INDEX "professional_review_records_reviewReference_key" ON "professional_review_records"("reviewReference");

-- CreateIndex
CREATE INDEX "professional_review_records_externalAuthorityId_idx" ON "professional_review_records"("externalAuthorityId");

-- CreateIndex
CREATE INDEX "professional_review_records_status_idx" ON "professional_review_records"("status");

-- CreateIndex
CREATE UNIQUE INDEX "inspection_records_inspectionReference_key" ON "inspection_records"("inspectionReference");

-- CreateIndex
CREATE INDEX "inspection_records_status_idx" ON "inspection_records"("status");

-- CreateIndex
CREATE INDEX "inspection_evidence_items_inspectionRecordId_idx" ON "inspection_evidence_items"("inspectionRecordId");

-- CreateIndex
CREATE INDEX "inspection_evidence_items_evidenceRecordId_idx" ON "inspection_evidence_items"("evidenceRecordId");

-- CreateIndex
CREATE UNIQUE INDEX "inspection_evidence_items_inspectionRecordId_evidenceRecord_key" ON "inspection_evidence_items"("inspectionRecordId", "evidenceRecordId");

-- CreateIndex
CREATE INDEX "evidence_custody_events_evidenceRecordId_idx" ON "evidence_custody_events"("evidenceRecordId");

-- CreateIndex
CREATE INDEX "evidence_custody_events_occurredAt_idx" ON "evidence_custody_events"("occurredAt");

-- CreateIndex
CREATE UNIQUE INDEX "evidence_packets_packetReference_key" ON "evidence_packets"("packetReference");

-- CreateIndex
CREATE INDEX "evidence_packets_masterAdministrativeFileId_idx" ON "evidence_packets"("masterAdministrativeFileId");

-- CreateIndex
CREATE INDEX "evidence_packets_status_idx" ON "evidence_packets"("status");

-- CreateIndex
CREATE INDEX "evidence_packet_versions_evidencePacketId_idx" ON "evidence_packet_versions"("evidencePacketId");

-- CreateIndex
CREATE UNIQUE INDEX "evidence_packet_versions_evidencePacketId_versionNumber_key" ON "evidence_packet_versions"("evidencePacketId", "versionNumber");

-- CreateIndex
CREATE INDEX "evidence_packet_items_evidencePacketVersionId_idx" ON "evidence_packet_items"("evidencePacketVersionId");

-- CreateIndex
CREATE INDEX "evidence_packet_items_evidenceRecordId_idx" ON "evidence_packet_items"("evidenceRecordId");

-- CreateIndex
CREATE UNIQUE INDEX "evidence_packet_items_evidencePacketVersionId_sequenceNumbe_key" ON "evidence_packet_items"("evidencePacketVersionId", "sequenceNumber");

-- CreateIndex
CREATE UNIQUE INDEX "evidence_packet_manifests_evidencePacketVersionId_key" ON "evidence_packet_manifests"("evidencePacketVersionId");

-- CreateIndex
CREATE UNIQUE INDEX "evidence_packet_manifests_manifestReference_key" ON "evidence_packet_manifests"("manifestReference");

-- CreateIndex
CREATE UNIQUE INDEX "record_corrections_correctionReference_key" ON "record_corrections"("correctionReference");

-- CreateIndex
CREATE INDEX "record_corrections_targetRecordType_targetRecordId_idx" ON "record_corrections"("targetRecordType", "targetRecordId");

-- CreateIndex
CREATE INDEX "record_corrections_status_idx" ON "record_corrections"("status");

-- CreateIndex
CREATE INDEX "record_integrity_events_targetRecordType_targetRecordId_idx" ON "record_integrity_events"("targetRecordType", "targetRecordId");

-- CreateIndex
CREATE INDEX "record_integrity_events_eventType_idx" ON "record_integrity_events"("eventType");

-- CreateIndex
CREATE INDEX "record_access_events_targetRecordType_targetRecordId_idx" ON "record_access_events"("targetRecordType", "targetRecordId");

-- CreateIndex
CREATE INDEX "record_access_events_actorIdentityId_idx" ON "record_access_events"("actorIdentityId");

-- CreateIndex
CREATE INDEX "record_access_events_occurredAt_idx" ON "record_access_events"("occurredAt");

-- CreateIndex
CREATE UNIQUE INDEX "retention_schedules_scheduleCode_key" ON "retention_schedules"("scheduleCode");

-- CreateIndex
CREATE INDEX "retention_schedules_institutionId_idx" ON "retention_schedules"("institutionId");

-- CreateIndex
CREATE INDEX "retention_rules_retentionScheduleId_idx" ON "retention_rules"("retentionScheduleId");

-- CreateIndex
CREATE UNIQUE INDEX "retention_rules_retentionScheduleId_ruleCode_key" ON "retention_rules"("retentionScheduleId", "ruleCode");

-- CreateIndex
CREATE INDEX "record_retention_assignments_retentionRuleId_idx" ON "record_retention_assignments"("retentionRuleId");

-- CreateIndex
CREATE INDEX "record_retention_assignments_masterAdministrativeFileId_idx" ON "record_retention_assignments"("masterAdministrativeFileId");

-- CreateIndex
CREATE INDEX "record_retention_assignments_documentRecordId_idx" ON "record_retention_assignments"("documentRecordId");

-- CreateIndex
CREATE INDEX "record_retention_assignments_evidenceRecordId_idx" ON "record_retention_assignments"("evidenceRecordId");

-- CreateIndex
CREATE UNIQUE INDEX "legal_holds_holdReference_key" ON "legal_holds"("holdReference");

-- CreateIndex
CREATE INDEX "legal_holds_status_idx" ON "legal_holds"("status");

-- CreateIndex
CREATE INDEX "legal_hold_targets_legalHoldId_idx" ON "legal_hold_targets"("legalHoldId");

-- CreateIndex
CREATE INDEX "legal_hold_targets_targetType_idx" ON "legal_hold_targets"("targetType");

-- CreateIndex
CREATE UNIQUE INDEX "preservation_collections_collectionReference_key" ON "preservation_collections"("collectionReference");

-- CreateIndex
CREATE INDEX "preservation_collections_legalHoldId_idx" ON "preservation_collections"("legalHoldId");

-- CreateIndex
CREATE INDEX "preservation_collections_status_idx" ON "preservation_collections"("status");

-- CreateIndex
CREATE UNIQUE INDEX "archival_transfers_transferReference_key" ON "archival_transfers"("transferReference");

-- CreateIndex
CREATE INDEX "archival_transfers_preservationCollectionId_idx" ON "archival_transfers"("preservationCollectionId");

-- CreateIndex
CREATE INDEX "archival_transfers_status_idx" ON "archival_transfers"("status");

-- CreateIndex
CREATE UNIQUE INDEX "record_disposition_requests_requestReference_key" ON "record_disposition_requests"("requestReference");

-- CreateIndex
CREATE INDEX "record_disposition_requests_recordRetentionAssignmentId_idx" ON "record_disposition_requests"("recordRetentionAssignmentId");

-- CreateIndex
CREATE INDEX "record_disposition_requests_status_idx" ON "record_disposition_requests"("status");

-- CreateIndex
CREATE UNIQUE INDEX "record_disposition_records_recordDispositionRequestId_key" ON "record_disposition_records"("recordDispositionRequestId");

-- CreateIndex
CREATE UNIQUE INDEX "record_disposition_records_dispositionReference_key" ON "record_disposition_records"("dispositionReference");

-- CreateIndex
CREATE INDEX "case_communications_caseId_createdAt_idx" ON "case_communications"("caseId", "createdAt");

-- CreateIndex
CREATE INDEX "case_communications_communicationType_idx" ON "case_communications"("communicationType");

-- CreateIndex
CREATE INDEX "case_communications_publicVisibility_idx" ON "case_communications"("publicVisibility");

-- CreateIndex
CREATE INDEX "case_events_caseId_occurredAt_idx" ON "case_events"("caseId", "occurredAt");

-- CreateIndex
CREATE INDEX "case_events_publicVisibility_idx" ON "case_events"("publicVisibility");

-- CreateIndex
CREATE INDEX "case_events_correlationId_idx" ON "case_events"("correlationId");

-- CreateIndex
CREATE INDEX "case_milestones_status_idx" ON "case_milestones"("status");

-- CreateIndex
CREATE INDEX "case_public_status_projections_publicStage_idx" ON "case_public_status_projections"("publicStage");

-- CreateIndex
CREATE INDEX "cases_applicantIdentityId_idx" ON "cases"("applicantIdentityId");

-- CreateIndex
CREATE INDEX "cases_governmentServiceId_idx" ON "cases"("governmentServiceId");

-- CreateIndex
CREATE INDEX "cases_responsibleDepartmentId_idx" ON "cases"("responsibleDepartmentId");

-- CreateIndex
CREATE INDEX "cases_currentCaseManagerOfficeholderId_idx" ON "cases"("currentCaseManagerOfficeholderId");

-- AddForeignKey
ALTER TABLE "cases" ADD CONSTRAINT "cases_applicantIdentityId_fkey" FOREIGN KEY ("applicantIdentityId") REFERENCES "identities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cases" ADD CONSTRAINT "cases_governmentServiceId_fkey" FOREIGN KEY ("governmentServiceId") REFERENCES "government_services"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cases" ADD CONSTRAINT "cases_responsibleInstitutionId_fkey" FOREIGN KEY ("responsibleInstitutionId") REFERENCES "institutions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cases" ADD CONSTRAINT "cases_responsibleDepartmentId_fkey" FOREIGN KEY ("responsibleDepartmentId") REFERENCES "departments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cases" ADD CONSTRAINT "cases_currentCaseManagerOfficeholderId_fkey" FOREIGN KEY ("currentCaseManagerOfficeholderId") REFERENCES "officeholders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "case_events" ADD CONSTRAINT "case_events_actorIdentityId_fkey" FOREIGN KEY ("actorIdentityId") REFERENCES "identities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "case_events" ADD CONSTRAINT "case_events_officeholderId_fkey" FOREIGN KEY ("officeholderId") REFERENCES "officeholders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "case_events" ADD CONSTRAINT "case_events_workflowInstanceId_fkey" FOREIGN KEY ("workflowInstanceId") REFERENCES "case_workflow_instances"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "case_events" ADD CONSTRAINT "case_events_stepInstanceId_fkey" FOREIGN KEY ("stepInstanceId") REFERENCES "case_workflow_step_instances"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "case_communications" ADD CONSTRAINT "case_communications_senderIdentityId_fkey" FOREIGN KEY ("senderIdentityId") REFERENCES "identities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "case_communications" ADD CONSTRAINT "case_communications_senderOfficeholderId_fkey" FOREIGN KEY ("senderOfficeholderId") REFERENCES "officeholders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "case_communications" ADD CONSTRAINT "case_communications_caseEventId_fkey" FOREIGN KEY ("caseEventId") REFERENCES "case_events"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "case_communication_outbox" ADD CONSTRAINT "case_communication_outbox_communicationId_fkey" FOREIGN KEY ("communicationId") REFERENCES "case_communications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "case_public_status_projections" ADD CONSTRAINT "case_public_status_projections_currentMilestoneId_fkey" FOREIGN KEY ("currentMilestoneId") REFERENCES "case_milestones"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "case_public_status_projections" ADD CONSTRAINT "case_public_status_projections_sourceEventId_fkey" FOREIGN KEY ("sourceEventId") REFERENCES "case_events"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "master_administrative_files" ADD CONSTRAINT "master_administrative_files_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "cases"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "master_administrative_files" ADD CONSTRAINT "master_administrative_files_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "institutions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "master_administrative_files" ADD CONSTRAINT "master_administrative_files_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "master_administrative_file_sections" ADD CONSTRAINT "master_administrative_file_sections_masterAdministrativeFi_fkey" FOREIGN KEY ("masterAdministrativeFileId") REFERENCES "master_administrative_files"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_records" ADD CONSTRAINT "document_records_masterAdministrativeFileId_fkey" FOREIGN KEY ("masterAdministrativeFileId") REFERENCES "master_administrative_files"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_records" ADD CONSTRAINT "document_records_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "master_administrative_file_sections"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_versions" ADD CONSTRAINT "document_versions_documentRecordId_fkey" FOREIGN KEY ("documentRecordId") REFERENCES "document_records"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_associations" ADD CONSTRAINT "document_associations_documentRecordId_fkey" FOREIGN KEY ("documentRecordId") REFERENCES "document_records"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_associations" ADD CONSTRAINT "document_associations_documentVersionId_fkey" FOREIGN KEY ("documentVersionId") REFERENCES "document_versions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evidence_records" ADD CONSTRAINT "evidence_records_masterAdministrativeFileId_fkey" FOREIGN KEY ("masterAdministrativeFileId") REFERENCES "master_administrative_files"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evidence_records" ADD CONSTRAINT "evidence_records_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "master_administrative_file_sections"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evidence_records" ADD CONSTRAINT "evidence_records_documentRecordId_fkey" FOREIGN KEY ("documentRecordId") REFERENCES "document_records"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evidence_verifications" ADD CONSTRAINT "evidence_verifications_evidenceRecordId_fkey" FOREIGN KEY ("evidenceRecordId") REFERENCES "evidence_records"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evidence_requirement_links" ADD CONSTRAINT "evidence_requirement_links_evidenceRecordId_fkey" FOREIGN KEY ("evidenceRecordId") REFERENCES "evidence_records"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evidence_purpose_acceptances" ADD CONSTRAINT "evidence_purpose_acceptances_evidenceRecordId_fkey" FOREIGN KEY ("evidenceRecordId") REFERENCES "evidence_records"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evidence_quality_assessments" ADD CONSTRAINT "evidence_quality_assessments_evidenceRecordId_fkey" FOREIGN KEY ("evidenceRecordId") REFERENCES "evidence_records"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "departmental_review_records" ADD CONSTRAINT "departmental_review_records_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "departments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "professional_review_records" ADD CONSTRAINT "professional_review_records_externalAuthorityId_fkey" FOREIGN KEY ("externalAuthorityId") REFERENCES "external_authorities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inspection_evidence_items" ADD CONSTRAINT "inspection_evidence_items_inspectionRecordId_fkey" FOREIGN KEY ("inspectionRecordId") REFERENCES "inspection_records"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inspection_evidence_items" ADD CONSTRAINT "inspection_evidence_items_evidenceRecordId_fkey" FOREIGN KEY ("evidenceRecordId") REFERENCES "evidence_records"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evidence_custody_events" ADD CONSTRAINT "evidence_custody_events_evidenceRecordId_fkey" FOREIGN KEY ("evidenceRecordId") REFERENCES "evidence_records"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evidence_packets" ADD CONSTRAINT "evidence_packets_masterAdministrativeFileId_fkey" FOREIGN KEY ("masterAdministrativeFileId") REFERENCES "master_administrative_files"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evidence_packet_versions" ADD CONSTRAINT "evidence_packet_versions_evidencePacketId_fkey" FOREIGN KEY ("evidencePacketId") REFERENCES "evidence_packets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evidence_packet_items" ADD CONSTRAINT "evidence_packet_items_evidencePacketVersionId_fkey" FOREIGN KEY ("evidencePacketVersionId") REFERENCES "evidence_packet_versions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evidence_packet_items" ADD CONSTRAINT "evidence_packet_items_evidenceRecordId_fkey" FOREIGN KEY ("evidenceRecordId") REFERENCES "evidence_records"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evidence_packet_manifests" ADD CONSTRAINT "evidence_packet_manifests_evidencePacketVersionId_fkey" FOREIGN KEY ("evidencePacketVersionId") REFERENCES "evidence_packet_versions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "retention_schedules" ADD CONSTRAINT "retention_schedules_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "institutions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "retention_rules" ADD CONSTRAINT "retention_rules_retentionScheduleId_fkey" FOREIGN KEY ("retentionScheduleId") REFERENCES "retention_schedules"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "record_retention_assignments" ADD CONSTRAINT "record_retention_assignments_retentionRuleId_fkey" FOREIGN KEY ("retentionRuleId") REFERENCES "retention_rules"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "record_retention_assignments" ADD CONSTRAINT "record_retention_assignments_masterAdministrativeFileId_fkey" FOREIGN KEY ("masterAdministrativeFileId") REFERENCES "master_administrative_files"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "record_retention_assignments" ADD CONSTRAINT "record_retention_assignments_documentRecordId_fkey" FOREIGN KEY ("documentRecordId") REFERENCES "document_records"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "record_retention_assignments" ADD CONSTRAINT "record_retention_assignments_evidenceRecordId_fkey" FOREIGN KEY ("evidenceRecordId") REFERENCES "evidence_records"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "legal_hold_targets" ADD CONSTRAINT "legal_hold_targets_legalHoldId_fkey" FOREIGN KEY ("legalHoldId") REFERENCES "legal_holds"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "legal_hold_targets" ADD CONSTRAINT "legal_hold_targets_masterAdministrativeFileId_fkey" FOREIGN KEY ("masterAdministrativeFileId") REFERENCES "master_administrative_files"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "legal_hold_targets" ADD CONSTRAINT "legal_hold_targets_documentRecordId_fkey" FOREIGN KEY ("documentRecordId") REFERENCES "document_records"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "legal_hold_targets" ADD CONSTRAINT "legal_hold_targets_evidenceRecordId_fkey" FOREIGN KEY ("evidenceRecordId") REFERENCES "evidence_records"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "legal_hold_targets" ADD CONSTRAINT "legal_hold_targets_evidencePacketId_fkey" FOREIGN KEY ("evidencePacketId") REFERENCES "evidence_packets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "preservation_collections" ADD CONSTRAINT "preservation_collections_legalHoldId_fkey" FOREIGN KEY ("legalHoldId") REFERENCES "legal_holds"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "archival_transfers" ADD CONSTRAINT "archival_transfers_preservationCollectionId_fkey" FOREIGN KEY ("preservationCollectionId") REFERENCES "preservation_collections"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "record_disposition_requests" ADD CONSTRAINT "record_disposition_requests_recordRetentionAssignmentId_fkey" FOREIGN KEY ("recordRetentionAssignmentId") REFERENCES "record_retention_assignments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "record_disposition_records" ADD CONSTRAINT "record_disposition_records_recordDispositionRequestId_fkey" FOREIGN KEY ("recordDispositionRequestId") REFERENCES "record_disposition_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

