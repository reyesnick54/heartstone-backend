-- Corporate Registry / Business Formation domain

CREATE TYPE "CorporateEntityType" AS ENUM ('COMPANY', 'SOLE_TRADER', 'FOREIGN_COMPANY', 'BRANCH');

CREATE TYPE "CorporateRegistrationStatus" AS ENUM (
  'DRAFT',
  'PENDING_DECISION',
  'ACTIVE',
  'DISSOLVED',
  'RESTORED',
  'SUSPENDED'
);

CREATE TYPE "CorporateRegistryRecordStatus" AS ENUM (
  'DRAFT',
  'PENDING_REVIEW',
  'APPROVED',
  'REJECTED',
  'SUPERSEDED'
);

CREATE TYPE "CorporateFilingType" AS ENUM (
  'ANNUAL',
  'AMENDMENT',
  'BENEFICIAL_OWNERSHIP',
  'INITIAL',
  'OTHER'
);

CREATE TYPE "CorporateFilingStatus" AS ENUM (
  'DRAFT',
  'SUBMITTED',
  'UNDER_REVIEW',
  'ACCEPTED',
  'REJECTED',
  'OVERDUE'
);

CREATE TYPE "CorporateOfficerRole" AS ENUM ('DIRECTOR', 'OFFICER', 'SECRETARY', 'OTHER');

CREATE TYPE "CorporateRegistryActionType" AS ENUM (
  'NAME_RESERVATION',
  'INCORPORATION',
  'AMENDMENT',
  'ANNUAL_FILING',
  'BENEFICIAL_OWNERSHIP_REVIEW',
  'DISSOLUTION',
  'RESTORATION',
  'CERTIFICATE_ISSUANCE',
  'RECORD_CORRECTION',
  'COMPLIANCE',
  'OTHER'
);

CREATE TYPE "CorporateRegistryActionStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

CREATE TYPE "CorporateCertificateStatus" AS ENUM ('DRAFT', 'PENDING_ISSUANCE', 'ISSUED', 'REVOKED');

CREATE TYPE "CorporateRegistryDecisionType" AS ENUM (
  'INCORPORATION',
  'REGISTRATION',
  'AMENDMENT',
  'DISSOLUTION',
  'RESTORATION',
  'CERTIFICATE_ISSUANCE',
  'RECORD_CORRECTION',
  'NAME_RESERVATION'
);

CREATE TYPE "CorporateRegistryStatusEventType" AS ENUM (
  'STATUS_CHANGE',
  'DISSOLUTION',
  'RESTORATION',
  'PAYMENT_RECEIVED',
  'OFFICIAL_DECISION'
);

CREATE TYPE "CorporatePublicVerificationMode" AS ENUM ('DISABLED', 'MINIMAL_FACTS');

CREATE TABLE "corporate_registry_configurations" (
  "id" UUID NOT NULL,
  "configurationKey" TEXT NOT NULL,
  "publicVerificationMode" "CorporatePublicVerificationMode" NOT NULL DEFAULT 'DISABLED',
  "exposeRegisteredOfficePublicly" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "corporate_registry_configurations_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "corporate_registry_profiles" (
  "id" UUID NOT NULL,
  "organizationId" UUID NOT NULL,
  "registeredName" TEXT,
  "registrationReference" TEXT,
  "registrationStatus" "CorporateRegistrationStatus" NOT NULL DEFAULT 'DRAFT',
  "entityType" "CorporateEntityType",
  "registrationDate" TIMESTAMP(3),
  "jurisdictionCode" TEXT,
  "filingStatusSummary" TEXT,
  "publicVerificationReference" TEXT,
  "recordApprovalStatus" "CorporateRegistryRecordStatus" NOT NULL DEFAULT 'DRAFT',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "corporate_registry_profiles_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "corporate_registered_offices" (
  "id" UUID NOT NULL,
  "profileId" UUID NOT NULL,
  "addressLine1" TEXT NOT NULL,
  "addressLine2" TEXT,
  "city" TEXT,
  "region" TEXT,
  "countryCode" TEXT,
  "recordStatus" "CorporateRegistryRecordStatus" NOT NULL DEFAULT 'DRAFT',
  "effectiveFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "supersededAt" TIMESTAMP(3),
  "isCurrent" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "corporate_registered_offices_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "corporate_officer_disclosures" (
  "id" UUID NOT NULL,
  "profileId" UUID NOT NULL,
  "displayName" TEXT NOT NULL,
  "role" "CorporateOfficerRole" NOT NULL,
  "permitsPublicDisclosure" BOOLEAN NOT NULL DEFAULT false,
  "recordStatus" "CorporateRegistryRecordStatus" NOT NULL DEFAULT 'DRAFT',
  "effectiveFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "supersededAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "corporate_officer_disclosures_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "corporate_filings" (
  "id" UUID NOT NULL,
  "profileId" UUID NOT NULL,
  "filingType" "CorporateFilingType" NOT NULL,
  "status" "CorporateFilingStatus" NOT NULL DEFAULT 'DRAFT',
  "label" TEXT NOT NULL,
  "dueDate" TIMESTAMP(3),
  "submittedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "corporate_filings_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "corporate_beneficial_ownership_declarations" (
  "id" UUID NOT NULL,
  "profileId" UUID NOT NULL,
  "declarationReference" TEXT NOT NULL,
  "status" "CorporateFilingStatus" NOT NULL DEFAULT 'DRAFT',
  "restrictedSummary" TEXT NOT NULL,
  "recordApprovalStatus" "CorporateRegistryRecordStatus" NOT NULL DEFAULT 'DRAFT',
  "submittedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "corporate_beneficial_ownership_declarations_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "corporate_certificates" (
  "id" UUID NOT NULL,
  "profileId" UUID NOT NULL,
  "certificateReference" TEXT NOT NULL,
  "status" "CorporateCertificateStatus" NOT NULL DEFAULT 'DRAFT',
  "label" TEXT NOT NULL,
  "issuedAt" TIMESTAMP(3),
  "sourceRecordStatus" "CorporateRegistryRecordStatus" NOT NULL DEFAULT 'DRAFT',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "corporate_certificates_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "corporate_registry_actions" (
  "id" UUID NOT NULL,
  "profileId" UUID NOT NULL,
  "actionType" "CorporateRegistryActionType" NOT NULL,
  "status" "CorporateRegistryActionStatus" NOT NULL DEFAULT 'OPEN',
  "label" TEXT NOT NULL,
  "dueDate" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "corporate_registry_actions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "corporate_registry_official_decisions" (
  "id" UUID NOT NULL,
  "profileId" UUID NOT NULL,
  "decisionType" "CorporateRegistryDecisionType" NOT NULL,
  "approved" BOOLEAN NOT NULL,
  "caseId" UUID,
  "decidedByIdentityId" UUID,
  "decidedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "rationale" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "corporate_registry_official_decisions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "corporate_registry_status_history" (
  "id" UUID NOT NULL,
  "profileId" UUID NOT NULL,
  "eventType" "CorporateRegistryStatusEventType" NOT NULL,
  "fromStatus" "CorporateRegistrationStatus",
  "toStatus" "CorporateRegistrationStatus",
  "summary" TEXT NOT NULL,
  "preserved" BOOLEAN NOT NULL DEFAULT true,
  "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "decisionId" UUID,

  CONSTRAINT "corporate_registry_status_history_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "corporate_registry_payment_events" (
  "id" UUID NOT NULL,
  "profileId" UUID NOT NULL,
  "paymentReference" TEXT NOT NULL,
  "amount" DECIMAL(18,2) NOT NULL,
  "currencyCode" TEXT NOT NULL,
  "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "activatesEntity" BOOLEAN NOT NULL DEFAULT false,

  CONSTRAINT "corporate_registry_payment_events_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "corporate_registry_configurations_configurationKey_key" ON "corporate_registry_configurations"("configurationKey");

CREATE UNIQUE INDEX "corporate_registry_profiles_organizationId_key" ON "corporate_registry_profiles"("organizationId");
CREATE UNIQUE INDEX "corporate_registry_profiles_registrationReference_key" ON "corporate_registry_profiles"("registrationReference");
CREATE UNIQUE INDEX "corporate_registry_profiles_publicVerificationReference_key" ON "corporate_registry_profiles"("publicVerificationReference");
CREATE INDEX "corporate_registry_profiles_registrationStatus_idx" ON "corporate_registry_profiles"("registrationStatus");
CREATE INDEX "corporate_registry_profiles_registrationReference_idx" ON "corporate_registry_profiles"("registrationReference");

CREATE INDEX "corporate_registered_offices_profileId_idx" ON "corporate_registered_offices"("profileId");
CREATE INDEX "corporate_registered_offices_recordStatus_idx" ON "corporate_registered_offices"("recordStatus");

CREATE INDEX "corporate_officer_disclosures_profileId_idx" ON "corporate_officer_disclosures"("profileId");

CREATE INDEX "corporate_filings_profileId_idx" ON "corporate_filings"("profileId");
CREATE INDEX "corporate_filings_status_idx" ON "corporate_filings"("status");

CREATE UNIQUE INDEX "corporate_beneficial_ownership_declarations_declarationReference_key" ON "corporate_beneficial_ownership_declarations"("declarationReference");
CREATE INDEX "corporate_beneficial_ownership_declarations_profileId_idx" ON "corporate_beneficial_ownership_declarations"("profileId");

CREATE UNIQUE INDEX "corporate_certificates_certificateReference_key" ON "corporate_certificates"("certificateReference");
CREATE INDEX "corporate_certificates_profileId_idx" ON "corporate_certificates"("profileId");
CREATE INDEX "corporate_certificates_status_idx" ON "corporate_certificates"("status");

CREATE INDEX "corporate_registry_actions_profileId_idx" ON "corporate_registry_actions"("profileId");
CREATE INDEX "corporate_registry_actions_status_idx" ON "corporate_registry_actions"("status");
CREATE INDEX "corporate_registry_actions_actionType_idx" ON "corporate_registry_actions"("actionType");

CREATE INDEX "corporate_registry_official_decisions_profileId_idx" ON "corporate_registry_official_decisions"("profileId");
CREATE INDEX "corporate_registry_official_decisions_decisionType_idx" ON "corporate_registry_official_decisions"("decisionType");

CREATE INDEX "corporate_registry_status_history_profileId_idx" ON "corporate_registry_status_history"("profileId");
CREATE INDEX "corporate_registry_status_history_eventType_idx" ON "corporate_registry_status_history"("eventType");

CREATE UNIQUE INDEX "corporate_registry_payment_events_paymentReference_key" ON "corporate_registry_payment_events"("paymentReference");
CREATE INDEX "corporate_registry_payment_events_profileId_idx" ON "corporate_registry_payment_events"("profileId");

ALTER TABLE "corporate_registry_profiles"
  ADD CONSTRAINT "corporate_registry_profiles_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "corporate_registered_offices"
  ADD CONSTRAINT "corporate_registered_offices_profileId_fkey"
  FOREIGN KEY ("profileId") REFERENCES "corporate_registry_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "corporate_officer_disclosures"
  ADD CONSTRAINT "corporate_officer_disclosures_profileId_fkey"
  FOREIGN KEY ("profileId") REFERENCES "corporate_registry_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "corporate_filings"
  ADD CONSTRAINT "corporate_filings_profileId_fkey"
  FOREIGN KEY ("profileId") REFERENCES "corporate_registry_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "corporate_beneficial_ownership_declarations"
  ADD CONSTRAINT "corporate_beneficial_ownership_declarations_profileId_fkey"
  FOREIGN KEY ("profileId") REFERENCES "corporate_registry_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "corporate_certificates"
  ADD CONSTRAINT "corporate_certificates_profileId_fkey"
  FOREIGN KEY ("profileId") REFERENCES "corporate_registry_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "corporate_registry_actions"
  ADD CONSTRAINT "corporate_registry_actions_profileId_fkey"
  FOREIGN KEY ("profileId") REFERENCES "corporate_registry_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "corporate_registry_official_decisions"
  ADD CONSTRAINT "corporate_registry_official_decisions_profileId_fkey"
  FOREIGN KEY ("profileId") REFERENCES "corporate_registry_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "corporate_registry_status_history"
  ADD CONSTRAINT "corporate_registry_status_history_profileId_fkey"
  FOREIGN KEY ("profileId") REFERENCES "corporate_registry_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "corporate_registry_status_history"
  ADD CONSTRAINT "corporate_registry_status_history_decisionId_fkey"
  FOREIGN KEY ("decisionId") REFERENCES "corporate_registry_official_decisions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "corporate_registry_payment_events"
  ADD CONSTRAINT "corporate_registry_payment_events_profileId_fkey"
  FOREIGN KEY ("profileId") REFERENCES "corporate_registry_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
