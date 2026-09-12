-- Phase 7E: Evidence Records foundation and Evidence Packet architecture

-- CreateEnum
CREATE TYPE "EvidenceRecordStatus" AS ENUM ('DRAFT', 'ACTIVE', 'EXPIRED', 'DISPUTED', 'SUPERSEDED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "EvidenceQualityLevel" AS ENUM ('ADEQUATE', 'PARTIAL', 'INSUFFICIENT', 'UNVERIFIED', 'CONTRADICTED');

-- CreateEnum
CREATE TYPE "EvidencePacketPurpose" AS ENUM ('SUBSTANTIVE_REVIEW', 'PROFESSIONAL_REVIEW', 'INSPECTION_REVIEW', 'EXTERNAL_REFERRAL', 'DECISION_SUPPORT', 'APPEAL_RECORD', 'COMPLIANCE_REVIEW', 'PROJECT_READINESS', 'OTHER_CONTROLLED_PURPOSE');

-- CreateEnum
CREATE TYPE "EvidencePacketVersionStatus" AS ENUM ('DRAFT', 'ASSEMBLED', 'UNDER_REVIEW', 'FROZEN', 'SUPERSEDED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "ProfessionalReviewOpinionType" AS ENUM ('MAJORITY', 'MINORITY', 'DISSENTING');

-- CreateEnum
CREATE TYPE "GovernmentCommunicationResponseStatus" AS ENUM ('UNRESOLVED', 'RESOLVED', 'NOT_REQUIRED');

-- AlterTable
ALTER TABLE "cases" ADD COLUMN "masterAdministrativeFileReference" TEXT,
ADD COLUMN "documentRegisterReference" TEXT,
ADD COLUMN "evidencePacketReference" TEXT,
ADD COLUMN "recordsClassificationReference" TEXT,
ADD COLUMN "retentionLegalHoldReference" TEXT;

-- CreateTable
CREATE TABLE "master_administrative_files" (
    "id" UUID NOT NULL,
    "fileNumber" TEXT NOT NULL,
    "caseId" UUID,
    "title" TEXT,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "master_administrative_files_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "evidence_records" (
    "id" UUID NOT NULL,
    "masterAdministrativeFileId" UUID NOT NULL,
    "recordNumber" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" "EvidenceRecordStatus" NOT NULL DEFAULT 'ACTIVE',
    "isAdverse" BOOLEAN NOT NULL DEFAULT false,
    "isDisputed" BOOLEAN NOT NULL DEFAULT false,
    "disputeNotes" TEXT,
    "effectiveFrom" TIMESTAMP(3),
    "effectiveUntil" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "evidence_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "document_versions" (
    "id" UUID NOT NULL,
    "evidenceRecordId" UUID NOT NULL,
    "versionNumber" INTEGER NOT NULL,
    "contentHash" TEXT NOT NULL,
    "storageReference" TEXT NOT NULL,
    "mimeType" TEXT,
    "byteSize" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "document_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "evidence_quality_assessments" (
    "id" UUID NOT NULL,
    "evidenceRecordId" UUID NOT NULL,
    "assessedByIdentityId" UUID NOT NULL,
    "qualityLevel" "EvidenceQualityLevel" NOT NULL,
    "limitations" TEXT,
    "missingElements" JSONB NOT NULL DEFAULT '[]',
    "notes" TEXT,
    "assessedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "evidence_quality_assessments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "evidence_verification_records" (
    "id" UUID NOT NULL,
    "evidenceRecordId" UUID NOT NULL,
    "verifiedByIdentityId" UUID NOT NULL,
    "verifiedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "outcome" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "evidence_verification_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "evidence_acceptance_records" (
    "id" UUID NOT NULL,
    "evidenceRecordId" UUID NOT NULL,
    "acceptedByIdentityId" UUID NOT NULL,
    "acceptedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "evidence_acceptance_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "departmental_evidence_reviews" (
    "id" UUID NOT NULL,
    "evidenceRecordId" UUID NOT NULL,
    "departmentId" UUID NOT NULL,
    "reviewerIdentityId" UUID NOT NULL,
    "outcome" TEXT NOT NULL,
    "notes" TEXT,
    "reviewedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "departmental_evidence_reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "evidence_government_communications" (
    "id" UUID NOT NULL,
    "evidenceRecordId" UUID NOT NULL,
    "subject" TEXT,
    "body" TEXT NOT NULL,
    "responseStatus" "GovernmentCommunicationResponseStatus" NOT NULL DEFAULT 'UNRESOLVED',
    "communicatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "evidence_government_communications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "evidence_professional_reviews" (
    "id" UUID NOT NULL,
    "evidenceRecordId" UUID NOT NULL,
    "opinionType" "ProfessionalReviewOpinionType" NOT NULL DEFAULT 'MAJORITY',
    "reviewerReference" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "reviewedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "evidence_professional_reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "evidence_inspection_records" (
    "id" UUID NOT NULL,
    "evidenceRecordId" UUID NOT NULL,
    "inspectionType" TEXT NOT NULL,
    "outcome" TEXT NOT NULL,
    "conductedAt" TIMESTAMP(3) NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "evidence_inspection_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "evidence_source_citations" (
    "id" UUID NOT NULL,
    "evidenceRecordId" UUID NOT NULL,
    "citationType" TEXT NOT NULL,
    "citationReference" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "evidence_source_citations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "evidence_packets" (
    "id" UUID NOT NULL,
    "packetNumber" TEXT NOT NULL,
    "masterAdministrativeFileId" UUID NOT NULL,
    "caseId" UUID,
    "purpose" "EvidencePacketPurpose" NOT NULL,
    "questionOrIssue" TEXT NOT NULL,
    "responsibleDepartmentId" UUID NOT NULL,
    "externalProjectReference" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "evidence_packets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "evidence_packet_versions" (
    "id" UUID NOT NULL,
    "packetId" UUID NOT NULL,
    "version" INTEGER NOT NULL,
    "status" "EvidencePacketVersionStatus" NOT NULL DEFAULT 'DRAFT',
    "evidenceCutoffAt" TIMESTAMP(3),
    "assembledByIdentityId" UUID NOT NULL,
    "assembledByOfficeholderId" UUID,
    "authorityEvaluationRecordId" UUID,
    "frozenAt" TIMESTAMP(3),
    "manifestHash" TEXT,
    "supersededById" UUID,
    "readyForDecisionReview" BOOLEAN NOT NULL DEFAULT false,
    "qualitySummary" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "evidence_packet_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "evidence_packet_items" (
    "id" UUID NOT NULL,
    "packetVersionId" UUID NOT NULL,
    "evidenceRecordId" UUID NOT NULL,
    "evidenceStatusAtInclusion" "EvidenceRecordStatus" NOT NULL,
    "documentVersionId" UUID NOT NULL,
    "inclusionOrder" INTEGER NOT NULL,
    "limitations" TEXT,
    "departmentalReviewId" UUID,
    "governmentCommunicationId" UUID,
    "professionalReviewId" UUID,
    "inspectionRecordId" UUID,
    "sourceCitationId" UUID,
    "isExplicitlyExcluded" BOOLEAN NOT NULL DEFAULT false,
    "exclusionRecordId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "evidence_packet_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "evidence_packet_manifests" (
    "id" UUID NOT NULL,
    "packetVersionId" UUID NOT NULL,
    "canonicalManifest" JSONB NOT NULL,
    "manifestHash" TEXT NOT NULL,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "evidence_packet_manifests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "evidence_packet_item_exclusions" (
    "id" UUID NOT NULL,
    "packetVersionId" UUID NOT NULL,
    "evidenceRecordId" UUID NOT NULL,
    "exclusionReason" TEXT NOT NULL,
    "authorizedByIdentityId" UUID NOT NULL,
    "authorizedByOfficeholderId" UUID,
    "authorityEvaluationRecordId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "evidence_packet_item_exclusions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_PacketItemAcceptances" (
    "A" UUID NOT NULL,
    "B" UUID NOT NULL,

    CONSTRAINT "_PacketItemAcceptances_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_PacketItemVerifications" (
    "A" UUID NOT NULL,
    "B" UUID NOT NULL,

    CONSTRAINT "_PacketItemVerifications_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "master_administrative_files_fileNumber_key" ON "master_administrative_files"("fileNumber");

-- CreateIndex
CREATE INDEX "master_administrative_files_caseId_idx" ON "master_administrative_files"("caseId");

-- CreateIndex
CREATE UNIQUE INDEX "evidence_records_masterAdministrativeFileId_recordNumber_key" ON "evidence_records"("masterAdministrativeFileId", "recordNumber");

-- CreateIndex
CREATE INDEX "evidence_records_masterAdministrativeFileId_idx" ON "evidence_records"("masterAdministrativeFileId");

-- CreateIndex
CREATE INDEX "evidence_records_status_idx" ON "evidence_records"("status");

-- CreateIndex
CREATE UNIQUE INDEX "document_versions_evidenceRecordId_versionNumber_key" ON "document_versions"("evidenceRecordId", "versionNumber");

-- CreateIndex
CREATE INDEX "document_versions_evidenceRecordId_idx" ON "document_versions"("evidenceRecordId");

-- CreateIndex
CREATE INDEX "evidence_quality_assessments_evidenceRecordId_idx" ON "evidence_quality_assessments"("evidenceRecordId");

-- CreateIndex
CREATE INDEX "evidence_quality_assessments_assessedByIdentityId_idx" ON "evidence_quality_assessments"("assessedByIdentityId");

-- CreateIndex
CREATE INDEX "evidence_verification_records_evidenceRecordId_idx" ON "evidence_verification_records"("evidenceRecordId");

-- CreateIndex
CREATE INDEX "evidence_acceptance_records_evidenceRecordId_idx" ON "evidence_acceptance_records"("evidenceRecordId");

-- CreateIndex
CREATE INDEX "departmental_evidence_reviews_evidenceRecordId_idx" ON "departmental_evidence_reviews"("evidenceRecordId");

-- CreateIndex
CREATE INDEX "departmental_evidence_reviews_departmentId_idx" ON "departmental_evidence_reviews"("departmentId");

-- CreateIndex
CREATE INDEX "evidence_government_communications_evidenceRecordId_idx" ON "evidence_government_communications"("evidenceRecordId");

-- CreateIndex
CREATE INDEX "evidence_professional_reviews_evidenceRecordId_idx" ON "evidence_professional_reviews"("evidenceRecordId");

-- CreateIndex
CREATE INDEX "evidence_inspection_records_evidenceRecordId_idx" ON "evidence_inspection_records"("evidenceRecordId");

-- CreateIndex
CREATE INDEX "evidence_source_citations_evidenceRecordId_idx" ON "evidence_source_citations"("evidenceRecordId");

-- CreateIndex
CREATE UNIQUE INDEX "evidence_packets_packetNumber_key" ON "evidence_packets"("packetNumber");

-- CreateIndex
CREATE INDEX "evidence_packets_masterAdministrativeFileId_idx" ON "evidence_packets"("masterAdministrativeFileId");

-- CreateIndex
CREATE INDEX "evidence_packets_caseId_idx" ON "evidence_packets"("caseId");

-- CreateIndex
CREATE INDEX "evidence_packets_responsibleDepartmentId_idx" ON "evidence_packets"("responsibleDepartmentId");

-- CreateIndex
CREATE UNIQUE INDEX "evidence_packet_versions_packetId_version_key" ON "evidence_packet_versions"("packetId", "version");

-- CreateIndex
CREATE INDEX "evidence_packet_versions_packetId_idx" ON "evidence_packet_versions"("packetId");

-- CreateIndex
CREATE INDEX "evidence_packet_versions_status_idx" ON "evidence_packet_versions"("status");

-- CreateIndex
CREATE UNIQUE INDEX "evidence_packet_items_packetVersionId_evidenceRecordId_key" ON "evidence_packet_items"("packetVersionId", "evidenceRecordId");

-- CreateIndex
CREATE UNIQUE INDEX "evidence_packet_items_exclusionRecordId_key" ON "evidence_packet_items"("exclusionRecordId");

-- CreateIndex
CREATE INDEX "evidence_packet_items_packetVersionId_idx" ON "evidence_packet_items"("packetVersionId");

-- CreateIndex
CREATE INDEX "evidence_packet_items_evidenceRecordId_idx" ON "evidence_packet_items"("evidenceRecordId");

-- CreateIndex
CREATE UNIQUE INDEX "evidence_packet_manifests_packetVersionId_key" ON "evidence_packet_manifests"("packetVersionId");

-- CreateIndex
CREATE INDEX "evidence_packet_item_exclusions_packetVersionId_idx" ON "evidence_packet_item_exclusions"("packetVersionId");

-- CreateIndex
CREATE INDEX "evidence_packet_item_exclusions_evidenceRecordId_idx" ON "evidence_packet_item_exclusions"("evidenceRecordId");

-- CreateIndex
CREATE INDEX "_PacketItemAcceptances_B_index" ON "_PacketItemAcceptances"("B");

-- CreateIndex
CREATE INDEX "_PacketItemVerifications_B_index" ON "_PacketItemVerifications"("B");

-- AddForeignKey
ALTER TABLE "master_administrative_files" ADD CONSTRAINT "master_administrative_files_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "cases"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evidence_records" ADD CONSTRAINT "evidence_records_masterAdministrativeFileId_fkey" FOREIGN KEY ("masterAdministrativeFileId") REFERENCES "master_administrative_files"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_versions" ADD CONSTRAINT "document_versions_evidenceRecordId_fkey" FOREIGN KEY ("evidenceRecordId") REFERENCES "evidence_records"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evidence_quality_assessments" ADD CONSTRAINT "evidence_quality_assessments_evidenceRecordId_fkey" FOREIGN KEY ("evidenceRecordId") REFERENCES "evidence_records"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evidence_verification_records" ADD CONSTRAINT "evidence_verification_records_evidenceRecordId_fkey" FOREIGN KEY ("evidenceRecordId") REFERENCES "evidence_records"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evidence_acceptance_records" ADD CONSTRAINT "evidence_acceptance_records_evidenceRecordId_fkey" FOREIGN KEY ("evidenceRecordId") REFERENCES "evidence_records"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "departmental_evidence_reviews" ADD CONSTRAINT "departmental_evidence_reviews_evidenceRecordId_fkey" FOREIGN KEY ("evidenceRecordId") REFERENCES "evidence_records"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "departmental_evidence_reviews" ADD CONSTRAINT "departmental_evidence_reviews_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "departments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evidence_government_communications" ADD CONSTRAINT "evidence_government_communications_evidenceRecordId_fkey" FOREIGN KEY ("evidenceRecordId") REFERENCES "evidence_records"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evidence_professional_reviews" ADD CONSTRAINT "evidence_professional_reviews_evidenceRecordId_fkey" FOREIGN KEY ("evidenceRecordId") REFERENCES "evidence_records"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evidence_inspection_records" ADD CONSTRAINT "evidence_inspection_records_evidenceRecordId_fkey" FOREIGN KEY ("evidenceRecordId") REFERENCES "evidence_records"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evidence_source_citations" ADD CONSTRAINT "evidence_source_citations_evidenceRecordId_fkey" FOREIGN KEY ("evidenceRecordId") REFERENCES "evidence_records"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evidence_packets" ADD CONSTRAINT "evidence_packets_masterAdministrativeFileId_fkey" FOREIGN KEY ("masterAdministrativeFileId") REFERENCES "master_administrative_files"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evidence_packets" ADD CONSTRAINT "evidence_packets_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "cases"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evidence_packets" ADD CONSTRAINT "evidence_packets_responsibleDepartmentId_fkey" FOREIGN KEY ("responsibleDepartmentId") REFERENCES "departments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evidence_packet_versions" ADD CONSTRAINT "evidence_packet_versions_packetId_fkey" FOREIGN KEY ("packetId") REFERENCES "evidence_packets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evidence_packet_versions" ADD CONSTRAINT "evidence_packet_versions_assembledByOfficeholderId_fkey" FOREIGN KEY ("assembledByOfficeholderId") REFERENCES "officeholders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evidence_packet_versions" ADD CONSTRAINT "evidence_packet_versions_authorityEvaluationRecordId_fkey" FOREIGN KEY ("authorityEvaluationRecordId") REFERENCES "authority_evaluation_records"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evidence_packet_versions" ADD CONSTRAINT "evidence_packet_versions_supersededById_fkey" FOREIGN KEY ("supersededById") REFERENCES "evidence_packet_versions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evidence_packet_items" ADD CONSTRAINT "evidence_packet_items_packetVersionId_fkey" FOREIGN KEY ("packetVersionId") REFERENCES "evidence_packet_versions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evidence_packet_items" ADD CONSTRAINT "evidence_packet_items_evidenceRecordId_fkey" FOREIGN KEY ("evidenceRecordId") REFERENCES "evidence_records"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evidence_packet_items" ADD CONSTRAINT "evidence_packet_items_documentVersionId_fkey" FOREIGN KEY ("documentVersionId") REFERENCES "document_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evidence_packet_items" ADD CONSTRAINT "evidence_packet_items_departmentalReviewId_fkey" FOREIGN KEY ("departmentalReviewId") REFERENCES "departmental_evidence_reviews"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evidence_packet_items" ADD CONSTRAINT "evidence_packet_items_governmentCommunicationId_fkey" FOREIGN KEY ("governmentCommunicationId") REFERENCES "evidence_government_communications"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evidence_packet_items" ADD CONSTRAINT "evidence_packet_items_professionalReviewId_fkey" FOREIGN KEY ("professionalReviewId") REFERENCES "evidence_professional_reviews"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evidence_packet_items" ADD CONSTRAINT "evidence_packet_items_inspectionRecordId_fkey" FOREIGN KEY ("inspectionRecordId") REFERENCES "evidence_inspection_records"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evidence_packet_items" ADD CONSTRAINT "evidence_packet_items_sourceCitationId_fkey" FOREIGN KEY ("sourceCitationId") REFERENCES "evidence_source_citations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evidence_packet_items" ADD CONSTRAINT "evidence_packet_items_exclusionRecordId_fkey" FOREIGN KEY ("exclusionRecordId") REFERENCES "evidence_packet_item_exclusions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evidence_packet_manifests" ADD CONSTRAINT "evidence_packet_manifests_packetVersionId_fkey" FOREIGN KEY ("packetVersionId") REFERENCES "evidence_packet_versions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evidence_packet_item_exclusions" ADD CONSTRAINT "evidence_packet_item_exclusions_packetVersionId_fkey" FOREIGN KEY ("packetVersionId") REFERENCES "evidence_packet_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evidence_packet_item_exclusions" ADD CONSTRAINT "evidence_packet_item_exclusions_evidenceRecordId_fkey" FOREIGN KEY ("evidenceRecordId") REFERENCES "evidence_records"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evidence_packet_item_exclusions" ADD CONSTRAINT "evidence_packet_item_exclusions_authorizedByOfficeholderId_fkey" FOREIGN KEY ("authorizedByOfficeholderId") REFERENCES "officeholders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evidence_packet_item_exclusions" ADD CONSTRAINT "evidence_packet_item_exclusions_authorityEvaluationRecordId_fkey" FOREIGN KEY ("authorityEvaluationRecordId") REFERENCES "authority_evaluation_records"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_PacketItemAcceptances" ADD CONSTRAINT "_PacketItemAcceptances_A_fkey" FOREIGN KEY ("A") REFERENCES "evidence_acceptance_records"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_PacketItemAcceptances" ADD CONSTRAINT "_PacketItemAcceptances_B_fkey" FOREIGN KEY ("B") REFERENCES "evidence_packet_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_PacketItemVerifications" ADD CONSTRAINT "_PacketItemVerifications_A_fkey" FOREIGN KEY ("A") REFERENCES "evidence_packet_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_PacketItemVerifications" ADD CONSTRAINT "_PacketItemVerifications_B_fkey" FOREIGN KEY ("B") REFERENCES "evidence_verification_records"("id") ON DELETE CASCADE ON UPDATE CASCADE;
