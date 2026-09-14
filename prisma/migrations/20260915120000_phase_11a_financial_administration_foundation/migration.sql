-- Phase 11A: Financial Administration Foundation

CREATE TYPE "FeeScheduleLifecycleStatus" AS ENUM (
    'DRAFT',
    'UNDER_REVIEW',
    'APPROVED',
    'ACTIVE',
    'SUSPENDED',
    'SUPERSEDED',
    'RETIRED'
);

CREATE TYPE "FeeCalculationMethod" AS ENUM (
    'FIXED',
    'QUANTITY',
    'PERCENTAGE',
    'TIERED',
    'FORMULA_FROM_APPROVED_RULE',
    'MANUAL_AUTHORIZED_CALCULATION'
);

CREATE TYPE "FeeRefundabilityRule" AS ENUM (
    'NON_REFUNDABLE',
    'REFUNDABLE_PER_POLICY',
    'CONDITIONAL'
);

CREATE TYPE "FeeAssessmentStatus" AS ENUM (
    'CALCULATED',
    'SUPERSEDED',
    'LOCKED_FOR_INVOICE',
    'CANCELLED'
);

CREATE TYPE "InvoiceStatus" AS ENUM (
    'DRAFT',
    'ISSUED',
    'PARTIALLY_PAID',
    'PAID',
    'OVERDUE',
    'DISPUTED',
    'CANCELLED_BY_AUTHORIZED_ACTION',
    'SUPERSEDED',
    'CLOSED'
);

CREATE TYPE "FinancialAuditEventType" AS ENUM (
    'FEE_SCHEDULE_CREATED',
    'FEE_SCHEDULE_VERSION_CREATED',
    'FEE_SCHEDULE_VERSION_APPROVED',
    'FEE_SCHEDULE_VERSION_ACTIVATED',
    'FEE_SCHEDULE_VERSION_SUPERSEDED',
    'FEE_ASSESSMENT_CALCULATED',
    'FEE_ASSESSMENT_SUPERSEDED',
    'INVOICE_CREATED',
    'INVOICE_ISSUED',
    'INVOICE_STATUS_CHANGED'
);

CREATE TABLE "fee_schedules" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "responsibleInstitutionId" UUID NOT NULL,
    "responsibleDepartmentId" UUID NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'XCD',
    "status" "FeeScheduleLifecycleStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "fee_schedules_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "fee_schedule_versions" (
    "id" UUID NOT NULL,
    "feeScheduleId" UUID NOT NULL,
    "version" TEXT NOT NULL,
    "governingSourceId" UUID NOT NULL,
    "functionAuthorityRecordId" UUID,
    "effectiveFrom" TIMESTAMP(3) NOT NULL,
    "effectiveUntil" TIMESTAMP(3),
    "approvedByOfficeholderId" UUID,
    "approvedAt" TIMESTAMP(3),
    "authorityEvaluationRecordId" UUID,
    "status" "FeeScheduleLifecycleStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "fee_schedule_versions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "fee_schedule_items" (
    "id" UUID NOT NULL,
    "feeScheduleVersionId" UUID NOT NULL,
    "serviceId" UUID NOT NULL,
    "serviceVersionId" UUID,
    "governmentServiceFeeDefinitionId" UUID,
    "feeCode" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'XCD',
    "calculationMethod" "FeeCalculationMethod" NOT NULL DEFAULT 'FIXED',
    "unitBasis" TEXT,
    "minimumAmountCents" INTEGER,
    "maximumAmountCents" INTEGER,
    "taxOrLevyTreatment" TEXT,
    "waiverAllowed" BOOLEAN NOT NULL DEFAULT false,
    "refundabilityRule" "FeeRefundabilityRule" NOT NULL DEFAULT 'NON_REFUNDABLE',
    "effectiveFrom" TIMESTAMP(3) NOT NULL,
    "effectiveUntil" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "fee_schedule_items_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "fee_assessments" (
    "id" UUID NOT NULL,
    "assessmentNumber" TEXT NOT NULL,
    "applicationId" UUID,
    "caseId" UUID,
    "officialInstrumentId" UUID,
    "complianceMatterId" UUID,
    "redressMatterId" UUID,
    "masterAdministrativeFileId" UUID,
    "feeScheduleVersionId" UUID NOT NULL,
    "calculatedItems" JSONB NOT NULL DEFAULT '[]',
    "subtotalCents" INTEGER NOT NULL,
    "adjustmentsCents" INTEGER NOT NULL DEFAULT 0,
    "totalCents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'XCD',
    "calculationInputs" JSONB NOT NULL DEFAULT '{}',
    "calculatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "calculatedByIdentityId" UUID NOT NULL,
    "status" "FeeAssessmentStatus" NOT NULL DEFAULT 'CALCULATED',
    "integrityHash" TEXT NOT NULL,
    "supersededByAssessmentId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "fee_assessments_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "invoices" (
    "id" UUID NOT NULL,
    "invoiceNumber" TEXT NOT NULL,
    "feeAssessmentId" UUID NOT NULL,
    "institutionId" UUID NOT NULL,
    "payerIdentityId" UUID NOT NULL,
    "organizationId" UUID,
    "caseId" UUID,
    "masterAdministrativeFileId" UUID,
    "currency" TEXT NOT NULL DEFAULT 'XCD',
    "subtotalCents" INTEGER NOT NULL,
    "adjustmentTotalCents" INTEGER NOT NULL DEFAULT 0,
    "totalCents" INTEGER NOT NULL,
    "amountPaidCents" INTEGER NOT NULL DEFAULT 0,
    "amountOutstandingCents" INTEGER NOT NULL,
    "issuedAt" TIMESTAMP(3),
    "dueAt" TIMESTAMP(3),
    "status" "InvoiceStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "invoices_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "invoice_lines" (
    "id" UUID NOT NULL,
    "invoiceId" UUID NOT NULL,
    "feeScheduleItemId" UUID NOT NULL,
    "feeCode" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "unitAmountCents" INTEGER NOT NULL,
    "lineTotalCents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'XCD',
    "assessmentLineIndex" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "invoice_lines_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "financial_account_references" (
    "id" UUID NOT NULL,
    "institutionId" UUID NOT NULL,
    "revenueCategory" TEXT NOT NULL,
    "costCenter" TEXT,
    "externalAccountingCode" TEXT,
    "bankingSettlementReference" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "financial_account_references_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "financial_audit_events" (
    "id" UUID NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" UUID NOT NULL,
    "eventType" "FinancialAuditEventType" NOT NULL,
    "actorIdentityId" UUID,
    "details" JSONB NOT NULL DEFAULT '{}',
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "financial_audit_events_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "fee_schedules_code_key" ON "fee_schedules"("code");
CREATE UNIQUE INDEX "fee_schedule_versions_feeScheduleId_version_key" ON "fee_schedule_versions"("feeScheduleId", "version");
CREATE UNIQUE INDEX "fee_schedule_items_feeScheduleVersionId_feeCode_key" ON "fee_schedule_items"("feeScheduleVersionId", "feeCode");
CREATE UNIQUE INDEX "fee_assessments_assessmentNumber_key" ON "fee_assessments"("assessmentNumber");
CREATE UNIQUE INDEX "invoices_invoiceNumber_key" ON "invoices"("invoiceNumber");

CREATE INDEX "fee_schedules_responsibleInstitutionId_idx" ON "fee_schedules"("responsibleInstitutionId");
CREATE INDEX "fee_schedules_responsibleDepartmentId_idx" ON "fee_schedules"("responsibleDepartmentId");
CREATE INDEX "fee_schedules_status_idx" ON "fee_schedules"("status");
CREATE INDEX "fee_schedule_versions_feeScheduleId_idx" ON "fee_schedule_versions"("feeScheduleId");
CREATE INDEX "fee_schedule_versions_status_idx" ON "fee_schedule_versions"("status");
CREATE INDEX "fee_schedule_versions_effectiveFrom_idx" ON "fee_schedule_versions"("effectiveFrom");
CREATE INDEX "fee_schedule_items_feeScheduleVersionId_idx" ON "fee_schedule_items"("feeScheduleVersionId");
CREATE INDEX "fee_schedule_items_serviceId_idx" ON "fee_schedule_items"("serviceId");
CREATE INDEX "fee_assessments_feeScheduleVersionId_idx" ON "fee_assessments"("feeScheduleVersionId");
CREATE INDEX "fee_assessments_caseId_idx" ON "fee_assessments"("caseId");
CREATE INDEX "fee_assessments_applicationId_idx" ON "fee_assessments"("applicationId");
CREATE INDEX "fee_assessments_masterAdministrativeFileId_idx" ON "fee_assessments"("masterAdministrativeFileId");
CREATE INDEX "fee_assessments_status_idx" ON "fee_assessments"("status");
CREATE INDEX "invoices_feeAssessmentId_idx" ON "invoices"("feeAssessmentId");
CREATE INDEX "invoices_institutionId_idx" ON "invoices"("institutionId");
CREATE INDEX "invoices_payerIdentityId_idx" ON "invoices"("payerIdentityId");
CREATE INDEX "invoices_caseId_idx" ON "invoices"("caseId");
CREATE INDEX "invoices_masterAdministrativeFileId_idx" ON "invoices"("masterAdministrativeFileId");
CREATE INDEX "invoices_status_idx" ON "invoices"("status");
CREATE INDEX "invoice_lines_invoiceId_idx" ON "invoice_lines"("invoiceId");
CREATE INDEX "invoice_lines_feeScheduleItemId_idx" ON "invoice_lines"("feeScheduleItemId");
CREATE INDEX "financial_account_references_institutionId_idx" ON "financial_account_references"("institutionId");
CREATE INDEX "financial_account_references_isActive_idx" ON "financial_account_references"("isActive");
CREATE INDEX "financial_audit_events_entityType_entityId_idx" ON "financial_audit_events"("entityType", "entityId");
CREATE INDEX "financial_audit_events_eventType_idx" ON "financial_audit_events"("eventType");
CREATE INDEX "financial_audit_events_occurredAt_idx" ON "financial_audit_events"("occurredAt");

ALTER TABLE "fee_schedules" ADD CONSTRAINT "fee_schedules_responsibleInstitutionId_fkey" FOREIGN KEY ("responsibleInstitutionId") REFERENCES "institutions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "fee_schedules" ADD CONSTRAINT "fee_schedules_responsibleDepartmentId_fkey" FOREIGN KEY ("responsibleDepartmentId") REFERENCES "departments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "fee_schedule_versions" ADD CONSTRAINT "fee_schedule_versions_feeScheduleId_fkey" FOREIGN KEY ("feeScheduleId") REFERENCES "fee_schedules"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "fee_schedule_versions" ADD CONSTRAINT "fee_schedule_versions_governingSourceId_fkey" FOREIGN KEY ("governingSourceId") REFERENCES "governing_sources"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "fee_schedule_versions" ADD CONSTRAINT "fee_schedule_versions_functionAuthorityRecordId_fkey" FOREIGN KEY ("functionAuthorityRecordId") REFERENCES "function_authority_records"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "fee_schedule_versions" ADD CONSTRAINT "fee_schedule_versions_approvedByOfficeholderId_fkey" FOREIGN KEY ("approvedByOfficeholderId") REFERENCES "officeholders"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "fee_schedule_versions" ADD CONSTRAINT "fee_schedule_versions_authorityEvaluationRecordId_fkey" FOREIGN KEY ("authorityEvaluationRecordId") REFERENCES "authority_evaluation_records"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "fee_schedule_items" ADD CONSTRAINT "fee_schedule_items_feeScheduleVersionId_fkey" FOREIGN KEY ("feeScheduleVersionId") REFERENCES "fee_schedule_versions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "fee_schedule_items" ADD CONSTRAINT "fee_schedule_items_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "government_services"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "fee_schedule_items" ADD CONSTRAINT "fee_schedule_items_serviceVersionId_fkey" FOREIGN KEY ("serviceVersionId") REFERENCES "government_service_versions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "fee_schedule_items" ADD CONSTRAINT "fee_schedule_items_governmentServiceFeeDefinitionId_fkey" FOREIGN KEY ("governmentServiceFeeDefinitionId") REFERENCES "government_service_fee_definitions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "fee_assessments" ADD CONSTRAINT "fee_assessments_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "applications"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "fee_assessments" ADD CONSTRAINT "fee_assessments_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "cases"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "fee_assessments" ADD CONSTRAINT "fee_assessments_officialInstrumentId_fkey" FOREIGN KEY ("officialInstrumentId") REFERENCES "official_instruments"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "fee_assessments" ADD CONSTRAINT "fee_assessments_complianceMatterId_fkey" FOREIGN KEY ("complianceMatterId") REFERENCES "compliance_matters"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "fee_assessments" ADD CONSTRAINT "fee_assessments_redressMatterId_fkey" FOREIGN KEY ("redressMatterId") REFERENCES "redress_matters"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "fee_assessments" ADD CONSTRAINT "fee_assessments_masterAdministrativeFileId_fkey" FOREIGN KEY ("masterAdministrativeFileId") REFERENCES "master_administrative_files"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "fee_assessments" ADD CONSTRAINT "fee_assessments_feeScheduleVersionId_fkey" FOREIGN KEY ("feeScheduleVersionId") REFERENCES "fee_schedule_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "fee_assessments" ADD CONSTRAINT "fee_assessments_calculatedByIdentityId_fkey" FOREIGN KEY ("calculatedByIdentityId") REFERENCES "identities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_feeAssessmentId_fkey" FOREIGN KEY ("feeAssessmentId") REFERENCES "fee_assessments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "institutions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_payerIdentityId_fkey" FOREIGN KEY ("payerIdentityId") REFERENCES "identities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "cases"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_masterAdministrativeFileId_fkey" FOREIGN KEY ("masterAdministrativeFileId") REFERENCES "master_administrative_files"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "invoice_lines" ADD CONSTRAINT "invoice_lines_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "invoice_lines" ADD CONSTRAINT "invoice_lines_feeScheduleItemId_fkey" FOREIGN KEY ("feeScheduleItemId") REFERENCES "fee_schedule_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "financial_account_references" ADD CONSTRAINT "financial_account_references_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "institutions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "financial_audit_events" ADD CONSTRAINT "financial_audit_events_actorIdentityId_fkey" FOREIGN KEY ("actorIdentityId") REFERENCES "identities"("id") ON DELETE SET NULL ON UPDATE CASCADE;
