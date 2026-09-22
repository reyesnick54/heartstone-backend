-- Land & Property Registry foundation

CREATE TYPE "PropertyPublicVerificationMode" AS ENUM ('DISABLED', 'MINIMAL_FACTS');

CREATE TYPE "PropertyParcelStatus" AS ENUM (
  'DRAFT',
  'REGISTERED',
  'PENDING_SUBDIVISION',
  'PENDING_CONSOLIDATION',
  'SUPERSEDED',
  'SEALED'
);

CREATE TYPE "PropertyInterestKind" AS ENUM (
  'OWNER',
  'LEASEHOLDER',
  'MORTGAGEE',
  'EASEMENT_HOLDER',
  'OTHER'
);

CREATE TYPE "PropertyInterestStatus" AS ENUM ('ACTIVE', 'PENDING', 'RELEASED', 'SUPERSEDED');

CREATE TYPE "PropertyRegistryApplicationType" AS ENUM (
  'SEARCH',
  'EXTRACT_REQUEST',
  'TRANSFER',
  'NEW_PARCEL',
  'SUBDIVISION',
  'CONSOLIDATION',
  'ENCUMBRANCE',
  'ENCUMBRANCE_RELEASE',
  'EASEMENT',
  'SURVEY',
  'CORRECTION',
  'ADDRESS_CHANGE',
  'VALUATION',
  'APPEAL'
);

CREATE TYPE "PropertyRegistryApplicationStatus" AS ENUM (
  'DRAFT',
  'SUBMITTED',
  'UNDER_REVIEW',
  'PENDING_DECISION',
  'APPROVED',
  'REJECTED',
  'WITHDRAWN'
);

CREATE TYPE "PropertyTransferDecisionOutcome" AS ENUM ('APPROVED', 'DENIED', 'DEFERRED');

CREATE TYPE "PropertyEncumbranceKind" AS ENUM ('MORTGAGE', 'LIEN', 'EASEMENT', 'RESTRICTION', 'OTHER');

CREATE TYPE "PropertyEncumbranceStatus" AS ENUM ('ACTIVE', 'RELEASED', 'SUPERSEDED');

CREATE TYPE "PropertySurveySubmissionStatus" AS ENUM ('RECEIVED', 'UNDER_REVIEW', 'ACCEPTED', 'REJECTED');

CREATE TYPE "PropertyCertificateStatus" AS ENUM ('DRAFT', 'PENDING_ISSUANCE', 'ISSUED', 'REVOKED');

CREATE TYPE "PropertyAccessActorKind" AS ENUM (
  'OWNER',
  'REPRESENTATIVE',
  'REGISTRY_OFFICER',
  'PLATFORM_ADMIN',
  'AI_ASSISTANCE',
  'PUBLIC'
);

CREATE TABLE "property_registry_configurations" (
  "id" UUID NOT NULL,
  "jurisdictionId" UUID NOT NULL,
  "configurationKey" TEXT NOT NULL,
  "ruleEnvironment" TEXT NOT NULL DEFAULT 'NON_PRODUCTION',
  "publicVerificationMode" "PropertyPublicVerificationMode" NOT NULL DEFAULT 'DISABLED',
  "parcelIdentifierScheme" JSONB NOT NULL,
  "jurisdictionBoundRules" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "property_registry_configurations_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "property_parcels" (
  "id" UUID NOT NULL,
  "jurisdictionId" UUID NOT NULL,
  "parcelReference" TEXT NOT NULL,
  "internalParcelIdentifier" TEXT,
  "registryVersion" INTEGER NOT NULL DEFAULT 1,
  "status" "PropertyParcelStatus" NOT NULL DEFAULT 'DRAFT',
  "administrativeAddressSummary" TEXT,
  "publicVerificationReference" TEXT,
  "sealedDataReference" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "property_parcels_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "property_interests" (
  "id" UUID NOT NULL,
  "parcelId" UUID NOT NULL,
  "interestKind" "PropertyInterestKind" NOT NULL,
  "status" "PropertyInterestStatus" NOT NULL DEFAULT 'PENDING',
  "identityId" UUID,
  "organizationId" UUID,
  "shareNumerator" INTEGER,
  "shareDenominator" INTEGER,
  "effectiveFrom" TIMESTAMP(3),
  "effectiveUntil" TIMESTAMP(3),
  "supersededByInterestId" UUID,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "property_interests_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "property_ownership_history" (
  "id" UUID NOT NULL,
  "parcelId" UUID NOT NULL,
  "fromInterestId" UUID,
  "toInterestId" UUID,
  "eventSummary" TEXT NOT NULL,
  "registryVersion" INTEGER NOT NULL,
  "preserved" BOOLEAN NOT NULL DEFAULT true,
  "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "transferDecisionId" UUID,

  CONSTRAINT "property_ownership_history_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "property_registry_applications" (
  "id" UUID NOT NULL,
  "parcelId" UUID,
  "applicationType" "PropertyRegistryApplicationType" NOT NULL,
  "status" "PropertyRegistryApplicationStatus" NOT NULL DEFAULT 'DRAFT',
  "applicantIdentityId" UUID NOT NULL,
  "organizationId" UUID,
  "applicationReference" TEXT NOT NULL,
  "mayMutateTitle" BOOLEAN NOT NULL DEFAULT false,
  "submittedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "property_registry_applications_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "property_transfer_decisions" (
  "id" UUID NOT NULL,
  "applicationId" UUID NOT NULL,
  "outcome" "PropertyTransferDecisionOutcome" NOT NULL,
  "decidedByIdentityId" UUID,
  "decidedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "rationale" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "property_transfer_decisions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "property_encumbrances" (
  "id" UUID NOT NULL,
  "parcelId" UUID NOT NULL,
  "encumbranceKind" "PropertyEncumbranceKind" NOT NULL,
  "status" "PropertyEncumbranceStatus" NOT NULL DEFAULT 'ACTIVE',
  "holderSummary" TEXT NOT NULL,
  "disclosureLevel" TEXT NOT NULL DEFAULT 'AUTHORIZED',
  "registeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "releasedAt" TIMESTAMP(3),
  "applicationId" UUID,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "property_encumbrances_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "property_encumbrance_history" (
  "id" UUID NOT NULL,
  "parcelId" UUID NOT NULL,
  "encumbranceKind" "PropertyEncumbranceKind" NOT NULL,
  "eventSummary" TEXT NOT NULL,
  "preserved" BOOLEAN NOT NULL DEFAULT true,
  "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "property_encumbrance_history_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "property_survey_submissions" (
  "id" UUID NOT NULL,
  "parcelId" UUID NOT NULL,
  "applicationId" UUID NOT NULL,
  "status" "PropertySurveySubmissionStatus" NOT NULL DEFAULT 'RECEIVED',
  "altersParcelGeometry" BOOLEAN NOT NULL DEFAULT false,
  "registryVersionAtSubmission" INTEGER NOT NULL,
  "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "property_survey_submissions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "property_registry_certificates" (
  "id" UUID NOT NULL,
  "parcelId" UUID NOT NULL,
  "certificateReference" TEXT NOT NULL,
  "status" "PropertyCertificateStatus" NOT NULL DEFAULT 'DRAFT',
  "registryVersionNumber" INTEGER NOT NULL,
  "issuedAt" TIMESTAMP(3),
  "issuedByIdentityId" UUID,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "property_registry_certificates_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "property_interest_entitlements" (
  "id" UUID NOT NULL,
  "parcelId" UUID NOT NULL,
  "identityId" UUID NOT NULL,
  "entitlementKind" "PropertyInterestKind" NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "property_interest_entitlements_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "property_access_audits" (
  "id" UUID NOT NULL,
  "accessorIdentityId" UUID,
  "parcelId" UUID,
  "actorKind" "PropertyAccessActorKind" NOT NULL,
  "endpoint" TEXT NOT NULL,
  "granted" BOOLEAN NOT NULL,
  "reasonCode" TEXT,
  "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "property_access_audits_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "property_registry_configurations_jurisdictionId_key" ON "property_registry_configurations"("jurisdictionId");
CREATE UNIQUE INDEX "property_registry_configurations_configurationKey_key" ON "property_registry_configurations"("configurationKey");

CREATE UNIQUE INDEX "property_parcels_parcelReference_key" ON "property_parcels"("parcelReference");
CREATE UNIQUE INDEX "property_parcels_publicVerificationReference_key" ON "property_parcels"("publicVerificationReference");
CREATE INDEX "property_parcels_jurisdictionId_idx" ON "property_parcels"("jurisdictionId");
CREATE INDEX "property_parcels_status_idx" ON "property_parcels"("status");

CREATE INDEX "property_interests_parcelId_idx" ON "property_interests"("parcelId");
CREATE INDEX "property_interests_identityId_idx" ON "property_interests"("identityId");
CREATE INDEX "property_interests_organizationId_idx" ON "property_interests"("organizationId");
CREATE INDEX "property_interests_status_idx" ON "property_interests"("status");

CREATE INDEX "property_ownership_history_parcelId_idx" ON "property_ownership_history"("parcelId");

CREATE UNIQUE INDEX "property_registry_applications_applicationReference_key" ON "property_registry_applications"("applicationReference");
CREATE INDEX "property_registry_applications_parcelId_idx" ON "property_registry_applications"("parcelId");
CREATE INDEX "property_registry_applications_applicationType_idx" ON "property_registry_applications"("applicationType");
CREATE INDEX "property_registry_applications_status_idx" ON "property_registry_applications"("status");
CREATE INDEX "property_registry_applications_applicantIdentityId_idx" ON "property_registry_applications"("applicantIdentityId");

CREATE UNIQUE INDEX "property_transfer_decisions_applicationId_key" ON "property_transfer_decisions"("applicationId");
CREATE INDEX "property_transfer_decisions_outcome_idx" ON "property_transfer_decisions"("outcome");

CREATE INDEX "property_encumbrances_parcelId_idx" ON "property_encumbrances"("parcelId");
CREATE INDEX "property_encumbrances_status_idx" ON "property_encumbrances"("status");

CREATE INDEX "property_encumbrance_history_parcelId_idx" ON "property_encumbrance_history"("parcelId");

CREATE UNIQUE INDEX "property_survey_submissions_applicationId_key" ON "property_survey_submissions"("applicationId");
CREATE INDEX "property_survey_submissions_parcelId_idx" ON "property_survey_submissions"("parcelId");

CREATE UNIQUE INDEX "property_registry_certificates_certificateReference_key" ON "property_registry_certificates"("certificateReference");
CREATE INDEX "property_registry_certificates_parcelId_idx" ON "property_registry_certificates"("parcelId");
CREATE INDEX "property_registry_certificates_status_idx" ON "property_registry_certificates"("status");

CREATE UNIQUE INDEX "property_interest_entitlements_parcelId_identityId_entitlementKind_key" ON "property_interest_entitlements"("parcelId", "identityId", "entitlementKind");
CREATE INDEX "property_interest_entitlements_identityId_idx" ON "property_interest_entitlements"("identityId");

CREATE INDEX "property_access_audits_accessorIdentityId_idx" ON "property_access_audits"("accessorIdentityId");
CREATE INDEX "property_access_audits_parcelId_idx" ON "property_access_audits"("parcelId");

ALTER TABLE "property_registry_configurations" ADD CONSTRAINT "property_registry_configurations_jurisdictionId_fkey" FOREIGN KEY ("jurisdictionId") REFERENCES "jurisdictions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "property_parcels" ADD CONSTRAINT "property_parcels_jurisdictionId_fkey" FOREIGN KEY ("jurisdictionId") REFERENCES "jurisdictions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "property_interests" ADD CONSTRAINT "property_interests_parcelId_fkey" FOREIGN KEY ("parcelId") REFERENCES "property_parcels"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "property_interests" ADD CONSTRAINT "property_interests_identityId_fkey" FOREIGN KEY ("identityId") REFERENCES "identities"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "property_interests" ADD CONSTRAINT "property_interests_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "property_interests" ADD CONSTRAINT "property_interests_supersededByInterestId_fkey" FOREIGN KEY ("supersededByInterestId") REFERENCES "property_interests"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "property_ownership_history" ADD CONSTRAINT "property_ownership_history_parcelId_fkey" FOREIGN KEY ("parcelId") REFERENCES "property_parcels"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "property_ownership_history" ADD CONSTRAINT "property_ownership_history_fromInterestId_fkey" FOREIGN KEY ("fromInterestId") REFERENCES "property_interests"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "property_ownership_history" ADD CONSTRAINT "property_ownership_history_toInterestId_fkey" FOREIGN KEY ("toInterestId") REFERENCES "property_interests"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "property_ownership_history" ADD CONSTRAINT "property_ownership_history_transferDecisionId_fkey" FOREIGN KEY ("transferDecisionId") REFERENCES "property_transfer_decisions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "property_registry_applications" ADD CONSTRAINT "property_registry_applications_parcelId_fkey" FOREIGN KEY ("parcelId") REFERENCES "property_parcels"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "property_registry_applications" ADD CONSTRAINT "property_registry_applications_applicantIdentityId_fkey" FOREIGN KEY ("applicantIdentityId") REFERENCES "identities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "property_transfer_decisions" ADD CONSTRAINT "property_transfer_decisions_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "property_registry_applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "property_transfer_decisions" ADD CONSTRAINT "property_transfer_decisions_decidedByIdentityId_fkey" FOREIGN KEY ("decidedByIdentityId") REFERENCES "identities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "property_encumbrances" ADD CONSTRAINT "property_encumbrances_parcelId_fkey" FOREIGN KEY ("parcelId") REFERENCES "property_parcels"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "property_encumbrance_history" ADD CONSTRAINT "property_encumbrance_history_parcelId_fkey" FOREIGN KEY ("parcelId") REFERENCES "property_parcels"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "property_survey_submissions" ADD CONSTRAINT "property_survey_submissions_parcelId_fkey" FOREIGN KEY ("parcelId") REFERENCES "property_parcels"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "property_survey_submissions" ADD CONSTRAINT "property_survey_submissions_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "property_registry_applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "property_registry_certificates" ADD CONSTRAINT "property_registry_certificates_parcelId_fkey" FOREIGN KEY ("parcelId") REFERENCES "property_parcels"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "property_registry_certificates" ADD CONSTRAINT "property_registry_certificates_issuedByIdentityId_fkey" FOREIGN KEY ("issuedByIdentityId") REFERENCES "identities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "property_interest_entitlements" ADD CONSTRAINT "property_interest_entitlements_parcelId_fkey" FOREIGN KEY ("parcelId") REFERENCES "property_parcels"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "property_interest_entitlements" ADD CONSTRAINT "property_interest_entitlements_identityId_fkey" FOREIGN KEY ("identityId") REFERENCES "identities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "property_access_audits" ADD CONSTRAINT "property_access_audits_accessorIdentityId_fkey" FOREIGN KEY ("accessorIdentityId") REFERENCES "identities"("id") ON DELETE SET NULL ON UPDATE CASCADE;
