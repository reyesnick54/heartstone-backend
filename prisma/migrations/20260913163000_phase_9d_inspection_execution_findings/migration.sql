-- Phase 9D: Inspection execution, findings, and evidence

CREATE TYPE "InspectionSessionStatus" AS ENUM ('PENDING_START', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');
CREATE TYPE "InspectionFindingSeverity" AS ENUM ('INFORMATIONAL', 'MINOR', 'MODERATE', 'MAJOR', 'CRITICAL');
CREATE TYPE "InspectionFindingStatus" AS ENUM (
  'DRAFT', 'UNDER_REVIEW', 'CONFIRMED', 'DISPUTED', 'CORRECTIVE_ACTION_REQUIRED',
  'REFERRED', 'CLOSED', 'REOPENED', 'SUPERSEDED'
);
CREATE TYPE "InspectionResponseType" AS ENUM ('COMMENT', 'DISPUTED_FACTS', 'SUPPORTING_EVIDENCE', 'CORRECTION', 'CONTEXT');

CREATE TABLE "inspection_sessions" (
    "id" UUID NOT NULL,
    "inspectionRecordId" UUID NOT NULL,
    "caseAssignmentId" UUID,
    "jurisdictionId" UUID,
    "actualStartAt" TIMESTAMP(3),
    "startAuthorityEvaluationRecordId" UUID,
    "scopeVerified" BOOLEAN NOT NULL DEFAULT false,
    "locationVerified" BOOLEAN NOT NULL DEFAULT false,
    "qualificationVerified" BOOLEAN NOT NULL DEFAULT false,
    "independenceVerified" BOOLEAN NOT NULL DEFAULT false,
    "conflictOfInterestDeclared" BOOLEAN,
    "conflictOfInterestNotes" TEXT,
    "scopeAmendmentRequired" BOOLEAN NOT NULL DEFAULT false,
    "scopeAmendmentNotes" TEXT,
    "scopeAmendmentApprovedAt" TIMESTAMP(3),
    "scopeAmendmentApprovedByIdentityId" UUID,
    "scopeAmendmentApprovedByOfficeholderId" UUID,
    "amendedScope" TEXT,
    "status" "InspectionSessionStatus" NOT NULL DEFAULT 'PENDING_START',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "inspection_sessions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "inspection_observations" (
    "id" UUID NOT NULL,
    "inspectionSessionId" UUID NOT NULL,
    "inspectorIdentityId" UUID NOT NULL,
    "inspectorOfficeholderId" UUID NOT NULL,
    "whatObserved" TEXT NOT NULL,
    "whereObserved" TEXT NOT NULL,
    "observedAt" TIMESTAMP(3) NOT NULL,
    "observationMethod" TEXT,
    "limitations" TEXT,
    "disputedBySubject" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "inspection_observations_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "inspection_observation_evidence" (
    "id" UUID NOT NULL,
    "inspectionObservationId" UUID NOT NULL,
    "evidenceRecordId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "inspection_observation_evidence_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "inspection_findings" (
    "id" UUID NOT NULL,
    "inspectionSessionId" UUID NOT NULL,
    "findingNumber" TEXT NOT NULL,
    "factsReliedUpon" TEXT NOT NULL,
    "severity" "InspectionFindingSeverity" NOT NULL,
    "responsiblePartyReference" TEXT,
    "status" "InspectionFindingStatus" NOT NULL DEFAULT 'DRAFT',
    "recommendedDisposition" TEXT,
    "inspectorIdentityId" UUID NOT NULL,
    "inspectorOfficeholderId" UUID NOT NULL,
    "reviewerIdentityId" UUID,
    "reviewerOfficeholderId" UUID,
    "limitations" TEXT,
    "evidenceUnresolved" BOOLEAN NOT NULL DEFAULT false,
    "confirmationAuthorityEvaluationRecordId" UUID,
    "supersededById" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "inspection_findings_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "finding_requirement_links" (
    "id" UUID NOT NULL,
    "inspectionFindingId" UUID NOT NULL,
    "governingSourceId" UUID,
    "requirementReference" TEXT NOT NULL,
    "requirementSummary" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "finding_requirement_links_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "inspection_finding_evidence" (
    "id" UUID NOT NULL,
    "inspectionFindingId" UUID NOT NULL,
    "evidenceRecordId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "inspection_finding_evidence_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "inspection_responses" (
    "id" UUID NOT NULL,
    "inspectionSessionId" UUID NOT NULL,
    "inspectionFindingId" UUID,
    "inspectionObservationId" UUID,
    "responderIdentityId" UUID NOT NULL,
    "responseType" "InspectionResponseType" NOT NULL,
    "comments" TEXT,
    "disputedFacts" TEXT,
    "correction" TEXT,
    "context" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "inspection_responses_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "inspection_response_evidence" (
    "id" UUID NOT NULL,
    "inspectionResponseId" UUID NOT NULL,
    "evidenceRecordId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "inspection_response_evidence_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "inspection_completion_records" (
    "id" UUID NOT NULL,
    "inspectionSessionId" UUID NOT NULL,
    "scopeCompleted" TEXT NOT NULL,
    "limitations" TEXT,
    "areasInaccessible" TEXT,
    "openItems" TEXT,
    "followUpRequired" BOOLEAN NOT NULL DEFAULT false,
    "reinspectionRequired" BOOLEAN NOT NULL DEFAULT false,
    "referralsRequired" BOOLEAN NOT NULL DEFAULT false,
    "referralsNotes" TEXT,
    "constitutesComplianceCertification" BOOLEAN NOT NULL DEFAULT false,
    "complianceCertificationAuthorityEvaluationRecordId" UUID,
    "completedAt" TIMESTAMP(3) NOT NULL,
    "inspectorIdentityId" UUID NOT NULL,
    "inspectorOfficeholderId" UUID NOT NULL,
    "reviewerIdentityId" UUID,
    "reviewerOfficeholderId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "inspection_completion_records_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "inspection_sessions_inspectionRecordId_key" ON "inspection_sessions"("inspectionRecordId");
CREATE INDEX "inspection_sessions_status_idx" ON "inspection_sessions"("status");
CREATE INDEX "inspection_sessions_caseAssignmentId_idx" ON "inspection_sessions"("caseAssignmentId");
CREATE INDEX "inspection_sessions_jurisdictionId_idx" ON "inspection_sessions"("jurisdictionId");

CREATE INDEX "inspection_observations_inspectionSessionId_idx" ON "inspection_observations"("inspectionSessionId");
CREATE INDEX "inspection_observations_inspectorIdentityId_idx" ON "inspection_observations"("inspectorIdentityId");

CREATE UNIQUE INDEX "inspection_observation_evidence_inspectionObservationId_evidenceRecordId_key" ON "inspection_observation_evidence"("inspectionObservationId", "evidenceRecordId");
CREATE INDEX "inspection_observation_evidence_evidenceRecordId_idx" ON "inspection_observation_evidence"("evidenceRecordId");

CREATE UNIQUE INDEX "inspection_findings_inspectionSessionId_findingNumber_key" ON "inspection_findings"("inspectionSessionId", "findingNumber");
CREATE INDEX "inspection_findings_inspectionSessionId_idx" ON "inspection_findings"("inspectionSessionId");
CREATE INDEX "inspection_findings_status_idx" ON "inspection_findings"("status");

CREATE INDEX "finding_requirement_links_inspectionFindingId_idx" ON "finding_requirement_links"("inspectionFindingId");
CREATE INDEX "finding_requirement_links_governingSourceId_idx" ON "finding_requirement_links"("governingSourceId");

CREATE UNIQUE INDEX "inspection_finding_evidence_inspectionFindingId_evidenceRecordId_key" ON "inspection_finding_evidence"("inspectionFindingId", "evidenceRecordId");
CREATE INDEX "inspection_finding_evidence_evidenceRecordId_idx" ON "inspection_finding_evidence"("evidenceRecordId");

CREATE INDEX "inspection_responses_inspectionSessionId_idx" ON "inspection_responses"("inspectionSessionId");
CREATE INDEX "inspection_responses_inspectionFindingId_idx" ON "inspection_responses"("inspectionFindingId");
CREATE INDEX "inspection_responses_inspectionObservationId_idx" ON "inspection_responses"("inspectionObservationId");

CREATE UNIQUE INDEX "inspection_response_evidence_inspectionResponseId_evidenceRecordId_key" ON "inspection_response_evidence"("inspectionResponseId", "evidenceRecordId");
CREATE INDEX "inspection_response_evidence_evidenceRecordId_idx" ON "inspection_response_evidence"("evidenceRecordId");

CREATE UNIQUE INDEX "inspection_completion_records_inspectionSessionId_key" ON "inspection_completion_records"("inspectionSessionId");
CREATE INDEX "inspection_completion_records_completedAt_idx" ON "inspection_completion_records"("completedAt");

ALTER TABLE "inspection_sessions" ADD CONSTRAINT "inspection_sessions_inspectionRecordId_fkey" FOREIGN KEY ("inspectionRecordId") REFERENCES "inspection_records"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "inspection_sessions" ADD CONSTRAINT "inspection_sessions_caseAssignmentId_fkey" FOREIGN KEY ("caseAssignmentId") REFERENCES "case_assignments"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "inspection_sessions" ADD CONSTRAINT "inspection_sessions_jurisdictionId_fkey" FOREIGN KEY ("jurisdictionId") REFERENCES "jurisdictions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "inspection_sessions" ADD CONSTRAINT "inspection_sessions_startAuthorityEvaluationRecordId_fkey" FOREIGN KEY ("startAuthorityEvaluationRecordId") REFERENCES "authority_evaluation_records"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "inspection_sessions" ADD CONSTRAINT "inspection_sessions_scopeAmendmentApprovedByIdentityId_fkey" FOREIGN KEY ("scopeAmendmentApprovedByIdentityId") REFERENCES "identities"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "inspection_sessions" ADD CONSTRAINT "inspection_sessions_scopeAmendmentApprovedByOfficeholderId_fkey" FOREIGN KEY ("scopeAmendmentApprovedByOfficeholderId") REFERENCES "officeholders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "inspection_observations" ADD CONSTRAINT "inspection_observations_inspectionSessionId_fkey" FOREIGN KEY ("inspectionSessionId") REFERENCES "inspection_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "inspection_observations" ADD CONSTRAINT "inspection_observations_inspectorIdentityId_fkey" FOREIGN KEY ("inspectorIdentityId") REFERENCES "identities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "inspection_observations" ADD CONSTRAINT "inspection_observations_inspectorOfficeholderId_fkey" FOREIGN KEY ("inspectorOfficeholderId") REFERENCES "officeholders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "inspection_observation_evidence" ADD CONSTRAINT "inspection_observation_evidence_inspectionObservationId_fkey" FOREIGN KEY ("inspectionObservationId") REFERENCES "inspection_observations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "inspection_observation_evidence" ADD CONSTRAINT "inspection_observation_evidence_evidenceRecordId_fkey" FOREIGN KEY ("evidenceRecordId") REFERENCES "evidence_records"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "inspection_findings" ADD CONSTRAINT "inspection_findings_inspectionSessionId_fkey" FOREIGN KEY ("inspectionSessionId") REFERENCES "inspection_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "inspection_findings" ADD CONSTRAINT "inspection_findings_inspectorIdentityId_fkey" FOREIGN KEY ("inspectorIdentityId") REFERENCES "identities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "inspection_findings" ADD CONSTRAINT "inspection_findings_inspectorOfficeholderId_fkey" FOREIGN KEY ("inspectorOfficeholderId") REFERENCES "officeholders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "inspection_findings" ADD CONSTRAINT "inspection_findings_reviewerIdentityId_fkey" FOREIGN KEY ("reviewerIdentityId") REFERENCES "identities"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "inspection_findings" ADD CONSTRAINT "inspection_findings_reviewerOfficeholderId_fkey" FOREIGN KEY ("reviewerOfficeholderId") REFERENCES "officeholders"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "inspection_findings" ADD CONSTRAINT "inspection_findings_confirmationAuthorityEvaluationRecordId_fkey" FOREIGN KEY ("confirmationAuthorityEvaluationRecordId") REFERENCES "authority_evaluation_records"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "inspection_findings" ADD CONSTRAINT "inspection_findings_supersededById_fkey" FOREIGN KEY ("supersededById") REFERENCES "inspection_findings"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "finding_requirement_links" ADD CONSTRAINT "finding_requirement_links_inspectionFindingId_fkey" FOREIGN KEY ("inspectionFindingId") REFERENCES "inspection_findings"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "finding_requirement_links" ADD CONSTRAINT "finding_requirement_links_governingSourceId_fkey" FOREIGN KEY ("governingSourceId") REFERENCES "governing_sources"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "inspection_finding_evidence" ADD CONSTRAINT "inspection_finding_evidence_inspectionFindingId_fkey" FOREIGN KEY ("inspectionFindingId") REFERENCES "inspection_findings"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "inspection_finding_evidence" ADD CONSTRAINT "inspection_finding_evidence_evidenceRecordId_fkey" FOREIGN KEY ("evidenceRecordId") REFERENCES "evidence_records"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "inspection_responses" ADD CONSTRAINT "inspection_responses_inspectionSessionId_fkey" FOREIGN KEY ("inspectionSessionId") REFERENCES "inspection_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "inspection_responses" ADD CONSTRAINT "inspection_responses_inspectionFindingId_fkey" FOREIGN KEY ("inspectionFindingId") REFERENCES "inspection_findings"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "inspection_responses" ADD CONSTRAINT "inspection_responses_inspectionObservationId_fkey" FOREIGN KEY ("inspectionObservationId") REFERENCES "inspection_observations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "inspection_responses" ADD CONSTRAINT "inspection_responses_responderIdentityId_fkey" FOREIGN KEY ("responderIdentityId") REFERENCES "identities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "inspection_response_evidence" ADD CONSTRAINT "inspection_response_evidence_inspectionResponseId_fkey" FOREIGN KEY ("inspectionResponseId") REFERENCES "inspection_responses"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "inspection_response_evidence" ADD CONSTRAINT "inspection_response_evidence_evidenceRecordId_fkey" FOREIGN KEY ("evidenceRecordId") REFERENCES "evidence_records"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "inspection_completion_records" ADD CONSTRAINT "inspection_completion_records_inspectionSessionId_fkey" FOREIGN KEY ("inspectionSessionId") REFERENCES "inspection_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "inspection_completion_records" ADD CONSTRAINT "inspection_completion_records_inspectorIdentityId_fkey" FOREIGN KEY ("inspectorIdentityId") REFERENCES "identities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "inspection_completion_records" ADD CONSTRAINT "inspection_completion_records_inspectorOfficeholderId_fkey" FOREIGN KEY ("inspectorOfficeholderId") REFERENCES "officeholders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "inspection_completion_records" ADD CONSTRAINT "inspection_completion_records_reviewerIdentityId_fkey" FOREIGN KEY ("reviewerIdentityId") REFERENCES "identities"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "inspection_completion_records" ADD CONSTRAINT "inspection_completion_records_reviewerOfficeholderId_fkey" FOREIGN KEY ("reviewerOfficeholderId") REFERENCES "officeholders"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "inspection_completion_records" ADD CONSTRAINT "inspection_completion_records_complianceCertificationAuthorityEvaluationRecordId_fkey" FOREIGN KEY ("complianceCertificationAuthorityEvaluationRecordId") REFERENCES "authority_evaluation_records"("id") ON DELETE SET NULL ON UPDATE CASCADE;
