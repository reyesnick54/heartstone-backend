-- Phase 8E: Official Instrument Catalog and Controlled Issuance Engine

ALTER TYPE "CaseStatus" ADD VALUE IF NOT EXISTS 'ISSUED';
ALTER TYPE "CaseEventType" ADD VALUE IF NOT EXISTS 'INSTRUMENT_ISSUED';
ALTER TYPE "DocumentAssociationTargetType" ADD VALUE IF NOT EXISTS 'OFFICIAL_INSTRUMENT';

CREATE TYPE "CatalogLifecycleStatus" AS ENUM ('DRAFT', 'ACTIVE', 'SUPERSEDED', 'ARCHIVED', 'SUSPENDED');
CREATE TYPE "OfficialInstrumentKind" AS ENUM ('APPROVAL_NOTICE', 'LICENSE', 'PERMIT', 'CERTIFICATE', 'REGISTRATION', 'AUTHORIZATION', 'CONDITION_NOTICE', 'SUSPENSION_NOTICE', 'REVOCATION_NOTICE', 'REINSTATEMENT_NOTICE', 'AMENDED_INSTRUMENT', 'REPLACEMENT_INSTRUMENT', 'OFFICIAL_DECISION_NOTICE', 'ACKNOWLEDGMENT', 'OTHER_AUTHORIZED_INSTRUMENT');
CREATE TYPE "DecisionConditionType" AS ENUM ('PRECEDENT_TO_ISSUANCE', 'ONGOING', 'SUSPENSION', 'REVOCATION');
CREATE TYPE "DecisionConditionStatus" AS ENUM ('PENDING', 'SATISFIED', 'WAIVED', 'FAILED', 'SUPERSEDED');
CREATE TYPE "InstrumentIssuerSource" AS ENUM ('ABSEZ_ISSUED', 'RETAINED_NATIONAL_COORDINATED', 'EXTERNAL_AUTHENTICATED');
CREATE TYPE "InstrumentNumberReservationStatus" AS ENUM ('RESERVED', 'COMMITTED', 'RELEASED', 'EXPIRED');
CREATE TYPE "OfficialInstrumentStatus" AS ENUM ('PENDING_ISSUANCE', 'ISSUED', 'SUSPENDED', 'REVOKED', 'EXPIRED', 'SUPERSEDED', 'AMENDED', 'REPLACED');
CREATE TYPE "IssuanceReadinessOutcome" AS ENUM ('READY', 'NOT_READY', 'BLOCKED');
CREATE TYPE "IssuanceEventStatus" AS ENUM ('INITIATED', 'COMPLETED', 'FAILED', 'ROLLED_BACK');

CREATE TABLE "decision_conditions" (
    "id" UUID NOT NULL,
    "governmentDecisionId" UUID NOT NULL,
    "conditionType" "DecisionConditionType" NOT NULL,
    "status" "DecisionConditionStatus" NOT NULL DEFAULT 'PENDING',
    "description" TEXT NOT NULL,
    "satisfiedAt" TIMESTAMP(3),
    "waivedAt" TIMESTAMP(3),
    "failedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "decision_conditions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "instrument_type_definitions" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "kind" "OfficialInstrumentKind" NOT NULL,
    "description" TEXT,
    "lifecycleStatus" "CatalogLifecycleStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "instrument_type_definitions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "instrument_numbering_rules" (
    "id" UUID NOT NULL,
    "institutionId" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "formatPattern" TEXT NOT NULL,
    "sequenceScope" TEXT NOT NULL,
    "lifecycleStatus" "CatalogLifecycleStatus" NOT NULL DEFAULT 'DRAFT',
    "allowReuseOnFailure" BOOLEAN NOT NULL DEFAULT false,
    "currentSequence" INTEGER NOT NULL DEFAULT 0,
    "sequenceYear" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "instrument_numbering_rules_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "instrument_type_versions" (
    "id" UUID NOT NULL,
    "instrumentTypeDefinitionId" UUID NOT NULL,
    "versionNumber" INTEGER NOT NULL,
    "lifecycleStatus" "CatalogLifecycleStatus" NOT NULL DEFAULT 'DRAFT',
    "issuingInstitutionId" UUID NOT NULL,
    "issuanceFunctionAuthorityRecordId" UUID NOT NULL,
    "requiredAuthorityAction" "AuthorityActionType" NOT NULL DEFAULT 'ISSUE',
    "requiredTemplateVersionId" UUID,
    "signatureRequired" BOOLEAN NOT NULL DEFAULT false,
    "sealRequired" BOOLEAN NOT NULL DEFAULT false,
    "numberingRuleId" UUID NOT NULL,
    "effectiveDateRule" JSONB NOT NULL,
    "durationExpiryRule" JSONB,
    "verificationMethod" TEXT NOT NULL,
    "publicationStatus" TEXT NOT NULL,
    "deliveryRequirements" JSONB NOT NULL DEFAULT '[]',
    "correctionProcedure" JSONB,
    "amendmentProcedure" JSONB,
    "renewalProcedure" JSONB,
    "suspensionProcedure" JSONB,
    "revocationProcedure" JSONB,
    "redressRoute" JSONB,
    "recordsClassification" TEXT NOT NULL,
    "retainedNationalBoundary" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "instrument_type_versions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "instrument_templates" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "instrumentTypeVersionId" UUID NOT NULL,
    "lifecycleStatus" "CatalogLifecycleStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "instrument_templates_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "instrument_template_versions" (
    "id" UUID NOT NULL,
    "instrumentTemplateId" UUID NOT NULL,
    "versionNumber" INTEGER NOT NULL,
    "lifecycleStatus" "CatalogLifecycleStatus" NOT NULL DEFAULT 'DRAFT',
    "controlledFields" JSONB NOT NULL,
    "computedFields" JSONB NOT NULL DEFAULT '[]',
    "freeFormFields" JSONB NOT NULL DEFAULT '[]',
    "contentTemplate" TEXT NOT NULL,
    "approvedAt" TIMESTAMP(3),
    "approvedByIdentityId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "instrument_template_versions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "instrument_type_eligible_decision_types" (
    "id" UUID NOT NULL,
    "instrumentTypeVersionId" UUID NOT NULL,
    "decisionTypeVersionId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "instrument_type_eligible_decision_types_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "instrument_number_reservations" (
    "id" UUID NOT NULL,
    "numberingRuleId" UUID NOT NULL,
    "reservedNumber" TEXT NOT NULL,
    "status" "InstrumentNumberReservationStatus" NOT NULL DEFAULT 'RESERVED',
    "officialInstrumentId" UUID,
    "reservedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),
    "committedAt" TIMESTAMP(3),
    "releasedAt" TIMESTAMP(3),
    CONSTRAINT "instrument_number_reservations_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "official_instruments" (
    "id" UUID NOT NULL,
    "instrumentNumber" TEXT,
    "instrumentTypeVersionId" UUID NOT NULL,
    "governmentDecisionId" UUID NOT NULL,
    "caseId" UUID NOT NULL,
    "masterAdministrativeFileId" UUID NOT NULL,
    "holderIdentityId" UUID,
    "holderOrganizationId" UUID,
    "issuerInstitutionId" UUID NOT NULL,
    "issuerOfficeholderId" UUID NOT NULL,
    "issuerSource" "InstrumentIssuerSource" NOT NULL DEFAULT 'ABSEZ_ISSUED',
    "externalIssuerReference" TEXT,
    "scope" JSONB NOT NULL,
    "status" "OfficialInstrumentStatus" NOT NULL DEFAULT 'PENDING_ISSUANCE',
    "effectiveFrom" TIMESTAMP(3),
    "effectiveUntil" TIMESTAMP(3),
    "currentVersionId" UUID,
    "verificationCode" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "official_instruments_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "official_instrument_versions" (
    "id" UUID NOT NULL,
    "officialInstrumentId" UUID NOT NULL,
    "versionNumber" INTEGER NOT NULL,
    "templateVersionId" UUID NOT NULL,
    "documentRecordId" UUID NOT NULL,
    "documentVersionId" UUID NOT NULL,
    "contentHash" TEXT NOT NULL,
    "governmentDecisionId" UUID NOT NULL,
    "conditionsSnapshot" JSONB NOT NULL,
    "signatureRecord" JSONB,
    "sealRecord" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "official_instrument_versions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "issuance_readiness_assessments" (
    "id" UUID NOT NULL,
    "officialInstrumentId" UUID,
    "governmentDecisionId" UUID NOT NULL,
    "instrumentTypeVersionId" UUID NOT NULL,
    "caseId" UUID NOT NULL,
    "outcome" "IssuanceReadinessOutcome" NOT NULL,
    "checklistResults" JSONB NOT NULL,
    "assessedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "assessedByIdentityId" UUID,
    "authorityEvaluationRecordId" UUID,
    CONSTRAINT "issuance_readiness_assessments_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "issuance_events" (
    "id" UUID NOT NULL,
    "officialInstrumentId" UUID NOT NULL,
    "officialInstrumentVersionId" UUID NOT NULL,
    "governmentDecisionId" UUID NOT NULL,
    "caseId" UUID NOT NULL,
    "issuerOfficeholderId" UUID NOT NULL,
    "issuerIdentityId" UUID NOT NULL,
    "authorityEvaluationRecordId" UUID NOT NULL,
    "instrumentNumber" TEXT NOT NULL,
    "numberingReservationId" UUID NOT NULL,
    "status" "IssuanceEventStatus" NOT NULL DEFAULT 'INITIATED',
    "idempotencyKey" TEXT,
    "completedAt" TIMESTAMP(3),
    "failureReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "issuance_events_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "instrument_type_definitions_code_key" ON "instrument_type_definitions"("code");
CREATE UNIQUE INDEX "instrument_numbering_rules_institutionId_code_key" ON "instrument_numbering_rules"("institutionId", "code");
CREATE UNIQUE INDEX "instrument_type_versions_instrumentTypeDefinitionId_versionNumber_key" ON "instrument_type_versions"("instrumentTypeDefinitionId", "versionNumber");
CREATE UNIQUE INDEX "instrument_templates_code_key" ON "instrument_templates"("code");
CREATE UNIQUE INDEX "instrument_template_versions_instrumentTemplateId_versionNumber_key" ON "instrument_template_versions"("instrumentTemplateId", "versionNumber");
CREATE UNIQUE INDEX "instrument_type_eligible_decision_types_instrumentTypeVersionId_decisionTypeVersionId_key" ON "instrument_type_eligible_decision_types"("instrumentTypeVersionId", "decisionTypeVersionId");
CREATE UNIQUE INDEX "instrument_number_reservations_officialInstrumentId_key" ON "instrument_number_reservations"("officialInstrumentId");
CREATE UNIQUE INDEX "instrument_number_reservations_numberingRuleId_reservedNumber_key" ON "instrument_number_reservations"("numberingRuleId", "reservedNumber");
CREATE UNIQUE INDEX "official_instruments_instrumentNumber_key" ON "official_instruments"("instrumentNumber");
CREATE UNIQUE INDEX "official_instruments_currentVersionId_key" ON "official_instruments"("currentVersionId");
CREATE UNIQUE INDEX "official_instrument_versions_officialInstrumentId_versionNumber_key" ON "official_instrument_versions"("officialInstrumentId", "versionNumber");
CREATE UNIQUE INDEX "issuance_events_idempotencyKey_key" ON "issuance_events"("idempotencyKey");

ALTER TABLE "decision_conditions" ADD CONSTRAINT "decision_conditions_governmentDecisionId_fkey" FOREIGN KEY ("governmentDecisionId") REFERENCES "government_decisions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "instrument_numbering_rules" ADD CONSTRAINT "instrument_numbering_rules_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "institutions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "instrument_type_versions" ADD CONSTRAINT "instrument_type_versions_instrumentTypeDefinitionId_fkey" FOREIGN KEY ("instrumentTypeDefinitionId") REFERENCES "instrument_type_definitions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "instrument_type_versions" ADD CONSTRAINT "instrument_type_versions_issuingInstitutionId_fkey" FOREIGN KEY ("issuingInstitutionId") REFERENCES "institutions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "instrument_type_versions" ADD CONSTRAINT "instrument_type_versions_issuanceFunctionAuthorityRecordId_fkey" FOREIGN KEY ("issuanceFunctionAuthorityRecordId") REFERENCES "function_authority_records"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "instrument_type_versions" ADD CONSTRAINT "instrument_type_versions_numberingRuleId_fkey" FOREIGN KEY ("numberingRuleId") REFERENCES "instrument_numbering_rules"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "instrument_templates" ADD CONSTRAINT "instrument_templates_instrumentTypeVersionId_fkey" FOREIGN KEY ("instrumentTypeVersionId") REFERENCES "instrument_type_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "instrument_template_versions" ADD CONSTRAINT "instrument_template_versions_instrumentTemplateId_fkey" FOREIGN KEY ("instrumentTemplateId") REFERENCES "instrument_templates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "instrument_template_versions" ADD CONSTRAINT "instrument_template_versions_approvedByIdentityId_fkey" FOREIGN KEY ("approvedByIdentityId") REFERENCES "identities"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "instrument_type_versions" ADD CONSTRAINT "instrument_type_versions_requiredTemplateVersionId_fkey" FOREIGN KEY ("requiredTemplateVersionId") REFERENCES "instrument_template_versions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "instrument_type_eligible_decision_types" ADD CONSTRAINT "instrument_type_eligible_decision_types_instrumentTypeVersionId_fkey" FOREIGN KEY ("instrumentTypeVersionId") REFERENCES "instrument_type_versions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "instrument_type_eligible_decision_types" ADD CONSTRAINT "instrument_type_eligible_decision_types_decisionTypeVersionId_fkey" FOREIGN KEY ("decisionTypeVersionId") REFERENCES "decision_type_versions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "instrument_number_reservations" ADD CONSTRAINT "instrument_number_reservations_numberingRuleId_fkey" FOREIGN KEY ("numberingRuleId") REFERENCES "instrument_numbering_rules"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "official_instruments" ADD CONSTRAINT "official_instruments_instrumentTypeVersionId_fkey" FOREIGN KEY ("instrumentTypeVersionId") REFERENCES "instrument_type_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "official_instruments" ADD CONSTRAINT "official_instruments_governmentDecisionId_fkey" FOREIGN KEY ("governmentDecisionId") REFERENCES "government_decisions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "official_instruments" ADD CONSTRAINT "official_instruments_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "cases"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "official_instruments" ADD CONSTRAINT "official_instruments_masterAdministrativeFileId_fkey" FOREIGN KEY ("masterAdministrativeFileId") REFERENCES "master_administrative_files"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "official_instruments" ADD CONSTRAINT "official_instruments_holderIdentityId_fkey" FOREIGN KEY ("holderIdentityId") REFERENCES "identities"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "official_instruments" ADD CONSTRAINT "official_instruments_holderOrganizationId_fkey" FOREIGN KEY ("holderOrganizationId") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "official_instruments" ADD CONSTRAINT "official_instruments_issuerInstitutionId_fkey" FOREIGN KEY ("issuerInstitutionId") REFERENCES "institutions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "official_instruments" ADD CONSTRAINT "official_instruments_issuerOfficeholderId_fkey" FOREIGN KEY ("issuerOfficeholderId") REFERENCES "officeholders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "official_instrument_versions" ADD CONSTRAINT "official_instrument_versions_officialInstrumentId_fkey" FOREIGN KEY ("officialInstrumentId") REFERENCES "official_instruments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "official_instrument_versions" ADD CONSTRAINT "official_instrument_versions_templateVersionId_fkey" FOREIGN KEY ("templateVersionId") REFERENCES "instrument_template_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "official_instruments" ADD CONSTRAINT "official_instruments_currentVersionId_fkey" FOREIGN KEY ("currentVersionId") REFERENCES "official_instrument_versions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "instrument_number_reservations" ADD CONSTRAINT "instrument_number_reservations_officialInstrumentId_fkey" FOREIGN KEY ("officialInstrumentId") REFERENCES "official_instruments"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "issuance_readiness_assessments" ADD CONSTRAINT "issuance_readiness_assessments_officialInstrumentId_fkey" FOREIGN KEY ("officialInstrumentId") REFERENCES "official_instruments"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "issuance_readiness_assessments" ADD CONSTRAINT "issuance_readiness_assessments_governmentDecisionId_fkey" FOREIGN KEY ("governmentDecisionId") REFERENCES "government_decisions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "issuance_readiness_assessments" ADD CONSTRAINT "issuance_readiness_assessments_instrumentTypeVersionId_fkey" FOREIGN KEY ("instrumentTypeVersionId") REFERENCES "instrument_type_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "issuance_readiness_assessments" ADD CONSTRAINT "issuance_readiness_assessments_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "cases"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "issuance_events" ADD CONSTRAINT "issuance_events_officialInstrumentId_fkey" FOREIGN KEY ("officialInstrumentId") REFERENCES "official_instruments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "issuance_events" ADD CONSTRAINT "issuance_events_officialInstrumentVersionId_fkey" FOREIGN KEY ("officialInstrumentVersionId") REFERENCES "official_instrument_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "issuance_events" ADD CONSTRAINT "issuance_events_governmentDecisionId_fkey" FOREIGN KEY ("governmentDecisionId") REFERENCES "government_decisions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "issuance_events" ADD CONSTRAINT "issuance_events_issuerOfficeholderId_fkey" FOREIGN KEY ("issuerOfficeholderId") REFERENCES "officeholders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "issuance_events" ADD CONSTRAINT "issuance_events_issuerIdentityId_fkey" FOREIGN KEY ("issuerIdentityId") REFERENCES "identities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "issuance_events" ADD CONSTRAINT "issuance_events_authorityEvaluationRecordId_fkey" FOREIGN KEY ("authorityEvaluationRecordId") REFERENCES "authority_evaluation_records"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "issuance_events" ADD CONSTRAINT "issuance_events_numberingReservationId_fkey" FOREIGN KEY ("numberingReservationId") REFERENCES "instrument_number_reservations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
