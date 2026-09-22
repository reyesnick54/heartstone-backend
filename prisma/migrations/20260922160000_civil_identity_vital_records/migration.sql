-- Civil Identity & Vital Records foundation

CREATE TYPE "CivilRegistryAccessClassification" AS ENUM (
  'PUBLIC_VERIFICATION_ONLY',
  'SUBJECT_ACCESS',
  'AUTHORIZED_GOVERNMENT',
  'RESTRICTED',
  'SEALED'
);

CREATE TYPE "VitalEventType" AS ENUM (
  'BIRTH',
  'DEATH',
  'MARRIAGE',
  'DIVORCE',
  'LEGAL_NAME_CHANGE',
  'CIVIL_STATUS_CORRECTION',
  'ADOPTION_UPDATE',
  'CIVIL_IDENTITY_REGISTRATION'
);

CREATE TYPE "VitalEventRegistrationStatus" AS ENUM (
  'INTAKE_DRAFT',
  'PENDING_REVIEW',
  'PENDING_AUTHORITY',
  'REGISTERED_OFFICIAL',
  'REJECTED',
  'SUPERSEDED'
);

CREATE TYPE "CivilRegistryEntryStatus" AS ENUM (
  'OFFICIAL',
  'AMENDED',
  'SUPERSEDED',
  'ANNULLED'
);

CREATE TYPE "CivilRegistryVerificationState" AS ENUM (
  'UNVERIFIED',
  'PENDING_VERIFICATION',
  'VERIFIED',
  'DISPUTED',
  'FAILED_VERIFICATION'
);

CREATE TYPE "CivilRecordRelationshipRole" AS ENUM (
  'SUBJECT',
  'PARENT',
  'CHILD',
  'SPOUSE',
  'PARTNER',
  'DECEASED',
  'INFORMANT',
  'WITNESS',
  'GUARDIAN',
  'ADOPTEE',
  'ADOPTIVE_PARENT',
  'OTHER'
);

CREATE TYPE "CivilRecordAmendmentBasis" AS ENUM (
  'AUTHORITY_DECISION',
  'CORRECTION_ORDER',
  'COURT_ORDER',
  'LEGISLATIVE_MANDATE',
  'SERVICE_PACK_POLICY'
);

CREATE TYPE "CivilRecordCorrectionRequestStatus" AS ENUM (
  'DRAFT',
  'SUBMITTED',
  'UNDER_REVIEW',
  'APPROVED_FOR_AMENDMENT',
  'DENIED',
  'WITHDRAWN'
);

CREATE TYPE "CivilRegistryAuditEventType" AS ENUM (
  'INTAKE_CREATED',
  'REGISTRATION_REQUESTED',
  'REGISTRY_ENTRY_RECORDED',
  'AMENDMENT_RECORDED',
  'ACCESS_DENIED',
  'ACCESS_GRANTED',
  'RESTRICTION_APPLIED',
  'VERIFICATION_UPDATED',
  'CORRECTION_REQUEST_SUBMITTED',
  'CORRECTION_REQUEST_DECIDED',
  'DELETE_BLOCKED',
  'CERTIFICATE_ISSUED'
);

CREATE TABLE "civil_person_records" (
  "id" UUID NOT NULL,
  "jurisdictionId" UUID NOT NULL,
  "institutionId" UUID NOT NULL,
  "personId" UUID,
  "displayLabel" TEXT NOT NULL,
  "primaryReference" TEXT,
  "accessClassification" "CivilRegistryAccessClassification" NOT NULL DEFAULT 'SUBJECT_ACCESS',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "civil_person_records_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "civil_identity_records" (
  "id" UUID NOT NULL,
  "civilPersonRecordId" UUID NOT NULL,
  "jurisdictionId" UUID NOT NULL,
  "institutionId" UUID NOT NULL,
  "identityReferenceType" TEXT NOT NULL,
  "identityReferenceValue" TEXT NOT NULL,
  "registrationDate" TIMESTAMP(3),
  "status" TEXT NOT NULL DEFAULT 'REGISTERED',
  "accessClassification" "CivilRegistryAccessClassification" NOT NULL DEFAULT 'SUBJECT_ACCESS',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "civil_identity_records_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "vital_events" (
  "id" UUID NOT NULL,
  "eventReference" TEXT NOT NULL,
  "eventType" "VitalEventType" NOT NULL,
  "registrationStatus" "VitalEventRegistrationStatus" NOT NULL DEFAULT 'INTAKE_DRAFT',
  "jurisdictionId" UUID NOT NULL,
  "institutionId" UUID NOT NULL,
  "eventDate" TIMESTAMP(3),
  "eventDatePrecision" TEXT,
  "registrationDate" TIMESTAMP(3),
  "locationReference" TEXT,
  "applicationId" UUID,
  "caseId" UUID,
  "governmentServiceId" UUID,
  "governingServicePackVersionId" UUID,
  "registrarOfficeholderId" UUID,
  "registrarIdentityId" UUID,
  "primarySubjectCivilPersonRecordId" UUID,
  "verificationState" "CivilRegistryVerificationState" NOT NULL DEFAULT 'UNVERIFIED',
  "accessClassification" "CivilRegistryAccessClassification" NOT NULL DEFAULT 'SUBJECT_ACCESS',
  "provenanceSummary" JSONB NOT NULL DEFAULT '{}',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "vital_events_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "birth_events" (
  "vitalEventId" UUID NOT NULL,
  "placeOfBirthReference" TEXT,
  "birthOrder" INTEGER,
  "additionalAttributes" JSONB NOT NULL DEFAULT '{}',

  CONSTRAINT "birth_events_pkey" PRIMARY KEY ("vitalEventId")
);

CREATE TABLE "death_events" (
  "vitalEventId" UUID NOT NULL,
  "placeOfDeathReference" TEXT,
  "mannerReference" TEXT,
  "additionalAttributes" JSONB NOT NULL DEFAULT '{}',

  CONSTRAINT "death_events_pkey" PRIMARY KEY ("vitalEventId")
);

CREATE TABLE "marriage_events" (
  "vitalEventId" UUID NOT NULL,
  "marriageFormReference" TEXT,
  "additionalAttributes" JSONB NOT NULL DEFAULT '{}',

  CONSTRAINT "marriage_events_pkey" PRIMARY KEY ("vitalEventId")
);

CREATE TABLE "divorce_events" (
  "vitalEventId" UUID NOT NULL,
  "dissolutionReference" TEXT,
  "additionalAttributes" JSONB NOT NULL DEFAULT '{}',

  CONSTRAINT "divorce_events_pkey" PRIMARY KEY ("vitalEventId")
);

CREATE TABLE "civil_status_records" (
  "id" UUID NOT NULL,
  "civilPersonRecordId" UUID NOT NULL,
  "vitalEventId" UUID,
  "statusType" TEXT NOT NULL,
  "statusValue" TEXT NOT NULL,
  "effectiveDate" TIMESTAMP(3) NOT NULL,
  "accessClassification" "CivilRegistryAccessClassification" NOT NULL DEFAULT 'SUBJECT_ACCESS',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "civil_status_records_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "civil_registry_entries" (
  "id" UUID NOT NULL,
  "entryReference" TEXT NOT NULL,
  "vitalEventId" UUID,
  "civilPersonRecordId" UUID,
  "jurisdictionId" UUID NOT NULL,
  "institutionId" UUID NOT NULL,
  "caseId" UUID NOT NULL,
  "governmentDecisionId" UUID NOT NULL,
  "authorityEvaluationRecordId" UUID NOT NULL,
  "status" "CivilRegistryEntryStatus" NOT NULL DEFAULT 'OFFICIAL',
  "currentVersionNumber" INTEGER NOT NULL DEFAULT 1,
  "accessClassification" "CivilRegistryAccessClassification" NOT NULL DEFAULT 'SUBJECT_ACCESS',
  "registeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "civil_registry_entries_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "civil_registry_versions" (
  "id" UUID NOT NULL,
  "civilRegistryEntryId" UUID NOT NULL,
  "versionNumber" INTEGER NOT NULL,
  "effectiveFrom" TIMESTAMP(3) NOT NULL,
  "supersededAt" TIMESTAMP(3),
  "payloadSnapshot" JSONB NOT NULL,
  "integrityHash" TEXT,
  "isCurrent" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "civil_registry_versions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "civil_record_amendments" (
  "id" UUID NOT NULL,
  "civilRegistryEntryId" UUID NOT NULL,
  "basis" "CivilRecordAmendmentBasis" NOT NULL,
  "governmentDecisionId" UUID NOT NULL,
  "authorityEvaluationRecordId" UUID NOT NULL,
  "previousVersionId" UUID NOT NULL,
  "newVersionId" UUID NOT NULL,
  "fieldPath" TEXT NOT NULL,
  "previousValue" JSONB NOT NULL,
  "newValue" JSONB NOT NULL,
  "effectiveDate" TIMESTAMP(3) NOT NULL,
  "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "civil_record_amendments_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "civil_record_correction_requests" (
  "id" UUID NOT NULL,
  "requestReference" TEXT NOT NULL,
  "applicantIdentityId" UUID NOT NULL,
  "subjectCivilPersonRecordId" UUID NOT NULL,
  "civilRegistryEntryId" UUID,
  "caseId" UUID,
  "status" "CivilRecordCorrectionRequestStatus" NOT NULL DEFAULT 'DRAFT',
  "requestedChanges" JSONB NOT NULL DEFAULT '{}',
  "submittedAt" TIMESTAMP(3),
  "decidedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "civil_record_correction_requests_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "civil_record_relationships" (
  "id" UUID NOT NULL,
  "vitalEventId" UUID NOT NULL,
  "fromCivilPersonRecordId" UUID NOT NULL,
  "toCivilPersonRecordId" UUID,
  "relatedIdentityId" UUID,
  "role" "CivilRecordRelationshipRole" NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "civil_record_relationships_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "civil_registry_source_references" (
  "id" UUID NOT NULL,
  "vitalEventId" UUID,
  "civilRegistryEntryId" UUID,
  "sourceType" TEXT NOT NULL,
  "sourceReference" TEXT NOT NULL,
  "governingAuthorityReference" TEXT,
  "documentRecordId" UUID,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "civil_registry_source_references_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "civil_registry_verifications" (
  "id" UUID NOT NULL,
  "vitalEventId" UUID,
  "civilRegistryEntryId" UUID,
  "verificationState" "CivilRegistryVerificationState" NOT NULL,
  "methodReference" TEXT NOT NULL,
  "verifiedAt" TIMESTAMP(3),
  "verifiedByOfficeholderId" UUID,
  "verifiedByIdentityId" UUID,
  "authorityEvaluationRecordId" UUID,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "civil_registry_verifications_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "civil_registry_restrictions" (
  "id" UUID NOT NULL,
  "civilRegistryEntryId" UUID NOT NULL,
  "restrictionType" TEXT NOT NULL,
  "accessClassification" "CivilRegistryAccessClassification" NOT NULL,
  "effectiveFrom" TIMESTAMP(3) NOT NULL,
  "effectiveTo" TIMESTAMP(3),
  "authorityDecisionId" UUID,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "civil_registry_restrictions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "civil_registry_audit_events" (
  "id" UUID NOT NULL,
  "vitalEventId" UUID,
  "civilRegistryEntryId" UUID,
  "eventType" "CivilRegistryAuditEventType" NOT NULL,
  "actorIdentityId" UUID,
  "metadata" JSONB NOT NULL DEFAULT '{}',
  "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "civil_registry_audit_events_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "civil_registry_certificate_extracts" (
  "id" UUID NOT NULL,
  "extractReference" TEXT NOT NULL,
  "civilRegistryEntryId" UUID NOT NULL,
  "civilRegistryVersionId" UUID NOT NULL,
  "officialInstrumentId" UUID,
  "issuanceEventId" UUID,
  "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "civil_registry_certificate_extracts_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "vital_event_evidence_links" (
  "id" UUID NOT NULL,
  "vitalEventId" UUID NOT NULL,
  "evidenceRecordId" UUID NOT NULL,
  "linkRole" TEXT NOT NULL DEFAULT 'SUPPORTING',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "vital_event_evidence_links_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "vital_events_eventReference_key" ON "vital_events"("eventReference");
CREATE INDEX "vital_events_eventType_idx" ON "vital_events"("eventType");
CREATE INDEX "vital_events_registrationStatus_idx" ON "vital_events"("registrationStatus");
CREATE INDEX "vital_events_jurisdictionId_idx" ON "vital_events"("jurisdictionId");
CREATE INDEX "vital_events_institutionId_idx" ON "vital_events"("institutionId");
CREATE INDEX "vital_events_caseId_idx" ON "vital_events"("caseId");
CREATE INDEX "vital_events_applicationId_idx" ON "vital_events"("applicationId");
CREATE INDEX "vital_events_primarySubjectCivilPersonRecordId_idx" ON "vital_events"("primarySubjectCivilPersonRecordId");

CREATE INDEX "civil_person_records_jurisdictionId_idx" ON "civil_person_records"("jurisdictionId");
CREATE INDEX "civil_person_records_institutionId_idx" ON "civil_person_records"("institutionId");
CREATE INDEX "civil_person_records_personId_idx" ON "civil_person_records"("personId");
CREATE INDEX "civil_person_records_accessClassification_idx" ON "civil_person_records"("accessClassification");

CREATE INDEX "civil_identity_records_civilPersonRecordId_idx" ON "civil_identity_records"("civilPersonRecordId");
CREATE INDEX "civil_identity_records_jurisdictionId_idx" ON "civil_identity_records"("jurisdictionId");
CREATE INDEX "civil_identity_records_institutionId_idx" ON "civil_identity_records"("institutionId");
CREATE INDEX "civil_identity_records_identityReferenceType_identityReferenceValue_idx" ON "civil_identity_records"("identityReferenceType", "identityReferenceValue");

CREATE INDEX "civil_status_records_civilPersonRecordId_idx" ON "civil_status_records"("civilPersonRecordId");
CREATE INDEX "civil_status_records_vitalEventId_idx" ON "civil_status_records"("vitalEventId");
CREATE INDEX "civil_status_records_statusType_idx" ON "civil_status_records"("statusType");

CREATE UNIQUE INDEX "civil_registry_entries_entryReference_key" ON "civil_registry_entries"("entryReference");
CREATE UNIQUE INDEX "civil_registry_entries_vitalEventId_key" ON "civil_registry_entries"("vitalEventId");
CREATE INDEX "civil_registry_entries_civilPersonRecordId_idx" ON "civil_registry_entries"("civilPersonRecordId");
CREATE INDEX "civil_registry_entries_caseId_idx" ON "civil_registry_entries"("caseId");
CREATE INDEX "civil_registry_entries_status_idx" ON "civil_registry_entries"("status");
CREATE INDEX "civil_registry_entries_accessClassification_idx" ON "civil_registry_entries"("accessClassification");
CREATE INDEX "civil_registry_entries_governmentDecisionId_idx" ON "civil_registry_entries"("governmentDecisionId");

CREATE UNIQUE INDEX "civil_registry_versions_civilRegistryEntryId_versionNumber_key" ON "civil_registry_versions"("civilRegistryEntryId", "versionNumber");
CREATE INDEX "civil_registry_versions_civilRegistryEntryId_idx" ON "civil_registry_versions"("civilRegistryEntryId");
CREATE INDEX "civil_registry_versions_isCurrent_idx" ON "civil_registry_versions"("isCurrent");

CREATE UNIQUE INDEX "civil_record_amendments_newVersionId_key" ON "civil_record_amendments"("newVersionId");
CREATE INDEX "civil_record_amendments_civilRegistryEntryId_idx" ON "civil_record_amendments"("civilRegistryEntryId");
CREATE INDEX "civil_record_amendments_governmentDecisionId_idx" ON "civil_record_amendments"("governmentDecisionId");

CREATE UNIQUE INDEX "civil_record_correction_requests_requestReference_key" ON "civil_record_correction_requests"("requestReference");
CREATE INDEX "civil_record_correction_requests_applicantIdentityId_idx" ON "civil_record_correction_requests"("applicantIdentityId");
CREATE INDEX "civil_record_correction_requests_subjectCivilPersonRecordId_idx" ON "civil_record_correction_requests"("subjectCivilPersonRecordId");
CREATE INDEX "civil_record_correction_requests_status_idx" ON "civil_record_correction_requests"("status");

CREATE INDEX "civil_record_relationships_vitalEventId_idx" ON "civil_record_relationships"("vitalEventId");
CREATE INDEX "civil_record_relationships_fromCivilPersonRecordId_idx" ON "civil_record_relationships"("fromCivilPersonRecordId");
CREATE INDEX "civil_record_relationships_toCivilPersonRecordId_idx" ON "civil_record_relationships"("toCivilPersonRecordId");

CREATE INDEX "civil_registry_source_references_vitalEventId_idx" ON "civil_registry_source_references"("vitalEventId");
CREATE INDEX "civil_registry_source_references_civilRegistryEntryId_idx" ON "civil_registry_source_references"("civilRegistryEntryId");
CREATE INDEX "civil_registry_source_references_documentRecordId_idx" ON "civil_registry_source_references"("documentRecordId");

CREATE INDEX "civil_registry_verifications_vitalEventId_idx" ON "civil_registry_verifications"("vitalEventId");
CREATE INDEX "civil_registry_verifications_civilRegistryEntryId_idx" ON "civil_registry_verifications"("civilRegistryEntryId");
CREATE INDEX "civil_registry_verifications_verificationState_idx" ON "civil_registry_verifications"("verificationState");

CREATE INDEX "civil_registry_restrictions_civilRegistryEntryId_idx" ON "civil_registry_restrictions"("civilRegistryEntryId");
CREATE INDEX "civil_registry_restrictions_accessClassification_idx" ON "civil_registry_restrictions"("accessClassification");

CREATE INDEX "civil_registry_audit_events_vitalEventId_idx" ON "civil_registry_audit_events"("vitalEventId");
CREATE INDEX "civil_registry_audit_events_civilRegistryEntryId_idx" ON "civil_registry_audit_events"("civilRegistryEntryId");
CREATE INDEX "civil_registry_audit_events_eventType_idx" ON "civil_registry_audit_events"("eventType");

CREATE UNIQUE INDEX "civil_registry_certificate_extracts_extractReference_key" ON "civil_registry_certificate_extracts"("extractReference");
CREATE INDEX "civil_registry_certificate_extracts_civilRegistryEntryId_idx" ON "civil_registry_certificate_extracts"("civilRegistryEntryId");
CREATE INDEX "civil_registry_certificate_extracts_civilRegistryVersionId_idx" ON "civil_registry_certificate_extracts"("civilRegistryVersionId");
CREATE INDEX "civil_registry_certificate_extracts_officialInstrumentId_idx" ON "civil_registry_certificate_extracts"("officialInstrumentId");

CREATE UNIQUE INDEX "vital_event_evidence_links_vitalEventId_evidenceRecordId_key" ON "vital_event_evidence_links"("vitalEventId", "evidenceRecordId");
CREATE INDEX "vital_event_evidence_links_evidenceRecordId_idx" ON "vital_event_evidence_links"("evidenceRecordId");

ALTER TABLE "civil_person_records" ADD CONSTRAINT "civil_person_records_jurisdictionId_fkey" FOREIGN KEY ("jurisdictionId") REFERENCES "jurisdictions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "civil_person_records" ADD CONSTRAINT "civil_person_records_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "institutions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "civil_person_records" ADD CONSTRAINT "civil_person_records_personId_fkey" FOREIGN KEY ("personId") REFERENCES "persons"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "civil_identity_records" ADD CONSTRAINT "civil_identity_records_civilPersonRecordId_fkey" FOREIGN KEY ("civilPersonRecordId") REFERENCES "civil_person_records"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "civil_identity_records" ADD CONSTRAINT "civil_identity_records_jurisdictionId_fkey" FOREIGN KEY ("jurisdictionId") REFERENCES "jurisdictions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "civil_identity_records" ADD CONSTRAINT "civil_identity_records_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "institutions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "vital_events" ADD CONSTRAINT "vital_events_jurisdictionId_fkey" FOREIGN KEY ("jurisdictionId") REFERENCES "jurisdictions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "vital_events" ADD CONSTRAINT "vital_events_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "institutions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "vital_events" ADD CONSTRAINT "vital_events_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "applications"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "vital_events" ADD CONSTRAINT "vital_events_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "cases"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "vital_events" ADD CONSTRAINT "vital_events_governmentServiceId_fkey" FOREIGN KEY ("governmentServiceId") REFERENCES "government_services"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "vital_events" ADD CONSTRAINT "vital_events_governingServicePackVersionId_fkey" FOREIGN KEY ("governingServicePackVersionId") REFERENCES "service_pack_versions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "vital_events" ADD CONSTRAINT "vital_events_registrarOfficeholderId_fkey" FOREIGN KEY ("registrarOfficeholderId") REFERENCES "officeholders"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "vital_events" ADD CONSTRAINT "vital_events_registrarIdentityId_fkey" FOREIGN KEY ("registrarIdentityId") REFERENCES "identities"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "vital_events" ADD CONSTRAINT "vital_events_primarySubjectCivilPersonRecordId_fkey" FOREIGN KEY ("primarySubjectCivilPersonRecordId") REFERENCES "civil_person_records"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "birth_events" ADD CONSTRAINT "birth_events_vitalEventId_fkey" FOREIGN KEY ("vitalEventId") REFERENCES "vital_events"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "death_events" ADD CONSTRAINT "death_events_vitalEventId_fkey" FOREIGN KEY ("vitalEventId") REFERENCES "vital_events"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "marriage_events" ADD CONSTRAINT "marriage_events_vitalEventId_fkey" FOREIGN KEY ("vitalEventId") REFERENCES "vital_events"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "divorce_events" ADD CONSTRAINT "divorce_events_vitalEventId_fkey" FOREIGN KEY ("vitalEventId") REFERENCES "vital_events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "civil_status_records" ADD CONSTRAINT "civil_status_records_civilPersonRecordId_fkey" FOREIGN KEY ("civilPersonRecordId") REFERENCES "civil_person_records"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "civil_status_records" ADD CONSTRAINT "civil_status_records_vitalEventId_fkey" FOREIGN KEY ("vitalEventId") REFERENCES "vital_events"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "civil_registry_entries" ADD CONSTRAINT "civil_registry_entries_vitalEventId_fkey" FOREIGN KEY ("vitalEventId") REFERENCES "vital_events"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "civil_registry_entries" ADD CONSTRAINT "civil_registry_entries_civilPersonRecordId_fkey" FOREIGN KEY ("civilPersonRecordId") REFERENCES "civil_person_records"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "civil_registry_entries" ADD CONSTRAINT "civil_registry_entries_jurisdictionId_fkey" FOREIGN KEY ("jurisdictionId") REFERENCES "jurisdictions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "civil_registry_entries" ADD CONSTRAINT "civil_registry_entries_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "institutions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "civil_registry_entries" ADD CONSTRAINT "civil_registry_entries_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "cases"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "civil_registry_entries" ADD CONSTRAINT "civil_registry_entries_governmentDecisionId_fkey" FOREIGN KEY ("governmentDecisionId") REFERENCES "government_decisions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "civil_registry_entries" ADD CONSTRAINT "civil_registry_entries_authorityEvaluationRecordId_fkey" FOREIGN KEY ("authorityEvaluationRecordId") REFERENCES "authority_evaluation_records"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "civil_registry_versions" ADD CONSTRAINT "civil_registry_versions_civilRegistryEntryId_fkey" FOREIGN KEY ("civilRegistryEntryId") REFERENCES "civil_registry_entries"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "civil_record_amendments" ADD CONSTRAINT "civil_record_amendments_civilRegistryEntryId_fkey" FOREIGN KEY ("civilRegistryEntryId") REFERENCES "civil_registry_entries"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "civil_record_amendments" ADD CONSTRAINT "civil_record_amendments_governmentDecisionId_fkey" FOREIGN KEY ("governmentDecisionId") REFERENCES "government_decisions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "civil_record_amendments" ADD CONSTRAINT "civil_record_amendments_authorityEvaluationRecordId_fkey" FOREIGN KEY ("authorityEvaluationRecordId") REFERENCES "authority_evaluation_records"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "civil_record_amendments" ADD CONSTRAINT "civil_record_amendments_previousVersionId_fkey" FOREIGN KEY ("previousVersionId") REFERENCES "civil_registry_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "civil_record_amendments" ADD CONSTRAINT "civil_record_amendments_newVersionId_fkey" FOREIGN KEY ("newVersionId") REFERENCES "civil_registry_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "civil_record_correction_requests" ADD CONSTRAINT "civil_record_correction_requests_applicantIdentityId_fkey" FOREIGN KEY ("applicantIdentityId") REFERENCES "identities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "civil_record_correction_requests" ADD CONSTRAINT "civil_record_correction_requests_subjectCivilPersonRecordId_fkey" FOREIGN KEY ("subjectCivilPersonRecordId") REFERENCES "civil_person_records"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "civil_record_correction_requests" ADD CONSTRAINT "civil_record_correction_requests_civilRegistryEntryId_fkey" FOREIGN KEY ("civilRegistryEntryId") REFERENCES "civil_registry_entries"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "civil_record_correction_requests" ADD CONSTRAINT "civil_record_correction_requests_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "cases"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "civil_record_relationships" ADD CONSTRAINT "civil_record_relationships_vitalEventId_fkey" FOREIGN KEY ("vitalEventId") REFERENCES "vital_events"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "civil_record_relationships" ADD CONSTRAINT "civil_record_relationships_fromCivilPersonRecordId_fkey" FOREIGN KEY ("fromCivilPersonRecordId") REFERENCES "civil_person_records"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "civil_record_relationships" ADD CONSTRAINT "civil_record_relationships_toCivilPersonRecordId_fkey" FOREIGN KEY ("toCivilPersonRecordId") REFERENCES "civil_person_records"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "civil_record_relationships" ADD CONSTRAINT "civil_record_relationships_relatedIdentityId_fkey" FOREIGN KEY ("relatedIdentityId") REFERENCES "identities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "civil_registry_source_references" ADD CONSTRAINT "civil_registry_source_references_vitalEventId_fkey" FOREIGN KEY ("vitalEventId") REFERENCES "vital_events"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "civil_registry_source_references" ADD CONSTRAINT "civil_registry_source_references_civilRegistryEntryId_fkey" FOREIGN KEY ("civilRegistryEntryId") REFERENCES "civil_registry_entries"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "civil_registry_source_references" ADD CONSTRAINT "civil_registry_source_references_documentRecordId_fkey" FOREIGN KEY ("documentRecordId") REFERENCES "document_records"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "civil_registry_verifications" ADD CONSTRAINT "civil_registry_verifications_vitalEventId_fkey" FOREIGN KEY ("vitalEventId") REFERENCES "vital_events"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "civil_registry_verifications" ADD CONSTRAINT "civil_registry_verifications_civilRegistryEntryId_fkey" FOREIGN KEY ("civilRegistryEntryId") REFERENCES "civil_registry_entries"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "civil_registry_verifications" ADD CONSTRAINT "civil_registry_verifications_verifiedByOfficeholderId_fkey" FOREIGN KEY ("verifiedByOfficeholderId") REFERENCES "officeholders"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "civil_registry_verifications" ADD CONSTRAINT "civil_registry_verifications_verifiedByIdentityId_fkey" FOREIGN KEY ("verifiedByIdentityId") REFERENCES "identities"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "civil_registry_verifications" ADD CONSTRAINT "civil_registry_verifications_authorityEvaluationRecordId_fkey" FOREIGN KEY ("authorityEvaluationRecordId") REFERENCES "authority_evaluation_records"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "civil_registry_restrictions" ADD CONSTRAINT "civil_registry_restrictions_civilRegistryEntryId_fkey" FOREIGN KEY ("civilRegistryEntryId") REFERENCES "civil_registry_entries"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "civil_registry_restrictions" ADD CONSTRAINT "civil_registry_restrictions_authorityDecisionId_fkey" FOREIGN KEY ("authorityDecisionId") REFERENCES "government_decisions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "civil_registry_audit_events" ADD CONSTRAINT "civil_registry_audit_events_vitalEventId_fkey" FOREIGN KEY ("vitalEventId") REFERENCES "vital_events"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "civil_registry_audit_events" ADD CONSTRAINT "civil_registry_audit_events_civilRegistryEntryId_fkey" FOREIGN KEY ("civilRegistryEntryId") REFERENCES "civil_registry_entries"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "civil_registry_audit_events" ADD CONSTRAINT "civil_registry_audit_events_actorIdentityId_fkey" FOREIGN KEY ("actorIdentityId") REFERENCES "identities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "civil_registry_certificate_extracts" ADD CONSTRAINT "civil_registry_certificate_extracts_civilRegistryEntryId_fkey" FOREIGN KEY ("civilRegistryEntryId") REFERENCES "civil_registry_entries"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "civil_registry_certificate_extracts" ADD CONSTRAINT "civil_registry_certificate_extracts_civilRegistryVersionId_fkey" FOREIGN KEY ("civilRegistryVersionId") REFERENCES "civil_registry_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "civil_registry_certificate_extracts" ADD CONSTRAINT "civil_registry_certificate_extracts_officialInstrumentId_fkey" FOREIGN KEY ("officialInstrumentId") REFERENCES "official_instruments"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "civil_registry_certificate_extracts" ADD CONSTRAINT "civil_registry_certificate_extracts_issuanceEventId_fkey" FOREIGN KEY ("issuanceEventId") REFERENCES "issuance_events"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "vital_event_evidence_links" ADD CONSTRAINT "vital_event_evidence_links_vitalEventId_fkey" FOREIGN KEY ("vitalEventId") REFERENCES "vital_events"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "vital_event_evidence_links" ADD CONSTRAINT "vital_event_evidence_links_evidenceRecordId_fkey" FOREIGN KEY ("evidenceRecordId") REFERENCES "evidence_records"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
