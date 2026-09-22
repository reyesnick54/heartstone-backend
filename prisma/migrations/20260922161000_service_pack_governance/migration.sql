-- Service Pack governance, review, and institutional acceptance

CREATE TYPE "ServicePackGovernanceLifecycleStatus" AS ENUM (
  'NOT_IN_GOVERNANCE',
  'PENDING_REVIEW',
  'IN_REVIEW',
  'REVISION_REQUIRED',
  'PENDING_ACCEPTANCE',
  'INSTITUTIONALLY_ACCEPTED',
  'REJECTED',
  'WITHDRAWN',
  'DEPLOYMENT_READY'
);

CREATE TYPE "ServicePackReviewType" AS ENUM (
  'TECHNICAL_ARCHITECTURE',
  'SERVICE_OWNER',
  'DEPARTMENTAL',
  'AUTHORITY_LEGAL_BASIS',
  'CYBERSECURITY',
  'PRIVACY_DATA_GOVERNANCE',
  'INTEGRATION',
  'OPERATIONAL_READINESS',
  'EXECUTIVE_INSTITUTIONAL_ACCEPTANCE'
);

CREATE TYPE "ServicePackReviewStatus" AS ENUM (
  'DRAFT',
  'OPEN',
  'IN_PROGRESS',
  'COMPLETED',
  'CANCELLED'
);

CREATE TYPE "ServicePackReviewAssignmentStatus" AS ENUM (
  'ASSIGNED',
  'ACKNOWLEDGED',
  'COMPLETED',
  'DECLINED'
);

CREATE TYPE "ServicePackReviewFindingCode" AS ENUM (
  'MISSING_AUTHORITY_BASIS',
  'UNAUTHENTICATED_GOVERNING_SOURCE',
  'WORKFLOW_CONTROL_GAP',
  'PRIVACY_RISK',
  'SECURITY_RISK',
  'MISSING_REDRESS_ROUTE',
  'MISSING_RETENTION_RULE',
  'INTEGRATION_NOT_ACCEPTED',
  'DATA_CLASSIFICATION_ISSUE',
  'UNRESOLVED_EXTERNAL_DEPENDENCY',
  'ACCESS_CONTROL_GAP',
  'INVALID_DECISION_ACTOR',
  'EVIDENCE_REQUIREMENT_GAP',
  'OPERATIONAL_READINESS_GAP',
  'OTHER'
);

CREATE TYPE "ServicePackReviewFindingSeverity" AS ENUM (
  'INFO',
  'LOW',
  'MEDIUM',
  'HIGH',
  'BLOCKING'
);

CREATE TYPE "ServicePackReviewFindingCategory" AS ENUM (
  'AUTHORITY',
  'SECURITY',
  'PRIVACY',
  'INTEGRATION',
  'OPERATIONS',
  'WORKFLOW',
  'EVIDENCE',
  'DATA',
  'OTHER'
);

CREATE TYPE "ServicePackReviewFindingStatus" AS ENUM (
  'OPEN',
  'IN_REMEDIATION',
  'RESOLVED',
  'ACCEPTED_RISK',
  'DISMISSED'
);

CREATE TYPE "ServicePackReviewSignoffOutcome" AS ENUM (
  'CONCUR',
  'NON_CONCUR',
  'CONDITIONAL'
);

CREATE TYPE "ServicePackRevisionRequestStatus" AS ENUM (
  'OPEN',
  'ADDRESSED',
  'SUPERSEDED'
);

CREATE TYPE "ServicePackGovernanceAuditEventType" AS ENUM (
  'REVIEW_CREATED',
  'REVIEW_STARTED',
  'REVIEW_COMPLETED',
  'ASSIGNMENT_CREATED',
  'FINDING_RECORDED',
  'FINDING_RESOLVED',
  'COMMENT_ADDED',
  'EVIDENCE_ATTACHED',
  'SIGNOFF_RECORDED',
  'REVISION_REQUESTED',
  'SUBMITTED_FOR_ACCEPTANCE',
  'INSTITUTIONALLY_ACCEPTED',
  'REJECTED',
  'WITHDRAWN',
  'ACCEPTANCE_INVALIDATED',
  'DEPLOYMENT_READY_MARKED'
);

ALTER TABLE "service_pack_versions" ADD COLUMN "governanceLifecycleStatus" "ServicePackGovernanceLifecycleStatus" NOT NULL DEFAULT 'NOT_IN_GOVERNANCE';
CREATE INDEX "service_pack_versions_governanceLifecycleStatus_idx" ON "service_pack_versions"("governanceLifecycleStatus");

CREATE TABLE "service_pack_review_chain_policies" (
  "id" UUID NOT NULL,
  "institutionId" UUID NOT NULL,
  "jurisdictionId" UUID,
  "servicePackId" UUID,
  "name" TEXT NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "service_pack_review_chain_policies_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "service_pack_review_chain_steps" (
  "id" UUID NOT NULL,
  "policyId" UUID NOT NULL,
  "sequenceOrder" INTEGER NOT NULL,
  "reviewType" "ServicePackReviewType" NOT NULL,
  "required" BOOLEAN NOT NULL DEFAULT true,
  "requiresAuthorityEvaluation" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "service_pack_review_chain_steps_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "service_pack_reviews" (
  "id" UUID NOT NULL,
  "servicePackId" UUID NOT NULL,
  "servicePackVersionId" UUID NOT NULL,
  "reviewType" "ServicePackReviewType" NOT NULL,
  "status" "ServicePackReviewStatus" NOT NULL DEFAULT 'DRAFT',
  "chainStepId" UUID,
  "openedAt" TIMESTAMP(3),
  "closedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "service_pack_reviews_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "service_pack_review_assignments" (
  "id" UUID NOT NULL,
  "reviewId" UUID NOT NULL,
  "assigneeIdentityId" UUID NOT NULL,
  "assignedByIdentityId" UUID NOT NULL,
  "officeId" UUID,
  "status" "ServicePackReviewAssignmentStatus" NOT NULL DEFAULT 'ASSIGNED',
  "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completedAt" TIMESTAMP(3),
  CONSTRAINT "service_pack_review_assignments_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "service_pack_review_findings" (
  "id" UUID NOT NULL,
  "reviewId" UUID NOT NULL,
  "findingCode" "ServicePackReviewFindingCode" NOT NULL,
  "severity" "ServicePackReviewFindingSeverity" NOT NULL,
  "category" "ServicePackReviewFindingCategory" NOT NULL,
  "description" TEXT NOT NULL,
  "affectedComponent" TEXT,
  "status" "ServicePackReviewFindingStatus" NOT NULL DEFAULT 'OPEN',
  "resolverIdentityId" UUID,
  "evidenceReference" TEXT,
  "resolutionNotes" TEXT,
  "reporterIdentityId" UUID NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "resolvedAt" TIMESTAMP(3),
  CONSTRAINT "service_pack_review_findings_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "service_pack_review_comments" (
  "id" UUID NOT NULL,
  "reviewId" UUID NOT NULL,
  "authorIdentityId" UUID NOT NULL,
  "body" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "service_pack_review_comments_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "service_pack_review_evidence" (
  "id" UUID NOT NULL,
  "reviewId" UUID NOT NULL,
  "findingId" UUID,
  "recordReference" TEXT,
  "metadata" JSONB NOT NULL DEFAULT '{}',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "service_pack_review_evidence_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "service_pack_review_signoffs" (
  "id" UUID NOT NULL,
  "reviewId" UUID NOT NULL,
  "reviewerIdentityId" UUID NOT NULL,
  "outcome" "ServicePackReviewSignoffOutcome" NOT NULL,
  "notes" TEXT,
  "signedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "service_pack_review_signoffs_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "service_pack_acceptance_records" (
  "id" UUID NOT NULL,
  "servicePackId" UUID NOT NULL,
  "servicePackVersionId" UUID NOT NULL,
  "institutionId" UUID NOT NULL,
  "acceptingIdentityId" UUID NOT NULL,
  "officeholderId" UUID,
  "appointmentId" UUID,
  "authorityEvaluationRecordId" UUID,
  "acceptedScope" JSONB NOT NULL DEFAULT '{}',
  "acceptanceConditions" JSONB NOT NULL DEFAULT '[]',
  "unresolvedAcceptedRisks" JSONB NOT NULL DEFAULT '[]',
  "versionFingerprint" TEXT NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "acceptedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "invalidatedAt" TIMESTAMP(3),
  "invalidationReason" TEXT,
  CONSTRAINT "service_pack_acceptance_records_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "service_pack_rejection_records" (
  "id" UUID NOT NULL,
  "servicePackId" UUID NOT NULL,
  "servicePackVersionId" UUID NOT NULL,
  "rejectedByIdentityId" UUID NOT NULL,
  "reason" TEXT NOT NULL,
  "rejectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "service_pack_rejection_records_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "service_pack_revision_requests" (
  "id" UUID NOT NULL,
  "servicePackId" UUID NOT NULL,
  "servicePackVersionId" UUID NOT NULL,
  "reviewId" UUID NOT NULL,
  "requestedByIdentityId" UUID NOT NULL,
  "summary" TEXT NOT NULL,
  "status" "ServicePackRevisionRequestStatus" NOT NULL DEFAULT 'OPEN',
  "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "addressedAt" TIMESTAMP(3),
  CONSTRAINT "service_pack_revision_requests_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "service_pack_governance_audit_records" (
  "id" UUID NOT NULL,
  "servicePackId" UUID NOT NULL,
  "servicePackVersionId" UUID,
  "reviewId" UUID,
  "eventType" "ServicePackGovernanceAuditEventType" NOT NULL,
  "actorIdentityId" UUID NOT NULL,
  "metadata" JSONB NOT NULL DEFAULT '{}',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "service_pack_governance_audit_records_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "service_pack_review_chain_steps_policyId_sequenceOrder_key" ON "service_pack_review_chain_steps"("policyId", "sequenceOrder");
CREATE INDEX "service_pack_review_chain_policies_institutionId_idx" ON "service_pack_review_chain_policies"("institutionId");
CREATE INDEX "service_pack_review_chain_policies_servicePackId_idx" ON "service_pack_review_chain_policies"("servicePackId");
CREATE INDEX "service_pack_review_chain_steps_policyId_idx" ON "service_pack_review_chain_steps"("policyId");
CREATE INDEX "service_pack_reviews_servicePackId_idx" ON "service_pack_reviews"("servicePackId");
CREATE INDEX "service_pack_reviews_servicePackVersionId_idx" ON "service_pack_reviews"("servicePackVersionId");
CREATE INDEX "service_pack_reviews_status_idx" ON "service_pack_reviews"("status");
CREATE INDEX "service_pack_reviews_reviewType_idx" ON "service_pack_reviews"("reviewType");
CREATE INDEX "service_pack_review_assignments_reviewId_idx" ON "service_pack_review_assignments"("reviewId");
CREATE INDEX "service_pack_review_assignments_assigneeIdentityId_idx" ON "service_pack_review_assignments"("assigneeIdentityId");
CREATE INDEX "service_pack_review_findings_reviewId_idx" ON "service_pack_review_findings"("reviewId");
CREATE INDEX "service_pack_review_findings_status_idx" ON "service_pack_review_findings"("status");
CREATE INDEX "service_pack_review_findings_severity_idx" ON "service_pack_review_findings"("severity");
CREATE INDEX "service_pack_review_comments_reviewId_idx" ON "service_pack_review_comments"("reviewId");
CREATE INDEX "service_pack_review_evidence_reviewId_idx" ON "service_pack_review_evidence"("reviewId");
CREATE INDEX "service_pack_review_evidence_findingId_idx" ON "service_pack_review_evidence"("findingId");
CREATE INDEX "service_pack_review_signoffs_reviewId_idx" ON "service_pack_review_signoffs"("reviewId");
CREATE INDEX "service_pack_acceptance_records_servicePackVersionId_idx" ON "service_pack_acceptance_records"("servicePackVersionId");
CREATE INDEX "service_pack_acceptance_records_servicePackId_idx" ON "service_pack_acceptance_records"("servicePackId");
CREATE INDEX "service_pack_acceptance_records_institutionId_idx" ON "service_pack_acceptance_records"("institutionId");
CREATE INDEX "service_pack_acceptance_records_isActive_idx" ON "service_pack_acceptance_records"("isActive");
CREATE INDEX "service_pack_rejection_records_servicePackVersionId_idx" ON "service_pack_rejection_records"("servicePackVersionId");
CREATE INDEX "service_pack_rejection_records_servicePackId_idx" ON "service_pack_rejection_records"("servicePackId");
CREATE INDEX "service_pack_revision_requests_servicePackVersionId_idx" ON "service_pack_revision_requests"("servicePackVersionId");
CREATE INDEX "service_pack_revision_requests_reviewId_idx" ON "service_pack_revision_requests"("reviewId");
CREATE INDEX "service_pack_governance_audit_records_servicePackId_idx" ON "service_pack_governance_audit_records"("servicePackId");
CREATE INDEX "service_pack_governance_audit_records_servicePackVersionId_idx" ON "service_pack_governance_audit_records"("servicePackVersionId");
CREATE INDEX "service_pack_governance_audit_records_eventType_idx" ON "service_pack_governance_audit_records"("eventType");
CREATE INDEX "service_pack_governance_audit_records_createdAt_idx" ON "service_pack_governance_audit_records"("createdAt");

ALTER TABLE "service_pack_review_chain_policies" ADD CONSTRAINT "service_pack_review_chain_policies_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "institutions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "service_pack_review_chain_policies" ADD CONSTRAINT "service_pack_review_chain_policies_servicePackId_fkey" FOREIGN KEY ("servicePackId") REFERENCES "service_packs"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "service_pack_review_chain_steps" ADD CONSTRAINT "service_pack_review_chain_steps_policyId_fkey" FOREIGN KEY ("policyId") REFERENCES "service_pack_review_chain_policies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "service_pack_reviews" ADD CONSTRAINT "service_pack_reviews_servicePackId_fkey" FOREIGN KEY ("servicePackId") REFERENCES "service_packs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "service_pack_reviews" ADD CONSTRAINT "service_pack_reviews_servicePackVersionId_fkey" FOREIGN KEY ("servicePackVersionId") REFERENCES "service_pack_versions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "service_pack_reviews" ADD CONSTRAINT "service_pack_reviews_chainStepId_fkey" FOREIGN KEY ("chainStepId") REFERENCES "service_pack_review_chain_steps"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "service_pack_review_assignments" ADD CONSTRAINT "service_pack_review_assignments_reviewId_fkey" FOREIGN KEY ("reviewId") REFERENCES "service_pack_reviews"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "service_pack_review_assignments" ADD CONSTRAINT "service_pack_review_assignments_assigneeIdentityId_fkey" FOREIGN KEY ("assigneeIdentityId") REFERENCES "identities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "service_pack_review_assignments" ADD CONSTRAINT "service_pack_review_assignments_assignedByIdentityId_fkey" FOREIGN KEY ("assignedByIdentityId") REFERENCES "identities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "service_pack_review_findings" ADD CONSTRAINT "service_pack_review_findings_reviewId_fkey" FOREIGN KEY ("reviewId") REFERENCES "service_pack_reviews"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "service_pack_review_findings" ADD CONSTRAINT "service_pack_review_findings_reporterIdentityId_fkey" FOREIGN KEY ("reporterIdentityId") REFERENCES "identities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "service_pack_review_findings" ADD CONSTRAINT "service_pack_review_findings_resolverIdentityId_fkey" FOREIGN KEY ("resolverIdentityId") REFERENCES "identities"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "service_pack_review_comments" ADD CONSTRAINT "service_pack_review_comments_reviewId_fkey" FOREIGN KEY ("reviewId") REFERENCES "service_pack_reviews"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "service_pack_review_comments" ADD CONSTRAINT "service_pack_review_comments_authorIdentityId_fkey" FOREIGN KEY ("authorIdentityId") REFERENCES "identities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "service_pack_review_evidence" ADD CONSTRAINT "service_pack_review_evidence_reviewId_fkey" FOREIGN KEY ("reviewId") REFERENCES "service_pack_reviews"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "service_pack_review_evidence" ADD CONSTRAINT "service_pack_review_evidence_findingId_fkey" FOREIGN KEY ("findingId") REFERENCES "service_pack_review_findings"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "service_pack_review_signoffs" ADD CONSTRAINT "service_pack_review_signoffs_reviewId_fkey" FOREIGN KEY ("reviewId") REFERENCES "service_pack_reviews"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "service_pack_review_signoffs" ADD CONSTRAINT "service_pack_review_signoffs_reviewerIdentityId_fkey" FOREIGN KEY ("reviewerIdentityId") REFERENCES "identities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "service_pack_acceptance_records" ADD CONSTRAINT "service_pack_acceptance_records_servicePackId_fkey" FOREIGN KEY ("servicePackId") REFERENCES "service_packs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "service_pack_acceptance_records" ADD CONSTRAINT "service_pack_acceptance_records_servicePackVersionId_fkey" FOREIGN KEY ("servicePackVersionId") REFERENCES "service_pack_versions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "service_pack_acceptance_records" ADD CONSTRAINT "service_pack_acceptance_records_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "institutions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "service_pack_acceptance_records" ADD CONSTRAINT "service_pack_acceptance_records_acceptingIdentityId_fkey" FOREIGN KEY ("acceptingIdentityId") REFERENCES "identities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "service_pack_acceptance_records" ADD CONSTRAINT "service_pack_acceptance_records_officeholderId_fkey" FOREIGN KEY ("officeholderId") REFERENCES "officeholders"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "service_pack_acceptance_records" ADD CONSTRAINT "service_pack_acceptance_records_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "appointments"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "service_pack_acceptance_records" ADD CONSTRAINT "service_pack_acceptance_records_authorityEvaluationRecordId_fkey" FOREIGN KEY ("authorityEvaluationRecordId") REFERENCES "authority_evaluation_records"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "service_pack_rejection_records" ADD CONSTRAINT "service_pack_rejection_records_servicePackId_fkey" FOREIGN KEY ("servicePackId") REFERENCES "service_packs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "service_pack_rejection_records" ADD CONSTRAINT "service_pack_rejection_records_servicePackVersionId_fkey" FOREIGN KEY ("servicePackVersionId") REFERENCES "service_pack_versions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "service_pack_rejection_records" ADD CONSTRAINT "service_pack_rejection_records_rejectedByIdentityId_fkey" FOREIGN KEY ("rejectedByIdentityId") REFERENCES "identities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "service_pack_revision_requests" ADD CONSTRAINT "service_pack_revision_requests_servicePackId_fkey" FOREIGN KEY ("servicePackId") REFERENCES "service_packs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "service_pack_revision_requests" ADD CONSTRAINT "service_pack_revision_requests_servicePackVersionId_fkey" FOREIGN KEY ("servicePackVersionId") REFERENCES "service_pack_versions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "service_pack_revision_requests" ADD CONSTRAINT "service_pack_revision_requests_reviewId_fkey" FOREIGN KEY ("reviewId") REFERENCES "service_pack_reviews"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "service_pack_revision_requests" ADD CONSTRAINT "service_pack_revision_requests_requestedByIdentityId_fkey" FOREIGN KEY ("requestedByIdentityId") REFERENCES "identities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "service_pack_governance_audit_records" ADD CONSTRAINT "service_pack_governance_audit_records_servicePackId_fkey" FOREIGN KEY ("servicePackId") REFERENCES "service_packs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "service_pack_governance_audit_records" ADD CONSTRAINT "service_pack_governance_audit_records_servicePackVersionId_fkey" FOREIGN KEY ("servicePackVersionId") REFERENCES "service_pack_versions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "service_pack_governance_audit_records" ADD CONSTRAINT "service_pack_governance_audit_records_actorIdentityId_fkey" FOREIGN KEY ("actorIdentityId") REFERENCES "identities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
