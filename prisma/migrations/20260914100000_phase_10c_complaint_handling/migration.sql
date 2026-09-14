-- Phase 10C: Complaint handling, investigation and remedy

CREATE TYPE "SubstantiveAppealStatus" AS ENUM (
  'LODGED',
  'ACKNOWLEDGED',
  'UNDER_ADJUDICATION',
  'DECIDED',
  'WITHDRAWN',
  'CLOSED'
);

CREATE TYPE "ComplaintCategory" AS ENUM (
  'SERVICE_QUALITY',
  'DELAY',
  'STAFF_CONDUCT',
  'ACCESSIBILITY',
  'DISCRIMINATION_ALLEGATION',
  'PRIVACY',
  'SECURITY',
  'UNAUTHORIZED_DISCLOSURE',
  'CONFLICT_OF_INTEREST',
  'PROCEDURAL_UNFAIRNESS',
  'PROFESSIONAL_CONDUCT',
  'SYSTEM_MALFUNCTION',
  'REVIEW_ROUTE_ACCESS',
  'RETALIATION_ALLEGATION',
  'OTHER_AUTHORIZED_CATEGORY'
);

CREATE TYPE "ComplaintStatus" AS ENUM (
  'RECEIVED',
  'ACKNOWLEDGED',
  'ASSIGNED',
  'UNDER_INVESTIGATION',
  'AWAITING_RESPONSE',
  'REMEDY_PENDING',
  'ESCALATED',
  'CLOSED'
);

CREATE TYPE "ComplaintSafeguardType" AS ENUM (
  'CONFIDENTIAL_HANDLING',
  'RESTRICTED_ACCESS',
  'RETALIATION_PROTECTION',
  'URGENT_SAFETY_SECURITY_REFERRAL',
  'PRIVACY_INCIDENT_REFERRAL',
  'PRESERVATION_LEGAL_HOLD',
  'INDEPENDENT_HANDLER_REQUIRED'
);

CREATE TYPE "ComplaintAssignmentStatus" AS ENUM (
  'PROPOSED',
  'ACTIVE',
  'WITHDRAWN',
  'BLOCKED_CONFLICT'
);

CREATE TYPE "ComplaintInvestigationStatus" AS ENUM (
  'PLANNED',
  'IN_PROGRESS',
  'ON_HOLD',
  'COMPLETED'
);

CREATE TYPE "ComplaintInvestigationIssueStatus" AS ENUM (
  'OPEN',
  'UNDER_REVIEW',
  'ADDRESSED',
  'OUT_OF_SCOPE'
);

CREATE TYPE "ComplaintEvidenceType" AS ENUM (
  'DOCUMENT',
  'INTERVIEW_NOTE',
  'COMMUNICATION',
  'SYSTEM_LOG',
  'STAFF_RECORD',
  'AI_AUTOMATION_RECORD',
  'OTHER'
);

CREATE TYPE "ComplaintEvidenceAccessLevel" AS ENUM (
  'RESTRICTED',
  'INTERNAL',
  'MINIMUM_NECESSARY'
);

CREATE TYPE "ComplaintFindingStatus" AS ENUM (
  'DRAFT',
  'PROPOSED',
  'FINALIZED'
);

CREATE TYPE "ComplaintInvestigationFindingOutcome" AS ENUM (
  'SUBSTANTIATED',
  'PARTIALLY_SUBSTANTIATED',
  'NOT_SUBSTANTIATED',
  'UNRESOLVED',
  'REFERRED',
  'OUTSIDE_SCOPE'
);

CREATE TYPE "ComplaintRemedyType" AS ENUM (
  'EXPLANATION',
  'APOLOGY',
  'SERVICE_CORRECTION',
  'ACCESS_RESTORATION',
  'PROCESS_CORRECTION',
  'STAFF_SUPERVISORY_REFERRAL',
  'PRIVACY_SECURITY_REMEDIATION',
  'RETRAINING',
  'SYSTEM_DEFECT_REMEDIATION',
  'ESCALATION',
  'REFERRAL',
  'RECOMMENDATION_FOR_RECONSIDERATION'
);

CREATE TYPE "ComplaintEscalationTarget" AS ENUM (
  'SUPERVISOR',
  'INDEPENDENT_REVIEWER',
  'PROFESSIONAL_BODY',
  'PRIVACY_COMMISSIONER',
  'SECURITY_INCIDENT_TEAM',
  'EXTERNAL_AUTHORITY'
);

CREATE TYPE "ComplaintClosureReason" AS ENUM (
  'RESOLVED',
  'PARTIALLY_RESOLVED',
  'UNSUBSTANTIATED',
  'OUT_OF_SCOPE',
  'WITHDRAWN',
  'DUPLICATED',
  'REFERRED'
);

CREATE TYPE "ComplaintPathwayActor" AS ENUM (
  'COMPLAINANT',
  'HANDLER',
  'INVESTIGATOR',
  'REVIEWER',
  'AI_ASSISTANCE',
  'SYSTEM'
);

CREATE TYPE "RedressRelatedMatterType" AS ENUM (
  'SUBSTANTIVE_APPEAL',
  'COMPLAINT',
  'RECONSIDERATION',
  'OTHER'
);

CREATE TYPE "ComplaintPathwayScope" AS ENUM (
  'COMPLAINT',
  'APPEAL',
  'SHARED'
);

CREATE TABLE "substantive_appeals" (
  "id" UUID NOT NULL,
  "appealNumber" TEXT NOT NULL,
  "masterAdministrativeFileId" UUID NOT NULL,
  "caseId" UUID,
  "governmentDecisionId" UUID,
  "appellantIdentityId" UUID NOT NULL,
  "status" "SubstantiveAppealStatus" NOT NULL DEFAULT 'LODGED',
  "subjectSummary" TEXT NOT NULL,
  "lodgedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "closedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "substantive_appeals_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "complaints" (
  "id" UUID NOT NULL,
  "complaintNumber" TEXT NOT NULL,
  "masterAdministrativeFileId" UUID NOT NULL,
  "caseId" UUID,
  "governmentDecisionId" UUID,
  "complainantIdentityId" UUID NOT NULL,
  "responsibleInstitutionId" UUID NOT NULL,
  "responsibleDepartmentId" UUID NOT NULL,
  "status" "ComplaintStatus" NOT NULL DEFAULT 'RECEIVED',
  "subjectSummary" TEXT NOT NULL,
  "pathwayScopeNotes" TEXT,
  "acknowledgedAt" TIMESTAMP(3),
  "closedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "complaints_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "complaint_classifications" (
  "id" UUID NOT NULL,
  "complaintId" UUID NOT NULL,
  "category" "ComplaintCategory" NOT NULL,
  "classificationNotes" TEXT,
  "isFactualFinding" BOOLEAN NOT NULL DEFAULT false,
  "classifiedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "classifiedByActor" "ComplaintPathwayActor" NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "complaint_classifications_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "complaint_safeguards" (
  "id" UUID NOT NULL,
  "complaintId" UUID NOT NULL,
  "safeguardType" "ComplaintSafeguardType" NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "configurationNotes" TEXT,
  "appliedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "appliedByActor" "ComplaintPathwayActor" NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "complaint_safeguards_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "complaint_assignments" (
  "id" UUID NOT NULL,
  "complaintId" UUID NOT NULL,
  "handlerIdentityId" UUID NOT NULL,
  "handlerInstitutionId" UUID NOT NULL,
  "handlerDepartmentId" UUID NOT NULL,
  "status" "ComplaintAssignmentStatus" NOT NULL DEFAULT 'PROPOSED',
  "competenceNotes" TEXT,
  "conflictCheckPassed" BOOLEAN NOT NULL DEFAULT false,
  "conflictReason" TEXT,
  "priorInvolvementDeclared" BOOLEAN NOT NULL DEFAULT false,
  "independenceRequired" BOOLEAN NOT NULL DEFAULT false,
  "independenceSatisfied" BOOLEAN NOT NULL DEFAULT false,
  "accessVerified" BOOLEAN NOT NULL DEFAULT false,
  "doesNotAlterDecisionAuthority" BOOLEAN NOT NULL DEFAULT true,
  "assignedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "complaint_assignments_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "complaint_investigations" (
  "id" UUID NOT NULL,
  "complaintId" UUID NOT NULL,
  "leadInvestigatorIdentityId" UUID NOT NULL,
  "status" "ComplaintInvestigationStatus" NOT NULL DEFAULT 'PLANNED',
  "scopeSummary" TEXT NOT NULL,
  "partiesSummary" TEXT,
  "limitationsSummary" TEXT,
  "conflictNotes" TEXT,
  "openedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "complaint_investigations_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "complaint_investigation_issues" (
  "id" UUID NOT NULL,
  "investigationId" UUID NOT NULL,
  "issueSummary" TEXT NOT NULL,
  "status" "ComplaintInvestigationIssueStatus" NOT NULL DEFAULT 'OPEN',
  "pathwayScope" "ComplaintPathwayScope" NOT NULL DEFAULT 'COMPLAINT',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "complaint_investigation_issues_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "complaint_investigation_evidence" (
  "id" UUID NOT NULL,
  "investigationId" UUID NOT NULL,
  "evidenceType" "ComplaintEvidenceType" NOT NULL,
  "accessLevel" "ComplaintEvidenceAccessLevel" NOT NULL DEFAULT 'MINIMUM_NECESSARY',
  "description" TEXT NOT NULL,
  "sourceReference" TEXT,
  "collectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "minimumNecessary" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "complaint_investigation_evidence_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "complaint_findings" (
  "id" UUID NOT NULL,
  "complaintId" UUID NOT NULL,
  "investigationId" UUID,
  "outcome" "ComplaintInvestigationFindingOutcome" NOT NULL,
  "status" "ComplaintFindingStatus" NOT NULL DEFAULT 'DRAFT',
  "findingSummary" TEXT NOT NULL,
  "isSubstantiveAppealOutcome" BOOLEAN NOT NULL DEFAULT false,
  "consequential" BOOLEAN NOT NULL DEFAULT false,
  "finalizedAt" TIMESTAMP(3),
  "finalizedByIdentityId" UUID,
  "recordedByActor" "ComplaintPathwayActor" NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "complaint_findings_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "complaint_responses" (
  "id" UUID NOT NULL,
  "complaintId" UUID NOT NULL,
  "responseSummary" TEXT NOT NULL,
  "isPublic" BOOLEAN NOT NULL DEFAULT true,
  "authorIdentityId" UUID NOT NULL,
  "recordedByActor" "ComplaintPathwayActor" NOT NULL,
  "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "complaint_responses_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "complaint_corrective_actions" (
  "id" UUID NOT NULL,
  "complaintId" UUID NOT NULL,
  "remedyType" "ComplaintRemedyType" NOT NULL,
  "description" TEXT NOT NULL,
  "mayReverseFinalDecision" BOOLEAN NOT NULL DEFAULT false,
  "authorizedSubstantiveReviewOnly" BOOLEAN NOT NULL DEFAULT true,
  "authorIdentityId" UUID NOT NULL,
  "recordedByActor" "ComplaintPathwayActor" NOT NULL,
  "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "complaint_corrective_actions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "complaint_escalations" (
  "id" UUID NOT NULL,
  "complaintId" UUID NOT NULL,
  "escalationTarget" "ComplaintEscalationTarget" NOT NULL,
  "reasonSummary" TEXT NOT NULL,
  "authorIdentityId" UUID NOT NULL,
  "recordedByActor" "ComplaintPathwayActor" NOT NULL,
  "escalatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "complaint_escalations_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "complaint_closures" (
  "id" UUID NOT NULL,
  "complaintId" UUID NOT NULL,
  "closureReason" "ComplaintClosureReason" NOT NULL,
  "closureSummary" TEXT NOT NULL,
  "evidencePreserved" BOOLEAN NOT NULL DEFAULT true,
  "decisionHistoryPreserved" BOOLEAN NOT NULL DEFAULT true,
  "furtherRedressSummary" TEXT,
  "authorIdentityId" UUID NOT NULL,
  "recordedByActor" "ComplaintPathwayActor" NOT NULL,
  "closedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "complaint_closures_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "complaint_retaliation_allegations" (
  "id" UUID NOT NULL,
  "complaintId" UUID NOT NULL,
  "allegationSummary" TEXT NOT NULL,
  "preservedSeparately" BOOLEAN NOT NULL DEFAULT true,
  "affectsRiskScore" BOOLEAN NOT NULL DEFAULT false,
  "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "recordedByActor" "ComplaintPathwayActor" NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "complaint_retaliation_allegations_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "complaint_related_matters" (
  "id" UUID NOT NULL,
  "complaintId" UUID NOT NULL,
  "relatedMatterType" "RedressRelatedMatterType" NOT NULL,
  "substantiveAppealId" UUID,
  "relatedComplaintId" UUID,
  "pathwayScope" "ComplaintPathwayScope" NOT NULL,
  "linkageNotes" TEXT NOT NULL,
  "doesNotAutoClose" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "complaint_related_matters_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "substantive_appeals_appealNumber_key" ON "substantive_appeals"("appealNumber");
CREATE INDEX "substantive_appeals_masterAdministrativeFileId_idx" ON "substantive_appeals"("masterAdministrativeFileId");
CREATE INDEX "substantive_appeals_caseId_idx" ON "substantive_appeals"("caseId");
CREATE INDEX "substantive_appeals_governmentDecisionId_idx" ON "substantive_appeals"("governmentDecisionId");
CREATE INDEX "substantive_appeals_status_idx" ON "substantive_appeals"("status");

CREATE UNIQUE INDEX "complaints_complaintNumber_key" ON "complaints"("complaintNumber");
CREATE INDEX "complaints_masterAdministrativeFileId_idx" ON "complaints"("masterAdministrativeFileId");
CREATE INDEX "complaints_caseId_idx" ON "complaints"("caseId");
CREATE INDEX "complaints_governmentDecisionId_idx" ON "complaints"("governmentDecisionId");
CREATE INDEX "complaints_status_idx" ON "complaints"("status");

CREATE INDEX "complaint_classifications_complaintId_idx" ON "complaint_classifications"("complaintId");
CREATE INDEX "complaint_classifications_category_idx" ON "complaint_classifications"("category");

CREATE INDEX "complaint_safeguards_complaintId_idx" ON "complaint_safeguards"("complaintId");
CREATE INDEX "complaint_safeguards_safeguardType_idx" ON "complaint_safeguards"("safeguardType");

CREATE INDEX "complaint_assignments_complaintId_idx" ON "complaint_assignments"("complaintId");
CREATE INDEX "complaint_assignments_handlerIdentityId_idx" ON "complaint_assignments"("handlerIdentityId");
CREATE INDEX "complaint_assignments_status_idx" ON "complaint_assignments"("status");

CREATE INDEX "complaint_investigations_complaintId_idx" ON "complaint_investigations"("complaintId");
CREATE INDEX "complaint_investigations_status_idx" ON "complaint_investigations"("status");

CREATE INDEX "complaint_investigation_issues_investigationId_idx" ON "complaint_investigation_issues"("investigationId");

CREATE INDEX "complaint_investigation_evidence_investigationId_idx" ON "complaint_investigation_evidence"("investigationId");
CREATE INDEX "complaint_investigation_evidence_accessLevel_idx" ON "complaint_investigation_evidence"("accessLevel");

CREATE INDEX "complaint_findings_complaintId_idx" ON "complaint_findings"("complaintId");
CREATE INDEX "complaint_findings_status_idx" ON "complaint_findings"("status");

CREATE INDEX "complaint_responses_complaintId_idx" ON "complaint_responses"("complaintId");

CREATE INDEX "complaint_corrective_actions_complaintId_idx" ON "complaint_corrective_actions"("complaintId");
CREATE INDEX "complaint_corrective_actions_remedyType_idx" ON "complaint_corrective_actions"("remedyType");

CREATE INDEX "complaint_escalations_complaintId_idx" ON "complaint_escalations"("complaintId");

CREATE UNIQUE INDEX "complaint_closures_complaintId_key" ON "complaint_closures"("complaintId");
CREATE INDEX "complaint_closures_closureReason_idx" ON "complaint_closures"("closureReason");

CREATE INDEX "complaint_retaliation_allegations_complaintId_idx" ON "complaint_retaliation_allegations"("complaintId");

CREATE INDEX "complaint_related_matters_complaintId_idx" ON "complaint_related_matters"("complaintId");
CREATE INDEX "complaint_related_matters_substantiveAppealId_idx" ON "complaint_related_matters"("substantiveAppealId");

ALTER TABLE "substantive_appeals" ADD CONSTRAINT "substantive_appeals_masterAdministrativeFileId_fkey" FOREIGN KEY ("masterAdministrativeFileId") REFERENCES "master_administrative_files"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "substantive_appeals" ADD CONSTRAINT "substantive_appeals_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "cases"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "substantive_appeals" ADD CONSTRAINT "substantive_appeals_governmentDecisionId_fkey" FOREIGN KEY ("governmentDecisionId") REFERENCES "government_decisions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "substantive_appeals" ADD CONSTRAINT "substantive_appeals_appellantIdentityId_fkey" FOREIGN KEY ("appellantIdentityId") REFERENCES "identities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "complaints" ADD CONSTRAINT "complaints_masterAdministrativeFileId_fkey" FOREIGN KEY ("masterAdministrativeFileId") REFERENCES "master_administrative_files"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "complaints" ADD CONSTRAINT "complaints_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "cases"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "complaints" ADD CONSTRAINT "complaints_governmentDecisionId_fkey" FOREIGN KEY ("governmentDecisionId") REFERENCES "government_decisions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "complaints" ADD CONSTRAINT "complaints_complainantIdentityId_fkey" FOREIGN KEY ("complainantIdentityId") REFERENCES "identities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "complaints" ADD CONSTRAINT "complaints_responsibleInstitutionId_fkey" FOREIGN KEY ("responsibleInstitutionId") REFERENCES "institutions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "complaints" ADD CONSTRAINT "complaints_responsibleDepartmentId_fkey" FOREIGN KEY ("responsibleDepartmentId") REFERENCES "departments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "complaint_classifications" ADD CONSTRAINT "complaint_classifications_complaintId_fkey" FOREIGN KEY ("complaintId") REFERENCES "complaints"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "complaint_safeguards" ADD CONSTRAINT "complaint_safeguards_complaintId_fkey" FOREIGN KEY ("complaintId") REFERENCES "complaints"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "complaint_assignments" ADD CONSTRAINT "complaint_assignments_complaintId_fkey" FOREIGN KEY ("complaintId") REFERENCES "complaints"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "complaint_assignments" ADD CONSTRAINT "complaint_assignments_handlerIdentityId_fkey" FOREIGN KEY ("handlerIdentityId") REFERENCES "identities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "complaint_investigations" ADD CONSTRAINT "complaint_investigations_complaintId_fkey" FOREIGN KEY ("complaintId") REFERENCES "complaints"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "complaint_investigations" ADD CONSTRAINT "complaint_investigations_leadInvestigatorIdentityId_fkey" FOREIGN KEY ("leadInvestigatorIdentityId") REFERENCES "identities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "complaint_investigation_issues" ADD CONSTRAINT "complaint_investigation_issues_investigationId_fkey" FOREIGN KEY ("investigationId") REFERENCES "complaint_investigations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "complaint_investigation_evidence" ADD CONSTRAINT "complaint_investigation_evidence_investigationId_fkey" FOREIGN KEY ("investigationId") REFERENCES "complaint_investigations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "complaint_findings" ADD CONSTRAINT "complaint_findings_complaintId_fkey" FOREIGN KEY ("complaintId") REFERENCES "complaints"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "complaint_findings" ADD CONSTRAINT "complaint_findings_finalizedByIdentityId_fkey" FOREIGN KEY ("finalizedByIdentityId") REFERENCES "identities"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "complaint_responses" ADD CONSTRAINT "complaint_responses_complaintId_fkey" FOREIGN KEY ("complaintId") REFERENCES "complaints"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "complaint_responses" ADD CONSTRAINT "complaint_responses_authorIdentityId_fkey" FOREIGN KEY ("authorIdentityId") REFERENCES "identities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "complaint_corrective_actions" ADD CONSTRAINT "complaint_corrective_actions_complaintId_fkey" FOREIGN KEY ("complaintId") REFERENCES "complaints"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "complaint_corrective_actions" ADD CONSTRAINT "complaint_corrective_actions_authorIdentityId_fkey" FOREIGN KEY ("authorIdentityId") REFERENCES "identities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "complaint_escalations" ADD CONSTRAINT "complaint_escalations_complaintId_fkey" FOREIGN KEY ("complaintId") REFERENCES "complaints"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "complaint_escalations" ADD CONSTRAINT "complaint_escalations_authorIdentityId_fkey" FOREIGN KEY ("authorIdentityId") REFERENCES "identities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "complaint_closures" ADD CONSTRAINT "complaint_closures_complaintId_fkey" FOREIGN KEY ("complaintId") REFERENCES "complaints"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "complaint_closures" ADD CONSTRAINT "complaint_closures_authorIdentityId_fkey" FOREIGN KEY ("authorIdentityId") REFERENCES "identities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "complaint_retaliation_allegations" ADD CONSTRAINT "complaint_retaliation_allegations_complaintId_fkey" FOREIGN KEY ("complaintId") REFERENCES "complaints"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "complaint_related_matters" ADD CONSTRAINT "complaint_related_matters_complaintId_fkey" FOREIGN KEY ("complaintId") REFERENCES "complaints"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "complaint_related_matters" ADD CONSTRAINT "complaint_related_matters_substantiveAppealId_fkey" FOREIGN KEY ("substantiveAppealId") REFERENCES "substantive_appeals"("id") ON DELETE SET NULL ON UPDATE CASCADE;
