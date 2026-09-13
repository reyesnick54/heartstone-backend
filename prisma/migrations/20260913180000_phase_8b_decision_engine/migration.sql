-- Phase 8A/8B: Decision catalog, readiness assessment, and authorized government decisions

-- CreateEnum
CREATE TYPE "DecisionTypeVersionStatus" AS ENUM ('DRAFT', 'ACTIVE', 'SUSPENDED', 'SUPERSEDED', 'RETIRED');

-- CreateEnum
CREATE TYPE "DecisionReadinessOutcome" AS ENUM ('READY', 'NOT_READY', 'BLOCKED', 'SAFE_HALT', 'REQUIRES_EXTERNAL_DETERMINATION', 'REQUIRES_PROFESSIONAL_REVIEW', 'REQUIRES_ADDITIONAL_EVIDENCE', 'REQUIRES_CO_APPROVAL');

-- CreateEnum
CREATE TYPE "GovernmentDecisionStatus" AS ENUM ('RECORDED', 'FORMALIZATION_PENDING', 'SIGNATURE_PENDING', 'SEAL_PENDING', 'NOTICE_PENDING', 'CONDITIONS_PRECEDENT_PENDING', 'EFFECTIVE', 'SUPERSEDED', 'SET_ASIDE', 'WITHDRAWN_BY_AUTHORIZED_PROCESS');

-- CreateEnum
CREATE TYPE "DecisionParticipantRole" AS ENUM ('DECISION_MAKER', 'CO_APPROVER', 'RECUSED', 'OBSERVER');

-- AlterEnum
ALTER TYPE "CaseStatus" ADD VALUE 'DECIDED' AFTER 'DECISION_PENDING';

-- CreateTable
CREATE TABLE "decision_types" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "governmentServiceId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "decision_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "decision_type_versions" (
    "id" UUID NOT NULL,
    "decisionTypeId" UUID NOT NULL,
    "version" TEXT NOT NULL,
    "status" "DecisionTypeVersionStatus" NOT NULL DEFAULT 'DRAFT',
    "governmentServiceVersionId" UUID NOT NULL,
    "functionAuthorityRecordId" UUID NOT NULL,
    "permissibleOutcomes" JSONB NOT NULL DEFAULT '[]',
    "requirementsConfig" JSONB NOT NULL DEFAULT '{}',
    "effectiveFrom" TIMESTAMP(3),
    "effectiveUntil" TIMESTAMP(3),
    "supersededById" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "decision_type_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "decision_readiness_assessments" (
    "id" UUID NOT NULL,
    "assessmentNumber" TEXT NOT NULL,
    "caseId" UUID NOT NULL,
    "decisionTypeVersionId" UUID NOT NULL,
    "proposedDecisionMakerIdentityId" UUID NOT NULL,
    "proposedDecisionMakerOfficeholderId" UUID,
    "requestedOutcome" TEXT NOT NULL,
    "assessedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "outcome" "DecisionReadinessOutcome" NOT NULL,
    "reasonCodes" JSONB NOT NULL DEFAULT '[]',
    "contextSnapshot" JSONB NOT NULL DEFAULT '{}',
    "evidencePacketVersionId" UUID,
    "masterAdministrativeFileId" UUID,
    "authorityEvaluationRecordId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "decision_readiness_assessments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "decision_participants" (
    "id" UUID NOT NULL,
    "readinessAssessmentId" UUID NOT NULL,
    "identityId" UUID NOT NULL,
    "officeholderId" UUID,
    "appointmentId" UUID,
    "role" "DecisionParticipantRole" NOT NULL,
    "isConflicted" BOOLEAN NOT NULL DEFAULT false,
    "isRecused" BOOLEAN NOT NULL DEFAULT false,
    "hasApproved" BOOLEAN NOT NULL DEFAULT false,
    "approvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "decision_participants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "decision_preparation_records" (
    "id" UUID NOT NULL,
    "caseId" UUID NOT NULL,
    "decisionTypeVersionId" UUID NOT NULL,
    "editorIdentityId" UUID NOT NULL,
    "proposedFindings" TEXT,
    "proposedReasons" TEXT,
    "proposedOutcome" TEXT,
    "recommendation" TEXT,
    "aiAssistanceMetadata" JSONB NOT NULL DEFAULT '{}',
    "isNonFinal" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "decision_preparation_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "government_decisions" (
    "id" UUID NOT NULL,
    "decisionNumber" TEXT NOT NULL,
    "caseId" UUID NOT NULL,
    "masterAdministrativeFileId" UUID NOT NULL,
    "decisionTypeVersionId" UUID NOT NULL,
    "functionAuthorityRecordId" UUID NOT NULL,
    "authorityEvaluationRecordId" UUID NOT NULL,
    "decisionReadinessAssessmentId" UUID NOT NULL,
    "evidencePacketVersionId" UUID NOT NULL,
    "decisionMakerIdentityId" UUID NOT NULL,
    "decisionMakerOfficeholderId" UUID NOT NULL,
    "appointmentId" UUID NOT NULL,
    "delegationId" UUID,
    "institutionId" UUID NOT NULL,
    "departmentId" UUID NOT NULL,
    "matterDecided" TEXT NOT NULL,
    "outcome" TEXT NOT NULL,
    "decisionStatus" "GovernmentDecisionStatus" NOT NULL DEFAULT 'RECORDED',
    "decidedAt" TIMESTAMP(3) NOT NULL,
    "effectiveAt" TIMESTAMP(3),
    "effectiveUntil" TIMESTAMP(3),
    "integrityHash" TEXT NOT NULL,
    "explicitIntentConfirmed" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "government_decisions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "decision_types_code_key" ON "decision_types"("code");

-- CreateIndex
CREATE INDEX "decision_types_governmentServiceId_idx" ON "decision_types"("governmentServiceId");

-- CreateIndex
CREATE UNIQUE INDEX "decision_type_versions_decisionTypeId_version_key" ON "decision_type_versions"("decisionTypeId", "version");

-- CreateIndex
CREATE INDEX "decision_type_versions_decisionTypeId_idx" ON "decision_type_versions"("decisionTypeId");

-- CreateIndex
CREATE INDEX "decision_type_versions_governmentServiceVersionId_idx" ON "decision_type_versions"("governmentServiceVersionId");

-- CreateIndex
CREATE INDEX "decision_type_versions_functionAuthorityRecordId_idx" ON "decision_type_versions"("functionAuthorityRecordId");

-- CreateIndex
CREATE INDEX "decision_type_versions_status_idx" ON "decision_type_versions"("status");

-- CreateIndex
CREATE UNIQUE INDEX "decision_readiness_assessments_assessmentNumber_key" ON "decision_readiness_assessments"("assessmentNumber");

-- CreateIndex
CREATE INDEX "decision_readiness_assessments_caseId_idx" ON "decision_readiness_assessments"("caseId");

-- CreateIndex
CREATE INDEX "decision_readiness_assessments_decisionTypeVersionId_idx" ON "decision_readiness_assessments"("decisionTypeVersionId");

-- CreateIndex
CREATE INDEX "decision_readiness_assessments_outcome_idx" ON "decision_readiness_assessments"("outcome");

-- CreateIndex
CREATE INDEX "decision_readiness_assessments_assessedAt_idx" ON "decision_readiness_assessments"("assessedAt");

-- CreateIndex
CREATE INDEX "decision_participants_readinessAssessmentId_idx" ON "decision_participants"("readinessAssessmentId");

-- CreateIndex
CREATE INDEX "decision_participants_identityId_idx" ON "decision_participants"("identityId");

-- CreateIndex
CREATE INDEX "decision_preparation_records_caseId_idx" ON "decision_preparation_records"("caseId");

-- CreateIndex
CREATE INDEX "decision_preparation_records_decisionTypeVersionId_idx" ON "decision_preparation_records"("decisionTypeVersionId");

-- CreateIndex
CREATE UNIQUE INDEX "government_decisions_decisionNumber_key" ON "government_decisions"("decisionNumber");

-- CreateIndex
CREATE INDEX "government_decisions_caseId_idx" ON "government_decisions"("caseId");

-- CreateIndex
CREATE INDEX "government_decisions_decisionTypeVersionId_idx" ON "government_decisions"("decisionTypeVersionId");

-- CreateIndex
CREATE INDEX "government_decisions_decisionStatus_idx" ON "government_decisions"("decisionStatus");

-- CreateIndex
CREATE INDEX "government_decisions_decidedAt_idx" ON "government_decisions"("decidedAt");

-- AddForeignKey
ALTER TABLE "decision_types" ADD CONSTRAINT "decision_types_governmentServiceId_fkey" FOREIGN KEY ("governmentServiceId") REFERENCES "government_services"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "decision_type_versions" ADD CONSTRAINT "decision_type_versions_decisionTypeId_fkey" FOREIGN KEY ("decisionTypeId") REFERENCES "decision_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "decision_type_versions" ADD CONSTRAINT "decision_type_versions_governmentServiceVersionId_fkey" FOREIGN KEY ("governmentServiceVersionId") REFERENCES "government_service_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "decision_type_versions" ADD CONSTRAINT "decision_type_versions_functionAuthorityRecordId_fkey" FOREIGN KEY ("functionAuthorityRecordId") REFERENCES "function_authority_records"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "decision_type_versions" ADD CONSTRAINT "decision_type_versions_supersededById_fkey" FOREIGN KEY ("supersededById") REFERENCES "decision_type_versions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "decision_readiness_assessments" ADD CONSTRAINT "decision_readiness_assessments_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "cases"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "decision_readiness_assessments" ADD CONSTRAINT "decision_readiness_assessments_decisionTypeVersionId_fkey" FOREIGN KEY ("decisionTypeVersionId") REFERENCES "decision_type_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "decision_readiness_assessments" ADD CONSTRAINT "decision_readiness_assessments_proposedDecisionMakerIdentityId_fkey" FOREIGN KEY ("proposedDecisionMakerIdentityId") REFERENCES "identities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "decision_readiness_assessments" ADD CONSTRAINT "decision_readiness_assessments_proposedDecisionMakerOfficeholderId_fkey" FOREIGN KEY ("proposedDecisionMakerOfficeholderId") REFERENCES "officeholders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "decision_readiness_assessments" ADD CONSTRAINT "decision_readiness_assessments_evidencePacketVersionId_fkey" FOREIGN KEY ("evidencePacketVersionId") REFERENCES "evidence_packet_versions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "decision_readiness_assessments" ADD CONSTRAINT "decision_readiness_assessments_masterAdministrativeFileId_fkey" FOREIGN KEY ("masterAdministrativeFileId") REFERENCES "master_administrative_files"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "decision_readiness_assessments" ADD CONSTRAINT "decision_readiness_assessments_authorityEvaluationRecordId_fkey" FOREIGN KEY ("authorityEvaluationRecordId") REFERENCES "authority_evaluation_records"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "decision_participants" ADD CONSTRAINT "decision_participants_readinessAssessmentId_fkey" FOREIGN KEY ("readinessAssessmentId") REFERENCES "decision_readiness_assessments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "decision_participants" ADD CONSTRAINT "decision_participants_identityId_fkey" FOREIGN KEY ("identityId") REFERENCES "identities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "decision_participants" ADD CONSTRAINT "decision_participants_officeholderId_fkey" FOREIGN KEY ("officeholderId") REFERENCES "officeholders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "decision_participants" ADD CONSTRAINT "decision_participants_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "appointments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "decision_preparation_records" ADD CONSTRAINT "decision_preparation_records_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "cases"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "decision_preparation_records" ADD CONSTRAINT "decision_preparation_records_decisionTypeVersionId_fkey" FOREIGN KEY ("decisionTypeVersionId") REFERENCES "decision_type_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "decision_preparation_records" ADD CONSTRAINT "decision_preparation_records_editorIdentityId_fkey" FOREIGN KEY ("editorIdentityId") REFERENCES "identities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "government_decisions" ADD CONSTRAINT "government_decisions_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "cases"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "government_decisions" ADD CONSTRAINT "government_decisions_masterAdministrativeFileId_fkey" FOREIGN KEY ("masterAdministrativeFileId") REFERENCES "master_administrative_files"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "government_decisions" ADD CONSTRAINT "government_decisions_decisionTypeVersionId_fkey" FOREIGN KEY ("decisionTypeVersionId") REFERENCES "decision_type_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "government_decisions" ADD CONSTRAINT "government_decisions_functionAuthorityRecordId_fkey" FOREIGN KEY ("functionAuthorityRecordId") REFERENCES "function_authority_records"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "government_decisions" ADD CONSTRAINT "government_decisions_authorityEvaluationRecordId_fkey" FOREIGN KEY ("authorityEvaluationRecordId") REFERENCES "authority_evaluation_records"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "government_decisions" ADD CONSTRAINT "government_decisions_decisionReadinessAssessmentId_fkey" FOREIGN KEY ("decisionReadinessAssessmentId") REFERENCES "decision_readiness_assessments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "government_decisions" ADD CONSTRAINT "government_decisions_evidencePacketVersionId_fkey" FOREIGN KEY ("evidencePacketVersionId") REFERENCES "evidence_packet_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "government_decisions" ADD CONSTRAINT "government_decisions_decisionMakerIdentityId_fkey" FOREIGN KEY ("decisionMakerIdentityId") REFERENCES "identities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "government_decisions" ADD CONSTRAINT "government_decisions_decisionMakerOfficeholderId_fkey" FOREIGN KEY ("decisionMakerOfficeholderId") REFERENCES "officeholders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "government_decisions" ADD CONSTRAINT "government_decisions_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "appointments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "government_decisions" ADD CONSTRAINT "government_decisions_delegationId_fkey" FOREIGN KEY ("delegationId") REFERENCES "delegations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "government_decisions" ADD CONSTRAINT "government_decisions_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "institutions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "government_decisions" ADD CONSTRAINT "government_decisions_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "departments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
