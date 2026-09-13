-- Phase 7E: Evidence Packets and immutable decision-support snapshots

CREATE TYPE "EvidencePacketPurpose" AS ENUM (
  'SUBSTANTIVE_REVIEW',
  'PROFESSIONAL_REVIEW',
  'INSPECTION_REVIEW',
  'EXTERNAL_REFERRAL',
  'DECISION_SUPPORT',
  'APPEAL_RECORD',
  'COMPLIANCE_REVIEW',
  'PROJECT_READINESS',
  'OTHER_CONTROLLED_PURPOSE'
);

CREATE TYPE "EvidencePacketVersionStatus" AS ENUM (
  'DRAFT',
  'ASSEMBLED',
  'UNDER_REVIEW',
  'FROZEN',
  'SUPERSEDED',
  'ARCHIVED'
);

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
  "isExplicitlyExcluded" BOOLEAN NOT NULL DEFAULT false,
  "exclusionRecordId" UUID,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "evidence_packet_items_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "evidence_packet_manifests" (
  "id" UUID NOT NULL,
  "packetVersionId" UUID NOT NULL,
  "canonicalManifest" JSONB NOT NULL,
  "manifestHash" TEXT NOT NULL,
  "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "evidence_packet_manifests_pkey" PRIMARY KEY ("id")
);

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

CREATE TABLE "_PacketItemAcceptances" (
  "A" UUID NOT NULL,
  "B" UUID NOT NULL,
  CONSTRAINT "_PacketItemAcceptances_AB_pkey" PRIMARY KEY ("A","B")
);

CREATE TABLE "_PacketItemVerifications" (
  "A" UUID NOT NULL,
  "B" UUID NOT NULL,
  CONSTRAINT "_PacketItemVerifications_AB_pkey" PRIMARY KEY ("A","B")
);

CREATE UNIQUE INDEX "evidence_packets_packetNumber_key" ON "evidence_packets"("packetNumber");
CREATE INDEX "evidence_packets_masterAdministrativeFileId_idx" ON "evidence_packets"("masterAdministrativeFileId");
CREATE INDEX "evidence_packets_caseId_idx" ON "evidence_packets"("caseId");
CREATE INDEX "evidence_packets_responsibleDepartmentId_idx" ON "evidence_packets"("responsibleDepartmentId");

CREATE UNIQUE INDEX "evidence_packet_versions_packetId_version_key" ON "evidence_packet_versions"("packetId", "version");
CREATE INDEX "evidence_packet_versions_packetId_idx" ON "evidence_packet_versions"("packetId");
CREATE INDEX "evidence_packet_versions_status_idx" ON "evidence_packet_versions"("status");

CREATE UNIQUE INDEX "evidence_packet_items_packetVersionId_evidenceRecordId_key" ON "evidence_packet_items"("packetVersionId", "evidenceRecordId");
CREATE UNIQUE INDEX "evidence_packet_items_exclusionRecordId_key" ON "evidence_packet_items"("exclusionRecordId");
CREATE INDEX "evidence_packet_items_packetVersionId_idx" ON "evidence_packet_items"("packetVersionId");
CREATE INDEX "evidence_packet_items_evidenceRecordId_idx" ON "evidence_packet_items"("evidenceRecordId");

CREATE UNIQUE INDEX "evidence_packet_manifests_packetVersionId_key" ON "evidence_packet_manifests"("packetVersionId");

CREATE INDEX "evidence_packet_item_exclusions_packetVersionId_idx" ON "evidence_packet_item_exclusions"("packetVersionId");
CREATE INDEX "evidence_packet_item_exclusions_evidenceRecordId_idx" ON "evidence_packet_item_exclusions"("evidenceRecordId");

CREATE INDEX "_PacketItemAcceptances_B_index" ON "_PacketItemAcceptances"("B");
CREATE INDEX "_PacketItemVerifications_B_index" ON "_PacketItemVerifications"("B");

ALTER TABLE "evidence_packets" ADD CONSTRAINT "evidence_packets_masterAdministrativeFileId_fkey" FOREIGN KEY ("masterAdministrativeFileId") REFERENCES "master_administrative_files"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "evidence_packets" ADD CONSTRAINT "evidence_packets_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "cases"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "evidence_packets" ADD CONSTRAINT "evidence_packets_responsibleDepartmentId_fkey" FOREIGN KEY ("responsibleDepartmentId") REFERENCES "departments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "evidence_packet_versions" ADD CONSTRAINT "evidence_packet_versions_packetId_fkey" FOREIGN KEY ("packetId") REFERENCES "evidence_packets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "evidence_packet_versions" ADD CONSTRAINT "evidence_packet_versions_assembledByOfficeholderId_fkey" FOREIGN KEY ("assembledByOfficeholderId") REFERENCES "officeholders"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "evidence_packet_versions" ADD CONSTRAINT "evidence_packet_versions_authorityEvaluationRecordId_fkey" FOREIGN KEY ("authorityEvaluationRecordId") REFERENCES "authority_evaluation_records"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "evidence_packet_versions" ADD CONSTRAINT "evidence_packet_versions_supersededById_fkey" FOREIGN KEY ("supersededById") REFERENCES "evidence_packet_versions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "evidence_packet_items" ADD CONSTRAINT "evidence_packet_items_packetVersionId_fkey" FOREIGN KEY ("packetVersionId") REFERENCES "evidence_packet_versions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "evidence_packet_items" ADD CONSTRAINT "evidence_packet_items_evidenceRecordId_fkey" FOREIGN KEY ("evidenceRecordId") REFERENCES "evidence_records"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "evidence_packet_items" ADD CONSTRAINT "evidence_packet_items_documentVersionId_fkey" FOREIGN KEY ("documentVersionId") REFERENCES "document_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "evidence_packet_items" ADD CONSTRAINT "evidence_packet_items_departmentalReviewId_fkey" FOREIGN KEY ("departmentalReviewId") REFERENCES "departmental_review_records"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "evidence_packet_items" ADD CONSTRAINT "evidence_packet_items_governmentCommunicationId_fkey" FOREIGN KEY ("governmentCommunicationId") REFERENCES "government_communication_records"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "evidence_packet_items" ADD CONSTRAINT "evidence_packet_items_professionalReviewId_fkey" FOREIGN KEY ("professionalReviewId") REFERENCES "professional_review_records"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "evidence_packet_items" ADD CONSTRAINT "evidence_packet_items_inspectionRecordId_fkey" FOREIGN KEY ("inspectionRecordId") REFERENCES "inspection_records"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "evidence_packet_items" ADD CONSTRAINT "evidence_packet_items_exclusionRecordId_fkey" FOREIGN KEY ("exclusionRecordId") REFERENCES "evidence_packet_item_exclusions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "evidence_packet_manifests" ADD CONSTRAINT "evidence_packet_manifests_packetVersionId_fkey" FOREIGN KEY ("packetVersionId") REFERENCES "evidence_packet_versions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "evidence_packet_item_exclusions" ADD CONSTRAINT "evidence_packet_item_exclusions_packetVersionId_fkey" FOREIGN KEY ("packetVersionId") REFERENCES "evidence_packet_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "evidence_packet_item_exclusions" ADD CONSTRAINT "evidence_packet_item_exclusions_evidenceRecordId_fkey" FOREIGN KEY ("evidenceRecordId") REFERENCES "evidence_records"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "evidence_packet_item_exclusions" ADD CONSTRAINT "evidence_packet_item_exclusions_authorizedByOfficeholderId_fkey" FOREIGN KEY ("authorizedByOfficeholderId") REFERENCES "officeholders"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "evidence_packet_item_exclusions" ADD CONSTRAINT "evidence_packet_item_exclusions_authorityEvaluationRecordId_fkey" FOREIGN KEY ("authorityEvaluationRecordId") REFERENCES "authority_evaluation_records"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "_PacketItemAcceptances" ADD CONSTRAINT "_PacketItemAcceptances_A_fkey" FOREIGN KEY ("A") REFERENCES "evidence_purpose_acceptances"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "_PacketItemAcceptances" ADD CONSTRAINT "_PacketItemAcceptances_B_fkey" FOREIGN KEY ("B") REFERENCES "evidence_packet_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "_PacketItemVerifications" ADD CONSTRAINT "_PacketItemVerifications_A_fkey" FOREIGN KEY ("A") REFERENCES "evidence_packet_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "_PacketItemVerifications" ADD CONSTRAINT "_PacketItemVerifications_B_fkey" FOREIGN KEY ("B") REFERENCES "evidence_verifications"("id") ON DELETE CASCADE ON UPDATE CASCADE;
