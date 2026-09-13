/*
  Warnings:

  - Made the column `governmentServiceVersionId` on table `form_definitions` required. This step will fail if there are existing NULL values in that column.

*/
-- CreateEnum
CREATE TYPE "ApplicationStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'WITHDRAWN', 'CLOSED');

-- CreateEnum
CREATE TYPE "ApplicationSubmissionStatus" AS ENUM ('SUBMITTED', 'ACKNOWLEDGED', 'SUPERSEDED');

-- CreateEnum
CREATE TYPE "CaseStatus" AS ENUM ('RECEIVED', 'INTAKE', 'COMPLETENESS_REVIEW', 'WAITING_APPLICANT', 'SUBSTANTIVE_REVIEW', 'PENDING_EXTERNAL', 'PENDING_INTERNAL', 'DECISION_PENDING', 'SAFE_HALTED', 'SUSPENDED', 'CLOSED');

-- CreateEnum
CREATE TYPE "CaseWorkflowInstanceStatus" AS ENUM ('PENDING', 'ACTIVE', 'WAITING_APPLICANT', 'WAITING_EXTERNAL', 'SAFE_HALTED', 'COMPLETED', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "CaseWorkflowStepInstanceStatus" AS ENUM ('PENDING', 'ACTIVE', 'COMPLETED', 'SKIPPED', 'FAILED', 'WAITING_APPLICANT', 'WAITING_EXTERNAL', 'SAFE_HALTED');

-- CreateEnum
CREATE TYPE "WorkflowDefinitionStatus" AS ENUM ('DRAFT', 'APPROVED', 'SUPERSEDED', 'ARCHIVED', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "WorkflowVersionStatus" AS ENUM ('DRAFT', 'APPROVED', 'SUPERSEDED', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "WorkflowStepType" AS ENUM ('INTAKE', 'COMPLETENESS_REVIEW', 'SUBSTANTIVE_REVIEW', 'EXTERNAL_REFERRAL', 'INTERNAL_COORDINATION', 'PROFESSIONAL_REVIEW', 'DECISION_GATE', 'ISSUANCE_GATE', 'PARALLEL_JOIN');

-- CreateEnum
CREATE TYPE "WorkflowTransitionJoinType" AS ENUM ('ALL_REQUIRED', 'ANY', 'FIRST_COMPLETED');

-- CreateEnum
CREATE TYPE "WorkflowStepConsequenceLevel" AS ENUM ('INFORMATIONAL', 'ADMINISTRATIVE', 'CONSEQUENTIAL');

-- CreateEnum
CREATE TYPE "CompletenessReviewOutcome" AS ENUM ('PENDING', 'INCOMPLETE', 'COMPLETE');

-- CreateEnum
CREATE TYPE "ChecklistItemReviewStatus" AS ENUM ('PRESENT', 'MISSING', 'NOT_APPLICABLE');

-- CreateEnum
CREATE TYPE "DeficiencyNoticeStatus" AS ENUM ('ISSUED', 'RESPONDED', 'SUPERSEDED', 'WITHDRAWN');

-- CreateEnum
CREATE TYPE "ApplicantInformationRequestStatus" AS ENUM ('ISSUED', 'RESPONDED', 'EXPIRED', 'WITHDRAWN');

-- CreateEnum
CREATE TYPE "CaseAssignmentStatus" AS ENUM ('ACTIVE', 'SUPERSEDED', 'COMPLETED');

-- CreateEnum
CREATE TYPE "CaseReferralType" AS ENUM ('EXTERNAL_AUTHORITY', 'INTERNAL_DEPARTMENT', 'PROFESSIONAL');

-- CreateEnum
CREATE TYPE "CaseReferralStatus" AS ENUM ('PENDING', 'ACKNOWLEDGED', 'RESPONDED', 'CLOSED', 'WITHDRAWN');

-- CreateEnum
CREATE TYPE "CaseReferralResponseAuthStatus" AS ENUM ('UNAUTHENTICATED', 'AUTHENTICATED', 'REJECTED');

-- CreateEnum
CREATE TYPE "CaseSlaClockStatus" AS ENUM ('RUNNING', 'PAUSED', 'BREACHED', 'COMPLETED');

-- CreateEnum
CREATE TYPE "CaseEscalationStatus" AS ENUM ('OPEN', 'RESOLVED', 'WITHDRAWN');

-- CreateEnum
CREATE TYPE "CaseIssueSeverity" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "CaseIssueStatus" AS ENUM ('OPEN', 'RESOLVED', 'WITHDRAWN');

-- CreateEnum
CREATE TYPE "CaseEventType" AS ENUM ('APPLICATION_RECEIVED', 'ACKNOWLEDGMENT_ISSUED', 'CASE_CREATED', 'WORKFLOW_STARTED', 'STEP_STARTED', 'STEP_COMPLETED', 'STEP_FAILED', 'COMPLETENESS_REVIEW_STARTED', 'COMPLETENESS_REVIEW_COMPLETED', 'DEFICIENCY_ISSUED', 'APPLICANT_CORRECTION_RECEIVED', 'REFERRAL_CREATED', 'REFERRAL_ACKNOWLEDGED', 'REFERRAL_RESPONSE_RECEIVED', 'ASSIGNMENT_CREATED', 'ASSIGNMENT_SUPERSEDED', 'SLA_CLOCK_STARTED', 'SLA_CLOCK_PAUSED', 'SLA_CLOCK_RESUMED', 'SLA_BREACHED', 'ESCALATION_CREATED', 'ISSUE_CREATED', 'STATUS_CHANGED', 'SAFE_HALT', 'SUSPENSION_APPLIED');

-- CreateEnum
CREATE TYPE "CaseCommunicationVisibility" AS ENUM ('INTERNAL', 'APPLICANT', 'EXTERNAL');

-- CreateEnum
CREATE TYPE "CaseMilestoneType" AS ENUM ('RECEIPT', 'ACKNOWLEDGMENT', 'COMPLETENESS_COMPLETE', 'SUBSTANTIVE_REVIEW_START', 'EXTERNAL_REFERRAL', 'DECISION_PENDING');

-- DropForeignKey
ALTER TABLE "delegations" DROP CONSTRAINT "delegations_delegatorOfficeId_fkey";

-- DropForeignKey
ALTER TABLE "delegations" DROP CONSTRAINT "delegations_delegatorOfficeholderId_fkey";

-- DropForeignKey
ALTER TABLE "delegations" DROP CONSTRAINT "delegations_recipientOfficeId_fkey";

-- DropForeignKey
ALTER TABLE "delegations" DROP CONSTRAINT "delegations_recipientOfficeholderId_fkey";

-- AlterTable
ALTER TABLE "form_definitions" ALTER COLUMN "governmentServiceVersionId" SET NOT NULL;

-- CreateTable
CREATE TABLE "applications" (
    "id" UUID NOT NULL,
    "applicationNumber" TEXT,
    "applicantIdentityId" UUID NOT NULL,
    "organizationId" UUID,
    "representativeAuthorityId" UUID,
    "governmentServiceId" UUID NOT NULL,
    "governmentServiceVersionId" UUID NOT NULL,
    "formDefinitionId" UUID NOT NULL,
    "formVersionId" UUID NOT NULL,
    "configurationFingerprint" TEXT NOT NULL,
    "applicantCategory" "ApplicantCategory" NOT NULL,
    "status" "ApplicationStatus" NOT NULL DEFAULT 'DRAFT',
    "draftAnswers" JSONB NOT NULL DEFAULT '{}',
    "idempotencyKey" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "applications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "application_submissions" (
    "id" UUID NOT NULL,
    "applicationId" UUID NOT NULL,
    "submissionNumber" TEXT NOT NULL,
    "sequenceNumber" INTEGER NOT NULL,
    "status" "ApplicationSubmissionStatus" NOT NULL DEFAULT 'SUBMITTED',
    "answersSnapshot" JSONB NOT NULL,
    "configurationFingerprint" TEXT NOT NULL,
    "governmentServiceVersionId" UUID NOT NULL,
    "formVersionId" UUID NOT NULL,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "acknowledgedAt" TIMESTAMP(3),
    "acknowledgmentReference" TEXT,
    "contentHash" TEXT NOT NULL,
    "supersededAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "application_submissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cases" (
    "id" UUID NOT NULL,
    "caseNumber" TEXT NOT NULL,
    "applicationId" UUID NOT NULL,
    "governmentServiceVersionId" UUID NOT NULL,
    "workflowVersionId" UUID NOT NULL,
    "configurationFingerprint" TEXT NOT NULL,
    "status" "CaseStatus" NOT NULL DEFAULT 'RECEIVED',
    "legalStatusLabel" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "case_status_history" (
    "id" UUID NOT NULL,
    "caseId" UUID NOT NULL,
    "fromStatus" "CaseStatus",
    "toStatus" "CaseStatus" NOT NULL,
    "reason" TEXT,
    "actorIdentityId" UUID,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "case_status_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workflow_definitions" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "governmentServiceId" UUID,
    "status" "WorkflowDefinitionStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "workflow_definitions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workflow_versions" (
    "id" UUID NOT NULL,
    "workflowDefinitionId" UUID NOT NULL,
    "version" TEXT NOT NULL,
    "status" "WorkflowVersionStatus" NOT NULL DEFAULT 'DRAFT',
    "approvedAt" TIMESTAMP(3),
    "supersededAt" TIMESTAMP(3),
    "supersededById" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "workflow_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workflow_stage_definitions" (
    "id" UUID NOT NULL,
    "workflowVersionId" UUID NOT NULL,
    "stageKey" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "description" TEXT,
    "displayOrder" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "workflow_stage_definitions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workflow_step_definitions" (
    "id" UUID NOT NULL,
    "workflowVersionId" UUID NOT NULL,
    "workflowStageDefinitionId" UUID,
    "stepKey" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "description" TEXT,
    "stepType" "WorkflowStepType" NOT NULL,
    "consequenceLevel" "WorkflowStepConsequenceLevel" NOT NULL DEFAULT 'ADMINISTRATIVE',
    "functionAuthorityRecordId" UUID,
    "authorityActionType" "AuthorityActionType",
    "displayOrder" INTEGER NOT NULL,
    "isParallel" BOOLEAN NOT NULL DEFAULT false,
    "parallelGroupKey" TEXT,
    "joinType" "WorkflowTransitionJoinType",
    "configuration" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "workflow_step_definitions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workflow_transition_definitions" (
    "id" UUID NOT NULL,
    "workflowVersionId" UUID NOT NULL,
    "fromStepId" UUID NOT NULL,
    "toStepId" UUID NOT NULL,
    "transitionKey" TEXT NOT NULL,
    "label" TEXT,
    "joinType" "WorkflowTransitionJoinType" NOT NULL DEFAULT 'ALL_REQUIRED',
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "conditionConfig" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "workflow_transition_definitions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "case_workflow_instances" (
    "id" UUID NOT NULL,
    "caseId" UUID NOT NULL,
    "workflowVersionId" UUID NOT NULL,
    "status" "CaseWorkflowInstanceStatus" NOT NULL DEFAULT 'PENDING',
    "currentStepKeys" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "haltedAt" TIMESTAMP(3),
    "haltReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "case_workflow_instances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "case_workflow_step_instances" (
    "id" UUID NOT NULL,
    "caseWorkflowInstanceId" UUID NOT NULL,
    "workflowStepDefinitionId" UUID NOT NULL,
    "status" "CaseWorkflowStepInstanceStatus" NOT NULL DEFAULT 'PENDING',
    "parallelGroupKey" TEXT,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "completedByIdentityId" UUID,
    "outcome" TEXT,
    "failureReason" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "case_workflow_step_instances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "completeness_reviews" (
    "id" UUID NOT NULL,
    "applicationSubmissionId" UUID NOT NULL,
    "caseWorkflowStepInstanceId" UUID,
    "reviewerIdentityId" UUID,
    "outcome" "CompletenessReviewOutcome" NOT NULL DEFAULT 'PENDING',
    "checklistResults" JSONB NOT NULL DEFAULT '[]',
    "notes" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "completeness_reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "deficiency_notices" (
    "id" UUID NOT NULL,
    "applicationSubmissionId" UUID NOT NULL,
    "completenessReviewId" UUID,
    "status" "DeficiencyNoticeStatus" NOT NULL DEFAULT 'ISSUED',
    "missingItems" JSONB NOT NULL DEFAULT '[]',
    "instructions" TEXT NOT NULL,
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "respondedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "deficiency_notices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "applicant_information_requests" (
    "id" UUID NOT NULL,
    "applicationSubmissionId" UUID NOT NULL,
    "status" "ApplicantInformationRequestStatus" NOT NULL DEFAULT 'ISSUED',
    "requestedItems" JSONB NOT NULL DEFAULT '[]',
    "instructions" TEXT NOT NULL,
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "respondedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "applicant_information_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "case_assignments" (
    "id" UUID NOT NULL,
    "caseId" UUID NOT NULL,
    "assigneeIdentityId" UUID NOT NULL,
    "assigneeOfficeholderId" UUID,
    "status" "CaseAssignmentStatus" NOT NULL DEFAULT 'ACTIVE',
    "assignmentRole" TEXT NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "supersededAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "case_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "case_referrals" (
    "id" UUID NOT NULL,
    "caseId" UUID NOT NULL,
    "referralType" "CaseReferralType" NOT NULL,
    "status" "CaseReferralStatus" NOT NULL DEFAULT 'PENDING',
    "externalAuthorityId" UUID,
    "institutionId" UUID,
    "authorityDependencyId" UUID,
    "referralBasis" TEXT,
    "scope" TEXT,
    "referredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "acknowledgedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "case_referrals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "case_referral_responses" (
    "id" UUID NOT NULL,
    "caseReferralId" UUID NOT NULL,
    "responseReference" TEXT NOT NULL,
    "responseSummary" TEXT NOT NULL,
    "authenticationStatus" "CaseReferralResponseAuthStatus" NOT NULL DEFAULT 'UNAUTHENTICATED',
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "satisfiesDependency" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "case_referral_responses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "case_sla_clocks" (
    "id" UUID NOT NULL,
    "caseId" UUID NOT NULL,
    "clockKey" TEXT NOT NULL,
    "status" "CaseSlaClockStatus" NOT NULL DEFAULT 'RUNNING',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "pausedAt" TIMESTAMP(3),
    "resumedAt" TIMESTAMP(3),
    "breachedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "targetDurationMs" INTEGER,
    "elapsedMs" INTEGER NOT NULL DEFAULT 0,
    "pausedDurationMs" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "case_sla_clocks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "case_escalations" (
    "id" UUID NOT NULL,
    "caseId" UUID NOT NULL,
    "status" "CaseEscalationStatus" NOT NULL DEFAULT 'OPEN',
    "reason" TEXT NOT NULL,
    "escalatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),
    "retainsAuthority" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "case_escalations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "case_issues" (
    "id" UUID NOT NULL,
    "caseId" UUID NOT NULL,
    "severity" "CaseIssueSeverity" NOT NULL DEFAULT 'MEDIUM',
    "status" "CaseIssueStatus" NOT NULL DEFAULT 'OPEN',
    "title" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "resolvedAt" TIMESTAMP(3),

    CONSTRAINT "case_issues_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "case_events" (
    "id" UUID NOT NULL,
    "caseId" UUID NOT NULL,
    "eventType" "CaseEventType" NOT NULL,
    "payload" JSONB NOT NULL DEFAULT '{}',
    "actorIdentityId" UUID,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "case_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "case_communications" (
    "id" UUID NOT NULL,
    "caseId" UUID NOT NULL,
    "visibility" "CaseCommunicationVisibility" NOT NULL DEFAULT 'INTERNAL',
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "authorIdentityId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "case_communications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "case_milestones" (
    "id" UUID NOT NULL,
    "caseId" UUID NOT NULL,
    "milestoneType" "CaseMilestoneType" NOT NULL,
    "label" TEXT NOT NULL,
    "reachedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "case_milestones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "case_public_status_projections" (
    "id" UUID NOT NULL,
    "caseId" UUID NOT NULL,
    "publicStatusLabel" TEXT NOT NULL,
    "publicMessage" TEXT,
    "lastUpdatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sourceCaseStatus" "CaseStatus" NOT NULL,

    CONSTRAINT "case_public_status_projections_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "applications_applicationNumber_key" ON "applications"("applicationNumber");

-- CreateIndex
CREATE INDEX "applications_applicantIdentityId_idx" ON "applications"("applicantIdentityId");

-- CreateIndex
CREATE INDEX "applications_governmentServiceId_idx" ON "applications"("governmentServiceId");

-- CreateIndex
CREATE INDEX "applications_governmentServiceVersionId_idx" ON "applications"("governmentServiceVersionId");

-- CreateIndex
CREATE INDEX "applications_status_idx" ON "applications"("status");

-- CreateIndex
CREATE UNIQUE INDEX "applications_applicantIdentityId_idempotencyKey_key" ON "applications"("applicantIdentityId", "idempotencyKey");

-- CreateIndex
CREATE UNIQUE INDEX "application_submissions_submissionNumber_key" ON "application_submissions"("submissionNumber");

-- CreateIndex
CREATE UNIQUE INDEX "application_submissions_acknowledgmentReference_key" ON "application_submissions"("acknowledgmentReference");

-- CreateIndex
CREATE INDEX "application_submissions_applicationId_idx" ON "application_submissions"("applicationId");

-- CreateIndex
CREATE INDEX "application_submissions_status_idx" ON "application_submissions"("status");

-- CreateIndex
CREATE UNIQUE INDEX "application_submissions_applicationId_sequenceNumber_key" ON "application_submissions"("applicationId", "sequenceNumber");

-- CreateIndex
CREATE UNIQUE INDEX "cases_caseNumber_key" ON "cases"("caseNumber");

-- CreateIndex
CREATE UNIQUE INDEX "cases_applicationId_key" ON "cases"("applicationId");

-- CreateIndex
CREATE INDEX "cases_status_idx" ON "cases"("status");

-- CreateIndex
CREATE INDEX "cases_governmentServiceVersionId_idx" ON "cases"("governmentServiceVersionId");

-- CreateIndex
CREATE INDEX "cases_workflowVersionId_idx" ON "cases"("workflowVersionId");

-- CreateIndex
CREATE INDEX "case_status_history_caseId_idx" ON "case_status_history"("caseId");

-- CreateIndex
CREATE INDEX "case_status_history_recordedAt_idx" ON "case_status_history"("recordedAt");

-- CreateIndex
CREATE UNIQUE INDEX "workflow_definitions_code_key" ON "workflow_definitions"("code");

-- CreateIndex
CREATE INDEX "workflow_definitions_governmentServiceId_idx" ON "workflow_definitions"("governmentServiceId");

-- CreateIndex
CREATE INDEX "workflow_definitions_status_idx" ON "workflow_definitions"("status");

-- CreateIndex
CREATE INDEX "workflow_versions_workflowDefinitionId_idx" ON "workflow_versions"("workflowDefinitionId");

-- CreateIndex
CREATE INDEX "workflow_versions_status_idx" ON "workflow_versions"("status");

-- CreateIndex
CREATE UNIQUE INDEX "workflow_versions_workflowDefinitionId_version_key" ON "workflow_versions"("workflowDefinitionId", "version");

-- CreateIndex
CREATE INDEX "workflow_stage_definitions_workflowVersionId_idx" ON "workflow_stage_definitions"("workflowVersionId");

-- CreateIndex
CREATE UNIQUE INDEX "workflow_stage_definitions_workflowVersionId_stageKey_key" ON "workflow_stage_definitions"("workflowVersionId", "stageKey");

-- CreateIndex
CREATE INDEX "workflow_step_definitions_workflowVersionId_idx" ON "workflow_step_definitions"("workflowVersionId");

-- CreateIndex
CREATE INDEX "workflow_step_definitions_functionAuthorityRecordId_idx" ON "workflow_step_definitions"("functionAuthorityRecordId");

-- CreateIndex
CREATE UNIQUE INDEX "workflow_step_definitions_workflowVersionId_stepKey_key" ON "workflow_step_definitions"("workflowVersionId", "stepKey");

-- CreateIndex
CREATE INDEX "workflow_transition_definitions_workflowVersionId_idx" ON "workflow_transition_definitions"("workflowVersionId");

-- CreateIndex
CREATE INDEX "workflow_transition_definitions_fromStepId_idx" ON "workflow_transition_definitions"("fromStepId");

-- CreateIndex
CREATE INDEX "workflow_transition_definitions_toStepId_idx" ON "workflow_transition_definitions"("toStepId");

-- CreateIndex
CREATE UNIQUE INDEX "workflow_transition_definitions_workflowVersionId_transitio_key" ON "workflow_transition_definitions"("workflowVersionId", "transitionKey");

-- CreateIndex
CREATE UNIQUE INDEX "case_workflow_instances_caseId_key" ON "case_workflow_instances"("caseId");

-- CreateIndex
CREATE INDEX "case_workflow_instances_workflowVersionId_idx" ON "case_workflow_instances"("workflowVersionId");

-- CreateIndex
CREATE INDEX "case_workflow_instances_status_idx" ON "case_workflow_instances"("status");

-- CreateIndex
CREATE INDEX "case_workflow_step_instances_caseWorkflowInstanceId_idx" ON "case_workflow_step_instances"("caseWorkflowInstanceId");

-- CreateIndex
CREATE INDEX "case_workflow_step_instances_status_idx" ON "case_workflow_step_instances"("status");

-- CreateIndex
CREATE UNIQUE INDEX "case_workflow_step_instances_caseWorkflowInstanceId_workflo_key" ON "case_workflow_step_instances"("caseWorkflowInstanceId", "workflowStepDefinitionId");

-- CreateIndex
CREATE INDEX "completeness_reviews_applicationSubmissionId_idx" ON "completeness_reviews"("applicationSubmissionId");

-- CreateIndex
CREATE INDEX "completeness_reviews_outcome_idx" ON "completeness_reviews"("outcome");

-- CreateIndex
CREATE INDEX "deficiency_notices_applicationSubmissionId_idx" ON "deficiency_notices"("applicationSubmissionId");

-- CreateIndex
CREATE INDEX "deficiency_notices_status_idx" ON "deficiency_notices"("status");

-- CreateIndex
CREATE INDEX "applicant_information_requests_applicationSubmissionId_idx" ON "applicant_information_requests"("applicationSubmissionId");

-- CreateIndex
CREATE INDEX "applicant_information_requests_status_idx" ON "applicant_information_requests"("status");

-- CreateIndex
CREATE INDEX "case_assignments_caseId_idx" ON "case_assignments"("caseId");

-- CreateIndex
CREATE INDEX "case_assignments_assigneeIdentityId_idx" ON "case_assignments"("assigneeIdentityId");

-- CreateIndex
CREATE INDEX "case_assignments_status_idx" ON "case_assignments"("status");

-- CreateIndex
CREATE INDEX "case_referrals_caseId_idx" ON "case_referrals"("caseId");

-- CreateIndex
CREATE INDEX "case_referrals_status_idx" ON "case_referrals"("status");

-- CreateIndex
CREATE INDEX "case_referral_responses_caseReferralId_idx" ON "case_referral_responses"("caseReferralId");

-- CreateIndex
CREATE INDEX "case_sla_clocks_caseId_idx" ON "case_sla_clocks"("caseId");

-- CreateIndex
CREATE INDEX "case_sla_clocks_status_idx" ON "case_sla_clocks"("status");

-- CreateIndex
CREATE UNIQUE INDEX "case_sla_clocks_caseId_clockKey_key" ON "case_sla_clocks"("caseId", "clockKey");

-- CreateIndex
CREATE INDEX "case_escalations_caseId_idx" ON "case_escalations"("caseId");

-- CreateIndex
CREATE INDEX "case_escalations_status_idx" ON "case_escalations"("status");

-- CreateIndex
CREATE INDEX "case_issues_caseId_idx" ON "case_issues"("caseId");

-- CreateIndex
CREATE INDEX "case_issues_status_idx" ON "case_issues"("status");

-- CreateIndex
CREATE INDEX "case_events_caseId_idx" ON "case_events"("caseId");

-- CreateIndex
CREATE INDEX "case_events_eventType_idx" ON "case_events"("eventType");

-- CreateIndex
CREATE INDEX "case_events_recordedAt_idx" ON "case_events"("recordedAt");

-- CreateIndex
CREATE INDEX "case_communications_caseId_idx" ON "case_communications"("caseId");

-- CreateIndex
CREATE INDEX "case_communications_visibility_idx" ON "case_communications"("visibility");

-- CreateIndex
CREATE INDEX "case_milestones_caseId_idx" ON "case_milestones"("caseId");

-- CreateIndex
CREATE UNIQUE INDEX "case_public_status_projections_caseId_key" ON "case_public_status_projections"("caseId");

-- CreateIndex
CREATE INDEX "case_public_status_projections_sourceCaseStatus_idx" ON "case_public_status_projections"("sourceCaseStatus");

-- RenameForeignKey
ALTER TABLE "government_service_checklist_items" RENAME CONSTRAINT "government_service_checklist_items_governmentServiceVersionI_fk" TO "government_service_checklist_items_governmentServiceVersio_fkey";

-- RenameForeignKey
ALTER TABLE "government_service_eligibility_rules" RENAME CONSTRAINT "government_service_eligibility_rules_governmentServiceVersio_fk" TO "government_service_eligibility_rules_governmentServiceVers_fkey";

-- RenameForeignKey
ALTER TABLE "government_service_fee_definitions" RENAME CONSTRAINT "government_service_fee_definitions_governmentServiceVersionI_fk" TO "government_service_fee_definitions_governmentServiceVersio_fkey";

-- RenameForeignKey
ALTER TABLE "government_service_output_definitions" RENAME CONSTRAINT "government_service_output_definitions_governmentServiceVersi_fk" TO "government_service_output_definitions_governmentServiceVer_fkey";

-- RenameForeignKey
ALTER TABLE "government_service_redress_routes" RENAME CONSTRAINT "government_service_redress_routes_governmentServiceVersionId_fk" TO "government_service_redress_routes_governmentServiceVersion_fkey";

-- RenameForeignKey
ALTER TABLE "government_service_version_applicant_categories" RENAME CONSTRAINT "government_service_version_applicant_categories_governmentS_fke" TO "government_service_version_applicant_categories_government_fkey";

-- RenameForeignKey
ALTER TABLE "government_service_versions" RENAME CONSTRAINT "government_service_versions_activationFunctionAuthorityRecordId" TO "government_service_versions_activationFunctionAuthorityRec_fkey";

-- AddForeignKey
ALTER TABLE "delegations" ADD CONSTRAINT "delegations_delegatorOfficeId_fkey" FOREIGN KEY ("delegatorOfficeId") REFERENCES "offices"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "delegations" ADD CONSTRAINT "delegations_delegatorOfficeholderId_fkey" FOREIGN KEY ("delegatorOfficeholderId") REFERENCES "officeholders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "delegations" ADD CONSTRAINT "delegations_recipientOfficeId_fkey" FOREIGN KEY ("recipientOfficeId") REFERENCES "offices"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "delegations" ADD CONSTRAINT "delegations_recipientOfficeholderId_fkey" FOREIGN KEY ("recipientOfficeholderId") REFERENCES "officeholders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "applications" ADD CONSTRAINT "applications_applicantIdentityId_fkey" FOREIGN KEY ("applicantIdentityId") REFERENCES "identities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "applications" ADD CONSTRAINT "applications_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "applications" ADD CONSTRAINT "applications_representativeAuthorityId_fkey" FOREIGN KEY ("representativeAuthorityId") REFERENCES "representative_authorities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "applications" ADD CONSTRAINT "applications_governmentServiceId_fkey" FOREIGN KEY ("governmentServiceId") REFERENCES "government_services"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "applications" ADD CONSTRAINT "applications_governmentServiceVersionId_fkey" FOREIGN KEY ("governmentServiceVersionId") REFERENCES "government_service_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "applications" ADD CONSTRAINT "applications_formDefinitionId_fkey" FOREIGN KEY ("formDefinitionId") REFERENCES "form_definitions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "applications" ADD CONSTRAINT "applications_formVersionId_fkey" FOREIGN KEY ("formVersionId") REFERENCES "form_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "application_submissions" ADD CONSTRAINT "application_submissions_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "applications"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "application_submissions" ADD CONSTRAINT "application_submissions_governmentServiceVersionId_fkey" FOREIGN KEY ("governmentServiceVersionId") REFERENCES "government_service_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "application_submissions" ADD CONSTRAINT "application_submissions_formVersionId_fkey" FOREIGN KEY ("formVersionId") REFERENCES "form_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cases" ADD CONSTRAINT "cases_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "applications"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cases" ADD CONSTRAINT "cases_governmentServiceVersionId_fkey" FOREIGN KEY ("governmentServiceVersionId") REFERENCES "government_service_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cases" ADD CONSTRAINT "cases_workflowVersionId_fkey" FOREIGN KEY ("workflowVersionId") REFERENCES "workflow_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "case_status_history" ADD CONSTRAINT "case_status_history_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "cases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflow_definitions" ADD CONSTRAINT "workflow_definitions_governmentServiceId_fkey" FOREIGN KEY ("governmentServiceId") REFERENCES "government_services"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflow_versions" ADD CONSTRAINT "workflow_versions_workflowDefinitionId_fkey" FOREIGN KEY ("workflowDefinitionId") REFERENCES "workflow_definitions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflow_versions" ADD CONSTRAINT "workflow_versions_supersededById_fkey" FOREIGN KEY ("supersededById") REFERENCES "workflow_versions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflow_stage_definitions" ADD CONSTRAINT "workflow_stage_definitions_workflowVersionId_fkey" FOREIGN KEY ("workflowVersionId") REFERENCES "workflow_versions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflow_step_definitions" ADD CONSTRAINT "workflow_step_definitions_workflowVersionId_fkey" FOREIGN KEY ("workflowVersionId") REFERENCES "workflow_versions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflow_step_definitions" ADD CONSTRAINT "workflow_step_definitions_workflowStageDefinitionId_fkey" FOREIGN KEY ("workflowStageDefinitionId") REFERENCES "workflow_stage_definitions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflow_step_definitions" ADD CONSTRAINT "workflow_step_definitions_functionAuthorityRecordId_fkey" FOREIGN KEY ("functionAuthorityRecordId") REFERENCES "function_authority_records"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflow_transition_definitions" ADD CONSTRAINT "workflow_transition_definitions_workflowVersionId_fkey" FOREIGN KEY ("workflowVersionId") REFERENCES "workflow_versions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflow_transition_definitions" ADD CONSTRAINT "workflow_transition_definitions_fromStepId_fkey" FOREIGN KEY ("fromStepId") REFERENCES "workflow_step_definitions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflow_transition_definitions" ADD CONSTRAINT "workflow_transition_definitions_toStepId_fkey" FOREIGN KEY ("toStepId") REFERENCES "workflow_step_definitions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "case_workflow_instances" ADD CONSTRAINT "case_workflow_instances_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "cases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "case_workflow_instances" ADD CONSTRAINT "case_workflow_instances_workflowVersionId_fkey" FOREIGN KEY ("workflowVersionId") REFERENCES "workflow_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "case_workflow_step_instances" ADD CONSTRAINT "case_workflow_step_instances_caseWorkflowInstanceId_fkey" FOREIGN KEY ("caseWorkflowInstanceId") REFERENCES "case_workflow_instances"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "case_workflow_step_instances" ADD CONSTRAINT "case_workflow_step_instances_workflowStepDefinitionId_fkey" FOREIGN KEY ("workflowStepDefinitionId") REFERENCES "workflow_step_definitions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "completeness_reviews" ADD CONSTRAINT "completeness_reviews_applicationSubmissionId_fkey" FOREIGN KEY ("applicationSubmissionId") REFERENCES "application_submissions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "completeness_reviews" ADD CONSTRAINT "completeness_reviews_caseWorkflowStepInstanceId_fkey" FOREIGN KEY ("caseWorkflowStepInstanceId") REFERENCES "case_workflow_step_instances"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deficiency_notices" ADD CONSTRAINT "deficiency_notices_applicationSubmissionId_fkey" FOREIGN KEY ("applicationSubmissionId") REFERENCES "application_submissions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deficiency_notices" ADD CONSTRAINT "deficiency_notices_completenessReviewId_fkey" FOREIGN KEY ("completenessReviewId") REFERENCES "completeness_reviews"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "applicant_information_requests" ADD CONSTRAINT "applicant_information_requests_applicationSubmissionId_fkey" FOREIGN KEY ("applicationSubmissionId") REFERENCES "application_submissions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "case_assignments" ADD CONSTRAINT "case_assignments_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "cases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "case_referrals" ADD CONSTRAINT "case_referrals_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "cases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "case_referrals" ADD CONSTRAINT "case_referrals_externalAuthorityId_fkey" FOREIGN KEY ("externalAuthorityId") REFERENCES "external_authorities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "case_referrals" ADD CONSTRAINT "case_referrals_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "institutions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "case_referrals" ADD CONSTRAINT "case_referrals_authorityDependencyId_fkey" FOREIGN KEY ("authorityDependencyId") REFERENCES "authority_dependencies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "case_referral_responses" ADD CONSTRAINT "case_referral_responses_caseReferralId_fkey" FOREIGN KEY ("caseReferralId") REFERENCES "case_referrals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "case_sla_clocks" ADD CONSTRAINT "case_sla_clocks_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "cases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "case_escalations" ADD CONSTRAINT "case_escalations_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "cases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "case_issues" ADD CONSTRAINT "case_issues_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "cases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "case_events" ADD CONSTRAINT "case_events_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "cases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "case_communications" ADD CONSTRAINT "case_communications_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "cases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "case_milestones" ADD CONSTRAINT "case_milestones_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "cases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "case_public_status_projections" ADD CONSTRAINT "case_public_status_projections_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "cases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- RenameIndex
ALTER INDEX "delegation_structured_scopes_delegationId_functionAuthorityReco" RENAME TO "delegation_structured_scopes_delegationId_functionAuthority_key";

-- RenameIndex
ALTER INDEX "function_governing_sources_functionAuthorityRecordId_governing_" RENAME TO "function_governing_sources_functionAuthorityRecordId_govern_key";

-- RenameIndex
ALTER INDEX "government_service_checklist_items_governmentServiceVersionI_id" RENAME TO "government_service_checklist_items_governmentServiceVersion_idx";

-- RenameIndex
ALTER INDEX "government_service_checklist_items_governmentServiceVersionI_ke" RENAME TO "government_service_checklist_items_governmentServiceVersion_key";

-- RenameIndex
ALTER INDEX "government_service_eligibility_rules_governmentServiceVersio_id" RENAME TO "government_service_eligibility_rules_governmentServiceVersi_idx";

-- RenameIndex
ALTER INDEX "government_service_eligibility_rules_governmentServiceVersio_ke" RENAME TO "government_service_eligibility_rules_governmentServiceVersi_key";

-- RenameIndex
ALTER INDEX "government_service_fee_definitions_governmentServiceVersionI_id" RENAME TO "government_service_fee_definitions_governmentServiceVersion_idx";

-- RenameIndex
ALTER INDEX "government_service_fee_definitions_governmentServiceVersionI_ke" RENAME TO "government_service_fee_definitions_governmentServiceVersion_key";

-- RenameIndex
ALTER INDEX "government_service_output_definitions_governmentServiceVersi_id" RENAME TO "government_service_output_definitions_governmentServiceVers_idx";

-- RenameIndex
ALTER INDEX "government_service_output_definitions_governmentServiceVersi_ke" RENAME TO "government_service_output_definitions_governmentServiceVers_key";

-- RenameIndex
ALTER INDEX "government_service_redress_routes_governmentServiceVersionId_id" RENAME TO "government_service_redress_routes_governmentServiceVersionI_idx";

-- RenameIndex
ALTER INDEX "government_service_redress_routes_governmentServiceVersionId_ke" RENAME TO "government_service_redress_routes_governmentServiceVersionI_key";

-- RenameIndex
ALTER INDEX "government_service_versions_activationFunctionAuthorityRecordId" RENAME TO "government_service_versions_activationFunctionAuthorityReco_idx";

-- RenameIndex
ALTER INDEX "institution_external_authorities_institutionId_externalAuthorit" RENAME TO "institution_external_authorities_institutionId_externalAuth_key";

-- RenameIndex
ALTER INDEX "service_function_mappings_governmentServiceVersionId_function_k" RENAME TO "service_function_mappings_governmentServiceVersionId_functi_key";
