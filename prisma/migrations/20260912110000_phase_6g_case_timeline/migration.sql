-- Phase 6G: Case timeline, communications, milestones, and applicant status projection

-- CreateEnum
CREATE TYPE "ApplicationStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'RECEIVED', 'WITHDRAWN', 'CLOSED');

-- CreateEnum
CREATE TYPE "CaseStatus" AS ENUM ('RECEIVED', 'OPEN', 'IN_PROGRESS', 'COMPLETENESS_REVIEW', 'SUBSTANTIVE_REVIEW', 'REFERRAL_PENDING', 'PROFESSIONAL_REVIEW', 'INSPECTION', 'DECISION_PENDING', 'SAFE_HALT', 'WITHDRAWN', 'CLOSED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "CaseLegalStatus" AS ENUM ('NONE', 'PENDING', 'UNRESOLVED', 'EXTERNAL_STATUS_PENDING');

-- CreateEnum
CREATE TYPE "CasePriority" AS ENUM ('LOW', 'NORMAL', 'HIGH', 'URGENT');

-- CreateEnum
CREATE TYPE "CaseWorkflowInstanceStatus" AS ENUM ('NOT_STARTED', 'ACTIVE', 'PAUSED', 'SAFE_HALT', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "CaseWorkflowStepInstanceStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'SKIPPED', 'BLOCKED');

-- CreateEnum
CREATE TYPE "CaseEventType" AS ENUM ('APPLICATION_RECEIVED', 'CASE_OPENED', 'CASE_ASSIGNED', 'WORKFLOW_STARTED', 'STEP_STARTED', 'STEP_COMPLETED', 'COMPLETENESS_STARTED', 'DEFICIENCY_ISSUED', 'APPLICANT_RESPONSE_RECEIVED', 'COMPLETENESS_COMPLETED', 'REFERRED', 'REFERRAL_ACKNOWLEDGED', 'REFERRAL_RESPONSE_RECEIVED', 'PROFESSIONAL_REVIEW_REQUESTED', 'INSPECTION_REQUESTED', 'ISSUE_ESCALATED', 'WORKFLOW_PAUSED', 'WORKFLOW_RESUMED', 'SAFE_HALT', 'DECISION_PENDING', 'WITHDRAWN', 'CLOSED');

-- CreateEnum
CREATE TYPE "CaseEventPublicVisibility" AS ENUM ('INTERNAL', 'OFFICIAL', 'APPLICANT_VISIBLE');

-- CreateEnum
CREATE TYPE "CaseCommunicationType" AS ENUM ('APPLICANT_MESSAGE', 'DEFICIENCY_NOTICE', 'REQUEST_FOR_INFORMATION', 'STATUS_UPDATE', 'REFERRAL_NOTICE', 'INTERNAL_NOTE', 'EXTERNAL_CORRESPONDENCE', 'SYSTEM_NOTICE');

-- CreateEnum
CREATE TYPE "CaseCommunicationChannel" AS ENUM ('PORTAL', 'EMAIL', 'SMS', 'POSTAL', 'COUNTER', 'SYSTEM');

-- CreateEnum
CREATE TYPE "CaseCommunicationDeliveryStatus" AS ENUM ('DRAFT', 'QUEUED', 'SENT', 'DELIVERED', 'FAILED', 'RECEIVED');

-- CreateEnum
CREATE TYPE "CaseRecipientType" AS ENUM ('APPLICANT', 'OFFICEHOLDER', 'DEPARTMENT', 'EXTERNAL_AUTHORITY', 'INTERNAL', 'SYSTEM');

-- CreateEnum
CREATE TYPE "CaseRecordClassification" AS ENUM ('PUBLIC', 'OFFICIAL', 'INTERNAL', 'RESTRICTED', 'PRIVILEGED');

-- CreateEnum
CREATE TYPE "CaseMilestoneStatus" AS ENUM ('UPCOMING', 'IN_PROGRESS', 'AT_RISK', 'DELAYED', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "CasePublicStatusStage" AS ENUM ('RECEIVED', 'CHECKING_SUBMISSION', 'MORE_INFORMATION_NEEDED', 'UNDER_REVIEW', 'WAITING_ON_OTHER_AUTHORITY', 'PROFESSIONAL_REVIEW', 'INSPECTION', 'DECISION_PENDING', 'COMPLETED', 'CLOSED');

-- CreateTable
CREATE TABLE "applications" (
    "id" UUID NOT NULL,
    "applicationNumber" TEXT NOT NULL,
    "applicantIdentityId" UUID NOT NULL,
    "governmentServiceId" UUID NOT NULL,
    "governmentServiceVersionId" UUID NOT NULL,
    "status" "ApplicationStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "applications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cases" (
    "id" UUID NOT NULL,
    "caseNumber" TEXT NOT NULL,
    "applicationId" UUID NOT NULL,
    "applicantIdentityId" UUID NOT NULL,
    "governmentServiceId" UUID NOT NULL,
    "governmentServiceVersionId" UUID NOT NULL,
    "responsibleInstitutionId" UUID NOT NULL,
    "responsibleDepartmentId" UUID NOT NULL,
    "caseStatus" "CaseStatus" NOT NULL DEFAULT 'RECEIVED',
    "legalStatus" "CaseLegalStatus" NOT NULL DEFAULT 'NONE',
    "priority" "CasePriority" NOT NULL DEFAULT 'NORMAL',
    "openedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closedAt" TIMESTAMP(3),
    "currentCaseManagerOfficeholderId" UUID,
    "masterAdministrativeFileReference" TEXT,
    "documentRegisterReference" TEXT,
    "evidencePacketReference" TEXT,
    "recordsClassificationReference" TEXT,
    "retentionLegalHoldReference" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "case_workflow_instances" (
    "id" UUID NOT NULL,
    "caseId" UUID NOT NULL,
    "workflowVersionReference" TEXT NOT NULL,
    "status" "CaseWorkflowInstanceStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "currentStageKey" TEXT,
    "currentStageLabel" TEXT,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "pausedAt" TIMESTAMP(3),
    "safeHaltActive" BOOLEAN NOT NULL DEFAULT false,
    "safeHaltPublicLabel" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "case_workflow_instances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "case_workflow_step_instances" (
    "id" UUID NOT NULL,
    "workflowInstanceId" UUID NOT NULL,
    "stepKey" TEXT NOT NULL,
    "stepLabel" TEXT,
    "status" "CaseWorkflowStepInstanceStatus" NOT NULL DEFAULT 'PENDING',
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "case_workflow_step_instances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "case_events" (
    "id" UUID NOT NULL,
    "caseId" UUID NOT NULL,
    "eventType" "CaseEventType" NOT NULL,
    "actorIdentityId" UUID,
    "officeholderId" UUID,
    "institutionId" UUID,
    "departmentId" UUID,
    "workflowInstanceId" UUID,
    "stepInstanceId" UUID,
    "correlationId" TEXT,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "publicVisibility" "CaseEventPublicVisibility" NOT NULL DEFAULT 'INTERNAL',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "case_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "case_communications" (
    "id" UUID NOT NULL,
    "caseId" UUID NOT NULL,
    "communicationType" "CaseCommunicationType" NOT NULL,
    "senderIdentityId" UUID,
    "senderOfficeholderId" UUID,
    "recipientType" "CaseRecipientType" NOT NULL,
    "recipientReference" TEXT,
    "channel" "CaseCommunicationChannel" NOT NULL,
    "subject" TEXT,
    "body" TEXT NOT NULL,
    "templateReference" TEXT,
    "templateVersion" TEXT,
    "sentAt" TIMESTAMP(3),
    "receivedAt" TIMESTAMP(3),
    "deliveryStatus" "CaseCommunicationDeliveryStatus" NOT NULL DEFAULT 'DRAFT',
    "classification" "CaseRecordClassification" NOT NULL DEFAULT 'OFFICIAL',
    "publicVisibility" "CaseEventPublicVisibility" NOT NULL DEFAULT 'INTERNAL',
    "caseEventId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "case_communications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "case_communication_outbox" (
    "id" UUID NOT NULL,
    "communicationId" UUID NOT NULL,
    "channel" "CaseCommunicationChannel" NOT NULL,
    "payload" JSONB NOT NULL DEFAULT '{}',
    "queuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'QUEUED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "case_communication_outbox_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "case_milestones" (
    "id" UUID NOT NULL,
    "caseId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "targetDate" TIMESTAMP(3),
    "actualDate" TIMESTAMP(3),
    "status" "CaseMilestoneStatus" NOT NULL DEFAULT 'UPCOMING',
    "responsiblePartyRef" TEXT,
    "sourceSlaReference" TEXT,
    "dependencyReference" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "case_milestones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "case_public_status_projections" (
    "id" UUID NOT NULL,
    "caseId" UUID NOT NULL,
    "publicStage" "CasePublicStatusStage" NOT NULL,
    "publicStageLabel" TEXT NOT NULL,
    "publicStageDetail" TEXT,
    "sourceCaseStatus" "CaseStatus" NOT NULL,
    "sourceLegalStatus" "CaseLegalStatus" NOT NULL,
    "currentMilestoneId" UUID,
    "applicantDisclaimer" TEXT NOT NULL,
    "projectionVersion" INTEGER NOT NULL DEFAULT 1,
    "lastDerivedAt" TIMESTAMP(3) NOT NULL,
    "sourceEventId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

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
CREATE UNIQUE INDEX "cases_caseNumber_key" ON "cases"("caseNumber");

-- CreateIndex
CREATE UNIQUE INDEX "cases_applicationId_key" ON "cases"("applicationId");

-- CreateIndex
CREATE INDEX "cases_applicantIdentityId_idx" ON "cases"("applicantIdentityId");

-- CreateIndex
CREATE INDEX "cases_governmentServiceId_idx" ON "cases"("governmentServiceId");

-- CreateIndex
CREATE INDEX "cases_responsibleDepartmentId_idx" ON "cases"("responsibleDepartmentId");

-- CreateIndex
CREATE INDEX "cases_caseStatus_idx" ON "cases"("caseStatus");

-- CreateIndex
CREATE INDEX "cases_currentCaseManagerOfficeholderId_idx" ON "cases"("currentCaseManagerOfficeholderId");

-- CreateIndex
CREATE INDEX "case_workflow_instances_caseId_idx" ON "case_workflow_instances"("caseId");

-- CreateIndex
CREATE INDEX "case_workflow_instances_status_idx" ON "case_workflow_instances"("status");

-- CreateIndex
CREATE UNIQUE INDEX "case_workflow_step_instances_workflowInstanceId_stepKey_key" ON "case_workflow_step_instances"("workflowInstanceId", "stepKey");

-- CreateIndex
CREATE INDEX "case_workflow_step_instances_workflowInstanceId_idx" ON "case_workflow_step_instances"("workflowInstanceId");

-- CreateIndex
CREATE INDEX "case_events_caseId_occurredAt_idx" ON "case_events"("caseId", "occurredAt");

-- CreateIndex
CREATE INDEX "case_events_eventType_idx" ON "case_events"("eventType");

-- CreateIndex
CREATE INDEX "case_events_publicVisibility_idx" ON "case_events"("publicVisibility");

-- CreateIndex
CREATE INDEX "case_events_correlationId_idx" ON "case_events"("correlationId");

-- CreateIndex
CREATE INDEX "case_communications_caseId_createdAt_idx" ON "case_communications"("caseId", "createdAt");

-- CreateIndex
CREATE INDEX "case_communications_communicationType_idx" ON "case_communications"("communicationType");

-- CreateIndex
CREATE INDEX "case_communications_publicVisibility_idx" ON "case_communications"("publicVisibility");

-- CreateIndex
CREATE INDEX "case_communication_outbox_communicationId_idx" ON "case_communication_outbox"("communicationId");

-- CreateIndex
CREATE INDEX "case_communication_outbox_status_idx" ON "case_communication_outbox"("status");

-- CreateIndex
CREATE INDEX "case_milestones_caseId_idx" ON "case_milestones"("caseId");

-- CreateIndex
CREATE INDEX "case_milestones_status_idx" ON "case_milestones"("status");

-- CreateIndex
CREATE UNIQUE INDEX "case_public_status_projections_caseId_key" ON "case_public_status_projections"("caseId");

-- CreateIndex
CREATE INDEX "case_public_status_projections_publicStage_idx" ON "case_public_status_projections"("publicStage");

-- AddForeignKey
ALTER TABLE "applications" ADD CONSTRAINT "applications_applicantIdentityId_fkey" FOREIGN KEY ("applicantIdentityId") REFERENCES "identities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "applications" ADD CONSTRAINT "applications_governmentServiceId_fkey" FOREIGN KEY ("governmentServiceId") REFERENCES "government_services"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "applications" ADD CONSTRAINT "applications_governmentServiceVersionId_fkey" FOREIGN KEY ("governmentServiceVersionId") REFERENCES "government_service_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cases" ADD CONSTRAINT "cases_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "applications"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cases" ADD CONSTRAINT "cases_applicantIdentityId_fkey" FOREIGN KEY ("applicantIdentityId") REFERENCES "identities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cases" ADD CONSTRAINT "cases_governmentServiceId_fkey" FOREIGN KEY ("governmentServiceId") REFERENCES "government_services"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cases" ADD CONSTRAINT "cases_governmentServiceVersionId_fkey" FOREIGN KEY ("governmentServiceVersionId") REFERENCES "government_service_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cases" ADD CONSTRAINT "cases_responsibleInstitutionId_fkey" FOREIGN KEY ("responsibleInstitutionId") REFERENCES "institutions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cases" ADD CONSTRAINT "cases_responsibleDepartmentId_fkey" FOREIGN KEY ("responsibleDepartmentId") REFERENCES "departments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cases" ADD CONSTRAINT "cases_currentCaseManagerOfficeholderId_fkey" FOREIGN KEY ("currentCaseManagerOfficeholderId") REFERENCES "officeholders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "case_workflow_instances" ADD CONSTRAINT "case_workflow_instances_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "cases"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "case_workflow_step_instances" ADD CONSTRAINT "case_workflow_step_instances_workflowInstanceId_fkey" FOREIGN KEY ("workflowInstanceId") REFERENCES "case_workflow_instances"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "case_events" ADD CONSTRAINT "case_events_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "cases"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "case_events" ADD CONSTRAINT "case_events_actorIdentityId_fkey" FOREIGN KEY ("actorIdentityId") REFERENCES "identities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "case_events" ADD CONSTRAINT "case_events_officeholderId_fkey" FOREIGN KEY ("officeholderId") REFERENCES "officeholders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "case_events" ADD CONSTRAINT "case_events_workflowInstanceId_fkey" FOREIGN KEY ("workflowInstanceId") REFERENCES "case_workflow_instances"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "case_events" ADD CONSTRAINT "case_events_stepInstanceId_fkey" FOREIGN KEY ("stepInstanceId") REFERENCES "case_workflow_step_instances"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "case_communications" ADD CONSTRAINT "case_communications_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "cases"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "case_communications" ADD CONSTRAINT "case_communications_senderIdentityId_fkey" FOREIGN KEY ("senderIdentityId") REFERENCES "identities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "case_communications" ADD CONSTRAINT "case_communications_senderOfficeholderId_fkey" FOREIGN KEY ("senderOfficeholderId") REFERENCES "officeholders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "case_communications" ADD CONSTRAINT "case_communications_caseEventId_fkey" FOREIGN KEY ("caseEventId") REFERENCES "case_events"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "case_communication_outbox" ADD CONSTRAINT "case_communication_outbox_communicationId_fkey" FOREIGN KEY ("communicationId") REFERENCES "case_communications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "case_milestones" ADD CONSTRAINT "case_milestones_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "cases"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "case_public_status_projections" ADD CONSTRAINT "case_public_status_projections_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "cases"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "case_public_status_projections" ADD CONSTRAINT "case_public_status_projections_currentMilestoneId_fkey" FOREIGN KEY ("currentMilestoneId") REFERENCES "case_milestones"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "case_public_status_projections" ADD CONSTRAINT "case_public_status_projections_sourceEventId_fkey" FOREIGN KEY ("sourceEventId") REFERENCES "case_events"("id") ON DELETE SET NULL ON UPDATE CASCADE;
