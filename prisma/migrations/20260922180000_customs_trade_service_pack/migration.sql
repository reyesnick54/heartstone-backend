-- Customs & Trade Government Service Pack foundation

CREATE TYPE "TradePartyRegistrationStatus" AS ENUM (
  'NOT_REGISTERED',
  'SUBMITTED',
  'UNDER_REVIEW',
  'ACTIVE',
  'SUSPENDED',
  'REVOKED'
);

CREATE TYPE "CustomsBrokerAuthorizationStatus" AS ENUM (
  'NOT_AUTHORIZED',
  'PENDING',
  'AUTHORIZED',
  'SUSPENDED',
  'REVOKED'
);

CREATE TYPE "TradeShipmentStatus" AS ENUM (
  'DRAFT',
  'ACTIVE',
  'HELD',
  'RELEASED',
  'CLOSED',
  'CANCELLED'
);

CREATE TYPE "TradeShipmentDirection" AS ENUM (
  'IMPORT',
  'EXPORT',
  'TRANSIT'
);

CREATE TYPE "CustomsDeclarationStatus" AS ENUM (
  'DRAFT',
  'SUBMITTED',
  'UNDER_REVIEW',
  'ACCEPTED',
  'REJECTED',
  'SUPERSEDED'
);

CREATE TYPE "TradePermitType" AS ENUM (
  'IMPORT',
  'EXPORT',
  'RESTRICTED_GOODS'
);

CREATE TYPE "TradePermitStatus" AS ENUM (
  'REQUESTED',
  'UNDER_REVIEW',
  'APPROVED',
  'DENIED',
  'EXPIRED',
  'REVOKED'
);

CREATE TYPE "CustomsHoldStatus" AS ENUM (
  'ACTIVE',
  'RESPONDED',
  'RELEASED'
);

CREATE TYPE "CustomsInspectionStatus" AS ENUM (
  'REQUESTED',
  'SCHEDULED',
  'IN_PROGRESS',
  'COMPLETED',
  'CANCELLED'
);

CREATE TYPE "CustomsAssessmentStatus" AS ENUM (
  'PROPOSED',
  'ISSUED',
  'PARTIALLY_PAID',
  'PAID',
  'ADJUSTED',
  'VOID'
);

CREATE TYPE "CustomsReleaseStatus" AS ENUM (
  'NOT_RELEASED',
  'RELEASE_AUTHORIZED',
  'RELEASED',
  'BLOCKED'
);

CREATE TYPE "CustomsExternalDependencyStatus" AS ENUM (
  'PENDING',
  'SATISFIED',
  'FAILED',
  'WAIVED'
);

CREATE TYPE "CustomsDocumentDeficiencyStatus" AS ENUM (
  'OPEN',
  'RESOLVED'
);

CREATE TYPE "CustomsAppealStatus" AS ENUM (
  'FILED',
  'UNDER_REVIEW',
  'DECIDED',
  'WITHDRAWN'
);

CREATE TYPE "CustomsReviewStageStatus" AS ENUM (
  'NOT_STARTED',
  'IN_PROGRESS',
  'COMPLETE',
  'NOT_REQUIRED'
);

CREATE TYPE "TradeAccessActorKind" AS ENUM (
  'ORGANIZATION_MEMBER',
  'CUSTOMS_BROKER',
  'CUSTOMS_OFFICER',
  'PLATFORM_ADMIN'
);

CREATE TABLE "trade_organization_profiles" (
  "id" UUID NOT NULL,
  "organizationId" UUID NOT NULL,
  "jurisdictionId" UUID NOT NULL,
  "profileReference" TEXT NOT NULL,
  "importerStatus" "TradePartyRegistrationStatus" NOT NULL DEFAULT 'NOT_REGISTERED',
  "exporterStatus" "TradePartyRegistrationStatus" NOT NULL DEFAULT 'NOT_REGISTERED',
  "brokerAuthorizationStatus" "CustomsBrokerAuthorizationStatus" NOT NULL DEFAULT 'NOT_AUTHORIZED',
  "ruleEnvironment" TEXT NOT NULL DEFAULT 'NON_PRODUCTION',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "trade_organization_profiles_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "trade_shipments" (
  "id" UUID NOT NULL,
  "organizationId" UUID NOT NULL,
  "tradeOrganizationProfileId" UUID NOT NULL,
  "representativeAuthorityId" UUID,
  "shipmentReference" TEXT NOT NULL,
  "direction" "TradeShipmentDirection" NOT NULL,
  "status" "TradeShipmentStatus" NOT NULL DEFAULT 'DRAFT',
  "description" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "trade_shipments_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "customs_declaration_versions" (
  "id" UUID NOT NULL,
  "customsDeclarationId" UUID NOT NULL,
  "versionNumber" INTEGER NOT NULL,
  "isAmendment" BOOLEAN NOT NULL DEFAULT false,
  "declarationData" JSONB NOT NULL DEFAULT '{}',
  "lockedAt" TIMESTAMP(3),
  "submittedByIdentityId" UUID NOT NULL,
  "submittedAt" TIMESTAMP(3),
  "supersedesVersionId" UUID,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "customs_declaration_versions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "customs_declarations" (
  "id" UUID NOT NULL,
  "organizationId" UUID NOT NULL,
  "tradeOrganizationProfileId" UUID NOT NULL,
  "shipmentId" UUID NOT NULL,
  "declarationReference" TEXT NOT NULL,
  "direction" "TradeShipmentDirection" NOT NULL,
  "status" "CustomsDeclarationStatus" NOT NULL DEFAULT 'DRAFT',
  "currentVersionId" UUID,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "customs_declarations_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "trade_permits" (
  "id" UUID NOT NULL,
  "organizationId" UUID NOT NULL,
  "tradeOrganizationProfileId" UUID NOT NULL,
  "shipmentId" UUID,
  "permitReference" TEXT NOT NULL,
  "permitType" "TradePermitType" NOT NULL,
  "status" "TradePermitStatus" NOT NULL DEFAULT 'REQUESTED',
  "requiredForRelease" BOOLEAN NOT NULL DEFAULT false,
  "expiresAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "trade_permits_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "customs_holds" (
  "id" UUID NOT NULL,
  "shipmentId" UUID NOT NULL,
  "holdReference" TEXT NOT NULL,
  "status" "CustomsHoldStatus" NOT NULL DEFAULT 'ACTIVE',
  "reason" TEXT NOT NULL,
  "responseNotes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "customs_holds_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "customs_inspections" (
  "id" UUID NOT NULL,
  "shipmentId" UUID NOT NULL,
  "inspectionReference" TEXT NOT NULL,
  "status" "CustomsInspectionStatus" NOT NULL DEFAULT 'REQUESTED',
  "scheduledAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "customs_inspections_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "cargo_manifest_references" (
  "id" UUID NOT NULL,
  "shipmentId" UUID NOT NULL,
  "manifestReference" TEXT NOT NULL,
  "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "cargo_manifest_references_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "customs_assessments" (
  "id" UUID NOT NULL,
  "organizationId" UUID NOT NULL,
  "tradeOrganizationProfileId" UUID NOT NULL,
  "shipmentId" UUID NOT NULL,
  "assessmentReference" TEXT NOT NULL,
  "status" "CustomsAssessmentStatus" NOT NULL DEFAULT 'PROPOSED',
  "amountCents" INTEGER NOT NULL,
  "paidAmountCents" INTEGER NOT NULL DEFAULT 0,
  "currency" TEXT NOT NULL DEFAULT 'XCD',
  "paymentRequiredForRelease" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "customs_assessments_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "customs_assessment_payments" (
  "id" UUID NOT NULL,
  "customsAssessmentId" UUID NOT NULL,
  "paymentReference" TEXT NOT NULL,
  "allocatedAmountCents" INTEGER NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'XCD',
  "releaseTriggered" BOOLEAN NOT NULL DEFAULT false,
  "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "customs_assessment_payments_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "customs_release_reviews" (
  "id" UUID NOT NULL,
  "shipmentId" UUID NOT NULL,
  "declarationReviewStatus" "CustomsReviewStageStatus" NOT NULL DEFAULT 'NOT_STARTED',
  "classificationReviewStatus" "CustomsReviewStageStatus" NOT NULL DEFAULT 'NOT_STARTED',
  "valuationReviewStatus" "CustomsReviewStageStatus" NOT NULL DEFAULT 'NOT_STARTED',
  "permitVerificationStatus" "CustomsReviewStageStatus" NOT NULL DEFAULT 'NOT_STARTED',
  "riskReviewStatus" "CustomsReviewStageStatus" NOT NULL DEFAULT 'NOT_STARTED',
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "customs_release_reviews_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "customs_release_records" (
  "id" UUID NOT NULL,
  "shipmentId" UUID NOT NULL,
  "status" "CustomsReleaseStatus" NOT NULL DEFAULT 'NOT_RELEASED',
  "releasedAt" TIMESTAMP(3),
  "releasedByOfficeholderId" UUID,
  "lastEligibilitySnapshot" JSONB NOT NULL DEFAULT '{}',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "customs_release_records_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "customs_external_dependencies" (
  "id" UUID NOT NULL,
  "shipmentId" UUID NOT NULL,
  "dependencyCode" TEXT NOT NULL,
  "status" "CustomsExternalDependencyStatus" NOT NULL DEFAULT 'PENDING',
  "description" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "customs_external_dependencies_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "customs_document_deficiencies" (
  "id" UUID NOT NULL,
  "shipmentId" UUID NOT NULL,
  "deficiencyCode" TEXT NOT NULL,
  "status" "CustomsDocumentDeficiencyStatus" NOT NULL DEFAULT 'OPEN',
  "description" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "customs_document_deficiencies_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "customs_appeals" (
  "id" UUID NOT NULL,
  "organizationId" UUID NOT NULL,
  "tradeOrganizationProfileId" UUID NOT NULL,
  "shipmentId" UUID,
  "appealReference" TEXT NOT NULL,
  "status" "CustomsAppealStatus" NOT NULL DEFAULT 'FILED',
  "grounds" TEXT,
  "filedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "decidedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "customs_appeals_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "customs_ai_recommendations" (
  "id" UUID NOT NULL,
  "shipmentId" UUID NOT NULL,
  "recommendationType" TEXT NOT NULL,
  "summary" TEXT NOT NULL,
  "mayExecuteRelease" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "customs_ai_recommendations_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "customs_official_release_authorities" (
  "id" UUID NOT NULL,
  "officeholderId" UUID NOT NULL,
  "jurisdictionId" UUID NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "customs_official_release_authorities_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "trade_access_audits" (
  "id" UUID NOT NULL,
  "organizationId" UUID NOT NULL,
  "shipmentId" UUID,
  "accessorIdentityId" UUID NOT NULL,
  "actorKind" "TradeAccessActorKind" NOT NULL,
  "endpoint" TEXT NOT NULL,
  "accessGranted" BOOLEAN NOT NULL,
  "denialReason" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "trade_access_audits_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "trade_organization_profiles_organizationId_key" ON "trade_organization_profiles"("organizationId");
CREATE UNIQUE INDEX "trade_organization_profiles_profileReference_key" ON "trade_organization_profiles"("profileReference");
CREATE INDEX "trade_organization_profiles_jurisdictionId_idx" ON "trade_organization_profiles"("jurisdictionId");
CREATE INDEX "trade_organization_profiles_importerStatus_idx" ON "trade_organization_profiles"("importerStatus");
CREATE INDEX "trade_organization_profiles_exporterStatus_idx" ON "trade_organization_profiles"("exporterStatus");

CREATE UNIQUE INDEX "trade_shipments_shipmentReference_key" ON "trade_shipments"("shipmentReference");
CREATE INDEX "trade_shipments_organizationId_idx" ON "trade_shipments"("organizationId");
CREATE INDEX "trade_shipments_tradeOrganizationProfileId_idx" ON "trade_shipments"("tradeOrganizationProfileId");
CREATE INDEX "trade_shipments_representativeAuthorityId_idx" ON "trade_shipments"("representativeAuthorityId");
CREATE INDEX "trade_shipments_status_idx" ON "trade_shipments"("status");

CREATE UNIQUE INDEX "customs_declarations_declarationReference_key" ON "customs_declarations"("declarationReference");
CREATE UNIQUE INDEX "customs_declarations_currentVersionId_key" ON "customs_declarations"("currentVersionId");
CREATE INDEX "customs_declarations_organizationId_idx" ON "customs_declarations"("organizationId");
CREATE INDEX "customs_declarations_shipmentId_idx" ON "customs_declarations"("shipmentId");
CREATE INDEX "customs_declarations_status_idx" ON "customs_declarations"("status");

CREATE UNIQUE INDEX "customs_declaration_versions_supersedesVersionId_key" ON "customs_declaration_versions"("supersedesVersionId");
CREATE UNIQUE INDEX "customs_declaration_versions_customsDeclarationId_versionNumber_key" ON "customs_declaration_versions"("customsDeclarationId", "versionNumber");
CREATE INDEX "customs_declaration_versions_customsDeclarationId_idx" ON "customs_declaration_versions"("customsDeclarationId");

CREATE UNIQUE INDEX "trade_permits_permitReference_key" ON "trade_permits"("permitReference");
CREATE INDEX "trade_permits_organizationId_idx" ON "trade_permits"("organizationId");
CREATE INDEX "trade_permits_shipmentId_idx" ON "trade_permits"("shipmentId");
CREATE INDEX "trade_permits_status_idx" ON "trade_permits"("status");

CREATE UNIQUE INDEX "customs_holds_holdReference_key" ON "customs_holds"("holdReference");
CREATE INDEX "customs_holds_shipmentId_idx" ON "customs_holds"("shipmentId");
CREATE INDEX "customs_holds_status_idx" ON "customs_holds"("status");

CREATE UNIQUE INDEX "customs_inspections_inspectionReference_key" ON "customs_inspections"("inspectionReference");
CREATE INDEX "customs_inspections_shipmentId_idx" ON "customs_inspections"("shipmentId");
CREATE INDEX "customs_inspections_status_idx" ON "customs_inspections"("status");

CREATE UNIQUE INDEX "cargo_manifest_references_manifestReference_key" ON "cargo_manifest_references"("manifestReference");
CREATE INDEX "cargo_manifest_references_shipmentId_idx" ON "cargo_manifest_references"("shipmentId");

CREATE UNIQUE INDEX "customs_assessments_assessmentReference_key" ON "customs_assessments"("assessmentReference");
CREATE INDEX "customs_assessments_organizationId_idx" ON "customs_assessments"("organizationId");
CREATE INDEX "customs_assessments_shipmentId_idx" ON "customs_assessments"("shipmentId");
CREATE INDEX "customs_assessments_status_idx" ON "customs_assessments"("status");

CREATE UNIQUE INDEX "customs_assessment_payments_paymentReference_key" ON "customs_assessment_payments"("paymentReference");
CREATE INDEX "customs_assessment_payments_customsAssessmentId_idx" ON "customs_assessment_payments"("customsAssessmentId");

CREATE UNIQUE INDEX "customs_release_reviews_shipmentId_key" ON "customs_release_reviews"("shipmentId");

CREATE UNIQUE INDEX "customs_release_records_shipmentId_key" ON "customs_release_records"("shipmentId");
CREATE INDEX "customs_release_records_status_idx" ON "customs_release_records"("status");

CREATE UNIQUE INDEX "customs_external_dependencies_shipmentId_dependencyCode_key" ON "customs_external_dependencies"("shipmentId", "dependencyCode");
CREATE INDEX "customs_external_dependencies_shipmentId_idx" ON "customs_external_dependencies"("shipmentId");
CREATE INDEX "customs_external_dependencies_status_idx" ON "customs_external_dependencies"("status");

CREATE INDEX "customs_document_deficiencies_shipmentId_idx" ON "customs_document_deficiencies"("shipmentId");
CREATE INDEX "customs_document_deficiencies_status_idx" ON "customs_document_deficiencies"("status");

CREATE UNIQUE INDEX "customs_appeals_appealReference_key" ON "customs_appeals"("appealReference");
CREATE INDEX "customs_appeals_organizationId_idx" ON "customs_appeals"("organizationId");
CREATE INDEX "customs_appeals_status_idx" ON "customs_appeals"("status");

CREATE INDEX "customs_ai_recommendations_shipmentId_idx" ON "customs_ai_recommendations"("shipmentId");

CREATE UNIQUE INDEX "customs_official_release_authorities_officeholderId_key" ON "customs_official_release_authorities"("officeholderId");
CREATE INDEX "customs_official_release_authorities_jurisdictionId_idx" ON "customs_official_release_authorities"("jurisdictionId");

CREATE INDEX "trade_access_audits_organizationId_idx" ON "trade_access_audits"("organizationId");
CREATE INDEX "trade_access_audits_accessorIdentityId_idx" ON "trade_access_audits"("accessorIdentityId");
CREATE INDEX "trade_access_audits_createdAt_idx" ON "trade_access_audits"("createdAt");

ALTER TABLE "trade_organization_profiles" ADD CONSTRAINT "trade_organization_profiles_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "trade_organization_profiles" ADD CONSTRAINT "trade_organization_profiles_jurisdictionId_fkey" FOREIGN KEY ("jurisdictionId") REFERENCES "jurisdictions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "trade_shipments" ADD CONSTRAINT "trade_shipments_tradeOrganizationProfileId_fkey" FOREIGN KEY ("tradeOrganizationProfileId") REFERENCES "trade_organization_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "trade_shipments" ADD CONSTRAINT "trade_shipments_representativeAuthorityId_fkey" FOREIGN KEY ("representativeAuthorityId") REFERENCES "representative_authorities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "customs_declarations" ADD CONSTRAINT "customs_declarations_tradeOrganizationProfileId_fkey" FOREIGN KEY ("tradeOrganizationProfileId") REFERENCES "trade_organization_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "customs_declarations" ADD CONSTRAINT "customs_declarations_shipmentId_fkey" FOREIGN KEY ("shipmentId") REFERENCES "trade_shipments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "customs_declarations" ADD CONSTRAINT "customs_declarations_currentVersionId_fkey" FOREIGN KEY ("currentVersionId") REFERENCES "customs_declaration_versions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "customs_declaration_versions" ADD CONSTRAINT "customs_declaration_versions_customsDeclarationId_fkey" FOREIGN KEY ("customsDeclarationId") REFERENCES "customs_declarations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "customs_declaration_versions" ADD CONSTRAINT "customs_declaration_versions_submittedByIdentityId_fkey" FOREIGN KEY ("submittedByIdentityId") REFERENCES "identities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "customs_declaration_versions" ADD CONSTRAINT "customs_declaration_versions_supersedesVersionId_fkey" FOREIGN KEY ("supersedesVersionId") REFERENCES "customs_declaration_versions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "trade_permits" ADD CONSTRAINT "trade_permits_tradeOrganizationProfileId_fkey" FOREIGN KEY ("tradeOrganizationProfileId") REFERENCES "trade_organization_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "trade_permits" ADD CONSTRAINT "trade_permits_shipmentId_fkey" FOREIGN KEY ("shipmentId") REFERENCES "trade_shipments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "customs_holds" ADD CONSTRAINT "customs_holds_shipmentId_fkey" FOREIGN KEY ("shipmentId") REFERENCES "trade_shipments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "customs_inspections" ADD CONSTRAINT "customs_inspections_shipmentId_fkey" FOREIGN KEY ("shipmentId") REFERENCES "trade_shipments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "cargo_manifest_references" ADD CONSTRAINT "cargo_manifest_references_shipmentId_fkey" FOREIGN KEY ("shipmentId") REFERENCES "trade_shipments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "customs_assessments" ADD CONSTRAINT "customs_assessments_tradeOrganizationProfileId_fkey" FOREIGN KEY ("tradeOrganizationProfileId") REFERENCES "trade_organization_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "customs_assessments" ADD CONSTRAINT "customs_assessments_shipmentId_fkey" FOREIGN KEY ("shipmentId") REFERENCES "trade_shipments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "customs_assessment_payments" ADD CONSTRAINT "customs_assessment_payments_customsAssessmentId_fkey" FOREIGN KEY ("customsAssessmentId") REFERENCES "customs_assessments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "customs_release_reviews" ADD CONSTRAINT "customs_release_reviews_shipmentId_fkey" FOREIGN KEY ("shipmentId") REFERENCES "trade_shipments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "customs_release_records" ADD CONSTRAINT "customs_release_records_shipmentId_fkey" FOREIGN KEY ("shipmentId") REFERENCES "trade_shipments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "customs_external_dependencies" ADD CONSTRAINT "customs_external_dependencies_shipmentId_fkey" FOREIGN KEY ("shipmentId") REFERENCES "trade_shipments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "customs_document_deficiencies" ADD CONSTRAINT "customs_document_deficiencies_shipmentId_fkey" FOREIGN KEY ("shipmentId") REFERENCES "trade_shipments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "customs_appeals" ADD CONSTRAINT "customs_appeals_tradeOrganizationProfileId_fkey" FOREIGN KEY ("tradeOrganizationProfileId") REFERENCES "trade_organization_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "customs_appeals" ADD CONSTRAINT "customs_appeals_shipmentId_fkey" FOREIGN KEY ("shipmentId") REFERENCES "trade_shipments"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "customs_ai_recommendations" ADD CONSTRAINT "customs_ai_recommendations_shipmentId_fkey" FOREIGN KEY ("shipmentId") REFERENCES "trade_shipments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "trade_access_audits" ADD CONSTRAINT "trade_access_audits_accessorIdentityId_fkey" FOREIGN KEY ("accessorIdentityId") REFERENCES "identities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
