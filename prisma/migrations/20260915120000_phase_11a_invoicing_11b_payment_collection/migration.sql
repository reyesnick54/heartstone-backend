-- Phase 11A: Invoicing foundation
-- Phase 11B: Payment collection, provider abstraction and receipts

ALTER TYPE "AuthorityActionType" ADD VALUE 'COLLECT_PAYMENT';
ALTER TYPE "AuthorityActionType" ADD VALUE 'CONFIRM_MANUAL_PAYMENT';

CREATE TYPE "InvoiceStatus" AS ENUM (
    'DRAFT',
    'ISSUED',
    'PARTIALLY_PAID',
    'PAID',
    'OVERDUE',
    'CANCELLED',
    'WRITTEN_OFF'
);

CREATE TYPE "PaymentChannelCode" AS ENUM (
    'ONLINE_CARD',
    'BANK_TRANSFER',
    'GOVERNMENT_PAYMENT_GATEWAY',
    'MOBILE_PAYMENT',
    'COUNTER_PAYMENT',
    'INTERNAL_TRANSFER',
    'OTHER_APPROVED_CHANNEL'
);

CREATE TYPE "PaymentChannelDefinitionStatus" AS ENUM (
    'DRAFT',
    'APPROVED',
    'INACTIVE'
);

CREATE TYPE "PaymentProviderConfigurationStatus" AS ENUM (
    'DRAFT',
    'ACTIVE',
    'SUSPENDED',
    'RETIRED'
);

CREATE TYPE "PaymentIntentStatus" AS ENUM (
    'CREATED',
    'PENDING',
    'REQUIRES_ACTION',
    'AUTHORIZED',
    'PROCESSING',
    'SETTLED',
    'FAILED',
    'CANCELLED',
    'EXPIRED'
);

CREATE TYPE "PaymentTransactionType" AS ENUM (
    'AUTHORIZATION',
    'CAPTURE',
    'PAYMENT',
    'SETTLEMENT',
    'REVERSAL',
    'REFUND_REFERENCE',
    'CHARGEBACK_REFERENCE',
    'MANUAL_CONFIRMED_PAYMENT'
);

CREATE TYPE "PaymentTransactionStatus" AS ENUM (
    'PENDING',
    'PROCESSING',
    'COMPLETED',
    'FAILED',
    'REVERSED'
);

CREATE TYPE "PaymentReceiptStatus" AS ENUM (
    'ISSUED',
    'VOIDED'
);

CREATE TYPE "PaymentWebhookProcessingStatus" AS ENUM (
    'RECEIVED',
    'VALIDATED',
    'PROCESSED',
    'REJECTED',
    'DUPLICATE',
    'FAILED'
);

CREATE TYPE "ManualPaymentSource" AS ENUM (
    'BANK_TRANSFER',
    'COUNTER',
    'INTERNAL_TRANSFER',
    'OTHER'
);

CREATE TABLE "invoices" (
    "id" UUID NOT NULL,
    "invoiceNumber" TEXT NOT NULL,
    "institutionId" UUID NOT NULL,
    "caseId" UUID,
    "applicationId" UUID,
    "payerIdentityId" UUID NOT NULL,
    "payerOrganizationId" UUID,
    "totalAmountCents" INTEGER NOT NULL,
    "paidAmountCents" INTEGER NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'XCD',
    "status" "InvoiceStatus" NOT NULL DEFAULT 'DRAFT',
    "dueDate" TIMESTAMP(3),
    "issuedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "invoices_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "invoice_lines" (
    "id" UUID NOT NULL,
    "invoiceId" UUID NOT NULL,
    "lineNumber" INTEGER NOT NULL,
    "description" TEXT NOT NULL,
    "feeDefinitionId" UUID,
    "amountCents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'XCD',
    "allocatedAmountCents" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "invoice_lines_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "payment_channel_definitions" (
    "id" UUID NOT NULL,
    "code" "PaymentChannelCode" NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" "PaymentChannelDefinitionStatus" NOT NULL DEFAULT 'DRAFT',
    "acceptedAt" TIMESTAMP(3),
    "effectiveFrom" TIMESTAMP(3),
    "effectiveTo" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payment_channel_definitions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "payment_provider_configurations" (
    "id" UUID NOT NULL,
    "providerCode" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "environment" TEXT NOT NULL,
    "merchantAccountReference" TEXT,
    "supportedCurrencies" TEXT[],
    "supportedChannels" "PaymentChannelCode"[],
    "webhookConfigured" BOOLEAN NOT NULL DEFAULT false,
    "credentialReference" TEXT,
    "status" "PaymentProviderConfigurationStatus" NOT NULL DEFAULT 'DRAFT',
    "acceptedAt" TIMESTAMP(3),
    "effectiveFrom" TIMESTAMP(3),
    "effectiveTo" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payment_provider_configurations_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "payment_intents" (
    "id" UUID NOT NULL,
    "paymentIntentNumber" TEXT NOT NULL,
    "invoiceId" UUID NOT NULL,
    "payerIdentityId" UUID NOT NULL,
    "payerOrganizationId" UUID,
    "requestedAmountCents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'XCD',
    "providerCode" TEXT NOT NULL,
    "providerConfigurationId" UUID,
    "channel" "PaymentChannelCode" NOT NULL,
    "providerIntentReference" TEXT,
    "providerStatusRaw" TEXT,
    "status" "PaymentIntentStatus" NOT NULL DEFAULT 'CREATED',
    "idempotencyKey" TEXT,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payment_intents_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "payment_transactions" (
    "id" UUID NOT NULL,
    "transactionNumber" TEXT NOT NULL,
    "paymentIntentId" UUID,
    "invoiceId" UUID NOT NULL,
    "providerCode" TEXT NOT NULL,
    "providerConfigurationId" UUID,
    "providerTransactionReference" TEXT,
    "type" "PaymentTransactionType" NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'XCD',
    "status" "PaymentTransactionStatus" NOT NULL DEFAULT 'PENDING',
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "providerPayloadHash" TEXT NOT NULL,
    "settlementReference" TEXT,
    "isManualConfirmation" BOOLEAN NOT NULL DEFAULT false,
    "manualSource" "ManualPaymentSource",
    "manualBankReference" TEXT,
    "manualEvidenceReference" TEXT,
    "manualReviewerOfficeholderId" UUID,
    "manualConfirmationDate" TIMESTAMP(3),
    "manualConfirmationReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payment_transactions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "payment_transaction_events" (
    "id" UUID NOT NULL,
    "paymentTransactionId" UUID NOT NULL,
    "eventType" TEXT NOT NULL,
    "providerStatusRaw" TEXT,
    "canonicalStatus" "PaymentTransactionStatus",
    "payloadHash" TEXT NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payment_transaction_events_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "payment_allocations" (
    "id" UUID NOT NULL,
    "transactionId" UUID NOT NULL,
    "invoiceId" UUID NOT NULL,
    "invoiceLineId" UUID,
    "amountCents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'XCD',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payment_allocations_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "payment_receipts" (
    "id" UUID NOT NULL,
    "receiptNumber" TEXT NOT NULL,
    "invoiceId" UUID NOT NULL,
    "paymentTransactionId" UUID NOT NULL,
    "payerIdentityId" UUID NOT NULL,
    "payerOrganizationId" UUID,
    "amountCents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'XCD',
    "paymentDate" TIMESTAMP(3) NOT NULL,
    "channel" "PaymentChannelCode" NOT NULL,
    "providerReference" TEXT,
    "institutionId" UUID NOT NULL,
    "documentRecordId" UUID,
    "status" "PaymentReceiptStatus" NOT NULL DEFAULT 'ISSUED',
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payment_receipts_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "payment_provider_webhook_events" (
    "id" UUID NOT NULL,
    "provider" TEXT NOT NULL,
    "externalEventId" TEXT NOT NULL,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "signatureValidationResult" TEXT NOT NULL,
    "timestampValidation" TEXT NOT NULL,
    "payloadHash" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "processingStatus" "PaymentWebhookProcessingStatus" NOT NULL DEFAULT 'RECEIVED',
    "processedAt" TIMESTAMP(3),
    "relatedTransactionId" UUID,
    "failureReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payment_provider_webhook_events_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "invoices_invoiceNumber_key" ON "invoices"("invoiceNumber");
CREATE INDEX "invoices_institutionId_idx" ON "invoices"("institutionId");
CREATE INDEX "invoices_caseId_idx" ON "invoices"("caseId");
CREATE INDEX "invoices_applicationId_idx" ON "invoices"("applicationId");
CREATE INDEX "invoices_payerIdentityId_idx" ON "invoices"("payerIdentityId");
CREATE INDEX "invoices_status_idx" ON "invoices"("status");

CREATE UNIQUE INDEX "invoice_lines_invoiceId_lineNumber_key" ON "invoice_lines"("invoiceId", "lineNumber");
CREATE INDEX "invoice_lines_invoiceId_idx" ON "invoice_lines"("invoiceId");
CREATE INDEX "invoice_lines_feeDefinitionId_idx" ON "invoice_lines"("feeDefinitionId");

CREATE UNIQUE INDEX "payment_channel_definitions_code_key" ON "payment_channel_definitions"("code");
CREATE INDEX "payment_channel_definitions_status_idx" ON "payment_channel_definitions"("status");

CREATE UNIQUE INDEX "payment_provider_configurations_providerCode_environment_key" ON "payment_provider_configurations"("providerCode", "environment");
CREATE INDEX "payment_provider_configurations_status_idx" ON "payment_provider_configurations"("status");

CREATE UNIQUE INDEX "payment_intents_paymentIntentNumber_key" ON "payment_intents"("paymentIntentNumber");
CREATE UNIQUE INDEX "payment_intents_idempotencyKey_key" ON "payment_intents"("idempotencyKey");
CREATE INDEX "payment_intents_invoiceId_idx" ON "payment_intents"("invoiceId");
CREATE INDEX "payment_intents_payerIdentityId_idx" ON "payment_intents"("payerIdentityId");
CREATE INDEX "payment_intents_status_idx" ON "payment_intents"("status");
CREATE INDEX "payment_intents_providerCode_idx" ON "payment_intents"("providerCode");

CREATE UNIQUE INDEX "payment_transactions_transactionNumber_key" ON "payment_transactions"("transactionNumber");
CREATE INDEX "payment_transactions_paymentIntentId_idx" ON "payment_transactions"("paymentIntentId");
CREATE INDEX "payment_transactions_invoiceId_idx" ON "payment_transactions"("invoiceId");
CREATE INDEX "payment_transactions_providerCode_idx" ON "payment_transactions"("providerCode");
CREATE INDEX "payment_transactions_status_idx" ON "payment_transactions"("status");
CREATE INDEX "payment_transactions_type_idx" ON "payment_transactions"("type");

CREATE INDEX "payment_transaction_events_paymentTransactionId_idx" ON "payment_transaction_events"("paymentTransactionId");
CREATE INDEX "payment_transaction_events_occurredAt_idx" ON "payment_transaction_events"("occurredAt");

CREATE INDEX "payment_allocations_transactionId_idx" ON "payment_allocations"("transactionId");
CREATE INDEX "payment_allocations_invoiceId_idx" ON "payment_allocations"("invoiceId");
CREATE INDEX "payment_allocations_invoiceLineId_idx" ON "payment_allocations"("invoiceLineId");

CREATE UNIQUE INDEX "payment_receipts_receiptNumber_key" ON "payment_receipts"("receiptNumber");
CREATE UNIQUE INDEX "payment_receipts_paymentTransactionId_key" ON "payment_receipts"("paymentTransactionId");
CREATE INDEX "payment_receipts_invoiceId_idx" ON "payment_receipts"("invoiceId");
CREATE INDEX "payment_receipts_payerIdentityId_idx" ON "payment_receipts"("payerIdentityId");
CREATE INDEX "payment_receipts_institutionId_idx" ON "payment_receipts"("institutionId");
CREATE INDEX "payment_receipts_status_idx" ON "payment_receipts"("status");

CREATE UNIQUE INDEX "payment_provider_webhook_events_provider_externalEventId_key" ON "payment_provider_webhook_events"("provider", "externalEventId");
CREATE INDEX "payment_provider_webhook_events_provider_idx" ON "payment_provider_webhook_events"("provider");
CREATE INDEX "payment_provider_webhook_events_processingStatus_idx" ON "payment_provider_webhook_events"("processingStatus");
CREATE INDEX "payment_provider_webhook_events_relatedTransactionId_idx" ON "payment_provider_webhook_events"("relatedTransactionId");

ALTER TABLE "invoices" ADD CONSTRAINT "invoices_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "institutions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "cases"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "applications"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_payerIdentityId_fkey" FOREIGN KEY ("payerIdentityId") REFERENCES "identities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_payerOrganizationId_fkey" FOREIGN KEY ("payerOrganizationId") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "invoice_lines" ADD CONSTRAINT "invoice_lines_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "invoice_lines" ADD CONSTRAINT "invoice_lines_feeDefinitionId_fkey" FOREIGN KEY ("feeDefinitionId") REFERENCES "government_service_fee_definitions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "payment_intents" ADD CONSTRAINT "payment_intents_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "invoices"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "payment_intents" ADD CONSTRAINT "payment_intents_payerIdentityId_fkey" FOREIGN KEY ("payerIdentityId") REFERENCES "identities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "payment_intents" ADD CONSTRAINT "payment_intents_payerOrganizationId_fkey" FOREIGN KEY ("payerOrganizationId") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "payment_intents" ADD CONSTRAINT "payment_intents_providerConfigurationId_fkey" FOREIGN KEY ("providerConfigurationId") REFERENCES "payment_provider_configurations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "payment_transactions" ADD CONSTRAINT "payment_transactions_paymentIntentId_fkey" FOREIGN KEY ("paymentIntentId") REFERENCES "payment_intents"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "payment_transactions" ADD CONSTRAINT "payment_transactions_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "invoices"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "payment_transactions" ADD CONSTRAINT "payment_transactions_providerConfigurationId_fkey" FOREIGN KEY ("providerConfigurationId") REFERENCES "payment_provider_configurations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "payment_transactions" ADD CONSTRAINT "payment_transactions_manualReviewerOfficeholderId_fkey" FOREIGN KEY ("manualReviewerOfficeholderId") REFERENCES "officeholders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "payment_transaction_events" ADD CONSTRAINT "payment_transaction_events_paymentTransactionId_fkey" FOREIGN KEY ("paymentTransactionId") REFERENCES "payment_transactions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "payment_allocations" ADD CONSTRAINT "payment_allocations_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "payment_transactions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "payment_allocations" ADD CONSTRAINT "payment_allocations_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "invoices"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "payment_allocations" ADD CONSTRAINT "payment_allocations_invoiceLineId_fkey" FOREIGN KEY ("invoiceLineId") REFERENCES "invoice_lines"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "payment_receipts" ADD CONSTRAINT "payment_receipts_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "invoices"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "payment_receipts" ADD CONSTRAINT "payment_receipts_paymentTransactionId_fkey" FOREIGN KEY ("paymentTransactionId") REFERENCES "payment_transactions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "payment_receipts" ADD CONSTRAINT "payment_receipts_payerIdentityId_fkey" FOREIGN KEY ("payerIdentityId") REFERENCES "identities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "payment_receipts" ADD CONSTRAINT "payment_receipts_payerOrganizationId_fkey" FOREIGN KEY ("payerOrganizationId") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "payment_receipts" ADD CONSTRAINT "payment_receipts_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "institutions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "payment_receipts" ADD CONSTRAINT "payment_receipts_documentRecordId_fkey" FOREIGN KEY ("documentRecordId") REFERENCES "document_records"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "payment_provider_webhook_events" ADD CONSTRAINT "payment_provider_webhook_events_relatedTransactionId_fkey" FOREIGN KEY ("relatedTransactionId") REFERENCES "payment_transactions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
