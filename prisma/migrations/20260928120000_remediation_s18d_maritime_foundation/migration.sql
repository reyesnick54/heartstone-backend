-- S18D: Blue Economy & Maritime Administration foundation

CREATE TYPE "MaritimeActorPersona" AS ENUM ('APPLICANT', 'VESSEL_OWNER', 'AUTHORIZED_REPRESENTATIVE', 'MARITIME_OFFICER', 'SENIOR_DECISION_OFFICER', 'EXTERNAL_AUTHORITY_LIAISON', 'INSPECTOR', 'TECHNICAL_ADMIN', 'AI_ASSISTANCE', 'PAYMENT_SYSTEM', 'SYSTEM');
CREATE TYPE "MaritimeDataClassification" AS ENUM ('PUBLIC_SUMMARY', 'REGULATORY_ACCESS', 'CONFIDENTIAL_COMMERCIAL', 'SECURITY_SENSITIVE');
CREATE TYPE "VesselAdministrativeStatus" AS ENUM ('DRAFT', 'PENDING', 'ACTIVE', 'SUSPENDED', 'WITHDRAWN', 'ARCHIVED');
CREATE TYPE "VesselPartyType" AS ENUM ('IDENTITY', 'ORGANIZATION');
CREATE TYPE "VesselPartyRelationshipStatus" AS ENUM ('CURRENT', 'SUPERSEDED');
CREATE TYPE "MaritimeExternalDependencyType" AS ENUM ('COMPETENT_REGISTRATION_AUTHORITY', 'COMPETENT_PORT_AUTHORITY', 'OTHER_COMPETENT_AUTHORITY', 'CONFIGURED_AUTHORITY');
CREATE TYPE "MaritimeExternalDependencyStatus" AS ENUM ('PENDING', 'RESOLVED', 'WAIVED');
CREATE TYPE "MaritimeExternalDependencyRecordedBy" AS ENUM ('MARITIME_OFFICER', 'INTEGRATION_SYSTEM', 'EXTERNAL_AUTHORITY_LIAISON', 'SYSTEM');
CREATE TYPE "MaritimeAdministrativeInstrumentStatus" AS ENUM ('NOT_ISSUED', 'PENDING_DECISION', 'ISSUED', 'EFFECTIVE', 'SUSPENDED', 'REVOKED', 'EXPIRED');
CREATE TYPE "VesselProvenanceKind" AS ENUM ('CONFIGURED_SOURCE', 'OFFICIAL_REGISTER_EXTRACT', 'APPLICANT_DECLARATION', 'INTEGRATION_FEED', 'OFFICER_RECORD');

CREATE TABLE "maritime_configurations" (
    "id" UUID NOT NULL,
    "jurisdictionId" UUID NOT NULL,
    "vesselTypeCategoryTaxonomy" JSONB NOT NULL DEFAULT '[]',
    "serviceCategoryTaxonomy" JSONB NOT NULL DEFAULT '[]',
    "applicantCategoryTaxonomy" JSONB NOT NULL DEFAULT '[]',
    "publicVerificationModeCode" TEXT NOT NULL DEFAULT 'MINIMAL',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "maritime_configurations_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "vessel_records" (
    "id" UUID NOT NULL,
    "vesselReferenceNumber" TEXT NOT NULL,
    "vesselName" TEXT,
    "vesselTypeCategoryCode" TEXT,
    "registrationJurisdictionCode" TEXT,
    "administrativeStatus" "VesselAdministrativeStatus" NOT NULL DEFAULT 'DRAFT',
    "registrationEffectiveFrom" TIMESTAMP(3),
    "registrationEffectiveUntil" TIMESTAMP(3),
    "jurisdictionId" UUID,
    "institutionId" UUID,
    "masterAdministrativeFileId" UUID,
    "dataClassification" "MaritimeDataClassification" NOT NULL DEFAULT 'REGULATORY_ACCESS',
    "currentPartyRelationshipId" UUID,
    "doesNotDuplicatePartyIdentity" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vessel_records_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "vessel_official_registration_references" (
    "id" UUID NOT NULL,
    "vesselRecordId" UUID NOT NULL,
    "officialRegistrationReference" TEXT NOT NULL,
    "registrationAuthorityReference" TEXT,
    "externalAuthorityId" UUID,
    "effectiveFrom" TIMESTAMP(3),
    "effectiveUntil" TIMESTAMP(3),
    "provenanceKind" "VesselProvenanceKind" NOT NULL DEFAULT 'CONFIGURED_SOURCE',
    "provenanceSummary" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "vessel_official_registration_references_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "vessel_provenance_records" (
    "id" UUID NOT NULL,
    "vesselRecordId" UUID NOT NULL,
    "provenanceKind" "VesselProvenanceKind" NOT NULL,
    "sourceReference" TEXT,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "recordedByIdentityId" UUID,
    "summary" TEXT,

    CONSTRAINT "vessel_provenance_records_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "vessel_party_relationships" (
    "id" UUID NOT NULL,
    "vesselRecordId" UUID NOT NULL,
    "partyType" "VesselPartyType" NOT NULL,
    "partyRoleCode" TEXT NOT NULL,
    "partyIdentityId" UUID,
    "partyOrganizationId" UUID,
    "representativeAuthorityId" UUID,
    "effectiveFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "effectiveUntil" TIMESTAMP(3),
    "isCurrent" BOOLEAN NOT NULL DEFAULT true,
    "status" "VesselPartyRelationshipStatus" NOT NULL DEFAULT 'CURRENT',
    "doesNotDuplicatePartyRecord" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vessel_party_relationships_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "vessel_status_history" (
    "id" UUID NOT NULL,
    "vesselRecordId" UUID NOT NULL,
    "fromStatusCode" TEXT,
    "toStatusCode" TEXT NOT NULL,
    "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actorIdentityId" UUID,
    "actorPersona" "MaritimeActorPersona",
    "governmentDecisionId" UUID,
    "reasonSummary" TEXT,

    CONSTRAINT "vessel_status_history_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "maritime_application_references" (
    "id" UUID NOT NULL,
    "vesselRecordId" UUID NOT NULL,
    "applicationId" UUID,
    "caseId" UUID,
    "serviceCode" TEXT,
    "licenceTypeCode" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "maritime_application_references_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "maritime_external_dependencies" (
    "id" UUID NOT NULL,
    "vesselRecordId" UUID NOT NULL,
    "dependencyType" "MaritimeExternalDependencyType" NOT NULL,
    "externalAuthorityId" UUID,
    "blocksAbsezAdministrativeDecision" BOOLEAN NOT NULL DEFAULT false,
    "status" "MaritimeExternalDependencyStatus" NOT NULL DEFAULT 'PENDING',
    "externalDecisionReference" TEXT,
    "effectiveAt" TIMESTAMP(3),
    "evidenceRecordId" UUID,
    "recordedBy" "MaritimeExternalDependencyRecordedBy" NOT NULL,
    "recordedByIdentityId" UUID,
    "doesNotReplaceExternalDecision" BOOLEAN NOT NULL DEFAULT true,
    "responseAttributionSummary" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "maritime_external_dependencies_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "maritime_administrative_instruments" (
    "id" UUID NOT NULL,
    "vesselRecordId" UUID NOT NULL,
    "instrumentReference" TEXT NOT NULL,
    "status" "MaritimeAdministrativeInstrumentStatus" NOT NULL DEFAULT 'NOT_ISSUED',
    "instrumentTypeCode" TEXT,
    "governmentDecisionId" UUID,
    "officialInstrumentId" UUID,
    "effectiveFrom" TIMESTAMP(3),
    "effectiveUntil" TIMESTAMP(3),
    "doesNotSubstituteExternalRegistration" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "maritime_administrative_instruments_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "maritime_vessel_inspection_references" (
    "id" UUID NOT NULL,
    "vesselRecordId" UUID NOT NULL,
    "inspectionRecordId" UUID NOT NULL,
    "linkageRole" TEXT NOT NULL DEFAULT 'SUBJECT',
    "inspectionDoesNotAuthorizeCustomsRelease" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "maritime_vessel_inspection_references_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "maritime_customs_case_references" (
    "id" UUID NOT NULL,
    "vesselRecordId" UUID NOT NULL,
    "shipmentReferenceId" UUID,
    "caseId" UUID,
    "maritimeAdministrativeInstrumentId" UUID,
    "maritimeApprovalDoesNotAuthorizeCustomsRelease" BOOLEAN NOT NULL DEFAULT true,
    "referenceSummary" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "maritime_customs_case_references_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "maritime_compliance_references" (
    "id" UUID NOT NULL,
    "vesselRecordId" UUID NOT NULL,
    "complianceMatterId" UUID NOT NULL,
    "linkageRole" TEXT NOT NULL DEFAULT 'SUBJECT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "maritime_compliance_references_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "maritime_data_access_audits" (
    "id" UUID NOT NULL,
    "accessorIdentityId" UUID,
    "vesselRecordId" UUID,
    "institutionId" UUID,
    "classification" "MaritimeDataClassification",
    "endpoint" TEXT NOT NULL,
    "granted" BOOLEAN NOT NULL,
    "reasonCode" TEXT,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "maritime_data_access_audits_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "maritime_configurations_jurisdictionId_key" ON "maritime_configurations"("jurisdictionId");
CREATE UNIQUE INDEX "vessel_records_vesselReferenceNumber_key" ON "vessel_records"("vesselReferenceNumber");
CREATE UNIQUE INDEX "vessel_records_currentPartyRelationshipId_key" ON "vessel_records"("currentPartyRelationshipId");
CREATE UNIQUE INDEX "maritime_administrative_instruments_instrumentReference_key" ON "maritime_administrative_instruments"("instrumentReference");
CREATE UNIQUE INDEX "maritime_vessel_inspection_references_inspectionRecordId_key" ON "maritime_vessel_inspection_references"("inspectionRecordId");

CREATE INDEX "vessel_records_jurisdictionId_idx" ON "vessel_records"("jurisdictionId");
CREATE INDEX "vessel_records_institutionId_idx" ON "vessel_records"("institutionId");
CREATE INDEX "vessel_records_administrativeStatus_idx" ON "vessel_records"("administrativeStatus");
CREATE INDEX "vessel_official_registration_references_vesselRecordId_idx" ON "vessel_official_registration_references"("vesselRecordId");
CREATE INDEX "vessel_party_relationships_vesselRecordId_isCurrent_idx" ON "vessel_party_relationships"("vesselRecordId", "isCurrent");
CREATE INDEX "maritime_external_dependencies_vesselRecordId_idx" ON "maritime_external_dependencies"("vesselRecordId");
CREATE INDEX "maritime_application_references_vesselRecordId_idx" ON "maritime_application_references"("vesselRecordId");

ALTER TABLE "maritime_configurations" ADD CONSTRAINT "maritime_configurations_jurisdictionId_fkey" FOREIGN KEY ("jurisdictionId") REFERENCES "jurisdictions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "vessel_records" ADD CONSTRAINT "vessel_records_jurisdictionId_fkey" FOREIGN KEY ("jurisdictionId") REFERENCES "jurisdictions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "vessel_records" ADD CONSTRAINT "vessel_records_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "institutions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "vessel_records" ADD CONSTRAINT "vessel_records_masterAdministrativeFileId_fkey" FOREIGN KEY ("masterAdministrativeFileId") REFERENCES "master_administrative_files"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "vessel_records" ADD CONSTRAINT "vessel_records_currentPartyRelationshipId_fkey" FOREIGN KEY ("currentPartyRelationshipId") REFERENCES "vessel_party_relationships"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "vessel_official_registration_references" ADD CONSTRAINT "vessel_official_registration_references_vesselRecordId_fkey" FOREIGN KEY ("vesselRecordId") REFERENCES "vessel_records"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "vessel_official_registration_references" ADD CONSTRAINT "vessel_official_registration_references_externalAuthorityId_fkey" FOREIGN KEY ("externalAuthorityId") REFERENCES "external_authorities"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "vessel_provenance_records" ADD CONSTRAINT "vessel_provenance_records_vesselRecordId_fkey" FOREIGN KEY ("vesselRecordId") REFERENCES "vessel_records"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "vessel_provenance_records" ADD CONSTRAINT "vessel_provenance_records_recordedByIdentityId_fkey" FOREIGN KEY ("recordedByIdentityId") REFERENCES "identities"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "vessel_party_relationships" ADD CONSTRAINT "vessel_party_relationships_vesselRecordId_fkey" FOREIGN KEY ("vesselRecordId") REFERENCES "vessel_records"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "vessel_party_relationships" ADD CONSTRAINT "vessel_party_relationships_partyIdentityId_fkey" FOREIGN KEY ("partyIdentityId") REFERENCES "identities"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "vessel_party_relationships" ADD CONSTRAINT "vessel_party_relationships_partyOrganizationId_fkey" FOREIGN KEY ("partyOrganizationId") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "vessel_party_relationships" ADD CONSTRAINT "vessel_party_relationships_representativeAuthorityId_fkey" FOREIGN KEY ("representativeAuthorityId") REFERENCES "representative_authorities"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "vessel_status_history" ADD CONSTRAINT "vessel_status_history_vesselRecordId_fkey" FOREIGN KEY ("vesselRecordId") REFERENCES "vessel_records"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "vessel_status_history" ADD CONSTRAINT "vessel_status_history_actorIdentityId_fkey" FOREIGN KEY ("actorIdentityId") REFERENCES "identities"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "vessel_status_history" ADD CONSTRAINT "vessel_status_history_governmentDecisionId_fkey" FOREIGN KEY ("governmentDecisionId") REFERENCES "government_decisions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "maritime_application_references" ADD CONSTRAINT "maritime_application_references_vesselRecordId_fkey" FOREIGN KEY ("vesselRecordId") REFERENCES "vessel_records"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "maritime_application_references" ADD CONSTRAINT "maritime_application_references_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "applications"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "maritime_application_references" ADD CONSTRAINT "maritime_application_references_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "cases"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "maritime_external_dependencies" ADD CONSTRAINT "maritime_external_dependencies_vesselRecordId_fkey" FOREIGN KEY ("vesselRecordId") REFERENCES "vessel_records"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "maritime_external_dependencies" ADD CONSTRAINT "maritime_external_dependencies_externalAuthorityId_fkey" FOREIGN KEY ("externalAuthorityId") REFERENCES "external_authorities"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "maritime_external_dependencies" ADD CONSTRAINT "maritime_external_dependencies_evidenceRecordId_fkey" FOREIGN KEY ("evidenceRecordId") REFERENCES "evidence_records"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "maritime_external_dependencies" ADD CONSTRAINT "maritime_external_dependencies_recordedByIdentityId_fkey" FOREIGN KEY ("recordedByIdentityId") REFERENCES "identities"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "maritime_administrative_instruments" ADD CONSTRAINT "maritime_administrative_instruments_vesselRecordId_fkey" FOREIGN KEY ("vesselRecordId") REFERENCES "vessel_records"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "maritime_administrative_instruments" ADD CONSTRAINT "maritime_administrative_instruments_governmentDecisionId_fkey" FOREIGN KEY ("governmentDecisionId") REFERENCES "government_decisions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "maritime_administrative_instruments" ADD CONSTRAINT "maritime_administrative_instruments_officialInstrumentId_fkey" FOREIGN KEY ("officialInstrumentId") REFERENCES "official_instruments"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "maritime_vessel_inspection_references" ADD CONSTRAINT "maritime_vessel_inspection_references_vesselRecordId_fkey" FOREIGN KEY ("vesselRecordId") REFERENCES "vessel_records"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "maritime_vessel_inspection_references" ADD CONSTRAINT "maritime_vessel_inspection_references_inspectionRecordId_fkey" FOREIGN KEY ("inspectionRecordId") REFERENCES "inspection_records"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "maritime_customs_case_references" ADD CONSTRAINT "maritime_customs_case_references_vesselRecordId_fkey" FOREIGN KEY ("vesselRecordId") REFERENCES "vessel_records"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "maritime_customs_case_references" ADD CONSTRAINT "maritime_customs_case_references_shipmentReferenceId_fkey" FOREIGN KEY ("shipmentReferenceId") REFERENCES "shipment_references"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "maritime_customs_case_references" ADD CONSTRAINT "maritime_customs_case_references_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "cases"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "maritime_customs_case_references" ADD CONSTRAINT "maritime_customs_case_references_maritimeAdministrativeInstr_fkey" FOREIGN KEY ("maritimeAdministrativeInstrumentId") REFERENCES "maritime_administrative_instruments"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "maritime_compliance_references" ADD CONSTRAINT "maritime_compliance_references_vesselRecordId_fkey" FOREIGN KEY ("vesselRecordId") REFERENCES "vessel_records"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "maritime_compliance_references" ADD CONSTRAINT "maritime_compliance_references_complianceMatterId_fkey" FOREIGN KEY ("complianceMatterId") REFERENCES "compliance_matters"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "maritime_data_access_audits" ADD CONSTRAINT "maritime_data_access_audits_accessorIdentityId_fkey" FOREIGN KEY ("accessorIdentityId") REFERENCES "identities"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "maritime_data_access_audits" ADD CONSTRAINT "maritime_data_access_audits_vesselRecordId_fkey" FOREIGN KEY ("vesselRecordId") REFERENCES "vessel_records"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "maritime_data_access_audits" ADD CONSTRAINT "maritime_data_access_audits_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "institutions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
