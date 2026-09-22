-- CreateEnum
CREATE TYPE "CustomsDataClassification" AS ENUM ('PUBLIC', 'OFFICIAL', 'OFFICIAL_SENSITIVE', 'PROTECTED_TRADE', 'PROTECTED_ENFORCEMENT');

-- CreateEnum
CREATE TYPE "CustomsTraderAccountStatus" AS ENUM ('PENDING', 'ACTIVE', 'SUSPENDED', 'CLOSED');

-- CreateEnum
CREATE TYPE "CustomsRegistrationStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'ACTIVE', 'SUSPENDED', 'REVOKED');

-- CreateEnum
CREATE TYPE "TradeRepresentationKind" AS ENUM ('CUSTOMS_BROKER', 'CUSTOMS_AGENT', 'FREIGHT_FORWARDER', 'AUTHORIZED_COMPANY_REPRESENTATIVE');

-- CreateEnum
CREATE TYPE "CustomsBrokerAuthorizationStatus" AS ENUM ('PENDING', 'ACTIVE', 'SUSPENDED', 'REVOKED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "CustomsDeclarationType" AS ENUM ('IMPORT', 'EXPORT', 'TRANSIT', 'OTHER_CONFIGURED');

-- CreateEnum
CREATE TYPE "CustomsDeclarationStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'ASSESSED', 'HELD', 'RELEASE_AUTHORIZED', 'CLOSED', 'WITHDRAWN');

-- CreateEnum
CREATE TYPE "CustomsDeclarationVersionStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'LOCKED', 'SUPERSEDED');

-- CreateEnum
CREATE TYPE "ShipmentReferenceStatus" AS ENUM ('REGISTERED', 'IN_TRANSIT', 'ARRIVED', 'UNDER_CUSTOMS', 'RELEASED', 'CLOSED');

-- CreateEnum
CREATE TYPE "CustomsClassificationReferenceKind" AS ENUM ('CONFIGURED_NOMENCLATURE', 'AI_SUGGESTION', 'OFFICER_DETERMINATION');

-- CreateEnum
CREATE TYPE "CustomsPermitReferenceStatus" AS ENUM ('REQUIRED', 'APPLIED', 'ISSUED', 'DENIED', 'EXPIRED', 'SATISFIED', 'UNRESOLVED_MANDATORY');

-- CreateEnum
CREATE TYPE "CustomsAssessmentStatus" AS ENUM ('PROPOSED', 'ISSUED', 'AMENDED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "CustomsHoldStatus" AS ENUM ('ACTIVE', 'GOVERNED_REMOVAL_PENDING', 'REMOVED', 'CONVERTED_TO_ENFORCEMENT_REFERENCE');

-- CreateEnum
CREATE TYPE "CustomsInspectionLinkStatus" AS ENUM ('LINKED', 'SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "CustomsReleaseRecordStatus" AS ENUM ('NOT_RELEASED', 'RELEASED', 'CONDITIONAL_RELEASE');

-- CreateEnum
CREATE TYPE "CustomsAdjustmentKind" AS ENUM ('CORRECTION', 'AMENDMENT', 'POST_RELEASE_ADJUSTMENT');

-- CreateEnum
CREATE TYPE "CustomsRefundClaimStatus" AS ENUM ('SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'DENIED', 'PAID', 'WITHDRAWN');

-- CreateEnum
CREATE TYPE "CustomsActorPersona" AS ENUM ('TRADER', 'BROKER', 'CUSTOMS_OFFICER', 'SENIOR_DECISION_OFFICER', 'TECHNICAL_ADMIN', 'PAYMENT_SYSTEM', 'AI_ASSISTANCE', 'EXTERNAL_LIAISON');

-- CreateEnum
CREATE TYPE "CustomsExternalDependencyType" AS ENUM ('PORT_AUTHORITY', 'AGRICULTURE', 'HEALTH', 'ENVIRONMENT', 'SECURITY_LAW_ENFORCEMENT', 'SANCTIONS_RESTRICTED_TRADE', 'TRANSPORT', 'EXTERNAL_CUSTOMS', 'OTHER_CONFIGURED');

-- CreateEnum
CREATE TYPE "CustomsExternalDependencyRecordedBy" AS ENUM ('OFFICER', 'INTEGRATION', 'EXTERNAL_LIAISON', 'SYSTEM');

-- CreateEnum
CREATE TYPE "CustomsStatusSubjectKind" AS ENUM ('TRADER_ACCOUNT', 'SHIPMENT', 'DECLARATION');

-- CreateEnum
CREATE TYPE "CustomsValuationKind" AS ENUM ('DECLARED', 'ASSESSED', 'ACCEPTED');

-- CreateTable
CREATE TABLE "trader_accounts" (
    "id" UUID NOT NULL,
    "accountNumber" TEXT NOT NULL,
    "organizationId" UUID,
    "primaryIdentityId" UUID,
    "jurisdictionId" UUID,
    "status" "CustomsTraderAccountStatus" NOT NULL DEFAULT 'PENDING',
    "masterAdministrativeFileId" UUID,
    "dataClassification" "CustomsDataClassification" NOT NULL DEFAULT 'PROTECTED_TRADE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "trader_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "importer_registrations" (
    "id" UUID NOT NULL,
    "traderAccountId" UUID NOT NULL,
    "registrationNumber" TEXT NOT NULL,
    "status" "CustomsRegistrationStatus" NOT NULL DEFAULT 'DRAFT',
    "registeredAt" TIMESTAMP(3),
    "jurisdictionId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "importer_registrations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "exporter_registrations" (
    "id" UUID NOT NULL,
    "traderAccountId" UUID NOT NULL,
    "registrationNumber" TEXT NOT NULL,
    "status" "CustomsRegistrationStatus" NOT NULL DEFAULT 'DRAFT',
    "registeredAt" TIMESTAMP(3),
    "jurisdictionId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "exporter_registrations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customs_broker_authorizations" (
    "id" UUID NOT NULL,
    "traderAccountId" UUID NOT NULL,
    "representativeAuthorityId" UUID NOT NULL,
    "representationKind" "TradeRepresentationKind" NOT NULL,
    "status" "CustomsBrokerAuthorizationStatus" NOT NULL DEFAULT 'PENDING',
    "doesNotInferFromMembership" BOOLEAN NOT NULL DEFAULT true,
    "effectiveFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "effectiveUntil" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "customs_broker_authorizations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shipment_references" (
    "id" UUID NOT NULL,
    "shipmentReferenceNumber" TEXT NOT NULL,
    "ownerOrganizationId" UUID NOT NULL,
    "traderAccountId" UUID,
    "carrierReferenceToken" TEXT,
    "manifestReferenceToken" TEXT,
    "portOrBorderEntryReference" TEXT,
    "cargoArrivedAt" TIMESTAMP(3),
    "cargoArrivalDoesNotImplyRelease" BOOLEAN NOT NULL DEFAULT true,
    "status" "ShipmentReferenceStatus" NOT NULL DEFAULT 'REGISTERED',
    "currentReleaseRecordId" UUID,
    "dataClassification" "CustomsDataClassification" NOT NULL DEFAULT 'PROTECTED_TRADE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "shipment_references_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cargo_manifest_references" (
    "id" UUID NOT NULL,
    "shipmentReferenceId" UUID NOT NULL,
    "manifestReference" TEXT NOT NULL,
    "carrierReference" TEXT,
    "receivedAt" TIMESTAMP(3),
    "externalSystemToken" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cargo_manifest_references_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "border_entry_references" (
    "id" UUID NOT NULL,
    "shipmentReferenceId" UUID NOT NULL,
    "entryPointReference" TEXT NOT NULL,
    "entryModeCode" TEXT,
    "scheduledOrActualEntryAt" TIMESTAMP(3),
    "externalPortAuthorityToken" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "border_entry_references_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customs_declarations" (
    "id" UUID NOT NULL,
    "declarationNumber" TEXT NOT NULL,
    "traderAccountId" UUID NOT NULL,
    "shipmentReferenceId" UUID,
    "caseId" UUID,
    "applicationId" UUID,
    "declarationType" "CustomsDeclarationType" NOT NULL,
    "status" "CustomsDeclarationStatus" NOT NULL DEFAULT 'DRAFT',
    "currentVersionId" UUID,
    "doesNotReleaseCargo" BOOLEAN NOT NULL DEFAULT true,
    "submittedAt" TIMESTAMP(3),
    "dataClassification" "CustomsDataClassification" NOT NULL DEFAULT 'PROTECTED_TRADE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "customs_declarations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customs_declaration_versions" (
    "id" UUID NOT NULL,
    "customsDeclarationId" UUID NOT NULL,
    "versionNumber" INTEGER NOT NULL,
    "status" "CustomsDeclarationVersionStatus" NOT NULL DEFAULT 'DRAFT',
    "submissionPayload" JSONB NOT NULL DEFAULT '{}',
    "submittedAt" TIMESTAMP(3),
    "lockedAt" TIMESTAMP(3),
    "supersedesVersionId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "customs_declaration_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customs_declaration_items" (
    "id" UUID NOT NULL,
    "customsDeclarationVersionId" UUID NOT NULL,
    "lineNumber" INTEGER NOT NULL,
    "description" TEXT NOT NULL,
    "quantity" TEXT,
    "unitOfMeasureCode" TEXT,
    "declaredValueCents" INTEGER,
    "currency" TEXT NOT NULL DEFAULT 'XCD',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "customs_declaration_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "commodity_classification_references" (
    "id" UUID NOT NULL,
    "customsDeclarationItemId" UUID NOT NULL,
    "nomenclatureSystemCode" TEXT NOT NULL,
    "classificationCode" TEXT NOT NULL,
    "referenceKind" "CustomsClassificationReferenceKind" NOT NULL,
    "isAuthoritative" BOOLEAN NOT NULL DEFAULT false,
    "aiSuggestionDoesNotAuthorize" BOOLEAN NOT NULL DEFAULT true,
    "configurationVersionRef" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "commodity_classification_references_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "origin_declarations" (
    "id" UUID NOT NULL,
    "customsDeclarationItemId" UUID NOT NULL,
    "countryOfOriginCode" TEXT,
    "preferentialOriginClaim" BOOLEAN NOT NULL DEFAULT false,
    "proofReferenceToken" TEXT,
    "declaredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isSelfDeclaration" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "origin_declarations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customs_valuation_records" (
    "id" UUID NOT NULL,
    "customsDeclarationId" UUID NOT NULL,
    "valuationKind" "CustomsValuationKind" NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'XCD',
    "methodologyReference" TEXT,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "recordedByActorKind" "CustomsActorPersona",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "customs_valuation_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trade_permit_references" (
    "id" UUID NOT NULL,
    "customsDeclarationId" UUID NOT NULL,
    "permitTypeCode" TEXT NOT NULL,
    "permitReferenceToken" TEXT,
    "status" "CustomsPermitReferenceStatus" NOT NULL DEFAULT 'REQUIRED',
    "isMandatoryForRelease" BOOLEAN NOT NULL DEFAULT false,
    "blocksReleaseWhenUnresolved" BOOLEAN NOT NULL DEFAULT true,
    "officialInstrumentId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "trade_permit_references_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "restricted_goods_requirements" (
    "id" UUID NOT NULL,
    "customsDeclarationId" UUID NOT NULL,
    "requirementCode" TEXT NOT NULL,
    "approvalReferenceToken" TEXT,
    "status" "CustomsPermitReferenceStatus" NOT NULL DEFAULT 'REQUIRED',
    "blocksReleaseWhenUnresolved" BOOLEAN NOT NULL DEFAULT true,
    "externalAuthorityId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "restricted_goods_requirements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customs_assessments" (
    "id" UUID NOT NULL,
    "customsDeclarationId" UUID NOT NULL,
    "assessmentReference" TEXT NOT NULL,
    "status" "CustomsAssessmentStatus" NOT NULL DEFAULT 'PROPOSED',
    "issuedAt" TIMESTAMP(3),
    "issuedByOfficeholderId" UUID,
    "taxAssessmentId" UUID,
    "paymentAllocationId" UUID,
    "riskScore" DOUBLE PRECISION,
    "riskScoreIsNotViolation" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "customs_assessments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customs_assessment_lines" (
    "id" UUID NOT NULL,
    "customsAssessmentId" UUID NOT NULL,
    "lineCode" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'XCD',
    "dutyTaxFeeKind" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "customs_assessment_lines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customs_holds" (
    "id" UUID NOT NULL,
    "shipmentReferenceId" UUID NOT NULL,
    "holdReference" TEXT NOT NULL,
    "status" "CustomsHoldStatus" NOT NULL DEFAULT 'ACTIVE',
    "basisReference" TEXT NOT NULL,
    "blocksRelease" BOOLEAN NOT NULL DEFAULT true,
    "placedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "removedAt" TIMESTAMP(3),
    "governedRemovalByOfficeholderId" UUID,
    "removalDecisionReference" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "customs_holds_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customs_inspections" (
    "id" UUID NOT NULL,
    "shipmentReferenceId" UUID NOT NULL,
    "inspectionRecordId" UUID NOT NULL,
    "linkStatus" "CustomsInspectionLinkStatus" NOT NULL DEFAULT 'LINKED',
    "inspectionIsNotSeizure" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "customs_inspections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customs_release_decision_references" (
    "id" UUID NOT NULL,
    "governmentDecisionId" UUID NOT NULL,
    "decisionReference" TEXT NOT NULL,
    "releaseScopeCode" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "customs_release_decision_references_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customs_release_records" (
    "id" UUID NOT NULL,
    "shipmentReferenceId" UUID NOT NULL,
    "releaseReference" TEXT NOT NULL,
    "status" "CustomsReleaseRecordStatus" NOT NULL DEFAULT 'NOT_RELEASED',
    "releaseDecisionReferenceId" UUID,
    "authorizedByOfficeholderId" UUID,
    "releasedAt" TIMESTAMP(3),
    "paymentRecordedDoesNotRelease" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "customs_release_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customs_adjustments" (
    "id" UUID NOT NULL,
    "customsDeclarationId" UUID NOT NULL,
    "adjustmentKind" "CustomsAdjustmentKind" NOT NULL,
    "adjustmentReference" TEXT NOT NULL,
    "reasonSummary" TEXT NOT NULL,
    "appliedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "customs_adjustments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customs_refund_claims" (
    "id" UUID NOT NULL,
    "customsDeclarationId" UUID NOT NULL,
    "claimReference" TEXT NOT NULL,
    "status" "CustomsRefundClaimStatus" NOT NULL DEFAULT 'SUBMITTED',
    "requestedAmountCents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'XCD',
    "taxRefundClaimId" UUID,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "customs_refund_claims_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customs_status_history" (
    "id" UUID NOT NULL,
    "subjectKind" "CustomsStatusSubjectKind" NOT NULL,
    "traderAccountId" UUID,
    "shipmentReferenceId" UUID,
    "customsDeclarationId" UUID,
    "fromStatusCode" TEXT,
    "toStatusCode" TEXT NOT NULL,
    "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actorIdentityId" UUID,
    "actorPersona" "CustomsActorPersona",
    "reasonSummary" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "customs_status_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customs_external_dependencies" (
    "id" UUID NOT NULL,
    "dependencyType" "CustomsExternalDependencyType" NOT NULL,
    "externalAuthorityId" UUID,
    "shipmentReferenceId" UUID,
    "customsDeclarationId" UUID,
    "isRequired" BOOLEAN NOT NULL DEFAULT false,
    "blocksReleaseWhenRequired" BOOLEAN NOT NULL DEFAULT false,
    "isAuthenticated" BOOLEAN NOT NULL DEFAULT false,
    "authenticatedPayloadHash" TEXT,
    "recordedBy" "CustomsExternalDependencyRecordedBy" NOT NULL,
    "recordedByIdentityId" UUID,
    "resolutionStatusCode" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "customs_external_dependencies_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "trader_accounts_accountNumber_key" ON "trader_accounts"("accountNumber");

-- CreateIndex
CREATE INDEX "trader_accounts_organizationId_idx" ON "trader_accounts"("organizationId");

-- CreateIndex
CREATE INDEX "trader_accounts_primaryIdentityId_idx" ON "trader_accounts"("primaryIdentityId");

-- CreateIndex
CREATE INDEX "trader_accounts_jurisdictionId_idx" ON "trader_accounts"("jurisdictionId");

-- CreateIndex
CREATE INDEX "trader_accounts_status_idx" ON "trader_accounts"("status");

-- CreateIndex
CREATE UNIQUE INDEX "importer_registrations_traderAccountId_key" ON "importer_registrations"("traderAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "importer_registrations_registrationNumber_key" ON "importer_registrations"("registrationNumber");

-- CreateIndex
CREATE INDEX "importer_registrations_status_idx" ON "importer_registrations"("status");

-- CreateIndex
CREATE UNIQUE INDEX "exporter_registrations_traderAccountId_key" ON "exporter_registrations"("traderAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "exporter_registrations_registrationNumber_key" ON "exporter_registrations"("registrationNumber");

-- CreateIndex
CREATE INDEX "exporter_registrations_status_idx" ON "exporter_registrations"("status");

-- CreateIndex
CREATE UNIQUE INDEX "customs_broker_authorizations_representativeAuthorityId_key" ON "customs_broker_authorizations"("representativeAuthorityId");

-- CreateIndex
CREATE INDEX "customs_broker_authorizations_traderAccountId_idx" ON "customs_broker_authorizations"("traderAccountId");

-- CreateIndex
CREATE INDEX "customs_broker_authorizations_status_idx" ON "customs_broker_authorizations"("status");

-- CreateIndex
CREATE UNIQUE INDEX "shipment_references_shipmentReferenceNumber_key" ON "shipment_references"("shipmentReferenceNumber");

-- CreateIndex
CREATE UNIQUE INDEX "shipment_references_currentReleaseRecordId_key" ON "shipment_references"("currentReleaseRecordId");

-- CreateIndex
CREATE INDEX "shipment_references_ownerOrganizationId_idx" ON "shipment_references"("ownerOrganizationId");

-- CreateIndex
CREATE INDEX "shipment_references_traderAccountId_idx" ON "shipment_references"("traderAccountId");

-- CreateIndex
CREATE INDEX "shipment_references_status_idx" ON "shipment_references"("status");

-- CreateIndex
CREATE INDEX "cargo_manifest_references_shipmentReferenceId_idx" ON "cargo_manifest_references"("shipmentReferenceId");

-- CreateIndex
CREATE INDEX "border_entry_references_shipmentReferenceId_idx" ON "border_entry_references"("shipmentReferenceId");

-- CreateIndex
CREATE UNIQUE INDEX "customs_declarations_declarationNumber_key" ON "customs_declarations"("declarationNumber");

-- CreateIndex
CREATE UNIQUE INDEX "customs_declarations_currentVersionId_key" ON "customs_declarations"("currentVersionId");

-- CreateIndex
CREATE INDEX "customs_declarations_traderAccountId_idx" ON "customs_declarations"("traderAccountId");

-- CreateIndex
CREATE INDEX "customs_declarations_shipmentReferenceId_idx" ON "customs_declarations"("shipmentReferenceId");

-- CreateIndex
CREATE INDEX "customs_declarations_caseId_idx" ON "customs_declarations"("caseId");

-- CreateIndex
CREATE INDEX "customs_declarations_status_idx" ON "customs_declarations"("status");

-- CreateIndex
CREATE UNIQUE INDEX "customs_declaration_versions_supersedesVersionId_key" ON "customs_declaration_versions"("supersedesVersionId");

-- CreateIndex
CREATE INDEX "customs_declaration_versions_customsDeclarationId_idx" ON "customs_declaration_versions"("customsDeclarationId");

-- CreateIndex
CREATE UNIQUE INDEX "customs_declaration_versions_customsDeclarationId_versionNu_key" ON "customs_declaration_versions"("customsDeclarationId", "versionNumber");

-- CreateIndex
CREATE INDEX "customs_declaration_items_customsDeclarationVersionId_idx" ON "customs_declaration_items"("customsDeclarationVersionId");

-- CreateIndex
CREATE UNIQUE INDEX "customs_declaration_items_customsDeclarationVersionId_lineN_key" ON "customs_declaration_items"("customsDeclarationVersionId", "lineNumber");

-- CreateIndex
CREATE INDEX "commodity_classification_references_customsDeclarationItemI_idx" ON "commodity_classification_references"("customsDeclarationItemId");

-- CreateIndex
CREATE INDEX "commodity_classification_references_nomenclatureSystemCode_idx" ON "commodity_classification_references"("nomenclatureSystemCode");

-- CreateIndex
CREATE INDEX "origin_declarations_customsDeclarationItemId_idx" ON "origin_declarations"("customsDeclarationItemId");

-- CreateIndex
CREATE INDEX "customs_valuation_records_customsDeclarationId_valuationKin_idx" ON "customs_valuation_records"("customsDeclarationId", "valuationKind");

-- CreateIndex
CREATE INDEX "trade_permit_references_customsDeclarationId_idx" ON "trade_permit_references"("customsDeclarationId");

-- CreateIndex
CREATE INDEX "trade_permit_references_status_idx" ON "trade_permit_references"("status");

-- CreateIndex
CREATE INDEX "restricted_goods_requirements_customsDeclarationId_idx" ON "restricted_goods_requirements"("customsDeclarationId");

-- CreateIndex
CREATE UNIQUE INDEX "customs_assessments_assessmentReference_key" ON "customs_assessments"("assessmentReference");

-- CreateIndex
CREATE INDEX "customs_assessments_customsDeclarationId_idx" ON "customs_assessments"("customsDeclarationId");

-- CreateIndex
CREATE INDEX "customs_assessments_status_idx" ON "customs_assessments"("status");

-- CreateIndex
CREATE INDEX "customs_assessment_lines_customsAssessmentId_idx" ON "customs_assessment_lines"("customsAssessmentId");

-- CreateIndex
CREATE UNIQUE INDEX "customs_holds_holdReference_key" ON "customs_holds"("holdReference");

-- CreateIndex
CREATE INDEX "customs_holds_shipmentReferenceId_idx" ON "customs_holds"("shipmentReferenceId");

-- CreateIndex
CREATE INDEX "customs_holds_status_idx" ON "customs_holds"("status");

-- CreateIndex
CREATE UNIQUE INDEX "customs_inspections_inspectionRecordId_key" ON "customs_inspections"("inspectionRecordId");

-- CreateIndex
CREATE INDEX "customs_inspections_shipmentReferenceId_idx" ON "customs_inspections"("shipmentReferenceId");

-- CreateIndex
CREATE UNIQUE INDEX "customs_release_decision_references_governmentDecisionId_key" ON "customs_release_decision_references"("governmentDecisionId");

-- CreateIndex
CREATE UNIQUE INDEX "customs_release_decision_references_decisionReference_key" ON "customs_release_decision_references"("decisionReference");

-- CreateIndex
CREATE UNIQUE INDEX "customs_release_records_releaseReference_key" ON "customs_release_records"("releaseReference");

-- CreateIndex
CREATE INDEX "customs_release_records_shipmentReferenceId_idx" ON "customs_release_records"("shipmentReferenceId");

-- CreateIndex
CREATE INDEX "customs_release_records_status_idx" ON "customs_release_records"("status");

-- CreateIndex
CREATE UNIQUE INDEX "customs_adjustments_adjustmentReference_key" ON "customs_adjustments"("adjustmentReference");

-- CreateIndex
CREATE INDEX "customs_adjustments_customsDeclarationId_idx" ON "customs_adjustments"("customsDeclarationId");

-- CreateIndex
CREATE UNIQUE INDEX "customs_refund_claims_claimReference_key" ON "customs_refund_claims"("claimReference");

-- CreateIndex
CREATE INDEX "customs_refund_claims_customsDeclarationId_idx" ON "customs_refund_claims"("customsDeclarationId");

-- CreateIndex
CREATE INDEX "customs_refund_claims_status_idx" ON "customs_refund_claims"("status");

-- CreateIndex
CREATE INDEX "customs_status_history_subjectKind_idx" ON "customs_status_history"("subjectKind");

-- CreateIndex
CREATE INDEX "customs_status_history_customsDeclarationId_idx" ON "customs_status_history"("customsDeclarationId");

-- CreateIndex
CREATE INDEX "customs_status_history_shipmentReferenceId_idx" ON "customs_status_history"("shipmentReferenceId");

-- CreateIndex
CREATE INDEX "customs_external_dependencies_externalAuthorityId_idx" ON "customs_external_dependencies"("externalAuthorityId");

-- CreateIndex
CREATE INDEX "customs_external_dependencies_shipmentReferenceId_idx" ON "customs_external_dependencies"("shipmentReferenceId");

-- CreateIndex
CREATE INDEX "customs_external_dependencies_customsDeclarationId_idx" ON "customs_external_dependencies"("customsDeclarationId");

-- AddForeignKey
ALTER TABLE "trader_accounts" ADD CONSTRAINT "trader_accounts_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trader_accounts" ADD CONSTRAINT "trader_accounts_primaryIdentityId_fkey" FOREIGN KEY ("primaryIdentityId") REFERENCES "identities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trader_accounts" ADD CONSTRAINT "trader_accounts_jurisdictionId_fkey" FOREIGN KEY ("jurisdictionId") REFERENCES "jurisdictions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trader_accounts" ADD CONSTRAINT "trader_accounts_masterAdministrativeFileId_fkey" FOREIGN KEY ("masterAdministrativeFileId") REFERENCES "master_administrative_files"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "importer_registrations" ADD CONSTRAINT "importer_registrations_traderAccountId_fkey" FOREIGN KEY ("traderAccountId") REFERENCES "trader_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "importer_registrations" ADD CONSTRAINT "importer_registrations_jurisdictionId_fkey" FOREIGN KEY ("jurisdictionId") REFERENCES "jurisdictions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exporter_registrations" ADD CONSTRAINT "exporter_registrations_traderAccountId_fkey" FOREIGN KEY ("traderAccountId") REFERENCES "trader_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exporter_registrations" ADD CONSTRAINT "exporter_registrations_jurisdictionId_fkey" FOREIGN KEY ("jurisdictionId") REFERENCES "jurisdictions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customs_broker_authorizations" ADD CONSTRAINT "customs_broker_authorizations_traderAccountId_fkey" FOREIGN KEY ("traderAccountId") REFERENCES "trader_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customs_broker_authorizations" ADD CONSTRAINT "customs_broker_authorizations_representativeAuthorityId_fkey" FOREIGN KEY ("representativeAuthorityId") REFERENCES "representative_authorities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shipment_references" ADD CONSTRAINT "shipment_references_ownerOrganizationId_fkey" FOREIGN KEY ("ownerOrganizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shipment_references" ADD CONSTRAINT "shipment_references_traderAccountId_fkey" FOREIGN KEY ("traderAccountId") REFERENCES "trader_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shipment_references" ADD CONSTRAINT "shipment_references_currentReleaseRecordId_fkey" FOREIGN KEY ("currentReleaseRecordId") REFERENCES "customs_release_records"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cargo_manifest_references" ADD CONSTRAINT "cargo_manifest_references_shipmentReferenceId_fkey" FOREIGN KEY ("shipmentReferenceId") REFERENCES "shipment_references"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "border_entry_references" ADD CONSTRAINT "border_entry_references_shipmentReferenceId_fkey" FOREIGN KEY ("shipmentReferenceId") REFERENCES "shipment_references"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customs_declarations" ADD CONSTRAINT "customs_declarations_traderAccountId_fkey" FOREIGN KEY ("traderAccountId") REFERENCES "trader_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customs_declarations" ADD CONSTRAINT "customs_declarations_shipmentReferenceId_fkey" FOREIGN KEY ("shipmentReferenceId") REFERENCES "shipment_references"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customs_declarations" ADD CONSTRAINT "customs_declarations_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "cases"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customs_declarations" ADD CONSTRAINT "customs_declarations_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "applications"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customs_declarations" ADD CONSTRAINT "customs_declarations_currentVersionId_fkey" FOREIGN KEY ("currentVersionId") REFERENCES "customs_declaration_versions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customs_declaration_versions" ADD CONSTRAINT "customs_declaration_versions_customsDeclarationId_fkey" FOREIGN KEY ("customsDeclarationId") REFERENCES "customs_declarations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customs_declaration_versions" ADD CONSTRAINT "customs_declaration_versions_supersedesVersionId_fkey" FOREIGN KEY ("supersedesVersionId") REFERENCES "customs_declaration_versions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customs_declaration_items" ADD CONSTRAINT "customs_declaration_items_customsDeclarationVersionId_fkey" FOREIGN KEY ("customsDeclarationVersionId") REFERENCES "customs_declaration_versions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commodity_classification_references" ADD CONSTRAINT "commodity_classification_references_customsDeclarationItem_fkey" FOREIGN KEY ("customsDeclarationItemId") REFERENCES "customs_declaration_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "origin_declarations" ADD CONSTRAINT "origin_declarations_customsDeclarationItemId_fkey" FOREIGN KEY ("customsDeclarationItemId") REFERENCES "customs_declaration_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customs_valuation_records" ADD CONSTRAINT "customs_valuation_records_customsDeclarationId_fkey" FOREIGN KEY ("customsDeclarationId") REFERENCES "customs_declarations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trade_permit_references" ADD CONSTRAINT "trade_permit_references_customsDeclarationId_fkey" FOREIGN KEY ("customsDeclarationId") REFERENCES "customs_declarations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trade_permit_references" ADD CONSTRAINT "trade_permit_references_officialInstrumentId_fkey" FOREIGN KEY ("officialInstrumentId") REFERENCES "official_instruments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "restricted_goods_requirements" ADD CONSTRAINT "restricted_goods_requirements_customsDeclarationId_fkey" FOREIGN KEY ("customsDeclarationId") REFERENCES "customs_declarations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "restricted_goods_requirements" ADD CONSTRAINT "restricted_goods_requirements_externalAuthorityId_fkey" FOREIGN KEY ("externalAuthorityId") REFERENCES "external_authorities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customs_assessments" ADD CONSTRAINT "customs_assessments_customsDeclarationId_fkey" FOREIGN KEY ("customsDeclarationId") REFERENCES "customs_declarations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customs_assessments" ADD CONSTRAINT "customs_assessments_issuedByOfficeholderId_fkey" FOREIGN KEY ("issuedByOfficeholderId") REFERENCES "officeholders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customs_assessments" ADD CONSTRAINT "customs_assessments_taxAssessmentId_fkey" FOREIGN KEY ("taxAssessmentId") REFERENCES "tax_assessments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customs_assessments" ADD CONSTRAINT "customs_assessments_paymentAllocationId_fkey" FOREIGN KEY ("paymentAllocationId") REFERENCES "payment_allocations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customs_assessment_lines" ADD CONSTRAINT "customs_assessment_lines_customsAssessmentId_fkey" FOREIGN KEY ("customsAssessmentId") REFERENCES "customs_assessments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customs_holds" ADD CONSTRAINT "customs_holds_shipmentReferenceId_fkey" FOREIGN KEY ("shipmentReferenceId") REFERENCES "shipment_references"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customs_holds" ADD CONSTRAINT "customs_holds_governedRemovalByOfficeholderId_fkey" FOREIGN KEY ("governedRemovalByOfficeholderId") REFERENCES "officeholders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customs_inspections" ADD CONSTRAINT "customs_inspections_shipmentReferenceId_fkey" FOREIGN KEY ("shipmentReferenceId") REFERENCES "shipment_references"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customs_inspections" ADD CONSTRAINT "customs_inspections_inspectionRecordId_fkey" FOREIGN KEY ("inspectionRecordId") REFERENCES "inspection_records"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customs_release_decision_references" ADD CONSTRAINT "customs_release_decision_references_governmentDecisionId_fkey" FOREIGN KEY ("governmentDecisionId") REFERENCES "government_decisions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customs_release_records" ADD CONSTRAINT "customs_release_records_shipmentReferenceId_fkey" FOREIGN KEY ("shipmentReferenceId") REFERENCES "shipment_references"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customs_release_records" ADD CONSTRAINT "customs_release_records_releaseDecisionReferenceId_fkey" FOREIGN KEY ("releaseDecisionReferenceId") REFERENCES "customs_release_decision_references"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customs_release_records" ADD CONSTRAINT "customs_release_records_authorizedByOfficeholderId_fkey" FOREIGN KEY ("authorizedByOfficeholderId") REFERENCES "officeholders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customs_adjustments" ADD CONSTRAINT "customs_adjustments_customsDeclarationId_fkey" FOREIGN KEY ("customsDeclarationId") REFERENCES "customs_declarations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customs_refund_claims" ADD CONSTRAINT "customs_refund_claims_customsDeclarationId_fkey" FOREIGN KEY ("customsDeclarationId") REFERENCES "customs_declarations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customs_refund_claims" ADD CONSTRAINT "customs_refund_claims_taxRefundClaimId_fkey" FOREIGN KEY ("taxRefundClaimId") REFERENCES "tax_refund_claims"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customs_status_history" ADD CONSTRAINT "customs_status_history_traderAccountId_fkey" FOREIGN KEY ("traderAccountId") REFERENCES "trader_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customs_status_history" ADD CONSTRAINT "customs_status_history_shipmentReferenceId_fkey" FOREIGN KEY ("shipmentReferenceId") REFERENCES "shipment_references"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customs_status_history" ADD CONSTRAINT "customs_status_history_customsDeclarationId_fkey" FOREIGN KEY ("customsDeclarationId") REFERENCES "customs_declarations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customs_status_history" ADD CONSTRAINT "customs_status_history_actorIdentityId_fkey" FOREIGN KEY ("actorIdentityId") REFERENCES "identities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customs_external_dependencies" ADD CONSTRAINT "customs_external_dependencies_externalAuthorityId_fkey" FOREIGN KEY ("externalAuthorityId") REFERENCES "external_authorities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customs_external_dependencies" ADD CONSTRAINT "customs_external_dependencies_shipmentReferenceId_fkey" FOREIGN KEY ("shipmentReferenceId") REFERENCES "shipment_references"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customs_external_dependencies" ADD CONSTRAINT "customs_external_dependencies_customsDeclarationId_fkey" FOREIGN KEY ("customsDeclarationId") REFERENCES "customs_declarations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customs_external_dependencies" ADD CONSTRAINT "customs_external_dependencies_recordedByIdentityId_fkey" FOREIGN KEY ("recordedByIdentityId") REFERENCES "identities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

