-- Phase 7D: Attributable review, government, professional, and inspection records

CREATE TYPE "DepartmentalReviewStatus" AS ENUM ('DRAFT', 'IN_PROGRESS', 'COMPLETED', 'SUPERSEDED');
CREATE TYPE "GovernmentCommunicationCategory" AS ENUM (
  'RECEIPT', 'ACKNOWLEDGMENT', 'INFORMATION', 'GUIDANCE', 'CONSULTATION', 'REQUEST', 'RESPONSE',
  'CONCURRENCE', 'OBJECTION', 'RETAINED_DETERMINATION', 'SUPERVISORY_FINDING', 'INSPECTION_FINDING', 'OTHER'
);
CREATE TYPE "GovernmentCommunicationAuthenticationStatus" AS ENUM ('UNAUTHENTICATED', 'AUTHENTICATED', 'REJECTED');
CREATE TYPE "ProfessionalOpinionStatus" AS ENUM ('DRAFT', 'ISSUED', 'SUPERSEDED', 'WITHDRAWN');
CREATE TYPE "ProfessionalSignatureSource" AS ENUM ('CONTROLLED_PROFESSIONAL_ACTION', 'AI_ASSISTANCE', 'OTHER');
CREATE TYPE "InspectionType" AS ENUM ('SITE', 'DESKTOP', 'REMOTE', 'FOLLOW_UP', 'OTHER');
CREATE TYPE "InspectionStatus" AS ENUM ('SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');
CREATE TYPE "InspectionFindingClassification" AS ENUM ('OBSERVATION', 'CONDITION', 'NON_COMPLIANCE', 'OTHER');
CREATE TYPE "EvidenceCustodyEventType" AS ENUM (
  'COLLECTED', 'RECEIVED', 'TRANSFERRED', 'OPENED', 'SAMPLED', 'COPIED', 'ANALYZED',
  'SEALED', 'UNSEALED', 'RETURNED', 'ARCHIVED', 'DISPOSED_AUTHORIZED'
);
CREATE TYPE "EvidenceIntegrityState" AS ENUM ('INTACT', 'COMPROMISED', 'UNKNOWN');

CREATE TABLE "departmental_review_records" (
    "id" UUID NOT NULL,
    "caseId" UUID NOT NULL,
    "departmentId" UUID NOT NULL,
    "reviewerIdentityId" UUID NOT NULL,
    "reviewerOfficeholderId" UUID NOT NULL,
    "reviewQuestion" TEXT NOT NULL,
    "functionAuthorityRecordId" UUID NOT NULL,
    "authorityEvaluationRecordId" UUID,
    "reviewVersion" INTEGER NOT NULL DEFAULT 1,
    "findings" TEXT NOT NULL,
    "limitations" TEXT,
    "recommendationIfPermitted" TEXT,
    "status" "DepartmentalReviewStatus" NOT NULL DEFAULT 'DRAFT',
    "completedAt" TIMESTAMP(3),
    "supersededById" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "departmental_review_records_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "departmental_review_evidence" (
    "id" UUID NOT NULL,
    "departmentalReviewId" UUID NOT NULL,
    "evidenceRecordId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "departmental_review_evidence_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "government_communication_records" (
    "id" UUID NOT NULL,
    "caseId" UUID NOT NULL,
    "category" "GovernmentCommunicationCategory" NOT NULL,
    "sourceInstitutionId" UUID NOT NULL,
    "officialReference" TEXT,
    "senderReference" TEXT,
    "recipientReference" TEXT,
    "receivedAt" TIMESTAMP(3),
    "sentAt" TIMESTAMP(3),
    "authenticationStatus" "GovernmentCommunicationAuthenticationStatus" NOT NULL DEFAULT 'UNAUTHENTICATED',
    "scope" TEXT,
    "effectiveFrom" TIMESTAMP(3),
    "effectiveUntil" TIMESTAMP(3),
    "limitations" TEXT,
    "caseReferralId" UUID,
    "retainedDeterminationForExternalAuthorityId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "government_communication_records_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "government_communication_documents" (
    "id" UUID NOT NULL,
    "governmentCommunicationId" UUID NOT NULL,
    "documentRecordId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "government_communication_documents_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "government_communication_evidence" (
    "id" UUID NOT NULL,
    "governmentCommunicationId" UUID NOT NULL,
    "evidenceRecordId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "government_communication_evidence_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "professional_review_records" (
    "id" UUID NOT NULL,
    "caseId" UUID NOT NULL,
    "professionType" TEXT NOT NULL,
    "professionalIdentityId" UUID NOT NULL,
    "qualificationReference" TEXT,
    "scopeOfEngagement" TEXT NOT NULL,
    "questionReviewed" TEXT NOT NULL,
    "methodology" TEXT,
    "findings" TEXT NOT NULL,
    "limitations" TEXT,
    "opinionStatus" "ProfessionalOpinionStatus" NOT NULL DEFAULT 'DRAFT',
    "signatureReference" TEXT,
    "signatureSource" "ProfessionalSignatureSource",
    "reviewDate" TIMESTAMP(3),
    "validFrom" TIMESTAMP(3),
    "validUntil" TIMESTAMP(3),
    "independenceDeclaration" TEXT,
    "conflictDeclaration" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "professional_review_records_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "professional_review_evidence" (
    "id" UUID NOT NULL,
    "professionalReviewId" UUID NOT NULL,
    "evidenceRecordId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "professional_review_evidence_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "inspection_records" (
    "id" UUID NOT NULL,
    "caseId" UUID NOT NULL,
    "inspectionType" "InspectionType" NOT NULL,
    "functionAuthorityRecordId" UUID,
    "locationSite" TEXT,
    "inspectionDate" TIMESTAMP(3) NOT NULL,
    "scope" TEXT NOT NULL,
    "method" TEXT,
    "conditionsObserved" TEXT,
    "findings" TEXT,
    "limitations" TEXT,
    "followUpRequired" BOOLEAN NOT NULL DEFAULT false,
    "status" "InspectionStatus" NOT NULL DEFAULT 'SCHEDULED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "inspection_records_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "inspection_inspectors" (
    "id" UUID NOT NULL,
    "inspectionId" UUID NOT NULL,
    "officeholderId" UUID NOT NULL,
    "identityId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "inspection_inspectors_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "inspection_evidence_items" (
    "id" UUID NOT NULL,
    "inspectionId" UUID NOT NULL,
    "evidenceRecordId" UUID NOT NULL,
    "findingClassification" "InspectionFindingClassification" NOT NULL DEFAULT 'OBSERVATION',
    "observationNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "inspection_evidence_items_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "evidence_custody_events" (
    "id" UUID NOT NULL,
    "eventType" "EvidenceCustodyEventType" NOT NULL,
    "evidenceRecordId" UUID,
    "documentRecordId" UUID,
    "inspectionEvidenceItemId" UUID,
    "custodianIdentityId" UUID NOT NULL,
    "custodianOfficeholderId" UUID,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fromLocation" TEXT,
    "toLocation" TEXT,
    "reason" TEXT,
    "integrityState" "EvidenceIntegrityState" NOT NULL DEFAULT 'UNKNOWN',
    "witnessIdentityId" UUID,
    "witnessOfficeholderId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "evidence_custody_events_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "departmental_review_records_caseId_departmentId_reviewVersion_key" ON "departmental_review_records"("caseId", "departmentId", "reviewVersion");
CREATE INDEX "departmental_review_records_caseId_idx" ON "departmental_review_records"("caseId");
CREATE INDEX "departmental_review_records_departmentId_idx" ON "departmental_review_records"("departmentId");
CREATE INDEX "departmental_review_records_reviewerIdentityId_idx" ON "departmental_review_records"("reviewerIdentityId");
CREATE INDEX "departmental_review_records_status_idx" ON "departmental_review_records"("status");

CREATE UNIQUE INDEX "departmental_review_evidence_departmentalReviewId_evidenceRecordId_key" ON "departmental_review_evidence"("departmentalReviewId", "evidenceRecordId");
CREATE INDEX "departmental_review_evidence_evidenceRecordId_idx" ON "departmental_review_evidence"("evidenceRecordId");

CREATE INDEX "government_communication_records_caseId_idx" ON "government_communication_records"("caseId");
CREATE INDEX "government_communication_records_category_idx" ON "government_communication_records"("category");
CREATE INDEX "government_communication_records_sourceInstitutionId_idx" ON "government_communication_records"("sourceInstitutionId");

CREATE UNIQUE INDEX "government_communication_documents_governmentCommunicationId_documentRecordId_key" ON "government_communication_documents"("governmentCommunicationId", "documentRecordId");
CREATE INDEX "government_communication_documents_documentRecordId_idx" ON "government_communication_documents"("documentRecordId");

CREATE UNIQUE INDEX "government_communication_evidence_governmentCommunicationId_evidenceRecordId_key" ON "government_communication_evidence"("governmentCommunicationId", "evidenceRecordId");
CREATE INDEX "government_communication_evidence_evidenceRecordId_idx" ON "government_communication_evidence"("evidenceRecordId");

CREATE INDEX "professional_review_records_caseId_idx" ON "professional_review_records"("caseId");
CREATE INDEX "professional_review_records_professionalIdentityId_idx" ON "professional_review_records"("professionalIdentityId");
CREATE INDEX "professional_review_records_opinionStatus_idx" ON "professional_review_records"("opinionStatus");

CREATE UNIQUE INDEX "professional_review_evidence_professionalReviewId_evidenceRecordId_key" ON "professional_review_evidence"("professionalReviewId", "evidenceRecordId");
CREATE INDEX "professional_review_evidence_evidenceRecordId_idx" ON "professional_review_evidence"("evidenceRecordId");

CREATE INDEX "inspection_records_caseId_idx" ON "inspection_records"("caseId");
CREATE INDEX "inspection_records_status_idx" ON "inspection_records"("status");

CREATE UNIQUE INDEX "inspection_inspectors_inspectionId_officeholderId_key" ON "inspection_inspectors"("inspectionId", "officeholderId");
CREATE INDEX "inspection_inspectors_identityId_idx" ON "inspection_inspectors"("identityId");

CREATE UNIQUE INDEX "inspection_evidence_items_inspectionId_evidenceRecordId_key" ON "inspection_evidence_items"("inspectionId", "evidenceRecordId");
CREATE INDEX "inspection_evidence_items_evidenceRecordId_idx" ON "inspection_evidence_items"("evidenceRecordId");

CREATE INDEX "evidence_custody_events_evidenceRecordId_idx" ON "evidence_custody_events"("evidenceRecordId");
CREATE INDEX "evidence_custody_events_documentRecordId_idx" ON "evidence_custody_events"("documentRecordId");
CREATE INDEX "evidence_custody_events_inspectionEvidenceItemId_idx" ON "evidence_custody_events"("inspectionEvidenceItemId");
CREATE INDEX "evidence_custody_events_custodianIdentityId_idx" ON "evidence_custody_events"("custodianIdentityId");
CREATE INDEX "evidence_custody_events_occurredAt_idx" ON "evidence_custody_events"("occurredAt");

ALTER TABLE "departmental_review_records" ADD CONSTRAINT "departmental_review_records_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "cases"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "departmental_review_records" ADD CONSTRAINT "departmental_review_records_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "departments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "departmental_review_records" ADD CONSTRAINT "departmental_review_records_reviewerIdentityId_fkey" FOREIGN KEY ("reviewerIdentityId") REFERENCES "identities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "departmental_review_records" ADD CONSTRAINT "departmental_review_records_reviewerOfficeholderId_fkey" FOREIGN KEY ("reviewerOfficeholderId") REFERENCES "officeholders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "departmental_review_records" ADD CONSTRAINT "departmental_review_records_functionAuthorityRecordId_fkey" FOREIGN KEY ("functionAuthorityRecordId") REFERENCES "function_authority_records"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "departmental_review_records" ADD CONSTRAINT "departmental_review_records_authorityEvaluationRecordId_fkey" FOREIGN KEY ("authorityEvaluationRecordId") REFERENCES "authority_evaluation_records"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "departmental_review_records" ADD CONSTRAINT "departmental_review_records_supersededById_fkey" FOREIGN KEY ("supersededById") REFERENCES "departmental_review_records"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "departmental_review_evidence" ADD CONSTRAINT "departmental_review_evidence_departmentalReviewId_fkey" FOREIGN KEY ("departmentalReviewId") REFERENCES "departmental_review_records"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "departmental_review_evidence" ADD CONSTRAINT "departmental_review_evidence_evidenceRecordId_fkey" FOREIGN KEY ("evidenceRecordId") REFERENCES "evidence_records"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "government_communication_records" ADD CONSTRAINT "government_communication_records_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "cases"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "government_communication_records" ADD CONSTRAINT "government_communication_records_sourceInstitutionId_fkey" FOREIGN KEY ("sourceInstitutionId") REFERENCES "institutions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "government_communication_records" ADD CONSTRAINT "government_communication_records_caseReferralId_fkey" FOREIGN KEY ("caseReferralId") REFERENCES "case_referrals"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "government_communication_records" ADD CONSTRAINT "government_communication_records_retainedDeterminationForExternalAuthorityId_fkey" FOREIGN KEY ("retainedDeterminationForExternalAuthorityId") REFERENCES "external_authorities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "government_communication_documents" ADD CONSTRAINT "government_communication_documents_governmentCommunicationId_fkey" FOREIGN KEY ("governmentCommunicationId") REFERENCES "government_communication_records"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "government_communication_documents" ADD CONSTRAINT "government_communication_documents_documentRecordId_fkey" FOREIGN KEY ("documentRecordId") REFERENCES "document_records"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "government_communication_evidence" ADD CONSTRAINT "government_communication_evidence_governmentCommunicationId_fkey" FOREIGN KEY ("governmentCommunicationId") REFERENCES "government_communication_records"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "government_communication_evidence" ADD CONSTRAINT "government_communication_evidence_evidenceRecordId_fkey" FOREIGN KEY ("evidenceRecordId") REFERENCES "evidence_records"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "professional_review_records" ADD CONSTRAINT "professional_review_records_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "cases"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "professional_review_records" ADD CONSTRAINT "professional_review_records_professionalIdentityId_fkey" FOREIGN KEY ("professionalIdentityId") REFERENCES "identities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "professional_review_evidence" ADD CONSTRAINT "professional_review_evidence_professionalReviewId_fkey" FOREIGN KEY ("professionalReviewId") REFERENCES "professional_review_records"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "professional_review_evidence" ADD CONSTRAINT "professional_review_evidence_evidenceRecordId_fkey" FOREIGN KEY ("evidenceRecordId") REFERENCES "evidence_records"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "inspection_records" ADD CONSTRAINT "inspection_records_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "cases"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "inspection_records" ADD CONSTRAINT "inspection_records_functionAuthorityRecordId_fkey" FOREIGN KEY ("functionAuthorityRecordId") REFERENCES "function_authority_records"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "inspection_inspectors" ADD CONSTRAINT "inspection_inspectors_inspectionId_fkey" FOREIGN KEY ("inspectionId") REFERENCES "inspection_records"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "inspection_inspectors" ADD CONSTRAINT "inspection_inspectors_officeholderId_fkey" FOREIGN KEY ("officeholderId") REFERENCES "officeholders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "inspection_inspectors" ADD CONSTRAINT "inspection_inspectors_identityId_fkey" FOREIGN KEY ("identityId") REFERENCES "identities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "inspection_evidence_items" ADD CONSTRAINT "inspection_evidence_items_inspectionId_fkey" FOREIGN KEY ("inspectionId") REFERENCES "inspection_records"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "inspection_evidence_items" ADD CONSTRAINT "inspection_evidence_items_evidenceRecordId_fkey" FOREIGN KEY ("evidenceRecordId") REFERENCES "evidence_records"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "evidence_custody_events" ADD CONSTRAINT "evidence_custody_events_evidenceRecordId_fkey" FOREIGN KEY ("evidenceRecordId") REFERENCES "evidence_records"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "evidence_custody_events" ADD CONSTRAINT "evidence_custody_events_documentRecordId_fkey" FOREIGN KEY ("documentRecordId") REFERENCES "document_records"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "evidence_custody_events" ADD CONSTRAINT "evidence_custody_events_inspectionEvidenceItemId_fkey" FOREIGN KEY ("inspectionEvidenceItemId") REFERENCES "inspection_evidence_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "evidence_custody_events" ADD CONSTRAINT "evidence_custody_events_custodianIdentityId_fkey" FOREIGN KEY ("custodianIdentityId") REFERENCES "identities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "evidence_custody_events" ADD CONSTRAINT "evidence_custody_events_custodianOfficeholderId_fkey" FOREIGN KEY ("custodianOfficeholderId") REFERENCES "officeholders"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "evidence_custody_events" ADD CONSTRAINT "evidence_custody_events_witnessIdentityId_fkey" FOREIGN KEY ("witnessIdentityId") REFERENCES "identities"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "evidence_custody_events" ADD CONSTRAINT "evidence_custody_events_witnessOfficeholderId_fkey" FOREIGN KEY ("witnessOfficeholderId") REFERENCES "officeholders"("id") ON DELETE SET NULL ON UPDATE CASCADE;
