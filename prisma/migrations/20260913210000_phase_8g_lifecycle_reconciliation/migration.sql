-- Phase 8G (part 2): Reconcile official instrument lifecycle after issuance and delivery slices.

CREATE TYPE "OfficialInstrumentType" AS ENUM (
  'LICENSE',
  'PERMIT',
  'CERTIFICATE',
  'AUTHORIZATION',
  'REGISTRATION',
  'APPROVAL',
  'OTHER'
);

CREATE TYPE "InstrumentJurisdictionScope" AS ENUM (
  'NATIONAL',
  'ABSEZ',
  'INSTITUTIONAL',
  'OTHER'
);

CREATE TYPE "InstrumentLifecycleEventType" AS ENUM (
  'ISSUED',
  'BECAME_EFFECTIVE',
  'AMENDED',
  'VARIED',
  'RENEWED',
  'CORRECTED_CLERICAL',
  'REPLACED',
  'SUSPENDED',
  'PARTIALLY_SUSPENDED',
  'REVOCATION_DECIDED',
  'REVOKED',
  'REINSTATED',
  'EXPIRED',
  'SURRENDERED',
  'SUPERSEDED',
  'CLOSED'
);

CREATE TYPE "ReviewStayStatus" AS ENUM (
  'NONE',
  'INTERIM_STAY_AUTHORIZED',
  'STAY_DENIED',
  'STAY_EXPIRED',
  'STAY_LIFTED'
);

CREATE TYPE "ReviewInterimEffect" AS ENUM (
  'NONE',
  'PARTIAL_STAY',
  'FULL_STAY',
  'OPERATIONAL_CONTINUATION'
);

CREATE TYPE "SurrenderType" AS ENUM (
  'APPLICANT_REQUEST',
  'INSTITUTIONAL_ACCEPTANCE',
  'VOLUNTARY_CESSATION'
);

CREATE TYPE "PriorVersionTreatment" AS ENUM (
  'SUPERSEDED',
  'PARTIALLY_SUPERSEDED',
  'RETAINED_HISTORICAL',
  'REPLACED'
);

ALTER TYPE "OfficialInstrumentStatus" ADD VALUE IF NOT EXISTS 'DRAFT';
ALTER TYPE "OfficialInstrumentStatus" ADD VALUE IF NOT EXISTS 'EFFECTIVE';
ALTER TYPE "OfficialInstrumentStatus" ADD VALUE IF NOT EXISTS 'VARIED';
ALTER TYPE "OfficialInstrumentStatus" ADD VALUE IF NOT EXISTS 'RENEWED';
ALTER TYPE "OfficialInstrumentStatus" ADD VALUE IF NOT EXISTS 'PARTIALLY_SUSPENDED';
ALTER TYPE "OfficialInstrumentStatus" ADD VALUE IF NOT EXISTS 'REVOCATION_DECIDED';
ALTER TYPE "OfficialInstrumentStatus" ADD VALUE IF NOT EXISTS 'REINSTATED';
ALTER TYPE "OfficialInstrumentStatus" ADD VALUE IF NOT EXISTS 'SURRENDERED';
ALTER TYPE "OfficialInstrumentStatus" ADD VALUE IF NOT EXISTS 'CLOSED';

ALTER TABLE "official_instruments"
  ALTER COLUMN "instrumentTypeVersionId" DROP NOT NULL,
  ALTER COLUMN "caseId" DROP NOT NULL,
  ALTER COLUMN "masterAdministrativeFileId" DROP NOT NULL,
  ALTER COLUMN "issuerOfficeholderId" DROP NOT NULL,
  ALTER COLUMN "scope" SET DEFAULT '{}',
  ADD COLUMN "instrumentType" "OfficialInstrumentType",
  ADD COLUMN "jurisdictionScope" "InstrumentJurisdictionScope" DEFAULT 'NATIONAL',
  ADD COLUMN "holderOfficeholderId" UUID,
  ADD COLUMN "governmentServiceVersionId" UUID,
  ADD COLUMN "publicVerificationToken" TEXT,
  ADD COLUMN "publicVerificationStatus" TEXT,
  ADD COLUMN "publicVerificationUpdatedAt" TIMESTAMP(3);

CREATE UNIQUE INDEX "official_instruments_verificationCode_key" ON "official_instruments"("verificationCode");
CREATE UNIQUE INDEX "official_instruments_publicVerificationToken_key" ON "official_instruments"("publicVerificationToken");
CREATE INDEX "official_instruments_instrumentType_idx" ON "official_instruments"("instrumentType");
CREATE INDEX "official_instruments_jurisdictionScope_idx" ON "official_instruments"("jurisdictionScope");
CREATE INDEX "official_instruments_holderIdentityId_idx" ON "official_instruments"("holderIdentityId");
CREATE INDEX "official_instruments_publicVerificationToken_idx" ON "official_instruments"("publicVerificationToken");

ALTER TABLE "official_instruments"
  ADD CONSTRAINT "official_instruments_holderOfficeholderId_fkey"
  FOREIGN KEY ("holderOfficeholderId") REFERENCES "officeholders"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "official_instruments"
  ADD CONSTRAINT "official_instruments_governmentServiceVersionId_fkey"
  FOREIGN KEY ("governmentServiceVersionId") REFERENCES "government_service_versions"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "official_instrument_versions"
  ADD COLUMN "isCurrent" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "supersededByVersionId" UUID,
  ADD COLUMN "contentReference" TEXT,
  ADD COLUMN "scopeDescription" TEXT,
  ADD COLUMN "rightsAndObligations" JSONB NOT NULL DEFAULT '{}',
  ADD COLUMN "conditions" JSONB NOT NULL DEFAULT '[]',
  ADD COLUMN "effectiveFrom" TIMESTAMP(3),
  ADD COLUMN "effectiveUntil" TIMESTAMP(3),
  ADD COLUMN "priorVersionTreatment" "PriorVersionTreatment",
  ADD COLUMN "createdByDecisionId" UUID,
  ALTER COLUMN "templateVersionId" DROP NOT NULL,
  ALTER COLUMN "documentRecordId" DROP NOT NULL,
  ALTER COLUMN "documentVersionId" DROP NOT NULL,
  ALTER COLUMN "governmentDecisionId" DROP NOT NULL,
  ALTER COLUMN "conditionsSnapshot" DROP NOT NULL;

CREATE UNIQUE INDEX "official_instrument_versions_supersededByVersionId_key"
  ON "official_instrument_versions"("supersededByVersionId");
CREATE INDEX "official_instrument_versions_isCurrent_idx"
  ON "official_instrument_versions"("isCurrent");

ALTER TABLE "official_instrument_versions"
  ADD CONSTRAINT "official_instrument_versions_supersededByVersionId_fkey"
  FOREIGN KEY ("supersededByVersionId") REFERENCES "official_instrument_versions"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "official_instrument_versions"
  ADD CONSTRAINT "official_instrument_versions_createdByDecisionId_fkey"
  FOREIGN KEY ("createdByDecisionId") REFERENCES "government_decisions"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "instrument_lifecycle_events" (
  "id" UUID NOT NULL,
  "instrumentId" UUID NOT NULL,
  "eventType" "InstrumentLifecycleEventType" NOT NULL,
  "controllingDecisionId" UUID,
  "priorStatus" "OfficialInstrumentStatus",
  "newStatus" "OfficialInstrumentStatus" NOT NULL,
  "effectiveAt" TIMESTAMP(3) NOT NULL,
  "actorIdentityId" UUID,
  "actorOfficeholderId" UUID,
  "reason" TEXT,
  "metadata" JSONB NOT NULL DEFAULT '{}',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "instrument_lifecycle_events_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "instrument_lifecycle_decision_links" (
  "id" UUID NOT NULL,
  "lifecycleEventId" UUID NOT NULL,
  "governmentDecisionId" UUID NOT NULL,
  "linkRole" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "instrument_lifecycle_decision_links_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "instrument_amendment_records" (
  "id" UUID NOT NULL,
  "instrumentId" UUID NOT NULL,
  "priorVersionId" UUID NOT NULL,
  "newVersionId" UUID NOT NULL,
  "controllingDecisionId" UUID NOT NULL,
  "authorityReference" TEXT NOT NULL,
  "affectedScope" TEXT NOT NULL,
  "affectedRights" JSONB NOT NULL DEFAULT '[]',
  "affectedConditions" JSONB NOT NULL DEFAULT '[]',
  "evidenceIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "consultationRequired" BOOLEAN NOT NULL DEFAULT false,
  "consultationCompleted" BOOLEAN NOT NULL DEFAULT false,
  "noticeReference" TEXT,
  "reviewRightsReference" TEXT,
  "effectiveAt" TIMESTAMP(3) NOT NULL,
  "priorVersionTreatment" "PriorVersionTreatment" NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "instrument_amendment_records_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "instrument_renewal_records" (
  "id" UUID NOT NULL,
  "instrumentId" UUID NOT NULL,
  "priorVersionId" UUID NOT NULL,
  "newVersionId" UUID,
  "controllingDecisionId" UUID NOT NULL,
  "authorityReference" TEXT NOT NULL,
  "currentEvidenceIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "identityVerified" BOOLEAN NOT NULL DEFAULT false,
  "ownershipVerified" BOOLEAN NOT NULL DEFAULT false,
  "conditionsPerformanceVerified" BOOLEAN NOT NULL DEFAULT false,
  "inspectionHistoryVerified" BOOLEAN NOT NULL DEFAULT false,
  "professionalStatusVerified" BOOLEAN NOT NULL DEFAULT false,
  "feesVerified" BOOLEAN NOT NULL DEFAULT false,
  "priorApprovalReliedUpon" BOOLEAN NOT NULL DEFAULT false,
  "paymentReceived" BOOLEAN NOT NULL DEFAULT false,
  "newEffectiveFrom" TIMESTAMP(3) NOT NULL,
  "newEffectiveUntil" TIMESTAMP(3),
  "noticeReference" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "instrument_renewal_records_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "instrument_suspension_records" (
  "id" UUID NOT NULL,
  "instrumentId" UUID NOT NULL,
  "controllingDecisionId" UUID NOT NULL,
  "authorityReference" TEXT NOT NULL,
  "triggerReference" TEXT NOT NULL,
  "evidenceIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "urgencyLevel" TEXT,
  "scopeDescription" TEXT,
  "partialScope" JSONB,
  "noticeReference" TEXT,
  "opportunityToRespondProvided" BOOLEAN NOT NULL DEFAULT false,
  "interimActionReference" TEXT,
  "reasonsReference" TEXT NOT NULL,
  "effectiveAt" TIMESTAMP(3) NOT NULL,
  "durationUntil" TIMESTAMP(3),
  "conditions" JSONB NOT NULL DEFAULT '[]',
  "reviewRightsReference" TEXT,
  "downstreamNotifications" JSONB NOT NULL DEFAULT '[]',
  "executedByIdentityId" UUID,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "instrument_suspension_records_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "instrument_revocation_records" (
  "id" UUID NOT NULL,
  "instrumentId" UUID NOT NULL,
  "controllingDecisionId" UUID NOT NULL,
  "authorityReference" TEXT NOT NULL,
  "groundsReference" TEXT NOT NULL,
  "evidenceIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "noticeReference" TEXT,
  "opportunityToRespondProvided" BOOLEAN NOT NULL DEFAULT false,
  "reasonsReference" TEXT NOT NULL,
  "effectiveAt" TIMESTAMP(3) NOT NULL,
  "continuingObligations" JSONB NOT NULL DEFAULT '[]',
  "reviewRightsReference" TEXT,
  "downstreamNotifications" JSONB NOT NULL DEFAULT '[]',
  "closureRemediationReference" TEXT,
  "representsNationalRevocation" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "instrument_revocation_records_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "instrument_reinstatement_records" (
  "id" UUID NOT NULL,
  "instrumentId" UUID NOT NULL,
  "controllingDecisionId" UUID NOT NULL,
  "priorSuspensionRecordId" UUID,
  "priorRevocationRecordId" UUID,
  "authorityReference" TEXT NOT NULL,
  "correctiveEvidenceIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "inspectionVerified" BOOLEAN NOT NULL DEFAULT false,
  "professionalVerified" BOOLEAN NOT NULL DEFAULT false,
  "effectiveAt" TIMESTAMP(3) NOT NULL,
  "continuingConditions" JSONB NOT NULL DEFAULT '[]',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "instrument_reinstatement_records_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "instrument_replacement_records" (
  "id" UUID NOT NULL,
  "instrumentId" UUID NOT NULL,
  "priorVersionId" UUID NOT NULL,
  "replacementVersionId" UUID NOT NULL,
  "controllingDecisionId" UUID NOT NULL,
  "authorityReference" TEXT NOT NULL,
  "replacementReason" TEXT NOT NULL,
  "effectiveAt" TIMESTAMP(3) NOT NULL,
  "noticeReference" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "instrument_replacement_records_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "instrument_surrender_records" (
  "id" UUID NOT NULL,
  "instrumentId" UUID NOT NULL,
  "controllingDecisionId" UUID,
  "surrenderType" "SurrenderType" NOT NULL,
  "applicantRequestReference" TEXT,
  "institutionalAcceptanceReference" TEXT,
  "effectiveAt" TIMESTAMP(3) NOT NULL,
  "continuingObligations" JSONB NOT NULL DEFAULT '[]',
  "recordsRetentionReference" TEXT,
  "downstreamEffects" JSONB NOT NULL DEFAULT '[]',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "instrument_surrender_records_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "decision_review_references" (
  "id" UUID NOT NULL,
  "challengedDecisionId" UUID NOT NULL,
  "challengedInstrumentId" UUID,
  "reviewRoute" TEXT NOT NULL,
  "reviewAuthority" TEXT NOT NULL,
  "filedAt" TIMESTAMP(3) NOT NULL,
  "deadline" TIMESTAMP(3),
  "appellantIdentityId" UUID,
  "appellantOfficeholderId" UUID,
  "groundsReference" TEXT,
  "interimEffect" "ReviewInterimEffect" NOT NULL DEFAULT 'NONE',
  "stayStatus" "ReviewStayStatus" NOT NULL DEFAULT 'NONE',
  "finalDispositionReference" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "decision_review_references_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "instrument_lifecycle_events_instrumentId_effectiveAt_idx"
  ON "instrument_lifecycle_events"("instrumentId", "effectiveAt");
CREATE INDEX "instrument_lifecycle_events_eventType_idx"
  ON "instrument_lifecycle_events"("eventType");
CREATE INDEX "instrument_lifecycle_events_controllingDecisionId_idx"
  ON "instrument_lifecycle_events"("controllingDecisionId");
CREATE INDEX "instrument_lifecycle_decision_links_governmentDecisionId_idx"
  ON "instrument_lifecycle_decision_links"("governmentDecisionId");
CREATE UNIQUE INDEX "instrument_lifecycle_decision_links_lifecycleEventId_governme_key"
  ON "instrument_lifecycle_decision_links"("lifecycleEventId", "governmentDecisionId", "linkRole");
CREATE INDEX "instrument_amendment_records_instrumentId_idx" ON "instrument_amendment_records"("instrumentId");
CREATE INDEX "instrument_amendment_records_controllingDecisionId_idx" ON "instrument_amendment_records"("controllingDecisionId");
CREATE INDEX "instrument_renewal_records_instrumentId_idx" ON "instrument_renewal_records"("instrumentId");
CREATE INDEX "instrument_renewal_records_controllingDecisionId_idx" ON "instrument_renewal_records"("controllingDecisionId");
CREATE INDEX "instrument_suspension_records_instrumentId_idx" ON "instrument_suspension_records"("instrumentId");
CREATE INDEX "instrument_suspension_records_controllingDecisionId_idx" ON "instrument_suspension_records"("controllingDecisionId");
CREATE INDEX "instrument_revocation_records_instrumentId_idx" ON "instrument_revocation_records"("instrumentId");
CREATE INDEX "instrument_revocation_records_controllingDecisionId_idx" ON "instrument_revocation_records"("controllingDecisionId");
CREATE INDEX "instrument_reinstatement_records_instrumentId_idx" ON "instrument_reinstatement_records"("instrumentId");
CREATE INDEX "instrument_reinstatement_records_controllingDecisionId_idx" ON "instrument_reinstatement_records"("controllingDecisionId");
CREATE INDEX "instrument_replacement_records_instrumentId_idx" ON "instrument_replacement_records"("instrumentId");
CREATE INDEX "instrument_replacement_records_controllingDecisionId_idx" ON "instrument_replacement_records"("controllingDecisionId");
CREATE INDEX "instrument_surrender_records_instrumentId_idx" ON "instrument_surrender_records"("instrumentId");
CREATE INDEX "decision_review_references_challengedDecisionId_idx" ON "decision_review_references"("challengedDecisionId");
CREATE INDEX "decision_review_references_challengedInstrumentId_idx" ON "decision_review_references"("challengedInstrumentId");
CREATE INDEX "decision_review_references_stayStatus_idx" ON "decision_review_references"("stayStatus");

ALTER TABLE "instrument_lifecycle_events"
  ADD CONSTRAINT "instrument_lifecycle_events_instrumentId_fkey"
  FOREIGN KEY ("instrumentId") REFERENCES "official_instruments"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "instrument_lifecycle_events"
  ADD CONSTRAINT "instrument_lifecycle_events_controllingDecisionId_fkey"
  FOREIGN KEY ("controllingDecisionId") REFERENCES "government_decisions"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "instrument_lifecycle_events"
  ADD CONSTRAINT "instrument_lifecycle_events_actorIdentityId_fkey"
  FOREIGN KEY ("actorIdentityId") REFERENCES "identities"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "instrument_lifecycle_events"
  ADD CONSTRAINT "instrument_lifecycle_events_actorOfficeholderId_fkey"
  FOREIGN KEY ("actorOfficeholderId") REFERENCES "officeholders"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "instrument_lifecycle_decision_links"
  ADD CONSTRAINT "instrument_lifecycle_decision_links_lifecycleEventId_fkey"
  FOREIGN KEY ("lifecycleEventId") REFERENCES "instrument_lifecycle_events"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "instrument_lifecycle_decision_links"
  ADD CONSTRAINT "instrument_lifecycle_decision_links_governmentDecisionId_fkey"
  FOREIGN KEY ("governmentDecisionId") REFERENCES "government_decisions"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "instrument_amendment_records"
  ADD CONSTRAINT "instrument_amendment_records_instrumentId_fkey"
  FOREIGN KEY ("instrumentId") REFERENCES "official_instruments"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "instrument_amendment_records"
  ADD CONSTRAINT "instrument_amendment_records_priorVersionId_fkey"
  FOREIGN KEY ("priorVersionId") REFERENCES "official_instrument_versions"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "instrument_amendment_records"
  ADD CONSTRAINT "instrument_amendment_records_newVersionId_fkey"
  FOREIGN KEY ("newVersionId") REFERENCES "official_instrument_versions"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "instrument_amendment_records"
  ADD CONSTRAINT "instrument_amendment_records_controllingDecisionId_fkey"
  FOREIGN KEY ("controllingDecisionId") REFERENCES "government_decisions"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "instrument_renewal_records"
  ADD CONSTRAINT "instrument_renewal_records_instrumentId_fkey"
  FOREIGN KEY ("instrumentId") REFERENCES "official_instruments"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "instrument_renewal_records"
  ADD CONSTRAINT "instrument_renewal_records_priorVersionId_fkey"
  FOREIGN KEY ("priorVersionId") REFERENCES "official_instrument_versions"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "instrument_renewal_records"
  ADD CONSTRAINT "instrument_renewal_records_newVersionId_fkey"
  FOREIGN KEY ("newVersionId") REFERENCES "official_instrument_versions"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "instrument_renewal_records"
  ADD CONSTRAINT "instrument_renewal_records_controllingDecisionId_fkey"
  FOREIGN KEY ("controllingDecisionId") REFERENCES "government_decisions"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "instrument_suspension_records"
  ADD CONSTRAINT "instrument_suspension_records_instrumentId_fkey"
  FOREIGN KEY ("instrumentId") REFERENCES "official_instruments"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "instrument_suspension_records"
  ADD CONSTRAINT "instrument_suspension_records_controllingDecisionId_fkey"
  FOREIGN KEY ("controllingDecisionId") REFERENCES "government_decisions"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "instrument_suspension_records"
  ADD CONSTRAINT "instrument_suspension_records_executedByIdentityId_fkey"
  FOREIGN KEY ("executedByIdentityId") REFERENCES "identities"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "instrument_revocation_records"
  ADD CONSTRAINT "instrument_revocation_records_instrumentId_fkey"
  FOREIGN KEY ("instrumentId") REFERENCES "official_instruments"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "instrument_revocation_records"
  ADD CONSTRAINT "instrument_revocation_records_controllingDecisionId_fkey"
  FOREIGN KEY ("controllingDecisionId") REFERENCES "government_decisions"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "instrument_reinstatement_records"
  ADD CONSTRAINT "instrument_reinstatement_records_instrumentId_fkey"
  FOREIGN KEY ("instrumentId") REFERENCES "official_instruments"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "instrument_reinstatement_records"
  ADD CONSTRAINT "instrument_reinstatement_records_controllingDecisionId_fkey"
  FOREIGN KEY ("controllingDecisionId") REFERENCES "government_decisions"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "instrument_replacement_records"
  ADD CONSTRAINT "instrument_replacement_records_instrumentId_fkey"
  FOREIGN KEY ("instrumentId") REFERENCES "official_instruments"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "instrument_replacement_records"
  ADD CONSTRAINT "instrument_replacement_records_priorVersionId_fkey"
  FOREIGN KEY ("priorVersionId") REFERENCES "official_instrument_versions"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "instrument_replacement_records"
  ADD CONSTRAINT "instrument_replacement_records_replacementVersionId_fkey"
  FOREIGN KEY ("replacementVersionId") REFERENCES "official_instrument_versions"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "instrument_replacement_records"
  ADD CONSTRAINT "instrument_replacement_records_controllingDecisionId_fkey"
  FOREIGN KEY ("controllingDecisionId") REFERENCES "government_decisions"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "instrument_surrender_records"
  ADD CONSTRAINT "instrument_surrender_records_instrumentId_fkey"
  FOREIGN KEY ("instrumentId") REFERENCES "official_instruments"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "instrument_surrender_records"
  ADD CONSTRAINT "instrument_surrender_records_controllingDecisionId_fkey"
  FOREIGN KEY ("controllingDecisionId") REFERENCES "government_decisions"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "decision_review_references"
  ADD CONSTRAINT "decision_review_references_challengedDecisionId_fkey"
  FOREIGN KEY ("challengedDecisionId") REFERENCES "government_decisions"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "decision_review_references"
  ADD CONSTRAINT "decision_review_references_challengedInstrumentId_fkey"
  FOREIGN KEY ("challengedInstrumentId") REFERENCES "official_instruments"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "decision_review_references"
  ADD CONSTRAINT "decision_review_references_appellantIdentityId_fkey"
  FOREIGN KEY ("appellantIdentityId") REFERENCES "identities"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "decision_review_references"
  ADD CONSTRAINT "decision_review_references_appellantOfficeholderId_fkey"
  FOREIGN KEY ("appellantOfficeholderId") REFERENCES "officeholders"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
