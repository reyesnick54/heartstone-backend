-- Phase 6F: Case Assignments, Referrals, SLA Clocks and Escalation (additive on Phase 6B)

CREATE TYPE "CaseWorkflowStepStatus" AS ENUM (
  'PENDING',
  'ACTIVE',
  'COMPLETED',
  'SKIPPED'
);

CREATE TYPE "CaseAssignmentType" AS ENUM (
  'CASE_MANAGER',
  'REVIEWER',
  'SPECIALIST',
  'COORDINATOR',
  'INSPECTOR_PLACEHOLDER',
  'OTHER_APPROVED_ROLE'
);

CREATE TYPE "CaseAssignmentStatus" AS ENUM (
  'ACTIVE',
  'SUSPENDED',
  'ENDED'
);

CREATE TYPE "CaseReferralType" AS ENUM (
  'INTERNAL_DEPARTMENT',
  'GOVERNMENT_AUTHORITY',
  'PROFESSIONAL',
  'PARTNER',
  'OTHER_APPROVED_EXTERNAL'
);

CREATE TYPE "CaseReferralStatus" AS ENUM (
  'DRAFT',
  'SENT',
  'ACKNOWLEDGED',
  'AWAITING_RESPONSE',
  'RESPONSE_RECEIVED',
  'CLOSED',
  'CANCELLED'
);

CREATE TYPE "CaseReferralResponseStatus" AS ENUM (
  'RECEIVED',
  'UNDER_REVIEW',
  'ACCEPTED',
  'REJECTED',
  'PARTIALLY_ACCEPTED'
);

CREATE TYPE "CaseReferralResponseAuthStatus" AS ENUM (
  'UNAUTHENTICATED',
  'AUTHENTICATED',
  'VERIFIED',
  'DISPUTED'
);

CREATE TYPE "CaseSlaClockType" AS ENUM (
  'ABSEZ_PROCESSING_TIME',
  'APPLICANT_TIME',
  'EXTERNAL_DEPENDENCY_TIME',
  'PROFESSIONAL_DEPENDENCY_TIME',
  'PAUSED_AUTHORIZED',
  'SYSTEM_DISRUPTION'
);

CREATE TYPE "CaseSlaClockStatus" AS ENUM (
  'RUNNING',
  'PAUSED',
  'COMPLETED',
  'BREACHED',
  'AT_RISK',
  'CANCELLED'
);

CREATE TYPE "CaseSlaPauseReason" AS ENUM (
  'REFERRAL_PENDING',
  'APPLICANT_DELAY',
  'EXTERNAL_DEPENDENCY',
  'AUTHORIZED_PAUSE',
  'SYSTEM_DISRUPTION'
);

CREATE TYPE "CaseEscalationRoute" AS ENUM (
  'DEPARTMENT',
  'ONE_STOP_ADMINISTRATION',
  'SENIOR_ADMINISTRATIVE',
  'MANAGEMENT_COMMITTEE',
  'COMPETENT_EXTERNAL_AUTHORITY'
);

CREATE TYPE "CaseEscalationStatus" AS ENUM (
  'OPEN',
  'ACKNOWLEDGED',
  'RESOLVED',
  'CLOSED'
);

CREATE TYPE "CaseIssueType" AS ENUM (
  'UNRESOLVED_REQUIREMENT',
  'DEPENDENCY_DELAY',
  'APPLICANT_RESPONSE_PENDING',
  'PROFESSIONAL_ISSUE',
  'AUTHORITY_ISSUE',
  'SYSTEM_ISSUE',
  'OTHER'
);

CREATE TYPE "CaseIssueSeverity" AS ENUM (
  'LOW',
  'MEDIUM',
  'HIGH',
  'CRITICAL'
);

CREATE TYPE "CaseIssueStatus" AS ENUM (
  'OPEN',
  'IN_PROGRESS',
  'ESCALATED',
  'RESOLVED',
  'CLOSED'
);

ALTER TABLE "cases" ADD COLUMN "currentWorkflowStepId" UUID;

CREATE TABLE "case_workflow_steps" (
  "id" UUID NOT NULL,
  "caseId" UUID NOT NULL,
  "stepKey" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "sequenceOrder" INTEGER NOT NULL,
  "status" "CaseWorkflowStepStatus" NOT NULL DEFAULT 'PENDING',
  "blocksOnUnresolvedIssues" BOOLEAN NOT NULL DEFAULT false,
  "enteredAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "case_workflow_steps_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "case_workflow_steps_caseId_stepKey_key" ON "case_workflow_steps"("caseId", "stepKey");
CREATE INDEX "case_workflow_steps_caseId_idx" ON "case_workflow_steps"("caseId");
CREATE INDEX "case_workflow_steps_status_idx" ON "case_workflow_steps"("status");

ALTER TABLE "case_workflow_steps"
  ADD CONSTRAINT "case_workflow_steps_caseId_fkey"
  FOREIGN KEY ("caseId") REFERENCES "cases"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX "cases_currentWorkflowStepId_idx" ON "cases"("currentWorkflowStepId");

ALTER TABLE "cases"
  ADD CONSTRAINT "cases_currentWorkflowStepId_fkey"
  FOREIGN KEY ("currentWorkflowStepId") REFERENCES "case_workflow_steps"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "case_assignments" (
  "id" UUID NOT NULL,
  "caseId" UUID NOT NULL,
  "assignmentType" "CaseAssignmentType" NOT NULL,
  "assignedOfficeholderId" UUID NOT NULL,
  "assignedOfficeId" UUID,
  "assignedDepartmentId" UUID,
  "assignedByIdentityId" UUID NOT NULL,
  "assignedByOfficeholderId" UUID,
  "effectiveFrom" TIMESTAMP(3) NOT NULL,
  "effectiveUntil" TIMESTAMP(3),
  "status" "CaseAssignmentStatus" NOT NULL DEFAULT 'ACTIVE',
  "purpose" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "case_assignments_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "case_assignments_caseId_idx" ON "case_assignments"("caseId");
CREATE INDEX "case_assignments_assignedOfficeholderId_idx" ON "case_assignments"("assignedOfficeholderId");
CREATE INDEX "case_assignments_assignmentType_idx" ON "case_assignments"("assignmentType");
CREATE INDEX "case_assignments_status_idx" ON "case_assignments"("status");

ALTER TABLE "case_assignments"
  ADD CONSTRAINT "case_assignments_caseId_fkey"
  FOREIGN KEY ("caseId") REFERENCES "cases"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "case_assignments"
  ADD CONSTRAINT "case_assignments_assignedOfficeholderId_fkey"
  FOREIGN KEY ("assignedOfficeholderId") REFERENCES "officeholders"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "case_assignments"
  ADD CONSTRAINT "case_assignments_assignedOfficeId_fkey"
  FOREIGN KEY ("assignedOfficeId") REFERENCES "offices"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "case_assignments"
  ADD CONSTRAINT "case_assignments_assignedDepartmentId_fkey"
  FOREIGN KEY ("assignedDepartmentId") REFERENCES "departments"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "case_assignments"
  ADD CONSTRAINT "case_assignments_assignedByIdentityId_fkey"
  FOREIGN KEY ("assignedByIdentityId") REFERENCES "identities"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "case_assignments"
  ADD CONSTRAINT "case_assignments_assignedByOfficeholderId_fkey"
  FOREIGN KEY ("assignedByOfficeholderId") REFERENCES "officeholders"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "case_referrals" (
  "id" UUID NOT NULL,
  "referralReference" TEXT NOT NULL,
  "caseId" UUID NOT NULL,
  "workflowStepId" UUID,
  "referralType" "CaseReferralType" NOT NULL,
  "referringInstitutionId" UUID NOT NULL,
  "referringDepartmentId" UUID,
  "receivingInstitutionId" UUID,
  "receivingExternalAuthorityId" UUID,
  "authorityDependencyId" UUID,
  "purpose" TEXT NOT NULL,
  "questionsRequestedResponse" TEXT,
  "sentAt" TIMESTAMP(3),
  "acknowledgedAt" TIMESTAMP(3),
  "dueAt" TIMESTAMP(3),
  "status" "CaseReferralStatus" NOT NULL DEFAULT 'DRAFT',
  "securityHandlingClassification" TEXT,
  "outgoingPackageReferences" JSONB NOT NULL DEFAULT '[]',
  "createdByIdentityId" UUID NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "case_referrals_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "case_referrals_referralReference_key" ON "case_referrals"("referralReference");
CREATE INDEX "case_referrals_caseId_idx" ON "case_referrals"("caseId");
CREATE INDEX "case_referrals_workflowStepId_idx" ON "case_referrals"("workflowStepId");
CREATE INDEX "case_referrals_referringInstitutionId_idx" ON "case_referrals"("referringInstitutionId");
CREATE INDEX "case_referrals_receivingInstitutionId_idx" ON "case_referrals"("receivingInstitutionId");
CREATE INDEX "case_referrals_receivingExternalAuthorityId_idx" ON "case_referrals"("receivingExternalAuthorityId");
CREATE INDEX "case_referrals_authorityDependencyId_idx" ON "case_referrals"("authorityDependencyId");
CREATE INDEX "case_referrals_status_idx" ON "case_referrals"("status");

ALTER TABLE "case_referrals"
  ADD CONSTRAINT "case_referrals_caseId_fkey"
  FOREIGN KEY ("caseId") REFERENCES "cases"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "case_referrals"
  ADD CONSTRAINT "case_referrals_workflowStepId_fkey"
  FOREIGN KEY ("workflowStepId") REFERENCES "case_workflow_steps"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "case_referrals"
  ADD CONSTRAINT "case_referrals_referringInstitutionId_fkey"
  FOREIGN KEY ("referringInstitutionId") REFERENCES "institutions"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "case_referrals"
  ADD CONSTRAINT "case_referrals_referringDepartmentId_fkey"
  FOREIGN KEY ("referringDepartmentId") REFERENCES "departments"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "case_referrals"
  ADD CONSTRAINT "case_referrals_receivingInstitutionId_fkey"
  FOREIGN KEY ("receivingInstitutionId") REFERENCES "institutions"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "case_referrals"
  ADD CONSTRAINT "case_referrals_receivingExternalAuthorityId_fkey"
  FOREIGN KEY ("receivingExternalAuthorityId") REFERENCES "external_authorities"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "case_referrals"
  ADD CONSTRAINT "case_referrals_authorityDependencyId_fkey"
  FOREIGN KEY ("authorityDependencyId") REFERENCES "authority_dependencies"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "case_referrals"
  ADD CONSTRAINT "case_referrals_createdByIdentityId_fkey"
  FOREIGN KEY ("createdByIdentityId") REFERENCES "identities"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "case_referral_responses" (
  "id" UUID NOT NULL,
  "referralId" UUID NOT NULL,
  "responseReference" TEXT NOT NULL,
  "receivedAt" TIMESTAMP(3) NOT NULL,
  "sourceInstitutionId" UUID,
  "sourceExternalAuthorityId" UUID,
  "authenticatedStatus" "CaseReferralResponseAuthStatus" NOT NULL DEFAULT 'UNAUTHENTICATED',
  "status" "CaseReferralResponseStatus" NOT NULL DEFAULT 'RECEIVED',
  "determinationReference" TEXT,
  "conditionsReference" TEXT,
  "effectiveDate" TIMESTAMP(3),
  "expiryDate" TIMESTAMP(3),
  "summary" TEXT,
  "recordReferences" JSONB NOT NULL DEFAULT '[]',
  "externalDependencyDeterminationId" UUID,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "case_referral_responses_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "case_referral_responses_referralId_idx" ON "case_referral_responses"("referralId");
CREATE INDEX "case_referral_responses_sourceInstitutionId_idx" ON "case_referral_responses"("sourceInstitutionId");
CREATE INDEX "case_referral_responses_sourceExternalAuthorityId_idx" ON "case_referral_responses"("sourceExternalAuthorityId");
CREATE INDEX "case_referral_responses_externalDependencyDeterminationId_idx" ON "case_referral_responses"("externalDependencyDeterminationId");

ALTER TABLE "case_referral_responses"
  ADD CONSTRAINT "case_referral_responses_referralId_fkey"
  FOREIGN KEY ("referralId") REFERENCES "case_referrals"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "case_referral_responses"
  ADD CONSTRAINT "case_referral_responses_sourceInstitutionId_fkey"
  FOREIGN KEY ("sourceInstitutionId") REFERENCES "institutions"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "case_referral_responses"
  ADD CONSTRAINT "case_referral_responses_sourceExternalAuthorityId_fkey"
  FOREIGN KEY ("sourceExternalAuthorityId") REFERENCES "external_authorities"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "case_referral_responses"
  ADD CONSTRAINT "case_referral_responses_externalDependencyDeterminationId_fkey"
  FOREIGN KEY ("externalDependencyDeterminationId") REFERENCES "external_dependency_determinations"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "case_sla_clocks" (
  "id" UUID NOT NULL,
  "caseId" UUID NOT NULL,
  "clockType" "CaseSlaClockType" NOT NULL,
  "serviceLevelTargetLabel" TEXT,
  "targetDurationDays" INTEGER,
  "serviceFunctionMappingId" UUID,
  "startedAt" TIMESTAMP(3) NOT NULL,
  "dueAt" TIMESTAMP(3),
  "elapsedMs" INTEGER NOT NULL DEFAULT 0,
  "pausedDurationMs" INTEGER NOT NULL DEFAULT 0,
  "status" "CaseSlaClockStatus" NOT NULL DEFAULT 'RUNNING',
  "breachAt" TIMESTAMP(3),
  "atRiskAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "case_sla_clocks_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "case_sla_clocks_caseId_idx" ON "case_sla_clocks"("caseId");
CREATE INDEX "case_sla_clocks_clockType_idx" ON "case_sla_clocks"("clockType");
CREATE INDEX "case_sla_clocks_status_idx" ON "case_sla_clocks"("status");
CREATE INDEX "case_sla_clocks_serviceFunctionMappingId_idx" ON "case_sla_clocks"("serviceFunctionMappingId");

ALTER TABLE "case_sla_clocks"
  ADD CONSTRAINT "case_sla_clocks_caseId_fkey"
  FOREIGN KEY ("caseId") REFERENCES "cases"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "case_sla_clocks"
  ADD CONSTRAINT "case_sla_clocks_serviceFunctionMappingId_fkey"
  FOREIGN KEY ("serviceFunctionMappingId") REFERENCES "service_function_mappings"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "case_sla_pauses" (
  "id" UUID NOT NULL,
  "slaClockId" UUID NOT NULL,
  "referralId" UUID,
  "pauseReason" "CaseSlaPauseReason" NOT NULL,
  "pausedAt" TIMESTAMP(3) NOT NULL,
  "resumedAt" TIMESTAMP(3),
  "authorizedByIdentityId" UUID,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "case_sla_pauses_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "case_sla_pauses_slaClockId_idx" ON "case_sla_pauses"("slaClockId");
CREATE INDEX "case_sla_pauses_referralId_idx" ON "case_sla_pauses"("referralId");

ALTER TABLE "case_sla_pauses"
  ADD CONSTRAINT "case_sla_pauses_slaClockId_fkey"
  FOREIGN KEY ("slaClockId") REFERENCES "case_sla_clocks"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "case_sla_pauses"
  ADD CONSTRAINT "case_sla_pauses_referralId_fkey"
  FOREIGN KEY ("referralId") REFERENCES "case_referrals"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "case_sla_pauses"
  ADD CONSTRAINT "case_sla_pauses_authorizedByIdentityId_fkey"
  FOREIGN KEY ("authorizedByIdentityId") REFERENCES "identities"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "case_escalations" (
  "id" UUID NOT NULL,
  "caseId" UUID NOT NULL,
  "escalationRoute" "CaseEscalationRoute" NOT NULL,
  "triggeredByIdentityId" UUID NOT NULL,
  "triggeredByOfficeholderId" UUID,
  "relatedIssueId" UUID,
  "relatedSlaClockId" UUID,
  "relatedReferralId" UUID,
  "reason" TEXT NOT NULL,
  "status" "CaseEscalationStatus" NOT NULL DEFAULT 'OPEN',
  "preservesAuthorityBoundary" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "resolvedAt" TIMESTAMP(3),

  CONSTRAINT "case_escalations_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "case_escalations_caseId_idx" ON "case_escalations"("caseId");
CREATE INDEX "case_escalations_escalationRoute_idx" ON "case_escalations"("escalationRoute");
CREATE INDEX "case_escalations_status_idx" ON "case_escalations"("status");

ALTER TABLE "case_escalations"
  ADD CONSTRAINT "case_escalations_caseId_fkey"
  FOREIGN KEY ("caseId") REFERENCES "cases"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "case_escalations"
  ADD CONSTRAINT "case_escalations_triggeredByIdentityId_fkey"
  FOREIGN KEY ("triggeredByIdentityId") REFERENCES "identities"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "case_escalations"
  ADD CONSTRAINT "case_escalations_triggeredByOfficeholderId_fkey"
  FOREIGN KEY ("triggeredByOfficeholderId") REFERENCES "officeholders"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "case_issues" (
  "id" UUID NOT NULL,
  "caseId" UUID NOT NULL,
  "issueType" "CaseIssueType" NOT NULL,
  "severity" "CaseIssueSeverity" NOT NULL DEFAULT 'MEDIUM',
  "ownerOfficeholderId" UUID,
  "status" "CaseIssueStatus" NOT NULL DEFAULT 'OPEN',
  "description" TEXT NOT NULL,
  "blocksWorkflow" BOOLEAN NOT NULL DEFAULT false,
  "escalationId" UUID,
  "openedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "resolvedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "case_issues_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "case_issues_caseId_idx" ON "case_issues"("caseId");
CREATE INDEX "case_issues_issueType_idx" ON "case_issues"("issueType");
CREATE INDEX "case_issues_status_idx" ON "case_issues"("status");
CREATE INDEX "case_issues_ownerOfficeholderId_idx" ON "case_issues"("ownerOfficeholderId");

ALTER TABLE "case_issues"
  ADD CONSTRAINT "case_issues_caseId_fkey"
  FOREIGN KEY ("caseId") REFERENCES "cases"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "case_issues"
  ADD CONSTRAINT "case_issues_ownerOfficeholderId_fkey"
  FOREIGN KEY ("ownerOfficeholderId") REFERENCES "officeholders"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "case_escalations"
  ADD CONSTRAINT "case_escalations_relatedIssueId_fkey"
  FOREIGN KEY ("relatedIssueId") REFERENCES "case_issues"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "case_issues"
  ADD CONSTRAINT "case_issues_escalationId_fkey"
  FOREIGN KEY ("escalationId") REFERENCES "case_escalations"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
