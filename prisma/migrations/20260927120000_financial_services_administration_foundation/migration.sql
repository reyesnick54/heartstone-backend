-- CreateEnum
CREATE TYPE "FinancialServicesDataClassification" AS ENUM ('PUBLIC', 'OFFICIAL', 'OFFICIAL_SENSITIVE', 'PROTECTED_REGULATORY', 'PROTECTED_ENFORCEMENT', 'RESTRICTED');

-- CreateEnum
CREATE TYPE "FinancialServicesActorPersona" AS ENUM ('APPLICANT', 'REGULATED_ENTITY_REPRESENTATIVE', 'FINANCIAL_SERVICES_OFFICER', 'SENIOR_DECISION_OFFICER', 'COMPLIANCE_OFFICER', 'EXTERNAL_REGULATOR_LIAISON', 'TECHNICAL_ADMIN', 'AI_ASSISTANCE', 'PAYMENT_SYSTEM', 'SYSTEM');

-- CreateEnum
CREATE TYPE "FinancialRegulatedEntityProfileStatus" AS ENUM ('DRAFT', 'REGISTERED', 'UNDER_SUPERVISION', 'SUSPENDED', 'CLOSED');

-- CreateEnum
CREATE TYPE "FinancialDelegatedFunctionActivation" AS ENUM ('INACTIVE', 'ACTIVE');

-- CreateEnum
CREATE TYPE "FinancialLicenceApplicationProfileStatus" AS ENUM ('DRAFT', 'LINKED', 'UNDER_REVIEW', 'WITHDRAWN', 'CLOSED');

-- CreateEnum
CREATE TYPE "FinancialLicenceLifecycleStatus" AS ENUM ('NOT_ISSUED', 'PENDING_ISSUANCE', 'ISSUED', 'EFFECTIVE', 'SUSPENDED', 'REVOKED', 'EXPIRED', 'AMENDED', 'SUPERSEDED');

-- CreateEnum
CREATE TYPE "FinancialExternalRegulatoryDependencyStatus" AS ENUM ('PENDING', 'AWAITING_EXTERNAL_DETERMINATION', 'REFERRED', 'RESOLVED', 'BLOCKED');

-- CreateEnum
CREATE TYPE "FinancialExternalRegulatoryDependencyRecordedBy" AS ENUM ('EXTERNAL_REGULATOR_LIAISON', 'INTEGRATION_SYSTEM', 'FINANCIAL_SERVICES_OFFICER', 'SYSTEM');

-- CreateEnum
CREATE TYPE "FinancialReportingRequirementStatus" AS ENUM ('REQUIRED', 'SUBMITTED', 'ACCEPTED', 'OVERDUE', 'WAIVED');

-- CreateTable
CREATE TABLE "financial_regulated_entity_profiles" (
    "id" UUID NOT NULL,
    "entityReference" TEXT NOT NULL,
    "organizationId" UUID NOT NULL,
    "jurisdictionId" UUID,
    "activityCategoryCode" TEXT NOT NULL,
    "regulatoryStatus" "FinancialRegulatedEntityProfileStatus" NOT NULL DEFAULT 'DRAFT',
    "delegatedLicenceFunctionActivation" "FinancialDelegatedFunctionActivation" NOT NULL DEFAULT 'INACTIVE',
    "governingDelegationReference" TEXT,
    "externalRegulatorReference" TEXT,
    "effectiveFrom" TIMESTAMP(3),
    "effectiveUntil" TIMESTAMP(3),
    "dataClassification" "FinancialServicesDataClassification" NOT NULL DEFAULT 'PROTECTED_REGULATORY',
    "ruleEnvironment" TEXT NOT NULL DEFAULT 'NON_PRODUCTION',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "financial_regulated_entity_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "financial_licence_application_profiles" (
    "id" UUID NOT NULL,
    "applicationReference" TEXT NOT NULL,
    "regulatedEntityProfileId" UUID NOT NULL,
    "applicationId" UUID,
    "caseId" UUID,
    "activityCategoryCode" TEXT NOT NULL,
    "status" "FinancialLicenceApplicationProfileStatus" NOT NULL DEFAULT 'DRAFT',
    "doesNotIssueLicence" BOOLEAN NOT NULL DEFAULT true,
    "requiresNationalDetermination" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "financial_licence_application_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "financial_licence_records" (
    "id" UUID NOT NULL,
    "licenceNumber" TEXT NOT NULL,
    "regulatedEntityProfileId" UUID NOT NULL,
    "licenceApplicationProfileId" UUID,
    "lifecycleStatus" "FinancialLicenceLifecycleStatus" NOT NULL DEFAULT 'NOT_ISSUED',
    "governmentDecisionId" UUID,
    "officialInstrumentId" UUID,
    "authorityEvaluationRecordId" UUID,
    "functionAuthorityRecordId" UUID,
    "requiresNationalDetermination" BOOLEAN NOT NULL DEFAULT false,
    "absezIssuanceAuthorized" BOOLEAN NOT NULL DEFAULT false,
    "validFrom" TIMESTAMP(3),
    "validUntil" TIMESTAMP(3),
    "dataClassification" "FinancialServicesDataClassification" NOT NULL DEFAULT 'PROTECTED_REGULATORY',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "financial_licence_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "financial_licence_conditions" (
    "id" UUID NOT NULL,
    "financialLicenceRecordId" UUID NOT NULL,
    "conditionCode" TEXT NOT NULL,
    "conditionSummary" TEXT,
    "effectiveFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "effectiveUntil" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "financial_licence_conditions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "financial_licence_status_history" (
    "id" UUID NOT NULL,
    "financialLicenceRecordId" UUID NOT NULL,
    "fromStatus" "FinancialLicenceLifecycleStatus",
    "toStatus" "FinancialLicenceLifecycleStatus" NOT NULL,
    "actorIdentityId" UUID,
    "actorPersona" "FinancialServicesActorPersona" NOT NULL,
    "reason" TEXT,
    "governmentDecisionId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "financial_licence_status_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "financial_responsible_person_references" (
    "id" UUID NOT NULL,
    "regulatedEntityProfileId" UUID NOT NULL,
    "identityId" UUID NOT NULL,
    "roleCode" TEXT NOT NULL,
    "effectiveFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "effectiveUntil" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "financial_responsible_person_references_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "financial_beneficial_ownership_linkages" (
    "id" UUID NOT NULL,
    "regulatedEntityProfileId" UUID NOT NULL,
    "corporateBeneficialOwnershipDeclarationId" UUID NOT NULL,
    "linkageRole" TEXT NOT NULL DEFAULT 'REGULATORY_REFERENCE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "financial_beneficial_ownership_linkages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "financial_external_regulatory_dependencies" (
    "id" UUID NOT NULL,
    "regulatedEntityProfileId" UUID,
    "licenceApplicationProfileId" UUID,
    "externalAuthorityId" UUID NOT NULL,
    "dependencyCode" TEXT NOT NULL,
    "dependencyLabel" TEXT NOT NULL,
    "status" "FinancialExternalRegulatoryDependencyStatus" NOT NULL DEFAULT 'PENDING',
    "blocksAbsezLicenceDecision" BOOLEAN NOT NULL DEFAULT true,
    "blocksAbsezIssuance" BOOLEAN NOT NULL DEFAULT true,
    "isAuthenticated" BOOLEAN NOT NULL DEFAULT false,
    "authenticatedPayloadHash" TEXT,
    "spoofedAbsezApprovalAttempt" BOOLEAN NOT NULL DEFAULT false,
    "recordedBy" "FinancialExternalRegulatoryDependencyRecordedBy" NOT NULL,
    "recordedByIdentityId" UUID,
    "retainedNationalDeterminationId" UUID,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "financial_external_regulatory_dependencies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "financial_inspection_references" (
    "id" UUID NOT NULL,
    "regulatedEntityProfileId" UUID NOT NULL,
    "inspectionRecordId" UUID NOT NULL,
    "linkageRole" TEXT NOT NULL DEFAULT 'SUBJECT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "financial_inspection_references_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "financial_compliance_matter_references" (
    "id" UUID NOT NULL,
    "regulatedEntityProfileId" UUID NOT NULL,
    "complianceMatterId" UUID NOT NULL,
    "linkageRole" TEXT NOT NULL DEFAULT 'SUBJECT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "financial_compliance_matter_references_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "financial_reporting_requirement_references" (
    "id" UUID NOT NULL,
    "regulatedEntityProfileId" UUID NOT NULL,
    "requirementCode" TEXT NOT NULL,
    "requirementLabel" TEXT NOT NULL,
    "status" "FinancialReportingRequirementStatus" NOT NULL DEFAULT 'REQUIRED',
    "dueAt" TIMESTAMP(3),
    "submittedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "financial_reporting_requirement_references_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "financial_regulatory_access_audits" (
    "id" UUID NOT NULL,
    "accessorIdentityId" UUID,
    "regulatedEntityProfileId" UUID,
    "actorPersona" "FinancialServicesActorPersona" NOT NULL,
    "endpoint" TEXT NOT NULL,
    "granted" BOOLEAN NOT NULL,
    "reasonCode" TEXT,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "financial_regulatory_access_audits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "financial_services_operational_snapshots" (
    "id" UUID NOT NULL,
    "regulatedEntityProfileId" UUID,
    "jurisdictionId" UUID,
    "snapshotReference" TEXT NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "registeredEntityCount" INTEGER NOT NULL DEFAULT 0,
    "openApplicationCount" INTEGER NOT NULL DEFAULT 0,
    "issuedLicenceCount" INTEGER NOT NULL DEFAULT 0,
    "awaitingExternalCount" INTEGER NOT NULL DEFAULT 0,
    "suspendedLicenceCount" INTEGER NOT NULL DEFAULT 0,
    "computedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "financial_services_operational_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "financial_regulated_entity_profiles_entityReference_key" ON "financial_regulated_entity_profiles"("entityReference");

-- CreateIndex
CREATE INDEX "financial_regulated_entity_profiles_organizationId_idx" ON "financial_regulated_entity_profiles"("organizationId");

-- CreateIndex
CREATE INDEX "financial_regulated_entity_profiles_jurisdictionId_idx" ON "financial_regulated_entity_profiles"("jurisdictionId");

-- CreateIndex
CREATE INDEX "financial_regulated_entity_profiles_regulatoryStatus_idx" ON "financial_regulated_entity_profiles"("regulatoryStatus");

-- CreateIndex
CREATE UNIQUE INDEX "financial_licence_application_profiles_applicationReference_key" ON "financial_licence_application_profiles"("applicationReference");

-- CreateIndex
CREATE INDEX "financial_licence_application_profiles_regulatedEntityProfi_idx" ON "financial_licence_application_profiles"("regulatedEntityProfileId");

-- CreateIndex
CREATE INDEX "financial_licence_application_profiles_status_idx" ON "financial_licence_application_profiles"("status");

-- CreateIndex
CREATE UNIQUE INDEX "financial_licence_records_licenceNumber_key" ON "financial_licence_records"("licenceNumber");

-- CreateIndex
CREATE INDEX "financial_licence_records_regulatedEntityProfileId_idx" ON "financial_licence_records"("regulatedEntityProfileId");

-- CreateIndex
CREATE INDEX "financial_licence_records_lifecycleStatus_idx" ON "financial_licence_records"("lifecycleStatus");

-- CreateIndex
CREATE INDEX "financial_licence_conditions_financialLicenceRecordId_idx" ON "financial_licence_conditions"("financialLicenceRecordId");

-- CreateIndex
CREATE INDEX "financial_licence_status_history_financialLicenceRecordId_idx" ON "financial_licence_status_history"("financialLicenceRecordId");

-- CreateIndex
CREATE INDEX "financial_responsible_person_references_regulatedEntityProf_idx" ON "financial_responsible_person_references"("regulatedEntityProfileId");

-- CreateIndex
CREATE INDEX "financial_responsible_person_references_identityId_idx" ON "financial_responsible_person_references"("identityId");

-- CreateIndex
CREATE UNIQUE INDEX "financial_beneficial_ownership_linkages_regulatedEntityProf_key" ON "financial_beneficial_ownership_linkages"("regulatedEntityProfileId", "corporateBeneficialOwnershipDeclarationId");

-- CreateIndex
CREATE INDEX "financial_external_regulatory_dependencies_regulatedEntityP_idx" ON "financial_external_regulatory_dependencies"("regulatedEntityProfileId");

-- CreateIndex
CREATE INDEX "financial_external_regulatory_dependencies_licenceApplicati_idx" ON "financial_external_regulatory_dependencies"("licenceApplicationProfileId");

-- CreateIndex
CREATE INDEX "financial_external_regulatory_dependencies_externalAuthorit_idx" ON "financial_external_regulatory_dependencies"("externalAuthorityId");

-- CreateIndex
CREATE INDEX "financial_external_regulatory_dependencies_status_idx" ON "financial_external_regulatory_dependencies"("status");

-- CreateIndex
CREATE UNIQUE INDEX "financial_inspection_references_inspectionRecordId_key" ON "financial_inspection_references"("inspectionRecordId");

-- CreateIndex
CREATE INDEX "financial_inspection_references_regulatedEntityProfileId_idx" ON "financial_inspection_references"("regulatedEntityProfileId");

-- CreateIndex
CREATE INDEX "financial_compliance_matter_references_complianceMatterId_idx" ON "financial_compliance_matter_references"("complianceMatterId");

-- CreateIndex
CREATE INDEX "financial_reporting_requirement_references_regulatedEntityP_idx" ON "financial_reporting_requirement_references"("regulatedEntityProfileId");

-- CreateIndex
CREATE INDEX "financial_reporting_requirement_references_status_idx" ON "financial_reporting_requirement_references"("status");

-- CreateIndex
CREATE INDEX "financial_regulatory_access_audits_accessorIdentityId_idx" ON "financial_regulatory_access_audits"("accessorIdentityId");

-- CreateIndex
CREATE INDEX "financial_regulatory_access_audits_regulatedEntityProfileId_idx" ON "financial_regulatory_access_audits"("regulatedEntityProfileId");

-- CreateIndex
CREATE UNIQUE INDEX "financial_services_operational_snapshots_snapshotReference_key" ON "financial_services_operational_snapshots"("snapshotReference");

-- CreateIndex
CREATE INDEX "financial_services_operational_snapshots_jurisdictionId_idx" ON "financial_services_operational_snapshots"("jurisdictionId");

-- AddForeignKey
ALTER TABLE "financial_regulated_entity_profiles" ADD CONSTRAINT "financial_regulated_entity_profiles_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "financial_regulated_entity_profiles" ADD CONSTRAINT "financial_regulated_entity_profiles_jurisdictionId_fkey" FOREIGN KEY ("jurisdictionId") REFERENCES "jurisdictions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "financial_licence_application_profiles" ADD CONSTRAINT "financial_licence_application_profiles_regulatedEntityProf_fkey" FOREIGN KEY ("regulatedEntityProfileId") REFERENCES "financial_regulated_entity_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "financial_licence_application_profiles" ADD CONSTRAINT "financial_licence_application_profiles_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "applications"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "financial_licence_application_profiles" ADD CONSTRAINT "financial_licence_application_profiles_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "cases"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "financial_licence_records" ADD CONSTRAINT "financial_licence_records_regulatedEntityProfileId_fkey" FOREIGN KEY ("regulatedEntityProfileId") REFERENCES "financial_regulated_entity_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "financial_licence_records" ADD CONSTRAINT "financial_licence_records_licenceApplicationProfileId_fkey" FOREIGN KEY ("licenceApplicationProfileId") REFERENCES "financial_licence_application_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "financial_licence_records" ADD CONSTRAINT "financial_licence_records_governmentDecisionId_fkey" FOREIGN KEY ("governmentDecisionId") REFERENCES "government_decisions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "financial_licence_records" ADD CONSTRAINT "financial_licence_records_officialInstrumentId_fkey" FOREIGN KEY ("officialInstrumentId") REFERENCES "official_instruments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "financial_licence_records" ADD CONSTRAINT "financial_licence_records_authorityEvaluationRecordId_fkey" FOREIGN KEY ("authorityEvaluationRecordId") REFERENCES "authority_evaluation_records"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "financial_licence_records" ADD CONSTRAINT "financial_licence_records_functionAuthorityRecordId_fkey" FOREIGN KEY ("functionAuthorityRecordId") REFERENCES "function_authority_records"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "financial_licence_conditions" ADD CONSTRAINT "financial_licence_conditions_financialLicenceRecordId_fkey" FOREIGN KEY ("financialLicenceRecordId") REFERENCES "financial_licence_records"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "financial_licence_status_history" ADD CONSTRAINT "financial_licence_status_history_financialLicenceRecordId_fkey" FOREIGN KEY ("financialLicenceRecordId") REFERENCES "financial_licence_records"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "financial_licence_status_history" ADD CONSTRAINT "financial_licence_status_history_actorIdentityId_fkey" FOREIGN KEY ("actorIdentityId") REFERENCES "identities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "financial_licence_status_history" ADD CONSTRAINT "financial_licence_status_history_governmentDecisionId_fkey" FOREIGN KEY ("governmentDecisionId") REFERENCES "government_decisions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "financial_responsible_person_references" ADD CONSTRAINT "financial_responsible_person_references_regulatedEntityPro_fkey" FOREIGN KEY ("regulatedEntityProfileId") REFERENCES "financial_regulated_entity_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "financial_responsible_person_references" ADD CONSTRAINT "financial_responsible_person_references_identityId_fkey" FOREIGN KEY ("identityId") REFERENCES "identities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "financial_beneficial_ownership_linkages" ADD CONSTRAINT "financial_beneficial_ownership_linkages_regulatedEntityPro_fkey" FOREIGN KEY ("regulatedEntityProfileId") REFERENCES "financial_regulated_entity_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "financial_beneficial_ownership_linkages" ADD CONSTRAINT "financial_beneficial_ownership_linkages_corporateBeneficia_fkey" FOREIGN KEY ("corporateBeneficialOwnershipDeclarationId") REFERENCES "corporate_beneficial_ownership_declarations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "financial_external_regulatory_dependencies" ADD CONSTRAINT "financial_external_regulatory_dependencies_regulatedEntity_fkey" FOREIGN KEY ("regulatedEntityProfileId") REFERENCES "financial_regulated_entity_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "financial_external_regulatory_dependencies" ADD CONSTRAINT "financial_external_regulatory_dependencies_licenceApplicat_fkey" FOREIGN KEY ("licenceApplicationProfileId") REFERENCES "financial_licence_application_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "financial_external_regulatory_dependencies" ADD CONSTRAINT "financial_external_regulatory_dependencies_externalAuthori_fkey" FOREIGN KEY ("externalAuthorityId") REFERENCES "external_authorities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "financial_external_regulatory_dependencies" ADD CONSTRAINT "financial_external_regulatory_dependencies_recordedByIdent_fkey" FOREIGN KEY ("recordedByIdentityId") REFERENCES "identities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "financial_external_regulatory_dependencies" ADD CONSTRAINT "financial_external_regulatory_dependencies_retainedNationa_fkey" FOREIGN KEY ("retainedNationalDeterminationId") REFERENCES "retained_national_determinations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "financial_inspection_references" ADD CONSTRAINT "financial_inspection_references_regulatedEntityProfileId_fkey" FOREIGN KEY ("regulatedEntityProfileId") REFERENCES "financial_regulated_entity_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "financial_inspection_references" ADD CONSTRAINT "financial_inspection_references_inspectionRecordId_fkey" FOREIGN KEY ("inspectionRecordId") REFERENCES "inspection_records"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "financial_compliance_matter_references" ADD CONSTRAINT "financial_compliance_matter_references_regulatedEntityProf_fkey" FOREIGN KEY ("regulatedEntityProfileId") REFERENCES "financial_regulated_entity_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "financial_compliance_matter_references" ADD CONSTRAINT "financial_compliance_matter_references_complianceMatterId_fkey" FOREIGN KEY ("complianceMatterId") REFERENCES "compliance_matters"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "financial_reporting_requirement_references" ADD CONSTRAINT "financial_reporting_requirement_references_regulatedEntity_fkey" FOREIGN KEY ("regulatedEntityProfileId") REFERENCES "financial_regulated_entity_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "financial_regulatory_access_audits" ADD CONSTRAINT "financial_regulatory_access_audits_accessorIdentityId_fkey" FOREIGN KEY ("accessorIdentityId") REFERENCES "identities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "financial_regulatory_access_audits" ADD CONSTRAINT "financial_regulatory_access_audits_regulatedEntityProfileI_fkey" FOREIGN KEY ("regulatedEntityProfileId") REFERENCES "financial_regulated_entity_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "financial_services_operational_snapshots" ADD CONSTRAINT "financial_services_operational_snapshots_regulatedEntityPr_fkey" FOREIGN KEY ("regulatedEntityProfileId") REFERENCES "financial_regulated_entity_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "financial_services_operational_snapshots" ADD CONSTRAINT "financial_services_operational_snapshots_jurisdictionId_fkey" FOREIGN KEY ("jurisdictionId") REFERENCES "jurisdictions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
