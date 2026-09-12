-- Phase 7C: Evidence registry and verification engine
-- Phase 6E/6D reconciliation tables (isolated from Phase 6A canonical tables)

-- Application case track (6E isolated tables)
CREATE TYPE "ApplicationCaseStatus" AS ENUM ('OPEN', 'CLOSED', 'SAFE_HALTED');
CREATE TYPE "ApplicationCaseWorkflowStage" AS ENUM (
  'SUBMITTED', 'COMPLETENESS_REVIEW', 'INCOMPLETE', 'WAITING_APPLICANT',
  'RESUBMITTED', 'ADMINISTRATIVELY_COMPLETE', 'SUBSTANTIVE_REVIEW', 'SAFE_HALTED'
);
CREATE TYPE "ApplicationCaseCompletenessReviewStatus" AS ENUM (
  'PENDING', 'IN_REVIEW', 'INCOMPLETE', 'COMPLETE', 'UNRESOLVED', 'SAFE_HALTED'
);
CREATE TYPE "ApplicationCaseCompletenessReviewItemStatus" AS ENUM (
  'PRESENT', 'MISSING', 'ILLEGIBLE', 'CORRUPTED', 'APPARENTLY_INCONSISTENT',
  'SUBSTITUTION_PENDING', 'NOT_APPLICABLE', 'UNRESOLVED'
);
CREATE TYPE "ApplicationCaseDeficiencyNoticeStatus" AS ENUM (
  'DRAFT', 'ISSUED', 'RESPONDED', 'EXPIRED', 'SUPERSEDED', 'WITHDRAWN'
);
CREATE TYPE "ApplicationCaseInformationRequestStatus" AS ENUM ('OPEN', 'RESPONDED', 'CLOSED', 'EXPIRED');
CREATE TYPE "ApplicationCaseNotificationOutboxStatus" AS ENUM ('PENDING', 'DISPATCHED', 'FAILED');

CREATE TABLE "application_cases" (
  "id" UUID NOT NULL,
  "caseReference" TEXT NOT NULL,
  "governmentServiceId" UUID NOT NULL,
  "governmentServiceVersionId" UUID NOT NULL,
  "configurationFingerprint" TEXT NOT NULL,
  "applicantIdentityId" UUID NOT NULL,
  "status" "ApplicationCaseStatus" NOT NULL DEFAULT 'OPEN',
  "currentWorkflowStage" "ApplicationCaseWorkflowStage" NOT NULL DEFAULT 'SUBMITTED',
  "workflowStageEnteredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "application_cases_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "application_case_submissions" (
  "id" UUID NOT NULL,
  "caseId" UUID NOT NULL,
  "submissionSequence" INTEGER NOT NULL,
  "governmentServiceVersionId" UUID NOT NULL,
  "formVersionId" UUID,
  "configurationFingerprint" TEXT NOT NULL,
  "pinnedChecklistItemIds" JSONB NOT NULL,
  "pinnedChecklistFingerprint" TEXT NOT NULL,
  "answers" JSONB NOT NULL DEFAULT '{}',
  "submittedAt" TIMESTAMP(3) NOT NULL,
  "submittedByIdentityId" UUID NOT NULL,
  "priorSubmissionId" UUID,
  "triggeredByDeficiencyNoticeId" UUID,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "application_case_submissions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "application_case_workflow_transitions" (
  "id" UUID NOT NULL,
  "caseId" UUID NOT NULL,
  "fromStage" "ApplicationCaseWorkflowStage" NOT NULL,
  "toStage" "ApplicationCaseWorkflowStage" NOT NULL,
  "reason" TEXT,
  "actorIdentityId" UUID,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "application_case_workflow_transitions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "application_case_completeness_reviews" (
  "id" UUID NOT NULL,
  "caseId" UUID NOT NULL,
  "applicationSubmissionId" UUID NOT NULL,
  "governmentServiceVersionId" UUID NOT NULL,
  "checklistConfigurationFingerprint" TEXT NOT NULL,
  "reviewerIdentityId" UUID,
  "reviewerOfficeholderId" UUID,
  "status" "ApplicationCaseCompletenessReviewStatus" NOT NULL DEFAULT 'PENDING',
  "reviewSequence" INTEGER NOT NULL DEFAULT 1,
  "startedAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "authorityEvaluationRecordId" UUID,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "application_case_completeness_reviews_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "application_case_completeness_review_items" (
  "id" UUID NOT NULL,
  "completenessReviewId" UUID NOT NULL,
  "checklistItemId" UUID NOT NULL,
  "checklistItemCode" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "isRequired" BOOLEAN NOT NULL DEFAULT true,
  "status" "ApplicationCaseCompletenessReviewItemStatus" NOT NULL DEFAULT 'UNRESOLVED',
  "reviewerNotes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "application_case_completeness_review_items_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "application_case_deficiency_notices" (
  "id" UUID NOT NULL,
  "reference" TEXT NOT NULL,
  "caseId" UUID NOT NULL,
  "applicationSubmissionId" UUID NOT NULL,
  "completenessReviewId" UUID NOT NULL,
  "requiredApplicantAction" TEXT NOT NULL,
  "responseDeadline" TIMESTAMP(3) NOT NULL,
  "departmentContactReference" TEXT NOT NULL,
  "issuedByIdentityId" UUID NOT NULL,
  "issuedByOfficeholderId" UUID,
  "issuedAt" TIMESTAMP(3) NOT NULL,
  "status" "ApplicationCaseDeficiencyNoticeStatus" NOT NULL DEFAULT 'ISSUED',
  "isProceduralNotice" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "application_case_deficiency_notices_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "application_case_deficiency_notice_items" (
  "id" UUID NOT NULL,
  "deficiencyNoticeId" UUID NOT NULL,
  "completenessReviewItemId" UUID NOT NULL,
  "checklistItemCode" TEXT NOT NULL,
  "deficiencyDescription" TEXT NOT NULL,
  "requiredAction" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "application_case_deficiency_notice_items_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "application_case_information_requests" (
  "id" UUID NOT NULL,
  "caseId" UUID NOT NULL,
  "deficiencyNoticeId" UUID NOT NULL,
  "originalSubmissionId" UUID NOT NULL,
  "responseSubmissionId" UUID,
  "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "responseDeadline" TIMESTAMP(3) NOT NULL,
  "status" "ApplicationCaseInformationRequestStatus" NOT NULL DEFAULT 'OPEN',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "application_case_information_requests_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "application_case_notification_outbox" (
  "id" UUID NOT NULL,
  "caseId" UUID NOT NULL,
  "eventType" TEXT NOT NULL,
  "payload" JSONB NOT NULL DEFAULT '{}',
  "status" "ApplicationCaseNotificationOutboxStatus" NOT NULL DEFAULT 'PENDING',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "application_case_notification_outbox_pkey" PRIMARY KEY ("id")
);

-- Runtime workflow track (6D isolated tables)
CREATE TYPE "RuntimeCaseRecordStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'DECISION_PENDING', 'AWAITING_ISSUANCE', 'CLOSED', 'CANCELLED');
CREATE TYPE "RuntimeWorkflowVersionStatus" AS ENUM ('DRAFT', 'ACTIVE', 'SUSPENDED', 'SUPERSEDED', 'ARCHIVED');
CREATE TYPE "RuntimeWorkflowStepType" AS ENUM ('ADMINISTRATIVE', 'DECISION_GATE', 'ISSUANCE_GATE', 'PARALLEL_FORK', 'PARALLEL_JOIN', 'WAITING_APPLICANT', 'WAITING_EXTERNAL', 'WAITING_PROFESSIONAL');
CREATE TYPE "RuntimeWorkflowTransitionConditionType" AS ENUM ('ALWAYS', 'STEP_COMPLETED', 'ALL_JOIN_BRANCHES_COMPLETE', 'CORRECTION_RETURN', 'ESCALATION');
CREATE TYPE "RuntimeCaseWorkflowInstanceStatus" AS ENUM ('NOT_STARTED', 'ACTIVE', 'WAITING_APPLICANT', 'WAITING_EXTERNAL', 'WAITING_PROFESSIONAL', 'PAUSED', 'SAFE_HALTED', 'SUSPENDED', 'COMPLETED', 'CANCELLED');
CREATE TYPE "RuntimeCaseWorkflowStepInstanceStatus" AS ENUM ('PENDING', 'READY', 'IN_PROGRESS', 'WAITING', 'BLOCKED', 'COMPLETED', 'SKIPPED_AUTHORIZED', 'SAFE_HALTED', 'CANCELLED');
CREATE TYPE "RuntimeCaseWorkflowTransitionEventType" AS ENUM ('WORKFLOW_STARTED', 'STEP_STARTED', 'STEP_COMPLETED', 'TRANSITION_EVALUATED', 'PARALLEL_FORK', 'PARALLEL_JOIN', 'PAUSE', 'RESUME', 'RETURN_FOR_CORRECTION', 'ESCALATION', 'SAFE_HALT', 'WORKFLOW_COMPLETED', 'WORKFLOW_CANCELLED');

CREATE TABLE "case_records" (
  "id" UUID NOT NULL,
  "caseReference" TEXT NOT NULL,
  "governmentServiceVersionId" UUID NOT NULL,
  "status" "RuntimeCaseRecordStatus" NOT NULL DEFAULT 'OPEN',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "case_records_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "runtime_workflow_definitions" (
  "id" UUID NOT NULL,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "governmentServiceVersionId" UUID NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "runtime_workflow_definitions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "runtime_workflow_versions" (
  "id" UUID NOT NULL,
  "workflowDefinitionId" UUID NOT NULL,
  "version" INTEGER NOT NULL,
  "status" "RuntimeWorkflowVersionStatus" NOT NULL DEFAULT 'DRAFT',
  "effectiveFrom" TIMESTAMP(3),
  "effectiveUntil" TIMESTAMP(3),
  "suspendedAt" TIMESTAMP(3),
  "supersededByVersionId" UUID,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "runtime_workflow_versions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "runtime_workflow_steps" (
  "id" UUID NOT NULL,
  "workflowVersionId" UUID NOT NULL,
  "stepKey" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "stepType" "RuntimeWorkflowStepType" NOT NULL,
  "stageKey" TEXT NOT NULL,
  "sequenceOrder" INTEGER NOT NULL DEFAULT 0,
  "functionAuthorityRecordId" UUID,
  "authorityAction" "AuthorityActionType",
  "isConsequential" BOOLEAN NOT NULL DEFAULT false,
  "isHumanRequired" BOOLEAN NOT NULL DEFAULT true,
  "parallelGroupKey" TEXT,
  "requiredJoinBranchKeys" JSONB NOT NULL DEFAULT '[]',
  "dependsOnStepKeys" JSONB NOT NULL DEFAULT '[]',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "runtime_workflow_steps_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "runtime_workflow_transitions" (
  "id" UUID NOT NULL,
  "workflowVersionId" UUID NOT NULL,
  "fromStepKey" TEXT NOT NULL,
  "toStepKey" TEXT NOT NULL,
  "transitionKey" TEXT NOT NULL,
  "conditionType" "RuntimeWorkflowTransitionConditionType" NOT NULL DEFAULT 'ALWAYS',
  "conditionRules" JSONB NOT NULL DEFAULT '{}',
  "isDefault" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "runtime_workflow_transitions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "runtime_case_workflow_instances" (
  "id" UUID NOT NULL,
  "caseId" UUID NOT NULL,
  "workflowVersionId" UUID NOT NULL,
  "status" "RuntimeCaseWorkflowInstanceStatus" NOT NULL DEFAULT 'NOT_STARTED',
  "currentStepKey" TEXT,
  "startedAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "pausedAt" TIMESTAMP(3),
  "safeHaltActive" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "runtime_case_workflow_instances_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "runtime_case_workflow_step_instances" (
  "id" UUID NOT NULL,
  "workflowInstanceId" UUID NOT NULL,
  "workflowStepId" UUID NOT NULL,
  "stepKey" TEXT NOT NULL,
  "status" "RuntimeCaseWorkflowStepInstanceStatus" NOT NULL DEFAULT 'PENDING',
  "startedAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "authorityEvaluationRecordId" UUID,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "runtime_case_workflow_step_instances_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "runtime_case_workflow_transition_events" (
  "id" UUID NOT NULL,
  "workflowInstanceId" UUID NOT NULL,
  "eventType" "RuntimeCaseWorkflowTransitionEventType" NOT NULL,
  "fromStepKey" TEXT,
  "toStepKey" TEXT,
  "actorIdentityId" UUID,
  "authorityEvaluationRecordId" UUID,
  "metadata" JSONB NOT NULL DEFAULT '{}',
  "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "runtime_case_workflow_transition_events_pkey" PRIMARY KEY ("id")
);

-- Phase 7C evidence enums
CREATE TYPE "EvidenceRecordStatus" AS ENUM (
  'REQUESTED', 'RECEIVED', 'UNREADABLE', 'INCOMPLETE', 'DUPLICATE', 'APPLICANT_ASSERTED',
  'EXTERNALLY_ISSUED', 'PENDING_VERIFICATION', 'VERIFIED', 'PARTIALLY_VERIFIED', 'DISPUTED',
  'EXPIRED', 'SUPERSEDED', 'WITHDRAWN', 'REJECTED_FOR_STATED_PURPOSE',
  'ACCEPTED_FOR_LIMITED_RELIANCE', 'ACCEPTED_FOR_ADMINISTRATIVE_PURPOSE'
);
CREATE TYPE "EvidenceType" AS ENUM ('DOCUMENT', 'DATA_EXTRACT', 'REGISTRY_RECORD', 'PROFESSIONAL_CERTIFICATION', 'PHOTOGRAPH', 'STATEMENT', 'OTHER');
CREATE TYPE "EvidenceSource" AS ENUM ('APPLICANT', 'THIRD_PARTY', 'GOVERNMENT_REGISTRY', 'PROFESSIONAL_BODY', 'INTERNAL', 'OTHER');
CREATE TYPE "EvidenceVerificationCategory" AS ENUM ('INTEGRITY', 'ISSUER', 'SIGNATURE', 'SEAL', 'IDENTITY', 'DATE', 'REGISTRY_MATCH', 'CONTENT_FACT', 'PROFESSIONAL', 'OTHER_CONTROLLED_METHOD');
CREATE TYPE "EvidenceVerificationResult" AS ENUM ('CONFIRMED', 'NOT_CONFIRMED', 'INCONCLUSIVE', 'COULD_NOT_VERIFY');
CREATE TYPE "EvidenceVerificationMethod" AS ENUM ('CHECKSUM_MATCH', 'DIGITAL_SIGNATURE_VALIDATION', 'REGISTRY_LOOKUP', 'ISSUER_CONFIRMATION', 'PROFESSIONAL_REGISTER_LOOKUP', 'VISUAL_INSPECTION', 'OTHER_CONTROLLED_METHOD', 'UNKNOWN');
CREATE TYPE "EvidenceRequirementRelationship" AS ENUM ('SATISFIES', 'PARTIALLY_SATISFIES', 'DOES_NOT_SATISFY', 'UNDER_REVIEW', 'NOT_APPLICABLE');
CREATE TYPE "EvidenceRequirementLinkStatus" AS ENUM ('LINKED', 'UNDER_REVIEW', 'SATISFIED', 'PARTIALLY_SATISFIED', 'NOT_SATISFIED', 'SUPERSEDED', 'WITHDRAWN');
CREATE TYPE "EvidenceAcceptancePurpose" AS ENUM ('COMPLETENESS', 'SUBSTANTIVE_REVIEW', 'PROFESSIONAL_REVIEW', 'INSPECTION', 'EXTERNAL_REFERRAL', 'FUTURE_DECISION_PACKET', 'COMPLIANCE', 'OTHER_APPROVED_PURPOSE');
CREATE TYPE "EvidenceAcceptanceDecision" AS ENUM ('ACCEPTED', 'REJECTED', 'LIMITED');
CREATE TYPE "EvidenceQualityCriterion" AS ENUM ('RELEVANCE', 'PROVENANCE', 'AUTHENTICITY', 'COMPLETENESS', 'CURRENCY', 'INDEPENDENCE', 'RELIABILITY', 'INTEGRITY', 'SCOPE', 'FITNESS_FOR_PURPOSE');
CREATE TYPE "EvidenceQualityRating" AS ENUM ('STRONG', 'ADEQUATE', 'WEAK', 'INSUFFICIENT', 'UNASSESSED');
CREATE TYPE "EvidenceQualityAssessmentSource" AS ENUM ('OFFICIAL', 'AI_PROPOSED');

CREATE TABLE "master_administrative_files" (
  "id" UUID NOT NULL,
  "fileReference" TEXT NOT NULL,
  "caseId" UUID NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "master_administrative_files_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "document_versions" (
  "id" UUID NOT NULL,
  "masterAdministrativeFileId" UUID NOT NULL,
  "documentReference" TEXT NOT NULL,
  "versionNumber" INTEGER NOT NULL,
  "integrityHash" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "document_versions_pkey" PRIMARY KEY ("id")
);

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

-- Indexes and constraints (abbreviated but complete for deploy)
CREATE UNIQUE INDEX "application_cases_caseReference_key" ON "application_cases"("caseReference");
CREATE UNIQUE INDEX "application_case_submissions_caseId_submissionSequence_key" ON "application_case_submissions"("caseId", "submissionSequence");
CREATE UNIQUE INDEX "application_case_completeness_review_items_completenessReviewId_checklistItemCode_key" ON "application_case_completeness_review_items"("completenessReviewId", "checklistItemCode");
CREATE UNIQUE INDEX "application_case_deficiency_notices_reference_key" ON "application_case_deficiency_notices"("reference");
CREATE UNIQUE INDEX "case_records_caseReference_key" ON "case_records"("caseReference");
CREATE UNIQUE INDEX "runtime_workflow_definitions_code_key" ON "runtime_workflow_definitions"("code");
CREATE UNIQUE INDEX "runtime_workflow_versions_workflowDefinitionId_version_key" ON "runtime_workflow_versions"("workflowDefinitionId", "version");
CREATE UNIQUE INDEX "runtime_workflow_steps_workflowVersionId_stepKey_key" ON "runtime_workflow_steps"("workflowVersionId", "stepKey");
CREATE UNIQUE INDEX "runtime_workflow_transitions_workflowVersionId_transitionKey_key" ON "runtime_workflow_transitions"("workflowVersionId", "transitionKey");
CREATE UNIQUE INDEX "runtime_case_workflow_step_instances_workflowInstanceId_stepKey_key" ON "runtime_case_workflow_step_instances"("workflowInstanceId", "stepKey");
CREATE UNIQUE INDEX "master_administrative_files_fileReference_key" ON "master_administrative_files"("fileReference");
CREATE UNIQUE INDEX "master_administrative_files_caseId_key" ON "master_administrative_files"("caseId");
CREATE UNIQUE INDEX "document_versions_masterAdministrativeFileId_documentReference_versionNumber_key" ON "document_versions"("masterAdministrativeFileId", "documentReference", "versionNumber");
CREATE UNIQUE INDEX "evidence_records_evidenceNumber_key" ON "evidence_records"("evidenceNumber");
CREATE UNIQUE INDEX "evidence_quality_assessments_evidenceId_criterion_assessmentSource_assessedAt_key" ON "evidence_quality_assessments"("evidenceId", "criterion", "assessmentSource", "assessedAt");

ALTER TABLE "application_cases" ADD CONSTRAINT "application_cases_governmentServiceId_fkey" FOREIGN KEY ("governmentServiceId") REFERENCES "government_services"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "application_cases" ADD CONSTRAINT "application_cases_governmentServiceVersionId_fkey" FOREIGN KEY ("governmentServiceVersionId") REFERENCES "government_service_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "application_cases" ADD CONSTRAINT "application_cases_applicantIdentityId_fkey" FOREIGN KEY ("applicantIdentityId") REFERENCES "identities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "application_case_submissions" ADD CONSTRAINT "application_case_submissions_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "application_cases"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "application_case_submissions" ADD CONSTRAINT "application_case_submissions_governmentServiceVersionId_fkey" FOREIGN KEY ("governmentServiceVersionId") REFERENCES "government_service_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "application_case_submissions" ADD CONSTRAINT "application_case_submissions_submittedByIdentityId_fkey" FOREIGN KEY ("submittedByIdentityId") REFERENCES "identities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "application_case_submissions" ADD CONSTRAINT "application_case_submissions_priorSubmissionId_fkey" FOREIGN KEY ("priorSubmissionId") REFERENCES "application_case_submissions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "application_case_submissions" ADD CONSTRAINT "application_case_submissions_triggeredByDeficiencyNoticeId_fkey" FOREIGN KEY ("triggeredByDeficiencyNoticeId") REFERENCES "application_case_deficiency_notices"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "application_case_workflow_transitions" ADD CONSTRAINT "application_case_workflow_transitions_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "application_cases"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "application_case_completeness_reviews" ADD CONSTRAINT "application_case_completeness_reviews_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "application_cases"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "application_case_completeness_reviews" ADD CONSTRAINT "application_case_completeness_reviews_applicationSubmissionId_fkey" FOREIGN KEY ("applicationSubmissionId") REFERENCES "application_case_submissions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "application_case_completeness_reviews" ADD CONSTRAINT "application_case_completeness_reviews_governmentServiceVersionId_fkey" FOREIGN KEY ("governmentServiceVersionId") REFERENCES "government_service_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "application_case_completeness_reviews" ADD CONSTRAINT "application_case_completeness_reviews_reviewerIdentityId_fkey" FOREIGN KEY ("reviewerIdentityId") REFERENCES "identities"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "application_case_completeness_reviews" ADD CONSTRAINT "application_case_completeness_reviews_reviewerOfficeholderId_fkey" FOREIGN KEY ("reviewerOfficeholderId") REFERENCES "officeholders"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "application_case_completeness_reviews" ADD CONSTRAINT "application_case_completeness_reviews_authorityEvaluationRecordId_fkey" FOREIGN KEY ("authorityEvaluationRecordId") REFERENCES "authority_evaluation_records"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "application_case_completeness_review_items" ADD CONSTRAINT "application_case_completeness_review_items_completenessReviewId_fkey" FOREIGN KEY ("completenessReviewId") REFERENCES "application_case_completeness_reviews"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "application_case_deficiency_notices" ADD CONSTRAINT "application_case_deficiency_notices_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "application_cases"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "application_case_deficiency_notices" ADD CONSTRAINT "application_case_deficiency_notices_applicationSubmissionId_fkey" FOREIGN KEY ("applicationSubmissionId") REFERENCES "application_case_submissions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "application_case_deficiency_notices" ADD CONSTRAINT "application_case_deficiency_notices_completenessReviewId_fkey" FOREIGN KEY ("completenessReviewId") REFERENCES "application_case_completeness_reviews"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "application_case_deficiency_notices" ADD CONSTRAINT "application_case_deficiency_notices_issuedByIdentityId_fkey" FOREIGN KEY ("issuedByIdentityId") REFERENCES "identities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "application_case_deficiency_notices" ADD CONSTRAINT "application_case_deficiency_notices_issuedByOfficeholderId_fkey" FOREIGN KEY ("issuedByOfficeholderId") REFERENCES "officeholders"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "application_case_deficiency_notice_items" ADD CONSTRAINT "application_case_deficiency_notice_items_deficiencyNoticeId_fkey" FOREIGN KEY ("deficiencyNoticeId") REFERENCES "application_case_deficiency_notices"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "application_case_deficiency_notice_items" ADD CONSTRAINT "application_case_deficiency_notice_items_completenessReviewItemId_fkey" FOREIGN KEY ("completenessReviewItemId") REFERENCES "application_case_completeness_review_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "application_case_information_requests" ADD CONSTRAINT "application_case_information_requests_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "application_cases"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "application_case_information_requests" ADD CONSTRAINT "application_case_information_requests_deficiencyNoticeId_fkey" FOREIGN KEY ("deficiencyNoticeId") REFERENCES "application_case_deficiency_notices"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "application_case_information_requests" ADD CONSTRAINT "application_case_information_requests_originalSubmissionId_fkey" FOREIGN KEY ("originalSubmissionId") REFERENCES "application_case_submissions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "application_case_information_requests" ADD CONSTRAINT "application_case_information_requests_responseSubmissionId_fkey" FOREIGN KEY ("responseSubmissionId") REFERENCES "application_case_submissions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "application_case_notification_outbox" ADD CONSTRAINT "application_case_notification_outbox_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "application_cases"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "case_records" ADD CONSTRAINT "case_records_governmentServiceVersionId_fkey" FOREIGN KEY ("governmentServiceVersionId") REFERENCES "government_service_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "runtime_workflow_definitions" ADD CONSTRAINT "runtime_workflow_definitions_governmentServiceVersionId_fkey" FOREIGN KEY ("governmentServiceVersionId") REFERENCES "government_service_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "runtime_workflow_versions" ADD CONSTRAINT "runtime_workflow_versions_workflowDefinitionId_fkey" FOREIGN KEY ("workflowDefinitionId") REFERENCES "runtime_workflow_definitions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "runtime_workflow_versions" ADD CONSTRAINT "runtime_workflow_versions_supersededByVersionId_fkey" FOREIGN KEY ("supersededByVersionId") REFERENCES "runtime_workflow_versions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "runtime_workflow_steps" ADD CONSTRAINT "runtime_workflow_steps_workflowVersionId_fkey" FOREIGN KEY ("workflowVersionId") REFERENCES "runtime_workflow_versions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "runtime_workflow_steps" ADD CONSTRAINT "runtime_workflow_steps_functionAuthorityRecordId_fkey" FOREIGN KEY ("functionAuthorityRecordId") REFERENCES "function_authority_records"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "runtime_workflow_transitions" ADD CONSTRAINT "runtime_workflow_transitions_workflowVersionId_fkey" FOREIGN KEY ("workflowVersionId") REFERENCES "runtime_workflow_versions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "runtime_case_workflow_instances" ADD CONSTRAINT "runtime_case_workflow_instances_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "case_records"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "runtime_case_workflow_instances" ADD CONSTRAINT "runtime_case_workflow_instances_workflowVersionId_fkey" FOREIGN KEY ("workflowVersionId") REFERENCES "runtime_workflow_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "runtime_case_workflow_step_instances" ADD CONSTRAINT "runtime_case_workflow_step_instances_workflowInstanceId_fkey" FOREIGN KEY ("workflowInstanceId") REFERENCES "runtime_case_workflow_instances"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "runtime_case_workflow_step_instances" ADD CONSTRAINT "runtime_case_workflow_step_instances_workflowStepId_fkey" FOREIGN KEY ("workflowStepId") REFERENCES "runtime_workflow_steps"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "runtime_case_workflow_step_instances" ADD CONSTRAINT "runtime_case_workflow_step_instances_authorityEvaluationRecordId_fkey" FOREIGN KEY ("authorityEvaluationRecordId") REFERENCES "authority_evaluation_records"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "runtime_case_workflow_transition_events" ADD CONSTRAINT "runtime_case_workflow_transition_events_workflowInstanceId_fkey" FOREIGN KEY ("workflowInstanceId") REFERENCES "runtime_case_workflow_instances"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "master_administrative_files" ADD CONSTRAINT "master_administrative_files_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "cases"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "document_versions" ADD CONSTRAINT "document_versions_masterAdministrativeFileId_fkey" FOREIGN KEY ("masterAdministrativeFileId") REFERENCES "master_administrative_files"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "evidence_records" ADD CONSTRAINT "evidence_records_masterAdministrativeFileId_fkey" FOREIGN KEY ("masterAdministrativeFileId") REFERENCES "master_administrative_files"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "evidence_records" ADD CONSTRAINT "evidence_records_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "cases"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "evidence_records" ADD CONSTRAINT "evidence_records_documentVersionId_fkey" FOREIGN KEY ("documentVersionId") REFERENCES "document_versions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "evidence_records" ADD CONSTRAINT "evidence_records_supersededByEvidenceId_fkey" FOREIGN KEY ("supersededByEvidenceId") REFERENCES "evidence_records"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "evidence_verifications" ADD CONSTRAINT "evidence_verifications_evidenceId_fkey" FOREIGN KEY ("evidenceId") REFERENCES "evidence_records"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "evidence_verifications" ADD CONSTRAINT "evidence_verifications_verifiedByIdentityId_fkey" FOREIGN KEY ("verifiedByIdentityId") REFERENCES "identities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "evidence_verifications" ADD CONSTRAINT "evidence_verifications_verifiedByOfficeholderId_fkey" FOREIGN KEY ("verifiedByOfficeholderId") REFERENCES "officeholders"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "evidence_verifications" ADD CONSTRAINT "evidence_verifications_authorityEvaluationRecordId_fkey" FOREIGN KEY ("authorityEvaluationRecordId") REFERENCES "authority_evaluation_records"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "evidence_requirement_links" ADD CONSTRAINT "evidence_requirement_links_evidenceId_fkey" FOREIGN KEY ("evidenceId") REFERENCES "evidence_records"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "evidence_requirement_links" ADD CONSTRAINT "evidence_requirement_links_checklistItemId_fkey" FOREIGN KEY ("checklistItemId") REFERENCES "government_service_checklist_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "evidence_purpose_acceptances" ADD CONSTRAINT "evidence_purpose_acceptances_evidenceId_fkey" FOREIGN KEY ("evidenceId") REFERENCES "evidence_records"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "evidence_purpose_acceptances" ADD CONSTRAINT "evidence_purpose_acceptances_reviewerIdentityId_fkey" FOREIGN KEY ("reviewerIdentityId") REFERENCES "identities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "evidence_purpose_acceptances" ADD CONSTRAINT "evidence_purpose_acceptances_reviewerOfficeholderId_fkey" FOREIGN KEY ("reviewerOfficeholderId") REFERENCES "officeholders"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "evidence_quality_assessments" ADD CONSTRAINT "evidence_quality_assessments_evidenceId_fkey" FOREIGN KEY ("evidenceId") REFERENCES "evidence_records"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "evidence_quality_assessments" ADD CONSTRAINT "evidence_quality_assessments_assessedByIdentityId_fkey" FOREIGN KEY ("assessedByIdentityId") REFERENCES "identities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "evidence_quality_assessments" ADD CONSTRAINT "evidence_quality_assessments_assessedByOfficeholderId_fkey" FOREIGN KEY ("assessedByOfficeholderId") REFERENCES "officeholders"("id") ON DELETE SET NULL ON UPDATE CASCADE;
