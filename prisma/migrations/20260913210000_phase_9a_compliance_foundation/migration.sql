-- Phase 9A: Continuing obligations and compliance foundation

CREATE TYPE "ComplianceMatterStatus" AS ENUM (
    'OPEN',
    'MONITORING',
    'AWAITING_REPORT',
    'UNDER_REVIEW',
    'INSPECTION_REQUIRED',
    'CORRECTIVE_ACTION',
    'ESCALATED',
    'REFERRED_EXTERNALLY',
    'SAFE_HALTED',
    'CLOSED'
);

CREATE TYPE "ContinuingObligationSourceType" AS ENUM (
    'DECISION_CONDITION',
    'INSTRUMENT_VERSION',
    'GOVERNING_SOURCE',
    'AUTHORIZED_REQUIREMENT'
);

CREATE TYPE "ContinuingObligationType" AS ENUM (
    'REPORTING',
    'FINANCIAL',
    'INSURANCE',
    'PROFESSIONAL_STATUS',
    'ACTIVITY_RESTRICTION',
    'OPERATING_CONDITION',
    'WORKFORCE',
    'ENVIRONMENTAL',
    'SAFETY',
    'CYBERSECURITY',
    'MAINTENANCE',
    'MILESTONE',
    'INCIDENT_NOTIFICATION',
    'INSPECTION',
    'RECORDKEEPING',
    'GOVERNMENT_CONFIRMATION',
    'OTHER_AUTHORIZED'
);

CREATE TYPE "ContinuingObligationStatus" AS ENUM (
    'NOT_YET_DUE',
    'DUE',
    'SUBMITTED',
    'UNDER_REVIEW',
    'SATISFIED',
    'PARTIALLY_SATISFIED',
    'OVERDUE',
    'DISPUTED',
    'EXEMPTED_BY_AUTHORIZED_ACTION',
    'SUPERSEDED',
    'CLOSED'
);

CREATE TYPE "ObligationScheduleStatus" AS ENUM (
    'SCHEDULED',
    'REMINDER_SENT',
    'DUE',
    'FULFILLED',
    'MISSED',
    'SUPERSEDED',
    'CLOSED'
);

CREATE TYPE "ObligationStatusChangeActor" AS ENUM (
    'COMPLIANCE_ADMIN',
    'REVIEWER',
    'SYSTEM',
    'HOLDER',
    'AI_ASSISTANCE',
    'PAYMENT_SYSTEM'
);

CREATE TABLE "compliance_matters" (
    "id" UUID NOT NULL,
    "complianceMatterNumber" TEXT NOT NULL,
    "masterAdministrativeFileId" UUID NOT NULL,
    "caseId" UUID,
    "officialInstrumentId" UUID NOT NULL,
    "holderIdentityId" UUID,
    "holderOrganizationId" UUID,
    "responsibleInstitutionId" UUID NOT NULL,
    "responsibleDepartmentId" UUID NOT NULL,
    "status" "ComplianceMatterStatus" NOT NULL DEFAULT 'OPEN',
    "openedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "compliance_matters_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "continuing_obligations" (
    "id" UUID NOT NULL,
    "complianceMatterId" UUID NOT NULL,
    "sourceType" "ContinuingObligationSourceType" NOT NULL,
    "sourceDecisionConditionId" UUID,
    "sourceInstrumentVersionId" UUID NOT NULL,
    "governingSourceId" UUID,
    "obligationCode" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "approvedConditionText" TEXT,
    "approvedConditionTextHash" TEXT,
    "responsibleParty" TEXT NOT NULL,
    "obligationType" "ContinuingObligationType" NOT NULL,
    "frequency" TEXT,
    "startDate" TIMESTAMP(3) NOT NULL,
    "dueDate" TIMESTAMP(3),
    "recurrenceConfiguration" JSONB,
    "evidenceStandard" TEXT,
    "reviewingOfficeId" UUID,
    "functionAuthorityRecordId" UUID,
    "noncomplianceConsequenceReference" TEXT,
    "exceptionProcedureReference" TEXT,
    "status" "ContinuingObligationStatus" NOT NULL DEFAULT 'NOT_YET_DUE',
    "supersededByObligationId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "continuing_obligations_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "obligation_schedules" (
    "id" UUID NOT NULL,
    "continuingObligationId" UUID NOT NULL,
    "occurrenceNumber" INTEGER NOT NULL,
    "scheduledDueDate" TIMESTAMP(3) NOT NULL,
    "lawfulDueDate" TIMESTAMP(3) NOT NULL,
    "reminderSentAt" TIMESTAMP(3),
    "status" "ObligationScheduleStatus" NOT NULL DEFAULT 'SCHEDULED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "obligation_schedules_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "obligation_status_history" (
    "id" UUID NOT NULL,
    "continuingObligationId" UUID NOT NULL,
    "fromStatus" "ContinuingObligationStatus",
    "toStatus" "ContinuingObligationStatus" NOT NULL,
    "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "changedByIdentityId" UUID,
    "actorClassification" "ObligationStatusChangeActor" NOT NULL,
    "reason" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    CONSTRAINT "obligation_status_history_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "compliance_matters_complianceMatterNumber_key" ON "compliance_matters"("complianceMatterNumber");
CREATE UNIQUE INDEX "continuing_obligations_supersededByObligationId_key" ON "continuing_obligations"("supersededByObligationId");
CREATE UNIQUE INDEX "continuing_obligations_complianceMatterId_obligationCode_key" ON "continuing_obligations"("complianceMatterId", "obligationCode");
CREATE UNIQUE INDEX "obligation_schedules_continuingObligationId_occurrenceNumber_key" ON "obligation_schedules"("continuingObligationId", "occurrenceNumber");

CREATE INDEX "compliance_matters_masterAdministrativeFileId_idx" ON "compliance_matters"("masterAdministrativeFileId");
CREATE INDEX "compliance_matters_caseId_idx" ON "compliance_matters"("caseId");
CREATE INDEX "compliance_matters_officialInstrumentId_idx" ON "compliance_matters"("officialInstrumentId");
CREATE INDEX "compliance_matters_status_idx" ON "compliance_matters"("status");
CREATE INDEX "continuing_obligations_complianceMatterId_idx" ON "continuing_obligations"("complianceMatterId");
CREATE INDEX "continuing_obligations_sourceDecisionConditionId_idx" ON "continuing_obligations"("sourceDecisionConditionId");
CREATE INDEX "continuing_obligations_sourceInstrumentVersionId_idx" ON "continuing_obligations"("sourceInstrumentVersionId");
CREATE INDEX "continuing_obligations_status_idx" ON "continuing_obligations"("status");
CREATE INDEX "obligation_schedules_continuingObligationId_idx" ON "obligation_schedules"("continuingObligationId");
CREATE INDEX "obligation_schedules_scheduledDueDate_idx" ON "obligation_schedules"("scheduledDueDate");
CREATE INDEX "obligation_schedules_status_idx" ON "obligation_schedules"("status");
CREATE INDEX "obligation_status_history_continuingObligationId_changedAt_idx" ON "obligation_status_history"("continuingObligationId", "changedAt");

ALTER TABLE "compliance_matters" ADD CONSTRAINT "compliance_matters_masterAdministrativeFileId_fkey" FOREIGN KEY ("masterAdministrativeFileId") REFERENCES "master_administrative_files"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "compliance_matters" ADD CONSTRAINT "compliance_matters_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "cases"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "compliance_matters" ADD CONSTRAINT "compliance_matters_officialInstrumentId_fkey" FOREIGN KEY ("officialInstrumentId") REFERENCES "official_instruments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "compliance_matters" ADD CONSTRAINT "compliance_matters_holderIdentityId_fkey" FOREIGN KEY ("holderIdentityId") REFERENCES "identities"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "compliance_matters" ADD CONSTRAINT "compliance_matters_holderOrganizationId_fkey" FOREIGN KEY ("holderOrganizationId") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "compliance_matters" ADD CONSTRAINT "compliance_matters_responsibleInstitutionId_fkey" FOREIGN KEY ("responsibleInstitutionId") REFERENCES "institutions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "compliance_matters" ADD CONSTRAINT "compliance_matters_responsibleDepartmentId_fkey" FOREIGN KEY ("responsibleDepartmentId") REFERENCES "departments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "continuing_obligations" ADD CONSTRAINT "continuing_obligations_complianceMatterId_fkey" FOREIGN KEY ("complianceMatterId") REFERENCES "compliance_matters"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "continuing_obligations" ADD CONSTRAINT "continuing_obligations_sourceDecisionConditionId_fkey" FOREIGN KEY ("sourceDecisionConditionId") REFERENCES "decision_conditions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "continuing_obligations" ADD CONSTRAINT "continuing_obligations_sourceInstrumentVersionId_fkey" FOREIGN KEY ("sourceInstrumentVersionId") REFERENCES "official_instrument_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "continuing_obligations" ADD CONSTRAINT "continuing_obligations_governingSourceId_fkey" FOREIGN KEY ("governingSourceId") REFERENCES "governing_sources"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "continuing_obligations" ADD CONSTRAINT "continuing_obligations_reviewingOfficeId_fkey" FOREIGN KEY ("reviewingOfficeId") REFERENCES "offices"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "continuing_obligations" ADD CONSTRAINT "continuing_obligations_functionAuthorityRecordId_fkey" FOREIGN KEY ("functionAuthorityRecordId") REFERENCES "function_authority_records"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "continuing_obligations" ADD CONSTRAINT "continuing_obligations_supersededByObligationId_fkey" FOREIGN KEY ("supersededByObligationId") REFERENCES "continuing_obligations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "obligation_schedules" ADD CONSTRAINT "obligation_schedules_continuingObligationId_fkey" FOREIGN KEY ("continuingObligationId") REFERENCES "continuing_obligations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "obligation_status_history" ADD CONSTRAINT "obligation_status_history_continuingObligationId_fkey" FOREIGN KEY ("continuingObligationId") REFERENCES "continuing_obligations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "obligation_status_history" ADD CONSTRAINT "obligation_status_history_changedByIdentityId_fkey" FOREIGN KEY ("changedByIdentityId") REFERENCES "identities"("id") ON DELETE SET NULL ON UPDATE CASCADE;
