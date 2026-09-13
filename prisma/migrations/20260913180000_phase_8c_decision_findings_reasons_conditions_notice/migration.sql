-- Phase 8C: Government decision findings, reasons, conditions, and notice

CREATE TYPE "GovernmentDecisionStatus" AS ENUM (
  'DRAFT',
  'FINDINGS_RECORDED',
  'REASONS_RECORDED',
  'CONDITIONS_ATTACHED',
  'NOTICE_PREPARED',
  'FINALIZED',
  'SUPERSEDED'
);

CREATE TYPE "GovernmentDecisionOutcome" AS ENUM (
  'APPROVED',
  'REFUSED',
  'CONDITIONAL_APPROVAL',
  'RETURN_FOR_INFORMATION',
  'WITHDRAWN',
  'OTHER_AUTHORIZED_OUTCOME'
);

CREATE TYPE "DecisionFindingStatus" AS ENUM (
  'ACTIVE',
  'SUPERSEDED',
  'WITHDRAWN'
);

CREATE TYPE "DecisionAssistanceStatus" AS ENUM (
  'DRAFT',
  'ACCEPTED',
  'REJECTED',
  'REVISED'
);

CREATE TYPE "DecisionConditionType" AS ENUM (
  'PRECEDENT_TO_ISSUANCE',
  'PRECEDENT_TO_ACTIVITY',
  'CONTINUING',
  'REPORTING',
  'CORRECTIVE',
  'EXPIRATION',
  'GOVERNMENT_CONFIRMATION',
  'PROFESSIONAL_CONFIRMATION',
  'OTHER_AUTHORIZED_CONDITION'
);

CREATE TYPE "DecisionConditionStatus" AS ENUM (
  'NOT_YET_EFFECTIVE',
  'PENDING',
  'SATISFIED',
  'PARTIALLY_SATISFIED',
  'DISPUTED',
  'OVERDUE',
  'FAILED',
  'WAIVED_BY_AUTHORIZED_DECISION',
  'SUPERSEDED',
  'CLOSED'
);

CREATE TYPE "DecisionNoticeStatus" AS ENUM (
  'DRAFT',
  'FINALIZED',
  'SUPERSEDED'
);

CREATE TYPE "DecisionNoticeRightType" AS ENUM (
  'ADMINISTRATIVE_CORRECTION',
  'CLARIFICATION',
  'COMPLAINT',
  'RECONSIDERATION',
  'INTERNAL_REVIEW',
  'STATUTORY_APPEAL',
  'PROFESSIONAL_CHALLENGE',
  'REGULATORY_REVIEW',
  'OMBUDSMAN_OR_OVERSIGHT',
  'JUDICIAL_REVIEW_INFORMATION',
  'OTHER_AUTHORIZED_ROUTE'
);

CREATE TYPE "DecisionNoticeEffectTiming" AS ENUM (
  'REQUIRED_BEFORE_EFFECTIVENESS',
  'REQUIRED_AFTER_DECISION',
  'INFORMATIONAL_ONLY'
);

CREATE TABLE "government_service_decision_type_definitions" (
  "id" UUID NOT NULL,
  "governmentServiceVersionId" UUID NOT NULL,
  "decisionTypeCode" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "description" TEXT,
  "permittedOutcomes" JSONB NOT NULL DEFAULT '[]',
  "requiresFindings" BOOLEAN NOT NULL DEFAULT true,
  "requiresReasons" BOOLEAN NOT NULL DEFAULT true,
  "requiresHumanConfirmationForAiDraft" BOOLEAN NOT NULL DEFAULT true,
  "noticeEffectTiming" "DecisionNoticeEffectTiming" NOT NULL DEFAULT 'REQUIRED_AFTER_DECISION',
  "supportedNoticeRightCodes" JSONB NOT NULL DEFAULT '[]',
  "blocksIssuanceOnUnsatisfiedPrecedent" BOOLEAN NOT NULL DEFAULT true,
  "permitsIssuanceDespiteUnsatisfiedPrecedent" BOOLEAN NOT NULL DEFAULT false,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "government_service_decision_type_definitions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "government_decisions" (
  "id" UUID NOT NULL,
  "decisionNumber" TEXT NOT NULL,
  "caseId" UUID NOT NULL,
  "governmentServiceVersionId" UUID NOT NULL,
  "decisionTypeCode" TEXT NOT NULL,
  "outcome" "GovernmentDecisionOutcome",
  "status" "GovernmentDecisionStatus" NOT NULL DEFAULT 'DRAFT',
  "decisionMakerIdentityId" UUID NOT NULL,
  "decisionMakerOfficeholderId" UUID NOT NULL,
  "functionAuthorityRecordId" UUID NOT NULL,
  "effectiveFrom" TIMESTAMP(3),
  "effectiveUntil" TIMESTAMP(3),
  "isFinalAdverse" BOOLEAN NOT NULL DEFAULT false,
  "finalizedAt" TIMESTAMP(3),
  "supersededById" UUID,
  "configurationFingerprint" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "government_decisions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "decision_findings" (
  "id" UUID NOT NULL,
  "governmentDecisionId" UUID NOT NULL,
  "sequence" INTEGER NOT NULL,
  "findingCode" TEXT,
  "findingText" TEXT NOT NULL,
  "sourceCriterionReference" TEXT,
  "evidenceReferences" JSONB NOT NULL DEFAULT '[]',
  "professionalReviewReferences" JSONB NOT NULL DEFAULT '[]',
  "governmentInputReferences" JSONB NOT NULL DEFAULT '[]',
  "status" "DecisionFindingStatus" NOT NULL DEFAULT 'ACTIVE',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "decision_findings_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "decision_reasons" (
  "id" UUID NOT NULL,
  "governmentDecisionId" UUID NOT NULL,
  "sequence" INTEGER NOT NULL,
  "reasonText" TEXT NOT NULL,
  "authorityReference" TEXT,
  "findingReferences" JSONB NOT NULL DEFAULT '[]',
  "evidenceReferences" JSONB NOT NULL DEFAULT '[]',
  "limitationDisclosure" TEXT,
  "decisionMakerOfficeholderId" UUID NOT NULL,
  "approvedTextHash" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "decision_reasons_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "decision_assistance_records" (
  "id" UUID NOT NULL,
  "governmentDecisionId" UUID NOT NULL,
  "decisionReasonId" UUID,
  "aiModelIdentifier" TEXT NOT NULL,
  "modelVersion" TEXT,
  "approvedUseCase" TEXT NOT NULL,
  "promptReference" TEXT,
  "sources" JSONB NOT NULL DEFAULT '[]',
  "draftOutputHash" TEXT NOT NULL,
  "humanReviewerIdentityId" UUID,
  "humanReviewerOfficeholderId" UUID,
  "humanModifications" TEXT,
  "status" "DecisionAssistanceStatus" NOT NULL DEFAULT 'DRAFT',
  "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "decision_assistance_records_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "decision_conditions" (
  "id" UUID NOT NULL,
  "governmentDecisionId" UUID NOT NULL,
  "conditionNumber" INTEGER NOT NULL,
  "conditionType" "DecisionConditionType" NOT NULL,
  "sourceAuthority" TEXT,
  "responsibleParty" TEXT NOT NULL,
  "requiredActionOrRestraint" TEXT NOT NULL,
  "approvedTextHash" TEXT,
  "dueAt" TIMESTAMP(3),
  "requiredEvidenceDescription" TEXT,
  "monitoringMethod" TEXT,
  "verifierOfficeAuthority" TEXT,
  "status" "DecisionConditionStatus" NOT NULL DEFAULT 'NOT_YET_EFFECTIVE',
  "consequenceOfNoncompliance" TEXT,
  "effectiveFrom" TIMESTAMP(3),
  "effectiveUntil" TIMESTAMP(3),
  "approvedAt" TIMESTAMP(3),
  "waiverDecisionId" UUID,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "decision_conditions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "decision_notices" (
  "id" UUID NOT NULL,
  "governmentDecisionId" UUID NOT NULL,
  "noticeNumber" TEXT NOT NULL,
  "decisionSummary" TEXT NOT NULL,
  "principalReasons" TEXT NOT NULL,
  "materialRequirementsNotSatisfied" TEXT,
  "conditionsSummary" TEXT,
  "effectiveDate" TIMESTAMP(3),
  "correctionOpportunity" TEXT,
  "reviewOrAppealRightsSummary" TEXT,
  "filingMethod" TEXT,
  "filingDeadline" TIMESTAMP(3),
  "competentReviewer" TEXT,
  "effectOfFiling" TEXT,
  "confidentialityRedactions" JSONB NOT NULL DEFAULT '[]',
  "noticeStatus" "DecisionNoticeStatus" NOT NULL DEFAULT 'DRAFT',
  "preparedAt" TIMESTAMP(3),
  "finalizedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "decision_notices_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "decision_notice_rights" (
  "id" UUID NOT NULL,
  "decisionNoticeId" UUID NOT NULL,
  "rightType" "DecisionNoticeRightType" NOT NULL,
  "routeCode" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "description" TEXT,
  "filingMethod" TEXT,
  "filingDeadline" TIMESTAMP(3),
  "competentReviewer" TEXT,
  "effectOfFiling" TEXT,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "decision_notice_rights_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "government_service_decision_type_definitions_governmentServiceVersionId_decisionTypeCode_key"
  ON "government_service_decision_type_definitions"("governmentServiceVersionId", "decisionTypeCode");
CREATE INDEX "government_service_decision_type_definitions_governmentServiceVersionId_idx"
  ON "government_service_decision_type_definitions"("governmentServiceVersionId");

CREATE UNIQUE INDEX "government_decisions_decisionNumber_key" ON "government_decisions"("decisionNumber");
CREATE INDEX "government_decisions_caseId_idx" ON "government_decisions"("caseId");
CREATE INDEX "government_decisions_governmentServiceVersionId_idx" ON "government_decisions"("governmentServiceVersionId");
CREATE INDEX "government_decisions_status_idx" ON "government_decisions"("status");
CREATE INDEX "government_decisions_decisionMakerOfficeholderId_idx" ON "government_decisions"("decisionMakerOfficeholderId");
CREATE INDEX "government_decisions_functionAuthorityRecordId_idx" ON "government_decisions"("functionAuthorityRecordId");

CREATE UNIQUE INDEX "decision_findings_governmentDecisionId_sequence_key"
  ON "decision_findings"("governmentDecisionId", "sequence");
CREATE INDEX "decision_findings_governmentDecisionId_idx" ON "decision_findings"("governmentDecisionId");

CREATE UNIQUE INDEX "decision_reasons_governmentDecisionId_sequence_key"
  ON "decision_reasons"("governmentDecisionId", "sequence");
CREATE INDEX "decision_reasons_governmentDecisionId_idx" ON "decision_reasons"("governmentDecisionId");
CREATE INDEX "decision_reasons_decisionMakerOfficeholderId_idx" ON "decision_reasons"("decisionMakerOfficeholderId");

CREATE INDEX "decision_assistance_records_governmentDecisionId_idx" ON "decision_assistance_records"("governmentDecisionId");
CREATE INDEX "decision_assistance_records_decisionReasonId_idx" ON "decision_assistance_records"("decisionReasonId");

CREATE UNIQUE INDEX "decision_conditions_governmentDecisionId_conditionNumber_key"
  ON "decision_conditions"("governmentDecisionId", "conditionNumber");
CREATE INDEX "decision_conditions_governmentDecisionId_idx" ON "decision_conditions"("governmentDecisionId");
CREATE INDEX "decision_conditions_status_idx" ON "decision_conditions"("status");

CREATE UNIQUE INDEX "decision_notices_noticeNumber_key" ON "decision_notices"("noticeNumber");
CREATE INDEX "decision_notices_governmentDecisionId_idx" ON "decision_notices"("governmentDecisionId");
CREATE INDEX "decision_notices_noticeStatus_idx" ON "decision_notices"("noticeStatus");

CREATE UNIQUE INDEX "decision_notice_rights_decisionNoticeId_routeCode_key"
  ON "decision_notice_rights"("decisionNoticeId", "routeCode");
CREATE INDEX "decision_notice_rights_decisionNoticeId_idx" ON "decision_notice_rights"("decisionNoticeId");

ALTER TABLE "government_service_decision_type_definitions"
  ADD CONSTRAINT "government_service_decision_type_definitions_governmentServiceVersionId_fkey"
  FOREIGN KEY ("governmentServiceVersionId") REFERENCES "government_service_versions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "government_decisions"
  ADD CONSTRAINT "government_decisions_caseId_fkey"
  FOREIGN KEY ("caseId") REFERENCES "cases"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "government_decisions"
  ADD CONSTRAINT "government_decisions_governmentServiceVersionId_fkey"
  FOREIGN KEY ("governmentServiceVersionId") REFERENCES "government_service_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "government_decisions"
  ADD CONSTRAINT "government_decisions_decisionMakerOfficeholderId_fkey"
  FOREIGN KEY ("decisionMakerOfficeholderId") REFERENCES "officeholders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "government_decisions"
  ADD CONSTRAINT "government_decisions_functionAuthorityRecordId_fkey"
  FOREIGN KEY ("functionAuthorityRecordId") REFERENCES "function_authority_records"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "government_decisions"
  ADD CONSTRAINT "government_decisions_supersededById_fkey"
  FOREIGN KEY ("supersededById") REFERENCES "government_decisions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "decision_findings"
  ADD CONSTRAINT "decision_findings_governmentDecisionId_fkey"
  FOREIGN KEY ("governmentDecisionId") REFERENCES "government_decisions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "decision_reasons"
  ADD CONSTRAINT "decision_reasons_governmentDecisionId_fkey"
  FOREIGN KEY ("governmentDecisionId") REFERENCES "government_decisions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "decision_reasons"
  ADD CONSTRAINT "decision_reasons_decisionMakerOfficeholderId_fkey"
  FOREIGN KEY ("decisionMakerOfficeholderId") REFERENCES "officeholders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "decision_assistance_records"
  ADD CONSTRAINT "decision_assistance_records_governmentDecisionId_fkey"
  FOREIGN KEY ("governmentDecisionId") REFERENCES "government_decisions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "decision_assistance_records"
  ADD CONSTRAINT "decision_assistance_records_decisionReasonId_fkey"
  FOREIGN KEY ("decisionReasonId") REFERENCES "decision_reasons"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "decision_conditions"
  ADD CONSTRAINT "decision_conditions_governmentDecisionId_fkey"
  FOREIGN KEY ("governmentDecisionId") REFERENCES "government_decisions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "decision_conditions"
  ADD CONSTRAINT "decision_conditions_waiverDecisionId_fkey"
  FOREIGN KEY ("waiverDecisionId") REFERENCES "government_decisions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "decision_notices"
  ADD CONSTRAINT "decision_notices_governmentDecisionId_fkey"
  FOREIGN KEY ("governmentDecisionId") REFERENCES "government_decisions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "decision_notice_rights"
  ADD CONSTRAINT "decision_notice_rights_decisionNoticeId_fkey"
  FOREIGN KEY ("decisionNoticeId") REFERENCES "decision_notices"("id") ON DELETE CASCADE ON UPDATE CASCADE;
