-- Phase 11C: Refunds, adjustments, waivers, reconciliation and arrears

CREATE TYPE "FeeAdjustmentType" AS ENUM (
  'WAIVER',
  'REDUCTION',
  'EXEMPTION',
  'CREDIT',
  'CORRECTION',
  'AUTHORIZED_SURCHARGE',
  'OTHER_APPROVED_ADJUSTMENT'
);

CREATE TYPE "FeeAdjustmentRequestStatus" AS ENUM (
  'REQUESTED',
  'UNDER_REVIEW',
  'APPROVED',
  'REJECTED',
  'CANCELLED'
);

CREATE TYPE "FeeScheduleVersionStatus" AS ENUM (
  'DRAFT',
  'ACTIVE',
  'SUPERSEDED',
  'ARCHIVED'
);

CREATE TYPE "InvoiceStatus" AS ENUM (
  'DRAFT',
  'ISSUED',
  'PARTIALLY_PAID',
  'PAID',
  'OVERDUE',
  'CANCELLED',
  'WRITTEN_OFF'
);

CREATE TYPE "PaymentTransactionStatus" AS ENUM (
  'PENDING',
  'AUTHORIZED',
  'SETTLED',
  'FAILED',
  'CANCELLED',
  'CHARGEBACK'
);

CREATE TYPE "RefundRequestStatus" AS ENUM (
  'REQUESTED',
  'UNDER_REVIEW',
  'APPROVED',
  'REJECTED',
  'PENDING_PROVIDER',
  'PROCESSING',
  'SETTLED',
  'FAILED',
  'CANCELLED',
  'PARTIALLY_SETTLED'
);

CREATE TYPE "RefundAuthorizationStatus" AS ENUM (
  'PENDING',
  'APPROVED',
  'REJECTED',
  'CANCELLED'
);

CREATE TYPE "ReconciliationBatchSource" AS ENUM (
  'PROVIDER_TRANSACTION_EXPORT',
  'BANK_SETTLEMENT_FILE',
  'GOVERNMENT_TREASURY_FEED',
  'INTERNAL_PAYMENT_JOURNAL',
  'MANUAL_APPROVED_STATEMENT'
);

CREATE TYPE "ReconciliationBatchStatus" AS ENUM (
  'PENDING',
  'IN_PROGRESS',
  'COMPLETED',
  'FAILED',
  'REQUIRES_INVESTIGATION'
);

CREATE TYPE "ReconciliationMatchStatus" AS ENUM (
  'MATCHED',
  'AMOUNT_MISMATCH',
  'CURRENCY_MISMATCH',
  'MISSING_INTERNAL',
  'MISSING_EXTERNAL',
  'DUPLICATE',
  'TIMING_DIFFERENCE',
  'UNKNOWN_REFERENCE',
  'UNDER_REVIEW',
  'RESOLVED'
);

CREATE TYPE "ReconciliationExceptionStatus" AS ENUM (
  'OPEN',
  'UNDER_INVESTIGATION',
  'RESOLVED',
  'CLOSED'
);

CREATE TYPE "ArrearsRecordStatus" AS ENUM (
  'OPEN',
  'REMINDER_SENT',
  'IN_COLLECTION_ROUTE',
  'DISPUTED',
  'PARTIALLY_PAID',
  'CLOSED',
  'WRITTEN_OFF'
);

CREATE TYPE "FinancialDisputeSubject" AS ENUM (
  'AMOUNT',
  'DUPLICATE_CHARGE',
  'PAYMENT_NOT_RECOGNIZED',
  'REFUND',
  'WAIVER',
  'CALCULATION',
  'ALLOCATION'
);

CREATE TYPE "FinancialDisputeStatus" AS ENUM (
  'OPEN',
  'UNDER_REVIEW',
  'REFERRED_TO_SUBSTANTIVE_ROUTE',
  'RESOLVED',
  'CLOSED'
);

CREATE TYPE "FinancialApprovalDecision" AS ENUM (
  'APPROVED',
  'REJECTED',
  'DEFERRED'
);

CREATE TYPE "FinancialReversalReason" AS ENUM (
  'ACCOUNTING_CORRECTION',
  'DUPLICATE_ENTRY',
  'PROVIDER_REVERSAL',
  'OTHER_AUTHORIZED_CORRECTION'
);

CREATE TABLE "fee_schedules" (
  "id" UUID NOT NULL,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "jurisdictionId" UUID,
  "status" "StructuralLifecycleStatus" NOT NULL DEFAULT 'ACTIVE',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "fee_schedules_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "fee_schedule_versions" (
  "id" UUID NOT NULL,
  "feeScheduleId" UUID NOT NULL,
  "versionNumber" INTEGER NOT NULL,
  "effectiveFrom" TIMESTAMP(3) NOT NULL,
  "effectiveTo" TIMESTAMP(3),
  "permittedAdjustmentRoutes" "FeeAdjustmentType"[] DEFAULT ARRAY[]::"FeeAdjustmentType"[],
  "status" "FeeScheduleVersionStatus" NOT NULL DEFAULT 'DRAFT',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "fee_schedule_versions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "invoices" (
  "id" UUID NOT NULL,
  "invoiceNumber" TEXT NOT NULL,
  "feeScheduleVersionId" UUID,
  "assessmentReference" TEXT,
  "governmentDecisionId" UUID,
  "amountDueCents" INTEGER NOT NULL,
  "amountPaidCents" INTEGER NOT NULL DEFAULT 0,
  "currency" TEXT NOT NULL DEFAULT 'XCD',
  "status" "InvoiceStatus" NOT NULL DEFAULT 'DRAFT',
  "dueDate" TIMESTAMP(3),
  "issuedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "invoices_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "payment_transactions" (
  "id" UUID NOT NULL,
  "invoiceId" UUID NOT NULL,
  "providerReference" TEXT,
  "amountCents" INTEGER NOT NULL,
  "settledAmountCents" INTEGER NOT NULL DEFAULT 0,
  "currency" TEXT NOT NULL DEFAULT 'XCD',
  "status" "PaymentTransactionStatus" NOT NULL DEFAULT 'PENDING',
  "settledAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "payment_transactions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "receipts" (
  "id" UUID NOT NULL,
  "paymentTransactionId" UUID NOT NULL,
  "receiptNumber" TEXT NOT NULL,
  "amountCents" INTEGER NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'XCD',
  "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "receipts_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "chargeback_events" (
  "id" UUID NOT NULL,
  "paymentTransactionId" UUID NOT NULL,
  "providerReference" TEXT NOT NULL,
  "amountCents" INTEGER NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'XCD',
  "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "recordedByIdentityId" UUID,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "chargeback_events_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "fee_adjustment_requests" (
  "id" UUID NOT NULL,
  "requestNumber" TEXT NOT NULL,
  "adjustmentType" "FeeAdjustmentType" NOT NULL,
  "basis" TEXT NOT NULL,
  "requestedAmountCents" INTEGER NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'XCD',
  "source" TEXT NOT NULL,
  "supportingEvidenceReference" TEXT,
  "requesterIdentityId" UUID NOT NULL,
  "requesterOfficeholderId" UUID,
  "invoiceId" UUID NOT NULL,
  "assessmentReference" TEXT,
  "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "status" "FeeAdjustmentRequestStatus" NOT NULL DEFAULT 'REQUESTED',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "fee_adjustment_requests_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "fee_adjustment_decisions" (
  "id" UUID NOT NULL,
  "requestId" UUID NOT NULL,
  "deciderIdentityId" UUID NOT NULL,
  "deciderOfficeholderId" UUID,
  "authorityEvaluationRecordId" UUID,
  "approvedAmountCents" INTEGER NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'XCD',
  "reason" TEXT NOT NULL,
  "effectiveDate" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "fee_adjustment_decisions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "refund_requests" (
  "id" UUID NOT NULL,
  "requestNumber" TEXT NOT NULL,
  "invoiceId" UUID NOT NULL,
  "originalPaymentTransactionId" UUID NOT NULL,
  "amountCents" INTEGER NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'XCD',
  "reason" TEXT NOT NULL,
  "requestedByIdentityId" UUID NOT NULL,
  "redressDecisionId" UUID,
  "financialAuthorityReference" TEXT,
  "status" "RefundRequestStatus" NOT NULL DEFAULT 'REQUESTED',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "refund_requests_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "refund_authorizations" (
  "id" UUID NOT NULL,
  "refundRequestId" UUID NOT NULL,
  "requesterIdentityId" UUID NOT NULL,
  "approverIdentityId" UUID,
  "approverOfficeholderId" UUID,
  "authorityEvaluationRecordId" UUID,
  "authorizedAmountCents" INTEGER NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'XCD',
  "status" "RefundAuthorizationStatus" NOT NULL DEFAULT 'PENDING',
  "reason" TEXT,
  "authorizedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "refund_authorizations_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "refund_transactions" (
  "id" UUID NOT NULL,
  "refundRequestId" UUID NOT NULL,
  "authorizationId" UUID NOT NULL,
  "amountCents" INTEGER NOT NULL,
  "settledAmountCents" INTEGER NOT NULL DEFAULT 0,
  "currency" TEXT NOT NULL DEFAULT 'XCD',
  "status" "RefundRequestStatus" NOT NULL DEFAULT 'APPROVED',
  "providerReference" TEXT,
  "providerErrorMessage" TEXT,
  "settledAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "refund_transactions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "reconciliation_batches" (
  "id" UUID NOT NULL,
  "batchNumber" TEXT NOT NULL,
  "periodStart" TIMESTAMP(3) NOT NULL,
  "periodEnd" TIMESTAMP(3) NOT NULL,
  "source" "ReconciliationBatchSource" NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'XCD',
  "expectedTotalCents" INTEGER NOT NULL DEFAULT 0,
  "externalTotalCents" INTEGER NOT NULL DEFAULT 0,
  "matchedTotalCents" INTEGER NOT NULL DEFAULT 0,
  "unmatchedTotalCents" INTEGER NOT NULL DEFAULT 0,
  "status" "ReconciliationBatchStatus" NOT NULL DEFAULT 'PENDING',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "reconciliation_batches_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "reconciliation_items" (
  "id" UUID NOT NULL,
  "batchId" UUID NOT NULL,
  "paymentTransactionId" UUID,
  "refundTransactionId" UUID,
  "receiptId" UUID,
  "externalReference" TEXT,
  "externalAmountCents" INTEGER,
  "externalCurrency" TEXT,
  "matchStatus" "ReconciliationMatchStatus" NOT NULL DEFAULT 'UNDER_REVIEW',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "reconciliation_items_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "reconciliation_exceptions" (
  "id" UUID NOT NULL,
  "itemId" UUID NOT NULL,
  "differenceCents" INTEGER NOT NULL,
  "evidenceReference" TEXT,
  "ownerIdentityId" UUID,
  "investigationNotes" TEXT,
  "resolutionNotes" TEXT,
  "approvalReference" TEXT,
  "adjustmentReference" TEXT,
  "status" "ReconciliationExceptionStatus" NOT NULL DEFAULT 'OPEN',
  "closedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "reconciliation_exceptions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "arrears_records" (
  "id" UUID NOT NULL,
  "invoiceId" UUID NOT NULL,
  "amountOutstandingCents" INTEGER NOT NULL,
  "dueDate" TIMESTAMP(3) NOT NULL,
  "daysPastDue" INTEGER NOT NULL DEFAULT 0,
  "status" "ArrearsRecordStatus" NOT NULL DEFAULT 'OPEN',
  "reminderStatus" TEXT,
  "collectionRoute" TEXT,
  "disputeStatus" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "arrears_records_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "financial_disputes" (
  "id" UUID NOT NULL,
  "disputeNumber" TEXT NOT NULL,
  "subject" "FinancialDisputeSubject" NOT NULL,
  "description" TEXT NOT NULL,
  "filerIdentityId" UUID NOT NULL,
  "invoiceId" UUID,
  "paymentTransactionId" UUID,
  "refundRequestId" UUID,
  "feeAdjustmentRequestId" UUID,
  "substantiveRouteReference" TEXT,
  "status" "FinancialDisputeStatus" NOT NULL DEFAULT 'OPEN',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "financial_disputes_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "financial_approval_records" (
  "id" UUID NOT NULL,
  "approvalNumber" TEXT NOT NULL,
  "requesterIdentityId" UUID NOT NULL,
  "reviewerIdentityId" UUID,
  "approverIdentityId" UUID,
  "approverOfficeholderId" UUID,
  "authorityEvaluationRecordId" UUID,
  "amountCents" INTEGER NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'XCD',
  "purpose" TEXT NOT NULL,
  "decision" "FinancialApprovalDecision" NOT NULL,
  "decidedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "relatedRefundRequestId" UUID,
  "relatedFeeAdjustmentRequestId" UUID,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "financial_approval_records_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "financial_reversal_records" (
  "id" UUID NOT NULL,
  "reversalNumber" TEXT NOT NULL,
  "originalPaymentTransactionId" UUID,
  "originalRefundTransactionId" UUID,
  "reason" "FinancialReversalReason" NOT NULL,
  "amountCents" INTEGER NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'XCD',
  "preservesOriginal" BOOLEAN NOT NULL DEFAULT true,
  "recordedByIdentityId" UUID,
  "authorityEvaluationRecordId" UUID,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "financial_reversal_records_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "fee_schedules_code_key" ON "fee_schedules"("code");
CREATE UNIQUE INDEX "fee_schedule_versions_feeScheduleId_versionNumber_key" ON "fee_schedule_versions"("feeScheduleId", "versionNumber");
CREATE UNIQUE INDEX "invoices_invoiceNumber_key" ON "invoices"("invoiceNumber");
CREATE UNIQUE INDEX "receipts_receiptNumber_key" ON "receipts"("receiptNumber");
CREATE UNIQUE INDEX "fee_adjustment_requests_requestNumber_key" ON "fee_adjustment_requests"("requestNumber");
CREATE UNIQUE INDEX "fee_adjustment_decisions_requestId_key" ON "fee_adjustment_decisions"("requestId");
CREATE UNIQUE INDEX "refund_requests_requestNumber_key" ON "refund_requests"("requestNumber");
CREATE UNIQUE INDEX "refund_authorizations_refundRequestId_key" ON "refund_authorizations"("refundRequestId");
CREATE UNIQUE INDEX "reconciliation_batches_batchNumber_key" ON "reconciliation_batches"("batchNumber");
CREATE UNIQUE INDEX "reconciliation_exceptions_itemId_key" ON "reconciliation_exceptions"("itemId");
CREATE UNIQUE INDEX "financial_disputes_disputeNumber_key" ON "financial_disputes"("disputeNumber");
CREATE UNIQUE INDEX "financial_approval_records_approvalNumber_key" ON "financial_approval_records"("approvalNumber");
CREATE UNIQUE INDEX "financial_reversal_records_reversalNumber_key" ON "financial_reversal_records"("reversalNumber");

CREATE INDEX "fee_schedule_versions_feeScheduleId_idx" ON "fee_schedule_versions"("feeScheduleId");
CREATE INDEX "invoices_feeScheduleVersionId_idx" ON "invoices"("feeScheduleVersionId");
CREATE INDEX "invoices_status_idx" ON "invoices"("status");
CREATE INDEX "payment_transactions_invoiceId_idx" ON "payment_transactions"("invoiceId");
CREATE INDEX "payment_transactions_status_idx" ON "payment_transactions"("status");
CREATE INDEX "receipts_paymentTransactionId_idx" ON "receipts"("paymentTransactionId");
CREATE INDEX "chargeback_events_paymentTransactionId_idx" ON "chargeback_events"("paymentTransactionId");
CREATE INDEX "fee_adjustment_requests_invoiceId_idx" ON "fee_adjustment_requests"("invoiceId");
CREATE INDEX "fee_adjustment_requests_status_idx" ON "fee_adjustment_requests"("status");
CREATE INDEX "refund_requests_invoiceId_idx" ON "refund_requests"("invoiceId");
CREATE INDEX "refund_requests_status_idx" ON "refund_requests"("status");
CREATE INDEX "refund_transactions_refundRequestId_idx" ON "refund_transactions"("refundRequestId");
CREATE INDEX "reconciliation_items_batchId_idx" ON "reconciliation_items"("batchId");
CREATE INDEX "reconciliation_items_matchStatus_idx" ON "reconciliation_items"("matchStatus");
CREATE INDEX "arrears_records_invoiceId_idx" ON "arrears_records"("invoiceId");
CREATE INDEX "arrears_records_status_idx" ON "arrears_records"("status");
CREATE INDEX "financial_disputes_status_idx" ON "financial_disputes"("status");

ALTER TABLE "fee_schedule_versions" ADD CONSTRAINT "fee_schedule_versions_feeScheduleId_fkey" FOREIGN KEY ("feeScheduleId") REFERENCES "fee_schedules"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_feeScheduleVersionId_fkey" FOREIGN KEY ("feeScheduleVersionId") REFERENCES "fee_schedule_versions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "payment_transactions" ADD CONSTRAINT "payment_transactions_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "invoices"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "receipts" ADD CONSTRAINT "receipts_paymentTransactionId_fkey" FOREIGN KEY ("paymentTransactionId") REFERENCES "payment_transactions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "chargeback_events" ADD CONSTRAINT "chargeback_events_paymentTransactionId_fkey" FOREIGN KEY ("paymentTransactionId") REFERENCES "payment_transactions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "chargeback_events" ADD CONSTRAINT "chargeback_events_recordedByIdentityId_fkey" FOREIGN KEY ("recordedByIdentityId") REFERENCES "identities"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "fee_adjustment_requests" ADD CONSTRAINT "fee_adjustment_requests_requesterIdentityId_fkey" FOREIGN KEY ("requesterIdentityId") REFERENCES "identities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "fee_adjustment_requests" ADD CONSTRAINT "fee_adjustment_requests_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "invoices"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "fee_adjustment_decisions" ADD CONSTRAINT "fee_adjustment_decisions_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "fee_adjustment_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "fee_adjustment_decisions" ADD CONSTRAINT "fee_adjustment_decisions_deciderIdentityId_fkey" FOREIGN KEY ("deciderIdentityId") REFERENCES "identities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "fee_adjustment_decisions" ADD CONSTRAINT "fee_adjustment_decisions_authorityEvaluationRecordId_fkey" FOREIGN KEY ("authorityEvaluationRecordId") REFERENCES "authority_evaluation_records"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "refund_requests" ADD CONSTRAINT "refund_requests_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "invoices"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "refund_requests" ADD CONSTRAINT "refund_requests_originalPaymentTransactionId_fkey" FOREIGN KEY ("originalPaymentTransactionId") REFERENCES "payment_transactions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "refund_requests" ADD CONSTRAINT "refund_requests_requestedByIdentityId_fkey" FOREIGN KEY ("requestedByIdentityId") REFERENCES "identities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "refund_authorizations" ADD CONSTRAINT "refund_authorizations_refundRequestId_fkey" FOREIGN KEY ("refundRequestId") REFERENCES "refund_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "refund_authorizations" ADD CONSTRAINT "refund_authorizations_requesterIdentityId_fkey" FOREIGN KEY ("requesterIdentityId") REFERENCES "identities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "refund_authorizations" ADD CONSTRAINT "refund_authorizations_approverIdentityId_fkey" FOREIGN KEY ("approverIdentityId") REFERENCES "identities"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "refund_authorizations" ADD CONSTRAINT "refund_authorizations_authorityEvaluationRecordId_fkey" FOREIGN KEY ("authorityEvaluationRecordId") REFERENCES "authority_evaluation_records"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "refund_transactions" ADD CONSTRAINT "refund_transactions_refundRequestId_fkey" FOREIGN KEY ("refundRequestId") REFERENCES "refund_requests"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "refund_transactions" ADD CONSTRAINT "refund_transactions_authorizationId_fkey" FOREIGN KEY ("authorizationId") REFERENCES "refund_authorizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "reconciliation_items" ADD CONSTRAINT "reconciliation_items_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "reconciliation_batches"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "reconciliation_items" ADD CONSTRAINT "reconciliation_items_paymentTransactionId_fkey" FOREIGN KEY ("paymentTransactionId") REFERENCES "payment_transactions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "reconciliation_items" ADD CONSTRAINT "reconciliation_items_refundTransactionId_fkey" FOREIGN KEY ("refundTransactionId") REFERENCES "refund_transactions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "reconciliation_items" ADD CONSTRAINT "reconciliation_items_receiptId_fkey" FOREIGN KEY ("receiptId") REFERENCES "receipts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "reconciliation_exceptions" ADD CONSTRAINT "reconciliation_exceptions_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "reconciliation_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "reconciliation_exceptions" ADD CONSTRAINT "reconciliation_exceptions_ownerIdentityId_fkey" FOREIGN KEY ("ownerIdentityId") REFERENCES "identities"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "arrears_records" ADD CONSTRAINT "arrears_records_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "invoices"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "financial_disputes" ADD CONSTRAINT "financial_disputes_filerIdentityId_fkey" FOREIGN KEY ("filerIdentityId") REFERENCES "identities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "financial_disputes" ADD CONSTRAINT "financial_disputes_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "invoices"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "financial_disputes" ADD CONSTRAINT "financial_disputes_paymentTransactionId_fkey" FOREIGN KEY ("paymentTransactionId") REFERENCES "payment_transactions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "financial_disputes" ADD CONSTRAINT "financial_disputes_refundRequestId_fkey" FOREIGN KEY ("refundRequestId") REFERENCES "refund_requests"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "financial_disputes" ADD CONSTRAINT "financial_disputes_feeAdjustmentRequestId_fkey" FOREIGN KEY ("feeAdjustmentRequestId") REFERENCES "fee_adjustment_requests"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "financial_approval_records" ADD CONSTRAINT "financial_approval_records_requesterIdentityId_fkey" FOREIGN KEY ("requesterIdentityId") REFERENCES "identities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "financial_approval_records" ADD CONSTRAINT "financial_approval_records_reviewerIdentityId_fkey" FOREIGN KEY ("reviewerIdentityId") REFERENCES "identities"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "financial_approval_records" ADD CONSTRAINT "financial_approval_records_approverIdentityId_fkey" FOREIGN KEY ("approverIdentityId") REFERENCES "identities"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "financial_approval_records" ADD CONSTRAINT "financial_approval_records_authorityEvaluationRecordId_fkey" FOREIGN KEY ("authorityEvaluationRecordId") REFERENCES "authority_evaluation_records"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "financial_reversal_records" ADD CONSTRAINT "financial_reversal_records_originalPaymentTransactionId_fkey" FOREIGN KEY ("originalPaymentTransactionId") REFERENCES "payment_transactions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "financial_reversal_records" ADD CONSTRAINT "financial_reversal_records_originalRefundTransactionId_fkey" FOREIGN KEY ("originalRefundTransactionId") REFERENCES "refund_transactions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "financial_reversal_records" ADD CONSTRAINT "financial_reversal_records_recordedByIdentityId_fkey" FOREIGN KEY ("recordedByIdentityId") REFERENCES "identities"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "financial_reversal_records" ADD CONSTRAINT "financial_reversal_records_authorityEvaluationRecordId_fkey" FOREIGN KEY ("authorityEvaluationRecordId") REFERENCES "authority_evaluation_records"("id") ON DELETE SET NULL ON UPDATE CASCADE;
