-- Phase 11F: Governed Integration Gateway and Data Exchange

CREATE TYPE "IntegrationLifecycleStatus" AS ENUM ('DRAFT', 'PENDING_ACCEPTANCE', 'ACTIVE', 'INACTIVE', 'SUSPENDED', 'ARCHIVED');
CREATE TYPE "IntegrationOperation" AS ENUM ('QUERY', 'SUBMIT', 'UPDATE', 'SEND_EVENT', 'RECEIVE_EVENT', 'HEALTH_CHECK');
CREATE TYPE "IntegrationExchangeDirection" AS ENUM ('OUTBOUND', 'INBOUND');
CREATE TYPE "IntegrationExchangeStatus" AS ENUM ('PREPARED', 'SENT', 'ACKNOWLEDGED', 'RESPONSE_RECEIVED', 'VALIDATED', 'RECONCILIATION_REQUIRED', 'FAILED', 'TIMED_OUT', 'RETRY_PENDING', 'SAFE_HALTED', 'CANCELLED');
CREATE TYPE "IntegrationMessageDirection" AS ENUM ('OUTBOUND', 'INBOUND');
CREATE TYPE "IntegrationDeliveryAttemptOutcome" AS ENUM ('SUCCESS', 'FAILURE', 'TIMEOUT', 'RETRY_SCHEDULED');
CREATE TYPE "IntegrationSignatureValidationResult" AS ENUM ('VALID', 'INVALID', 'MISSING', 'NOT_APPLICABLE');
CREATE TYPE "IntegrationWebhookProcessingStatus" AS ENUM ('PENDING', 'PROCESSING', 'PROCESSED', 'REJECTED_INVALID_SIGNATURE', 'REJECTED_REPLAY', 'REJECTED_DUPLICATE', 'REJECTED_UNEXPECTED_TYPE', 'REJECTED_INVALID_SCHEMA', 'REJECTED_EXPIRED_TIMESTAMP', 'SAFE_HALTED');
CREATE TYPE "IntegrationValidationOverallStatus" AS ENUM ('PENDING', 'PASSED', 'FAILED', 'PARTIAL');
CREATE TYPE "IntegrationDataClassification" AS ENUM ('UNCLASSIFIED', 'OFFICIAL', 'OFFICIAL_SENSITIVE', 'PROTECTED', 'SECRET');

CREATE TABLE "integrations" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "institutionId" UUID,
    "externalAuthorityId" UUID,
    "status" "IntegrationLifecycleStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "integrations_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "integration_versions" (
    "id" UUID NOT NULL,
    "integrationId" UUID NOT NULL,
    "version" TEXT NOT NULL,
    "status" "IntegrationLifecycleStatus" NOT NULL DEFAULT 'DRAFT',
    "adapterType" TEXT NOT NULL,
    "acceptedAt" TIMESTAMP(3),
    "acceptedByIdentityId" UUID,
    "serviceIdentityId" UUID NOT NULL,
    "requestSchemaVersion" TEXT NOT NULL,
    "permittedOperations" JSONB NOT NULL,
    "permittedPurposes" JSONB NOT NULL,
    "permittedFields" JSONB NOT NULL,
    "dataClassificationCeiling" "IntegrationDataClassification" NOT NULL DEFAULT 'OFFICIAL',
    "capabilityDeclarations" JSONB NOT NULL,
    "schemaDefinition" JSONB,
    "failurePolicy" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "integration_versions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "integration_credentials" (
    "id" UUID NOT NULL,
    "integrationVersionId" UUID NOT NULL,
    "identityId" UUID NOT NULL,
    "credentialReference" TEXT NOT NULL,
    "status" "CredentialStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "integration_credentials_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "integration_requests" (
    "id" UUID NOT NULL,
    "integrationVersionId" UUID NOT NULL,
    "operation" "IntegrationOperation" NOT NULL,
    "initiatingIdentityId" UUID NOT NULL,
    "serviceIdentityId" UUID,
    "institutionalPurpose" TEXT NOT NULL,
    "caseId" UUID,
    "applicationId" UUID,
    "recordReference" TEXT,
    "permittedFields" JSONB NOT NULL,
    "requestSchemaVersion" TEXT NOT NULL,
    "correlationId" TEXT NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "payloadHash" TEXT NOT NULL,
    "payloadMinimized" JSONB NOT NULL,
    "dataClassification" "IntegrationDataClassification" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "integration_requests_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "integration_exchanges" (
    "id" UUID NOT NULL,
    "direction" "IntegrationExchangeDirection" NOT NULL,
    "integrationVersionId" UUID NOT NULL,
    "requestId" UUID,
    "externalSystem" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "status" "IntegrationExchangeStatus" NOT NULL DEFAULT 'PREPARED',
    "correlationId" TEXT NOT NULL,
    "requestHash" TEXT NOT NULL,
    "responseHash" TEXT,
    "dataClassification" "IntegrationDataClassification" NOT NULL,
    "recordsReference" TEXT,
    "documentRecordId" UUID,

    CONSTRAINT "integration_exchanges_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "integration_messages" (
    "id" UUID NOT NULL,
    "exchangeId" UUID NOT NULL,
    "direction" "IntegrationMessageDirection" NOT NULL,
    "messageType" TEXT NOT NULL,
    "contentHash" TEXT NOT NULL,
    "structuredSummary" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "integration_messages_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "integration_delivery_attempts" (
    "id" UUID NOT NULL,
    "exchangeId" UUID NOT NULL,
    "attemptNumber" INTEGER NOT NULL,
    "outcome" "IntegrationDeliveryAttemptOutcome" NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "outcomeCode" TEXT,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "integration_delivery_attempts_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "integration_response_records" (
    "id" UUID NOT NULL,
    "exchangeId" UUID NOT NULL,
    "sourceVerified" BOOLEAN NOT NULL DEFAULT false,
    "endpointVerified" BOOLEAN NOT NULL DEFAULT false,
    "signatureResult" "IntegrationSignatureValidationResult" NOT NULL DEFAULT 'NOT_APPLICABLE',
    "schemaValid" BOOLEAN NOT NULL DEFAULT false,
    "versionValid" BOOLEAN NOT NULL DEFAULT false,
    "httpStatusCode" INTEGER,
    "responseHash" TEXT NOT NULL,
    "structuredSummary" JSONB NOT NULL,
    "validatedAt" TIMESTAMP(3),
    "isValidated" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "integration_response_records_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "integration_webhook_events" (
    "id" UUID NOT NULL,
    "integrationVersionId" UUID NOT NULL,
    "externalEventId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "signatureResult" "IntegrationSignatureValidationResult" NOT NULL DEFAULT 'NOT_APPLICABLE',
    "timestampValid" BOOLEAN NOT NULL DEFAULT false,
    "replayValid" BOOLEAN NOT NULL DEFAULT false,
    "payloadHash" TEXT NOT NULL,
    "correlationId" TEXT,
    "processingStatus" "IntegrationWebhookProcessingStatus" NOT NULL DEFAULT 'PENDING',
    "rejectionReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "integration_webhook_events_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "integration_correlation_records" (
    "id" UUID NOT NULL,
    "correlationId" TEXT NOT NULL,
    "exchangeId" UUID,
    "webhookEventId" UUID,
    "requestId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "integration_correlation_records_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "integration_data_transformations" (
    "id" UUID NOT NULL,
    "exchangeId" UUID NOT NULL,
    "sourceSchema" TEXT NOT NULL,
    "destinationSchema" TEXT NOT NULL,
    "mappingVersion" TEXT NOT NULL,
    "transformationVersion" TEXT NOT NULL,
    "inputHash" TEXT NOT NULL,
    "outputHash" TEXT NOT NULL,
    "lossyFields" JSONB NOT NULL,
    "warnings" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "integration_data_transformations_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "integration_validation_results" (
    "id" UUID NOT NULL,
    "exchangeId" UUID,
    "responseRecordId" UUID,
    "webhookEventId" UUID,
    "overallStatus" "IntegrationValidationOverallStatus" NOT NULL DEFAULT 'PENDING',
    "checks" JSONB NOT NULL,
    "failureReasons" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "integration_validation_results_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "integrations_code_key" ON "integrations"("code");
CREATE INDEX "integrations_institutionId_idx" ON "integrations"("institutionId");
CREATE INDEX "integrations_externalAuthorityId_idx" ON "integrations"("externalAuthorityId");
CREATE INDEX "integrations_status_idx" ON "integrations"("status");

CREATE UNIQUE INDEX "integration_versions_integrationId_version_key" ON "integration_versions"("integrationId", "version");
CREATE INDEX "integration_versions_integrationId_idx" ON "integration_versions"("integrationId");
CREATE INDEX "integration_versions_status_idx" ON "integration_versions"("status");
CREATE INDEX "integration_versions_serviceIdentityId_idx" ON "integration_versions"("serviceIdentityId");

CREATE UNIQUE INDEX "integration_credentials_integrationVersionId_key" ON "integration_credentials"("integrationVersionId");
CREATE INDEX "integration_credentials_identityId_idx" ON "integration_credentials"("identityId");
CREATE INDEX "integration_credentials_status_idx" ON "integration_credentials"("status");

CREATE UNIQUE INDEX "integration_requests_integrationVersionId_idempotencyKey_key" ON "integration_requests"("integrationVersionId", "idempotencyKey");
CREATE INDEX "integration_requests_integrationVersionId_idx" ON "integration_requests"("integrationVersionId");
CREATE INDEX "integration_requests_initiatingIdentityId_idx" ON "integration_requests"("initiatingIdentityId");
CREATE INDEX "integration_requests_correlationId_idx" ON "integration_requests"("correlationId");
CREATE INDEX "integration_requests_caseId_idx" ON "integration_requests"("caseId");
CREATE INDEX "integration_requests_applicationId_idx" ON "integration_requests"("applicationId");

CREATE INDEX "integration_exchanges_integrationVersionId_idx" ON "integration_exchanges"("integrationVersionId");
CREATE INDEX "integration_exchanges_requestId_idx" ON "integration_exchanges"("requestId");
CREATE INDEX "integration_exchanges_correlationId_idx" ON "integration_exchanges"("correlationId");
CREATE INDEX "integration_exchanges_status_idx" ON "integration_exchanges"("status");
CREATE INDEX "integration_exchanges_documentRecordId_idx" ON "integration_exchanges"("documentRecordId");

CREATE INDEX "integration_messages_exchangeId_idx" ON "integration_messages"("exchangeId");
CREATE INDEX "integration_messages_contentHash_idx" ON "integration_messages"("contentHash");

CREATE UNIQUE INDEX "integration_delivery_attempts_exchangeId_attemptNumber_key" ON "integration_delivery_attempts"("exchangeId", "attemptNumber");
CREATE INDEX "integration_delivery_attempts_exchangeId_idx" ON "integration_delivery_attempts"("exchangeId");

CREATE INDEX "integration_response_records_exchangeId_idx" ON "integration_response_records"("exchangeId");
CREATE INDEX "integration_response_records_responseHash_idx" ON "integration_response_records"("responseHash");

CREATE UNIQUE INDEX "integration_webhook_events_integrationVersionId_externalEventId_key" ON "integration_webhook_events"("integrationVersionId", "externalEventId");
CREATE INDEX "integration_webhook_events_integrationVersionId_idx" ON "integration_webhook_events"("integrationVersionId");
CREATE INDEX "integration_webhook_events_eventType_idx" ON "integration_webhook_events"("eventType");
CREATE INDEX "integration_webhook_events_correlationId_idx" ON "integration_webhook_events"("correlationId");
CREATE INDEX "integration_webhook_events_processingStatus_idx" ON "integration_webhook_events"("processingStatus");

CREATE INDEX "integration_correlation_records_correlationId_idx" ON "integration_correlation_records"("correlationId");
CREATE INDEX "integration_correlation_records_exchangeId_idx" ON "integration_correlation_records"("exchangeId");
CREATE INDEX "integration_correlation_records_webhookEventId_idx" ON "integration_correlation_records"("webhookEventId");
CREATE INDEX "integration_correlation_records_requestId_idx" ON "integration_correlation_records"("requestId");

CREATE INDEX "integration_data_transformations_exchangeId_idx" ON "integration_data_transformations"("exchangeId");
CREATE INDEX "integration_data_transformations_inputHash_idx" ON "integration_data_transformations"("inputHash");
CREATE INDEX "integration_data_transformations_outputHash_idx" ON "integration_data_transformations"("outputHash");

CREATE UNIQUE INDEX "integration_validation_results_responseRecordId_key" ON "integration_validation_results"("responseRecordId");
CREATE INDEX "integration_validation_results_exchangeId_idx" ON "integration_validation_results"("exchangeId");
CREATE INDEX "integration_validation_results_webhookEventId_idx" ON "integration_validation_results"("webhookEventId");
CREATE INDEX "integration_validation_results_overallStatus_idx" ON "integration_validation_results"("overallStatus");

ALTER TABLE "integrations" ADD CONSTRAINT "integrations_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "institutions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "integrations" ADD CONSTRAINT "integrations_externalAuthorityId_fkey" FOREIGN KEY ("externalAuthorityId") REFERENCES "external_authorities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "integration_versions" ADD CONSTRAINT "integration_versions_integrationId_fkey" FOREIGN KEY ("integrationId") REFERENCES "integrations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "integration_versions" ADD CONSTRAINT "integration_versions_acceptedByIdentityId_fkey" FOREIGN KEY ("acceptedByIdentityId") REFERENCES "identities"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "integration_versions" ADD CONSTRAINT "integration_versions_serviceIdentityId_fkey" FOREIGN KEY ("serviceIdentityId") REFERENCES "identities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "integration_credentials" ADD CONSTRAINT "integration_credentials_integrationVersionId_fkey" FOREIGN KEY ("integrationVersionId") REFERENCES "integration_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "integration_credentials" ADD CONSTRAINT "integration_credentials_identityId_fkey" FOREIGN KEY ("identityId") REFERENCES "identities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "integration_requests" ADD CONSTRAINT "integration_requests_integrationVersionId_fkey" FOREIGN KEY ("integrationVersionId") REFERENCES "integration_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "integration_requests" ADD CONSTRAINT "integration_requests_initiatingIdentityId_fkey" FOREIGN KEY ("initiatingIdentityId") REFERENCES "identities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "integration_requests" ADD CONSTRAINT "integration_requests_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "cases"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "integration_requests" ADD CONSTRAINT "integration_requests_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "applications"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "integration_exchanges" ADD CONSTRAINT "integration_exchanges_integrationVersionId_fkey" FOREIGN KEY ("integrationVersionId") REFERENCES "integration_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "integration_exchanges" ADD CONSTRAINT "integration_exchanges_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "integration_requests"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "integration_exchanges" ADD CONSTRAINT "integration_exchanges_documentRecordId_fkey" FOREIGN KEY ("documentRecordId") REFERENCES "document_records"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "integration_messages" ADD CONSTRAINT "integration_messages_exchangeId_fkey" FOREIGN KEY ("exchangeId") REFERENCES "integration_exchanges"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "integration_delivery_attempts" ADD CONSTRAINT "integration_delivery_attempts_exchangeId_fkey" FOREIGN KEY ("exchangeId") REFERENCES "integration_exchanges"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "integration_response_records" ADD CONSTRAINT "integration_response_records_exchangeId_fkey" FOREIGN KEY ("exchangeId") REFERENCES "integration_exchanges"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "integration_webhook_events" ADD CONSTRAINT "integration_webhook_events_integrationVersionId_fkey" FOREIGN KEY ("integrationVersionId") REFERENCES "integration_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "integration_correlation_records" ADD CONSTRAINT "integration_correlation_records_exchangeId_fkey" FOREIGN KEY ("exchangeId") REFERENCES "integration_exchanges"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "integration_correlation_records" ADD CONSTRAINT "integration_correlation_records_webhookEventId_fkey" FOREIGN KEY ("webhookEventId") REFERENCES "integration_webhook_events"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "integration_correlation_records" ADD CONSTRAINT "integration_correlation_records_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "integration_requests"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "integration_data_transformations" ADD CONSTRAINT "integration_data_transformations_exchangeId_fkey" FOREIGN KEY ("exchangeId") REFERENCES "integration_exchanges"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "integration_validation_results" ADD CONSTRAINT "integration_validation_results_exchangeId_fkey" FOREIGN KEY ("exchangeId") REFERENCES "integration_exchanges"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "integration_validation_results" ADD CONSTRAINT "integration_validation_results_responseRecordId_fkey" FOREIGN KEY ("responseRecordId") REFERENCES "integration_response_records"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "integration_validation_results" ADD CONSTRAINT "integration_validation_results_webhookEventId_fkey" FOREIGN KEY ("webhookEventId") REFERENCES "integration_webhook_events"("id") ON DELETE SET NULL ON UPDATE CASCADE;
