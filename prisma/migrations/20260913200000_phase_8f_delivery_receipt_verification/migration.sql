-- Phase 8F: Official delivery, receipt, and instrument verification

CREATE TYPE "InstrumentTypePublicVerificationMode" AS ENUM ('NOT_PERMITTED', 'LIMITED', 'FULL');

CREATE TYPE "InstrumentDeliveryChannel" AS ENUM ('PORTAL', 'SECURE_EMAIL', 'GOVERNMENT_INTEGRATION', 'PARTNER_INTEGRATION', 'CONTROLLED_DOWNLOAD', 'PHYSICAL_OR_MANUAL_REFERENCE');

CREATE TYPE "InstrumentDeliveryStatus" AS ENUM ('PREPARED', 'QUEUED', 'SENT', 'DELIVERED', 'FAILED', 'CANCELLED');

CREATE TYPE "InstrumentDeliveryClassification" AS ENUM ('PUBLIC', 'OFFICIAL', 'RESTRICTED', 'SECRET');

CREATE TYPE "InstrumentAcknowledgmentMethod" AS ENUM ('PORTAL_CONFIRMATION', 'SECURE_LINK_CONFIRMATION', 'DIGITAL_SIGNATURE', 'INTEGRATION_ACKNOWLEDGMENT', 'MANUAL_COUNTERSIGN', 'OTHER_CONTROLLED');

CREATE TYPE "InstrumentVerificationStatus" AS ENUM ('CURRENT', 'NOT_YET_EFFECTIVE', 'EXPIRED', 'SUSPENDED', 'REVOKED', 'SUPERSEDED', 'REPLACED', 'SURRENDERED', 'UNKNOWN_OR_UNVERIFIABLE', 'VALID_REFERENCE', 'NOT_PUBLICLY_DISCLOSABLE');

CREATE TYPE "InstrumentVerificationEventType" AS ENUM ('VERIFICATION_REQUEST', 'INTERNAL_VERIFICATION');

CREATE TYPE "InstrumentVerificationRequestSource" AS ENUM ('PUBLIC', 'INTERNAL', 'SYSTEM');

CREATE TYPE "InstrumentDeliveryAuditEventType" AS ENUM ('DELIVERY_PREPARED', 'DELIVERY_SENT', 'DELIVERY_DELIVERED', 'DELIVERY_FAILED', 'DELIVERY_REDELIVERY', 'DOWNLOAD', 'VERIFICATION_REQUEST', 'RECEIPT_ACKNOWLEDGMENT');

ALTER TABLE "instrument_type_versions" ADD COLUMN "publicVerificationMode" "InstrumentTypePublicVerificationMode" NOT NULL DEFAULT 'NOT_PERMITTED';
ALTER TABLE "instrument_type_versions" ADD COLUMN "holderDisplayPermitted" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "instrument_type_versions" ADD COLUMN "scopeSummaryPublic" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "instrument_type_versions" ADD COLUMN "restrictedClassification" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "instrument_type_versions" ADD COLUMN "permittedDeliveryChannels" "InstrumentDeliveryChannel"[];
ALTER TABLE "instrument_type_versions" ADD COLUMN "legalEffectRequiresDelivery" BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE "instrument_deliveries" (
    "id" UUID NOT NULL,
    "officialInstrumentId" UUID NOT NULL,
    "instrumentVersionId" UUID NOT NULL,
    "recipientIdentityId" UUID,
    "recipientOrganizationId" UUID,
    "recipientReference" TEXT,
    "deliveryChannel" "InstrumentDeliveryChannel" NOT NULL,
    "destinationReference" TEXT,
    "preparedAt" TIMESTAMP(3),
    "sentAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "failedAt" TIMESTAMP(3),
    "status" "InstrumentDeliveryStatus" NOT NULL DEFAULT 'PREPARED',
    "deliveryEvidenceReference" TEXT,
    "classification" "InstrumentDeliveryClassification" NOT NULL DEFAULT 'OFFICIAL',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "instrument_deliveries_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "instrument_delivery_attempts" (
    "id" UUID NOT NULL,
    "instrumentDeliveryId" UUID NOT NULL,
    "attemptNumber" INTEGER NOT NULL,
    "deliveryChannel" "InstrumentDeliveryChannel" NOT NULL,
    "destinationReference" TEXT,
    "queuedAt" TIMESTAMP(3),
    "sentAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "failedAt" TIMESTAMP(3),
    "status" "InstrumentDeliveryStatus" NOT NULL DEFAULT 'QUEUED',
    "failureReason" TEXT,
    "deliveryEvidenceReference" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "instrument_delivery_attempts_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "instrument_receipt_acknowledgments" (
    "id" UUID NOT NULL,
    "officialInstrumentId" UUID NOT NULL,
    "instrumentVersionId" UUID NOT NULL,
    "recipientIdentityId" UUID,
    "recipientOrganizationId" UUID,
    "recipientReference" TEXT,
    "receivedAt" TIMESTAMP(3) NOT NULL,
    "acknowledgmentMethod" "InstrumentAcknowledgmentMethod" NOT NULL,
    "identityAssuranceLevel" TEXT,
    "instrumentDeliveryId" UUID,
    "instrumentDeliveryAttemptId" UUID,
    "evidenceReference" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "instrument_receipt_acknowledgments_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "instrument_verification_records" (
    "id" UUID NOT NULL,
    "officialInstrumentId" UUID NOT NULL,
    "instrumentVersionId" UUID NOT NULL,
    "verificationCode" TEXT NOT NULL,
    "verificationUri" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "instrument_verification_records_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "instrument_verification_events" (
    "id" UUID NOT NULL,
    "verificationRecordId" UUID NOT NULL,
    "eventType" "InstrumentVerificationEventType" NOT NULL,
    "requestSource" "InstrumentVerificationRequestSource" NOT NULL,
    "actorIdentityId" UUID,
    "clientReferenceHash" TEXT,
    "returnedStatus" "InstrumentVerificationStatus" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "instrument_verification_events_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "instrument_delivery_audit_events" (
    "id" UUID NOT NULL,
    "officialInstrumentId" UUID NOT NULL,
    "instrumentVersionId" UUID,
    "instrumentDeliveryId" UUID,
    "eventType" "InstrumentDeliveryAuditEventType" NOT NULL,
    "actorIdentityId" UUID,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "instrument_delivery_audit_events_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "instrument_download_events" (
    "id" UUID NOT NULL,
    "officialInstrumentId" UUID NOT NULL,
    "instrumentVersionId" UUID NOT NULL,
    "actorIdentityId" UUID NOT NULL,
    "downloadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "contentSha256" TEXT NOT NULL,
    "authorized" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "instrument_download_events_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "instrument_delivery_attempts_instrumentDeliveryId_attemptNumber_key" ON "instrument_delivery_attempts"("instrumentDeliveryId", "attemptNumber");
CREATE UNIQUE INDEX "instrument_verification_records_verificationCode_key" ON "instrument_verification_records"("verificationCode");

CREATE INDEX "instrument_deliveries_officialInstrumentId_idx" ON "instrument_deliveries"("officialInstrumentId");
CREATE INDEX "instrument_deliveries_instrumentVersionId_idx" ON "instrument_deliveries"("instrumentVersionId");
CREATE INDEX "instrument_deliveries_recipientIdentityId_idx" ON "instrument_deliveries"("recipientIdentityId");
CREATE INDEX "instrument_deliveries_status_idx" ON "instrument_deliveries"("status");
CREATE INDEX "instrument_deliveries_deliveryChannel_idx" ON "instrument_deliveries"("deliveryChannel");
CREATE INDEX "instrument_delivery_attempts_instrumentDeliveryId_idx" ON "instrument_delivery_attempts"("instrumentDeliveryId");
CREATE INDEX "instrument_delivery_attempts_status_idx" ON "instrument_delivery_attempts"("status");
CREATE INDEX "instrument_receipt_acknowledgments_officialInstrumentId_idx" ON "instrument_receipt_acknowledgments"("officialInstrumentId");
CREATE INDEX "instrument_receipt_acknowledgments_instrumentVersionId_idx" ON "instrument_receipt_acknowledgments"("instrumentVersionId");
CREATE INDEX "instrument_receipt_acknowledgments_recipientIdentityId_idx" ON "instrument_receipt_acknowledgments"("recipientIdentityId");
CREATE INDEX "instrument_receipt_acknowledgments_receivedAt_idx" ON "instrument_receipt_acknowledgments"("receivedAt");
CREATE INDEX "instrument_verification_records_officialInstrumentId_idx" ON "instrument_verification_records"("officialInstrumentId");
CREATE INDEX "instrument_verification_records_instrumentVersionId_idx" ON "instrument_verification_records"("instrumentVersionId");
CREATE INDEX "instrument_verification_events_verificationRecordId_idx" ON "instrument_verification_events"("verificationRecordId");
CREATE INDEX "instrument_verification_events_createdAt_idx" ON "instrument_verification_events"("createdAt");
CREATE INDEX "instrument_verification_events_clientReferenceHash_idx" ON "instrument_verification_events"("clientReferenceHash");
CREATE INDEX "instrument_delivery_audit_events_officialInstrumentId_idx" ON "instrument_delivery_audit_events"("officialInstrumentId");
CREATE INDEX "instrument_delivery_audit_events_instrumentDeliveryId_idx" ON "instrument_delivery_audit_events"("instrumentDeliveryId");
CREATE INDEX "instrument_delivery_audit_events_eventType_idx" ON "instrument_delivery_audit_events"("eventType");
CREATE INDEX "instrument_delivery_audit_events_recordedAt_idx" ON "instrument_delivery_audit_events"("recordedAt");
CREATE INDEX "instrument_download_events_officialInstrumentId_idx" ON "instrument_download_events"("officialInstrumentId");
CREATE INDEX "instrument_download_events_instrumentVersionId_idx" ON "instrument_download_events"("instrumentVersionId");
CREATE INDEX "instrument_download_events_actorIdentityId_idx" ON "instrument_download_events"("actorIdentityId");
CREATE INDEX "instrument_download_events_downloadedAt_idx" ON "instrument_download_events"("downloadedAt");

ALTER TABLE "instrument_deliveries" ADD CONSTRAINT "instrument_deliveries_officialInstrumentId_fkey" FOREIGN KEY ("officialInstrumentId") REFERENCES "official_instruments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "instrument_deliveries" ADD CONSTRAINT "instrument_deliveries_instrumentVersionId_fkey" FOREIGN KEY ("instrumentVersionId") REFERENCES "official_instrument_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "instrument_deliveries" ADD CONSTRAINT "instrument_deliveries_recipientIdentityId_fkey" FOREIGN KEY ("recipientIdentityId") REFERENCES "identities"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "instrument_deliveries" ADD CONSTRAINT "instrument_deliveries_recipientOrganizationId_fkey" FOREIGN KEY ("recipientOrganizationId") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "instrument_delivery_attempts" ADD CONSTRAINT "instrument_delivery_attempts_instrumentDeliveryId_fkey" FOREIGN KEY ("instrumentDeliveryId") REFERENCES "instrument_deliveries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "instrument_receipt_acknowledgments" ADD CONSTRAINT "instrument_receipt_acknowledgments_officialInstrumentId_fkey" FOREIGN KEY ("officialInstrumentId") REFERENCES "official_instruments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "instrument_receipt_acknowledgments" ADD CONSTRAINT "instrument_receipt_acknowledgments_instrumentVersionId_fkey" FOREIGN KEY ("instrumentVersionId") REFERENCES "official_instrument_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "instrument_receipt_acknowledgments" ADD CONSTRAINT "instrument_receipt_acknowledgments_recipientIdentityId_fkey" FOREIGN KEY ("recipientIdentityId") REFERENCES "identities"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "instrument_receipt_acknowledgments" ADD CONSTRAINT "instrument_receipt_acknowledgments_recipientOrganizationId_fkey" FOREIGN KEY ("recipientOrganizationId") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "instrument_receipt_acknowledgments" ADD CONSTRAINT "instrument_receipt_acknowledgments_instrumentDeliveryId_fkey" FOREIGN KEY ("instrumentDeliveryId") REFERENCES "instrument_deliveries"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "instrument_receipt_acknowledgments" ADD CONSTRAINT "instrument_receipt_acknowledgments_instrumentDeliveryAttemptId_fkey" FOREIGN KEY ("instrumentDeliveryAttemptId") REFERENCES "instrument_delivery_attempts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "instrument_verification_records" ADD CONSTRAINT "instrument_verification_records_officialInstrumentId_fkey" FOREIGN KEY ("officialInstrumentId") REFERENCES "official_instruments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "instrument_verification_records" ADD CONSTRAINT "instrument_verification_records_instrumentVersionId_fkey" FOREIGN KEY ("instrumentVersionId") REFERENCES "official_instrument_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "instrument_verification_events" ADD CONSTRAINT "instrument_verification_events_verificationRecordId_fkey" FOREIGN KEY ("verificationRecordId") REFERENCES "instrument_verification_records"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "instrument_verification_events" ADD CONSTRAINT "instrument_verification_events_actorIdentityId_fkey" FOREIGN KEY ("actorIdentityId") REFERENCES "identities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "instrument_delivery_audit_events" ADD CONSTRAINT "instrument_delivery_audit_events_officialInstrumentId_fkey" FOREIGN KEY ("officialInstrumentId") REFERENCES "official_instruments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "instrument_delivery_audit_events" ADD CONSTRAINT "instrument_delivery_audit_events_instrumentVersionId_fkey" FOREIGN KEY ("instrumentVersionId") REFERENCES "official_instrument_versions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "instrument_delivery_audit_events" ADD CONSTRAINT "instrument_delivery_audit_events_instrumentDeliveryId_fkey" FOREIGN KEY ("instrumentDeliveryId") REFERENCES "instrument_deliveries"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "instrument_delivery_audit_events" ADD CONSTRAINT "instrument_delivery_audit_events_actorIdentityId_fkey" FOREIGN KEY ("actorIdentityId") REFERENCES "identities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "instrument_download_events" ADD CONSTRAINT "instrument_download_events_officialInstrumentId_fkey" FOREIGN KEY ("officialInstrumentId") REFERENCES "official_instruments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "instrument_download_events" ADD CONSTRAINT "instrument_download_events_instrumentVersionId_fkey" FOREIGN KEY ("instrumentVersionId") REFERENCES "official_instrument_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "instrument_download_events" ADD CONSTRAINT "instrument_download_events_actorIdentityId_fkey" FOREIGN KEY ("actorIdentityId") REFERENCES "identities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
