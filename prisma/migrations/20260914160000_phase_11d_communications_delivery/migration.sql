-- Phase 11D: Notification, communication and delivery engine

CREATE TYPE "CommunicationChannel" AS ENUM (
  'PORTAL',
  'EMAIL',
  'SMS',
  'PUSH',
  'SECURE_MESSAGE',
  'GOVERNMENT_INTERFACE',
  'PARTNER_INTERFACE',
  'POSTAL_REFERENCE',
  'IN_PERSON_REFERENCE',
  'OTHER_APPROVED_CHANNEL'
);

CREATE TYPE "CommunicationDeliveryStatus" AS ENUM (
  'PREPARED',
  'QUEUED',
  'SENT',
  'DELIVERED',
  'FAILED',
  'BOUNCED',
  'REJECTED',
  'EXPIRED',
  'CANCELLED'
);

CREATE TYPE "CommunicationDeliveryEffect" AS ENUM (
  'INFORMATIONAL_ONLY',
  'EFFECTIVE_ON_ISSUE',
  'EFFECTIVE_ON_SEND',
  'EFFECTIVE_ON_DELIVERY',
  'EFFECTIVE_ON_RECEIPT',
  'EFFECTIVE_BY_SEPARATE_RULE'
);

CREATE TYPE "CommunicationTemplateVersionStatus" AS ENUM (
  'DRAFT',
  'ACTIVE',
  'SUPERSEDED',
  'RETIRED'
);

CREATE TYPE "CommunicationTemplateFieldSource" AS ENUM (
  'VERIFIED_DATA',
  'COMPUTED_DATA',
  'HUMAN_ENTERED_TEXT'
);

CREATE TYPE "CommunicationMessageStatus" AS ENUM (
  'DRAFT',
  'PENDING_APPROVAL',
  'APPROVED',
  'QUEUED_FOR_DELIVERY',
  'PARTIALLY_DELIVERED',
  'DELIVERED',
  'FAILED',
  'CANCELLED'
);

CREATE TYPE "CommunicationClassification" AS ENUM (
  'PUBLIC',
  'OFFICIAL',
  'RESTRICTED',
  'SECRET'
);

CREATE TYPE "CommunicationMandatoryCategory" AS ENUM (
  'REQUIRED_DECISION_NOTICE',
  'APPEAL_NOTICE',
  'INSPECTION_NOTICE',
  'SECURITY_NOTIFICATION',
  'PRIVACY_NOTIFICATION',
  'OTHER_MANDATORY'
);

CREATE TYPE "CommunicationPreferenceScope" AS ENUM (
  'MARKETING',
  'INFORMATIONAL',
  'CHANNEL'
);

CREATE TYPE "TranslationReviewStatus" AS ENUM (
  'DRAFT',
  'PENDING_REVIEW',
  'REVIEWED',
  'CERTIFIED',
  'REJECTED'
);

CREATE TYPE "TranslationMethod" AS ENUM (
  'HUMAN_PROFESSIONAL',
  'HUMAN_OFFICIAL',
  'AI_ASSISTED',
  'MACHINE'
);

CREATE TYPE "AccessibilityAccommodationType" AS ENUM (
  'ALTERNATE_FORMAT',
  'SCREEN_READER_COMPATIBLE',
  'LARGE_PRINT',
  'LANGUAGE_SUPPORT',
  'ASSISTED_SERVICE',
  'OTHER_CONFIGURED'
);

CREATE TYPE "CommunicationFailureRetryState" AS ENUM (
  'NOT_RETRYABLE',
  'PENDING_RETRY',
  'RETRYING',
  'RETRY_EXHAUSTED',
  'RESOLVED'
);

CREATE TYPE "CommunicationReceiptMethod" AS ENUM (
  'EXPLICIT_ACKNOWLEDGMENT',
  'PORTAL_CONFIRMATION',
  'SECURE_MESSAGE_READ',
  'IN_PERSON_SIGNATURE',
  'POSTAL_CONFIRMATION',
  'OTHER'
);

CREATE TYPE "CommunicationRecipientRole" AS ENUM (
  'PRIMARY',
  'COPY',
  'REPRESENTATIVE',
  'INSTITUTIONAL',
  'OTHER'
);

CREATE TYPE "CommunicationServiceCapacity" AS ENUM (
  'PERSONAL',
  'ORGANIZATIONAL',
  'REPRESENTATIVE',
  'INSTITUTIONAL'
);

CREATE TYPE "CommunicationProviderType" AS ENUM (
  'EMAIL',
  'SMS',
  'PUSH',
  'PORTAL',
  'SECURE_MESSAGE',
  'OTHER'
);

CREATE TYPE "CommunicationAiDraftStatus" AS ENUM (
  'DRAFT',
  'PENDING_HUMAN_APPROVAL',
  'APPROVED',
  'REJECTED'
);

CREATE TABLE "communication_templates" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "communicationType" TEXT NOT NULL,
    "defaultClassification" "CommunicationClassification" NOT NULL DEFAULT 'OFFICIAL',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "communication_templates_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "communication_template_versions" (
    "id" UUID NOT NULL,
    "templateId" UUID NOT NULL,
    "versionNumber" INTEGER NOT NULL,
    "status" "CommunicationTemplateVersionStatus" NOT NULL DEFAULT 'DRAFT',
    "subjectTemplate" TEXT NOT NULL,
    "bodyTemplate" TEXT NOT NULL,
    "fieldDefinitions" JSONB NOT NULL,
    "allowedChannels" "CommunicationChannel"[],
    "deliveryEffect" "CommunicationDeliveryEffect" NOT NULL DEFAULT 'INFORMATIONAL_ONLY',
    "requiresApproval" BOOLEAN NOT NULL DEFAULT true,
    "certifiedTranslationRequired" BOOLEAN NOT NULL DEFAULT false,
    "activatedAt" TIMESTAMP(3),
    "activatedByIdentityId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "communication_template_versions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "communication_messages" (
    "id" UUID NOT NULL,
    "messageNumber" TEXT NOT NULL,
    "communicationType" TEXT NOT NULL,
    "sourceRecordType" TEXT NOT NULL,
    "sourceRecordId" UUID NOT NULL,
    "caseId" UUID,
    "masterAdministrativeFileId" UUID NOT NULL,
    "templateVersionId" UUID,
    "subject" TEXT NOT NULL,
    "classification" "CommunicationClassification" NOT NULL,
    "senderInstitutionId" UUID NOT NULL,
    "preparedByIdentityId" UUID NOT NULL,
    "approvedByIdentityId" UUID,
    "status" "CommunicationMessageStatus" NOT NULL DEFAULT 'DRAFT',
    "aiDraftStatus" "CommunicationAiDraftStatus",
    "isOfficial" BOOLEAN NOT NULL DEFAULT false,
    "canonicalNoticeReference" TEXT,
    "verifiedDataSnapshot" JSONB,
    "computedDataSnapshot" JSONB,
    "humanEnteredText" JSONB,
    "mandatoryCategory" "CommunicationMandatoryCategory",
    "deliveryEffect" "CommunicationDeliveryEffect" NOT NULL DEFAULT 'INFORMATIONAL_ONLY',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "communication_messages_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "communication_recipients" (
    "id" UUID NOT NULL,
    "messageId" UUID NOT NULL,
    "recipientIdentityId" UUID,
    "recipientOrganizationId" UUID,
    "recipientRole" "CommunicationRecipientRole" NOT NULL DEFAULT 'PRIMARY',
    "channelReference" TEXT,
    "preferredLanguage" TEXT NOT NULL DEFAULT 'en',
    "accessibilityRequirements" JSONB,
    "legalServiceCapacity" "CommunicationServiceCapacity" NOT NULL,
    "representativeAuthorityId" UUID,
    "representativeRelationship" TEXT,
    "blocked" BOOLEAN NOT NULL DEFAULT false,
    "blockReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "communication_recipients_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "communication_deliveries" (
    "id" UUID NOT NULL,
    "messageId" UUID NOT NULL,
    "recipientId" UUID NOT NULL,
    "channel" "CommunicationChannel" NOT NULL,
    "provider" "CommunicationProviderType" NOT NULL,
    "destinationReference" TEXT,
    "requiredOrOptional" BOOLEAN NOT NULL DEFAULT true,
    "preparedAt" TIMESTAMP(3),
    "sentAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "failedAt" TIMESTAMP(3),
    "status" "CommunicationDeliveryStatus" NOT NULL DEFAULT 'PREPARED',
    "providerReference" TEXT,
    "idempotencyKey" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "communication_deliveries_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "communication_delivery_attempts" (
    "id" UUID NOT NULL,
    "deliveryId" UUID NOT NULL,
    "attemptNumber" INTEGER NOT NULL,
    "channel" "CommunicationChannel" NOT NULL,
    "provider" "CommunicationProviderType" NOT NULL,
    "destinationReference" TEXT,
    "status" "CommunicationDeliveryStatus" NOT NULL DEFAULT 'QUEUED',
    "providerReference" TEXT,
    "callbackIdempotencyKey" TEXT,
    "queuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sentAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "failedAt" TIMESTAMP(3),
    "failureReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "communication_delivery_attempts_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "communication_receipts" (
    "id" UUID NOT NULL,
    "deliveryId" UUID NOT NULL,
    "attemptId" UUID,
    "recipientId" UUID NOT NULL,
    "receivedAt" TIMESTAMP(3) NOT NULL,
    "method" "CommunicationReceiptMethod" NOT NULL,
    "identityAssuranceLevel" TEXT,
    "isLegalReceipt" BOOLEAN NOT NULL DEFAULT false,
    "emailOpenPixel" BOOLEAN NOT NULL DEFAULT false,
    "sourceDeliveryId" UUID NOT NULL,
    "callbackIdempotencyKey" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "communication_receipts_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "communication_preferences" (
    "id" UUID NOT NULL,
    "identityId" UUID NOT NULL,
    "scope" "CommunicationPreferenceScope" NOT NULL,
    "channel" "CommunicationChannel",
    "mandatoryCategory" "CommunicationMandatoryCategory",
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "language" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "communication_preferences_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "mandatory_communication_rules" (
    "id" UUID NOT NULL,
    "templateId" UUID,
    "mandatoryCategory" "CommunicationMandatoryCategory" NOT NULL,
    "communicationType" TEXT,
    "suppressible" BOOLEAN NOT NULL DEFAULT false,
    "description" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "mandatory_communication_rules_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "translation_records" (
    "id" UUID NOT NULL,
    "messageId" UUID NOT NULL,
    "sourceTemplateVersionId" UUID,
    "targetLanguage" TEXT NOT NULL,
    "translationMethod" "TranslationMethod" NOT NULL,
    "translatorReference" TEXT,
    "translatedSubject" TEXT NOT NULL,
    "translatedContent" TEXT NOT NULL,
    "reviewStatus" "TranslationReviewStatus" NOT NULL DEFAULT 'DRAFT',
    "limitations" TEXT,
    "aiAssisted" BOOLEAN NOT NULL DEFAULT false,
    "certifiedRequired" BOOLEAN NOT NULL DEFAULT false,
    "cannotSubstituteAiForCertified" BOOLEAN NOT NULL DEFAULT true,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "translation_records_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "accessibility_accommodations" (
    "id" UUID NOT NULL,
    "messageId" UUID NOT NULL,
    "recipientId" UUID,
    "accommodationType" "AccessibilityAccommodationType" NOT NULL,
    "description" TEXT,
    "configuredSupport" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "accessibility_accommodations_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "communication_failure_records" (
    "id" UUID NOT NULL,
    "deliveryId" UUID NOT NULL,
    "failureReason" TEXT NOT NULL,
    "retryState" "CommunicationFailureRetryState" NOT NULL DEFAULT 'PENDING_RETRY',
    "alternateChannel" "CommunicationChannel",
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

CREATE UNIQUE INDEX "communication_templates_code_key" ON "communication_templates"("code");

CREATE UNIQUE INDEX "communication_template_versions_templateId_versionNumber_key" ON "communication_template_versions"("templateId", "versionNumber");
CREATE INDEX "communication_template_versions_templateId_idx" ON "communication_template_versions"("templateId");
CREATE INDEX "communication_template_versions_status_idx" ON "communication_template_versions"("status");

CREATE UNIQUE INDEX "communication_messages_messageNumber_key" ON "communication_messages"("messageNumber");
CREATE INDEX "communication_messages_sourceRecordType_sourceRecordId_idx" ON "communication_messages"("sourceRecordType", "sourceRecordId");
CREATE INDEX "communication_messages_caseId_idx" ON "communication_messages"("caseId");
CREATE INDEX "communication_messages_masterAdministrativeFileId_idx" ON "communication_messages"("masterAdministrativeFileId");
CREATE INDEX "communication_messages_templateVersionId_idx" ON "communication_messages"("templateVersionId");
CREATE INDEX "communication_messages_senderInstitutionId_idx" ON "communication_messages"("senderInstitutionId");
CREATE INDEX "communication_messages_status_idx" ON "communication_messages"("status");

CREATE INDEX "communication_recipients_messageId_idx" ON "communication_recipients"("messageId");
CREATE INDEX "communication_recipients_recipientIdentityId_idx" ON "communication_recipients"("recipientIdentityId");
CREATE INDEX "communication_recipients_recipientOrganizationId_idx" ON "communication_recipients"("recipientOrganizationId");
CREATE INDEX "communication_recipients_representativeAuthorityId_idx" ON "communication_recipients"("representativeAuthorityId");

CREATE UNIQUE INDEX "communication_deliveries_idempotencyKey_key" ON "communication_deliveries"("idempotencyKey");
CREATE INDEX "communication_deliveries_messageId_idx" ON "communication_deliveries"("messageId");
CREATE INDEX "communication_deliveries_recipientId_idx" ON "communication_deliveries"("recipientId");
CREATE INDEX "communication_deliveries_status_idx" ON "communication_deliveries"("status");

CREATE UNIQUE INDEX "communication_delivery_attempts_deliveryId_attemptNumber_key" ON "communication_delivery_attempts"("deliveryId", "attemptNumber");
CREATE UNIQUE INDEX "communication_delivery_attempts_callbackIdempotencyKey_key" ON "communication_delivery_attempts"("callbackIdempotencyKey");
CREATE INDEX "communication_delivery_attempts_deliveryId_idx" ON "communication_delivery_attempts"("deliveryId");
CREATE INDEX "communication_delivery_attempts_status_idx" ON "communication_delivery_attempts"("status");

CREATE UNIQUE INDEX "communication_receipts_callbackIdempotencyKey_key" ON "communication_receipts"("callbackIdempotencyKey");
CREATE INDEX "communication_receipts_deliveryId_idx" ON "communication_receipts"("deliveryId");
CREATE INDEX "communication_receipts_recipientId_idx" ON "communication_receipts"("recipientId");
CREATE INDEX "communication_receipts_attemptId_idx" ON "communication_receipts"("attemptId");

CREATE UNIQUE INDEX "communication_preferences_identityId_scope_channel_key" ON "communication_preferences"("identityId", "scope", "channel");
CREATE INDEX "communication_preferences_identityId_idx" ON "communication_preferences"("identityId");

CREATE INDEX "mandatory_communication_rules_mandatoryCategory_idx" ON "mandatory_communication_rules"("mandatoryCategory");
CREATE INDEX "mandatory_communication_rules_templateId_idx" ON "mandatory_communication_rules"("templateId");

CREATE INDEX "translation_records_messageId_idx" ON "translation_records"("messageId");
CREATE INDEX "translation_records_targetLanguage_idx" ON "translation_records"("targetLanguage");

CREATE INDEX "accessibility_accommodations_messageId_idx" ON "accessibility_accommodations"("messageId");
CREATE INDEX "accessibility_accommodations_recipientId_idx" ON "accessibility_accommodations"("recipientId");

CREATE INDEX "communication_failure_records_deliveryId_idx" ON "communication_failure_records"("deliveryId");
CREATE INDEX "communication_failure_records_retryState_idx" ON "communication_failure_records"("retryState");

CREATE UNIQUE INDEX "communication_maf_index_entries_masterAdministrativeFileId_messageId_deliveredVersionReference_key" ON "communication_maf_index_entries"("masterAdministrativeFileId", "messageId", "deliveredVersionReference");
CREATE INDEX "communication_maf_index_entries_messageId_idx" ON "communication_maf_index_entries"("messageId");
CREATE INDEX "communication_maf_index_entries_templateVersionId_idx" ON "communication_maf_index_entries"("templateVersionId");

ALTER TABLE "communication_template_versions" ADD CONSTRAINT "communication_template_versions_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "communication_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "communication_template_versions" ADD CONSTRAINT "communication_template_versions_activatedByIdentityId_fkey" FOREIGN KEY ("activatedByIdentityId") REFERENCES "identities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "communication_messages" ADD CONSTRAINT "communication_messages_templateVersionId_fkey" FOREIGN KEY ("templateVersionId") REFERENCES "communication_template_versions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "communication_messages" ADD CONSTRAINT "communication_messages_senderInstitutionId_fkey" FOREIGN KEY ("senderInstitutionId") REFERENCES "institutions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "communication_messages" ADD CONSTRAINT "communication_messages_preparedByIdentityId_fkey" FOREIGN KEY ("preparedByIdentityId") REFERENCES "identities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "communication_messages" ADD CONSTRAINT "communication_messages_approvedByIdentityId_fkey" FOREIGN KEY ("approvedByIdentityId") REFERENCES "identities"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "communication_messages" ADD CONSTRAINT "communication_messages_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "cases"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "communication_messages" ADD CONSTRAINT "communication_messages_masterAdministrativeFileId_fkey" FOREIGN KEY ("masterAdministrativeFileId") REFERENCES "master_administrative_files"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "communication_recipients" ADD CONSTRAINT "communication_recipients_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "communication_messages"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "communication_recipients" ADD CONSTRAINT "communication_recipients_recipientIdentityId_fkey" FOREIGN KEY ("recipientIdentityId") REFERENCES "identities"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "communication_recipients" ADD CONSTRAINT "communication_recipients_recipientOrganizationId_fkey" FOREIGN KEY ("recipientOrganizationId") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "communication_recipients" ADD CONSTRAINT "communication_recipients_representativeAuthorityId_fkey" FOREIGN KEY ("representativeAuthorityId") REFERENCES "representative_authorities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "communication_deliveries" ADD CONSTRAINT "communication_deliveries_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "communication_messages"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "communication_deliveries" ADD CONSTRAINT "communication_deliveries_recipientId_fkey" FOREIGN KEY ("recipientId") REFERENCES "communication_recipients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "communication_delivery_attempts" ADD CONSTRAINT "communication_delivery_attempts_deliveryId_fkey" FOREIGN KEY ("deliveryId") REFERENCES "communication_deliveries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "communication_receipts" ADD CONSTRAINT "communication_receipts_deliveryId_fkey" FOREIGN KEY ("deliveryId") REFERENCES "communication_deliveries"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "communication_receipts" ADD CONSTRAINT "communication_receipts_attemptId_fkey" FOREIGN KEY ("attemptId") REFERENCES "communication_delivery_attempts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "communication_receipts" ADD CONSTRAINT "communication_receipts_recipientId_fkey" FOREIGN KEY ("recipientId") REFERENCES "communication_recipients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "communication_preferences" ADD CONSTRAINT "communication_preferences_identityId_fkey" FOREIGN KEY ("identityId") REFERENCES "identities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "mandatory_communication_rules" ADD CONSTRAINT "mandatory_communication_rules_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "communication_templates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "translation_records" ADD CONSTRAINT "translation_records_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "communication_messages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "accessibility_accommodations" ADD CONSTRAINT "accessibility_accommodations_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "communication_messages"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "accessibility_accommodations" ADD CONSTRAINT "accessibility_accommodations_recipientId_fkey" FOREIGN KEY ("recipientId") REFERENCES "communication_recipients"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "communication_failure_records" ADD CONSTRAINT "communication_failure_records_deliveryId_fkey" FOREIGN KEY ("deliveryId") REFERENCES "communication_deliveries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "communication_maf_index_entries" ADD CONSTRAINT "communication_maf_index_entries_masterAdministrativeFileId_fkey" FOREIGN KEY ("masterAdministrativeFileId") REFERENCES "master_administrative_files"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "communication_maf_index_entries" ADD CONSTRAINT "communication_maf_index_entries_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "communication_messages"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "communication_maf_index_entries" ADD CONSTRAINT "communication_maf_index_entries_templateVersionId_fkey" FOREIGN KEY ("templateVersionId") REFERENCES "communication_template_versions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
