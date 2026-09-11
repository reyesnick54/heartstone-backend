-- CreateEnum
CREATE TYPE "AuthorityClassification" AS ENUM ('ABSEZ_OWNED', 'ABSEZ_DELEGATED', 'EXPRESSLY_RETAINED_NATIONAL', 'SHARED_OR_COORDINATED', 'RESERVED_PROFESSIONAL', 'ADMINISTRATIVE_SUPPORT', 'TECHNOLOGY_ASSISTED', 'PROHIBITED_OR_UNAUTHORIZED');

-- CreateEnum
CREATE TYPE "ControlledFunctionClass" AS ENUM ('LICENSING', 'APPROVAL', 'INSPECTION', 'REGISTRATION', 'ENFORCEMENT', 'ADVISORY', 'ADMINISTRATIVE', 'INFORMATIONAL', 'OTHER');

-- CreateEnum
CREATE TYPE "FunctionAuthorityLifecycleStatus" AS ENUM ('DRAFT', 'PENDING_ACTIVATION', 'ACTIVE', 'SUSPENDED', 'INACTIVE', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "AuthorityActionType" AS ENUM ('RETRIEVE', 'SUMMARIZE', 'PREPARE', 'CHECK', 'DECIDE', 'SIGN', 'ISSUE', 'APPROVE', 'CONSULT', 'SUPERVISE', 'LIAISE');

-- CreateEnum
CREATE TYPE "GoverningSourceStatus" AS ENUM ('DRAFT', 'AUTHENTICATED', 'REVOKED', 'SUPERSEDED', 'CONFLICT_DETECTED');

-- CreateEnum
CREATE TYPE "GoverningSourceRelationshipType" AS ENUM ('SUPERSEDES', 'AMENDS', 'IMPLEMENTS', 'COORDINATES_WITH', 'CONFLICTS_WITH');

-- CreateEnum
CREATE TYPE "AuthorityConditionType" AS ENUM ('EVIDENCE_REQUIRED', 'QUALIFICATION_REQUIRED', 'TRANSACTION_LIMIT', 'SCOPE_LIMIT', 'SECOND_APPROVAL_REQUIRED', 'CONSULTATION_REQUIRED', 'SUPERVISION_REQUIRED', 'LIAISON_BOUNDARY', 'SELF_APPROVAL_PROHIBITED', 'CONFLICT_CHECK', 'RECUSAL_CHECK');

-- CreateEnum
CREATE TYPE "AuthorityDependencyType" AS ENUM ('RETAINED_NATIONAL_DETERMINATION', 'PROFESSIONAL_QUALIFICATION', 'EXTERNAL_DATA_ACCESS');

-- CreateEnum
CREATE TYPE "AuthorityEvaluationOutcome" AS ENUM ('ALLOW', 'DENY', 'REQUIRES_EXTERNAL_DETERMINATION', 'SAFE_HALT');

-- CreateEnum
CREATE TYPE "SodRuleType" AS ENUM ('SEGREGATION_OF_DUTY', 'SELF_APPROVAL', 'MISSING_SECOND_APPROVAL');

-- CreateEnum
CREATE TYPE "FunctionAssignmentStatus" AS ENUM ('PENDING', 'ACTIVE', 'SUSPENDED', 'REVOKED', 'ENDED');

-- CreateEnum
CREATE TYPE "RetainedNationalDeterminationStatus" AS ENUM ('PENDING', 'ACTIVE', 'REVOKED', 'EXPIRED');

-- CreateTable
CREATE TABLE "function_authority_records" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "classification" "AuthorityClassification" NOT NULL,
    "functionClass" "ControlledFunctionClass" NOT NULL,
    "lifecycleStatus" "FunctionAuthorityLifecycleStatus" NOT NULL DEFAULT 'DRAFT',
    "institutionId" UUID,
    "officeId" UUID,
    "requiresDelegation" BOOLEAN NOT NULL DEFAULT false,
    "requiresAppointment" BOOLEAN NOT NULL DEFAULT true,
    "activatedAt" TIMESTAMP(3),
    "activatedByIdentityId" UUID,
    "suspendedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "function_authority_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "governing_sources" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "versionLabel" TEXT NOT NULL,
    "status" "GoverningSourceStatus" NOT NULL DEFAULT 'DRAFT',
    "effectiveFrom" TIMESTAMP(3) NOT NULL,
    "effectiveUntil" TIMESTAMP(3),
    "authenticatedAt" TIMESTAMP(3),
    "authenticatedByIdentityId" UUID,
    "revokedAt" TIMESTAMP(3),
    "contentHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "governing_sources_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "governing_source_versions" (
    "id" UUID NOT NULL,
    "governingSourceId" UUID NOT NULL,
    "versionLabel" TEXT NOT NULL,
    "contentHash" TEXT NOT NULL,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "recordedByIdentityId" UUID,

    CONSTRAINT "governing_source_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "governing_source_relationships" (
    "id" UUID NOT NULL,
    "fromSourceId" UUID NOT NULL,
    "toSourceId" UUID NOT NULL,
    "relationshipType" "GoverningSourceRelationshipType" NOT NULL,
    "effectiveFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "effectiveUntil" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "governing_source_relationships_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "function_governing_sources" (
    "id" UUID NOT NULL,
    "functionAuthorityRecordId" UUID NOT NULL,
    "governingSourceId" UUID NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "function_governing_sources_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "function_authority_assignments" (
    "id" UUID NOT NULL,
    "functionAuthorityRecordId" UUID NOT NULL,
    "officeholderId" UUID,
    "officeId" UUID,
    "institutionId" UUID,
    "status" "FunctionAssignmentStatus" NOT NULL DEFAULT 'PENDING',
    "effectiveFrom" TIMESTAMP(3) NOT NULL,
    "effectiveUntil" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "function_authority_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "authority_action_rights" (
    "id" UUID NOT NULL,
    "functionAuthorityRecordId" UUID NOT NULL,
    "action" "AuthorityActionType" NOT NULL,
    "permitted" BOOLEAN NOT NULL DEFAULT false,
    "requiresHumanActor" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "authority_action_rights_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "authority_conditions" (
    "id" UUID NOT NULL,
    "functionAuthorityRecordId" UUID NOT NULL,
    "conditionType" "AuthorityConditionType" NOT NULL,
    "configuration" JSONB NOT NULL DEFAULT '{}',
    "isRequired" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "authority_conditions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "authority_dependencies" (
    "id" UUID NOT NULL,
    "functionAuthorityRecordId" UUID NOT NULL,
    "dependencyType" "AuthorityDependencyType" NOT NULL,
    "externalAuthorityId" UUID,
    "configuration" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "authority_dependencies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "segregation_of_duty_rules" (
    "id" UUID NOT NULL,
    "functionAuthorityRecordId" UUID NOT NULL,
    "ruleType" "SodRuleType" NOT NULL,
    "conflictingAction" "AuthorityActionType",
    "configuration" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "segregation_of_duty_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "retained_national_determinations" (
    "id" UUID NOT NULL,
    "functionAuthorityRecordId" UUID NOT NULL,
    "determinedByIdentityId" UUID NOT NULL,
    "status" "RetainedNationalDeterminationStatus" NOT NULL DEFAULT 'PENDING',
    "effectiveFrom" TIMESTAMP(3) NOT NULL,
    "effectiveUntil" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "retained_national_determinations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "authority_evaluation_records" (
    "id" UUID NOT NULL,
    "functionAuthorityRecordId" UUID NOT NULL,
    "identityId" UUID NOT NULL,
    "officeholderId" UUID,
    "appointmentId" UUID,
    "delegationId" UUID,
    "action" "AuthorityActionType" NOT NULL,
    "outcome" "AuthorityEvaluationOutcome" NOT NULL,
    "evaluatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "contextSnapshot" JSONB NOT NULL,
    "explanationCodes" JSONB NOT NULL DEFAULT '[]',
    "requestHash" TEXT NOT NULL,

    CONSTRAINT "authority_evaluation_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "function_activation_audits" (
    "id" UUID NOT NULL,
    "functionAuthorityRecordId" UUID NOT NULL,
    "previousStatus" "FunctionAuthorityLifecycleStatus" NOT NULL,
    "newStatus" "FunctionAuthorityLifecycleStatus" NOT NULL,
    "actorIdentityId" UUID NOT NULL,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "function_activation_audits_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "function_authority_records_code_key" ON "function_authority_records"("code");

-- CreateIndex
CREATE INDEX "function_authority_records_classification_idx" ON "function_authority_records"("classification");

-- CreateIndex
CREATE INDEX "function_authority_records_lifecycleStatus_idx" ON "function_authority_records"("lifecycleStatus");

-- CreateIndex
CREATE INDEX "function_authority_records_institutionId_idx" ON "function_authority_records"("institutionId");

-- CreateIndex
CREATE INDEX "function_authority_records_officeId_idx" ON "function_authority_records"("officeId");

-- CreateIndex
CREATE UNIQUE INDEX "governing_sources_code_key" ON "governing_sources"("code");

-- CreateIndex
CREATE INDEX "governing_sources_status_idx" ON "governing_sources"("status");

-- CreateIndex
CREATE INDEX "governing_sources_effectiveFrom_idx" ON "governing_sources"("effectiveFrom");

-- CreateIndex
CREATE UNIQUE INDEX "governing_source_versions_governingSourceId_versionLabel_key" ON "governing_source_versions"("governingSourceId", "versionLabel");

-- CreateIndex
CREATE INDEX "governing_source_versions_governingSourceId_idx" ON "governing_source_versions"("governingSourceId");

-- CreateIndex
CREATE INDEX "governing_source_relationships_fromSourceId_idx" ON "governing_source_relationships"("fromSourceId");

-- CreateIndex
CREATE INDEX "governing_source_relationships_toSourceId_idx" ON "governing_source_relationships"("toSourceId");

-- CreateIndex
CREATE UNIQUE INDEX "function_governing_sources_functionAuthorityRecordId_governing_key" ON "function_governing_sources"("functionAuthorityRecordId", "governingSourceId");

-- CreateIndex
CREATE INDEX "function_governing_sources_functionAuthorityRecordId_idx" ON "function_governing_sources"("functionAuthorityRecordId");

-- CreateIndex
CREATE INDEX "function_governing_sources_governingSourceId_idx" ON "function_governing_sources"("governingSourceId");

-- CreateIndex
CREATE INDEX "function_authority_assignments_functionAuthorityRecordId_idx" ON "function_authority_assignments"("functionAuthorityRecordId");

-- CreateIndex
CREATE INDEX "function_authority_assignments_officeholderId_idx" ON "function_authority_assignments"("officeholderId");

-- CreateIndex
CREATE INDEX "function_authority_assignments_officeId_idx" ON "function_authority_assignments"("officeId");

-- CreateIndex
CREATE INDEX "function_authority_assignments_institutionId_idx" ON "function_authority_assignments"("institutionId");

-- CreateIndex
CREATE UNIQUE INDEX "authority_action_rights_functionAuthorityRecordId_action_key" ON "authority_action_rights"("functionAuthorityRecordId", "action");

-- CreateIndex
CREATE INDEX "authority_action_rights_functionAuthorityRecordId_idx" ON "authority_action_rights"("functionAuthorityRecordId");

-- CreateIndex
CREATE INDEX "authority_conditions_functionAuthorityRecordId_idx" ON "authority_conditions"("functionAuthorityRecordId");

-- CreateIndex
CREATE INDEX "authority_dependencies_functionAuthorityRecordId_idx" ON "authority_dependencies"("functionAuthorityRecordId");

-- CreateIndex
CREATE INDEX "authority_dependencies_externalAuthorityId_idx" ON "authority_dependencies"("externalAuthorityId");

-- CreateIndex
CREATE INDEX "segregation_of_duty_rules_functionAuthorityRecordId_idx" ON "segregation_of_duty_rules"("functionAuthorityRecordId");

-- CreateIndex
CREATE INDEX "retained_national_determinations_functionAuthorityRecordId_idx" ON "retained_national_determinations"("functionAuthorityRecordId");

-- CreateIndex
CREATE INDEX "authority_evaluation_records_functionAuthorityRecordId_idx" ON "authority_evaluation_records"("functionAuthorityRecordId");

-- CreateIndex
CREATE INDEX "authority_evaluation_records_identityId_idx" ON "authority_evaluation_records"("identityId");

-- CreateIndex
CREATE INDEX "authority_evaluation_records_evaluatedAt_idx" ON "authority_evaluation_records"("evaluatedAt");

-- CreateIndex
CREATE INDEX "authority_evaluation_records_requestHash_idx" ON "authority_evaluation_records"("requestHash");

-- CreateIndex
CREATE INDEX "function_activation_audits_functionAuthorityRecordId_idx" ON "function_activation_audits"("functionAuthorityRecordId");

-- AddForeignKey
ALTER TABLE "function_authority_records" ADD CONSTRAINT "function_authority_records_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "institutions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "function_authority_records" ADD CONSTRAINT "function_authority_records_officeId_fkey" FOREIGN KEY ("officeId") REFERENCES "offices"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "governing_source_versions" ADD CONSTRAINT "governing_source_versions_governingSourceId_fkey" FOREIGN KEY ("governingSourceId") REFERENCES "governing_sources"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "governing_source_relationships" ADD CONSTRAINT "governing_source_relationships_fromSourceId_fkey" FOREIGN KEY ("fromSourceId") REFERENCES "governing_sources"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "governing_source_relationships" ADD CONSTRAINT "governing_source_relationships_toSourceId_fkey" FOREIGN KEY ("toSourceId") REFERENCES "governing_sources"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "function_governing_sources" ADD CONSTRAINT "function_governing_sources_functionAuthorityRecordId_fkey" FOREIGN KEY ("functionAuthorityRecordId") REFERENCES "function_authority_records"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "function_governing_sources" ADD CONSTRAINT "function_governing_sources_governingSourceId_fkey" FOREIGN KEY ("governingSourceId") REFERENCES "governing_sources"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "function_authority_assignments" ADD CONSTRAINT "function_authority_assignments_functionAuthorityRecordId_fkey" FOREIGN KEY ("functionAuthorityRecordId") REFERENCES "function_authority_records"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "function_authority_assignments" ADD CONSTRAINT "function_authority_assignments_officeholderId_fkey" FOREIGN KEY ("officeholderId") REFERENCES "officeholders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "function_authority_assignments" ADD CONSTRAINT "function_authority_assignments_officeId_fkey" FOREIGN KEY ("officeId") REFERENCES "offices"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "function_authority_assignments" ADD CONSTRAINT "function_authority_assignments_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "institutions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "authority_action_rights" ADD CONSTRAINT "authority_action_rights_functionAuthorityRecordId_fkey" FOREIGN KEY ("functionAuthorityRecordId") REFERENCES "function_authority_records"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "authority_conditions" ADD CONSTRAINT "authority_conditions_functionAuthorityRecordId_fkey" FOREIGN KEY ("functionAuthorityRecordId") REFERENCES "function_authority_records"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "authority_dependencies" ADD CONSTRAINT "authority_dependencies_functionAuthorityRecordId_fkey" FOREIGN KEY ("functionAuthorityRecordId") REFERENCES "function_authority_records"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "authority_dependencies" ADD CONSTRAINT "authority_dependencies_externalAuthorityId_fkey" FOREIGN KEY ("externalAuthorityId") REFERENCES "external_authorities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "segregation_of_duty_rules" ADD CONSTRAINT "segregation_of_duty_rules_functionAuthorityRecordId_fkey" FOREIGN KEY ("functionAuthorityRecordId") REFERENCES "function_authority_records"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "retained_national_determinations" ADD CONSTRAINT "retained_national_determinations_functionAuthorityRecordId_fkey" FOREIGN KEY ("functionAuthorityRecordId") REFERENCES "function_authority_records"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "authority_evaluation_records" ADD CONSTRAINT "authority_evaluation_records_functionAuthorityRecordId_fkey" FOREIGN KEY ("functionAuthorityRecordId") REFERENCES "function_authority_records"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "function_activation_audits" ADD CONSTRAINT "function_activation_audits_functionAuthorityRecordId_fkey" FOREIGN KEY ("functionAuthorityRecordId") REFERENCES "function_authority_records"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
