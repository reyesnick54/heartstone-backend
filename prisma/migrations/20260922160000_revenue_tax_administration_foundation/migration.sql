-- CreateEnum
CREATE TYPE "TaxpayerAccountKind" AS ENUM ('INDIVIDUAL', 'BUSINESS', 'OTHER_REGISTERED');

-- CreateEnum
CREATE TYPE "TaxpayerRegistrationStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'REGISTERED', 'REJECTED', 'SUSPENDED', 'CLOSED');

-- CreateEnum
CREATE TYPE "TaxpayerIdentifierKind" AS ENUM ('PRIMARY_TIN', 'SECONDARY_TIN', 'VAT', 'EMPLOYER', 'CUSTOM', 'OTHER');

-- CreateEnum
CREATE TYPE "TaxTypeDefinitionStatus" AS ENUM ('DRAFT', 'ACTIVE', 'RETIRED');

-- CreateEnum
CREATE TYPE "TaxPeriodStatus" AS ENUM ('SCHEDULED', 'OPEN', 'CLOSED', 'EXTENDED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "TaxObligationStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'FULFILLED', 'CLOSED');

-- CreateEnum
CREATE TYPE "TaxReturnStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'ACCEPTED', 'REJECTED', 'AMENDED', 'SUPERSEDED');

-- CreateEnum
CREATE TYPE "TaxDeclarationStatus" AS ENUM ('RECEIVED', 'WITHDRAWN', 'SUPERSEDED');

-- CreateEnum
CREATE TYPE "TaxAssessmentStatus" AS ENUM ('PROPOSED', 'ISSUED', 'AMENDED', 'SUPERSEDED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "TaxLiabilityStatus" AS ENUM ('OPEN', 'PARTIALLY_SATISFIED', 'SATISFIED', 'WRITTEN_OFF', 'DISPUTED');

-- CreateEnum
CREATE TYPE "TaxCreditStatus" AS ENUM ('AVAILABLE', 'APPLIED', 'EXPIRED', 'REVERSED');

-- CreateEnum
CREATE TYPE "TaxAccountBalanceKind" AS ENUM ('PERIOD_END', 'AD_HOC', 'POST_ASSESSMENT', 'POST_PAYMENT');

-- CreateEnum
CREATE TYPE "TaxRefundClaimStatus" AS ENUM ('REQUESTED', 'UNDER_REVIEW', 'APPROVED_FOR_PROCESSING', 'DENIED', 'WITHDRAWN');

-- CreateEnum
CREATE TYPE "TaxRefundDecisionOutcome" AS ENUM ('AUTHORIZED', 'DENIED', 'PARTIAL');

-- CreateEnum
CREATE TYPE "TaxArrearStatus" AS ENUM ('OPEN', 'IN_PLAN', 'RESOLVED', 'WRITTEN_OFF');

-- CreateEnum
CREATE TYPE "TaxPaymentPlanStatus" AS ENUM ('PROPOSED', 'ACTIVE', 'DEFAULTED', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "TaxComplianceStatusCode" AS ENUM ('UNKNOWN', 'FILING_CURRENT', 'FILING_OVERDUE', 'BALANCE_OUTSTANDING', 'CLEARANCE_BLOCKED', 'UNDER_AUDIT', 'NOT_APPLICABLE');

-- CreateEnum
CREATE TYPE "TaxAuditMatterStatus" AS ENUM ('OPEN', 'INFORMATION_REQUEST', 'FIELD_REVIEW', 'CLOSED_NO_FINDING', 'REFERRED', 'CLOSED');

-- CreateEnum
CREATE TYPE "TaxObjectionStatus" AS ENUM ('FILED', 'UNDER_REVIEW', 'DECIDED', 'WITHDRAWN');

-- CreateEnum
CREATE TYPE "TaxDisputeStatus" AS ENUM ('OPEN', 'MEDIATION', 'DECIDED', 'WITHDRAWN', 'CLOSED');

-- CreateEnum
CREATE TYPE "TaxClearanceCertificateRequestStatus" AS ENUM ('REQUESTED', 'UNDER_REVIEW', 'ISSUED', 'DENIED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "TaxWithholdingRecordStatus" AS ENUM ('REPORTED', 'ACCEPTED', 'CORRECTED', 'SUPERSEDED');

-- CreateEnum
CREATE TYPE "TaxAccessActorKind" AS ENUM ('TAXPAYER', 'REPRESENTATIVE', 'REVENUE_OFFICER', 'AUDIT_REVIEWER', 'PLATFORM_ADMIN', 'AI_ASSISTANCE', 'PAYMENT_SYSTEM');

-- CreateEnum
CREATE TYPE "TaxCalculationSourceKind" AS ENUM ('CONFIG_ENGINE', 'REVENUE_OFFICER', 'AI_ASSISTANCE');

-- CreateTable
CREATE TABLE "tax_type_definitions" (
    "id" UUID NOT NULL,
    "jurisdictionId" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" "TaxTypeDefinitionStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tax_type_definitions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tax_type_definition_versions" (
    "id" UUID NOT NULL,
    "taxTypeDefinitionId" UUID NOT NULL,
    "versionNumber" INTEGER NOT NULL,
    "ruleConfiguration" JSONB NOT NULL DEFAULT '{}',
    "methodologyReference" TEXT NOT NULL,
    "effectiveFrom" TIMESTAMP(3) NOT NULL,
    "effectiveUntil" TIMESTAMP(3),
    "approvedByIdentityId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tax_type_definition_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "taxpayer_accounts" (
    "id" UUID NOT NULL,
    "jurisdictionId" UUID NOT NULL,
    "accountNumber" TEXT NOT NULL,
    "accountKind" "TaxpayerAccountKind" NOT NULL,
    "primaryIdentityId" UUID,
    "organizationId" UUID,
    "displayName" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "registeredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "taxpayer_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "taxpayer_registrations" (
    "id" UUID NOT NULL,
    "taxpayerAccountId" UUID NOT NULL,
    "registrationReference" TEXT NOT NULL,
    "status" "TaxpayerRegistrationStatus" NOT NULL DEFAULT 'DRAFT',
    "submittedAt" TIMESTAMP(3),
    "decidedAt" TIMESTAMP(3),
    "registrationPayload" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "taxpayer_registrations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "taxpayer_identifiers" (
    "id" UUID NOT NULL,
    "taxpayerAccountId" UUID NOT NULL,
    "identifierKind" "TaxpayerIdentifierKind" NOT NULL,
    "identifierValue" TEXT NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "effectiveFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "effectiveUntil" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "taxpayer_identifiers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tax_periods" (
    "id" UUID NOT NULL,
    "jurisdictionId" UUID NOT NULL,
    "taxTypeDefinitionId" UUID NOT NULL,
    "periodCode" TEXT NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "filingDeadline" TIMESTAMP(3),
    "status" "TaxPeriodStatus" NOT NULL DEFAULT 'SCHEDULED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tax_periods_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tax_obligations" (
    "id" UUID NOT NULL,
    "taxpayerAccountId" UUID NOT NULL,
    "taxTypeDefinitionId" UUID NOT NULL,
    "taxPeriodId" UUID,
    "obligationCode" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" "TaxObligationStatus" NOT NULL DEFAULT 'ACTIVE',
    "dueDate" TIMESTAMP(3),
    "configuration" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tax_obligations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tax_returns" (
    "id" UUID NOT NULL,
    "taxpayerAccountId" UUID NOT NULL,
    "taxTypeDefinitionId" UUID NOT NULL,
    "taxPeriodId" UUID NOT NULL,
    "returnReference" TEXT NOT NULL,
    "status" "TaxReturnStatus" NOT NULL DEFAULT 'DRAFT',
    "currentVersionId" UUID,
    "submittedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tax_returns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tax_return_versions" (
    "id" UUID NOT NULL,
    "taxReturnId" UUID NOT NULL,
    "versionNumber" INTEGER NOT NULL,
    "isAmendment" BOOLEAN NOT NULL DEFAULT false,
    "declarationData" JSONB NOT NULL DEFAULT '{}',
    "payloadHash" TEXT NOT NULL,
    "submittedByIdentityId" UUID,
    "submittedAt" TIMESTAMP(3),
    "lockedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tax_return_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tax_declarations" (
    "id" UUID NOT NULL,
    "taxReturnId" UUID NOT NULL,
    "taxReturnVersionId" UUID NOT NULL,
    "declarationReference" TEXT NOT NULL,
    "status" "TaxDeclarationStatus" NOT NULL DEFAULT 'RECEIVED',
    "declaredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isSelfDeclaration" BOOLEAN NOT NULL DEFAULT true,
    "declarationPayload" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tax_declarations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tax_assessments" (
    "id" UUID NOT NULL,
    "taxpayerAccountId" UUID NOT NULL,
    "taxTypeDefinitionId" UUID NOT NULL,
    "taxPeriodId" UUID NOT NULL,
    "taxReturnId" UUID,
    "assessmentReference" TEXT NOT NULL,
    "status" "TaxAssessmentStatus" NOT NULL DEFAULT 'PROPOSED',
    "supersedesAssessmentId" UUID,
    "issuedByOfficeholderId" UUID,
    "issuedAt" TIMESTAMP(3),
    "calculationRecordId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tax_assessments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tax_assessment_lines" (
    "id" UUID NOT NULL,
    "taxAssessmentId" UUID NOT NULL,
    "lineCode" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'XCD',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tax_assessment_lines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tax_calculation_records" (
    "id" UUID NOT NULL,
    "jurisdictionId" UUID NOT NULL,
    "taxPeriodId" UUID NOT NULL,
    "taxTypeDefinitionVersionId" UUID NOT NULL,
    "ruleConfigurationVersion" INTEGER NOT NULL,
    "inputs" JSONB NOT NULL DEFAULT '{}',
    "result" JSONB NOT NULL DEFAULT '{}',
    "methodologyReference" TEXT NOT NULL,
    "calculatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "calculatedByActorKind" "TaxCalculationSourceKind" NOT NULL,
    "calculatedByIdentityId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tax_calculation_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tax_liabilities" (
    "id" UUID NOT NULL,
    "taxpayerAccountId" UUID NOT NULL,
    "taxAssessmentId" UUID,
    "invoiceId" UUID,
    "liabilityReference" TEXT NOT NULL,
    "status" "TaxLiabilityStatus" NOT NULL DEFAULT 'OPEN',
    "principalCents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'XCD',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tax_liabilities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tax_credits" (
    "id" UUID NOT NULL,
    "taxpayerAccountId" UUID NOT NULL,
    "taxLiabilityId" UUID,
    "creditReference" TEXT NOT NULL,
    "status" "TaxCreditStatus" NOT NULL DEFAULT 'AVAILABLE',
    "amountCents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'XCD',
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tax_credits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tax_account_balances" (
    "id" UUID NOT NULL,
    "taxpayerAccountId" UUID NOT NULL,
    "taxPeriodId" UUID,
    "balanceKind" "TaxAccountBalanceKind" NOT NULL,
    "balanceCents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'XCD',
    "asOf" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "breakdown" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tax_account_balances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tax_payment_allocations" (
    "id" UUID NOT NULL,
    "taxLiabilityId" UUID NOT NULL,
    "paymentTransactionId" UUID NOT NULL,
    "paymentAllocationId" UUID,
    "allocatedAmountCents" INTEGER NOT NULL,
    "allocatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tax_payment_allocations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tax_refund_claims" (
    "id" UUID NOT NULL,
    "taxpayerAccountId" UUID NOT NULL,
    "claimReference" TEXT NOT NULL,
    "status" "TaxRefundClaimStatus" NOT NULL DEFAULT 'REQUESTED',
    "requestedAmountCents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'XCD',
    "requestedByIdentityId" UUID NOT NULL,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tax_refund_claims_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tax_refund_decisions" (
    "id" UUID NOT NULL,
    "taxRefundClaimId" UUID NOT NULL,
    "decisionReference" TEXT NOT NULL,
    "outcome" "TaxRefundDecisionOutcome" NOT NULL,
    "authorizedAmountCents" INTEGER,
    "currency" TEXT NOT NULL DEFAULT 'XCD',
    "decidedByOfficeholderId" UUID,
    "financialRefundRequestId" UUID,
    "decidedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tax_refund_decisions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tax_arrears" (
    "id" UUID NOT NULL,
    "taxpayerAccountId" UUID NOT NULL,
    "arrearReference" TEXT NOT NULL,
    "status" "TaxArrearStatus" NOT NULL DEFAULT 'OPEN',
    "outstandingCents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'XCD',
    "asOf" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tax_arrears_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tax_payment_plans" (
    "id" UUID NOT NULL,
    "taxpayerAccountId" UUID NOT NULL,
    "planReference" TEXT NOT NULL,
    "status" "TaxPaymentPlanStatus" NOT NULL DEFAULT 'PROPOSED',
    "schedule" JSONB NOT NULL DEFAULT '[]',
    "authorizedByOfficeholderId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tax_payment_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tax_compliance_statuses" (
    "id" UUID NOT NULL,
    "taxpayerAccountId" UUID NOT NULL,
    "statusCode" "TaxComplianceStatusCode" NOT NULL DEFAULT 'UNKNOWN',
    "effectiveFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "effectiveUntil" TIMESTAMP(3),
    "basis" JSONB NOT NULL DEFAULT '{}',
    "isClearanceEligible" BOOLEAN NOT NULL DEFAULT false,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tax_compliance_statuses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tax_audit_matters" (
    "id" UUID NOT NULL,
    "taxpayerAccountId" UUID NOT NULL,
    "matterReference" TEXT NOT NULL,
    "status" "TaxAuditMatterStatus" NOT NULL DEFAULT 'OPEN',
    "riskScore" INTEGER,
    "openedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closedAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tax_audit_matters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tax_objections" (
    "id" UUID NOT NULL,
    "taxpayerAccountId" UUID NOT NULL,
    "objectionReference" TEXT NOT NULL,
    "status" "TaxObjectionStatus" NOT NULL DEFAULT 'FILED',
    "relatedAssessmentId" UUID,
    "filedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "decidedAt" TIMESTAMP(3),
    "grounds" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tax_objections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tax_disputes" (
    "id" UUID NOT NULL,
    "taxpayerAccountId" UUID NOT NULL,
    "disputeReference" TEXT NOT NULL,
    "status" "TaxDisputeStatus" NOT NULL DEFAULT 'OPEN',
    "openedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tax_disputes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tax_clearance_certificate_requests" (
    "id" UUID NOT NULL,
    "taxpayerAccountId" UUID NOT NULL,
    "requestReference" TEXT NOT NULL,
    "status" "TaxClearanceCertificateRequestStatus" NOT NULL DEFAULT 'REQUESTED',
    "requestedByIdentityId" UUID NOT NULL,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "issuedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "authoritativeConditionsMet" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tax_clearance_certificate_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tax_withholding_records" (
    "id" UUID NOT NULL,
    "taxpayerAccountId" UUID NOT NULL,
    "taxTypeDefinitionId" UUID NOT NULL,
    "recordReference" TEXT NOT NULL,
    "status" "TaxWithholdingRecordStatus" NOT NULL DEFAULT 'REPORTED',
    "reportingPeriodStart" TIMESTAMP(3) NOT NULL,
    "reportingPeriodEnd" TIMESTAMP(3) NOT NULL,
    "reportedAmountCents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'XCD',
    "employerConfiguration" JSONB NOT NULL DEFAULT '{}',
    "reportedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tax_withholding_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tax_access_audits" (
    "id" UUID NOT NULL,
    "taxpayerAccountId" UUID NOT NULL,
    "accessorIdentityId" UUID NOT NULL,
    "actorKind" "TaxAccessActorKind" NOT NULL,
    "endpoint" TEXT NOT NULL,
    "accessGranted" BOOLEAN NOT NULL,
    "denialReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tax_access_audits_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "tax_type_definitions_jurisdictionId_idx" ON "tax_type_definitions"("jurisdictionId");

-- CreateIndex
CREATE INDEX "tax_type_definitions_status_idx" ON "tax_type_definitions"("status");

-- CreateIndex
CREATE UNIQUE INDEX "tax_type_definitions_jurisdictionId_code_key" ON "tax_type_definitions"("jurisdictionId", "code");

-- CreateIndex
CREATE INDEX "tax_type_definition_versions_taxTypeDefinitionId_idx" ON "tax_type_definition_versions"("taxTypeDefinitionId");

-- CreateIndex
CREATE UNIQUE INDEX "tax_type_definition_versions_taxTypeDefinitionId_versionNum_key" ON "tax_type_definition_versions"("taxTypeDefinitionId", "versionNumber");

-- CreateIndex
CREATE UNIQUE INDEX "taxpayer_accounts_accountNumber_key" ON "taxpayer_accounts"("accountNumber");

-- CreateIndex
CREATE INDEX "taxpayer_accounts_jurisdictionId_idx" ON "taxpayer_accounts"("jurisdictionId");

-- CreateIndex
CREATE INDEX "taxpayer_accounts_primaryIdentityId_idx" ON "taxpayer_accounts"("primaryIdentityId");

-- CreateIndex
CREATE INDEX "taxpayer_accounts_organizationId_idx" ON "taxpayer_accounts"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "taxpayer_registrations_registrationReference_key" ON "taxpayer_registrations"("registrationReference");

-- CreateIndex
CREATE INDEX "taxpayer_registrations_taxpayerAccountId_idx" ON "taxpayer_registrations"("taxpayerAccountId");

-- CreateIndex
CREATE INDEX "taxpayer_registrations_status_idx" ON "taxpayer_registrations"("status");

-- CreateIndex
CREATE INDEX "taxpayer_identifiers_taxpayerAccountId_idx" ON "taxpayer_identifiers"("taxpayerAccountId");

-- CreateIndex
CREATE INDEX "taxpayer_identifiers_identifierValue_idx" ON "taxpayer_identifiers"("identifierValue");

-- CreateIndex
CREATE UNIQUE INDEX "taxpayer_identifiers_taxpayerAccountId_identifierKind_ident_key" ON "taxpayer_identifiers"("taxpayerAccountId", "identifierKind", "identifierValue");

-- CreateIndex
CREATE INDEX "tax_periods_jurisdictionId_idx" ON "tax_periods"("jurisdictionId");

-- CreateIndex
CREATE INDEX "tax_periods_taxTypeDefinitionId_idx" ON "tax_periods"("taxTypeDefinitionId");

-- CreateIndex
CREATE INDEX "tax_periods_status_idx" ON "tax_periods"("status");

-- CreateIndex
CREATE UNIQUE INDEX "tax_periods_jurisdictionId_taxTypeDefinitionId_periodCode_key" ON "tax_periods"("jurisdictionId", "taxTypeDefinitionId", "periodCode");

-- CreateIndex
CREATE INDEX "tax_obligations_taxpayerAccountId_idx" ON "tax_obligations"("taxpayerAccountId");

-- CreateIndex
CREATE INDEX "tax_obligations_taxTypeDefinitionId_idx" ON "tax_obligations"("taxTypeDefinitionId");

-- CreateIndex
CREATE INDEX "tax_obligations_taxPeriodId_idx" ON "tax_obligations"("taxPeriodId");

-- CreateIndex
CREATE INDEX "tax_obligations_status_idx" ON "tax_obligations"("status");

-- CreateIndex
CREATE UNIQUE INDEX "tax_returns_returnReference_key" ON "tax_returns"("returnReference");

-- CreateIndex
CREATE UNIQUE INDEX "tax_returns_currentVersionId_key" ON "tax_returns"("currentVersionId");

-- CreateIndex
CREATE INDEX "tax_returns_taxpayerAccountId_idx" ON "tax_returns"("taxpayerAccountId");

-- CreateIndex
CREATE INDEX "tax_returns_taxTypeDefinitionId_idx" ON "tax_returns"("taxTypeDefinitionId");

-- CreateIndex
CREATE INDEX "tax_returns_taxPeriodId_idx" ON "tax_returns"("taxPeriodId");

-- CreateIndex
CREATE INDEX "tax_returns_status_idx" ON "tax_returns"("status");

-- CreateIndex
CREATE INDEX "tax_return_versions_taxReturnId_idx" ON "tax_return_versions"("taxReturnId");

-- CreateIndex
CREATE UNIQUE INDEX "tax_return_versions_taxReturnId_versionNumber_key" ON "tax_return_versions"("taxReturnId", "versionNumber");

-- CreateIndex
CREATE UNIQUE INDEX "tax_declarations_declarationReference_key" ON "tax_declarations"("declarationReference");

-- CreateIndex
CREATE INDEX "tax_declarations_taxReturnId_idx" ON "tax_declarations"("taxReturnId");

-- CreateIndex
CREATE INDEX "tax_declarations_taxReturnVersionId_idx" ON "tax_declarations"("taxReturnVersionId");

-- CreateIndex
CREATE UNIQUE INDEX "tax_assessments_assessmentReference_key" ON "tax_assessments"("assessmentReference");

-- CreateIndex
CREATE UNIQUE INDEX "tax_assessments_supersedesAssessmentId_key" ON "tax_assessments"("supersedesAssessmentId");

-- CreateIndex
CREATE INDEX "tax_assessments_taxpayerAccountId_idx" ON "tax_assessments"("taxpayerAccountId");

-- CreateIndex
CREATE INDEX "tax_assessments_taxTypeDefinitionId_idx" ON "tax_assessments"("taxTypeDefinitionId");

-- CreateIndex
CREATE INDEX "tax_assessments_taxPeriodId_idx" ON "tax_assessments"("taxPeriodId");

-- CreateIndex
CREATE INDEX "tax_assessments_taxReturnId_idx" ON "tax_assessments"("taxReturnId");

-- CreateIndex
CREATE INDEX "tax_assessments_status_idx" ON "tax_assessments"("status");

-- CreateIndex
CREATE INDEX "tax_assessment_lines_taxAssessmentId_idx" ON "tax_assessment_lines"("taxAssessmentId");

-- CreateIndex
CREATE INDEX "tax_calculation_records_jurisdictionId_idx" ON "tax_calculation_records"("jurisdictionId");

-- CreateIndex
CREATE INDEX "tax_calculation_records_taxPeriodId_idx" ON "tax_calculation_records"("taxPeriodId");

-- CreateIndex
CREATE INDEX "tax_calculation_records_taxTypeDefinitionVersionId_idx" ON "tax_calculation_records"("taxTypeDefinitionVersionId");

-- CreateIndex
CREATE UNIQUE INDEX "tax_liabilities_liabilityReference_key" ON "tax_liabilities"("liabilityReference");

-- CreateIndex
CREATE INDEX "tax_liabilities_taxpayerAccountId_idx" ON "tax_liabilities"("taxpayerAccountId");

-- CreateIndex
CREATE INDEX "tax_liabilities_taxAssessmentId_idx" ON "tax_liabilities"("taxAssessmentId");

-- CreateIndex
CREATE INDEX "tax_liabilities_invoiceId_idx" ON "tax_liabilities"("invoiceId");

-- CreateIndex
CREATE INDEX "tax_liabilities_status_idx" ON "tax_liabilities"("status");

-- CreateIndex
CREATE UNIQUE INDEX "tax_credits_creditReference_key" ON "tax_credits"("creditReference");

-- CreateIndex
CREATE INDEX "tax_credits_taxpayerAccountId_idx" ON "tax_credits"("taxpayerAccountId");

-- CreateIndex
CREATE INDEX "tax_credits_taxLiabilityId_idx" ON "tax_credits"("taxLiabilityId");

-- CreateIndex
CREATE INDEX "tax_credits_status_idx" ON "tax_credits"("status");

-- CreateIndex
CREATE INDEX "tax_account_balances_taxpayerAccountId_idx" ON "tax_account_balances"("taxpayerAccountId");

-- CreateIndex
CREATE INDEX "tax_account_balances_taxPeriodId_idx" ON "tax_account_balances"("taxPeriodId");

-- CreateIndex
CREATE INDEX "tax_account_balances_asOf_idx" ON "tax_account_balances"("asOf");

-- CreateIndex
CREATE INDEX "tax_payment_allocations_taxLiabilityId_idx" ON "tax_payment_allocations"("taxLiabilityId");

-- CreateIndex
CREATE INDEX "tax_payment_allocations_paymentTransactionId_idx" ON "tax_payment_allocations"("paymentTransactionId");

-- CreateIndex
CREATE INDEX "tax_payment_allocations_paymentAllocationId_idx" ON "tax_payment_allocations"("paymentAllocationId");

-- CreateIndex
CREATE UNIQUE INDEX "tax_refund_claims_claimReference_key" ON "tax_refund_claims"("claimReference");

-- CreateIndex
CREATE INDEX "tax_refund_claims_taxpayerAccountId_idx" ON "tax_refund_claims"("taxpayerAccountId");

-- CreateIndex
CREATE INDEX "tax_refund_claims_status_idx" ON "tax_refund_claims"("status");

-- CreateIndex
CREATE UNIQUE INDEX "tax_refund_decisions_decisionReference_key" ON "tax_refund_decisions"("decisionReference");

-- CreateIndex
CREATE INDEX "tax_refund_decisions_taxRefundClaimId_idx" ON "tax_refund_decisions"("taxRefundClaimId");

-- CreateIndex
CREATE UNIQUE INDEX "tax_arrears_arrearReference_key" ON "tax_arrears"("arrearReference");

-- CreateIndex
CREATE INDEX "tax_arrears_taxpayerAccountId_idx" ON "tax_arrears"("taxpayerAccountId");

-- CreateIndex
CREATE INDEX "tax_arrears_status_idx" ON "tax_arrears"("status");

-- CreateIndex
CREATE UNIQUE INDEX "tax_payment_plans_planReference_key" ON "tax_payment_plans"("planReference");

-- CreateIndex
CREATE INDEX "tax_payment_plans_taxpayerAccountId_idx" ON "tax_payment_plans"("taxpayerAccountId");

-- CreateIndex
CREATE INDEX "tax_payment_plans_status_idx" ON "tax_payment_plans"("status");

-- CreateIndex
CREATE INDEX "tax_compliance_statuses_taxpayerAccountId_idx" ON "tax_compliance_statuses"("taxpayerAccountId");

-- CreateIndex
CREATE INDEX "tax_compliance_statuses_statusCode_idx" ON "tax_compliance_statuses"("statusCode");

-- CreateIndex
CREATE UNIQUE INDEX "tax_audit_matters_matterReference_key" ON "tax_audit_matters"("matterReference");

-- CreateIndex
CREATE INDEX "tax_audit_matters_taxpayerAccountId_idx" ON "tax_audit_matters"("taxpayerAccountId");

-- CreateIndex
CREATE INDEX "tax_audit_matters_status_idx" ON "tax_audit_matters"("status");

-- CreateIndex
CREATE UNIQUE INDEX "tax_objections_objectionReference_key" ON "tax_objections"("objectionReference");

-- CreateIndex
CREATE INDEX "tax_objections_taxpayerAccountId_idx" ON "tax_objections"("taxpayerAccountId");

-- CreateIndex
CREATE INDEX "tax_objections_status_idx" ON "tax_objections"("status");

-- CreateIndex
CREATE UNIQUE INDEX "tax_disputes_disputeReference_key" ON "tax_disputes"("disputeReference");

-- CreateIndex
CREATE INDEX "tax_disputes_taxpayerAccountId_idx" ON "tax_disputes"("taxpayerAccountId");

-- CreateIndex
CREATE INDEX "tax_disputes_status_idx" ON "tax_disputes"("status");

-- CreateIndex
CREATE UNIQUE INDEX "tax_clearance_certificate_requests_requestReference_key" ON "tax_clearance_certificate_requests"("requestReference");

-- CreateIndex
CREATE INDEX "tax_clearance_certificate_requests_taxpayerAccountId_idx" ON "tax_clearance_certificate_requests"("taxpayerAccountId");

-- CreateIndex
CREATE INDEX "tax_clearance_certificate_requests_status_idx" ON "tax_clearance_certificate_requests"("status");

-- CreateIndex
CREATE UNIQUE INDEX "tax_withholding_records_recordReference_key" ON "tax_withholding_records"("recordReference");

-- CreateIndex
CREATE INDEX "tax_withholding_records_taxpayerAccountId_idx" ON "tax_withholding_records"("taxpayerAccountId");

-- CreateIndex
CREATE INDEX "tax_withholding_records_taxTypeDefinitionId_idx" ON "tax_withholding_records"("taxTypeDefinitionId");

-- CreateIndex
CREATE INDEX "tax_withholding_records_status_idx" ON "tax_withholding_records"("status");

-- CreateIndex
CREATE INDEX "tax_access_audits_taxpayerAccountId_idx" ON "tax_access_audits"("taxpayerAccountId");

-- CreateIndex
CREATE INDEX "tax_access_audits_accessorIdentityId_idx" ON "tax_access_audits"("accessorIdentityId");

-- CreateIndex
CREATE INDEX "tax_access_audits_createdAt_idx" ON "tax_access_audits"("createdAt");

-- AddForeignKey
ALTER TABLE "tax_type_definitions" ADD CONSTRAINT "tax_type_definitions_jurisdictionId_fkey" FOREIGN KEY ("jurisdictionId") REFERENCES "jurisdictions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tax_type_definition_versions" ADD CONSTRAINT "tax_type_definition_versions_taxTypeDefinitionId_fkey" FOREIGN KEY ("taxTypeDefinitionId") REFERENCES "tax_type_definitions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tax_type_definition_versions" ADD CONSTRAINT "tax_type_definition_versions_approvedByIdentityId_fkey" FOREIGN KEY ("approvedByIdentityId") REFERENCES "identities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "taxpayer_accounts" ADD CONSTRAINT "taxpayer_accounts_jurisdictionId_fkey" FOREIGN KEY ("jurisdictionId") REFERENCES "jurisdictions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "taxpayer_accounts" ADD CONSTRAINT "taxpayer_accounts_primaryIdentityId_fkey" FOREIGN KEY ("primaryIdentityId") REFERENCES "identities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "taxpayer_accounts" ADD CONSTRAINT "taxpayer_accounts_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "taxpayer_registrations" ADD CONSTRAINT "taxpayer_registrations_taxpayerAccountId_fkey" FOREIGN KEY ("taxpayerAccountId") REFERENCES "taxpayer_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "taxpayer_identifiers" ADD CONSTRAINT "taxpayer_identifiers_taxpayerAccountId_fkey" FOREIGN KEY ("taxpayerAccountId") REFERENCES "taxpayer_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tax_periods" ADD CONSTRAINT "tax_periods_jurisdictionId_fkey" FOREIGN KEY ("jurisdictionId") REFERENCES "jurisdictions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tax_periods" ADD CONSTRAINT "tax_periods_taxTypeDefinitionId_fkey" FOREIGN KEY ("taxTypeDefinitionId") REFERENCES "tax_type_definitions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tax_obligations" ADD CONSTRAINT "tax_obligations_taxpayerAccountId_fkey" FOREIGN KEY ("taxpayerAccountId") REFERENCES "taxpayer_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tax_obligations" ADD CONSTRAINT "tax_obligations_taxTypeDefinitionId_fkey" FOREIGN KEY ("taxTypeDefinitionId") REFERENCES "tax_type_definitions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tax_obligations" ADD CONSTRAINT "tax_obligations_taxPeriodId_fkey" FOREIGN KEY ("taxPeriodId") REFERENCES "tax_periods"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tax_returns" ADD CONSTRAINT "tax_returns_taxpayerAccountId_fkey" FOREIGN KEY ("taxpayerAccountId") REFERENCES "taxpayer_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tax_returns" ADD CONSTRAINT "tax_returns_taxTypeDefinitionId_fkey" FOREIGN KEY ("taxTypeDefinitionId") REFERENCES "tax_type_definitions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tax_returns" ADD CONSTRAINT "tax_returns_taxPeriodId_fkey" FOREIGN KEY ("taxPeriodId") REFERENCES "tax_periods"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tax_returns" ADD CONSTRAINT "tax_returns_currentVersionId_fkey" FOREIGN KEY ("currentVersionId") REFERENCES "tax_return_versions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tax_return_versions" ADD CONSTRAINT "tax_return_versions_taxReturnId_fkey" FOREIGN KEY ("taxReturnId") REFERENCES "tax_returns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tax_return_versions" ADD CONSTRAINT "tax_return_versions_submittedByIdentityId_fkey" FOREIGN KEY ("submittedByIdentityId") REFERENCES "identities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tax_declarations" ADD CONSTRAINT "tax_declarations_taxReturnId_fkey" FOREIGN KEY ("taxReturnId") REFERENCES "tax_returns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tax_declarations" ADD CONSTRAINT "tax_declarations_taxReturnVersionId_fkey" FOREIGN KEY ("taxReturnVersionId") REFERENCES "tax_return_versions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tax_assessments" ADD CONSTRAINT "tax_assessments_taxpayerAccountId_fkey" FOREIGN KEY ("taxpayerAccountId") REFERENCES "taxpayer_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tax_assessments" ADD CONSTRAINT "tax_assessments_taxTypeDefinitionId_fkey" FOREIGN KEY ("taxTypeDefinitionId") REFERENCES "tax_type_definitions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tax_assessments" ADD CONSTRAINT "tax_assessments_taxPeriodId_fkey" FOREIGN KEY ("taxPeriodId") REFERENCES "tax_periods"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tax_assessments" ADD CONSTRAINT "tax_assessments_taxReturnId_fkey" FOREIGN KEY ("taxReturnId") REFERENCES "tax_returns"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tax_assessments" ADD CONSTRAINT "tax_assessments_calculationRecordId_fkey" FOREIGN KEY ("calculationRecordId") REFERENCES "tax_calculation_records"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tax_assessments" ADD CONSTRAINT "tax_assessments_supersedesAssessmentId_fkey" FOREIGN KEY ("supersedesAssessmentId") REFERENCES "tax_assessments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tax_assessment_lines" ADD CONSTRAINT "tax_assessment_lines_taxAssessmentId_fkey" FOREIGN KEY ("taxAssessmentId") REFERENCES "tax_assessments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tax_calculation_records" ADD CONSTRAINT "tax_calculation_records_jurisdictionId_fkey" FOREIGN KEY ("jurisdictionId") REFERENCES "jurisdictions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tax_calculation_records" ADD CONSTRAINT "tax_calculation_records_taxPeriodId_fkey" FOREIGN KEY ("taxPeriodId") REFERENCES "tax_periods"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tax_calculation_records" ADD CONSTRAINT "tax_calculation_records_taxTypeDefinitionVersionId_fkey" FOREIGN KEY ("taxTypeDefinitionVersionId") REFERENCES "tax_type_definition_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tax_calculation_records" ADD CONSTRAINT "tax_calculation_records_calculatedByIdentityId_fkey" FOREIGN KEY ("calculatedByIdentityId") REFERENCES "identities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tax_liabilities" ADD CONSTRAINT "tax_liabilities_taxpayerAccountId_fkey" FOREIGN KEY ("taxpayerAccountId") REFERENCES "taxpayer_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tax_liabilities" ADD CONSTRAINT "tax_liabilities_taxAssessmentId_fkey" FOREIGN KEY ("taxAssessmentId") REFERENCES "tax_assessments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tax_liabilities" ADD CONSTRAINT "tax_liabilities_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "invoices"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tax_credits" ADD CONSTRAINT "tax_credits_taxpayerAccountId_fkey" FOREIGN KEY ("taxpayerAccountId") REFERENCES "taxpayer_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tax_credits" ADD CONSTRAINT "tax_credits_taxLiabilityId_fkey" FOREIGN KEY ("taxLiabilityId") REFERENCES "tax_liabilities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tax_account_balances" ADD CONSTRAINT "tax_account_balances_taxpayerAccountId_fkey" FOREIGN KEY ("taxpayerAccountId") REFERENCES "taxpayer_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tax_account_balances" ADD CONSTRAINT "tax_account_balances_taxPeriodId_fkey" FOREIGN KEY ("taxPeriodId") REFERENCES "tax_periods"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tax_payment_allocations" ADD CONSTRAINT "tax_payment_allocations_taxLiabilityId_fkey" FOREIGN KEY ("taxLiabilityId") REFERENCES "tax_liabilities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tax_payment_allocations" ADD CONSTRAINT "tax_payment_allocations_paymentTransactionId_fkey" FOREIGN KEY ("paymentTransactionId") REFERENCES "payment_transactions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tax_payment_allocations" ADD CONSTRAINT "tax_payment_allocations_paymentAllocationId_fkey" FOREIGN KEY ("paymentAllocationId") REFERENCES "payment_allocations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tax_refund_claims" ADD CONSTRAINT "tax_refund_claims_taxpayerAccountId_fkey" FOREIGN KEY ("taxpayerAccountId") REFERENCES "taxpayer_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tax_refund_claims" ADD CONSTRAINT "tax_refund_claims_requestedByIdentityId_fkey" FOREIGN KEY ("requestedByIdentityId") REFERENCES "identities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tax_refund_decisions" ADD CONSTRAINT "tax_refund_decisions_taxRefundClaimId_fkey" FOREIGN KEY ("taxRefundClaimId") REFERENCES "tax_refund_claims"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tax_arrears" ADD CONSTRAINT "tax_arrears_taxpayerAccountId_fkey" FOREIGN KEY ("taxpayerAccountId") REFERENCES "taxpayer_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tax_payment_plans" ADD CONSTRAINT "tax_payment_plans_taxpayerAccountId_fkey" FOREIGN KEY ("taxpayerAccountId") REFERENCES "taxpayer_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tax_compliance_statuses" ADD CONSTRAINT "tax_compliance_statuses_taxpayerAccountId_fkey" FOREIGN KEY ("taxpayerAccountId") REFERENCES "taxpayer_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tax_audit_matters" ADD CONSTRAINT "tax_audit_matters_taxpayerAccountId_fkey" FOREIGN KEY ("taxpayerAccountId") REFERENCES "taxpayer_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tax_objections" ADD CONSTRAINT "tax_objections_taxpayerAccountId_fkey" FOREIGN KEY ("taxpayerAccountId") REFERENCES "taxpayer_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tax_disputes" ADD CONSTRAINT "tax_disputes_taxpayerAccountId_fkey" FOREIGN KEY ("taxpayerAccountId") REFERENCES "taxpayer_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tax_clearance_certificate_requests" ADD CONSTRAINT "tax_clearance_certificate_requests_taxpayerAccountId_fkey" FOREIGN KEY ("taxpayerAccountId") REFERENCES "taxpayer_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tax_clearance_certificate_requests" ADD CONSTRAINT "tax_clearance_certificate_requests_requestedByIdentityId_fkey" FOREIGN KEY ("requestedByIdentityId") REFERENCES "identities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tax_withholding_records" ADD CONSTRAINT "tax_withholding_records_taxpayerAccountId_fkey" FOREIGN KEY ("taxpayerAccountId") REFERENCES "taxpayer_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tax_withholding_records" ADD CONSTRAINT "tax_withholding_records_taxTypeDefinitionId_fkey" FOREIGN KEY ("taxTypeDefinitionId") REFERENCES "tax_type_definitions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tax_access_audits" ADD CONSTRAINT "tax_access_audits_taxpayerAccountId_fkey" FOREIGN KEY ("taxpayerAccountId") REFERENCES "taxpayer_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tax_access_audits" ADD CONSTRAINT "tax_access_audits_accessorIdentityId_fkey" FOREIGN KEY ("accessorIdentityId") REFERENCES "identities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

