#!/usr/bin/env python3
"""Rebuild prisma/schema.prisma from pre-Phase-11 base + canonical Phase 11 models."""

from pathlib import Path

ROOT = Path("/workspace")
BASE = ROOT / "tmp" / "base-schema.prisma"
OUT = ROOT / "prisma" / "schema.prisma"

INSTITUTION_RELATIONS = """
  feeSchedules                         FeeSchedule[]
  paymentProviderConfigurations        PaymentProviderConfiguration[]
  reconciliationBatches                ReconciliationBatch[]
  integrations                         Integration[]
  ownedIntegrationDefinitions          IntegrationDefinition[]         @relation("IntegrationInstitutionalOwner")
  integrationInstitutionOwners         IntegrationInstitutionOwner[]
  communicationMessagesSent            CommunicationMessage[]          @relation("CommunicationMessageSenderInstitution")
  authoritativeSourceDesignations      AuthoritativeSourceDesignation[]
"""

IDENTITY_RELATIONS = """
  feeScheduleVersionsApproved          FeeScheduleVersion[]            @relation("FeeScheduleVersionApprover")
  feeAdjustmentRequestsRequested       FeeAdjustmentRequest[]          @relation("FeeAdjustmentRequestRequester")
  feeAdjustmentDecisionsDecided        FeeAdjustmentDecision[]         @relation("FeeAdjustmentDecisionDecider")
  refundRequestsRequested              RefundRequest[]                 @relation("RefundRequestRequester")
  refundAuthorizationsAuthorized       RefundAuthorization[]           @relation("RefundAuthorizationAuthorizer")
  financialApprovalsApproved           FinancialApprovalRecord[]       @relation("FinancialApprovalApprover")
  communicationTemplateVersionsActivated CommunicationTemplateVersion[] @relation("CommunicationTemplateVersionActivatedBy")
  communicationMessagesPrepared        CommunicationMessage[]          @relation("CommunicationMessagePreparedBy")
  communicationMessagesApproved        CommunicationMessage[]          @relation("CommunicationMessageApprovedBy")
  communicationRecipients              CommunicationRecipient[]        @relation("CommunicationRecipientIdentity")
  communicationPreferences             CommunicationPreference[]
  integrationGatewayVersionsAccepted   IntegrationGatewayVersion[]     @relation("IntegrationGatewayVersionAcceptedBy")
  integrationGatewayVersionsAsService  IntegrationGatewayVersion[]     @relation("IntegrationGatewayVersionServiceIdentity")
  integrationCredentials               IntegrationCredential[]
  integrationRequestsInitiated         IntegrationRequest[]            @relation("IntegrationRequestInitiator")
  authoritativeDesignationsDesignated  AuthoritativeSourceDesignation[] @relation("AuthoritativeDesignationDesignator")
  integrationApprovalsApproved         IntegrationApproval[]           @relation("IntegrationApprovalApprover")
  integrationAcceptanceRecordsAchieved IntegrationAcceptanceRecord[]   @relation("IntegrationAcceptanceAchievedBy")
"""

CASE_RELATIONS = """
  feeAssessments                       FeeAssessment[]
  invoices                             Invoice[]
  communicationMessages                CommunicationMessage[]
  integrationRequests                  IntegrationRequest[]
"""

MAF_RELATIONS = """
  feeAssessments                       FeeAssessment[]
  invoices                             Invoice[]
  communicationMessages                CommunicationMessage[]
  communicationMafIndexEntries         CommunicationMafIndexEntry[]
"""

APPLICATION_RELATIONS = """
  feeAssessments                       FeeAssessment[]
  integrationRequests                  IntegrationRequest[]
"""

GOVERNMENT_SERVICE_RELATIONS = """
  feeSchedules                         FeeSchedule[]
"""

DOCUMENT_RECORD_RELATIONS = """
  integrationExchanges                 IntegrationExchange[]
"""

EXTERNAL_AUTHORITY_RELATIONS = """
  integrations                         Integration[]
"""

ORGANIZATION_RELATIONS = """
  communicationRecipients              CommunicationRecipient[]        @relation("CommunicationRecipientOrganization")
"""

REPRESENTATIVE_AUTHORITY_RELATIONS = """
  communicationRecipients              CommunicationRecipient[]
"""

REDRESS_ACTION_RELATIONS = """
  refundRequests                       RefundRequest[]
"""


import re


def patch_model(content: str, model: str, anchor: str, relations: str, probe: str) -> str:
    block_match = re.search(rf"model {model} \{{.*?\n\}}", content, re.DOTALL)
    if not block_match:
        raise ValueError(f"Model {model} not found")
    block = block_match.group(0)
    if probe in block:
        return content
    if anchor not in block:
        raise ValueError(f"Anchor not found in model {model}: {anchor!r}")
    new_block = block.replace(anchor, relations + anchor, 1)
    return content[: block_match.start()] + new_block + content[block_match.end() :]


def patch_base(content: str) -> str:
    content = patch_model(content, "Institution", "\n  @@unique([jurisdictionId, code])", INSTITUTION_RELATIONS, "feeSchedules")
    content = patch_model(content, "Identity", "\n  @@index([userAccountId])", IDENTITY_RELATIONS, "feeScheduleVersionsApproved")
    content = patch_model(content, "Case", "\n  @@index([status])", CASE_RELATIONS, "feeAssessments")
    content = patch_model(content, "MasterAdministrativeFile", "\n  @@index([governmentServiceId])", MAF_RELATIONS, "communicationMafIndexEntries")
    content = patch_model(content, "Application", "\n  @@unique([applicantIdentityId, idempotencyKey])", APPLICATION_RELATIONS, "feeAssessments")
    content = patch_model(content, "GovernmentService", "\n  @@index([responsibleInstitutionId])", GOVERNMENT_SERVICE_RELATIONS, "feeSchedules")
    content = patch_model(content, "DocumentRecord", "\n  @@index([owningInstitutionId])", DOCUMENT_RECORD_RELATIONS, "integrationExchanges")
    content = patch_model(content, "ExternalAuthority", "\n  @@map(\"external_authorities\")", EXTERNAL_AUTHORITY_RELATIONS, "integrations")
    content = patch_model(content, "Organization", "\n  @@index([status])", ORGANIZATION_RELATIONS, "communicationRecipients")
    content = patch_model(content, "RepresentativeAuthority", "\n  @@index([organizationId])", REPRESENTATIVE_AUTHORITY_RELATIONS, "communicationRecipients")
    content = patch_model(content, "RedressImplementationAction", "\n  @@index([implementationPlanId])", REDRESS_ACTION_RELATIONS, "refundRequests")
    return content


PHASE_11 = r'''
// ═══════════════════════════════════════════════════════════════════════════
// Phase 11 — Operational Support (Financial, Communications, Integrations)
// ═══════════════════════════════════════════════════════════════════════════

// ─── Phase 11 Financial enums (fragment + migration extras) ───────────────

enum FeeScheduleStatus {
  DRAFT
  PENDING_APPROVAL
  APPROVED
  ACTIVE
  SUPERSEDED
  RETIRED
}

enum FeeAssessmentStatus {
  CALCULATED
  INVOICED
  WAIVED
  ADJUSTED
  SUPERSEDED
}

enum InvoiceStatus {
  DRAFT
  ISSUED
  PARTIALLY_PAID
  PAID
  OVERDUE
  CANCELLED
  WRITTEN_OFF
}

enum FinancialApprovalType {
  FEE_SCHEDULE_ACTIVATION
  FEE_WAIVER
  FEE_ADJUSTMENT
  REFUND_AUTHORIZATION
  RECONCILIATION_CLOSURE
  ARREARS_ACTION
}

enum FinancialApprovalStatus {
  PENDING
  APPROVED
  REJECTED
  SUPERSEDED
}

enum FeeAdjustmentDecisionOutcome {
  APPROVED
  PARTIALLY_APPROVED
  REJECTED
}

enum PaymentChannelType {
  CARD
  BANK_TRANSFER
  CASH_COUNTER
  GOVERNMENT_TREASURY
  MOBILE_WALLET
  OTHER
}

enum PaymentIntentStatus {
  CREATED
  PENDING
  PROCESSING
  SUCCEEDED
  FAILED
  CANCELLED
  EXPIRED
}

enum PaymentTransactionStatus {
  PENDING
  AUTHORIZED
  SETTLED
  FAILED
  REVERSED
  CHARGEBACK
}

enum PaymentWebhookProcessingStatus {
  RECEIVED
  AUTHENTICATED
  PROCESSED
  DUPLICATE
  REJECTED
  FAILED
}

enum FeeAdjustmentRequestStatus {
  PENDING
  DECIDED
  WITHDRAWN
}

enum RefundRequestStatus {
  PENDING
  AUTHORIZED
  PROCESSING
  COMPLETED
  REJECTED
  FAILED
}

enum RefundTransactionStatus {
  PENDING
  PROCESSING
  COMPLETED
  FAILED
}

enum ReconciliationBatchStatus {
  OPEN
  IN_PROGRESS
  EXCEPTION
  CLOSED
}

enum ReconciliationItemStatus {
  MATCHED
  MISMATCH
  EXCEPTION
  RESOLVED
}

enum FinancialDisputeStatus {
  OPEN
  UNDER_REVIEW
  RESOLVED
  ESCALATED
}

enum ArrearsRecordStatus {
  OUTSTANDING
  PARTIALLY_PAID
  PAID
  WRITTEN_OFF
  DISPUTED
}

// ─── Phase 11D Communications enums ───────────────────────────────────────

enum CommunicationChannel {
  PORTAL
  EMAIL
  SMS
  PUSH
  SECURE_MESSAGE
  GOVERNMENT_INTERFACE
  PARTNER_INTERFACE
  POSTAL_REFERENCE
  IN_PERSON_REFERENCE
  OTHER_APPROVED_CHANNEL
}

enum CommunicationDeliveryStatus {
  PREPARED
  QUEUED
  SENT
  DELIVERED
  FAILED
  BOUNCED
  REJECTED
  EXPIRED
  CANCELLED
}

enum CommunicationDeliveryEffect {
  INFORMATIONAL_ONLY
  EFFECTIVE_ON_ISSUE
  EFFECTIVE_ON_SEND
  EFFECTIVE_ON_DELIVERY
  EFFECTIVE_ON_RECEIPT
  EFFECTIVE_BY_SEPARATE_RULE
}

enum CommunicationTemplateVersionStatus {
  DRAFT
  ACTIVE
  SUPERSEDED
  RETIRED
}

enum CommunicationTemplateFieldSource {
  VERIFIED_DATA
  COMPUTED_DATA
  HUMAN_ENTERED_TEXT
}

enum CommunicationMessageStatus {
  DRAFT
  PENDING_APPROVAL
  APPROVED
  QUEUED_FOR_DELIVERY
  PARTIALLY_DELIVERED
  DELIVERED
  FAILED
  CANCELLED
}

enum CommunicationClassification {
  PUBLIC
  OFFICIAL
  RESTRICTED
  SECRET
}

enum CommunicationMandatoryCategory {
  REQUIRED_DECISION_NOTICE
  APPEAL_NOTICE
  INSPECTION_NOTICE
  SECURITY_NOTIFICATION
  PRIVACY_NOTIFICATION
  OTHER_MANDATORY
}

enum CommunicationPreferenceScope {
  MARKETING
  INFORMATIONAL
  CHANNEL
}

enum TranslationReviewStatus {
  DRAFT
  PENDING_REVIEW
  REVIEWED
  CERTIFIED
  REJECTED
}

enum TranslationMethod {
  HUMAN_PROFESSIONAL
  HUMAN_OFFICIAL
  AI_ASSISTED
  MACHINE
}

enum AccessibilityAccommodationType {
  ALTERNATE_FORMAT
  SCREEN_READER_COMPATIBLE
  LARGE_PRINT
  LANGUAGE_SUPPORT
  ASSISTED_SERVICE
  OTHER_CONFIGURED
}

enum CommunicationFailureRetryState {
  NOT_RETRYABLE
  PENDING_RETRY
  RETRYING
  RETRY_EXHAUSTED
  RESOLVED
}

enum CommunicationReceiptMethod {
  EXPLICIT_ACKNOWLEDGMENT
  PORTAL_CONFIRMATION
  SECURE_MESSAGE_READ
  IN_PERSON_SIGNATURE
  POSTAL_CONFIRMATION
  OTHER
}

enum CommunicationRecipientRole {
  PRIMARY
  COPY
  REPRESENTATIVE
  INSTITUTIONAL
  OTHER
}

enum CommunicationServiceCapacity {
  PERSONAL
  ORGANIZATIONAL
  REPRESENTATIVE
  INSTITUTIONAL
}

enum CommunicationProviderType {
  EMAIL
  SMS
  PUSH
  PORTAL
  SECURE_MESSAGE
  OTHER
}

enum CommunicationAiDraftStatus {
  DRAFT
  PENDING_HUMAN_APPROVAL
  APPROVED
  REJECTED
}

// ─── Phase 11E Integration Registry enums ─────────────────────────────────

enum TechnologyDependencyCategory {
  IDENTITY
  APPLICATION
  CASE_MANAGEMENT
  GOVERNMENT_REGISTRY
  PROFESSIONAL_REGISTRY
  PAYMENT_BANKING
  DOCUMENT_RECORDS
  GEOSPATIAL_LAND
  PLANNING
  ENVIRONMENT
  CUSTOMS
  TAX
  IMMIGRATION
  CORPORATE
  LABOUR
  HEALTH
  MARITIME
  TOURISM
  LICENSING
  SIGNATURE_SEAL_TIMESTAMP
  NOTIFICATION
  HOSTING
  TELECOM
  CYBERSECURITY
  DIGITAL_TWIN
  ANALYTICS
  AI_MODEL
  BACKUP_ARCHIVAL
  SOURCE_CODE_DEPLOYMENT
  VENDOR
  OTHER
}

enum IntegrationDefinitionStatus {
  DRAFT
  REGISTERED
  ACTIVE
  SUSPENDED
  RETIRED
}

enum IntegrationVersionStatus {
  DRAFT
  CONFIGURED
  TESTING
  ACTIVE
  SUPERSEDED
  SUSPENDED
  RETIRED
}

enum IntegrationDirection {
  INBOUND
  OUTBOUND
  BIDIRECTIONAL
  QUERY_ONLY
  EVENT_ONLY
}

enum AuthoritativeSourceStatus {
  AUTHORITATIVE
  IMPLEMENTING
  SUPPORTING
  REFERENCE_ONLY
  APPLICANT_PROVIDED
  PROFESSIONALLY_ISSUED
  THIRD_PARTY_REPORTED
  DERIVED
  MODELED
  UNVERIFIED
}

enum IntegrationAcceptanceState {
  DISCOVERED
  DESIGNED
  CONFIGURED
  TECHNICALLY_CONNECTED
  TESTED
  SECURITY_APPROVED
  PRIVACY_APPROVED
  INSTITUTIONALLY_ACCEPTED
  ACTIVE
  SUSPENDED
  RETIRED
}

enum IntegrationApprovalType {
  INSTITUTIONAL
  SECURITY
  PRIVACY
  RECORDS
  LEGAL
  TECHNICAL
  DATA_OWNER
  VENDOR
  GOVERNMENT
}

enum IntegrationApprovalStatus {
  PENDING
  APPROVED
  REJECTED
  WITHDRAWN
}

enum DataExchangeFieldClassification {
  PERMITTED
  PROHIBITED
}

enum FieldAuthorityConflictBehavior {
  REJECT_CONFLICT
  FLAG_FOR_REVIEW
  PREFER_DESIGNATED_SOURCE
  DEFER_TO_INSTITUTIONAL_DECISION
}

enum CredentialRotationStatus {
  CURRENT
  DUE_FOR_ROTATION
  ROTATION_IN_PROGRESS
  EXPIRED
  REVOKED
}

enum AuthoritativeDesignationStatus {
  DRAFT
  PROPOSED
  ACTIVE
  SUSPENDED
  REVOKED
  SUPERSEDED
}

enum TechnologyDependencyStatus {
  ACTIVE
  SUSPENDED
  RETIRED
}

// ─── Phase 11F Integration Gateway enums ──────────────────────────────────

enum IntegrationLifecycleStatus {
  DRAFT
  PENDING_ACCEPTANCE
  ACTIVE
  INACTIVE
  SUSPENDED
  ARCHIVED
}

enum IntegrationOperation {
  QUERY
  SUBMIT
  UPDATE
  SEND_EVENT
  RECEIVE_EVENT
  HEALTH_CHECK
}

enum IntegrationExchangeDirection {
  OUTBOUND
  INBOUND
}

enum IntegrationExchangeStatus {
  PREPARED
  SENT
  ACKNOWLEDGED
  RESPONSE_RECEIVED
  VALIDATED
  RECONCILIATION_REQUIRED
  FAILED
  TIMED_OUT
  RETRY_PENDING
  SAFE_HALTED
  CANCELLED
}

enum IntegrationMessageDirection {
  OUTBOUND
  INBOUND
}

enum IntegrationDeliveryAttemptOutcome {
  SUCCESS
  FAILURE
  TIMEOUT
  RETRY_SCHEDULED
}

enum IntegrationSignatureValidationResult {
  VALID
  INVALID
  MISSING
  NOT_APPLICABLE
}

enum IntegrationWebhookProcessingStatus {
  PENDING
  PROCESSING
  PROCESSED
  REJECTED_INVALID_SIGNATURE
  REJECTED_REPLAY
  REJECTED_DUPLICATE
  REJECTED_UNEXPECTED_TYPE
  REJECTED_INVALID_SCHEMA
  REJECTED_EXPIRED_TIMESTAMP
  SAFE_HALTED
}

enum IntegrationValidationOverallStatus {
  PENDING
  PASSED
  FAILED
  PARTIAL
}

enum IntegrationDataClassification {
  UNCLASSIFIED
  OFFICIAL
  OFFICIAL_SENSITIVE
  PROTECTED
  SECRET
}

// ─── Phase 11F Gateway models ─────────────────────────────────────────────

model Integration {
  id                  String                     @id @default(uuid()) @db.Uuid
  code                String                     @unique
  name                String
  description         String?
  institutionId       String?                    @db.Uuid
  externalAuthorityId String?                    @db.Uuid
  status              IntegrationLifecycleStatus @default(DRAFT)
  createdAt           DateTime                   @default(now())
  updatedAt           DateTime                   @updatedAt
  institution         Institution?               @relation(fields: [institutionId], references: [id])
  externalAuthority   ExternalAuthority?         @relation(fields: [externalAuthorityId], references: [id])
  versions            IntegrationGatewayVersion[]

  @@index([institutionId])
  @@index([externalAuthorityId])
  @@index([status])
  @@map("integrations")
}

model IntegrationGatewayVersion {
  id                        String                        @id @default(uuid()) @db.Uuid
  integrationId             String                        @db.Uuid
  version                   String
  status                    IntegrationLifecycleStatus    @default(DRAFT)
  adapterType               String
  acceptedAt                DateTime?
  acceptedByIdentityId      String?                       @db.Uuid
  serviceIdentityId         String                        @db.Uuid
  requestSchemaVersion      String
  permittedOperations       Json
  permittedPurposes         Json
  permittedFields           Json
  dataClassificationCeiling IntegrationDataClassification @default(OFFICIAL)
  capabilityDeclarations    Json
  schemaDefinition          Json?
  failurePolicy             Json?
  createdAt                 DateTime                      @default(now())
  updatedAt                 DateTime                      @updatedAt
  integration               Integration                   @relation(fields: [integrationId], references: [id])
  acceptedByIdentity        Identity?                     @relation("IntegrationGatewayVersionAcceptedBy", fields: [acceptedByIdentityId], references: [id])
  serviceIdentity           Identity                      @relation("IntegrationGatewayVersionServiceIdentity", fields: [serviceIdentityId], references: [id])
  credential                IntegrationCredential?
  requests                  IntegrationRequest[]
  exchanges                 IntegrationExchange[]
  webhookEvents             IntegrationWebhookEvent[]

  @@unique([integrationId, version])
  @@index([integrationId])
  @@index([status])
  @@index([serviceIdentityId])
  @@map("integration_gateway_versions")
}

model IntegrationCredential {
  id                   String                  @id @default(uuid()) @db.Uuid
  integrationVersionId String                  @unique @db.Uuid
  identityId           String                  @db.Uuid
  credentialReference  String
  status               CredentialStatus        @default(PENDING)
  createdAt            DateTime                @default(now())
  updatedAt            DateTime                @updatedAt
  integrationVersion   IntegrationGatewayVersion @relation(fields: [integrationVersionId], references: [id])
  identity             Identity                @relation(fields: [identityId], references: [id])

  @@index([identityId])
  @@index([status])
  @@map("integration_credentials")
}

model IntegrationRequest {
  id                   String                      @id @default(uuid()) @db.Uuid
  integrationVersionId String                      @db.Uuid
  operation            IntegrationOperation
  initiatingIdentityId String                      @db.Uuid
  serviceIdentityId    String?                     @db.Uuid
  institutionalPurpose String
  caseId               String?                     @db.Uuid
  applicationId        String?                     @db.Uuid
  recordReference      String?
  permittedFields      Json
  requestSchemaVersion String
  correlationId        String
  idempotencyKey       String
  payloadHash          String
  payloadMinimized     Json
  dataClassification   IntegrationDataClassification
  createdAt            DateTime                    @default(now())
  integrationVersion   IntegrationGatewayVersion   @relation(fields: [integrationVersionId], references: [id])
  initiatingIdentity   Identity                    @relation("IntegrationRequestInitiator", fields: [initiatingIdentityId], references: [id])
  case                 Case?                       @relation(fields: [caseId], references: [id])
  application          Application?                @relation(fields: [applicationId], references: [id])
  exchanges            IntegrationExchange[]
  correlationRecords   IntegrationCorrelationRecord[]

  @@unique([integrationVersionId, idempotencyKey])
  @@index([integrationVersionId])
  @@index([initiatingIdentityId])
  @@index([correlationId])
  @@index([caseId])
  @@index([applicationId])
  @@map("integration_requests")
}

model IntegrationExchange {
  id                   String                       @id @default(uuid()) @db.Uuid
  direction            IntegrationExchangeDirection
  integrationVersionId String                       @db.Uuid
  requestId            String?                      @db.Uuid
  externalSystem       String
  startedAt            DateTime                     @default(now())
  completedAt          DateTime?
  status               IntegrationExchangeStatus    @default(PREPARED)
  correlationId        String
  requestHash          String
  responseHash         String?
  dataClassification   IntegrationDataClassification
  recordsReference     String?
  documentRecordId     String?                      @db.Uuid
  integrationVersion   IntegrationGatewayVersion    @relation(fields: [integrationVersionId], references: [id])
  request              IntegrationRequest?          @relation(fields: [requestId], references: [id])
  documentRecord       DocumentRecord?              @relation(fields: [documentRecordId], references: [id])
  messages             IntegrationMessage[]
  deliveryAttempts     IntegrationDeliveryAttempt[]
  responseRecords      IntegrationResponseRecord[]
  transformations      IntegrationDataTransformation[]
  validationResults    IntegrationValidationResult[]
  correlationRecords   IntegrationCorrelationRecord[]

  @@index([integrationVersionId])
  @@index([requestId])
  @@index([correlationId])
  @@index([status])
  @@index([documentRecordId])
  @@map("integration_exchanges")
}

model IntegrationMessage {
  id                String                      @id @default(uuid()) @db.Uuid
  exchangeId        String                      @db.Uuid
  direction         IntegrationMessageDirection
  messageType       String
  contentHash       String
  structuredSummary Json
  createdAt         DateTime                    @default(now())
  exchange          IntegrationExchange         @relation(fields: [exchangeId], references: [id], onDelete: Cascade)

  @@index([exchangeId])
  @@index([contentHash])
  @@map("integration_messages")
}

model IntegrationDeliveryAttempt {
  id             String                            @id @default(uuid()) @db.Uuid
  exchangeId     String                            @db.Uuid
  attemptNumber  Int
  outcome        IntegrationDeliveryAttemptOutcome
  startedAt      DateTime                          @default(now())
  completedAt    DateTime?
  outcomeCode    String?
  errorMessage   String?
  createdAt      DateTime                          @default(now())
  exchange       IntegrationExchange               @relation(fields: [exchangeId], references: [id], onDelete: Cascade)

  @@unique([exchangeId, attemptNumber])
  @@index([exchangeId])
  @@map("integration_delivery_attempts")
}

model IntegrationResponseRecord {
  id                String                               @id @default(uuid()) @db.Uuid
  exchangeId        String                               @db.Uuid
  sourceVerified    Boolean                              @default(false)
  endpointVerified  Boolean                              @default(false)
  signatureResult   IntegrationSignatureValidationResult @default(NOT_APPLICABLE)
  schemaValid       Boolean                              @default(false)
  versionValid      Boolean                              @default(false)
  httpStatusCode    Int?
  responseHash      String
  structuredSummary Json
  validatedAt       DateTime?
  isValidated       Boolean                              @default(false)
  createdAt         DateTime                             @default(now())
  exchange          IntegrationExchange                  @relation(fields: [exchangeId], references: [id], onDelete: Cascade)
  validationResult  IntegrationValidationResult?

  @@index([exchangeId])
  @@index([responseHash])
  @@map("integration_response_records")
}

model IntegrationWebhookEvent {
  id                   String                               @id @default(uuid()) @db.Uuid
  integrationVersionId String                               @db.Uuid
  externalEventId      String
  eventType            String
  receivedAt           DateTime                             @default(now())
  signatureResult      IntegrationSignatureValidationResult   @default(NOT_APPLICABLE)
  timestampValid       Boolean                              @default(false)
  replayValid          Boolean                              @default(false)
  payloadHash          String
  correlationId        String?
  processingStatus     IntegrationWebhookProcessingStatus     @default(PENDING)
  rejectionReason      String?
  createdAt            DateTime                             @default(now())
  integrationVersion   IntegrationGatewayVersion            @relation(fields: [integrationVersionId], references: [id])
  validationResults    IntegrationValidationResult[]
  correlationRecords   IntegrationCorrelationRecord[]

  @@unique([integrationVersionId, externalEventId])
  @@index([integrationVersionId])
  @@index([eventType])
  @@index([correlationId])
  @@index([processingStatus])
  @@map("integration_webhook_events")
}

model IntegrationCorrelationRecord {
  id             String                   @id @default(uuid()) @db.Uuid
  correlationId  String
  exchangeId     String?                  @db.Uuid
  webhookEventId String?                  @db.Uuid
  requestId      String?                  @db.Uuid
  createdAt      DateTime                 @default(now())
  exchange       IntegrationExchange?     @relation(fields: [exchangeId], references: [id])
  webhookEvent   IntegrationWebhookEvent? @relation(fields: [webhookEventId], references: [id])
  request        IntegrationRequest?      @relation(fields: [requestId], references: [id])

  @@index([correlationId])
  @@index([exchangeId])
  @@index([webhookEventId])
  @@index([requestId])
  @@map("integration_correlation_records")
}

model IntegrationDataTransformation {
  id                    String              @id @default(uuid()) @db.Uuid
  exchangeId            String              @db.Uuid
  sourceSchema          String
  destinationSchema     String
  mappingVersion        String
  transformationVersion String
  inputHash             String
  outputHash            String
  lossyFields           Json
  warnings              Json
  createdAt             DateTime            @default(now())
  exchange              IntegrationExchange @relation(fields: [exchangeId], references: [id], onDelete: Cascade)

  @@index([exchangeId])
  @@index([inputHash])
  @@index([outputHash])
  @@map("integration_data_transformations")
}

model IntegrationValidationResult {
  id               String                             @id @default(uuid()) @db.Uuid
  exchangeId       String?                            @db.Uuid
  responseRecordId String?                            @unique @db.Uuid
  webhookEventId   String?                            @db.Uuid
  overallStatus    IntegrationValidationOverallStatus @default(PENDING)
  checks           Json
  failureReasons   Json
  createdAt        DateTime                           @default(now())
  exchange         IntegrationExchange?               @relation(fields: [exchangeId], references: [id])
  responseRecord   IntegrationResponseRecord?         @relation(fields: [responseRecordId], references: [id])
  webhookEvent     IntegrationWebhookEvent?           @relation(fields: [webhookEventId], references: [id])

  @@index([exchangeId])
  @@index([webhookEventId])
  @@index([overallStatus])
  @@map("integration_validation_results")
}

// ─── Phase 11 Financial models ────────────────────────────────────────────
'''

# Financial models extracted from corrupted schema lines 8348-8840
FINANCIAL_MODELS = (ROOT / "prisma" / "schema.prisma").read_text().split("model FeeSchedule {", 1)[1]
FINANCIAL_MODELS = "model FeeSchedule {" + FINANCIAL_MODELS.split("model CommunicationTemplate {", 1)[0].rstrip()
# Trim duplicate FinancialApprovalRecord's trailing content if CommunicationTemplate snuck in
if "model CommunicationTemplate" in FINANCIAL_MODELS:
    FINANCIAL_MODELS = FINANCIAL_MODELS.split("model CommunicationTemplate")[0].rstrip()

COMMUNICATIONS_SECTION = r'''
// ─── Phase 11 Communications models (11D canonical) ─────────────────────────

model CommunicationTemplate {
  id                    String                      @id @default(uuid()) @db.Uuid
  code                  String                      @unique
  name                  String
  description           String?
  communicationType     String
  defaultClassification CommunicationClassification @default(OFFICIAL)
  createdAt             DateTime                    @default(now())
  updatedAt             DateTime                    @updatedAt
  versions              CommunicationTemplateVersion[]
  mandatoryRules        MandatoryCommunicationRule[]

  @@map("communication_templates")
}

model CommunicationTemplateVersion {
  id                           String                             @id @default(uuid()) @db.Uuid
  templateId                   String                             @db.Uuid
  versionNumber                Int
  status                       CommunicationTemplateVersionStatus @default(DRAFT)
  subjectTemplate              String
  bodyTemplate                 String
  fieldDefinitions             Json
  allowedChannels              CommunicationChannel[]
  deliveryEffect               CommunicationDeliveryEffect        @default(INFORMATIONAL_ONLY)
  requiresApproval             Boolean                            @default(true)
  certifiedTranslationRequired Boolean                            @default(false)
  activatedAt                  DateTime?
  activatedByIdentityId        String?                            @db.Uuid
  createdAt                    DateTime                           @default(now())
  updatedAt                    DateTime                           @updatedAt
  template                     CommunicationTemplate              @relation(fields: [templateId], references: [id], onDelete: Cascade)
  activatedBy                  Identity?                          @relation("CommunicationTemplateVersionActivatedBy", fields: [activatedByIdentityId], references: [id])
  messages                     CommunicationMessage[]
  mafIndexEntries              CommunicationMafIndexEntry[]

  @@unique([templateId, versionNumber])
  @@index([templateId])
  @@index([status])
  @@map("communication_template_versions")
}

model CommunicationMessage {
  id                         String                          @id @default(uuid()) @db.Uuid
  messageNumber              String                          @unique
  communicationType          String
  sourceRecordType           String
  sourceRecordId             String                          @db.Uuid
  caseId                     String?                         @db.Uuid
  masterAdministrativeFileId String                          @db.Uuid
  templateVersionId          String?                         @db.Uuid
  subject                    String
  classification             CommunicationClassification
  senderInstitutionId        String                          @db.Uuid
  preparedByIdentityId       String                          @db.Uuid
  approvedByIdentityId       String?                         @db.Uuid
  status                     CommunicationMessageStatus      @default(DRAFT)
  aiDraftStatus              CommunicationAiDraftStatus?
  isOfficial                 Boolean                         @default(false)
  canonicalNoticeReference   String?
  verifiedDataSnapshot       Json?
  computedDataSnapshot       Json?
  humanEnteredText           Json?
  mandatoryCategory          CommunicationMandatoryCategory?
  deliveryEffect             CommunicationDeliveryEffect     @default(INFORMATIONAL_ONLY)
  createdAt                  DateTime                        @default(now())
  updatedAt                  DateTime                        @updatedAt
  templateVersion            CommunicationTemplateVersion?   @relation(fields: [templateVersionId], references: [id])
  senderInstitution          Institution                     @relation("CommunicationMessageSenderInstitution", fields: [senderInstitutionId], references: [id])
  preparedBy                 Identity                        @relation("CommunicationMessagePreparedBy", fields: [preparedByIdentityId], references: [id])
  approvedBy                 Identity?                       @relation("CommunicationMessageApprovedBy", fields: [approvedByIdentityId], references: [id])
  case                       Case?                           @relation(fields: [caseId], references: [id])
  masterAdministrativeFile   MasterAdministrativeFile        @relation(fields: [masterAdministrativeFileId], references: [id])
  recipients                 CommunicationRecipient[]
  deliveries                 CommunicationDelivery[]
  translationRecords         TranslationRecord[]
  accessibilityAccommodations AccessibilityAccommodation[]
  mafIndexEntries            CommunicationMafIndexEntry[]

  @@index([sourceRecordType, sourceRecordId])
  @@index([caseId])
  @@index([masterAdministrativeFileId])
  @@index([templateVersionId])
  @@index([senderInstitutionId])
  @@index([status])
  @@map("communication_messages")
}

model CommunicationRecipient {
  id                          String                       @id @default(uuid()) @db.Uuid
  messageId                   String                       @db.Uuid
  recipientIdentityId         String?                      @db.Uuid
  recipientOrganizationId     String?                      @db.Uuid
  recipientRole               CommunicationRecipientRole   @default(PRIMARY)
  channelReference            String?
  preferredLanguage           String                       @default("en")
  accessibilityRequirements   Json?
  legalServiceCapacity        CommunicationServiceCapacity
  representativeAuthorityId   String?                      @db.Uuid
  representativeRelationship  String?
  blocked                     Boolean                      @default(false)
  blockReason                 String?
  createdAt                   DateTime                     @default(now())
  updatedAt                   DateTime                     @updatedAt
  message                     CommunicationMessage         @relation(fields: [messageId], references: [id], onDelete: Cascade)
  recipientIdentity           Identity?                    @relation("CommunicationRecipientIdentity", fields: [recipientIdentityId], references: [id])
  recipientOrganization       Organization?                @relation("CommunicationRecipientOrganization", fields: [recipientOrganizationId], references: [id])
  representativeAuthority     RepresentativeAuthority?     @relation(fields: [representativeAuthorityId], references: [id])
  deliveries                  CommunicationDelivery[]
  receipts                    CommunicationReceipt[]
  accessibilityAccommodations AccessibilityAccommodation[]

  @@index([messageId])
  @@index([recipientIdentityId])
  @@index([recipientOrganizationId])
  @@index([representativeAuthorityId])
  @@map("communication_recipients")
}

model CommunicationDelivery {
  id                   String                       @id @default(uuid()) @db.Uuid
  messageId            String                       @db.Uuid
  recipientId          String                       @db.Uuid
  channel              CommunicationChannel
  provider             CommunicationProviderType
  destinationReference String?
  requiredOrOptional   Boolean                      @default(true)
  preparedAt           DateTime?
  sentAt               DateTime?
  deliveredAt          DateTime?
  failedAt             DateTime?
  status               CommunicationDeliveryStatus  @default(PREPARED)
  providerReference    String?
  idempotencyKey       String?                      @unique
  createdAt            DateTime                     @default(now())
  updatedAt            DateTime                     @updatedAt
  message              CommunicationMessage         @relation(fields: [messageId], references: [id], onDelete: Cascade)
  recipient            CommunicationRecipient       @relation(fields: [recipientId], references: [id], onDelete: Cascade)
  attempts             CommunicationDeliveryAttempt[]
  receipts             CommunicationReceipt[]
  failureRecords       CommunicationFailureRecord[]

  @@index([messageId])
  @@index([recipientId])
  @@index([status])
  @@map("communication_deliveries")
}

model CommunicationDeliveryAttempt {
  id                     String                      @id @default(uuid()) @db.Uuid
  deliveryId             String                      @db.Uuid
  attemptNumber          Int
  channel                CommunicationChannel
  provider               CommunicationProviderType
  destinationReference   String?
  status                 CommunicationDeliveryStatus @default(QUEUED)
  providerReference      String?
  callbackIdempotencyKey String?                     @unique
  queuedAt               DateTime                    @default(now())
  sentAt                 DateTime?
  deliveredAt            DateTime?
  failedAt               DateTime?
  failureReason          String?
  createdAt              DateTime                    @default(now())
  updatedAt              DateTime                    @updatedAt
  delivery               CommunicationDelivery       @relation(fields: [deliveryId], references: [id], onDelete: Cascade)
  receipts               CommunicationReceipt[]

  @@unique([deliveryId, attemptNumber])
  @@index([deliveryId])
  @@index([status])
  @@map("communication_delivery_attempts")
}

model CommunicationReceipt {
  id                     String                        @id @default(uuid()) @db.Uuid
  deliveryId             String                        @db.Uuid
  attemptId              String?                       @db.Uuid
  recipientId            String                        @db.Uuid
  receivedAt             DateTime
  method                 CommunicationReceiptMethod
  identityAssuranceLevel String?
  isLegalReceipt         Boolean                       @default(false)
  emailOpenPixel         Boolean                       @default(false)
  sourceDeliveryId       String                        @db.Uuid
  callbackIdempotencyKey   String?                     @unique
  createdAt              DateTime                      @default(now())
  delivery               CommunicationDelivery         @relation(fields: [deliveryId], references: [id], onDelete: Cascade)
  attempt                CommunicationDeliveryAttempt? @relation(fields: [attemptId], references: [id])
  recipient              CommunicationRecipient        @relation(fields: [recipientId], references: [id], onDelete: Cascade)

  @@index([deliveryId])
  @@index([recipientId])
  @@index([attemptId])
  @@map("communication_receipts")
}

model CommunicationPreference {
  id                String                        @id @default(uuid()) @db.Uuid
  identityId        String                        @db.Uuid
  scope             CommunicationPreferenceScope
  channel           CommunicationChannel?
  mandatoryCategory CommunicationMandatoryCategory?
  enabled           Boolean                       @default(true)
  language          String?
  createdAt         DateTime                      @default(now())
  updatedAt         DateTime                      @updatedAt
  identity          Identity                      @relation(fields: [identityId], references: [id], onDelete: Cascade)

  @@unique([identityId, scope, channel])
  @@index([identityId])
  @@map("communication_preferences")
}

model MandatoryCommunicationRule {
  id                String                         @id @default(uuid()) @db.Uuid
  templateId        String?                        @db.Uuid
  mandatoryCategory CommunicationMandatoryCategory
  communicationType String?
  suppressible      Boolean                        @default(false)
  description       String
  createdAt         DateTime                       @default(now())
  updatedAt         DateTime                       @updatedAt
  template          CommunicationTemplate?         @relation(fields: [templateId], references: [id])

  @@index([mandatoryCategory])
  @@index([templateId])
  @@map("mandatory_communication_rules")
}

model TranslationRecord {
  id                             String                  @id @default(uuid()) @db.Uuid
  messageId                      String                  @db.Uuid
  sourceTemplateVersionId        String?                 @db.Uuid
  targetLanguage                 String
  translationMethod              TranslationMethod
  translatorReference            String?
  translatedSubject              String
  translatedContent              String
  reviewStatus                   TranslationReviewStatus @default(DRAFT)
  limitations                    String?
  aiAssisted                     Boolean                 @default(false)
  certifiedRequired              Boolean                 @default(false)
  cannotSubstituteAiForCertified Boolean                 @default(true)
  reviewedAt                     DateTime?
  createdAt                      DateTime                @default(now())
  updatedAt                      DateTime                @updatedAt
  message                        CommunicationMessage    @relation(fields: [messageId], references: [id], onDelete: Cascade)

  @@index([messageId])
  @@index([targetLanguage])
  @@map("translation_records")
}

model AccessibilityAccommodation {
  id                String                         @id @default(uuid()) @db.Uuid
  messageId         String                         @db.Uuid
  recipientId       String?                        @db.Uuid
  accommodationType AccessibilityAccommodationType
  description       String?
  configuredSupport String?
  createdAt         DateTime                       @default(now())
  updatedAt         DateTime                       @updatedAt
  message           CommunicationMessage           @relation(fields: [messageId], references: [id], onDelete: Cascade)
  recipient         CommunicationRecipient?        @relation(fields: [recipientId], references: [id])

  @@index([messageId])
  @@index([recipientId])
  @@map("accessibility_accommodations")
}

model CommunicationFailureRecord {
  id                  String                         @id @default(uuid()) @db.Uuid
  deliveryId          String                         @db.Uuid
  failureReason       String
  retryState          CommunicationFailureRetryState @default(PENDING_RETRY)
  alternateChannel    CommunicationChannel?
  escalationReference String?
  resolutionNotes     String?
  resolvedAt          DateTime?
  affectsLegalStatus  Boolean?
  createdAt           DateTime                       @default(now())
  updatedAt           DateTime                       @updatedAt
  delivery            CommunicationDelivery          @relation(fields: [deliveryId], references: [id], onDelete: Cascade)

  @@index([deliveryId])
  @@index([retryState])
  @@map("communication_failure_records")
}

model CommunicationMafIndexEntry {
  id                         String                        @id @default(uuid()) @db.Uuid
  masterAdministrativeFileId String                        @db.Uuid
  messageId                  String                        @db.Uuid
  templateVersionId          String?                       @db.Uuid
  deliveredVersionReference  String
  indexedAt                  DateTime                      @default(now())
  masterAdministrativeFile   MasterAdministrativeFile      @relation(fields: [masterAdministrativeFileId], references: [id], onDelete: Cascade)
  message                    CommunicationMessage          @relation(fields: [messageId], references: [id], onDelete: Cascade)
  templateVersion            CommunicationTemplateVersion? @relation(fields: [templateVersionId], references: [id])

  @@unique([masterAdministrativeFileId, messageId, deliveredVersionReference])
  @@index([messageId])
  @@index([templateVersionId])
  @@map("communication_maf_index_entries")
}

// ─── Phase 11E Integration Registry models ────────────────────────────────
'''

REGISTRY_MODELS = r'''
model TechnologyDependency {
  id                      String                       @id @default(uuid()) @db.Uuid
  code                    String                       @unique
  name                    String
  description             String?
  category                TechnologyDependencyCategory
  vendor                  String?
  versionLabel            String?
  status                  TechnologyDependencyStatus   @default(ACTIVE)
  createdAt               DateTime                     @default(now())
  updatedAt               DateTime                     @updatedAt
  integrationDependencies IntegrationDependency[]

  @@index([category])
  @@index([status])
  @@map("technology_dependencies")
}

model IntegrationDefinition {
  id                    String                       @id @default(uuid()) @db.Uuid
  integrationCode       String                       @unique
  officialName          String
  description           String?
  institutionalOwnerId  String                       @db.Uuid
  systemOwner           String
  provider              String
  dependencyCategory    TechnologyDependencyCategory
  businessPurpose       String
  status                IntegrationDefinitionStatus  @default(DRAFT)
  createdAt             DateTime                     @default(now())
  updatedAt             DateTime                     @updatedAt
  institutionalOwner    Institution                  @relation("IntegrationInstitutionalOwner", fields: [institutionalOwnerId], references: [id])
  versions              IntegrationVersion[]
  institutionOwners     IntegrationInstitutionOwner[]
  integrationDependencies IntegrationDependency[]

  @@index([institutionalOwnerId])
  @@index([dependencyCategory])
  @@index([status])
  @@map("integration_definitions")
}

model IntegrationVersion {
  id                      String                       @id @default(uuid()) @db.Uuid
  integrationDefinitionId String                       @db.Uuid
  version                 String
  sourceSystem            String
  destinationSystem       String
  direction               IntegrationDirection
  protocol                String
  dataContractVersion     String?
  securityProfile         String?
  privacyProfile          String?
  retentionProfile        String?
  availabilityExpectation String?
  recoveryExpectation     String?
  fallbackProcedure       String?
  effectiveFrom           DateTime?
  effectiveUntil          DateTime?
  status                  IntegrationVersionStatus     @default(DRAFT)
  currentAcceptanceState  IntegrationAcceptanceState   @default(DISCOVERED)
  supersededByVersionId   String?                      @db.Uuid
  acceptedAt              DateTime?
  createdAt               DateTime                     @default(now())
  updatedAt               DateTime                     @updatedAt
  integrationDefinition   IntegrationDefinition        @relation(fields: [integrationDefinitionId], references: [id])
  supersededByVersion     IntegrationVersion?          @relation("IntegrationVersionSupersession", fields: [supersededByVersionId], references: [id])
  supersededVersions      IntegrationVersion[]         @relation("IntegrationVersionSupersession")
  endpoints               IntegrationEndpoint[]
  dataExchangeContracts   DataExchangeContract[]
  credentialReferences    IntegrationCredentialReference[]
  approvals               IntegrationApproval[]
  acceptanceRecords       IntegrationAcceptanceRecord[]
  authoritativeDesignations AuthoritativeSourceDesignation[]

  @@unique([integrationDefinitionId, version])
  @@index([integrationDefinitionId])
  @@index([status])
  @@index([currentAcceptanceState])
  @@index([supersededByVersionId])
  @@map("integration_versions")
}

model IntegrationEndpoint {
  id                   String             @id @default(uuid()) @db.Uuid
  integrationVersionId String             @db.Uuid
  endpointCode         String
  pathOrIdentifier     String
  method               String?
  description          String?
  createdAt            DateTime           @default(now())
  updatedAt            DateTime           @updatedAt
  integrationVersion   IntegrationVersion @relation(fields: [integrationVersionId], references: [id], onDelete: Cascade)

  @@unique([integrationVersionId, endpointCode])
  @@index([integrationVersionId])
  @@map("integration_endpoints")
}

model DataExchangeContract {
  id                   String              @id @default(uuid()) @db.Uuid
  integrationVersionId String              @db.Uuid
  schemaIdentifier     String
  schemaVersion        String
  classification       String
  purpose              String
  minimumNecessaryRule String
  validationRules      Json                @default("[]")
  transformationRules  Json                @default("[]")
  retention            String?
  loggingRestrictions  String?
  createdAt            DateTime            @default(now())
  updatedAt            DateTime            @updatedAt
  integrationVersion   IntegrationVersion  @relation(fields: [integrationVersionId], references: [id], onDelete: Cascade)
  fields               DataExchangeField[]

  @@unique([integrationVersionId, schemaIdentifier, schemaVersion])
  @@index([integrationVersionId])
  @@map("data_exchange_contracts")
}

model DataExchangeField {
  id                     String                          @id @default(uuid()) @db.Uuid
  dataExchangeContractId String                          @db.Uuid
  fieldName              String
  classification         DataExchangeFieldClassification
  description            String?
  createdAt              DateTime                        @default(now())
  updatedAt              DateTime                        @updatedAt
  dataExchangeContract   DataExchangeContract            @relation(fields: [dataExchangeContractId], references: [id], onDelete: Cascade)

  @@unique([dataExchangeContractId, fieldName, classification])
  @@index([dataExchangeContractId])
  @@map("data_exchange_fields")
}

model AuthoritativeSourceDesignation {
  id                             String                         @id @default(uuid()) @db.Uuid
  integrationVersionId           String                         @db.Uuid
  institutionId                  String                         @db.Uuid
  datasetResource                String
  authoritySource                String
  scope                          String
  effectiveFrom                  DateTime?
  effectiveUntil                 DateTime?
  designatingAuthorityIdentityId String?                        @db.Uuid
  designatingOfficeholderId      String?                        @db.Uuid
  acceptanceRecordId             String?                        @db.Uuid
  sourceStatus                   AuthoritativeSourceStatus      @default(UNVERIFIED)
  designationStatus              AuthoritativeDesignationStatus @default(DRAFT)
  createdAt                      DateTime                       @default(now())
  updatedAt                      DateTime                       @updatedAt
  integrationVersion             IntegrationVersion             @relation(fields: [integrationVersionId], references: [id], onDelete: Cascade)
  institution                    Institution                    @relation(fields: [institutionId], references: [id])
  designatingAuthority           Identity?                      @relation("AuthoritativeDesignationDesignator", fields: [designatingAuthorityIdentityId], references: [id])
  acceptanceRecord               IntegrationAcceptanceRecord?   @relation(fields: [acceptanceRecordId], references: [id])
  fieldAuthorityMappings         FieldAuthorityMapping[]

  @@index([integrationVersionId])
  @@index([institutionId])
  @@index([sourceStatus])
  @@index([designationStatus])
  @@map("authoritative_source_designations")
}

model FieldAuthorityMapping {
  id                               String                         @id @default(uuid()) @db.Uuid
  authoritativeSourceDesignationId String                         @db.Uuid
  field                            String
  source                           String
  sourceStatus                     AuthoritativeSourceStatus        @default(UNVERIFIED)
  scope                            String?
  validity                         String?
  conflictBehavior                 FieldAuthorityConflictBehavior   @default(FLAG_FOR_REVIEW)
  createdAt                        DateTime                       @default(now())
  updatedAt                        DateTime                       @updatedAt
  authoritativeSourceDesignation   AuthoritativeSourceDesignation @relation(fields: [authoritativeSourceDesignationId], references: [id], onDelete: Cascade)

  @@unique([authoritativeSourceDesignationId, field])
  @@index([authoritativeSourceDesignationId])
  @@map("field_authority_mappings")
}

model IntegrationCredentialReference {
  id                   String             @id @default(uuid()) @db.Uuid
  integrationVersionId String             @db.Uuid
  credentialType       String
  secretReference      String?
  certificateReference String?
  serviceIdentity      String?
  effectiveFrom        DateTime?
  expiration           DateTime?
  rotationStatus       CredentialRotationStatus @default(CURRENT)
  createdAt            DateTime           @default(now())
  updatedAt            DateTime           @updatedAt
  integrationVersion   IntegrationVersion @relation(fields: [integrationVersionId], references: [id], onDelete: Cascade)

  @@index([integrationVersionId])
  @@index([rotationStatus])
  @@index([expiration])
  @@map("integration_credential_references")
}

model IntegrationInstitutionOwner {
  id                      String                @id @default(uuid()) @db.Uuid
  integrationDefinitionId String                @db.Uuid
  institutionId           String                @db.Uuid
  ownershipRole           String
  effectiveFrom           DateTime?
  effectiveUntil          DateTime?
  createdAt               DateTime              @default(now())
  updatedAt               DateTime              @updatedAt
  integrationDefinition   IntegrationDefinition @relation(fields: [integrationDefinitionId], references: [id], onDelete: Cascade)
  institution             Institution           @relation(fields: [institutionId], references: [id])

  @@unique([integrationDefinitionId, institutionId, ownershipRole])
  @@index([integrationDefinitionId])
  @@index([institutionId])
  @@map("integration_institution_owners")
}

model IntegrationDependency {
  id                     String                @id @default(uuid()) @db.Uuid
  integrationDefinitionId String               @db.Uuid
  technologyDependencyId String                @db.Uuid
  relationshipType       String
  isRequired             Boolean               @default(true)
  createdAt              DateTime              @default(now())
  updatedAt              DateTime              @updatedAt
  integrationDefinition  IntegrationDefinition @relation(fields: [integrationDefinitionId], references: [id], onDelete: Cascade)
  technologyDependency   TechnologyDependency  @relation(fields: [technologyDependencyId], references: [id])

  @@unique([integrationDefinitionId, technologyDependencyId])
  @@index([integrationDefinitionId])
  @@index([technologyDependencyId])
  @@map("integration_dependencies")
}

model IntegrationApproval {
  id                      String                   @id @default(uuid()) @db.Uuid
  integrationVersionId      String                   @db.Uuid
  approvalType            IntegrationApprovalType
  status                  IntegrationApprovalStatus @default(PENDING)
  approvedByIdentityId    String?                  @db.Uuid
  approvedByOfficeholderId String?                 @db.Uuid
  approvedAt              DateTime?
  notes                   String?
  createdAt               DateTime                 @default(now())
  updatedAt               DateTime                 @updatedAt
  integrationVersion      IntegrationVersion       @relation(fields: [integrationVersionId], references: [id], onDelete: Cascade)
  approvedByIdentity      Identity?                @relation("IntegrationApprovalApprover", fields: [approvedByIdentityId], references: [id])

  @@unique([integrationVersionId, approvalType])
  @@index([integrationVersionId])
  @@index([approvalType])
  @@index([status])
  @@map("integration_approvals")
}

model IntegrationAcceptanceRecord {
  id                      String                    @id @default(uuid()) @db.Uuid
  integrationVersionId    String                    @db.Uuid
  acceptanceState         IntegrationAcceptanceState
  achievedAt              DateTime                  @default(now())
  achievedByIdentityId    String?                   @db.Uuid
  achievedByOfficeholderId  String?                   @db.Uuid
  previousState           IntegrationAcceptanceState?
  notes                   String?
  createdAt               DateTime                  @default(now())
  integrationVersion      IntegrationVersion        @relation(fields: [integrationVersionId], references: [id], onDelete: Cascade)
  achievedByIdentity      Identity?                 @relation("IntegrationAcceptanceAchievedBy", fields: [achievedByIdentityId], references: [id])
  authoritativeDesignations AuthoritativeSourceDesignation[]

  @@index([integrationVersionId])
  @@index([acceptanceState])
  @@index([achievedAt])
  @@map("integration_acceptance_records")
}
'''


def main() -> None:
    base = BASE.read_text()
    base = patch_base(base)

    # Extract clean financial block from current corrupted schema
    corrupted = (ROOT / "prisma" / "schema.prisma").read_text()
    fin_start = corrupted.index("model FeeSchedule {")
    fin_end = corrupted.index("\nmodel CommunicationTemplate {", fin_start)
    financial = corrupted[fin_start:fin_end].rstrip()

    schema = base.rstrip() + "\n\n" + PHASE_11 + financial + "\n\n" + COMMUNICATIONS_SECTION + REGISTRY_MODELS

    OUT.write_text(schema)
    print(f"Wrote {OUT} ({len(schema.splitlines())} lines)")


if __name__ == "__main__":
    main()
