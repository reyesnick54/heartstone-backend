-- S18F: ABSEZ Article 9 capability closure (free-zone customs, investor residency, zone land, investor relations)

CREATE TYPE "FreeZoneCustomsCaseStatus" AS ENUM ('CONFIGURED', 'COORDINATION_ACTIVE', 'AWAITING_NATIONAL_CUSTOMS', 'EXTERNAL_DETERMINATION_RECORDED', 'CLOSED');
CREATE TYPE "FreeZoneCustomsCoordinationStatus" AS ENUM ('DRAFT', 'ACTIVE', 'HALTED_PENDING_AUTHORITY', 'AWAITING_EXTERNAL');
CREATE TYPE "FreeZoneDutyReliefRequestStatus" AS ENUM ('REFERENCED', 'AWAITING_NATIONAL_DETERMINATION', 'RECORDED', 'WITHDRAWN');
CREATE TYPE "ImmigrationProgramConfigurationKind" AS ENUM ('INVESTOR_RESIDENCY', 'GENERAL_RESIDENCY_REFERENCE');
CREATE TYPE "ImmigrationProgramConfigurationStatus" AS ENUM ('CONFIGURED', 'SUSPENDED', 'RETIRED');
CREATE TYPE "InvestorResidencyProgramApplicationStatus" AS ENUM ('INTAKE', 'DUE_DILIGENCE', 'AWAITING_NATIONAL_DETERMINATION', 'RECORDED', 'CLOSED');
CREATE TYPE "ZoneLandLeaseLifecycleStatus" AS ENUM ('DRAFT', 'ACTIVE', 'EXPIRED', 'TERMINATED');
CREATE TYPE "ZoneLandConcessionLifecycleStatus" AS ENUM ('DRAFT', 'ACTIVE', 'EXPIRED', 'REVOKED');
CREATE TYPE "ZoneLandOccupancyUseStatus" AS ENUM ('PROPOSED', 'ACTIVE', 'ENDED');
CREATE TYPE "InvestorInquiryStatus" AS ENUM ('OPEN', 'ASSIGNED', 'IN_PROGRESS', 'CLOSED');
CREATE TYPE "AbsezArticle9ServicePackReadinessStatus" AS ENUM ('NOT_COMPILED', 'COMPILED_NON_PRODUCTION', 'ACCEPTED', 'OPERATIONAL_BLOCKED');

CREATE TABLE "bonded_warehouse_references" (
    "id" UUID NOT NULL,
    "institutionId" UUID NOT NULL,
    "warehouseCode" TEXT NOT NULL,
    "facilityLabel" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bonded_warehouse_references_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "free_zone_customs_cases" (
    "id" UUID NOT NULL,
    "caseReference" TEXT NOT NULL,
    "institutionId" UUID NOT NULL,
    "jurisdictionId" UUID NOT NULL,
    "caseId" UUID,
    "applicationId" UUID,
    "shipmentReferenceId" UUID,
    "customsDeclarationId" UUID,
    "absezZoneEnterpriseId" UUID,
    "delegatedFunctionCode" TEXT NOT NULL DEFAULT 'ABSEZ-FN-CUSTOMS-FACILITATION',
    "governingSourceId" UUID,
    "status" "FreeZoneCustomsCaseStatus" NOT NULL DEFAULT 'CONFIGURED',
    "coordinationStatus" "FreeZoneCustomsCoordinationStatus" NOT NULL DEFAULT 'DRAFT',
    "doesNotImplyCustomsClearance" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "free_zone_customs_cases_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "free_zone_bonded_warehouse_links" (
    "id" UUID NOT NULL,
    "freeZoneCustomsCaseId" UUID NOT NULL,
    "bondedWarehouseReferenceId" UUID NOT NULL,
    "relationshipLabel" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "free_zone_bonded_warehouse_links_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "free_zone_duty_relief_requests" (
    "id" UUID NOT NULL,
    "freeZoneCustomsCaseId" UUID NOT NULL,
    "requestReference" TEXT NOT NULL,
    "status" "FreeZoneDutyReliefRequestStatus" NOT NULL DEFAULT 'REFERENCED',
    "retainedNationalDeterminationId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "free_zone_duty_relief_requests_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "free_zone_port_customs_coordinations" (
    "id" UUID NOT NULL,
    "freeZoneCustomsCaseId" UUID NOT NULL,
    "portReferenceToken" TEXT NOT NULL,
    "coordinationNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "free_zone_port_customs_coordinations_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "free_zone_customs_external_determinations" (
    "id" UUID NOT NULL,
    "freeZoneCustomsCaseId" UUID NOT NULL,
    "externalAuthorityId" UUID NOT NULL,
    "retainedNationalDeterminationId" UUID,
    "isAuthenticated" BOOLEAN NOT NULL DEFAULT false,
    "authenticatedPayloadHash" TEXT,
    "blocksAbsezCoordinationAction" BOOLEAN NOT NULL DEFAULT true,
    "recordedByIdentityId" UUID,
    "spoofedAbsezClearanceAttempt" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "free_zone_customs_external_determinations_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "immigration_program_configurations" (
    "id" UUID NOT NULL,
    "programCode" TEXT NOT NULL,
    "programLabel" TEXT NOT NULL,
    "programKind" "ImmigrationProgramConfigurationKind" NOT NULL DEFAULT 'INVESTOR_RESIDENCY',
    "institutionId" UUID,
    "governingSourceId" UUID,
    "status" "ImmigrationProgramConfigurationStatus" NOT NULL DEFAULT 'CONFIGURED',
    "doesNotGrantResidencyOrCitizenship" BOOLEAN NOT NULL DEFAULT true,
    "configurationPayload" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "immigration_program_configurations_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "investor_residency_program_applications" (
    "id" UUID NOT NULL,
    "applicationReference" TEXT NOT NULL,
    "immigrationProgramConfigurationId" UUID NOT NULL,
    "immigrationProfileId" UUID NOT NULL,
    "residencyApplicationProfileId" UUID,
    "organizationId" UUID,
    "strategicProjectProfileId" UUID,
    "caseId" UUID,
    "applicationId" UUID,
    "status" "InvestorResidencyProgramApplicationStatus" NOT NULL DEFAULT 'INTAKE',
    "paymentDoesNotGrantResidency" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "investor_residency_program_applications_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "investor_residency_due_diligence_references" (
    "id" UUID NOT NULL,
    "investorResidencyProgramApplicationId" UUID NOT NULL,
    "evidenceRecordId" UUID,
    "referenceLabel" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "investor_residency_due_diligence_references_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "zone_land_lease_records" (
    "id" UUID NOT NULL,
    "leaseReference" TEXT NOT NULL,
    "institutionId" UUID NOT NULL,
    "landParcelId" UUID NOT NULL,
    "organizationId" UUID,
    "personId" UUID,
    "strategicProjectProfileId" UUID,
    "governingSourceId" UUID,
    "governmentDecisionId" UUID,
    "effectiveFrom" TIMESTAMP(3),
    "effectiveUntil" TIMESTAMP(3),
    "conditionsSummary" TEXT,
    "status" "ZoneLandLeaseLifecycleStatus" NOT NULL DEFAULT 'DRAFT',
    "doesNotImplyPlanningPermission" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "zone_land_lease_records_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "zone_land_concession_records" (
    "id" UUID NOT NULL,
    "concessionReference" TEXT NOT NULL,
    "institutionId" UUID NOT NULL,
    "landParcelId" UUID NOT NULL,
    "organizationId" UUID,
    "strategicProjectProfileId" UUID,
    "governingSourceId" UUID,
    "governmentDecisionId" UUID,
    "effectiveFrom" TIMESTAMP(3),
    "effectiveUntil" TIMESTAMP(3),
    "status" "ZoneLandConcessionLifecycleStatus" NOT NULL DEFAULT 'DRAFT',
    "doesNotImplyPlanningPermission" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "zone_land_concession_records_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "zone_land_occupancy_use_relationships" (
    "id" UUID NOT NULL,
    "zoneLandLeaseRecordId" UUID,
    "zoneLandConcessionRecordId" UUID,
    "useTypeCode" TEXT NOT NULL,
    "status" "ZoneLandOccupancyUseStatus" NOT NULL DEFAULT 'PROPOSED',
    "effectiveFrom" TIMESTAMP(3),
    "effectiveUntil" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "zone_land_occupancy_use_relationships_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "investor_relations_profiles" (
    "id" UUID NOT NULL,
    "institutionId" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "profileReference" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "investor_relations_profiles_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "investor_inquiry_records" (
    "id" UUID NOT NULL,
    "investorRelationsProfileId" UUID NOT NULL,
    "inquiryReference" TEXT NOT NULL,
    "subjectSummary" TEXT NOT NULL,
    "status" "InvestorInquiryStatus" NOT NULL DEFAULT 'OPEN',
    "strategicProjectProfileId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "investor_inquiry_records_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "investor_inquiry_case_links" (
    "id" UUID NOT NULL,
    "investorInquiryRecordId" UUID NOT NULL,
    "caseId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "investor_inquiry_case_links_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "investor_case_manager_assignments" (
    "id" UUID NOT NULL,
    "investorInquiryRecordId" UUID NOT NULL,
    "managerIdentityId" UUID NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),

    CONSTRAINT "investor_case_manager_assignments_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "investor_inquiry_status_history" (
    "id" UUID NOT NULL,
    "investorInquiryRecordId" UUID NOT NULL,
    "fromStatus" "InvestorInquiryStatus",
    "toStatus" "InvestorInquiryStatus" NOT NULL,
    "actorIdentityId" UUID,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "investor_inquiry_status_history_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "absez_article9_service_path_states" (
    "id" UUID NOT NULL,
    "departmentCode" TEXT NOT NULL,
    "servicePathKey" TEXT NOT NULL,
    "servicePackReadiness" "AbsezArticle9ServicePackReadinessStatus" NOT NULL DEFAULT 'COMPILED_NON_PRODUCTION',
    "delegatedFunctionCode" TEXT,
    "isConfigured" BOOLEAN NOT NULL DEFAULT true,
    "isInstitutionallyActive" BOOLEAN NOT NULL DEFAULT false,
    "isOperationallyActive" BOOLEAN NOT NULL DEFAULT false,
    "governingSourceCode" TEXT,
    "operationalDependencySummary" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "absez_article9_service_path_states_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "bonded_warehouse_references_institutionId_warehouseCode_key" ON "bonded_warehouse_references"("institutionId", "warehouseCode");
CREATE UNIQUE INDEX "free_zone_customs_cases_caseReference_key" ON "free_zone_customs_cases"("caseReference");
CREATE UNIQUE INDEX "free_zone_bonded_warehouse_links_freeZoneCustomsCaseId_bondedWarehouseReferenceId_key" ON "free_zone_bonded_warehouse_links"("freeZoneCustomsCaseId", "bondedWarehouseReferenceId");
CREATE UNIQUE INDEX "free_zone_duty_relief_requests_requestReference_key" ON "free_zone_duty_relief_requests"("requestReference");
CREATE UNIQUE INDEX "immigration_program_configurations_programCode_key" ON "immigration_program_configurations"("programCode");
CREATE UNIQUE INDEX "investor_residency_program_applications_applicationReference_key" ON "investor_residency_program_applications"("applicationReference");
CREATE UNIQUE INDEX "zone_land_lease_records_leaseReference_key" ON "zone_land_lease_records"("leaseReference");
CREATE UNIQUE INDEX "zone_land_concession_records_concessionReference_key" ON "zone_land_concession_records"("concessionReference");
CREATE UNIQUE INDEX "investor_relations_profiles_institutionId_organizationId_key" ON "investor_relations_profiles"("institutionId", "organizationId");
CREATE UNIQUE INDEX "investor_relations_profiles_profileReference_key" ON "investor_relations_profiles"("profileReference");
CREATE UNIQUE INDEX "investor_inquiry_records_inquiryReference_key" ON "investor_inquiry_records"("inquiryReference");
CREATE UNIQUE INDEX "investor_inquiry_case_links_investorInquiryRecordId_caseId_key" ON "investor_inquiry_case_links"("investorInquiryRecordId", "caseId");
CREATE UNIQUE INDEX "absez_article9_service_path_states_departmentCode_servicePathKey_key" ON "absez_article9_service_path_states"("departmentCode", "servicePathKey");

CREATE INDEX "free_zone_customs_cases_institutionId_idx" ON "free_zone_customs_cases"("institutionId");
CREATE INDEX "free_zone_customs_cases_status_idx" ON "free_zone_customs_cases"("status");
CREATE INDEX "investor_residency_program_applications_immigrationProfileId_idx" ON "investor_residency_program_applications"("immigrationProfileId");
CREATE INDEX "zone_land_lease_records_landParcelId_idx" ON "zone_land_lease_records"("landParcelId");
CREATE INDEX "investor_inquiry_records_investorRelationsProfileId_idx" ON "investor_inquiry_records"("investorRelationsProfileId");

ALTER TABLE "bonded_warehouse_references" ADD CONSTRAINT "bonded_warehouse_references_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "institutions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "free_zone_customs_cases" ADD CONSTRAINT "free_zone_customs_cases_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "institutions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "free_zone_customs_cases" ADD CONSTRAINT "free_zone_customs_cases_jurisdictionId_fkey" FOREIGN KEY ("jurisdictionId") REFERENCES "jurisdictions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "free_zone_customs_cases" ADD CONSTRAINT "free_zone_customs_cases_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "cases"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "free_zone_customs_cases" ADD CONSTRAINT "free_zone_customs_cases_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "applications"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "free_zone_customs_cases" ADD CONSTRAINT "free_zone_customs_cases_shipmentReferenceId_fkey" FOREIGN KEY ("shipmentReferenceId") REFERENCES "shipment_references"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "free_zone_customs_cases" ADD CONSTRAINT "free_zone_customs_cases_customsDeclarationId_fkey" FOREIGN KEY ("customsDeclarationId") REFERENCES "customs_declarations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "free_zone_customs_cases" ADD CONSTRAINT "free_zone_customs_cases_absezZoneEnterpriseId_fkey" FOREIGN KEY ("absezZoneEnterpriseId") REFERENCES "absez_zone_enterprises"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "free_zone_customs_cases" ADD CONSTRAINT "free_zone_customs_cases_governingSourceId_fkey" FOREIGN KEY ("governingSourceId") REFERENCES "governing_sources"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "free_zone_bonded_warehouse_links" ADD CONSTRAINT "free_zone_bonded_warehouse_links_freeZoneCustomsCaseId_fkey" FOREIGN KEY ("freeZoneCustomsCaseId") REFERENCES "free_zone_customs_cases"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "free_zone_bonded_warehouse_links" ADD CONSTRAINT "free_zone_bonded_warehouse_links_bondedWarehouseReferenceId_fkey" FOREIGN KEY ("bondedWarehouseReferenceId") REFERENCES "bonded_warehouse_references"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "free_zone_duty_relief_requests" ADD CONSTRAINT "free_zone_duty_relief_requests_freeZoneCustomsCaseId_fkey" FOREIGN KEY ("freeZoneCustomsCaseId") REFERENCES "free_zone_customs_cases"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "free_zone_duty_relief_requests" ADD CONSTRAINT "free_zone_duty_relief_requests_retainedNationalDeterminationId_fkey" FOREIGN KEY ("retainedNationalDeterminationId") REFERENCES "retained_national_determinations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "free_zone_port_customs_coordinations" ADD CONSTRAINT "free_zone_port_customs_coordinations_freeZoneCustomsCaseId_fkey" FOREIGN KEY ("freeZoneCustomsCaseId") REFERENCES "free_zone_customs_cases"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "free_zone_customs_external_determinations" ADD CONSTRAINT "free_zone_customs_external_determinations_freeZoneCustomsCaseId_fkey" FOREIGN KEY ("freeZoneCustomsCaseId") REFERENCES "free_zone_customs_cases"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "free_zone_customs_external_determinations" ADD CONSTRAINT "free_zone_customs_external_determinations_externalAuthorityId_fkey" FOREIGN KEY ("externalAuthorityId") REFERENCES "external_authorities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "free_zone_customs_external_determinations" ADD CONSTRAINT "free_zone_customs_external_determinations_retainedNationalDeterminationId_fkey" FOREIGN KEY ("retainedNationalDeterminationId") REFERENCES "retained_national_determinations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "free_zone_customs_external_determinations" ADD CONSTRAINT "free_zone_customs_external_determinations_recordedByIdentityId_fkey" FOREIGN KEY ("recordedByIdentityId") REFERENCES "identities"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "immigration_program_configurations" ADD CONSTRAINT "immigration_program_configurations_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "institutions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "immigration_program_configurations" ADD CONSTRAINT "immigration_program_configurations_governingSourceId_fkey" FOREIGN KEY ("governingSourceId") REFERENCES "governing_sources"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "investor_residency_program_applications" ADD CONSTRAINT "investor_residency_program_applications_immigrationProgramConfigurationId_fkey" FOREIGN KEY ("immigrationProgramConfigurationId") REFERENCES "immigration_program_configurations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "investor_residency_program_applications" ADD CONSTRAINT "investor_residency_program_applications_immigrationProfileId_fkey" FOREIGN KEY ("immigrationProfileId") REFERENCES "immigration_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "investor_residency_program_applications" ADD CONSTRAINT "investor_residency_program_applications_residencyApplicationProfileId_fkey" FOREIGN KEY ("residencyApplicationProfileId") REFERENCES "residency_application_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "investor_residency_program_applications" ADD CONSTRAINT "investor_residency_program_applications_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "investor_residency_program_applications" ADD CONSTRAINT "investor_residency_program_applications_strategicProjectProfileId_fkey" FOREIGN KEY ("strategicProjectProfileId") REFERENCES "strategic_project_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "investor_residency_program_applications" ADD CONSTRAINT "investor_residency_program_applications_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "cases"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "investor_residency_program_applications" ADD CONSTRAINT "investor_residency_program_applications_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "applications"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "investor_residency_due_diligence_references" ADD CONSTRAINT "investor_residency_due_diligence_references_investorResidencyProgramApplicationId_fkey" FOREIGN KEY ("investorResidencyProgramApplicationId") REFERENCES "investor_residency_program_applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "investor_residency_due_diligence_references" ADD CONSTRAINT "investor_residency_due_diligence_references_evidenceRecordId_fkey" FOREIGN KEY ("evidenceRecordId") REFERENCES "evidence_records"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "zone_land_lease_records" ADD CONSTRAINT "zone_land_lease_records_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "institutions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "zone_land_lease_records" ADD CONSTRAINT "zone_land_lease_records_landParcelId_fkey" FOREIGN KEY ("landParcelId") REFERENCES "land_parcels"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "zone_land_lease_records" ADD CONSTRAINT "zone_land_lease_records_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "zone_land_lease_records" ADD CONSTRAINT "zone_land_lease_records_personId_fkey" FOREIGN KEY ("personId") REFERENCES "people"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "zone_land_lease_records" ADD CONSTRAINT "zone_land_lease_records_strategicProjectProfileId_fkey" FOREIGN KEY ("strategicProjectProfileId") REFERENCES "strategic_project_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "zone_land_lease_records" ADD CONSTRAINT "zone_land_lease_records_governingSourceId_fkey" FOREIGN KEY ("governingSourceId") REFERENCES "governing_sources"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "zone_land_lease_records" ADD CONSTRAINT "zone_land_lease_records_governmentDecisionId_fkey" FOREIGN KEY ("governmentDecisionId") REFERENCES "government_decisions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "zone_land_concession_records" ADD CONSTRAINT "zone_land_concession_records_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "institutions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "zone_land_concession_records" ADD CONSTRAINT "zone_land_concession_records_landParcelId_fkey" FOREIGN KEY ("landParcelId") REFERENCES "land_parcels"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "zone_land_concession_records" ADD CONSTRAINT "zone_land_concession_records_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "zone_land_concession_records" ADD CONSTRAINT "zone_land_concession_records_strategicProjectProfileId_fkey" FOREIGN KEY ("strategicProjectProfileId") REFERENCES "strategic_project_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "zone_land_concession_records" ADD CONSTRAINT "zone_land_concession_records_governingSourceId_fkey" FOREIGN KEY ("governingSourceId") REFERENCES "governing_sources"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "zone_land_concession_records" ADD CONSTRAINT "zone_land_concession_records_governmentDecisionId_fkey" FOREIGN KEY ("governmentDecisionId") REFERENCES "government_decisions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "zone_land_occupancy_use_relationships" ADD CONSTRAINT "zone_land_occupancy_use_relationships_zoneLandLeaseRecordId_fkey" FOREIGN KEY ("zoneLandLeaseRecordId") REFERENCES "zone_land_lease_records"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "zone_land_occupancy_use_relationships" ADD CONSTRAINT "zone_land_occupancy_use_relationships_zoneLandConcessionRecordId_fkey" FOREIGN KEY ("zoneLandConcessionRecordId") REFERENCES "zone_land_concession_records"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "investor_relations_profiles" ADD CONSTRAINT "investor_relations_profiles_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "institutions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "investor_relations_profiles" ADD CONSTRAINT "investor_relations_profiles_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "investor_inquiry_records" ADD CONSTRAINT "investor_inquiry_records_investorRelationsProfileId_fkey" FOREIGN KEY ("investorRelationsProfileId") REFERENCES "investor_relations_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "investor_inquiry_records" ADD CONSTRAINT "investor_inquiry_records_strategicProjectProfileId_fkey" FOREIGN KEY ("strategicProjectProfileId") REFERENCES "strategic_project_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "investor_inquiry_case_links" ADD CONSTRAINT "investor_inquiry_case_links_investorInquiryRecordId_fkey" FOREIGN KEY ("investorInquiryRecordId") REFERENCES "investor_inquiry_records"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "investor_inquiry_case_links" ADD CONSTRAINT "investor_inquiry_case_links_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "cases"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "investor_case_manager_assignments" ADD CONSTRAINT "investor_case_manager_assignments_investorInquiryRecordId_fkey" FOREIGN KEY ("investorInquiryRecordId") REFERENCES "investor_inquiry_records"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "investor_case_manager_assignments" ADD CONSTRAINT "investor_case_manager_assignments_managerIdentityId_fkey" FOREIGN KEY ("managerIdentityId") REFERENCES "identities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "investor_inquiry_status_history" ADD CONSTRAINT "investor_inquiry_status_history_investorInquiryRecordId_fkey" FOREIGN KEY ("investorInquiryRecordId") REFERENCES "investor_inquiry_records"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "investor_inquiry_status_history" ADD CONSTRAINT "investor_inquiry_status_history_actorIdentityId_fkey" FOREIGN KEY ("actorIdentityId") REFERENCES "identities"("id") ON DELETE SET NULL ON UPDATE CASCADE;
