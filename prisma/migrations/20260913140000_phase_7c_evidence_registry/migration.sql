-- Phase 7C: Evidence registry and verification engine

CREATE TYPE "EvidenceRecordStatus" AS ENUM (
  'REQUESTED', 'RECEIVED', 'UNREADABLE', 'INCOMPLETE', 'DUPLICATE', 'APPLICANT_ASSERTED',
  'EXTERNALLY_ISSUED', 'PENDING_VERIFICATION', 'VERIFIED', 'PARTIALLY_VERIFIED', 'DISPUTED',
  'EXPIRED', 'SUPERSEDED', 'WITHDRAWN', 'REJECTED_FOR_STATED_PURPOSE',
  'ACCEPTED_FOR_LIMITED_RELIANCE', 'ACCEPTED_FOR_ADMINISTRATIVE_PURPOSE'
);

CREATE TYPE "EvidenceType" AS ENUM (
  'DOCUMENT', 'DATA_EXTRACT', 'REGISTRY_RECORD', 'PROFESSIONAL_CERTIFICATION', 'PHOTOGRAPH', 'STATEMENT', 'OTHER'
);

CREATE TYPE "EvidenceSource" AS ENUM (
  'APPLICANT', 'THIRD_PARTY', 'GOVERNMENT_REGISTRY', 'PROFESSIONAL_BODY', 'INTERNAL', 'OTHER'
);

CREATE TYPE "EvidenceVerificationCategory" AS ENUM (
  'INTEGRITY', 'ISSUER', 'SIGNATURE', 'SEAL', 'IDENTITY', 'DATE', 'REGISTRY_MATCH', 'CONTENT_FACT', 'PROFESSIONAL', 'OTHER_CONTROLLED_METHOD'
);

CREATE TYPE "EvidenceVerificationResult" AS ENUM (
  'CONFIRMED', 'NOT_CONFIRMED', 'INCONCLUSIVE', 'COULD_NOT_VERIFY'
);

CREATE TYPE "EvidenceVerificationMethod" AS ENUM (
  'CHECKSUM_MATCH', 'DIGITAL_SIGNATURE_VALIDATION', 'REGISTRY_LOOKUP', 'ISSUER_CONFIRMATION',
  'PROFESSIONAL_REGISTER_LOOKUP', 'VISUAL_INSPECTION', 'OTHER_CONTROLLED_METHOD', 'UNKNOWN'
);

CREATE TYPE "EvidenceRequirementRelationship" AS ENUM (
  'SATISFIES', 'PARTIALLY_SATISFIES', 'DOES_NOT_SATISFY', 'UNDER_REVIEW', 'NOT_APPLICABLE'
);

CREATE TYPE "EvidenceRequirementLinkStatus" AS ENUM (
  'LINKED', 'UNDER_REVIEW', 'SATISFIED', 'PARTIALLY_SATISFIED', 'NOT_SATISFIED', 'SUPERSEDED', 'WITHDRAWN'
);

CREATE TYPE "EvidenceAcceptancePurpose" AS ENUM (
  'COMPLETENESS', 'SUBSTANTIVE_REVIEW', 'PROFESSIONAL_REVIEW', 'INSPECTION', 'EXTERNAL_REFERRAL',
  'FUTURE_DECISION_PACKET', 'COMPLIANCE', 'OTHER_APPROVED_PURPOSE'
);

CREATE TYPE "EvidenceAcceptanceDecision" AS ENUM ('ACCEPTED', 'REJECTED', 'LIMITED');

CREATE TYPE "EvidenceQualityCriterion" AS ENUM (
  'RELEVANCE', 'PROVENANCE', 'AUTHENTICITY', 'COMPLETENESS', 'CURRENCY', 'INDEPENDENCE',
  'RELIABILITY', 'INTEGRITY', 'SCOPE', 'FITNESS_FOR_PURPOSE'
);

CREATE TYPE "EvidenceQualityRating" AS ENUM ('STRONG', 'ADEQUATE', 'WEAK', 'INSUFFICIENT', 'UNASSESSED');

CREATE TYPE "EvidenceQualityAssessmentSource" AS ENUM ('OFFICIAL', 'AI_PROPOSED');

CREATE TABLE "evidence_records" (
  "id" UUID NOT NULL,
  "evidenceNumber" TEXT NOT NULL,
  "masterAdministrativeFileId" UUID NOT NULL,
  "caseId" UUID NOT NULL,
  "documentVersionId" UUID,
  "externalRecordReference" TEXT,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "evidenceType" "EvidenceType" NOT NULL,
  "source" "EvidenceSource" NOT NULL,
  "submittingParty" TEXT NOT NULL,
  "authorOrIssuingBody" TEXT,
  "dateCreated" TIMESTAMP(3),
  "dateReceived" TIMESTAMP(3) NOT NULL,
  "periodCovered" TEXT,
  "status" "EvidenceRecordStatus" NOT NULL DEFAULT 'RECEIVED',
  "validFrom" TIMESTAMP(3),
  "validUntil" TIMESTAMP(3),
  "confidentialityClassification" TEXT NOT NULL,
  "integrityReference" TEXT NOT NULL,
  "limitations" TEXT,
  "retentionRuleReference" TEXT,
  "supersededByEvidenceId" UUID,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "evidence_records_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "evidence_verifications" (
  "id" UUID NOT NULL,
  "evidenceId" UUID NOT NULL,
  "category" "EvidenceVerificationCategory" NOT NULL,
  "whatWasVerified" TEXT NOT NULL,
  "verificationMethod" "EvidenceVerificationMethod" NOT NULL,
  "verificationSource" TEXT NOT NULL,
  "result" "EvidenceVerificationResult" NOT NULL,
  "verifiedByIdentityId" UUID NOT NULL,
  "verifiedByOfficeholderId" UUID,
  "professionalReference" TEXT,
  "externalAuthorityReference" TEXT,
  "performedAt" TIMESTAMP(3) NOT NULL,
  "limitations" TEXT,
  "expiresAt" TIMESTAMP(3),
  "authorityEvaluationRecordId" UUID,
  "isAiProposed" BOOLEAN NOT NULL DEFAULT false,
  "finalizedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "evidence_verifications_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "evidence_requirement_links" (
  "id" UUID NOT NULL,
  "evidenceId" UUID NOT NULL,
  "checklistItemId" UUID NOT NULL,
  "relationship" "EvidenceRequirementRelationship" NOT NULL,
  "status" "EvidenceRequirementLinkStatus" NOT NULL DEFAULT 'LINKED',
  "effectiveFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "effectiveUntil" TIMESTAMP(3),
  "limitations" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "evidence_requirement_links_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "evidence_purpose_acceptances" (
  "id" UUID NOT NULL,
  "evidenceId" UUID NOT NULL,
  "purpose" "EvidenceAcceptancePurpose" NOT NULL,
  "decision" "EvidenceAcceptanceDecision" NOT NULL,
  "reviewerIdentityId" UUID NOT NULL,
  "reviewerOfficeholderId" UUID,
  "decidedAt" TIMESTAMP(3) NOT NULL,
  "reason" TEXT,
  "scope" TEXT,
  "limitations" TEXT,
  "isAiProposed" BOOLEAN NOT NULL DEFAULT false,
  "finalizedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "evidence_purpose_acceptances_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "evidence_quality_assessments" (
  "id" UUID NOT NULL,
  "evidenceId" UUID NOT NULL,
  "criterion" "EvidenceQualityCriterion" NOT NULL,
  "rating" "EvidenceQualityRating" NOT NULL,
  "notes" TEXT,
  "assessedByIdentityId" UUID NOT NULL,
  "assessedByOfficeholderId" UUID,
  "assessmentSource" "EvidenceQualityAssessmentSource" NOT NULL DEFAULT 'OFFICIAL',
  "assessedAt" TIMESTAMP(3) NOT NULL,
  "limitations" TEXT,
  "finalizedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "evidence_quality_assessments_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "evidence_records_evidenceNumber_key" ON "evidence_records"("evidenceNumber");
CREATE UNIQUE INDEX "evidence_quality_assessments_evidenceId_criterion_assessmentSource_assessedAt_key"
  ON "evidence_quality_assessments"("evidenceId", "criterion", "assessmentSource", "assessedAt");

CREATE INDEX "evidence_records_masterAdministrativeFileId_idx" ON "evidence_records"("masterAdministrativeFileId");
CREATE INDEX "evidence_records_caseId_idx" ON "evidence_records"("caseId");
CREATE INDEX "evidence_records_documentVersionId_idx" ON "evidence_records"("documentVersionId");
CREATE INDEX "evidence_records_status_idx" ON "evidence_records"("status");
CREATE INDEX "evidence_records_supersededByEvidenceId_idx" ON "evidence_records"("supersededByEvidenceId");
CREATE INDEX "evidence_verifications_evidenceId_idx" ON "evidence_verifications"("evidenceId");
CREATE INDEX "evidence_verifications_category_idx" ON "evidence_verifications"("category");
CREATE INDEX "evidence_verifications_verifiedByIdentityId_idx" ON "evidence_verifications"("verifiedByIdentityId");
CREATE INDEX "evidence_verifications_performedAt_idx" ON "evidence_verifications"("performedAt");
CREATE INDEX "evidence_requirement_links_evidenceId_idx" ON "evidence_requirement_links"("evidenceId");
CREATE INDEX "evidence_requirement_links_checklistItemId_idx" ON "evidence_requirement_links"("checklistItemId");
CREATE INDEX "evidence_requirement_links_status_idx" ON "evidence_requirement_links"("status");
CREATE INDEX "evidence_purpose_acceptances_evidenceId_idx" ON "evidence_purpose_acceptances"("evidenceId");
CREATE INDEX "evidence_purpose_acceptances_purpose_idx" ON "evidence_purpose_acceptances"("purpose");
CREATE INDEX "evidence_purpose_acceptances_reviewerIdentityId_idx" ON "evidence_purpose_acceptances"("reviewerIdentityId");
CREATE INDEX "evidence_quality_assessments_evidenceId_idx" ON "evidence_quality_assessments"("evidenceId");
CREATE INDEX "evidence_quality_assessments_criterion_idx" ON "evidence_quality_assessments"("criterion");

ALTER TABLE "evidence_records" ADD CONSTRAINT "evidence_records_masterAdministrativeFileId_fkey"
  FOREIGN KEY ("masterAdministrativeFileId") REFERENCES "master_administrative_files"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "evidence_records" ADD CONSTRAINT "evidence_records_caseId_fkey"
  FOREIGN KEY ("caseId") REFERENCES "cases"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "evidence_records" ADD CONSTRAINT "evidence_records_documentVersionId_fkey"
  FOREIGN KEY ("documentVersionId") REFERENCES "document_versions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "evidence_records" ADD CONSTRAINT "evidence_records_supersededByEvidenceId_fkey"
  FOREIGN KEY ("supersededByEvidenceId") REFERENCES "evidence_records"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "evidence_verifications" ADD CONSTRAINT "evidence_verifications_evidenceId_fkey"
  FOREIGN KEY ("evidenceId") REFERENCES "evidence_records"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "evidence_verifications" ADD CONSTRAINT "evidence_verifications_verifiedByIdentityId_fkey"
  FOREIGN KEY ("verifiedByIdentityId") REFERENCES "identities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "evidence_verifications" ADD CONSTRAINT "evidence_verifications_verifiedByOfficeholderId_fkey"
  FOREIGN KEY ("verifiedByOfficeholderId") REFERENCES "officeholders"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "evidence_verifications" ADD CONSTRAINT "evidence_verifications_authorityEvaluationRecordId_fkey"
  FOREIGN KEY ("authorityEvaluationRecordId") REFERENCES "authority_evaluation_records"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "evidence_requirement_links" ADD CONSTRAINT "evidence_requirement_links_evidenceId_fkey"
  FOREIGN KEY ("evidenceId") REFERENCES "evidence_records"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "evidence_requirement_links" ADD CONSTRAINT "evidence_requirement_links_checklistItemId_fkey"
  FOREIGN KEY ("checklistItemId") REFERENCES "government_service_checklist_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "evidence_purpose_acceptances" ADD CONSTRAINT "evidence_purpose_acceptances_evidenceId_fkey"
  FOREIGN KEY ("evidenceId") REFERENCES "evidence_records"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "evidence_purpose_acceptances" ADD CONSTRAINT "evidence_purpose_acceptances_reviewerIdentityId_fkey"
  FOREIGN KEY ("reviewerIdentityId") REFERENCES "identities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "evidence_purpose_acceptances" ADD CONSTRAINT "evidence_purpose_acceptances_reviewerOfficeholderId_fkey"
  FOREIGN KEY ("reviewerOfficeholderId") REFERENCES "officeholders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "evidence_quality_assessments" ADD CONSTRAINT "evidence_quality_assessments_evidenceId_fkey"
  FOREIGN KEY ("evidenceId") REFERENCES "evidence_records"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "evidence_quality_assessments" ADD CONSTRAINT "evidence_quality_assessments_assessedByIdentityId_fkey"
  FOREIGN KEY ("assessedByIdentityId") REFERENCES "identities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "evidence_quality_assessments" ADD CONSTRAINT "evidence_quality_assessments_assessedByOfficeholderId_fkey"
  FOREIGN KEY ("assessedByOfficeholderId") REFERENCES "officeholders"("id") ON DELETE SET NULL ON UPDATE CASCADE;
