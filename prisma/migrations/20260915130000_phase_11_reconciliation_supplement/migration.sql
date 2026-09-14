-- Phase 11 reconciliation supplement
-- Adds models present in canonical schema but not in the consolidated Phase 11 migration.

CREATE TYPE "ReconciliationExceptionStatus" AS ENUM (
  'OPEN',
  'UNDER_INVESTIGATION',
  'RESOLVED',
  'CLOSED'
);

CREATE TYPE "CommunicationFailureRetryState" AS ENUM (
  'NOT_RETRYABLE',
  'PENDING_RETRY',
  'RETRYING',
  'RETRY_EXHAUSTED',
  'RESOLVED'
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

CREATE TABLE "communication_failure_records" (
  "id" UUID NOT NULL,
  "deliveryId" UUID NOT NULL,
  "failureReason" TEXT NOT NULL,
  "retryState" "CommunicationFailureRetryState" NOT NULL DEFAULT 'PENDING_RETRY',
  "alternateChannel" "CommunicationChannelType",
  "escalationReference" TEXT,
  "resolutionNotes" TEXT,
  "resolvedAt" TIMESTAMP(3),
  "affectsLegalStatus" BOOLEAN,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "communication_failure_records_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "communication_maf_index_entries" (
  "id" UUID NOT NULL,
  "masterAdministrativeFileId" UUID NOT NULL,
  "messageId" UUID NOT NULL,
  "templateVersionId" UUID,
  "deliveredVersionReference" TEXT NOT NULL,
  "indexedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "communication_maf_index_entries_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "payment_transaction_events_paymentTransactionId_idx" ON "payment_transaction_events"("paymentTransactionId");
CREATE INDEX "payment_transaction_events_occurredAt_idx" ON "payment_transaction_events"("occurredAt");

CREATE UNIQUE INDEX "reconciliation_exceptions_itemId_key" ON "reconciliation_exceptions"("itemId");

CREATE INDEX "communication_failure_records_deliveryId_idx" ON "communication_failure_records"("deliveryId");
CREATE INDEX "communication_failure_records_retryState_idx" ON "communication_failure_records"("retryState");

CREATE UNIQUE INDEX "communication_maf_index_entries_masterAdministrativeFileId_messageId_deliveredVersionReference_key" ON "communication_maf_index_entries"("masterAdministrativeFileId", "messageId", "deliveredVersionReference");
CREATE INDEX "communication_maf_index_entries_messageId_idx" ON "communication_maf_index_entries"("messageId");
CREATE INDEX "communication_maf_index_entries_templateVersionId_idx" ON "communication_maf_index_entries"("templateVersionId");

ALTER TABLE "payment_transaction_events" ADD CONSTRAINT "payment_transaction_events_paymentTransactionId_fkey" FOREIGN KEY ("paymentTransactionId") REFERENCES "payment_transactions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "reconciliation_exceptions" ADD CONSTRAINT "reconciliation_exceptions_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "reconciliation_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "reconciliation_exceptions" ADD CONSTRAINT "reconciliation_exceptions_ownerIdentityId_fkey" FOREIGN KEY ("ownerIdentityId") REFERENCES "identities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "communication_failure_records" ADD CONSTRAINT "communication_failure_records_deliveryId_fkey" FOREIGN KEY ("deliveryId") REFERENCES "communication_deliveries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "communication_maf_index_entries" ADD CONSTRAINT "communication_maf_index_entries_masterAdministrativeFileId_fkey" FOREIGN KEY ("masterAdministrativeFileId") REFERENCES "master_administrative_files"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "communication_maf_index_entries" ADD CONSTRAINT "communication_maf_index_entries_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "communication_messages"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "communication_maf_index_entries" ADD CONSTRAINT "communication_maf_index_entries_templateVersionId_fkey" FOREIGN KEY ("templateVersionId") REFERENCES "communication_template_versions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
