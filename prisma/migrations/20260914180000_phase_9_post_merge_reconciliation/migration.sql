-- Phase 9 post-merge reconciliation: Phase 8C decision findings/reasons/notice and decision_conditions alignment.

DO $$ BEGIN
  CREATE TYPE "GovernmentDecisionOutcome" AS ENUM (
    'APPROVED',
    'REFUSED',
    'CONDITIONAL_APPROVAL',
    'RETURN_FOR_INFORMATION',
    'WITHDRAWN',
    'OTHER_AUTHORIZED_OUTCOME'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "DecisionFindingStatus" AS ENUM ('ACTIVE', 'SUPERSEDED', 'WITHDRAWN');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "DecisionAssistanceStatus" AS ENUM ('DRAFT', 'ACCEPTED', 'REJECTED', 'REVISED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "DecisionNoticeStatus" AS ENUM ('DRAFT', 'FINALIZED', 'SUPERSEDED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
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
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "DecisionNoticeEffectTiming" AS ENUM (
    'REQUIRED_BEFORE_EFFECTIVENESS',
    'REQUIRED_AFTER_DECISION',
    'INFORMATIONAL_ONLY'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "government_service_decision_type_definitions" (
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

CREATE TABLE IF NOT EXISTS "decision_findings" (
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

CREATE TABLE IF NOT EXISTS "decision_reasons" (
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

CREATE TABLE IF NOT EXISTS "decision_assistance_records" (
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

CREATE TABLE IF NOT EXISTS "decision_notices" (
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

CREATE TABLE IF NOT EXISTS "decision_notice_rights" (
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

CREATE UNIQUE INDEX IF NOT EXISTS "government_service_decision_type_definitions_governmentServ_key"
  ON "government_service_decision_type_definitions"("governmentServiceVersionId", "decisionTypeCode");
CREATE UNIQUE INDEX IF NOT EXISTS "decision_findings_governmentDecisionId_sequence_key"
  ON "decision_findings"("governmentDecisionId", "sequence");
CREATE UNIQUE INDEX IF NOT EXISTS "decision_reasons_governmentDecisionId_sequence_key"
  ON "decision_reasons"("governmentDecisionId", "sequence");
CREATE UNIQUE INDEX IF NOT EXISTS "decision_notices_noticeNumber_key" ON "decision_notices"("noticeNumber");
CREATE UNIQUE INDEX IF NOT EXISTS "decision_notice_rights_decisionNoticeId_routeCode_key"
  ON "decision_notice_rights"("decisionNoticeId", "routeCode");

DO $$ BEGIN
  ALTER TABLE "government_service_decision_type_definitions"
    ADD CONSTRAINT "government_service_decision_type_definitions_governmentServ_fkey"
    FOREIGN KEY ("governmentServiceVersionId") REFERENCES "government_service_versions"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "decision_findings"
    ADD CONSTRAINT "decision_findings_governmentDecisionId_fkey"
    FOREIGN KEY ("governmentDecisionId") REFERENCES "government_decisions"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "decision_reasons"
    ADD CONSTRAINT "decision_reasons_governmentDecisionId_fkey"
    FOREIGN KEY ("governmentDecisionId") REFERENCES "government_decisions"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "decision_reasons"
    ADD CONSTRAINT "decision_reasons_decisionMakerOfficeholderId_fkey"
    FOREIGN KEY ("decisionMakerOfficeholderId") REFERENCES "officeholders"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "decision_assistance_records"
    ADD CONSTRAINT "decision_assistance_records_governmentDecisionId_fkey"
    FOREIGN KEY ("governmentDecisionId") REFERENCES "government_decisions"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "decision_assistance_records"
    ADD CONSTRAINT "decision_assistance_records_decisionReasonId_fkey"
    FOREIGN KEY ("decisionReasonId") REFERENCES "decision_reasons"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "decision_notices"
    ADD CONSTRAINT "decision_notices_governmentDecisionId_fkey"
    FOREIGN KEY ("governmentDecisionId") REFERENCES "government_decisions"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "decision_notice_rights"
    ADD CONSTRAINT "decision_notice_rights_decisionNoticeId_fkey"
    FOREIGN KEY ("decisionNoticeId") REFERENCES "decision_notices"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Extend decision condition enums to Phase 8C canonical values.

ALTER TYPE "DecisionConditionStatus" ADD VALUE IF NOT EXISTS 'NOT_YET_EFFECTIVE';
ALTER TYPE "DecisionConditionStatus" ADD VALUE IF NOT EXISTS 'PARTIALLY_SATISFIED';
ALTER TYPE "DecisionConditionStatus" ADD VALUE IF NOT EXISTS 'DISPUTED';
ALTER TYPE "DecisionConditionStatus" ADD VALUE IF NOT EXISTS 'OVERDUE';
ALTER TYPE "DecisionConditionStatus" ADD VALUE IF NOT EXISTS 'WAIVED_BY_AUTHORIZED_DECISION';
ALTER TYPE "DecisionConditionStatus" ADD VALUE IF NOT EXISTS 'CLOSED';

ALTER TYPE "DecisionConditionType" ADD VALUE IF NOT EXISTS 'PRECEDENT_TO_ACTIVITY';
ALTER TYPE "DecisionConditionType" ADD VALUE IF NOT EXISTS 'CONTINUING';
ALTER TYPE "DecisionConditionType" ADD VALUE IF NOT EXISTS 'REPORTING';
ALTER TYPE "DecisionConditionType" ADD VALUE IF NOT EXISTS 'CORRECTIVE';
ALTER TYPE "DecisionConditionType" ADD VALUE IF NOT EXISTS 'EXPIRATION';
ALTER TYPE "DecisionConditionType" ADD VALUE IF NOT EXISTS 'GOVERNMENT_CONFIRMATION';
ALTER TYPE "DecisionConditionType" ADD VALUE IF NOT EXISTS 'PROFESSIONAL_CONFIRMATION';
ALTER TYPE "DecisionConditionType" ADD VALUE IF NOT EXISTS 'OTHER_AUTHORIZED_CONDITION';

-- Align legacy decision_conditions (Phase 8E) with Phase 8C canonical columns.

ALTER TABLE "decision_conditions" ADD COLUMN IF NOT EXISTS "conditionNumber" INTEGER;
ALTER TABLE "decision_conditions" ADD COLUMN IF NOT EXISTS "sourceAuthority" TEXT;
ALTER TABLE "decision_conditions" ADD COLUMN IF NOT EXISTS "responsibleParty" TEXT;
ALTER TABLE "decision_conditions" ADD COLUMN IF NOT EXISTS "requiredActionOrRestraint" TEXT;
ALTER TABLE "decision_conditions" ADD COLUMN IF NOT EXISTS "approvedTextHash" TEXT;
ALTER TABLE "decision_conditions" ADD COLUMN IF NOT EXISTS "dueAt" TIMESTAMP(3);
ALTER TABLE "decision_conditions" ADD COLUMN IF NOT EXISTS "requiredEvidenceDescription" TEXT;
ALTER TABLE "decision_conditions" ADD COLUMN IF NOT EXISTS "monitoringMethod" TEXT;
ALTER TABLE "decision_conditions" ADD COLUMN IF NOT EXISTS "verifierOfficeAuthority" TEXT;
ALTER TABLE "decision_conditions" ADD COLUMN IF NOT EXISTS "consequenceOfNoncompliance" TEXT;
ALTER TABLE "decision_conditions" ADD COLUMN IF NOT EXISTS "effectiveFrom" TIMESTAMP(3);
ALTER TABLE "decision_conditions" ADD COLUMN IF NOT EXISTS "effectiveUntil" TIMESTAMP(3);
ALTER TABLE "decision_conditions" ADD COLUMN IF NOT EXISTS "approvedAt" TIMESTAMP(3);
ALTER TABLE "decision_conditions" ADD COLUMN IF NOT EXISTS "waiverDecisionId" UUID;

UPDATE "decision_conditions" AS dc
SET
  "requiredActionOrRestraint" = COALESCE(dc."requiredActionOrRestraint", dc."description"),
  "responsibleParty" = COALESCE(dc."responsibleParty", 'Responsible party'),
  "approvedAt" = COALESCE(dc."approvedAt", dc."satisfiedAt")
WHERE dc."description" IS NOT NULL;

UPDATE "decision_conditions" AS dc
SET "conditionNumber" = numbered.rn
FROM (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY "governmentDecisionId" ORDER BY "createdAt", id) AS rn
  FROM "decision_conditions"
) AS numbered
WHERE dc.id = numbered.id AND dc."conditionNumber" IS NULL;

ALTER TABLE "decision_conditions" ALTER COLUMN "conditionNumber" SET NOT NULL;
ALTER TABLE "decision_conditions" ALTER COLUMN "responsibleParty" SET NOT NULL;
ALTER TABLE "decision_conditions" ALTER COLUMN "requiredActionOrRestraint" SET NOT NULL;

ALTER TABLE "decision_conditions" DROP COLUMN IF EXISTS "description";
ALTER TABLE "decision_conditions" DROP COLUMN IF EXISTS "satisfiedAt";
ALTER TABLE "decision_conditions" DROP COLUMN IF EXISTS "waivedAt";
ALTER TABLE "decision_conditions" DROP COLUMN IF EXISTS "failedAt";

ALTER TABLE "decision_conditions"
  ALTER COLUMN "updatedAt" SET DEFAULT CURRENT_TIMESTAMP;

CREATE UNIQUE INDEX IF NOT EXISTS "decision_conditions_governmentDecisionId_conditionNumber_key"
  ON "decision_conditions"("governmentDecisionId", "conditionNumber");

DO $$ BEGIN
  ALTER TABLE "decision_conditions"
    ADD CONSTRAINT "decision_conditions_waiverDecisionId_fkey"
    FOREIGN KEY ("waiverDecisionId") REFERENCES "government_decisions"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Phase 9 post-merge reconciliation: compliance matter 9E fields and boundary enums.

DO $$ BEGIN
  CREATE TYPE "ComplianceReviewOutcome" AS ENUM (
    'PENDING',
    'OBLIGATION_NOT_SATISFIED',
    'OBLIGATION_SATISFIED',
    'ADDITIONAL_EVIDENCE_REQUIRED',
    'REFERRED'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "ComplianceObservationClassification" AS ENUM (
    'OBSERVATION',
    'CONDITION_NOTED',
    'POSITIVE_INDICATOR',
    'INFORMATION_REQUESTED'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TYPE "ComplianceMatterStatus" ADD VALUE IF NOT EXISTS 'REOPENED';
ALTER TYPE "ComplianceMatterStatus" ADD VALUE IF NOT EXISTS 'ROUTED_IMMEDIATE_ACTION';

ALTER TABLE "compliance_matters" ADD COLUMN IF NOT EXISTS "riskLevel" "ComplianceRiskLevel" NOT NULL DEFAULT 'MODERATE';
ALTER TABLE "compliance_matters" ADD COLUMN IF NOT EXISTS "immediateActionRoute" "ComplianceImmediateActionRoute" NOT NULL DEFAULT 'NONE';
ALTER TABLE "compliance_matters" ADD COLUMN IF NOT EXISTS "summary" TEXT;
ALTER TABLE "compliance_matters" ADD COLUMN IF NOT EXISTS "authoritySource" TEXT;

ALTER TABLE "inspection_findings" ADD COLUMN IF NOT EXISTS "complianceMatterId" UUID;
ALTER TABLE "inspection_findings" ADD COLUMN IF NOT EXISTS "closedAt" TIMESTAMP(3);

DO $$ BEGIN
  ALTER TABLE "inspection_findings"
    ADD CONSTRAINT "inspection_findings_complianceMatterId_fkey"
    FOREIGN KEY ("complianceMatterId") REFERENCES "compliance_matters"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
