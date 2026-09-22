-- CreateEnum
CREATE TYPE "HealthcareConsentType" AS ENUM ('TREATMENT', 'RESEARCH', 'DATA_SHARING', 'GUARDIAN', 'ADMINISTRATIVE');

-- CreateEnum
CREATE TYPE "HealthcareConsentRecordStatus" AS ENUM ('DRAFT', 'ACTIVE', 'SUPERSEDED', 'WITHDRAWN', 'EXPIRED');

-- CreateEnum
CREATE TYPE "HealthcareAccessBasisKind" AS ENUM ('PATIENT_CONSENT', 'LEGAL_AUTHORITY', 'ADMINISTRATIVE', 'TREATMENT_RELATIONSHIP', 'EMERGENCY', 'RESEARCH_APPROVAL', 'PUBLIC_HEALTH');

-- CreateEnum
CREATE TYPE "HealthDataRecordSensitivityClassification" AS ENUM ('GENERAL', 'SENSITIVE', 'MENTAL_HEALTH', 'GENETIC', 'REPRODUCTIVE', 'SUBSTANCE_USE', 'HIV', 'SEALED');

-- CreateEnum
CREATE TYPE "HealthDataRecordStatus" AS ENUM ('REGISTERED', 'VERIFIED', 'DISPUTED', 'SUPERSEDED', 'UNDER_LEGAL_HOLD');

-- CreateEnum
CREATE TYPE "ResearchDatasetStatus" AS ENUM ('DRAFT', 'APPROVED', 'ACTIVE', 'EXPIRED', 'REVOKED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "ResearchDataAccessGrantStatus" AS ENUM ('PENDING', 'ACTIVE', 'EXPIRED', 'REVOKED');

-- CreateEnum
CREATE TYPE "ResearchPseudonymizationState" AS ENUM ('IDENTIFIED', 'PSEUDONYMIZED', 'DE_IDENTIFIED', 'NOT_CLAIMED_ANONYMOUS');

-- CreateEnum
CREATE TYPE "AdverseEventReportStatus" AS ENUM ('REPORTED', 'UNDER_REVIEW', 'VERIFIED_OCCURRENCE', 'CLOSED');

-- CreateEnum
CREATE TYPE "AdverseEventCausalityStatus" AS ENUM ('NOT_ASSESSED', 'UNRELATED', 'POSSIBLE', 'PROBABLE', 'CONFIRMED');

-- CreateEnum
CREATE TYPE "ClinicalSafetyRecordStatus" AS ENUM ('OPEN', 'UNDER_REVIEW', 'ESCALATED', 'CLOSED', 'SUPERSEDED');

-- CreateEnum
CREATE TYPE "HealthcareRegulatedEntityKind" AS ENUM ('FACILITY', 'PROFESSIONAL', 'CLINICAL_TRIAL_SITE', 'LABORATORY', 'RESEARCH_PROGRAM', 'TREATMENT_PROGRAM');

-- CreateEnum
CREATE TYPE "HealthcareIntegrationStandardKind" AS ENUM ('HL7_FHIR', 'LABORATORY', 'HOSPITAL_EHR', 'PHARMACY', 'IMAGING', 'RESEARCH', 'PAYER', 'GOVERNMENT_REGISTRY', 'OTHER');

-- CreateEnum
CREATE TYPE "HealthcareIntegrationExchangeStatus" AS ENUM ('INITIATED', 'SUCCEEDED', 'FAILED', 'RECONCILING', 'DISCREPANCY_OPEN');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "HealthcareActorPersona" ADD VALUE 'CLINICIAN';
ALTER TYPE "HealthcareActorPersona" ADD VALUE 'RESEARCHER';
ALTER TYPE "HealthcareActorPersona" ADD VALUE 'REGULATOR';
ALTER TYPE "HealthcareActorPersona" ADD VALUE 'EXTERNAL_PROVIDER';
ALTER TYPE "HealthcareActorPersona" ADD VALUE 'INTEGRATION_SYSTEM';

-- CreateTable
CREATE TABLE "healthcare_patient_references" (
    "id" UUID NOT NULL,
    "patientReference" TEXT NOT NULL,
    "patientIdentityId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "healthcare_patient_references_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "healthcare_consent_purpose_definitions" (
    "id" UUID NOT NULL,
    "purposeCode" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "healthcare_consent_purpose_definitions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "healthcare_consent_versions" (
    "id" UUID NOT NULL,
    "versionCode" TEXT NOT NULL,
    "purposeId" UUID NOT NULL,
    "legalTextRef" TEXT,
    "effectiveFrom" TIMESTAMP(3) NOT NULL,
    "effectiveUntil" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "healthcare_consent_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "healthcare_consents" (
    "id" UUID NOT NULL,
    "consentReference" TEXT NOT NULL,
    "patientReferenceId" UUID NOT NULL,
    "consentType" "HealthcareConsentType" NOT NULL,
    "consentVersionId" UUID NOT NULL,
    "status" "HealthcareConsentRecordStatus" NOT NULL DEFAULT 'DRAFT',
    "effectiveFrom" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "signatureReference" TEXT,
    "acknowledgmentReference" TEXT,
    "provenanceSummary" JSONB NOT NULL DEFAULT '{}',
    "accessBasisKind" "HealthcareAccessBasisKind" NOT NULL DEFAULT 'PATIENT_CONSENT',
    "representsPatientConsent" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "healthcare_consents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "healthcare_consent_scopes" (
    "id" UUID NOT NULL,
    "consentId" UUID NOT NULL,
    "dataCategories" JSONB NOT NULL DEFAULT '[]',
    "recipientCodes" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "healthcare_consent_scopes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "healthcare_consent_grants" (
    "id" UUID NOT NULL,
    "grantReference" TEXT NOT NULL,
    "consentId" UUID NOT NULL,
    "patientReferenceId" UUID NOT NULL,
    "purposeId" UUID NOT NULL,
    "grantedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "healthcare_consent_grants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "healthcare_consent_withdrawals" (
    "id" UUID NOT NULL,
    "consentGrantId" UUID NOT NULL,
    "withdrawnAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reasonSummary" TEXT,
    "preservesHistory" BOOLEAN NOT NULL DEFAULT true,
    "actorIdentityId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "healthcareConsentId" UUID,

    CONSTRAINT "healthcare_consent_withdrawals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "healthcare_data_sharing_authorizations" (
    "id" UUID NOT NULL,
    "authorizationRef" TEXT NOT NULL,
    "consentId" UUID,
    "purposeId" UUID NOT NULL,
    "recipientOrgId" UUID,
    "recipientCode" TEXT,
    "effectiveFrom" TIMESTAMP(3) NOT NULL,
    "expiresAt" TIMESTAMP(3),
    "accessBasisKind" "HealthcareAccessBasisKind" NOT NULL DEFAULT 'PATIENT_CONSENT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "healthcare_data_sharing_authorizations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "healthcare_research_consents" (
    "id" UUID NOT NULL,
    "researchConsentRef" TEXT NOT NULL,
    "patientReferenceId" UUID NOT NULL,
    "protocolReference" TEXT NOT NULL,
    "ethicsApprovalRef" TEXT,
    "consentId" UUID,
    "effectiveFrom" TIMESTAMP(3) NOT NULL,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "healthcare_research_consents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "healthcare_guardian_consent_references" (
    "id" UUID NOT NULL,
    "guardianConsentRef" TEXT NOT NULL,
    "wardPatientReferenceId" UUID NOT NULL,
    "guardianIdentityId" UUID NOT NULL,
    "consentId" UUID,
    "legalBasisReference" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "healthcare_guardian_consent_references_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "health_data_sources" (
    "id" UUID NOT NULL,
    "sourceCode" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "sourceKind" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "health_data_sources_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "health_data_custodians" (
    "id" UUID NOT NULL,
    "custodianCode" TEXT NOT NULL,
    "organizationId" UUID,
    "institutionId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "health_data_custodians_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "health_data_record_references" (
    "id" UUID NOT NULL,
    "recordReference" TEXT NOT NULL,
    "patientReferenceId" UUID NOT NULL,
    "dataCategoryCode" TEXT NOT NULL,
    "sourceId" UUID NOT NULL,
    "custodianId" UUID,
    "originatingProviderCode" TEXT,
    "externalRecordReference" TEXT,
    "storageLocationRef" TEXT,
    "classification" "HealthDataRecordSensitivityClassification" NOT NULL DEFAULT 'GENERAL',
    "status" "HealthDataRecordStatus" NOT NULL DEFAULT 'REGISTERED',
    "consentPurposeCode" TEXT,
    "retentionMetadata" JSONB NOT NULL DEFAULT '{}',
    "legalHold" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "health_data_record_references_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "health_data_provenance" (
    "id" UUID NOT NULL,
    "recordReferenceId" UUID NOT NULL,
    "provenanceKind" TEXT NOT NULL,
    "sourceSummary" JSONB NOT NULL DEFAULT '{}',
    "verifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "health_data_provenance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "health_data_version_references" (
    "id" UUID NOT NULL,
    "recordReferenceId" UUID NOT NULL,
    "versionToken" TEXT NOT NULL,
    "externalVersionRef" TEXT,
    "effectiveAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "health_data_version_references_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "health_data_access_records" (
    "id" UUID NOT NULL,
    "recordReferenceId" UUID NOT NULL,
    "accessorIdentityId" UUID,
    "actorPersona" "HealthcareActorPersona" NOT NULL,
    "purposeCode" TEXT NOT NULL,
    "accessBasisKind" "HealthcareAccessBasisKind" NOT NULL,
    "granted" BOOLEAN NOT NULL,
    "reasonCode" TEXT,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "health_data_access_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "health_data_disclosure_records" (
    "id" UUID NOT NULL,
    "recordReferenceId" UUID NOT NULL,
    "recipientCode" TEXT NOT NULL,
    "purposeCode" TEXT NOT NULL,
    "disclosedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actorIdentityId" UUID,

    CONSTRAINT "health_data_disclosure_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "health_data_correction_requests" (
    "id" UUID NOT NULL,
    "recordReferenceId" UUID NOT NULL,
    "requestReference" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'SUBMITTED',
    "requestSummary" TEXT,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "health_data_correction_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "research_data_purposes" (
    "id" UUID NOT NULL,
    "purposeCode" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "research_data_purposes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "research_datasets" (
    "id" UUID NOT NULL,
    "datasetReference" TEXT NOT NULL,
    "purposeId" UUID NOT NULL,
    "status" "ResearchDatasetStatus" NOT NULL DEFAULT 'DRAFT',
    "ethicsApprovalRef" TEXT,
    "protocolReference" TEXT,
    "pseudonymizationState" "ResearchPseudonymizationState" NOT NULL DEFAULT 'PSEUDONYMIZED',
    "claimsAnonymous" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "research_datasets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "research_dataset_versions" (
    "id" UUID NOT NULL,
    "datasetId" UUID NOT NULL,
    "versionNumber" INTEGER NOT NULL,
    "minimumNecessarySummary" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "research_dataset_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "research_dataset_record_links" (
    "id" UUID NOT NULL,
    "datasetVersionId" UUID NOT NULL,
    "recordReferenceId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "research_dataset_record_links_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "research_data_use_requests" (
    "id" UUID NOT NULL,
    "requestReference" TEXT NOT NULL,
    "datasetId" UUID NOT NULL,
    "requesterIdentityId" UUID NOT NULL,
    "purposeSummary" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'SUBMITTED',
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "research_data_use_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "research_data_use_approvals" (
    "id" UUID NOT NULL,
    "useRequestId" UUID NOT NULL,
    "approvalReference" TEXT NOT NULL,
    "approvedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "approverIdentityId" UUID,

    CONSTRAINT "research_data_use_approvals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "research_data_access_grants" (
    "id" UUID NOT NULL,
    "grantReference" TEXT NOT NULL,
    "datasetId" UUID NOT NULL,
    "approvalId" UUID NOT NULL,
    "researcherIdentityId" UUID NOT NULL,
    "status" "ResearchDataAccessGrantStatus" NOT NULL DEFAULT 'PENDING',
    "grantedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "research_data_access_grants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "research_data_disclosures" (
    "id" UUID NOT NULL,
    "datasetId" UUID NOT NULL,
    "disclosureRef" TEXT NOT NULL,
    "recipientCode" TEXT NOT NULL,
    "disclosedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "research_data_disclosures_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "research_data_pseudonymization_records" (
    "id" UUID NOT NULL,
    "datasetId" UUID NOT NULL,
    "state" "ResearchPseudonymizationState" NOT NULL,
    "provenanceSummary" JSONB NOT NULL DEFAULT '{}',
    "directIdentifiersRemoved" BOOLEAN NOT NULL DEFAULT false,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "research_data_pseudonymization_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "adverse_event_reports" (
    "id" UUID NOT NULL,
    "reportReference" TEXT NOT NULL,
    "patientReferenceId" UUID,
    "reportedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" "AdverseEventReportStatus" NOT NULL DEFAULT 'REPORTED',
    "severityCode" TEXT,
    "seriousnessCode" TEXT,
    "expectednessCode" TEXT,
    "narrativeSummary" TEXT,
    "causalityEstablished" BOOLEAN NOT NULL DEFAULT false,
    "causalityAssessmentStatus" "AdverseEventCausalityStatus" NOT NULL DEFAULT 'NOT_ASSESSED',
    "aiAssistedTriageOnly" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "adverse_event_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "adverse_events" (
    "id" UUID NOT NULL,
    "adverseEventRef" TEXT NOT NULL,
    "reportId" UUID NOT NULL,
    "verifiedOccurrence" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "adverse_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "serious_adverse_events" (
    "id" UUID NOT NULL,
    "reportId" UUID NOT NULL,
    "isSerious" BOOLEAN NOT NULL DEFAULT true,
    "seriousnessCriteria" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "serious_adverse_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "adverse_event_assessments" (
    "id" UUID NOT NULL,
    "reportId" UUID NOT NULL,
    "assessorIdentityId" UUID,
    "causalityStatus" "AdverseEventCausalityStatus" NOT NULL,
    "assessmentSummary" TEXT,
    "assessedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "assessorIsAi" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "adverse_event_assessments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "adverse_event_report_submissions" (
    "id" UUID NOT NULL,
    "reportId" UUID NOT NULL,
    "authorityCode" TEXT NOT NULL,
    "submissionStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "submittedAt" TIMESTAMP(3),

    CONSTRAINT "adverse_event_report_submissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "protocol_deviations" (
    "id" UUID NOT NULL,
    "deviationReference" TEXT NOT NULL,
    "protocolReference" TEXT NOT NULL,
    "status" "ClinicalSafetyRecordStatus" NOT NULL DEFAULT 'OPEN',
    "summary" TEXT,
    "reportedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "protocol_deviations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "protocol_violation_references" (
    "id" UUID NOT NULL,
    "deviationId" UUID NOT NULL,
    "violationCode" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "protocol_violation_references_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "safety_signals" (
    "id" UUID NOT NULL,
    "signalReference" TEXT NOT NULL,
    "status" "ClinicalSafetyRecordStatus" NOT NULL DEFAULT 'OPEN',
    "signalSummary" TEXT,
    "detectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "safety_signals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "safety_reviews" (
    "id" UUID NOT NULL,
    "safetySignalId" UUID,
    "reviewReference" TEXT NOT NULL,
    "reviewerIdentityId" UUID,
    "reviewSummary" TEXT,
    "reviewedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "safety_reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "safety_escalations" (
    "id" UUID NOT NULL,
    "safetyReviewId" UUID NOT NULL,
    "escalationRef" TEXT NOT NULL,
    "escalatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "safety_escalations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clinical_corrective_actions" (
    "id" UUID NOT NULL,
    "escalationId" UUID NOT NULL,
    "actionReference" TEXT NOT NULL,
    "status" "ClinicalSafetyRecordStatus" NOT NULL DEFAULT 'OPEN',
    "actionSummary" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "clinical_corrective_actions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clinical_preventive_actions" (
    "id" UUID NOT NULL,
    "escalationId" UUID NOT NULL,
    "actionReference" TEXT NOT NULL,
    "status" "ClinicalSafetyRecordStatus" NOT NULL DEFAULT 'OPEN',
    "actionSummary" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "clinical_preventive_actions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "healthcare_regulated_entity_references" (
    "id" UUID NOT NULL,
    "entityReference" TEXT NOT NULL,
    "entityKind" "HealthcareRegulatedEntityKind" NOT NULL,
    "organizationId" UUID,
    "identityId" UUID,
    "externalRef" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "healthcare_regulated_entity_references_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "healthcare_inspection_references" (
    "id" UUID NOT NULL,
    "regulatedEntityId" UUID NOT NULL,
    "inspectionRecordId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "healthcare_inspection_references_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "healthcare_compliance_matter_references" (
    "id" UUID NOT NULL,
    "regulatedEntityId" UUID NOT NULL,
    "complianceMatterId" UUID NOT NULL,
    "linkageRole" TEXT NOT NULL DEFAULT 'SUBJECT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "healthcare_compliance_matter_references_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "healthcare_license_issue_references" (
    "id" UUID NOT NULL,
    "regulatedEntityId" UUID NOT NULL,
    "licenseReference" TEXT NOT NULL,
    "issueSummary" TEXT,
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "healthcare_license_issue_references_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "healthcare_regulatory_submission_references" (
    "id" UUID NOT NULL,
    "regulatedEntityId" UUID NOT NULL,
    "submissionReference" TEXT NOT NULL,
    "authorityCode" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'SUBMITTED',
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "healthcare_regulatory_submission_references_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "healthcare_integration_adapter_declarations" (
    "id" UUID NOT NULL,
    "adapterCode" TEXT NOT NULL,
    "integrationVersionId" UUID NOT NULL,
    "standardKind" "HealthcareIntegrationStandardKind" NOT NULL,
    "declaredCapability" JSONB NOT NULL DEFAULT '{}',
    "declaredVersion" TEXT NOT NULL,
    "mappingLayerRef" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "healthcare_integration_adapter_declarations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "healthcare_external_identifier_mappings" (
    "id" UUID NOT NULL,
    "adapterId" UUID NOT NULL,
    "localEntityKind" TEXT NOT NULL,
    "localEntityId" UUID NOT NULL,
    "externalSystem" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "healthcare_external_identifier_mappings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "healthcare_integration_exchange_records" (
    "id" UUID NOT NULL,
    "adapterId" UUID NOT NULL,
    "exchangeReference" TEXT NOT NULL,
    "direction" TEXT NOT NULL,
    "status" "HealthcareIntegrationExchangeStatus" NOT NULL DEFAULT 'INITIATED',
    "inboundProvenance" JSONB NOT NULL DEFAULT '{}',
    "outboundPurposeCode" TEXT,
    "consentPurposeCode" TEXT,
    "failureSummary" TEXT,
    "succeeded" BOOLEAN NOT NULL DEFAULT false,
    "sourceDiscrepancyId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "healthcare_integration_exchange_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "healthcare_data_access_audits" (
    "id" UUID NOT NULL,
    "accessorIdentityId" UUID,
    "patientReferenceId" UUID,
    "actorPersona" "HealthcareActorPersona" NOT NULL,
    "endpoint" TEXT NOT NULL,
    "purposeCode" TEXT NOT NULL,
    "classification" "HealthDataRecordSensitivityClassification",
    "granted" BOOLEAN NOT NULL,
    "reasonCode" TEXT,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "healthcare_data_access_audits_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "healthcare_patient_references_patientReference_key" ON "healthcare_patient_references"("patientReference");

-- CreateIndex
CREATE INDEX "healthcare_patient_references_patientIdentityId_idx" ON "healthcare_patient_references"("patientIdentityId");

-- CreateIndex
CREATE UNIQUE INDEX "healthcare_consent_purpose_definitions_purposeCode_key" ON "healthcare_consent_purpose_definitions"("purposeCode");

-- CreateIndex
CREATE UNIQUE INDEX "healthcare_consent_versions_versionCode_key" ON "healthcare_consent_versions"("versionCode");

-- CreateIndex
CREATE INDEX "healthcare_consent_versions_purposeId_idx" ON "healthcare_consent_versions"("purposeId");

-- CreateIndex
CREATE UNIQUE INDEX "healthcare_consents_consentReference_key" ON "healthcare_consents"("consentReference");

-- CreateIndex
CREATE INDEX "healthcare_consents_patientReferenceId_idx" ON "healthcare_consents"("patientReferenceId");

-- CreateIndex
CREATE INDEX "healthcare_consents_status_idx" ON "healthcare_consents"("status");

-- CreateIndex
CREATE INDEX "healthcare_consent_scopes_consentId_idx" ON "healthcare_consent_scopes"("consentId");

-- CreateIndex
CREATE UNIQUE INDEX "healthcare_consent_grants_grantReference_key" ON "healthcare_consent_grants"("grantReference");

-- CreateIndex
CREATE INDEX "healthcare_consent_grants_consentId_idx" ON "healthcare_consent_grants"("consentId");

-- CreateIndex
CREATE INDEX "healthcare_consent_grants_patientReferenceId_idx" ON "healthcare_consent_grants"("patientReferenceId");

-- CreateIndex
CREATE INDEX "healthcare_consent_grants_purposeId_idx" ON "healthcare_consent_grants"("purposeId");

-- CreateIndex
CREATE UNIQUE INDEX "healthcare_consent_withdrawals_consentGrantId_key" ON "healthcare_consent_withdrawals"("consentGrantId");

-- CreateIndex
CREATE UNIQUE INDEX "healthcare_data_sharing_authorizations_authorizationRef_key" ON "healthcare_data_sharing_authorizations"("authorizationRef");

-- CreateIndex
CREATE INDEX "healthcare_data_sharing_authorizations_purposeId_idx" ON "healthcare_data_sharing_authorizations"("purposeId");

-- CreateIndex
CREATE INDEX "healthcare_data_sharing_authorizations_consentId_idx" ON "healthcare_data_sharing_authorizations"("consentId");

-- CreateIndex
CREATE UNIQUE INDEX "healthcare_research_consents_researchConsentRef_key" ON "healthcare_research_consents"("researchConsentRef");

-- CreateIndex
CREATE INDEX "healthcare_research_consents_patientReferenceId_idx" ON "healthcare_research_consents"("patientReferenceId");

-- CreateIndex
CREATE UNIQUE INDEX "healthcare_guardian_consent_references_guardianConsentRef_key" ON "healthcare_guardian_consent_references"("guardianConsentRef");

-- CreateIndex
CREATE INDEX "healthcare_guardian_consent_references_guardianIdentityId_idx" ON "healthcare_guardian_consent_references"("guardianIdentityId");

-- CreateIndex
CREATE INDEX "healthcare_guardian_consent_references_wardPatientReference_idx" ON "healthcare_guardian_consent_references"("wardPatientReferenceId");

-- CreateIndex
CREATE UNIQUE INDEX "health_data_sources_sourceCode_key" ON "health_data_sources"("sourceCode");

-- CreateIndex
CREATE UNIQUE INDEX "health_data_custodians_custodianCode_key" ON "health_data_custodians"("custodianCode");

-- CreateIndex
CREATE UNIQUE INDEX "health_data_record_references_recordReference_key" ON "health_data_record_references"("recordReference");

-- CreateIndex
CREATE INDEX "health_data_record_references_patientReferenceId_idx" ON "health_data_record_references"("patientReferenceId");

-- CreateIndex
CREATE INDEX "health_data_record_references_classification_idx" ON "health_data_record_references"("classification");

-- CreateIndex
CREATE INDEX "health_data_provenance_recordReferenceId_idx" ON "health_data_provenance"("recordReferenceId");

-- CreateIndex
CREATE INDEX "health_data_version_references_recordReferenceId_idx" ON "health_data_version_references"("recordReferenceId");

-- CreateIndex
CREATE INDEX "health_data_access_records_recordReferenceId_idx" ON "health_data_access_records"("recordReferenceId");

-- CreateIndex
CREATE INDEX "health_data_access_records_accessorIdentityId_idx" ON "health_data_access_records"("accessorIdentityId");

-- CreateIndex
CREATE INDEX "health_data_disclosure_records_recordReferenceId_idx" ON "health_data_disclosure_records"("recordReferenceId");

-- CreateIndex
CREATE UNIQUE INDEX "health_data_correction_requests_requestReference_key" ON "health_data_correction_requests"("requestReference");

-- CreateIndex
CREATE INDEX "health_data_correction_requests_recordReferenceId_idx" ON "health_data_correction_requests"("recordReferenceId");

-- CreateIndex
CREATE UNIQUE INDEX "research_data_purposes_purposeCode_key" ON "research_data_purposes"("purposeCode");

-- CreateIndex
CREATE UNIQUE INDEX "research_datasets_datasetReference_key" ON "research_datasets"("datasetReference");

-- CreateIndex
CREATE INDEX "research_datasets_purposeId_idx" ON "research_datasets"("purposeId");

-- CreateIndex
CREATE UNIQUE INDEX "research_dataset_versions_datasetId_versionNumber_key" ON "research_dataset_versions"("datasetId", "versionNumber");

-- CreateIndex
CREATE UNIQUE INDEX "research_dataset_record_links_datasetVersionId_recordRefere_key" ON "research_dataset_record_links"("datasetVersionId", "recordReferenceId");

-- CreateIndex
CREATE UNIQUE INDEX "research_data_use_requests_requestReference_key" ON "research_data_use_requests"("requestReference");

-- CreateIndex
CREATE INDEX "research_data_use_requests_datasetId_idx" ON "research_data_use_requests"("datasetId");

-- CreateIndex
CREATE UNIQUE INDEX "research_data_use_approvals_approvalReference_key" ON "research_data_use_approvals"("approvalReference");

-- CreateIndex
CREATE INDEX "research_data_use_approvals_useRequestId_idx" ON "research_data_use_approvals"("useRequestId");

-- CreateIndex
CREATE UNIQUE INDEX "research_data_access_grants_grantReference_key" ON "research_data_access_grants"("grantReference");

-- CreateIndex
CREATE INDEX "research_data_access_grants_datasetId_idx" ON "research_data_access_grants"("datasetId");

-- CreateIndex
CREATE INDEX "research_data_access_grants_researcherIdentityId_idx" ON "research_data_access_grants"("researcherIdentityId");

-- CreateIndex
CREATE UNIQUE INDEX "research_data_disclosures_disclosureRef_key" ON "research_data_disclosures"("disclosureRef");

-- CreateIndex
CREATE INDEX "research_data_disclosures_datasetId_idx" ON "research_data_disclosures"("datasetId");

-- CreateIndex
CREATE INDEX "research_data_pseudonymization_records_datasetId_idx" ON "research_data_pseudonymization_records"("datasetId");

-- CreateIndex
CREATE UNIQUE INDEX "adverse_event_reports_reportReference_key" ON "adverse_event_reports"("reportReference");

-- CreateIndex
CREATE INDEX "adverse_event_reports_patientReferenceId_idx" ON "adverse_event_reports"("patientReferenceId");

-- CreateIndex
CREATE UNIQUE INDEX "adverse_events_adverseEventRef_key" ON "adverse_events"("adverseEventRef");

-- CreateIndex
CREATE UNIQUE INDEX "adverse_events_reportId_key" ON "adverse_events"("reportId");

-- CreateIndex
CREATE UNIQUE INDEX "serious_adverse_events_reportId_key" ON "serious_adverse_events"("reportId");

-- CreateIndex
CREATE INDEX "adverse_event_assessments_reportId_idx" ON "adverse_event_assessments"("reportId");

-- CreateIndex
CREATE INDEX "adverse_event_report_submissions_reportId_idx" ON "adverse_event_report_submissions"("reportId");

-- CreateIndex
CREATE UNIQUE INDEX "protocol_deviations_deviationReference_key" ON "protocol_deviations"("deviationReference");

-- CreateIndex
CREATE INDEX "protocol_violation_references_deviationId_idx" ON "protocol_violation_references"("deviationId");

-- CreateIndex
CREATE UNIQUE INDEX "safety_signals_signalReference_key" ON "safety_signals"("signalReference");

-- CreateIndex
CREATE UNIQUE INDEX "safety_reviews_reviewReference_key" ON "safety_reviews"("reviewReference");

-- CreateIndex
CREATE UNIQUE INDEX "safety_escalations_escalationRef_key" ON "safety_escalations"("escalationRef");

-- CreateIndex
CREATE INDEX "safety_escalations_safetyReviewId_idx" ON "safety_escalations"("safetyReviewId");

-- CreateIndex
CREATE UNIQUE INDEX "clinical_corrective_actions_actionReference_key" ON "clinical_corrective_actions"("actionReference");

-- CreateIndex
CREATE UNIQUE INDEX "clinical_preventive_actions_actionReference_key" ON "clinical_preventive_actions"("actionReference");

-- CreateIndex
CREATE UNIQUE INDEX "healthcare_regulated_entity_references_entityReference_key" ON "healthcare_regulated_entity_references"("entityReference");

-- CreateIndex
CREATE UNIQUE INDEX "healthcare_inspection_references_inspectionRecordId_key" ON "healthcare_inspection_references"("inspectionRecordId");

-- CreateIndex
CREATE INDEX "healthcare_inspection_references_regulatedEntityId_idx" ON "healthcare_inspection_references"("regulatedEntityId");

-- CreateIndex
CREATE INDEX "healthcare_compliance_matter_references_complianceMatterId_idx" ON "healthcare_compliance_matter_references"("complianceMatterId");

-- CreateIndex
CREATE UNIQUE INDEX "healthcare_license_issue_references_licenseReference_key" ON "healthcare_license_issue_references"("licenseReference");

-- CreateIndex
CREATE INDEX "healthcare_license_issue_references_regulatedEntityId_idx" ON "healthcare_license_issue_references"("regulatedEntityId");

-- CreateIndex
CREATE UNIQUE INDEX "healthcare_regulatory_submission_references_submissionRefer_key" ON "healthcare_regulatory_submission_references"("submissionReference");

-- CreateIndex
CREATE INDEX "healthcare_regulatory_submission_references_regulatedEntity_idx" ON "healthcare_regulatory_submission_references"("regulatedEntityId");

-- CreateIndex
CREATE UNIQUE INDEX "healthcare_integration_adapter_declarations_adapterCode_key" ON "healthcare_integration_adapter_declarations"("adapterCode");

-- CreateIndex
CREATE INDEX "healthcare_integration_adapter_declarations_integrationVers_idx" ON "healthcare_integration_adapter_declarations"("integrationVersionId");

-- CreateIndex
CREATE INDEX "healthcare_external_identifier_mappings_externalSystem_exte_idx" ON "healthcare_external_identifier_mappings"("externalSystem", "externalId");

-- CreateIndex
CREATE UNIQUE INDEX "healthcare_external_identifier_mappings_adapterId_localEnti_key" ON "healthcare_external_identifier_mappings"("adapterId", "localEntityKind", "localEntityId");

-- CreateIndex
CREATE UNIQUE INDEX "healthcare_integration_exchange_records_exchangeReference_key" ON "healthcare_integration_exchange_records"("exchangeReference");

-- CreateIndex
CREATE INDEX "healthcare_integration_exchange_records_adapterId_idx" ON "healthcare_integration_exchange_records"("adapterId");

-- CreateIndex
CREATE INDEX "healthcare_data_access_audits_accessorIdentityId_idx" ON "healthcare_data_access_audits"("accessorIdentityId");

-- CreateIndex
CREATE INDEX "healthcare_data_access_audits_patientReferenceId_idx" ON "healthcare_data_access_audits"("patientReferenceId");

-- CreateIndex
CREATE UNIQUE INDEX "clinical_trial_withdrawals_enrollmentId_key" ON "clinical_trial_withdrawals"("enrollmentId");

-- RenameForeignKey
ALTER TABLE "capability_revalidation_requirements" RENAME CONSTRAINT "capability_revalidation_requirements_capabilityDefinitionId_fke" TO "capability_revalidation_requirements_capabilityDefinitionI_fkey";

-- RenameForeignKey
ALTER TABLE "civil_record_correction_requests" RENAME CONSTRAINT "civil_record_correction_requests_subjectCivilPersonRecordId_fke" TO "civil_record_correction_requests_subjectCivilPersonRecordI_fkey";

-- RenameForeignKey
ALTER TABLE "civil_registry_certificate_verifications" RENAME CONSTRAINT "civil_registry_certificate_verifications_issuerInstitutionId_fk" TO "civil_registry_certificate_verifications_issuerInstitution_fkey";

-- RenameForeignKey
ALTER TABLE "civil_registry_vital_record_versions" RENAME CONSTRAINT "civil_registry_vital_record_versions_registeredByOfficialIdenti" TO "civil_registry_vital_record_versions_registeredByOfficialI_fkey";

-- RenameForeignKey
ALTER TABLE "clinical_trial_eligibility_assessments" RENAME CONSTRAINT "clinical_trial_eligibility_assessments_assessorOfficeholderId_f" TO "clinical_trial_eligibility_assessments_assessorOfficeholde_fkey";

-- RenameForeignKey
ALTER TABLE "clinical_trial_eligibility_assessments" RENAME CONSTRAINT "clinical_trial_eligibility_assessments_assessorProfessionalIden" TO "clinical_trial_eligibility_assessments_assessorProfessiona_fkey";

-- RenameForeignKey
ALTER TABLE "clinical_trial_eligibility_evidence" RENAME CONSTRAINT "clinical_trial_eligibility_evidence_eligibilityAssessmentId_fke" TO "clinical_trial_eligibility_evidence_eligibilityAssessmentI_fkey";

-- RenameForeignKey
ALTER TABLE "clinical_trial_external_registry_references" RENAME CONSTRAINT "clinical_trial_external_registry_references_clinicalTrialId_fke" TO "clinical_trial_external_registry_references_clinicalTrialI_fkey";

-- RenameForeignKey
ALTER TABLE "clinical_trial_screening_reviews" RENAME CONSTRAINT "clinical_trial_screening_reviews_reviewerProfessionalIdentityId" TO "clinical_trial_screening_reviews_reviewerProfessionalIdent_fkey";

-- RenameForeignKey
ALTER TABLE "critical_service_definitions" RENAME CONSTRAINT "critical_service_definitions_institutionalOwnerInstitutionId_fk" TO "critical_service_definitions_institutionalOwnerInstitution_fkey";

-- RenameForeignKey
ALTER TABLE "education_accreditation_records" RENAME CONSTRAINT "education_accreditation_records_institutionRegistryRecordId_fke" TO "education_accreditation_records_institutionRegistryRecordI_fkey";

-- RenameForeignKey
ALTER TABLE "education_institution_inspection_references" RENAME CONSTRAINT "education_institution_inspection_references_inspectionRecordId_" TO "education_institution_inspection_references_inspectionReco_fkey";

-- RenameForeignKey
ALTER TABLE "education_institution_inspection_references" RENAME CONSTRAINT "education_institution_inspection_references_institutionRegistry" TO "education_institution_inspection_references_institutionReg_fkey";

-- RenameForeignKey
ALTER TABLE "education_institution_license_records" RENAME CONSTRAINT "education_institution_license_records_institutionRegistryRecord" TO "education_institution_license_records_institutionRegistryR_fkey";

-- RenameForeignKey
ALTER TABLE "education_record_correction_history" RENAME CONSTRAINT "education_record_correction_history_educationRecordCorrectionId" TO "education_record_correction_history_educationRecordCorrect_fkey";

-- RenameForeignKey
ALTER TABLE "exit_acceptance_records" RENAME CONSTRAINT "exit_acceptance_records_institutionalAcceptorOfficeholderId_fke" TO "exit_acceptance_records_institutionalAcceptorOfficeholderI_fkey";

-- RenameForeignKey
ALTER TABLE "intelligence_monitoring_alerts" RENAME CONSTRAINT "intelligence_monitoring_alerts_responsibleRecipientIdentityId_f" TO "intelligence_monitoring_alerts_responsibleRecipientIdentit_fkey";

-- RenameForeignKey
ALTER TABLE "manual_operation_authorizations" RENAME CONSTRAINT "manual_operation_authorizations_segregatedApproverIdentityId_fk" TO "manual_operation_authorizations_segregatedApproverIdentity_fkey";

-- RenameForeignKey
ALTER TABLE "measured_performance_claim_evidence_links" RENAME CONSTRAINT "measured_performance_claim_evidence_links_performanceClaimId_fk" TO "measured_performance_claim_evidence_links_performanceClaim_fkey";

-- RenameForeignKey
ALTER TABLE "measured_performance_claim_revalidations" RENAME CONSTRAINT "measured_performance_claim_revalidations_performanceClaimId_fke" TO "measured_performance_claim_revalidations_performanceClaimI_fkey";

-- RenameForeignKey
ALTER TABLE "measured_performance_claim_revalidations" RENAME CONSTRAINT "measured_performance_claim_revalidations_reviewerIdentityId_fke" TO "measured_performance_claim_revalidations_reviewerIdentityI_fkey";

-- RenameForeignKey
ALTER TABLE "patient_treatment_status_projections" RENAME CONSTRAINT "patient_treatment_status_projections_patientHealthcareProfileId" TO "patient_treatment_status_projections_patientHealthcareProf_fkey";

-- RenameForeignKey
ALTER TABLE "public_safety_recovery_assistance_applications" RENAME CONSTRAINT "public_safety_recovery_assistance_applications_engagementId_fke" TO "public_safety_recovery_assistance_applications_engagementI_fkey";

-- RenameForeignKey
ALTER TABLE "public_safety_recovery_assistance_applications" RENAME CONSTRAINT "public_safety_recovery_assistance_applications_serviceRequestId" TO "public_safety_recovery_assistance_applications_serviceRequ_fkey";

-- RenameForeignKey
ALTER TABLE "resumption_readiness_assessments" RENAME CONSTRAINT "resumption_readiness_assessments_technicalRecommenderIdentityId" TO "resumption_readiness_assessments_technicalRecommenderIdent_fkey";

-- RenameForeignKey
ALTER TABLE "service_pack_acceptance_records" RENAME CONSTRAINT "service_pack_acceptance_records_authorityEvaluationRecordId_fke" TO "service_pack_acceptance_records_authorityEvaluationRecordI_fkey";

-- RenameForeignKey
ALTER TABLE "service_pack_deployment_audit_records" RENAME CONSTRAINT "service_pack_deployment_audit_records_servicePackDeploymentI_fk" TO "service_pack_deployment_audit_records_servicePackDeploymen_fkey";

-- RenameForeignKey
ALTER TABLE "treatment_eligibility_reviews" RENAME CONSTRAINT "treatment_eligibility_reviews_governmentAdministrativeEvaluatio" TO "treatment_eligibility_reviews_governmentAdministrativeEval_fkey";

-- RenameForeignKey
ALTER TABLE "treatment_patient_data_access_grants" RENAME CONSTRAINT "treatment_patient_data_access_grants_granteeProviderIdentityId_" TO "treatment_patient_data_access_grants_granteeProviderIdenti_fkey";

-- RenameForeignKey
ALTER TABLE "treatment_patient_data_access_grants" RENAME CONSTRAINT "treatment_patient_data_access_grants_patientHealthcareProfileId" TO "treatment_patient_data_access_grants_patientHealthcareProf_fkey";

-- RenameForeignKey
ALTER TABLE "treatment_patient_data_access_grants" RENAME CONSTRAINT "treatment_patient_data_access_grants_patientSubjectIdentityId_f" TO "treatment_patient_data_access_grants_patientSubjectIdentit_fkey";

-- RenameForeignKey
ALTER TABLE "treatment_program_external_dependencies" RENAME CONSTRAINT "treatment_program_external_dependencies_externalAuthorityId_fke" TO "treatment_program_external_dependencies_externalAuthorityI_fkey";

-- RenameForeignKey
ALTER TABLE "treatment_program_external_dependencies" RENAME CONSTRAINT "treatment_program_external_dependencies_recordedByIdentityId_fk" TO "treatment_program_external_dependencies_recordedByIdentity_fkey";

-- AddForeignKey
ALTER TABLE "healthcare_patient_references" ADD CONSTRAINT "healthcare_patient_references_patientIdentityId_fkey" FOREIGN KEY ("patientIdentityId") REFERENCES "identities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "healthcare_consent_versions" ADD CONSTRAINT "healthcare_consent_versions_purposeId_fkey" FOREIGN KEY ("purposeId") REFERENCES "healthcare_consent_purpose_definitions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "healthcare_consents" ADD CONSTRAINT "healthcare_consents_patientReferenceId_fkey" FOREIGN KEY ("patientReferenceId") REFERENCES "healthcare_patient_references"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "healthcare_consents" ADD CONSTRAINT "healthcare_consents_consentVersionId_fkey" FOREIGN KEY ("consentVersionId") REFERENCES "healthcare_consent_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "healthcare_consent_scopes" ADD CONSTRAINT "healthcare_consent_scopes_consentId_fkey" FOREIGN KEY ("consentId") REFERENCES "healthcare_consents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "healthcare_consent_grants" ADD CONSTRAINT "healthcare_consent_grants_consentId_fkey" FOREIGN KEY ("consentId") REFERENCES "healthcare_consents"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "healthcare_consent_grants" ADD CONSTRAINT "healthcare_consent_grants_patientReferenceId_fkey" FOREIGN KEY ("patientReferenceId") REFERENCES "healthcare_patient_references"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "healthcare_consent_grants" ADD CONSTRAINT "healthcare_consent_grants_purposeId_fkey" FOREIGN KEY ("purposeId") REFERENCES "healthcare_consent_purpose_definitions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "healthcare_consent_withdrawals" ADD CONSTRAINT "healthcare_consent_withdrawals_consentGrantId_fkey" FOREIGN KEY ("consentGrantId") REFERENCES "healthcare_consent_grants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "healthcare_consent_withdrawals" ADD CONSTRAINT "healthcare_consent_withdrawals_actorIdentityId_fkey" FOREIGN KEY ("actorIdentityId") REFERENCES "identities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "healthcare_consent_withdrawals" ADD CONSTRAINT "healthcare_consent_withdrawals_healthcareConsentId_fkey" FOREIGN KEY ("healthcareConsentId") REFERENCES "healthcare_consents"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "healthcare_data_sharing_authorizations" ADD CONSTRAINT "healthcare_data_sharing_authorizations_consentId_fkey" FOREIGN KEY ("consentId") REFERENCES "healthcare_consents"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "healthcare_data_sharing_authorizations" ADD CONSTRAINT "healthcare_data_sharing_authorizations_purposeId_fkey" FOREIGN KEY ("purposeId") REFERENCES "healthcare_consent_purpose_definitions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "healthcare_data_sharing_authorizations" ADD CONSTRAINT "healthcare_data_sharing_authorizations_recipientOrgId_fkey" FOREIGN KEY ("recipientOrgId") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "healthcare_research_consents" ADD CONSTRAINT "healthcare_research_consents_patientReferenceId_fkey" FOREIGN KEY ("patientReferenceId") REFERENCES "healthcare_patient_references"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "healthcare_guardian_consent_references" ADD CONSTRAINT "healthcare_guardian_consent_references_wardPatientReferenc_fkey" FOREIGN KEY ("wardPatientReferenceId") REFERENCES "healthcare_patient_references"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "healthcare_guardian_consent_references" ADD CONSTRAINT "healthcare_guardian_consent_references_guardianIdentityId_fkey" FOREIGN KEY ("guardianIdentityId") REFERENCES "identities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "health_data_custodians" ADD CONSTRAINT "health_data_custodians_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "health_data_record_references" ADD CONSTRAINT "health_data_record_references_patientReferenceId_fkey" FOREIGN KEY ("patientReferenceId") REFERENCES "healthcare_patient_references"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "health_data_record_references" ADD CONSTRAINT "health_data_record_references_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "health_data_sources"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "health_data_record_references" ADD CONSTRAINT "health_data_record_references_custodianId_fkey" FOREIGN KEY ("custodianId") REFERENCES "health_data_custodians"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "health_data_provenance" ADD CONSTRAINT "health_data_provenance_recordReferenceId_fkey" FOREIGN KEY ("recordReferenceId") REFERENCES "health_data_record_references"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "health_data_version_references" ADD CONSTRAINT "health_data_version_references_recordReferenceId_fkey" FOREIGN KEY ("recordReferenceId") REFERENCES "health_data_record_references"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "health_data_access_records" ADD CONSTRAINT "health_data_access_records_recordReferenceId_fkey" FOREIGN KEY ("recordReferenceId") REFERENCES "health_data_record_references"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "health_data_access_records" ADD CONSTRAINT "health_data_access_records_accessorIdentityId_fkey" FOREIGN KEY ("accessorIdentityId") REFERENCES "identities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "health_data_disclosure_records" ADD CONSTRAINT "health_data_disclosure_records_recordReferenceId_fkey" FOREIGN KEY ("recordReferenceId") REFERENCES "health_data_record_references"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "health_data_disclosure_records" ADD CONSTRAINT "health_data_disclosure_records_actorIdentityId_fkey" FOREIGN KEY ("actorIdentityId") REFERENCES "identities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "health_data_correction_requests" ADD CONSTRAINT "health_data_correction_requests_recordReferenceId_fkey" FOREIGN KEY ("recordReferenceId") REFERENCES "health_data_record_references"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "research_datasets" ADD CONSTRAINT "research_datasets_purposeId_fkey" FOREIGN KEY ("purposeId") REFERENCES "research_data_purposes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "research_dataset_versions" ADD CONSTRAINT "research_dataset_versions_datasetId_fkey" FOREIGN KEY ("datasetId") REFERENCES "research_datasets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "research_dataset_record_links" ADD CONSTRAINT "research_dataset_record_links_datasetVersionId_fkey" FOREIGN KEY ("datasetVersionId") REFERENCES "research_dataset_versions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "research_dataset_record_links" ADD CONSTRAINT "research_dataset_record_links_recordReferenceId_fkey" FOREIGN KEY ("recordReferenceId") REFERENCES "health_data_record_references"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "research_data_use_requests" ADD CONSTRAINT "research_data_use_requests_datasetId_fkey" FOREIGN KEY ("datasetId") REFERENCES "research_datasets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "research_data_use_requests" ADD CONSTRAINT "research_data_use_requests_requesterIdentityId_fkey" FOREIGN KEY ("requesterIdentityId") REFERENCES "identities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "research_data_use_approvals" ADD CONSTRAINT "research_data_use_approvals_useRequestId_fkey" FOREIGN KEY ("useRequestId") REFERENCES "research_data_use_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "research_data_access_grants" ADD CONSTRAINT "research_data_access_grants_datasetId_fkey" FOREIGN KEY ("datasetId") REFERENCES "research_datasets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "research_data_access_grants" ADD CONSTRAINT "research_data_access_grants_approvalId_fkey" FOREIGN KEY ("approvalId") REFERENCES "research_data_use_approvals"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "research_data_access_grants" ADD CONSTRAINT "research_data_access_grants_researcherIdentityId_fkey" FOREIGN KEY ("researcherIdentityId") REFERENCES "identities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "research_data_disclosures" ADD CONSTRAINT "research_data_disclosures_datasetId_fkey" FOREIGN KEY ("datasetId") REFERENCES "research_datasets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "research_data_pseudonymization_records" ADD CONSTRAINT "research_data_pseudonymization_records_datasetId_fkey" FOREIGN KEY ("datasetId") REFERENCES "research_datasets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "adverse_event_reports" ADD CONSTRAINT "adverse_event_reports_patientReferenceId_fkey" FOREIGN KEY ("patientReferenceId") REFERENCES "healthcare_patient_references"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "adverse_events" ADD CONSTRAINT "adverse_events_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "adverse_event_reports"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "serious_adverse_events" ADD CONSTRAINT "serious_adverse_events_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "adverse_event_reports"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "adverse_event_assessments" ADD CONSTRAINT "adverse_event_assessments_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "adverse_event_reports"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "adverse_event_assessments" ADD CONSTRAINT "adverse_event_assessments_assessorIdentityId_fkey" FOREIGN KEY ("assessorIdentityId") REFERENCES "identities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "adverse_event_report_submissions" ADD CONSTRAINT "adverse_event_report_submissions_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "adverse_event_reports"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "protocol_violation_references" ADD CONSTRAINT "protocol_violation_references_deviationId_fkey" FOREIGN KEY ("deviationId") REFERENCES "protocol_deviations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "safety_reviews" ADD CONSTRAINT "safety_reviews_safetySignalId_fkey" FOREIGN KEY ("safetySignalId") REFERENCES "safety_signals"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "safety_reviews" ADD CONSTRAINT "safety_reviews_reviewerIdentityId_fkey" FOREIGN KEY ("reviewerIdentityId") REFERENCES "identities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "safety_escalations" ADD CONSTRAINT "safety_escalations_safetyReviewId_fkey" FOREIGN KEY ("safetyReviewId") REFERENCES "safety_reviews"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clinical_corrective_actions" ADD CONSTRAINT "clinical_corrective_actions_escalationId_fkey" FOREIGN KEY ("escalationId") REFERENCES "safety_escalations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clinical_preventive_actions" ADD CONSTRAINT "clinical_preventive_actions_escalationId_fkey" FOREIGN KEY ("escalationId") REFERENCES "safety_escalations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "healthcare_regulated_entity_references" ADD CONSTRAINT "healthcare_regulated_entity_references_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "healthcare_regulated_entity_references" ADD CONSTRAINT "healthcare_regulated_entity_references_identityId_fkey" FOREIGN KEY ("identityId") REFERENCES "identities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "healthcare_inspection_references" ADD CONSTRAINT "healthcare_inspection_references_regulatedEntityId_fkey" FOREIGN KEY ("regulatedEntityId") REFERENCES "healthcare_regulated_entity_references"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "healthcare_inspection_references" ADD CONSTRAINT "healthcare_inspection_references_inspectionRecordId_fkey" FOREIGN KEY ("inspectionRecordId") REFERENCES "inspection_records"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "healthcare_compliance_matter_references" ADD CONSTRAINT "healthcare_compliance_matter_references_regulatedEntityId_fkey" FOREIGN KEY ("regulatedEntityId") REFERENCES "healthcare_regulated_entity_references"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "healthcare_compliance_matter_references" ADD CONSTRAINT "healthcare_compliance_matter_references_complianceMatterId_fkey" FOREIGN KEY ("complianceMatterId") REFERENCES "compliance_matters"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "healthcare_license_issue_references" ADD CONSTRAINT "healthcare_license_issue_references_regulatedEntityId_fkey" FOREIGN KEY ("regulatedEntityId") REFERENCES "healthcare_regulated_entity_references"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "healthcare_regulatory_submission_references" ADD CONSTRAINT "healthcare_regulatory_submission_references_regulatedEntit_fkey" FOREIGN KEY ("regulatedEntityId") REFERENCES "healthcare_regulated_entity_references"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "healthcare_integration_adapter_declarations" ADD CONSTRAINT "healthcare_integration_adapter_declarations_integrationVer_fkey" FOREIGN KEY ("integrationVersionId") REFERENCES "integration_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "healthcare_external_identifier_mappings" ADD CONSTRAINT "healthcare_external_identifier_mappings_adapterId_fkey" FOREIGN KEY ("adapterId") REFERENCES "healthcare_integration_adapter_declarations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "healthcare_integration_exchange_records" ADD CONSTRAINT "healthcare_integration_exchange_records_adapterId_fkey" FOREIGN KEY ("adapterId") REFERENCES "healthcare_integration_adapter_declarations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "healthcare_integration_exchange_records" ADD CONSTRAINT "healthcare_integration_exchange_records_sourceDiscrepancyI_fkey" FOREIGN KEY ("sourceDiscrepancyId") REFERENCES "source_discrepancies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "healthcare_data_access_audits" ADD CONSTRAINT "healthcare_data_access_audits_accessorIdentityId_fkey" FOREIGN KEY ("accessorIdentityId") REFERENCES "identities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- RenameIndex
ALTER INDEX "appointment_participants_serviceAppointmentId_identityId_role_k" RENAME TO "appointment_participants_serviceAppointmentId_identityId_ro_key";

-- RenameIndex
ALTER INDEX "civil_identity_records_identityReferenceType_identityReferenceV" RENAME TO "civil_identity_records_identityReferenceType_identityRefere_idx";

-- RenameIndex
ALTER INDEX "civil_registry_certificate_verifications_issuerInstitutionId_id" RENAME TO "civil_registry_certificate_verifications_issuerInstitutionI_idx";

-- RenameIndex
ALTER INDEX "civil_registry_certificate_verifications_verificationReference_" RENAME TO "civil_registry_certificate_verifications_verificationRefere_key";

-- RenameIndex
ALTER INDEX "civil_registry_record_entitlements_vitalRecordId_identityId_ent" RENAME TO "civil_registry_record_entitlements_vitalRecordId_identityId_key";

-- RenameIndex
ALTER INDEX "civil_registry_vital_record_versions_vitalRecordId_versionNumbe" RENAME TO "civil_registry_vital_record_versions_vitalRecordId_versionN_key";

-- RenameIndex
ALTER INDEX "clinical_trial_eligibility_criteria_clinicalTrialId_criterionCo" RENAME TO "clinical_trial_eligibility_criteria_clinicalTrialId_criteri_key";

-- RenameIndex
ALTER INDEX "communication_maf_index_entries_masterAdministrativeFileId_mess" RENAME TO "communication_maf_index_entries_masterAdministrativeFileId__key";

-- RenameIndex
ALTER INDEX "corporate_beneficial_ownership_declarations_declarationReferenc" RENAME TO "corporate_beneficial_ownership_declarations_declarationRefe_key";

-- RenameIndex
ALTER INDEX "critical_service_definitions_institutionalOwnerInstitutionId_id" RENAME TO "critical_service_definitions_institutionalOwnerInstitutionI_idx";

-- RenameIndex
ALTER INDEX "dashboard_status_dictionary_entries_code_version_institutionId_" RENAME TO "dashboard_status_dictionary_entries_code_version_institutio_key";

-- RenameIndex
ALTER INDEX "dependent_relationships_primaryProfileId_dependentProfileId_rel" RENAME TO "dependent_relationships_primaryProfileId_dependentProfileId_key";

-- RenameIndex
ALTER INDEX "development_permit_versions_developmentPermitId_versionNumber_k" RENAME TO "development_permit_versions_developmentPermitId_versionNumb_key";

-- RenameIndex
ALTER INDEX "digital_twin_definitions_representedSubjectType_representedSubj" RENAME TO "digital_twin_definitions_representedSubjectType_represented_idx";

-- RenameIndex
ALTER INDEX "digital_twin_relationships_fromDefinitionId_toDefinitionId_rela" RENAME TO "digital_twin_relationships_fromDefinitionId_toDefinitionId__key";

-- RenameIndex
ALTER INDEX "education_institution_inspection_references_inspectionRecordId_" RENAME TO "education_institution_inspection_references_inspectionRecor_idx";

-- RenameIndex
ALTER INDEX "education_institution_license_records_publicVerificationToken_k" RENAME TO "education_institution_license_records_publicVerificationTok_key";

-- RenameIndex
ALTER INDEX "education_record_correction_history_educationRecordCorrection_i" RENAME TO "education_record_correction_history_educationRecordCorrecti_idx";

-- RenameIndex
ALTER INDEX "immigration_status_records_immigrationProfileId_statusCategory_" RENAME TO "immigration_status_records_immigrationProfileId_statusCateg_idx";

-- RenameIndex
ALTER INDEX "measured_performance_claim_evidence_links_performanceClaimId_ev" RENAME TO "measured_performance_claim_evidence_links_performanceClaimI_key";

-- RenameIndex
ALTER INDEX "measured_performance_claim_evidence_links_performanceClaimId_id" RENAME TO "measured_performance_claim_evidence_links_performanceClaimI_idx";

-- RenameIndex
ALTER INDEX "metric_dependency_classifications_metricVersionId_classificatio" RENAME TO "metric_dependency_classifications_metricVersionId_classific_key";

-- RenameIndex
ALTER INDEX "patient_treatment_status_projections_patientHealthcareProfileId" RENAME TO "patient_treatment_status_projections_patientHealthcareProfi_idx";

-- RenameIndex
ALTER INDEX "property_interest_entitlements_parcelId_identityId_entitlementK" RENAME TO "property_interest_entitlements_parcelId_identityId_entitlem_key";

-- RenameIndex
ALTER INDEX "public_safety_recovery_assistance_applications_applicationRefer" RENAME TO "public_safety_recovery_assistance_applications_applicationR_key";

-- RenameIndex
ALTER INDEX "public_safety_recovery_assistance_applications_serviceRequestId" RENAME TO "public_safety_recovery_assistance_applications_serviceReque_key";

-- RenameIndex
ALTER INDEX "research_ethics_approval_versions_researchEthicsApprovalId_vers" RENAME TO "research_ethics_approval_versions_researchEthicsApprovalId__key";

-- RenameIndex
ALTER INDEX "service_pack_components_servicePackVersionId_componentKind_comp" RENAME TO "service_pack_components_servicePackVersionId_componentKind__key";

-- RenameIndex
ALTER INDEX "service_pack_dependencies_servicePackVersionId_dependencyCode_k" RENAME TO "service_pack_dependencies_servicePackVersionId_dependencyCo_key";

-- RenameIndex
ALTER INDEX "service_pack_deployment_bindings_servicePackDeploymentId_doma_k" RENAME TO "service_pack_deployment_bindings_servicePackDeploymentId_do_key";

-- RenameIndex
ALTER INDEX "service_pack_jurisdiction_bindings_servicePackId_jurisdictionI_" RENAME TO "service_pack_jurisdiction_bindings_servicePackId_jurisdicti_key";

-- RenameIndex
ALTER INDEX "strategic_project_economic_claims_profileId_performanceClaimId_" RENAME TO "strategic_project_economic_claims_profileId_performanceClai_key";

-- RenameIndex
ALTER INDEX "treatment_care_team_references_treatmentEnrollmentId_memberIden" RENAME TO "treatment_care_team_references_treatmentEnrollmentId_member_key";

-- RenameIndex
ALTER INDEX "treatment_patient_data_access_grants_granteeProviderIdentityId_" RENAME TO "treatment_patient_data_access_grants_granteeProviderIdentit_idx";

-- RenameIndex
ALTER INDEX "treatment_patient_data_access_grants_patientHealthcareProfileId" RENAME TO "treatment_patient_data_access_grants_patientHealthcareProfi_idx";

-- RenameIndex
ALTER INDEX "treatment_patient_data_access_grants_patientSubjectIdentityId_i" RENAME TO "treatment_patient_data_access_grants_patientSubjectIdentity_idx";

-- RenameIndex
ALTER INDEX "treatment_program_eligibility_criteria_treatmentProgramId_crite" RENAME TO "treatment_program_eligibility_criteria_treatmentProgramId_c_key";

