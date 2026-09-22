-- CreateEnum
CREATE TYPE "PropertyRegistryAccessClassification" AS ENUM ('PUBLIC_REGISTRY', 'SUBJECT_ACCESS', 'AUTHORIZED_PROFESSIONAL', 'GOVERNMENT_RESTRICTED', 'SEALED');

-- CreateEnum
CREATE TYPE "PropertyTransferApplicationStatus" AS ENUM ('INTAKE_DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'PENDING_AUTHORITY', 'REGISTERED_OFFICIAL', 'REJECTED', 'WITHDRAWN');

-- CreateEnum
CREATE TYPE "TitleRecordStatus" AS ENUM ('ACTIVE', 'SUPERSEDED', 'CORRECTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PropertyInterestType" AS ENUM ('OWNERSHIP', 'LEASEHOLD', 'EASEMENT_BENEFIT', 'MORTGAGE_INTEREST', 'OTHER');

-- CreateEnum
CREATE TYPE "PropertyInterestHolderRole" AS ENUM ('OWNER', 'CO_OWNER', 'LESSEE', 'MORTGAGEE', 'BENEFICIARY', 'REPRESENTATIVE', 'OTHER');

-- CreateEnum
CREATE TYPE "PropertyEncumbranceType" AS ENUM ('MORTGAGE', 'LIEN', 'EASEMENT', 'CAVEAT', 'RESTRICTION', 'COURT_ORDER', 'GOVERNMENT_RESTRICTION', 'OTHER');

-- CreateEnum
CREATE TYPE "PropertyEncumbranceStatus" AS ENUM ('ACTIVE', 'RELEASED', 'SUPERSEDED');

-- CreateEnum
CREATE TYPE "PropertyValuationPurpose" AS ENUM ('TAXATION', 'GOVERNMENT_ACQUISITION', 'MARKET_REFERENCE', 'OTHER');

-- CreateEnum
CREATE TYPE "PropertyRegistryVerificationState" AS ENUM ('UNVERIFIED', 'PENDING_VERIFICATION', 'VERIFIED', 'DISPUTED');

-- CreateEnum
CREATE TYPE "PropertyRegistryCorrectionStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'APPROVED_FOR_CORRECTION', 'DENIED', 'WITHDRAWN');

-- CreateEnum
CREATE TYPE "PropertyRegistryAuditEventType" AS ENUM ('PARCEL_RECORDED', 'TRANSFER_INTAKE_CREATED', 'TRANSFER_FEE_RECORDED', 'TITLE_REGISTRATION_REQUESTED', 'TITLE_VERSION_RECORDED', 'ENCUMBRANCE_RECORDED', 'ENCUMBRANCE_RELEASE_REQUESTED', 'ENCUMBRANCE_DELETE_BLOCKED', 'CORRECTION_SUBMITTED', 'ACCESS_DENIED', 'VERIFICATION_UPDATED', 'DELETE_BLOCKED');

-- CreateEnum
CREATE TYPE "TransferPartyRole" AS ENUM ('TRANSFEROR', 'TRANSFEREE', 'REPRESENTATIVE', 'WITNESS', 'OTHER');

-- CreateEnum
CREATE TYPE "PropertyTransactionHistoryEventType" AS ENUM ('TRANSFER_APPLICATION', 'FEE_PAYMENT', 'TITLE_REGISTRATION', 'ENCUMBRANCE_REGISTRATION', 'ENCUMBRANCE_RELEASE', 'CORRECTION', 'VERIFICATION');

-- CreateTable
CREATE TABLE "land_parcels" (
    "id" UUID NOT NULL,
    "parcelReference" TEXT NOT NULL,
    "jurisdictionId" UUID NOT NULL,
    "institutionId" UUID NOT NULL,
    "description" TEXT,
    "accessClassification" "PropertyRegistryAccessClassification" NOT NULL DEFAULT 'PUBLIC_REGISTRY',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "land_parcels_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "parcel_identifiers" (
    "id" UUID NOT NULL,
    "landParcelId" UUID NOT NULL,
    "identifierType" TEXT NOT NULL,
    "identifierValue" TEXT NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "effectiveFrom" TIMESTAMP(3),
    "effectiveTo" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "parcel_identifiers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "parcel_geometry_references" (
    "id" UUID NOT NULL,
    "landParcelId" UUID NOT NULL,
    "geometryReference" TEXT,
    "mapLayerReference" TEXT,
    "surveyReference" TEXT,
    "coordinateSystem" TEXT,
    "authoritativeSource" TEXT,
    "externalParcelReference" TEXT,
    "provenanceSummary" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "parcel_geometry_references_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "parcel_addresses" (
    "id" UUID NOT NULL,
    "landParcelId" UUID NOT NULL,
    "addressType" TEXT NOT NULL DEFAULT 'SITE',
    "addressLines" JSONB NOT NULL DEFAULT '{}',
    "localityReference" TEXT,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "parcel_addresses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "property_records" (
    "id" UUID NOT NULL,
    "propertyReference" TEXT NOT NULL,
    "landParcelId" UUID NOT NULL,
    "jurisdictionId" UUID NOT NULL,
    "institutionId" UUID NOT NULL,
    "administrativeStatus" TEXT NOT NULL DEFAULT 'ACTIVE',
    "accessClassification" "PropertyRegistryAccessClassification" NOT NULL DEFAULT 'SUBJECT_ACCESS',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "property_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "title_records" (
    "id" UUID NOT NULL,
    "titleReference" TEXT NOT NULL,
    "propertyRecordId" UUID NOT NULL,
    "landParcelId" UUID NOT NULL,
    "jurisdictionId" UUID NOT NULL,
    "institutionId" UUID NOT NULL,
    "status" "TitleRecordStatus" NOT NULL DEFAULT 'ACTIVE',
    "currentVersionNumber" INTEGER NOT NULL DEFAULT 0,
    "accessClassification" "PropertyRegistryAccessClassification" NOT NULL DEFAULT 'SUBJECT_ACCESS',
    "registeredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "title_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "title_versions" (
    "id" UUID NOT NULL,
    "titleRecordId" UUID NOT NULL,
    "versionNumber" INTEGER NOT NULL,
    "effectiveFrom" TIMESTAMP(3) NOT NULL,
    "registrationDate" TIMESTAMP(3),
    "supersededAt" TIMESTAMP(3),
    "payloadSnapshot" JSONB NOT NULL,
    "integrityHash" TEXT,
    "isCurrent" BOOLEAN NOT NULL DEFAULT true,
    "governingDecisionId" UUID,
    "authorityEvaluationRecordId" UUID,
    "registrarOfficeholderId" UUID,
    "registrarIdentityId" UUID,
    "transferBasisSummary" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "title_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "property_interests" (
    "id" UUID NOT NULL,
    "titleRecordId" UUID NOT NULL,
    "interestType" "PropertyInterestType" NOT NULL,
    "interestReference" TEXT,
    "shareNumerator" INTEGER,
    "shareDenominator" INTEGER,
    "effectiveFrom" TIMESTAMP(3),
    "effectiveTo" TIMESTAMP(3),
    "isCurrent" BOOLEAN NOT NULL DEFAULT true,
    "accessClassification" "PropertyRegistryAccessClassification" NOT NULL DEFAULT 'SUBJECT_ACCESS',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "property_interests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "property_interest_holders" (
    "id" UUID NOT NULL,
    "propertyInterestId" UUID NOT NULL,
    "holderRole" "PropertyInterestHolderRole" NOT NULL,
    "personId" UUID,
    "organizationId" UUID,
    "identityId" UUID,
    "displayLabel" TEXT NOT NULL,
    "effectiveFrom" TIMESTAMP(3),
    "effectiveTo" TIMESTAMP(3),
    "isCurrent" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "property_interest_holders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "property_interest_history" (
    "id" UUID NOT NULL,
    "propertyInterestId" UUID NOT NULL,
    "fromTitleVersionId" UUID,
    "toTitleVersionId" UUID,
    "priorHolderId" UUID,
    "newHolderId" UUID,
    "propertyTransferId" UUID,
    "governingDecisionId" UUID,
    "changeSummary" JSONB NOT NULL DEFAULT '{}',
    "effectiveDate" TIMESTAMP(3) NOT NULL,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "property_interest_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "title_instrument_references" (
    "id" UUID NOT NULL,
    "titleRecordId" UUID NOT NULL,
    "officialInstrumentId" UUID,
    "instrumentRole" TEXT NOT NULL DEFAULT 'SUPPORTING',
    "referenceSummary" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "title_instrument_references_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "property_transfers" (
    "id" UUID NOT NULL,
    "transferReference" TEXT NOT NULL,
    "applicationStatus" "PropertyTransferApplicationStatus" NOT NULL DEFAULT 'INTAKE_DRAFT',
    "landParcelId" UUID NOT NULL,
    "propertyRecordId" UUID NOT NULL,
    "titleRecordId" UUID,
    "jurisdictionId" UUID NOT NULL,
    "institutionId" UUID NOT NULL,
    "applicationId" UUID,
    "caseId" UUID,
    "governmentServiceId" UUID,
    "governingServicePackVersionId" UUID,
    "transferFeePaymentTransactionId" UUID,
    "transferBasisSummary" JSONB NOT NULL DEFAULT '{}',
    "accessClassification" "PropertyRegistryAccessClassification" NOT NULL DEFAULT 'SUBJECT_ACCESS',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "property_transfers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transfer_parties" (
    "id" UUID NOT NULL,
    "propertyTransferId" UUID NOT NULL,
    "partyRole" "TransferPartyRole" NOT NULL,
    "personId" UUID,
    "organizationId" UUID,
    "identityId" UUID,
    "representativeAuthorityId" UUID,
    "displayLabel" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "transfer_parties_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "property_encumbrances" (
    "id" UUID NOT NULL,
    "encumbranceReference" TEXT NOT NULL,
    "titleRecordId" UUID NOT NULL,
    "encumbranceType" "PropertyEncumbranceType" NOT NULL,
    "status" "PropertyEncumbranceStatus" NOT NULL DEFAULT 'ACTIVE',
    "effectiveFrom" TIMESTAMP(3),
    "effectiveTo" TIMESTAMP(3),
    "releaseDecisionId" UUID,
    "accessClassification" "PropertyRegistryAccessClassification" NOT NULL DEFAULT 'SUBJECT_ACCESS',
    "summary" TEXT,
    "provenanceSummary" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "property_encumbrances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mortgage_references" (
    "propertyEncumbranceId" UUID NOT NULL,
    "lenderReference" TEXT,
    "principalReference" TEXT,
    "additionalAttributes" JSONB NOT NULL DEFAULT '{}',

    CONSTRAINT "mortgage_references_pkey" PRIMARY KEY ("propertyEncumbranceId")
);

-- CreateTable
CREATE TABLE "lien_references" (
    "propertyEncumbranceId" UUID NOT NULL,
    "lienHolderReference" TEXT,
    "amountReference" TEXT,
    "additionalAttributes" JSONB NOT NULL DEFAULT '{}',

    CONSTRAINT "lien_references_pkey" PRIMARY KEY ("propertyEncumbranceId")
);

-- CreateTable
CREATE TABLE "easement_references" (
    "propertyEncumbranceId" UUID NOT NULL,
    "beneficiaryReference" TEXT,
    "burdenDescription" TEXT,
    "additionalAttributes" JSONB NOT NULL DEFAULT '{}',

    CONSTRAINT "easement_references_pkey" PRIMARY KEY ("propertyEncumbranceId")
);

-- CreateTable
CREATE TABLE "restriction_references" (
    "propertyEncumbranceId" UUID NOT NULL,
    "restrictionSource" TEXT,
    "restrictionText" TEXT,
    "additionalAttributes" JSONB NOT NULL DEFAULT '{}',

    CONSTRAINT "restriction_references_pkey" PRIMARY KEY ("propertyEncumbranceId")
);

-- CreateTable
CREATE TABLE "survey_records" (
    "id" UUID NOT NULL,
    "surveyReference" TEXT NOT NULL,
    "landParcelId" UUID NOT NULL,
    "jurisdictionId" UUID NOT NULL,
    "institutionId" UUID NOT NULL,
    "surveyDate" TIMESTAMP(3),
    "verificationState" "PropertyRegistryVerificationState" NOT NULL DEFAULT 'UNVERIFIED',
    "provenanceSummary" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "survey_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "survey_plan_references" (
    "id" UUID NOT NULL,
    "surveyRecordId" UUID NOT NULL,
    "planReference" TEXT NOT NULL,
    "documentRecordId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "survey_plan_references_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "surveyor_certification_references" (
    "id" UUID NOT NULL,
    "surveyRecordId" UUID NOT NULL,
    "surveyorReference" TEXT NOT NULL,
    "certificationReference" TEXT,
    "certifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "surveyor_certification_references_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "property_valuation_records" (
    "id" UUID NOT NULL,
    "propertyRecordId" UUID NOT NULL,
    "valuationPurpose" "PropertyValuationPurpose" NOT NULL,
    "valuationReference" TEXT,
    "amountReference" TEXT,
    "currencyCode" TEXT,
    "effectiveDate" TIMESTAMP(3) NOT NULL,
    "accessClassification" "PropertyRegistryAccessClassification" NOT NULL DEFAULT 'GOVERNMENT_RESTRICTED',
    "provenanceSummary" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "property_valuation_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "property_tax_references" (
    "id" UUID NOT NULL,
    "propertyRecordId" UUID NOT NULL,
    "taxpayerAccountId" UUID,
    "taxPeriodReference" TEXT,
    "externalTaxReference" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "property_tax_references_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "property_registry_entries" (
    "id" UUID NOT NULL,
    "entryReference" TEXT NOT NULL,
    "propertyRecordId" UUID NOT NULL,
    "titleRecordId" UUID NOT NULL,
    "propertyTransferId" UUID,
    "jurisdictionId" UUID NOT NULL,
    "institutionId" UUID NOT NULL,
    "caseId" UUID NOT NULL,
    "governmentDecisionId" UUID NOT NULL,
    "authorityEvaluationRecordId" UUID NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OFFICIAL',
    "accessClassification" "PropertyRegistryAccessClassification" NOT NULL DEFAULT 'SUBJECT_ACCESS',
    "registeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "property_registry_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "property_registry_corrections" (
    "id" UUID NOT NULL,
    "correctionReference" TEXT NOT NULL,
    "propertyRegistryEntryId" UUID NOT NULL,
    "status" "PropertyRegistryCorrectionStatus" NOT NULL DEFAULT 'DRAFT',
    "applicantIdentityId" UUID NOT NULL,
    "governmentDecisionId" UUID,
    "authorityEvaluationRecordId" UUID,
    "previousTitleVersionId" UUID,
    "newTitleVersionId" UUID,
    "requestedChanges" JSONB NOT NULL DEFAULT '{}',
    "submittedAt" TIMESTAMP(3),
    "decidedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "property_registry_corrections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "property_registry_verifications" (
    "id" UUID NOT NULL,
    "propertyRegistryEntryId" UUID NOT NULL,
    "verificationState" "PropertyRegistryVerificationState" NOT NULL,
    "methodReference" TEXT NOT NULL,
    "verifiedAt" TIMESTAMP(3),
    "verifiedByOfficeholderId" UUID,
    "verifiedByIdentityId" UUID,
    "authorityEvaluationRecordId" UUID,
    "publicVerificationCode" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "property_registry_verifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "property_registry_restrictions" (
    "id" UUID NOT NULL,
    "propertyRegistryEntryId" UUID NOT NULL,
    "restrictionType" TEXT NOT NULL,
    "accessClassification" "PropertyRegistryAccessClassification" NOT NULL,
    "effectiveFrom" TIMESTAMP(3) NOT NULL,
    "effectiveTo" TIMESTAMP(3),
    "authorityDecisionId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "property_registry_restrictions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "property_transaction_history" (
    "id" UUID NOT NULL,
    "titleRecordId" UUID NOT NULL,
    "propertyTransferId" UUID,
    "eventType" "PropertyTransactionHistoryEventType" NOT NULL,
    "eventSummary" JSONB NOT NULL DEFAULT '{}',
    "effectiveDate" TIMESTAMP(3) NOT NULL,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "property_transaction_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "property_transfer_evidence_links" (
    "id" UUID NOT NULL,
    "propertyTransferId" UUID NOT NULL,
    "evidenceRecordId" UUID NOT NULL,
    "linkRole" TEXT NOT NULL DEFAULT 'SUPPORTING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "property_transfer_evidence_links_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "property_registry_audit_events" (
    "id" UUID NOT NULL,
    "propertyRegistryEntryId" UUID,
    "propertyTransferId" UUID,
    "eventType" "PropertyRegistryAuditEventType" NOT NULL,
    "actorIdentityId" UUID,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "property_registry_audit_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "land_parcels_parcelReference_key" ON "land_parcels"("parcelReference");

-- CreateIndex
CREATE INDEX "land_parcels_jurisdictionId_idx" ON "land_parcels"("jurisdictionId");

-- CreateIndex
CREATE INDEX "land_parcels_institutionId_idx" ON "land_parcels"("institutionId");

-- CreateIndex
CREATE INDEX "land_parcels_accessClassification_idx" ON "land_parcels"("accessClassification");

-- CreateIndex
CREATE INDEX "parcel_identifiers_landParcelId_idx" ON "parcel_identifiers"("landParcelId");

-- CreateIndex
CREATE INDEX "parcel_identifiers_identifierType_identifierValue_idx" ON "parcel_identifiers"("identifierType", "identifierValue");

-- CreateIndex
CREATE INDEX "parcel_geometry_references_landParcelId_idx" ON "parcel_geometry_references"("landParcelId");

-- CreateIndex
CREATE INDEX "parcel_addresses_landParcelId_idx" ON "parcel_addresses"("landParcelId");

-- CreateIndex
CREATE UNIQUE INDEX "property_records_propertyReference_key" ON "property_records"("propertyReference");

-- CreateIndex
CREATE INDEX "property_records_landParcelId_idx" ON "property_records"("landParcelId");

-- CreateIndex
CREATE INDEX "property_records_jurisdictionId_idx" ON "property_records"("jurisdictionId");

-- CreateIndex
CREATE INDEX "property_records_accessClassification_idx" ON "property_records"("accessClassification");

-- CreateIndex
CREATE UNIQUE INDEX "title_records_titleReference_key" ON "title_records"("titleReference");

-- CreateIndex
CREATE INDEX "title_records_propertyRecordId_idx" ON "title_records"("propertyRecordId");

-- CreateIndex
CREATE INDEX "title_records_landParcelId_idx" ON "title_records"("landParcelId");

-- CreateIndex
CREATE INDEX "title_records_status_idx" ON "title_records"("status");

-- CreateIndex
CREATE INDEX "title_versions_titleRecordId_idx" ON "title_versions"("titleRecordId");

-- CreateIndex
CREATE INDEX "title_versions_isCurrent_idx" ON "title_versions"("isCurrent");

-- CreateIndex
CREATE UNIQUE INDEX "title_versions_titleRecordId_versionNumber_key" ON "title_versions"("titleRecordId", "versionNumber");

-- CreateIndex
CREATE INDEX "property_interests_titleRecordId_idx" ON "property_interests"("titleRecordId");

-- CreateIndex
CREATE INDEX "property_interests_interestType_idx" ON "property_interests"("interestType");

-- CreateIndex
CREATE INDEX "property_interests_isCurrent_idx" ON "property_interests"("isCurrent");

-- CreateIndex
CREATE INDEX "property_interest_holders_propertyInterestId_idx" ON "property_interest_holders"("propertyInterestId");

-- CreateIndex
CREATE INDEX "property_interest_holders_personId_idx" ON "property_interest_holders"("personId");

-- CreateIndex
CREATE INDEX "property_interest_holders_organizationId_idx" ON "property_interest_holders"("organizationId");

-- CreateIndex
CREATE INDEX "property_interest_holders_identityId_idx" ON "property_interest_holders"("identityId");

-- CreateIndex
CREATE INDEX "property_interest_history_propertyInterestId_idx" ON "property_interest_history"("propertyInterestId");

-- CreateIndex
CREATE INDEX "property_interest_history_propertyTransferId_idx" ON "property_interest_history"("propertyTransferId");

-- CreateIndex
CREATE INDEX "title_instrument_references_titleRecordId_idx" ON "title_instrument_references"("titleRecordId");

-- CreateIndex
CREATE INDEX "title_instrument_references_officialInstrumentId_idx" ON "title_instrument_references"("officialInstrumentId");

-- CreateIndex
CREATE UNIQUE INDEX "property_transfers_transferReference_key" ON "property_transfers"("transferReference");

-- CreateIndex
CREATE INDEX "property_transfers_applicationStatus_idx" ON "property_transfers"("applicationStatus");

-- CreateIndex
CREATE INDEX "property_transfers_landParcelId_idx" ON "property_transfers"("landParcelId");

-- CreateIndex
CREATE INDEX "property_transfers_propertyRecordId_idx" ON "property_transfers"("propertyRecordId");

-- CreateIndex
CREATE INDEX "property_transfers_caseId_idx" ON "property_transfers"("caseId");

-- CreateIndex
CREATE INDEX "property_transfers_applicationId_idx" ON "property_transfers"("applicationId");

-- CreateIndex
CREATE INDEX "transfer_parties_propertyTransferId_idx" ON "transfer_parties"("propertyTransferId");

-- CreateIndex
CREATE INDEX "transfer_parties_identityId_idx" ON "transfer_parties"("identityId");

-- CreateIndex
CREATE UNIQUE INDEX "property_encumbrances_encumbranceReference_key" ON "property_encumbrances"("encumbranceReference");

-- CreateIndex
CREATE INDEX "property_encumbrances_titleRecordId_idx" ON "property_encumbrances"("titleRecordId");

-- CreateIndex
CREATE INDEX "property_encumbrances_encumbranceType_idx" ON "property_encumbrances"("encumbranceType");

-- CreateIndex
CREATE INDEX "property_encumbrances_status_idx" ON "property_encumbrances"("status");

-- CreateIndex
CREATE UNIQUE INDEX "survey_records_surveyReference_key" ON "survey_records"("surveyReference");

-- CreateIndex
CREATE INDEX "survey_records_landParcelId_idx" ON "survey_records"("landParcelId");

-- CreateIndex
CREATE INDEX "survey_plan_references_surveyRecordId_idx" ON "survey_plan_references"("surveyRecordId");

-- CreateIndex
CREATE INDEX "surveyor_certification_references_surveyRecordId_idx" ON "surveyor_certification_references"("surveyRecordId");

-- CreateIndex
CREATE INDEX "property_valuation_records_propertyRecordId_idx" ON "property_valuation_records"("propertyRecordId");

-- CreateIndex
CREATE INDEX "property_valuation_records_valuationPurpose_idx" ON "property_valuation_records"("valuationPurpose");

-- CreateIndex
CREATE INDEX "property_tax_references_propertyRecordId_idx" ON "property_tax_references"("propertyRecordId");

-- CreateIndex
CREATE INDEX "property_tax_references_taxpayerAccountId_idx" ON "property_tax_references"("taxpayerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "property_registry_entries_entryReference_key" ON "property_registry_entries"("entryReference");

-- CreateIndex
CREATE UNIQUE INDEX "property_registry_entries_propertyTransferId_key" ON "property_registry_entries"("propertyTransferId");

-- CreateIndex
CREATE INDEX "property_registry_entries_propertyRecordId_idx" ON "property_registry_entries"("propertyRecordId");

-- CreateIndex
CREATE INDEX "property_registry_entries_titleRecordId_idx" ON "property_registry_entries"("titleRecordId");

-- CreateIndex
CREATE INDEX "property_registry_entries_caseId_idx" ON "property_registry_entries"("caseId");

-- CreateIndex
CREATE UNIQUE INDEX "property_registry_corrections_correctionReference_key" ON "property_registry_corrections"("correctionReference");

-- CreateIndex
CREATE UNIQUE INDEX "property_registry_corrections_newTitleVersionId_key" ON "property_registry_corrections"("newTitleVersionId");

-- CreateIndex
CREATE INDEX "property_registry_corrections_propertyRegistryEntryId_idx" ON "property_registry_corrections"("propertyRegistryEntryId");

-- CreateIndex
CREATE INDEX "property_registry_corrections_status_idx" ON "property_registry_corrections"("status");

-- CreateIndex
CREATE UNIQUE INDEX "property_registry_verifications_publicVerificationCode_key" ON "property_registry_verifications"("publicVerificationCode");

-- CreateIndex
CREATE INDEX "property_registry_verifications_propertyRegistryEntryId_idx" ON "property_registry_verifications"("propertyRegistryEntryId");

-- CreateIndex
CREATE INDEX "property_registry_verifications_verificationState_idx" ON "property_registry_verifications"("verificationState");

-- CreateIndex
CREATE INDEX "property_registry_restrictions_propertyRegistryEntryId_idx" ON "property_registry_restrictions"("propertyRegistryEntryId");

-- CreateIndex
CREATE INDEX "property_transaction_history_titleRecordId_idx" ON "property_transaction_history"("titleRecordId");

-- CreateIndex
CREATE INDEX "property_transaction_history_eventType_idx" ON "property_transaction_history"("eventType");

-- CreateIndex
CREATE INDEX "property_transfer_evidence_links_evidenceRecordId_idx" ON "property_transfer_evidence_links"("evidenceRecordId");

-- CreateIndex
CREATE UNIQUE INDEX "property_transfer_evidence_links_propertyTransferId_evidenc_key" ON "property_transfer_evidence_links"("propertyTransferId", "evidenceRecordId");

-- CreateIndex
CREATE INDEX "property_registry_audit_events_propertyRegistryEntryId_idx" ON "property_registry_audit_events"("propertyRegistryEntryId");

-- CreateIndex
CREATE INDEX "property_registry_audit_events_propertyTransferId_idx" ON "property_registry_audit_events"("propertyTransferId");

-- CreateIndex
CREATE INDEX "property_registry_audit_events_eventType_idx" ON "property_registry_audit_events"("eventType");

-- AddForeignKey
ALTER TABLE "land_parcels" ADD CONSTRAINT "land_parcels_jurisdictionId_fkey" FOREIGN KEY ("jurisdictionId") REFERENCES "jurisdictions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "land_parcels" ADD CONSTRAINT "land_parcels_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "institutions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "parcel_identifiers" ADD CONSTRAINT "parcel_identifiers_landParcelId_fkey" FOREIGN KEY ("landParcelId") REFERENCES "land_parcels"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "parcel_geometry_references" ADD CONSTRAINT "parcel_geometry_references_landParcelId_fkey" FOREIGN KEY ("landParcelId") REFERENCES "land_parcels"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "parcel_addresses" ADD CONSTRAINT "parcel_addresses_landParcelId_fkey" FOREIGN KEY ("landParcelId") REFERENCES "land_parcels"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "property_records" ADD CONSTRAINT "property_records_landParcelId_fkey" FOREIGN KEY ("landParcelId") REFERENCES "land_parcels"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "property_records" ADD CONSTRAINT "property_records_jurisdictionId_fkey" FOREIGN KEY ("jurisdictionId") REFERENCES "jurisdictions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "property_records" ADD CONSTRAINT "property_records_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "institutions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "title_records" ADD CONSTRAINT "title_records_propertyRecordId_fkey" FOREIGN KEY ("propertyRecordId") REFERENCES "property_records"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "title_records" ADD CONSTRAINT "title_records_landParcelId_fkey" FOREIGN KEY ("landParcelId") REFERENCES "land_parcels"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "title_records" ADD CONSTRAINT "title_records_jurisdictionId_fkey" FOREIGN KEY ("jurisdictionId") REFERENCES "jurisdictions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "title_records" ADD CONSTRAINT "title_records_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "institutions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "title_versions" ADD CONSTRAINT "title_versions_titleRecordId_fkey" FOREIGN KEY ("titleRecordId") REFERENCES "title_records"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "title_versions" ADD CONSTRAINT "title_versions_governingDecisionId_fkey" FOREIGN KEY ("governingDecisionId") REFERENCES "government_decisions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "title_versions" ADD CONSTRAINT "title_versions_authorityEvaluationRecordId_fkey" FOREIGN KEY ("authorityEvaluationRecordId") REFERENCES "authority_evaluation_records"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "title_versions" ADD CONSTRAINT "title_versions_registrarOfficeholderId_fkey" FOREIGN KEY ("registrarOfficeholderId") REFERENCES "officeholders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "title_versions" ADD CONSTRAINT "title_versions_registrarIdentityId_fkey" FOREIGN KEY ("registrarIdentityId") REFERENCES "identities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "property_interests" ADD CONSTRAINT "property_interests_titleRecordId_fkey" FOREIGN KEY ("titleRecordId") REFERENCES "title_records"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "property_interest_holders" ADD CONSTRAINT "property_interest_holders_propertyInterestId_fkey" FOREIGN KEY ("propertyInterestId") REFERENCES "property_interests"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "property_interest_holders" ADD CONSTRAINT "property_interest_holders_personId_fkey" FOREIGN KEY ("personId") REFERENCES "persons"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "property_interest_holders" ADD CONSTRAINT "property_interest_holders_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "property_interest_holders" ADD CONSTRAINT "property_interest_holders_identityId_fkey" FOREIGN KEY ("identityId") REFERENCES "identities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "property_interest_history" ADD CONSTRAINT "property_interest_history_propertyInterestId_fkey" FOREIGN KEY ("propertyInterestId") REFERENCES "property_interests"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "property_interest_history" ADD CONSTRAINT "property_interest_history_fromTitleVersionId_fkey" FOREIGN KEY ("fromTitleVersionId") REFERENCES "title_versions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "property_interest_history" ADD CONSTRAINT "property_interest_history_toTitleVersionId_fkey" FOREIGN KEY ("toTitleVersionId") REFERENCES "title_versions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "property_interest_history" ADD CONSTRAINT "property_interest_history_priorHolderId_fkey" FOREIGN KEY ("priorHolderId") REFERENCES "property_interest_holders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "property_interest_history" ADD CONSTRAINT "property_interest_history_newHolderId_fkey" FOREIGN KEY ("newHolderId") REFERENCES "property_interest_holders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "property_interest_history" ADD CONSTRAINT "property_interest_history_propertyTransferId_fkey" FOREIGN KEY ("propertyTransferId") REFERENCES "property_transfers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "property_interest_history" ADD CONSTRAINT "property_interest_history_governingDecisionId_fkey" FOREIGN KEY ("governingDecisionId") REFERENCES "government_decisions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "title_instrument_references" ADD CONSTRAINT "title_instrument_references_titleRecordId_fkey" FOREIGN KEY ("titleRecordId") REFERENCES "title_records"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "title_instrument_references" ADD CONSTRAINT "title_instrument_references_officialInstrumentId_fkey" FOREIGN KEY ("officialInstrumentId") REFERENCES "official_instruments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "property_transfers" ADD CONSTRAINT "property_transfers_landParcelId_fkey" FOREIGN KEY ("landParcelId") REFERENCES "land_parcels"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "property_transfers" ADD CONSTRAINT "property_transfers_propertyRecordId_fkey" FOREIGN KEY ("propertyRecordId") REFERENCES "property_records"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "property_transfers" ADD CONSTRAINT "property_transfers_titleRecordId_fkey" FOREIGN KEY ("titleRecordId") REFERENCES "title_records"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "property_transfers" ADD CONSTRAINT "property_transfers_jurisdictionId_fkey" FOREIGN KEY ("jurisdictionId") REFERENCES "jurisdictions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "property_transfers" ADD CONSTRAINT "property_transfers_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "institutions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "property_transfers" ADD CONSTRAINT "property_transfers_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "applications"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "property_transfers" ADD CONSTRAINT "property_transfers_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "cases"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "property_transfers" ADD CONSTRAINT "property_transfers_governmentServiceId_fkey" FOREIGN KEY ("governmentServiceId") REFERENCES "government_services"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "property_transfers" ADD CONSTRAINT "property_transfers_governingServicePackVersionId_fkey" FOREIGN KEY ("governingServicePackVersionId") REFERENCES "service_pack_versions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "property_transfers" ADD CONSTRAINT "property_transfers_transferFeePaymentTransactionId_fkey" FOREIGN KEY ("transferFeePaymentTransactionId") REFERENCES "payment_transactions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transfer_parties" ADD CONSTRAINT "transfer_parties_propertyTransferId_fkey" FOREIGN KEY ("propertyTransferId") REFERENCES "property_transfers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transfer_parties" ADD CONSTRAINT "transfer_parties_personId_fkey" FOREIGN KEY ("personId") REFERENCES "persons"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transfer_parties" ADD CONSTRAINT "transfer_parties_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transfer_parties" ADD CONSTRAINT "transfer_parties_identityId_fkey" FOREIGN KEY ("identityId") REFERENCES "identities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transfer_parties" ADD CONSTRAINT "transfer_parties_representativeAuthorityId_fkey" FOREIGN KEY ("representativeAuthorityId") REFERENCES "representative_authorities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "property_encumbrances" ADD CONSTRAINT "property_encumbrances_titleRecordId_fkey" FOREIGN KEY ("titleRecordId") REFERENCES "title_records"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "property_encumbrances" ADD CONSTRAINT "property_encumbrances_releaseDecisionId_fkey" FOREIGN KEY ("releaseDecisionId") REFERENCES "government_decisions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mortgage_references" ADD CONSTRAINT "mortgage_references_propertyEncumbranceId_fkey" FOREIGN KEY ("propertyEncumbranceId") REFERENCES "property_encumbrances"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lien_references" ADD CONSTRAINT "lien_references_propertyEncumbranceId_fkey" FOREIGN KEY ("propertyEncumbranceId") REFERENCES "property_encumbrances"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "easement_references" ADD CONSTRAINT "easement_references_propertyEncumbranceId_fkey" FOREIGN KEY ("propertyEncumbranceId") REFERENCES "property_encumbrances"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "restriction_references" ADD CONSTRAINT "restriction_references_propertyEncumbranceId_fkey" FOREIGN KEY ("propertyEncumbranceId") REFERENCES "property_encumbrances"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "survey_records" ADD CONSTRAINT "survey_records_landParcelId_fkey" FOREIGN KEY ("landParcelId") REFERENCES "land_parcels"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "survey_records" ADD CONSTRAINT "survey_records_jurisdictionId_fkey" FOREIGN KEY ("jurisdictionId") REFERENCES "jurisdictions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "survey_records" ADD CONSTRAINT "survey_records_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "institutions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "survey_plan_references" ADD CONSTRAINT "survey_plan_references_surveyRecordId_fkey" FOREIGN KEY ("surveyRecordId") REFERENCES "survey_records"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "survey_plan_references" ADD CONSTRAINT "survey_plan_references_documentRecordId_fkey" FOREIGN KEY ("documentRecordId") REFERENCES "document_records"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "surveyor_certification_references" ADD CONSTRAINT "surveyor_certification_references_surveyRecordId_fkey" FOREIGN KEY ("surveyRecordId") REFERENCES "survey_records"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "property_valuation_records" ADD CONSTRAINT "property_valuation_records_propertyRecordId_fkey" FOREIGN KEY ("propertyRecordId") REFERENCES "property_records"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "property_tax_references" ADD CONSTRAINT "property_tax_references_propertyRecordId_fkey" FOREIGN KEY ("propertyRecordId") REFERENCES "property_records"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "property_tax_references" ADD CONSTRAINT "property_tax_references_taxpayerAccountId_fkey" FOREIGN KEY ("taxpayerAccountId") REFERENCES "taxpayer_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "property_registry_entries" ADD CONSTRAINT "property_registry_entries_propertyRecordId_fkey" FOREIGN KEY ("propertyRecordId") REFERENCES "property_records"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "property_registry_entries" ADD CONSTRAINT "property_registry_entries_titleRecordId_fkey" FOREIGN KEY ("titleRecordId") REFERENCES "title_records"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "property_registry_entries" ADD CONSTRAINT "property_registry_entries_propertyTransferId_fkey" FOREIGN KEY ("propertyTransferId") REFERENCES "property_transfers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "property_registry_entries" ADD CONSTRAINT "property_registry_entries_jurisdictionId_fkey" FOREIGN KEY ("jurisdictionId") REFERENCES "jurisdictions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "property_registry_entries" ADD CONSTRAINT "property_registry_entries_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "institutions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "property_registry_entries" ADD CONSTRAINT "property_registry_entries_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "cases"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "property_registry_entries" ADD CONSTRAINT "property_registry_entries_governmentDecisionId_fkey" FOREIGN KEY ("governmentDecisionId") REFERENCES "government_decisions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "property_registry_entries" ADD CONSTRAINT "property_registry_entries_authorityEvaluationRecordId_fkey" FOREIGN KEY ("authorityEvaluationRecordId") REFERENCES "authority_evaluation_records"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "property_registry_corrections" ADD CONSTRAINT "property_registry_corrections_propertyRegistryEntryId_fkey" FOREIGN KEY ("propertyRegistryEntryId") REFERENCES "property_registry_entries"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "property_registry_corrections" ADD CONSTRAINT "property_registry_corrections_applicantIdentityId_fkey" FOREIGN KEY ("applicantIdentityId") REFERENCES "identities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "property_registry_corrections" ADD CONSTRAINT "property_registry_corrections_governmentDecisionId_fkey" FOREIGN KEY ("governmentDecisionId") REFERENCES "government_decisions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "property_registry_corrections" ADD CONSTRAINT "property_registry_corrections_authorityEvaluationRecordId_fkey" FOREIGN KEY ("authorityEvaluationRecordId") REFERENCES "authority_evaluation_records"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "property_registry_corrections" ADD CONSTRAINT "property_registry_corrections_previousTitleVersionId_fkey" FOREIGN KEY ("previousTitleVersionId") REFERENCES "title_versions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "property_registry_corrections" ADD CONSTRAINT "property_registry_corrections_newTitleVersionId_fkey" FOREIGN KEY ("newTitleVersionId") REFERENCES "title_versions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "property_registry_verifications" ADD CONSTRAINT "property_registry_verifications_propertyRegistryEntryId_fkey" FOREIGN KEY ("propertyRegistryEntryId") REFERENCES "property_registry_entries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "property_registry_verifications" ADD CONSTRAINT "property_registry_verifications_verifiedByOfficeholderId_fkey" FOREIGN KEY ("verifiedByOfficeholderId") REFERENCES "officeholders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "property_registry_verifications" ADD CONSTRAINT "property_registry_verifications_verifiedByIdentityId_fkey" FOREIGN KEY ("verifiedByIdentityId") REFERENCES "identities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "property_registry_verifications" ADD CONSTRAINT "property_registry_verifications_authorityEvaluationRecordI_fkey" FOREIGN KEY ("authorityEvaluationRecordId") REFERENCES "authority_evaluation_records"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "property_registry_restrictions" ADD CONSTRAINT "property_registry_restrictions_propertyRegistryEntryId_fkey" FOREIGN KEY ("propertyRegistryEntryId") REFERENCES "property_registry_entries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "property_registry_restrictions" ADD CONSTRAINT "property_registry_restrictions_authorityDecisionId_fkey" FOREIGN KEY ("authorityDecisionId") REFERENCES "government_decisions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "property_transaction_history" ADD CONSTRAINT "property_transaction_history_titleRecordId_fkey" FOREIGN KEY ("titleRecordId") REFERENCES "title_records"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "property_transaction_history" ADD CONSTRAINT "property_transaction_history_propertyTransferId_fkey" FOREIGN KEY ("propertyTransferId") REFERENCES "property_transfers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "property_transfer_evidence_links" ADD CONSTRAINT "property_transfer_evidence_links_propertyTransferId_fkey" FOREIGN KEY ("propertyTransferId") REFERENCES "property_transfers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "property_transfer_evidence_links" ADD CONSTRAINT "property_transfer_evidence_links_evidenceRecordId_fkey" FOREIGN KEY ("evidenceRecordId") REFERENCES "evidence_records"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "property_registry_audit_events" ADD CONSTRAINT "property_registry_audit_events_propertyRegistryEntryId_fkey" FOREIGN KEY ("propertyRegistryEntryId") REFERENCES "property_registry_entries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "property_registry_audit_events" ADD CONSTRAINT "property_registry_audit_events_propertyTransferId_fkey" FOREIGN KEY ("propertyTransferId") REFERENCES "property_transfers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "property_registry_audit_events" ADD CONSTRAINT "property_registry_audit_events_actorIdentityId_fkey" FOREIGN KEY ("actorIdentityId") REFERENCES "identities"("id") ON DELETE SET NULL ON UPDATE CASCADE;
