-- Phase 7B: Document Registry, Versioning, Storage and Provenance

-- CreateEnum
CREATE TYPE "DocumentSourceType" AS ENUM ('APPLICANT_UPLOAD', 'OFFICIAL_UPLOAD', 'EXTERNAL_AUTHORITY', 'SYSTEM_GENERATED', 'SCANNED_COUNTER', 'EMAIL_INGEST', 'API_INGEST', 'OTHER');

-- CreateEnum
CREATE TYPE "DocumentSignatureStatus" AS ENUM ('NOT_EVALUATED', 'UNSIGNED', 'SIGNED', 'SIGNATURE_INVALID', 'SIGNATURE_UNVERIFIED');

-- CreateEnum
CREATE TYPE "DocumentSealStatus" AS ENUM ('NOT_EVALUATED', 'UNSEALED', 'SEALED', 'SEAL_INVALID', 'SEAL_UNVERIFIED');

-- CreateEnum
CREATE TYPE "DocumentAuthenticityStatus" AS ENUM ('NOT_EVALUATED', 'UNVERIFIED', 'VERIFICATION_PENDING', 'AUTHENTICITY_DISPUTED', 'VERIFICATION_FAILED');

-- CreateEnum
CREATE TYPE "DocumentSecurityClassification" AS ENUM ('PUBLIC', 'INTERNAL', 'CONFIDENTIAL', 'RESTRICTED', 'HIGHLY_RESTRICTED');

-- CreateEnum
CREATE TYPE "DocumentPrivacyClassification" AS ENUM ('NOT_APPLICABLE', 'PERSONAL_DATA', 'SENSITIVE_PERSONAL_DATA', 'SPECIAL_CATEGORY', 'ANONYMIZED');

-- CreateEnum
CREATE TYPE "DocumentConfidentialityOrPrivilegeStatus" AS ENUM ('NOT_EVALUATED', 'NONE', 'LEGAL_PRIVILEGE_ASSERTED', 'LEGAL_PRIVILEGE_CONFIRMED', 'STATUTORY_CONFIDENTIALITY', 'CABINET_CONFIDENTIAL');

-- CreateEnum
CREATE TYPE "MalwareScanStatus" AS ENUM ('NOT_SCANNED', 'SCAN_PENDING', 'CLEAN', 'SUSPICIOUS', 'MALICIOUS', 'SCAN_FAILED', 'QUARANTINED');

-- CreateEnum
CREATE TYPE "DocumentAssociationTargetType" AS ENUM ('MASTER_ADMINISTRATIVE_FILE', 'APPLICATION', 'APPLICATION_SUBMISSION', 'CASE', 'WORKFLOW_STEP', 'CASE_REFERRAL', 'COMMUNICATION', 'CHECKLIST_REQUIREMENT', 'EVIDENCE_ITEM');

-- CreateEnum
CREATE TYPE "DocumentAssociationRole" AS ENUM ('SUPPORTING_EVIDENCE', 'REQUIRED_SUBMISSION', 'OFFICIAL_RECORD', 'CORRESPONDENCE_ATTACHMENT', 'REFERRAL_ATTACHMENT', 'WORKFLOW_ARTIFACT', 'REFERENCE_COPY', 'OTHER');

-- CreateEnum
CREATE TYPE "DocumentAuditEventType" AS ENUM ('DOCUMENT_UPLOADED', 'DOCUMENT_VERSION_CREATED', 'CLASSIFICATION_CHANGED', 'DOCUMENT_DOWNLOADED', 'DOCUMENT_EXPORTED', 'DOCUMENT_QUARANTINED', 'DOCUMENT_ACCESS_DENIED');

-- AlterTable
ALTER TABLE "cases" ADD COLUMN IF NOT EXISTS "documentRegisterReference" TEXT,
ADD COLUMN IF NOT EXISTS "evidencePacketReference" TEXT,
ADD COLUMN IF NOT EXISTS "recordsClassificationReference" TEXT,
ADD COLUMN IF NOT EXISTS "retentionLegalHoldReference" TEXT;

-- CreateTable
CREATE TABLE "document_records" (
    "id" UUID NOT NULL,
    "documentNumber" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "documentType" TEXT NOT NULL,
    "sourceType" "DocumentSourceType" NOT NULL,
    "authorOrIssuer" TEXT,
    "recipient" TEXT,
    "owningInstitutionId" UUID,
    "owningOrganizationId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "document_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "document_versions" (
    "id" UUID NOT NULL,
    "documentRecordId" UUID NOT NULL,
    "versionNumber" INTEGER NOT NULL,
    "originalFilename" TEXT NOT NULL,
    "contentType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "storageProvider" TEXT NOT NULL,
    "storageObjectKey" TEXT NOT NULL,
    "storageVersionId" TEXT,
    "sha256" TEXT NOT NULL,
    "dateCreated" TIMESTAMP(3),
    "dateReceived" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dateEffective" TIMESTAMP(3),
    "language" TEXT,
    "signatureStatus" "DocumentSignatureStatus" NOT NULL DEFAULT 'NOT_EVALUATED',
    "sealStatus" "DocumentSealStatus" NOT NULL DEFAULT 'NOT_EVALUATED',
    "authenticityStatus" "DocumentAuthenticityStatus" NOT NULL DEFAULT 'NOT_EVALUATED',
    "securityClassification" "DocumentSecurityClassification" NOT NULL DEFAULT 'INTERNAL',
    "privacyClassification" "DocumentPrivacyClassification" NOT NULL DEFAULT 'NOT_APPLICABLE',
    "confidentialityOrPrivilegeStatus" "DocumentConfidentialityOrPrivilegeStatus" NOT NULL DEFAULT 'NOT_EVALUATED',
    "malwareScanStatus" "MalwareScanStatus" NOT NULL DEFAULT 'NOT_SCANNED',
    "supersededById" UUID,
    "receivedFromIdentityId" UUID,
    "receivedFromExternalAuthorityId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "document_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "document_associations" (
    "id" UUID NOT NULL,
    "documentVersionId" UUID NOT NULL,
    "targetType" "DocumentAssociationTargetType" NOT NULL,
    "targetId" UUID NOT NULL,
    "associationRole" "DocumentAssociationRole" NOT NULL DEFAULT 'OTHER',
    "targetReference" TEXT,
    "associatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "associatedByIdentityId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "documentRecordId" UUID NOT NULL,

    CONSTRAINT "document_associations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "document_audit_events" (
    "id" UUID NOT NULL,
    "documentRecordId" UUID NOT NULL,
    "documentVersionId" UUID,
    "eventType" "DocumentAuditEventType" NOT NULL,
    "actorIdentityId" UUID,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "document_audit_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "document_records_documentNumber_key" ON "document_records"("documentNumber");

-- CreateIndex
CREATE INDEX "document_records_owningInstitutionId_idx" ON "document_records"("owningInstitutionId");

-- CreateIndex
CREATE INDEX "document_records_owningOrganizationId_idx" ON "document_records"("owningOrganizationId");

-- CreateIndex
CREATE INDEX "document_records_documentType_idx" ON "document_records"("documentType");

-- CreateIndex
CREATE UNIQUE INDEX "document_versions_supersededById_key" ON "document_versions"("supersededById");

-- CreateIndex
CREATE INDEX "document_versions_documentRecordId_idx" ON "document_versions"("documentRecordId");

-- CreateIndex
CREATE INDEX "document_versions_sha256_idx" ON "document_versions"("sha256");

-- CreateIndex
CREATE INDEX "document_versions_malwareScanStatus_idx" ON "document_versions"("malwareScanStatus");

-- CreateIndex
CREATE INDEX "document_versions_securityClassification_idx" ON "document_versions"("securityClassification");

-- CreateIndex
CREATE UNIQUE INDEX "document_versions_documentRecordId_versionNumber_key" ON "document_versions"("documentRecordId", "versionNumber");

-- CreateIndex
CREATE INDEX "document_associations_targetType_targetId_idx" ON "document_associations"("targetType", "targetId");

-- CreateIndex
CREATE INDEX "document_associations_documentRecordId_idx" ON "document_associations"("documentRecordId");

-- CreateIndex
CREATE UNIQUE INDEX "document_associations_documentVersionId_targetType_targetId_associationRole_key" ON "document_associations"("documentVersionId", "targetType", "targetId", "associationRole");

-- CreateIndex
CREATE INDEX "document_audit_events_documentRecordId_idx" ON "document_audit_events"("documentRecordId");

-- CreateIndex
CREATE INDEX "document_audit_events_documentVersionId_idx" ON "document_audit_events"("documentVersionId");

-- CreateIndex
CREATE INDEX "document_audit_events_eventType_idx" ON "document_audit_events"("eventType");

-- CreateIndex
CREATE INDEX "document_audit_events_recordedAt_idx" ON "document_audit_events"("recordedAt");

-- AddForeignKey
ALTER TABLE "document_records" ADD CONSTRAINT "document_records_owningInstitutionId_fkey" FOREIGN KEY ("owningInstitutionId") REFERENCES "institutions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_records" ADD CONSTRAINT "document_records_owningOrganizationId_fkey" FOREIGN KEY ("owningOrganizationId") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_versions" ADD CONSTRAINT "document_versions_documentRecordId_fkey" FOREIGN KEY ("documentRecordId") REFERENCES "document_records"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_versions" ADD CONSTRAINT "document_versions_supersededById_fkey" FOREIGN KEY ("supersededById") REFERENCES "document_versions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_versions" ADD CONSTRAINT "document_versions_receivedFromIdentityId_fkey" FOREIGN KEY ("receivedFromIdentityId") REFERENCES "identities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_versions" ADD CONSTRAINT "document_versions_receivedFromExternalAuthorityId_fkey" FOREIGN KEY ("receivedFromExternalAuthorityId") REFERENCES "external_authorities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_associations" ADD CONSTRAINT "document_associations_documentVersionId_fkey" FOREIGN KEY ("documentVersionId") REFERENCES "document_versions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_associations" ADD CONSTRAINT "document_associations_documentRecordId_fkey" FOREIGN KEY ("documentRecordId") REFERENCES "document_records"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_associations" ADD CONSTRAINT "document_associations_associatedByIdentityId_fkey" FOREIGN KEY ("associatedByIdentityId") REFERENCES "identities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_audit_events" ADD CONSTRAINT "document_audit_events_documentRecordId_fkey" FOREIGN KEY ("documentRecordId") REFERENCES "document_records"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_audit_events" ADD CONSTRAINT "document_audit_events_documentVersionId_fkey" FOREIGN KEY ("documentVersionId") REFERENCES "document_versions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_audit_events" ADD CONSTRAINT "document_audit_events_actorIdentityId_fkey" FOREIGN KEY ("actorIdentityId") REFERENCES "identities"("id") ON DELETE SET NULL ON UPDATE CASCADE;
