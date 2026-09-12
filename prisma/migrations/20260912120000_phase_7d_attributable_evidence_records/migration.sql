-- Phase 7D: Attributable review, government, professional, and inspection records

-- CreateEnum
CREATE TYPE "DocumentAuthenticationStatus" AS ENUM ('UNAUTHENTICATED', 'AUTHENTICATED', 'REJECTED');
CREATE TYPE "EvidenceRecordStatus" AS ENUM ('REGISTERED', 'UNDER_REVIEW', 'SUPERSEDED', 'ARCHIVED');
CREATE TYPE "DepartmentalReviewStatus" AS ENUM ('DRAFT', 'IN_PROGRESS', 'COMPLETED', 'SUPERSEDED');
CREATE TYPE "GovernmentCommunicationCategory" AS ENUM ('RECEIPT', 'ACKNOWLEDGMENT', 'INFORMATION', 'GUIDANCE', 'CONSULTATION', 'REQUEST', 'RESPONSE', 'CONCURRENCE', 'OBJECTION', 'RETAINED_DETERMINATION', 'SUPERVISORY_FINDING', 'INSPECTION_FINDING', 'OTHER');
CREATE TYPE "GovernmentCommunicationAuthenticationStatus" AS ENUM ('UNAUTHENTICATED', 'AUTHENTICATED', 'REJECTED');
CREATE TYPE "ProfessionalOpinionStatus" AS ENUM ('DRAFT', 'ISSUED', 'SUPERSEDED', 'WITHDRAWN');
CREATE TYPE "ProfessionalSignatureSource" AS ENUM ('CONTROLLED_PROFESSIONAL_ACTION', 'AI_ASSISTANCE', 'OTHER');
CREATE TYPE "InspectionType" AS ENUM ('SITE', 'DESKTOP', 'REMOTE', 'FOLLOW_UP', 'OTHER');
CREATE TYPE "InspectionStatus" AS ENUM ('SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');
CREATE TYPE "InspectionFindingClassification" AS ENUM ('OBSERVATION', 'CONDITION', 'NON_COMPLIANCE', 'OTHER');
CREATE TYPE "EvidenceCustodyEventType" AS ENUM ('COLLECTED', 'RECEIVED', 'TRANSFERRED', 'OPENED', 'SAMPLED', 'COPIED', 'ANALYZED', 'SEALED', 'UNSEALED', 'RETURNED', 'ARCHIVED', 'DISPOSED_AUTHORIZED');
CREATE TYPE "EvidenceIntegrityState" AS ENUM ('INTACT', 'COMPROMISED', 'UNKNOWN');

-- AlterTable cases
ALTER TABLE "cases" ADD COLUMN IF NOT EXISTS "workflowVersionId" UUID;
ALTER TABLE "cases" ADD COLUMN IF NOT EXISTS "configurationFingerprint" TEXT;
ALTER TABLE "cases" ADD COLUMN IF NOT EXISTS "legalStatusLabel" TEXT;
ALTER TABLE "cases" ADD COLUMN IF NOT EXISTS "version" INTEGER NOT NULL DEFAULT 1;

-- CreateTable document_records
CREATE TABLE "document_records" (
    "id" UUID NOT NULL,
    "caseId" UUID NOT NULL,
    "documentReference" TEXT NOT NULL,
    "title" TEXT,
    "description" TEXT,
    "classification" "CaseRecordClassification" NOT NULL DEFAULT 'OFFICIAL',
    "authenticationStatus" "DocumentAuthenticationStatus" NOT NULL DEFAULT 'UNAUTHENTICATED',
    "sourceInstitutionId" UUID,
    "receivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "document_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable evidence_records
CREATE TABLE "evidence_records" (
    "id" UUID NOT NULL,
    "caseId" UUID NOT NULL,
    "documentRecordId" UUID,
    "evidenceReference" TEXT NOT NULL,
    "description" TEXT,
    "classification" "CaseRecordClassification" NOT NULL DEFAULT 'OFFICIAL',
    "status" "EvidenceRecordStatus" NOT NULL DEFAULT 'REGISTERED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "evidence_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable departmental_review_records
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

-- CreateTable departmental_review_evidence
CREATE TABLE "departmental_review_evidence" (
    "id" UUID NOT NULL,
    "departmentalReviewId" UUID NOT NULL,
    "evidenceRecordId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "departmental_review_evidence_pkey" PRIMARY KEY ("id")
);

-- CreateTable government_communication_records
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

-- CreateTable government_communication_documents
CREATE TABLE "government_communication_documents" (
    "id" UUID NOT NULL,
    "governmentCommunicationId" UUID NOT NULL,
    "documentRecordId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "government_communication_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable government_communication_evidence
CREATE TABLE "government_communication_evidence" (
    "id" UUID NOT NULL,
    "governmentCommunicationId" UUID NOT NULL,
    "evidenceRecordId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "government_communication_evidence_pkey" PRIMARY KEY ("id")
);

-- CreateTable professional_review_records
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

-- CreateTable professional_review_evidence
CREATE TABLE "professional_review_evidence" (
    "id" UUID NOT NULL,
    "professionalReviewId" UUID NOT NULL,
    "evidenceRecordId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "professional_review_evidence_pkey" PRIMARY KEY ("id")
);

-- CreateTable inspection_records
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

-- CreateTable inspection_inspectors
CREATE TABLE "inspection_inspectors" (
    "id" UUID NOT NULL,
    "inspectionId" UUID NOT NULL,
    "officeholderId" UUID NOT NULL,
    "identityId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "inspection_inspectors_pkey" PRIMARY KEY ("id")
);

-- CreateTable inspection_evidence_items
CREATE TABLE "inspection_evidence_items" (
    "id" UUID NOT NULL,
    "inspectionId" UUID NOT NULL,
    "evidenceRecordId" UUID NOT NULL,
    "findingClassification" "InspectionFindingClassification" NOT NULL DEFAULT 'OBSERVATION',
    "observationNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "inspection_evidence_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable evidence_custody_events
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

-- Indexes and constraints
CREATE UNIQUE INDEX "departmental_review_records_caseId_departmentId_reviewVersion_key" ON "departmental_review_records"("caseId", "departmentId", "reviewVersion");
CREATE UNIQUE INDEX "departmental_review_evidence_departmentalReviewId_evidenceRecordId_key" ON "departmental_review_evidence"("departmentalReviewId", "evidenceRecordId");
CREATE UNIQUE INDEX "government_communication_documents_governmentCommunicationId_documentRecordId_key" ON "government_communication_documents"("governmentCommunicationId", "documentRecordId");
CREATE UNIQUE INDEX "government_communication_evidence_governmentCommunicationId_evidenceRecordId_key" ON "government_communication_evidence"("governmentCommunicationId", "evidenceRecordId");
CREATE UNIQUE INDEX "professional_review_evidence_professionalReviewId_evidenceRecordId_key" ON "professional_review_evidence"("professionalReviewId", "evidenceRecordId");
CREATE UNIQUE INDEX "inspection_inspectors_inspectionId_officeholderId_key" ON "inspection_inspectors"("inspectionId", "officeholderId");
CREATE UNIQUE INDEX "inspection_evidence_items_inspectionId_evidenceRecordId_key" ON "inspection_evidence_items"("inspectionId", "evidenceRecordId");

ALTER TABLE "document_records" ADD CONSTRAINT "document_records_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "cases"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "evidence_records" ADD CONSTRAINT "evidence_records_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "cases"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "departmental_review_records" ADD CONSTRAINT "departmental_review_records_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "cases"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "government_communication_records" ADD CONSTRAINT "government_communication_records_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "cases"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "professional_review_records" ADD CONSTRAINT "professional_review_records_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "cases"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "inspection_records" ADD CONSTRAINT "inspection_records_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "cases"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
