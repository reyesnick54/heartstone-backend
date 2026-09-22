-- CreateEnum
CREATE TYPE "TransportationDataClassification" AS ENUM ('PUBLIC_VERIFICATION', 'STANDARD_TRANSPORT', 'PROTECTED_DRIVER', 'PROTECTED_MEDICAL_REFERENCE', 'RESTRICTED_ENFORCEMENT');

-- CreateEnum
CREATE TYPE "TransportationRegistryLifecycleStatus" AS ENUM ('ACTIVE', 'EXPIRED', 'SUSPENDED', 'REVOKED', 'TRANSFERRED', 'RETIRED', 'PENDING');

-- CreateEnum
CREATE TYPE "TransportationApplicationProfileStatus" AS ENUM ('LINKED', 'WITHDRAWN', 'CLOSED');

-- CreateEnum
CREATE TYPE "DriverLicenseLifecycleStatus" AS ENUM ('NOT_ISSUED', 'PENDING_ISSUANCE', 'EFFECTIVE', 'EXPIRED', 'SUSPENDED', 'REVOKED', 'SUPERSEDED');

-- CreateEnum
CREATE TYPE "VehicleIdentifierType" AS ENUM ('VIN_CHASSIS', 'REGISTRATION_NUMBER', 'LICENSE_PLATE', 'ENGINE_REFERENCE', 'EXTERNAL_REGISTRY_REFERENCE', 'OTHER_CONFIGURED');

-- CreateEnum
CREATE TYPE "VehicleIdentifierStatus" AS ENUM ('ACTIVE', 'SUPERSEDED', 'RETIRED');

-- CreateEnum
CREATE TYPE "VehicleOwnershipPartyType" AS ENUM ('IDENTITY', 'ORGANIZATION');

-- CreateEnum
CREATE TYPE "VehicleOwnershipRecordStatus" AS ENUM ('CURRENT', 'SUPERSEDED', 'TRANSFERRED_OUT');

-- CreateEnum
CREATE TYPE "TransportationActorPersona" AS ENUM ('DRIVER', 'VEHICLE_OWNER', 'FLEET_MANAGER', 'TRANSPORT_OPERATOR', 'AUTHORIZED_REPRESENTATIVE', 'TRANSPORTATION_OFFICER', 'SENIOR_DECISION_OFFICER', 'EXTERNAL_PROFESSIONAL_LIAISON', 'TECHNICAL_ADMIN', 'AI_ASSISTANCE', 'PAYMENT_SYSTEM', 'SYSTEM');

-- CreateEnum
CREATE TYPE "DriverTestRecordOutcome" AS ENUM ('PASSED', 'FAILED', 'INCOMPLETE', 'CANCELLED', 'WAIVED_CONFIGURED');

-- CreateEnum
CREATE TYPE "TransportationProfessionalDeterminationStatus" AS ENUM ('PENDING', 'SATISFIED', 'UNSATISFIED', 'WAIVED_CONFIGURED');

-- CreateEnum
CREATE TYPE "FleetVehicleLinkStatus" AS ENUM ('ACTIVE', 'REMOVED', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "TransportPermitLifecycleStatus" AS ENUM ('NOT_ISSUED', 'PENDING_ISSUANCE', 'EFFECTIVE', 'EXPIRED', 'SUSPENDED', 'REVOKED', 'SUPERSEDED');

-- CreateEnum
CREATE TYPE "TransportationRegistryEntryKind" AS ENUM ('DRIVER', 'VEHICLE', 'TRANSPORT_OPERATOR', 'FLEET');

-- CreateEnum
CREATE TYPE "TransportationRegistrySubjectStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'SUSPENDED', 'RETIRED');

-- CreateTable
CREATE TABLE "transportation_registry_entries" (
    "id" UUID NOT NULL,
    "registryNumber" TEXT NOT NULL,
    "entryKind" "TransportationRegistryEntryKind" NOT NULL,
    "jurisdictionId" UUID,
    "subjectStatus" "TransportationRegistrySubjectStatus" NOT NULL DEFAULT 'ACTIVE',
    "driverProfileId" UUID,
    "vehicleRecordId" UUID,
    "transportOperatorRecordId" UUID,
    "fleetRecordId" UUID,
    "masterAdministrativeFileId" UUID,
    "dataClassification" "TransportationDataClassification" NOT NULL DEFAULT 'STANDARD_TRANSPORT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "transportation_registry_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "driver_profiles" (
    "id" UUID NOT NULL,
    "profileNumber" TEXT NOT NULL,
    "subjectIdentityId" UUID NOT NULL,
    "jurisdictionId" UUID,
    "masterAdministrativeFileId" UUID,
    "recordsClassificationReference" TEXT,
    "dataClassification" "TransportationDataClassification" NOT NULL DEFAULT 'PROTECTED_DRIVER',
    "currentDriverLicenseRecordId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "driver_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "driver_license_application_profiles" (
    "id" UUID NOT NULL,
    "profileNumber" TEXT NOT NULL,
    "driverProfileId" UUID NOT NULL,
    "caseId" UUID NOT NULL,
    "applicationId" UUID NOT NULL,
    "licenseProgramCode" TEXT,
    "status" "TransportationApplicationProfileStatus" NOT NULL DEFAULT 'LINKED',
    "submissionAcknowledgedAt" TIMESTAMP(3),
    "doesNotIssueDriverLicense" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "driver_license_application_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "driver_license_records" (
    "id" UUID NOT NULL,
    "licenseNumber" TEXT NOT NULL,
    "driverProfileId" UUID NOT NULL,
    "driverLicenseApplicationProfileId" UUID,
    "officialInstrumentId" UUID,
    "governmentDecisionId" UUID,
    "licenseClassCode" TEXT,
    "validFrom" TIMESTAMP(3),
    "validUntil" TIMESTAMP(3),
    "lifecycleStatus" "DriverLicenseLifecycleStatus" NOT NULL DEFAULT 'NOT_ISSUED',
    "renewalOfLicenseId" UUID,
    "requiresGovernmentDecision" BOOLEAN NOT NULL DEFAULT true,
    "dataClassification" "TransportationDataClassification" NOT NULL DEFAULT 'PROTECTED_DRIVER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "driver_license_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "driver_license_classes" (
    "id" UUID NOT NULL,
    "driverLicenseRecordId" UUID NOT NULL,
    "classCode" TEXT NOT NULL,
    "effectiveFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "effectiveUntil" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "driver_license_classes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "driver_license_endorsements" (
    "id" UUID NOT NULL,
    "driverLicenseRecordId" UUID NOT NULL,
    "endorsementCode" TEXT NOT NULL,
    "effectiveFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "effectiveUntil" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "driver_license_endorsements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "driver_qualifications" (
    "id" UUID NOT NULL,
    "driverProfileId" UUID NOT NULL,
    "qualificationCode" TEXT NOT NULL,
    "acquiredAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "isDecisionDerived" BOOLEAN NOT NULL DEFAULT false,
    "governmentDecisionId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "driver_qualifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "driver_test_records" (
    "id" UUID NOT NULL,
    "testReference" TEXT NOT NULL,
    "driverProfileId" UUID NOT NULL,
    "caseId" UUID,
    "serviceAppointmentId" UUID,
    "testTypeCode" TEXT,
    "outcome" "DriverTestRecordOutcome" NOT NULL DEFAULT 'INCOMPLETE',
    "testedAt" TIMESTAMP(3),
    "doesNotIssueLicense" BOOLEAN NOT NULL DEFAULT true,
    "isLicenseIssuance" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "driver_test_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "driver_medical_requirement_references" (
    "id" UUID NOT NULL,
    "referenceNumber" TEXT NOT NULL,
    "driverProfileId" UUID NOT NULL,
    "caseId" UUID,
    "professionalReviewRecordId" UUID,
    "externalAuthorityId" UUID,
    "determinationReferenceToken" TEXT NOT NULL,
    "determinationStatus" "TransportationProfessionalDeterminationStatus" NOT NULL DEFAULT 'PENDING',
    "satisfiedAt" TIMESTAMP(3),
    "storesDiagnosis" BOOLEAN NOT NULL DEFAULT false,
    "determinationSummaryCode" TEXT,
    "dataClassification" "TransportationDataClassification" NOT NULL DEFAULT 'PROTECTED_MEDICAL_REFERENCE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "driver_medical_requirement_references_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vehicle_records" (
    "id" UUID NOT NULL,
    "vehicleReferenceNumber" TEXT NOT NULL,
    "jurisdictionId" UUID,
    "masterAdministrativeFileId" UUID,
    "vehicleCategoryCode" TEXT,
    "dataClassification" "TransportationDataClassification" NOT NULL DEFAULT 'STANDARD_TRANSPORT',
    "currentRegistrationId" UUID,
    "currentOwnershipRecordId" UUID,
    "publicVerificationToken" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vehicle_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vehicle_identifiers" (
    "id" UUID NOT NULL,
    "vehicleRecordId" UUID NOT NULL,
    "identifierType" "VehicleIdentifierType" NOT NULL,
    "identifierValue" TEXT NOT NULL,
    "issuingJurisdictionCode" TEXT,
    "status" "VehicleIdentifierStatus" NOT NULL DEFAULT 'ACTIVE',
    "effectiveFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "effectiveUntil" TIMESTAMP(3),
    "supersededAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vehicle_identifiers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vehicle_registrations" (
    "id" UUID NOT NULL,
    "registrationNumber" TEXT NOT NULL,
    "vehicleRecordId" UUID NOT NULL,
    "governmentDecisionId" UUID,
    "officialInstrumentId" UUID,
    "registeredFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "registeredUntil" TIMESTAMP(3),
    "isCurrent" BOOLEAN NOT NULL DEFAULT true,
    "supersededAt" TIMESTAMP(3),
    "lifecycleStatus" "TransportationRegistryLifecycleStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vehicle_registrations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vehicle_ownership_records" (
    "id" UUID NOT NULL,
    "vehicleRecordId" UUID NOT NULL,
    "ownerPartyType" "VehicleOwnershipPartyType" NOT NULL,
    "ownerIdentityId" UUID,
    "ownerOrganizationId" UUID,
    "ownershipRoleCode" TEXT,
    "effectiveFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "effectiveUntil" TIMESTAMP(3),
    "isCurrent" BOOLEAN NOT NULL DEFAULT true,
    "status" "VehicleOwnershipRecordStatus" NOT NULL DEFAULT 'CURRENT',
    "supersededAt" TIMESTAMP(3),
    "governmentDecisionId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vehicle_ownership_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vehicle_ownership_history" (
    "id" UUID NOT NULL,
    "vehicleRecordId" UUID NOT NULL,
    "fromOwnershipRecordId" UUID,
    "toOwnershipRecordId" UUID NOT NULL,
    "vehicleTransferId" UUID,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reasonCode" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}',

    CONSTRAINT "vehicle_ownership_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vehicle_inspections" (
    "id" UUID NOT NULL,
    "vehicleRecordId" UUID NOT NULL,
    "inspectionRecordId" UUID NOT NULL,
    "caseId" UUID,
    "inspectionTypeCode" TEXT,
    "resultSummaryCode" TEXT,
    "inspectionResultDoesNotRevokeRegistration" BOOLEAN NOT NULL DEFAULT true,
    "isRegistrationDecision" BOOLEAN NOT NULL DEFAULT false,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vehicle_inspections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vehicle_roadworthiness_records" (
    "id" UUID NOT NULL,
    "vehicleRecordId" UUID NOT NULL,
    "assessmentCode" TEXT NOT NULL,
    "effectiveFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "effectiveUntil" TIMESTAMP(3),
    "lifecycleStatus" "TransportationRegistryLifecycleStatus" NOT NULL DEFAULT 'ACTIVE',
    "governmentDecisionId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vehicle_roadworthiness_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vehicle_transfers" (
    "id" UUID NOT NULL,
    "transferReference" TEXT NOT NULL,
    "vehicleRecordId" UUID NOT NULL,
    "caseId" UUID,
    "fromOwnershipRecordId" UUID NOT NULL,
    "toOwnershipRecordId" UUID NOT NULL,
    "governmentDecisionId" UUID,
    "transferredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "preservesPriorOwnershipHistory" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vehicle_transfers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vehicle_restrictions" (
    "id" UUID NOT NULL,
    "vehicleRecordId" UUID NOT NULL,
    "restrictionCode" TEXT NOT NULL,
    "description" TEXT,
    "effectiveFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "effectiveUntil" TIMESTAMP(3),
    "sourceDecisionId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vehicle_restrictions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vehicle_compliance_records" (
    "id" UUID NOT NULL,
    "vehicleRecordId" UUID NOT NULL,
    "complianceMatterId" UUID,
    "complianceStatusCode" TEXT NOT NULL,
    "assessedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isAuthoritativeDecision" BOOLEAN NOT NULL DEFAULT false,
    "governmentDecisionId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vehicle_compliance_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "commercial_vehicle_permits" (
    "id" UUID NOT NULL,
    "permitNumber" TEXT NOT NULL,
    "vehicleRecordId" UUID NOT NULL,
    "permitCategoryCode" TEXT,
    "validFrom" TIMESTAMP(3),
    "validUntil" TIMESTAMP(3),
    "lifecycleStatus" "TransportPermitLifecycleStatus" NOT NULL DEFAULT 'NOT_ISSUED',
    "governmentDecisionId" UUID,
    "officialInstrumentId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "commercial_vehicle_permits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transport_operator_records" (
    "id" UUID NOT NULL,
    "operatorReferenceNumber" TEXT NOT NULL,
    "operatorCategoryCode" TEXT,
    "operatorIdentityId" UUID,
    "operatorOrganizationId" UUID,
    "jurisdictionId" UUID,
    "masterAdministrativeFileId" UUID,
    "dataClassification" "TransportationDataClassification" NOT NULL DEFAULT 'STANDARD_TRANSPORT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "transport_operator_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transport_operator_licenses" (
    "id" UUID NOT NULL,
    "licenseNumber" TEXT NOT NULL,
    "transportOperatorRecordId" UUID NOT NULL,
    "licenseCategoryCode" TEXT,
    "validFrom" TIMESTAMP(3),
    "validUntil" TIMESTAMP(3),
    "lifecycleStatus" "TransportPermitLifecycleStatus" NOT NULL DEFAULT 'NOT_ISSUED',
    "governmentDecisionId" UUID,
    "officialInstrumentId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "transport_operator_licenses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fleet_records" (
    "id" UUID NOT NULL,
    "fleetReferenceNumber" TEXT NOT NULL,
    "organizationId" UUID NOT NULL,
    "transportOperatorRecordId" UUID,
    "jurisdictionId" UUID,
    "fleetCategoryCode" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fleet_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fleet_vehicles" (
    "id" UUID NOT NULL,
    "fleetRecordId" UUID NOT NULL,
    "vehicleRecordId" UUID NOT NULL,
    "linkStatus" "FleetVehicleLinkStatus" NOT NULL DEFAULT 'ACTIVE',
    "linkedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "removedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fleet_vehicles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transport_permits" (
    "id" UUID NOT NULL,
    "permitNumber" TEXT NOT NULL,
    "transportOperatorRecordId" UUID NOT NULL,
    "permitCategoryCode" TEXT,
    "validFrom" TIMESTAMP(3),
    "validUntil" TIMESTAMP(3),
    "lifecycleStatus" "TransportPermitLifecycleStatus" NOT NULL DEFAULT 'NOT_ISSUED',
    "governmentDecisionId" UUID,
    "officialInstrumentId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "transport_permits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transportation_status_history" (
    "id" UUID NOT NULL,
    "transportationRegistryEntryId" UUID,
    "driverProfileId" UUID,
    "driverLicenseRecordId" UUID,
    "vehicleRecordId" UUID,
    "transportOperatorRecordId" UUID,
    "fleetRecordId" UUID,
    "fromLifecycleStatus" "TransportationRegistryLifecycleStatus",
    "toLifecycleStatus" "TransportationRegistryLifecycleStatus" NOT NULL,
    "statusCode" TEXT,
    "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actorIdentityId" UUID,
    "actorPersona" "TransportationActorPersona" NOT NULL,
    "reason" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}',

    CONSTRAINT "transportation_status_history_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "transportation_registry_entries_registryNumber_key" ON "transportation_registry_entries"("registryNumber");

-- CreateIndex
CREATE UNIQUE INDEX "transportation_registry_entries_driverProfileId_key" ON "transportation_registry_entries"("driverProfileId");

-- CreateIndex
CREATE UNIQUE INDEX "transportation_registry_entries_vehicleRecordId_key" ON "transportation_registry_entries"("vehicleRecordId");

-- CreateIndex
CREATE UNIQUE INDEX "transportation_registry_entries_transportOperatorRecordId_key" ON "transportation_registry_entries"("transportOperatorRecordId");

-- CreateIndex
CREATE UNIQUE INDEX "transportation_registry_entries_fleetRecordId_key" ON "transportation_registry_entries"("fleetRecordId");

-- CreateIndex
CREATE INDEX "transportation_registry_entries_entryKind_subjectStatus_idx" ON "transportation_registry_entries"("entryKind", "subjectStatus");

-- CreateIndex
CREATE INDEX "transportation_registry_entries_jurisdictionId_idx" ON "transportation_registry_entries"("jurisdictionId");

-- CreateIndex
CREATE UNIQUE INDEX "driver_profiles_profileNumber_key" ON "driver_profiles"("profileNumber");

-- CreateIndex
CREATE UNIQUE INDEX "driver_profiles_currentDriverLicenseRecordId_key" ON "driver_profiles"("currentDriverLicenseRecordId");

-- CreateIndex
CREATE INDEX "driver_profiles_subjectIdentityId_idx" ON "driver_profiles"("subjectIdentityId");

-- CreateIndex
CREATE INDEX "driver_profiles_jurisdictionId_idx" ON "driver_profiles"("jurisdictionId");

-- CreateIndex
CREATE UNIQUE INDEX "driver_license_application_profiles_profileNumber_key" ON "driver_license_application_profiles"("profileNumber");

-- CreateIndex
CREATE UNIQUE INDEX "driver_license_application_profiles_caseId_key" ON "driver_license_application_profiles"("caseId");

-- CreateIndex
CREATE UNIQUE INDEX "driver_license_application_profiles_applicationId_key" ON "driver_license_application_profiles"("applicationId");

-- CreateIndex
CREATE INDEX "driver_license_application_profiles_driverProfileId_idx" ON "driver_license_application_profiles"("driverProfileId");

-- CreateIndex
CREATE UNIQUE INDEX "driver_license_records_licenseNumber_key" ON "driver_license_records"("licenseNumber");

-- CreateIndex
CREATE UNIQUE INDEX "driver_license_records_renewalOfLicenseId_key" ON "driver_license_records"("renewalOfLicenseId");

-- CreateIndex
CREATE INDEX "driver_license_records_driverProfileId_lifecycleStatus_idx" ON "driver_license_records"("driverProfileId", "lifecycleStatus");

-- CreateIndex
CREATE INDEX "driver_license_records_validUntil_idx" ON "driver_license_records"("validUntil");

-- CreateIndex
CREATE INDEX "driver_license_classes_driverLicenseRecordId_idx" ON "driver_license_classes"("driverLicenseRecordId");

-- CreateIndex
CREATE INDEX "driver_license_endorsements_driverLicenseRecordId_idx" ON "driver_license_endorsements"("driverLicenseRecordId");

-- CreateIndex
CREATE INDEX "driver_qualifications_driverProfileId_idx" ON "driver_qualifications"("driverProfileId");

-- CreateIndex
CREATE UNIQUE INDEX "driver_test_records_testReference_key" ON "driver_test_records"("testReference");

-- CreateIndex
CREATE UNIQUE INDEX "driver_test_records_serviceAppointmentId_key" ON "driver_test_records"("serviceAppointmentId");

-- CreateIndex
CREATE INDEX "driver_test_records_driverProfileId_idx" ON "driver_test_records"("driverProfileId");

-- CreateIndex
CREATE INDEX "driver_test_records_caseId_idx" ON "driver_test_records"("caseId");

-- CreateIndex
CREATE UNIQUE INDEX "driver_medical_requirement_references_referenceNumber_key" ON "driver_medical_requirement_references"("referenceNumber");

-- CreateIndex
CREATE INDEX "driver_medical_requirement_references_driverProfileId_idx" ON "driver_medical_requirement_references"("driverProfileId");

-- CreateIndex
CREATE INDEX "driver_medical_requirement_references_caseId_idx" ON "driver_medical_requirement_references"("caseId");

-- CreateIndex
CREATE UNIQUE INDEX "vehicle_records_vehicleReferenceNumber_key" ON "vehicle_records"("vehicleReferenceNumber");

-- CreateIndex
CREATE UNIQUE INDEX "vehicle_records_currentRegistrationId_key" ON "vehicle_records"("currentRegistrationId");

-- CreateIndex
CREATE UNIQUE INDEX "vehicle_records_currentOwnershipRecordId_key" ON "vehicle_records"("currentOwnershipRecordId");

-- CreateIndex
CREATE UNIQUE INDEX "vehicle_records_publicVerificationToken_key" ON "vehicle_records"("publicVerificationToken");

-- CreateIndex
CREATE INDEX "vehicle_records_jurisdictionId_idx" ON "vehicle_records"("jurisdictionId");

-- CreateIndex
CREATE INDEX "vehicle_identifiers_vehicleRecordId_identifierType_status_idx" ON "vehicle_identifiers"("vehicleRecordId", "identifierType", "status");

-- CreateIndex
CREATE INDEX "vehicle_identifiers_identifierType_identifierValue_idx" ON "vehicle_identifiers"("identifierType", "identifierValue");

-- CreateIndex
CREATE UNIQUE INDEX "vehicle_registrations_registrationNumber_key" ON "vehicle_registrations"("registrationNumber");

-- CreateIndex
CREATE INDEX "vehicle_registrations_vehicleRecordId_isCurrent_idx" ON "vehicle_registrations"("vehicleRecordId", "isCurrent");

-- CreateIndex
CREATE INDEX "vehicle_ownership_records_vehicleRecordId_isCurrent_idx" ON "vehicle_ownership_records"("vehicleRecordId", "isCurrent");

-- CreateIndex
CREATE INDEX "vehicle_ownership_records_ownerIdentityId_idx" ON "vehicle_ownership_records"("ownerIdentityId");

-- CreateIndex
CREATE INDEX "vehicle_ownership_records_ownerOrganizationId_idx" ON "vehicle_ownership_records"("ownerOrganizationId");

-- CreateIndex
CREATE INDEX "vehicle_ownership_history_vehicleRecordId_recordedAt_idx" ON "vehicle_ownership_history"("vehicleRecordId", "recordedAt");

-- CreateIndex
CREATE UNIQUE INDEX "vehicle_inspections_inspectionRecordId_key" ON "vehicle_inspections"("inspectionRecordId");

-- CreateIndex
CREATE INDEX "vehicle_inspections_vehicleRecordId_idx" ON "vehicle_inspections"("vehicleRecordId");

-- CreateIndex
CREATE INDEX "vehicle_roadworthiness_records_vehicleRecordId_lifecycleSta_idx" ON "vehicle_roadworthiness_records"("vehicleRecordId", "lifecycleStatus");

-- CreateIndex
CREATE UNIQUE INDEX "vehicle_transfers_transferReference_key" ON "vehicle_transfers"("transferReference");

-- CreateIndex
CREATE INDEX "vehicle_transfers_vehicleRecordId_transferredAt_idx" ON "vehicle_transfers"("vehicleRecordId", "transferredAt");

-- CreateIndex
CREATE INDEX "vehicle_restrictions_vehicleRecordId_idx" ON "vehicle_restrictions"("vehicleRecordId");

-- CreateIndex
CREATE INDEX "vehicle_compliance_records_vehicleRecordId_idx" ON "vehicle_compliance_records"("vehicleRecordId");

-- CreateIndex
CREATE UNIQUE INDEX "commercial_vehicle_permits_permitNumber_key" ON "commercial_vehicle_permits"("permitNumber");

-- CreateIndex
CREATE INDEX "commercial_vehicle_permits_vehicleRecordId_lifecycleStatus_idx" ON "commercial_vehicle_permits"("vehicleRecordId", "lifecycleStatus");

-- CreateIndex
CREATE UNIQUE INDEX "transport_operator_records_operatorReferenceNumber_key" ON "transport_operator_records"("operatorReferenceNumber");

-- CreateIndex
CREATE INDEX "transport_operator_records_operatorIdentityId_idx" ON "transport_operator_records"("operatorIdentityId");

-- CreateIndex
CREATE INDEX "transport_operator_records_operatorOrganizationId_idx" ON "transport_operator_records"("operatorOrganizationId");

-- CreateIndex
CREATE UNIQUE INDEX "transport_operator_licenses_licenseNumber_key" ON "transport_operator_licenses"("licenseNumber");

-- CreateIndex
CREATE INDEX "transport_operator_licenses_transportOperatorRecordId_lifec_idx" ON "transport_operator_licenses"("transportOperatorRecordId", "lifecycleStatus");

-- CreateIndex
CREATE UNIQUE INDEX "fleet_records_fleetReferenceNumber_key" ON "fleet_records"("fleetReferenceNumber");

-- CreateIndex
CREATE INDEX "fleet_records_organizationId_idx" ON "fleet_records"("organizationId");

-- CreateIndex
CREATE INDEX "fleet_vehicles_vehicleRecordId_idx" ON "fleet_vehicles"("vehicleRecordId");

-- CreateIndex
CREATE UNIQUE INDEX "fleet_vehicles_fleetRecordId_vehicleRecordId_key" ON "fleet_vehicles"("fleetRecordId", "vehicleRecordId");

-- CreateIndex
CREATE UNIQUE INDEX "transport_permits_permitNumber_key" ON "transport_permits"("permitNumber");

-- CreateIndex
CREATE INDEX "transport_permits_transportOperatorRecordId_lifecycleStatus_idx" ON "transport_permits"("transportOperatorRecordId", "lifecycleStatus");

-- CreateIndex
CREATE INDEX "transportation_status_history_driverProfileId_changedAt_idx" ON "transportation_status_history"("driverProfileId", "changedAt");

-- CreateIndex
CREATE INDEX "transportation_status_history_vehicleRecordId_changedAt_idx" ON "transportation_status_history"("vehicleRecordId", "changedAt");

-- CreateIndex
CREATE INDEX "transportation_status_history_driverLicenseRecordId_changed_idx" ON "transportation_status_history"("driverLicenseRecordId", "changedAt");

-- AddForeignKey
ALTER TABLE "transportation_registry_entries" ADD CONSTRAINT "transportation_registry_entries_jurisdictionId_fkey" FOREIGN KEY ("jurisdictionId") REFERENCES "jurisdictions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transportation_registry_entries" ADD CONSTRAINT "transportation_registry_entries_masterAdministrativeFileId_fkey" FOREIGN KEY ("masterAdministrativeFileId") REFERENCES "master_administrative_files"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transportation_registry_entries" ADD CONSTRAINT "transportation_registry_entries_driverProfileId_fkey" FOREIGN KEY ("driverProfileId") REFERENCES "driver_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transportation_registry_entries" ADD CONSTRAINT "transportation_registry_entries_vehicleRecordId_fkey" FOREIGN KEY ("vehicleRecordId") REFERENCES "vehicle_records"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transportation_registry_entries" ADD CONSTRAINT "transportation_registry_entries_transportOperatorRecordId_fkey" FOREIGN KEY ("transportOperatorRecordId") REFERENCES "transport_operator_records"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transportation_registry_entries" ADD CONSTRAINT "transportation_registry_entries_fleetRecordId_fkey" FOREIGN KEY ("fleetRecordId") REFERENCES "fleet_records"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "driver_profiles" ADD CONSTRAINT "driver_profiles_subjectIdentityId_fkey" FOREIGN KEY ("subjectIdentityId") REFERENCES "identities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "driver_profiles" ADD CONSTRAINT "driver_profiles_jurisdictionId_fkey" FOREIGN KEY ("jurisdictionId") REFERENCES "jurisdictions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "driver_profiles" ADD CONSTRAINT "driver_profiles_masterAdministrativeFileId_fkey" FOREIGN KEY ("masterAdministrativeFileId") REFERENCES "master_administrative_files"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "driver_profiles" ADD CONSTRAINT "driver_profiles_currentDriverLicenseRecordId_fkey" FOREIGN KEY ("currentDriverLicenseRecordId") REFERENCES "driver_license_records"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "driver_license_application_profiles" ADD CONSTRAINT "driver_license_application_profiles_driverProfileId_fkey" FOREIGN KEY ("driverProfileId") REFERENCES "driver_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "driver_license_application_profiles" ADD CONSTRAINT "driver_license_application_profiles_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "cases"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "driver_license_application_profiles" ADD CONSTRAINT "driver_license_application_profiles_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "applications"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "driver_license_records" ADD CONSTRAINT "driver_license_records_driverProfileId_fkey" FOREIGN KEY ("driverProfileId") REFERENCES "driver_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "driver_license_records" ADD CONSTRAINT "driver_license_records_driverLicenseApplicationProfileId_fkey" FOREIGN KEY ("driverLicenseApplicationProfileId") REFERENCES "driver_license_application_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "driver_license_records" ADD CONSTRAINT "driver_license_records_officialInstrumentId_fkey" FOREIGN KEY ("officialInstrumentId") REFERENCES "official_instruments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "driver_license_records" ADD CONSTRAINT "driver_license_records_governmentDecisionId_fkey" FOREIGN KEY ("governmentDecisionId") REFERENCES "government_decisions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "driver_license_records" ADD CONSTRAINT "driver_license_records_renewalOfLicenseId_fkey" FOREIGN KEY ("renewalOfLicenseId") REFERENCES "driver_license_records"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "driver_license_classes" ADD CONSTRAINT "driver_license_classes_driverLicenseRecordId_fkey" FOREIGN KEY ("driverLicenseRecordId") REFERENCES "driver_license_records"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "driver_license_endorsements" ADD CONSTRAINT "driver_license_endorsements_driverLicenseRecordId_fkey" FOREIGN KEY ("driverLicenseRecordId") REFERENCES "driver_license_records"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "driver_qualifications" ADD CONSTRAINT "driver_qualifications_driverProfileId_fkey" FOREIGN KEY ("driverProfileId") REFERENCES "driver_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "driver_qualifications" ADD CONSTRAINT "driver_qualifications_governmentDecisionId_fkey" FOREIGN KEY ("governmentDecisionId") REFERENCES "government_decisions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "driver_test_records" ADD CONSTRAINT "driver_test_records_driverProfileId_fkey" FOREIGN KEY ("driverProfileId") REFERENCES "driver_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "driver_test_records" ADD CONSTRAINT "driver_test_records_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "cases"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "driver_test_records" ADD CONSTRAINT "driver_test_records_serviceAppointmentId_fkey" FOREIGN KEY ("serviceAppointmentId") REFERENCES "service_appointments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "driver_medical_requirement_references" ADD CONSTRAINT "driver_medical_requirement_references_driverProfileId_fkey" FOREIGN KEY ("driverProfileId") REFERENCES "driver_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "driver_medical_requirement_references" ADD CONSTRAINT "driver_medical_requirement_references_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "cases"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "driver_medical_requirement_references" ADD CONSTRAINT "driver_medical_requirement_references_professionalReviewRe_fkey" FOREIGN KEY ("professionalReviewRecordId") REFERENCES "professional_review_records"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "driver_medical_requirement_references" ADD CONSTRAINT "driver_medical_requirement_references_externalAuthorityId_fkey" FOREIGN KEY ("externalAuthorityId") REFERENCES "external_authorities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicle_records" ADD CONSTRAINT "vehicle_records_jurisdictionId_fkey" FOREIGN KEY ("jurisdictionId") REFERENCES "jurisdictions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicle_records" ADD CONSTRAINT "vehicle_records_masterAdministrativeFileId_fkey" FOREIGN KEY ("masterAdministrativeFileId") REFERENCES "master_administrative_files"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicle_records" ADD CONSTRAINT "vehicle_records_currentRegistrationId_fkey" FOREIGN KEY ("currentRegistrationId") REFERENCES "vehicle_registrations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicle_records" ADD CONSTRAINT "vehicle_records_currentOwnershipRecordId_fkey" FOREIGN KEY ("currentOwnershipRecordId") REFERENCES "vehicle_ownership_records"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicle_identifiers" ADD CONSTRAINT "vehicle_identifiers_vehicleRecordId_fkey" FOREIGN KEY ("vehicleRecordId") REFERENCES "vehicle_records"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicle_registrations" ADD CONSTRAINT "vehicle_registrations_vehicleRecordId_fkey" FOREIGN KEY ("vehicleRecordId") REFERENCES "vehicle_records"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicle_registrations" ADD CONSTRAINT "vehicle_registrations_governmentDecisionId_fkey" FOREIGN KEY ("governmentDecisionId") REFERENCES "government_decisions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicle_registrations" ADD CONSTRAINT "vehicle_registrations_officialInstrumentId_fkey" FOREIGN KEY ("officialInstrumentId") REFERENCES "official_instruments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicle_ownership_records" ADD CONSTRAINT "vehicle_ownership_records_vehicleRecordId_fkey" FOREIGN KEY ("vehicleRecordId") REFERENCES "vehicle_records"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicle_ownership_records" ADD CONSTRAINT "vehicle_ownership_records_ownerIdentityId_fkey" FOREIGN KEY ("ownerIdentityId") REFERENCES "identities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicle_ownership_records" ADD CONSTRAINT "vehicle_ownership_records_ownerOrganizationId_fkey" FOREIGN KEY ("ownerOrganizationId") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicle_ownership_records" ADD CONSTRAINT "vehicle_ownership_records_governmentDecisionId_fkey" FOREIGN KEY ("governmentDecisionId") REFERENCES "government_decisions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicle_ownership_history" ADD CONSTRAINT "vehicle_ownership_history_vehicleRecordId_fkey" FOREIGN KEY ("vehicleRecordId") REFERENCES "vehicle_records"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicle_ownership_history" ADD CONSTRAINT "vehicle_ownership_history_fromOwnershipRecordId_fkey" FOREIGN KEY ("fromOwnershipRecordId") REFERENCES "vehicle_ownership_records"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicle_ownership_history" ADD CONSTRAINT "vehicle_ownership_history_toOwnershipRecordId_fkey" FOREIGN KEY ("toOwnershipRecordId") REFERENCES "vehicle_ownership_records"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicle_ownership_history" ADD CONSTRAINT "vehicle_ownership_history_vehicleTransferId_fkey" FOREIGN KEY ("vehicleTransferId") REFERENCES "vehicle_transfers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicle_inspections" ADD CONSTRAINT "vehicle_inspections_vehicleRecordId_fkey" FOREIGN KEY ("vehicleRecordId") REFERENCES "vehicle_records"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicle_inspections" ADD CONSTRAINT "vehicle_inspections_inspectionRecordId_fkey" FOREIGN KEY ("inspectionRecordId") REFERENCES "inspection_records"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicle_inspections" ADD CONSTRAINT "vehicle_inspections_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "cases"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicle_roadworthiness_records" ADD CONSTRAINT "vehicle_roadworthiness_records_vehicleRecordId_fkey" FOREIGN KEY ("vehicleRecordId") REFERENCES "vehicle_records"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicle_roadworthiness_records" ADD CONSTRAINT "vehicle_roadworthiness_records_governmentDecisionId_fkey" FOREIGN KEY ("governmentDecisionId") REFERENCES "government_decisions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicle_transfers" ADD CONSTRAINT "vehicle_transfers_vehicleRecordId_fkey" FOREIGN KEY ("vehicleRecordId") REFERENCES "vehicle_records"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicle_transfers" ADD CONSTRAINT "vehicle_transfers_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "cases"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicle_transfers" ADD CONSTRAINT "vehicle_transfers_fromOwnershipRecordId_fkey" FOREIGN KEY ("fromOwnershipRecordId") REFERENCES "vehicle_ownership_records"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicle_transfers" ADD CONSTRAINT "vehicle_transfers_toOwnershipRecordId_fkey" FOREIGN KEY ("toOwnershipRecordId") REFERENCES "vehicle_ownership_records"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicle_transfers" ADD CONSTRAINT "vehicle_transfers_governmentDecisionId_fkey" FOREIGN KEY ("governmentDecisionId") REFERENCES "government_decisions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicle_restrictions" ADD CONSTRAINT "vehicle_restrictions_vehicleRecordId_fkey" FOREIGN KEY ("vehicleRecordId") REFERENCES "vehicle_records"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicle_restrictions" ADD CONSTRAINT "vehicle_restrictions_sourceDecisionId_fkey" FOREIGN KEY ("sourceDecisionId") REFERENCES "government_decisions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicle_compliance_records" ADD CONSTRAINT "vehicle_compliance_records_vehicleRecordId_fkey" FOREIGN KEY ("vehicleRecordId") REFERENCES "vehicle_records"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicle_compliance_records" ADD CONSTRAINT "vehicle_compliance_records_complianceMatterId_fkey" FOREIGN KEY ("complianceMatterId") REFERENCES "compliance_matters"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicle_compliance_records" ADD CONSTRAINT "vehicle_compliance_records_governmentDecisionId_fkey" FOREIGN KEY ("governmentDecisionId") REFERENCES "government_decisions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commercial_vehicle_permits" ADD CONSTRAINT "commercial_vehicle_permits_vehicleRecordId_fkey" FOREIGN KEY ("vehicleRecordId") REFERENCES "vehicle_records"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commercial_vehicle_permits" ADD CONSTRAINT "commercial_vehicle_permits_governmentDecisionId_fkey" FOREIGN KEY ("governmentDecisionId") REFERENCES "government_decisions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commercial_vehicle_permits" ADD CONSTRAINT "commercial_vehicle_permits_officialInstrumentId_fkey" FOREIGN KEY ("officialInstrumentId") REFERENCES "official_instruments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transport_operator_records" ADD CONSTRAINT "transport_operator_records_operatorIdentityId_fkey" FOREIGN KEY ("operatorIdentityId") REFERENCES "identities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transport_operator_records" ADD CONSTRAINT "transport_operator_records_operatorOrganizationId_fkey" FOREIGN KEY ("operatorOrganizationId") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transport_operator_records" ADD CONSTRAINT "transport_operator_records_jurisdictionId_fkey" FOREIGN KEY ("jurisdictionId") REFERENCES "jurisdictions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transport_operator_records" ADD CONSTRAINT "transport_operator_records_masterAdministrativeFileId_fkey" FOREIGN KEY ("masterAdministrativeFileId") REFERENCES "master_administrative_files"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transport_operator_licenses" ADD CONSTRAINT "transport_operator_licenses_transportOperatorRecordId_fkey" FOREIGN KEY ("transportOperatorRecordId") REFERENCES "transport_operator_records"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transport_operator_licenses" ADD CONSTRAINT "transport_operator_licenses_governmentDecisionId_fkey" FOREIGN KEY ("governmentDecisionId") REFERENCES "government_decisions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transport_operator_licenses" ADD CONSTRAINT "transport_operator_licenses_officialInstrumentId_fkey" FOREIGN KEY ("officialInstrumentId") REFERENCES "official_instruments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fleet_records" ADD CONSTRAINT "fleet_records_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fleet_records" ADD CONSTRAINT "fleet_records_transportOperatorRecordId_fkey" FOREIGN KEY ("transportOperatorRecordId") REFERENCES "transport_operator_records"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fleet_records" ADD CONSTRAINT "fleet_records_jurisdictionId_fkey" FOREIGN KEY ("jurisdictionId") REFERENCES "jurisdictions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fleet_vehicles" ADD CONSTRAINT "fleet_vehicles_fleetRecordId_fkey" FOREIGN KEY ("fleetRecordId") REFERENCES "fleet_records"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fleet_vehicles" ADD CONSTRAINT "fleet_vehicles_vehicleRecordId_fkey" FOREIGN KEY ("vehicleRecordId") REFERENCES "vehicle_records"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transport_permits" ADD CONSTRAINT "transport_permits_transportOperatorRecordId_fkey" FOREIGN KEY ("transportOperatorRecordId") REFERENCES "transport_operator_records"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transport_permits" ADD CONSTRAINT "transport_permits_governmentDecisionId_fkey" FOREIGN KEY ("governmentDecisionId") REFERENCES "government_decisions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transport_permits" ADD CONSTRAINT "transport_permits_officialInstrumentId_fkey" FOREIGN KEY ("officialInstrumentId") REFERENCES "official_instruments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transportation_status_history" ADD CONSTRAINT "transportation_status_history_transportationRegistryEntryI_fkey" FOREIGN KEY ("transportationRegistryEntryId") REFERENCES "transportation_registry_entries"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transportation_status_history" ADD CONSTRAINT "transportation_status_history_driverProfileId_fkey" FOREIGN KEY ("driverProfileId") REFERENCES "driver_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transportation_status_history" ADD CONSTRAINT "transportation_status_history_driverLicenseRecordId_fkey" FOREIGN KEY ("driverLicenseRecordId") REFERENCES "driver_license_records"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transportation_status_history" ADD CONSTRAINT "transportation_status_history_vehicleRecordId_fkey" FOREIGN KEY ("vehicleRecordId") REFERENCES "vehicle_records"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transportation_status_history" ADD CONSTRAINT "transportation_status_history_transportOperatorRecordId_fkey" FOREIGN KEY ("transportOperatorRecordId") REFERENCES "transport_operator_records"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transportation_status_history" ADD CONSTRAINT "transportation_status_history_fleetRecordId_fkey" FOREIGN KEY ("fleetRecordId") REFERENCES "fleet_records"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transportation_status_history" ADD CONSTRAINT "transportation_status_history_actorIdentityId_fkey" FOREIGN KEY ("actorIdentityId") REFERENCES "identities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

