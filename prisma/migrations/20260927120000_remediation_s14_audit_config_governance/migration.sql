-- Remediation S14: tamper-evident government audit ledger and governed configuration lifecycle

CREATE TYPE "GovernmentAuditActorType" AS ENUM ('HUMAN_IDENTITY', 'SERVICE_IDENTITY', 'SYSTEM', 'OFFICEHOLDER', 'UNKNOWN');

CREATE TYPE "GovernedConfigurationDomain" AS ENUM (
  'SERVICE_CONFIGURATION',
  'SLA_RULES',
  'ESCALATION',
  'RETENTION',
  'AUTHORITY_CONFIGURATION',
  'WORKFLOW_ACTIVATION',
  'INTEGRATION_REFERENCE',
  'SERVICE_PACK_ACTIVATION',
  'OTHER'
);

CREATE TYPE "GovernedConfigurationChangeStatus" AS ENUM (
  'DRAFT',
  'PROPOSED',
  'IN_REVIEW',
  'APPROVED',
  'SCHEDULED',
  'EFFECTIVE',
  'SUPERSEDED',
  'ROLLED_BACK'
);

CREATE TABLE "government_audit_ledger_entries" (
  "id" UUID NOT NULL,
  "ledgerStreamKey" TEXT NOT NULL,
  "sequenceNumber" BIGINT NOT NULL,
  "eventType" TEXT NOT NULL,
  "occurredAt" TIMESTAMP(3) NOT NULL,
  "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "actorType" "GovernmentAuditActorType" NOT NULL DEFAULT 'HUMAN_IDENTITY',
  "actorIdentityId" UUID,
  "actorOfficeholderId" UUID,
  "sessionId" UUID,
  "jurisdictionId" UUID,
  "institutionId" UUID,
  "departmentId" UUID,
  "officeId" UUID,
  "resourceType" TEXT,
  "resourceId" TEXT,
  "action" TEXT NOT NULL,
  "outcome" TEXT,
  "authorityEvaluationRecordId" UUID,
  "permissionDecisionReference" TEXT,
  "priorStateHash" TEXT,
  "newStateHash" TEXT,
  "metadata" JSONB NOT NULL DEFAULT '{}',
  "correlationId" TEXT,
  "traceId" TEXT,
  "previousLedgerHash" TEXT,
  "currentLedgerHash" TEXT NOT NULL,
  "payloadHash" TEXT NOT NULL,
  "sourceDomainEventType" TEXT,
  "sourceDomainEventId" TEXT,

  CONSTRAINT "government_audit_ledger_entries_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "gov_audit_ledger_stream_seq_uniq"
  ON "government_audit_ledger_entries"("ledgerStreamKey", "sequenceNumber");

CREATE UNIQUE INDEX "gov_audit_ledger_source_event_uniq"
  ON "government_audit_ledger_entries"("sourceDomainEventType", "sourceDomainEventId");

CREATE INDEX "gov_audit_ledger_stream_recorded_idx"
  ON "government_audit_ledger_entries"("ledgerStreamKey", "recordedAt");

CREATE INDEX "gov_audit_ledger_inst_occurred_idx"
  ON "government_audit_ledger_entries"("institutionId", "occurredAt");

CREATE INDEX "gov_audit_ledger_event_type_idx"
  ON "government_audit_ledger_entries"("eventType");

CREATE INDEX "gov_audit_ledger_correlation_idx"
  ON "government_audit_ledger_entries"("correlationId");

ALTER TABLE "government_audit_ledger_entries"
  ADD CONSTRAINT "government_audit_ledger_entries_actorIdentityId_fkey"
  FOREIGN KEY ("actorIdentityId") REFERENCES "identities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "government_audit_ledger_entries"
  ADD CONSTRAINT "government_audit_ledger_entries_jurisdictionId_fkey"
  FOREIGN KEY ("jurisdictionId") REFERENCES "jurisdictions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "government_audit_ledger_entries"
  ADD CONSTRAINT "government_audit_ledger_entries_institutionId_fkey"
  FOREIGN KEY ("institutionId") REFERENCES "institutions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "government_audit_ledger_entries"
  ADD CONSTRAINT "government_audit_ledger_entries_authorityEvaluationRecordId_fkey"
  FOREIGN KEY ("authorityEvaluationRecordId") REFERENCES "authority_evaluation_records"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "governed_configuration_changes" (
  "id" UUID NOT NULL,
  "institutionId" UUID NOT NULL,
  "jurisdictionId" UUID NOT NULL,
  "configurationDomain" "GovernedConfigurationDomain" NOT NULL,
  "configurationKey" TEXT NOT NULL,
  "status" "GovernedConfigurationChangeStatus" NOT NULL DEFAULT 'DRAFT',
  "proposedPayload" JSONB NOT NULL,
  "proposedPayloadHash" TEXT NOT NULL,
  "effectivePayload" JSONB,
  "effectivePayloadHash" TEXT,
  "proposerIdentityId" UUID NOT NULL,
  "approverIdentityId" UUID,
  "proposedAt" TIMESTAMP(3),
  "submittedForReviewAt" TIMESTAMP(3),
  "approvedAt" TIMESTAMP(3),
  "scheduledEffectiveAt" TIMESTAMP(3),
  "effectiveAt" TIMESTAMP(3),
  "supersededAt" TIMESTAMP(3),
  "rolledBackAt" TIMESTAMP(3),
  "supersedesChangeId" UUID,
  "rollbackOfChangeId" UUID,
  "reviewNotes" TEXT,
  "approvalNotes" TEXT,
  "correlationId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "governed_configuration_changes_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "gov_cfg_chg_inst_key_status_idx"
  ON "governed_configuration_changes"("institutionId", "configurationKey", "status");

CREATE INDEX "gov_cfg_chg_inst_domain_idx"
  ON "governed_configuration_changes"("institutionId", "configurationDomain");

ALTER TABLE "governed_configuration_changes"
  ADD CONSTRAINT "governed_configuration_changes_institutionId_fkey"
  FOREIGN KEY ("institutionId") REFERENCES "institutions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "governed_configuration_changes"
  ADD CONSTRAINT "governed_configuration_changes_jurisdictionId_fkey"
  FOREIGN KEY ("jurisdictionId") REFERENCES "jurisdictions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "governed_configuration_changes"
  ADD CONSTRAINT "governed_configuration_changes_proposerIdentityId_fkey"
  FOREIGN KEY ("proposerIdentityId") REFERENCES "identities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "governed_configuration_changes"
  ADD CONSTRAINT "governed_configuration_changes_approverIdentityId_fkey"
  FOREIGN KEY ("approverIdentityId") REFERENCES "identities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "governed_configuration_changes"
  ADD CONSTRAINT "governed_configuration_changes_supersedesChangeId_fkey"
  FOREIGN KEY ("supersedesChangeId") REFERENCES "governed_configuration_changes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "governed_configuration_changes"
  ADD CONSTRAINT "governed_configuration_changes_rollbackOfChangeId_fkey"
  FOREIGN KEY ("rollbackOfChangeId") REFERENCES "governed_configuration_changes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "governed_configuration_effective_versions" (
  "id" UUID NOT NULL,
  "changeId" UUID NOT NULL,
  "institutionId" UUID NOT NULL,
  "configurationDomain" "GovernedConfigurationDomain" NOT NULL,
  "configurationKey" TEXT NOT NULL,
  "effectiveFrom" TIMESTAMP(3) NOT NULL,
  "effectiveUntil" TIMESTAMP(3),
  "payload" JSONB NOT NULL,
  "payloadHash" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "governed_configuration_effective_versions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "gov_cfg_eff_ver_uniq"
  ON "governed_configuration_effective_versions"("institutionId", "configurationDomain", "configurationKey", "effectiveFrom");

CREATE INDEX "gov_cfg_eff_ver_lookup_idx"
  ON "governed_configuration_effective_versions"("institutionId", "configurationKey", "effectiveFrom");

ALTER TABLE "governed_configuration_effective_versions"
  ADD CONSTRAINT "governed_configuration_effective_versions_changeId_fkey"
  FOREIGN KEY ("changeId") REFERENCES "governed_configuration_changes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "governed_configuration_effective_versions"
  ADD CONSTRAINT "governed_configuration_effective_versions_institutionId_fkey"
  FOREIGN KEY ("institutionId") REFERENCES "institutions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE OR REPLACE FUNCTION prevent_government_audit_ledger_mutation()
RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'government_audit_ledger_entries is append-only';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER government_audit_ledger_append_only
BEFORE UPDATE OR DELETE ON government_audit_ledger_entries
FOR EACH ROW EXECUTE FUNCTION prevent_government_audit_ledger_mutation();
