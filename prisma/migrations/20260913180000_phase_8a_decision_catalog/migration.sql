-- Phase 8A: Decision catalog and configuration foundation (additive only)

CREATE TYPE "DecisionTypeLifecycleStatus" AS ENUM (
  'DRAFT',
  'AUTHORITY_REVIEW',
  'APPROVED',
  'CONFIGURED',
  'TESTED',
  'ACCEPTED',
  'ACTIVE',
  'SUSPENDED',
  'SUPERSEDED',
  'RETIRED'
);

CREATE TYPE "DecisionOutcomeCode" AS ENUM (
  'APPROVED',
  'APPROVED_WITH_CONDITIONS',
  'PARTIALLY_APPROVED',
  'REFUSED',
  'DEFERRED',
  'RETURNED_FOR_FURTHER_INFORMATION',
  'WITHDRAWN',
  'LAPSED',
  'TRANSFERRED',
  'REFERRED_TO_OTHER_INSTITUTION',
  'CLOSED_WITHOUT_DECISION',
  'OTHER_AUTHORIZED_OUTCOME'
);

CREATE TYPE "DecisionSignatureTiming" AS ENUM (
  'BEFORE_DECISION_RECORDED',
  'WITH_DECISION_RECORDED',
  'BEFORE_INSTRUMENT_ISSUANCE',
  'WITH_INSTRUMENT_ISSUANCE'
);

CREATE TYPE "DecisionPublicationStatus" AS ENUM (
  'NOT_PUBLISHED',
  'PUBLISH_ON_DECISION',
  'PUBLISH_ON_INSTRUMENT_ISSUANCE',
  'RESTRICTED_PUBLICATION'
);

CREATE TYPE "DecisionEffectiveDateRule" AS ENUM (
  'ON_DECISION_RECORDED',
  'ON_INSTRUMENT_ISSUANCE',
  'FIXED_DATE',
  'BUSINESS_DAYS_AFTER_DECISION',
  'AS_SPECIFIED_IN_REASONS'
);

CREATE TYPE "DecisionRequirementElementType" AS ENUM (
  'MANDATORY_EVIDENCE_PACKET',
  'PROFESSIONAL_REVIEW',
  'GOVERNMENT_CONSULTATION',
  'GOVERNMENT_CONCURRENCE',
  'INSPECTION',
  'DEPARTMENTAL_FINDING',
  'RECOMMENDATION',
  'CONFLICT_RECUSAL_CHECK',
  'QUORUM_CO_APPROVAL',
  'CONDITIONS_PRECEDENT',
  'SIGNATURE',
  'SEAL',
  'NOTICE',
  'REVIEW_APPEAL_RIGHTS'
);

CREATE TYPE "DecisionMakerActorType" AS ENUM (
  'OFFICEHOLDER',
  'PANEL',
  'DUAL_CONTROL_PAIR'
);

CREATE TYPE "DecisionTypeTransitionBasis" AS ENUM (
  'CONFIGURATION_COMPLETE',
  'AUTHORITY_REVIEW_COMPLETE',
  'INSTITUTIONAL_ACCEPTANCE',
  'OPERATIONAL_ACTIVATION',
  'SUSPENSION',
  'SUPERSESSION',
  'RETIREMENT'
);

CREATE TABLE "decision_type_definitions" (
  "id" UUID NOT NULL,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "responsibleInstitutionId" UUID NOT NULL,
  "responsibleDepartmentId" UUID,
  "status" "StructuralLifecycleStatus" NOT NULL DEFAULT 'ACTIVE',
  "governingSourceId" UUID,
  "governmentServiceId" UUID,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "decision_type_definitions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "decision_type_versions" (
  "id" UUID NOT NULL,
  "decisionTypeDefinitionId" UUID NOT NULL,
  "version" INTEGER NOT NULL,
  "functionAuthorityRecordId" UUID NOT NULL,
  "requiredAuthorityAction" "AuthorityActionType" NOT NULL,
  "governmentServiceVersionId" UUID,
  "governingSourceId" UUID,
  "decisionStandardDescription" TEXT NOT NULL,
  "matterScopeDescription" TEXT NOT NULL,
  "effectiveFrom" TIMESTAMP(3),
  "effectiveUntil" TIMESTAMP(3),
  "status" "DecisionTypeLifecycleStatus" NOT NULL DEFAULT 'DRAFT',
  "requiresFrozenEvidencePacket" BOOLEAN NOT NULL DEFAULT false,
  "requiredEvidencePacketPurpose" "EvidencePacketPurpose",
  "requiresIndependentReviewer" BOOLEAN NOT NULL DEFAULT false,
  "requiresConflictCheck" BOOLEAN NOT NULL DEFAULT false,
  "requiresProfessionalReview" BOOLEAN NOT NULL DEFAULT false,
  "requiresGovernmentConsultation" BOOLEAN NOT NULL DEFAULT false,
  "requiresConcurrence" BOOLEAN NOT NULL DEFAULT false,
  "requiresDualControl" BOOLEAN NOT NULL DEFAULT false,
  "requiresPanelOrQuorum" BOOLEAN NOT NULL DEFAULT false,
  "requiresReasons" BOOLEAN NOT NULL DEFAULT true,
  "requiresNotice" BOOLEAN NOT NULL DEFAULT false,
  "requiresSignature" BOOLEAN NOT NULL DEFAULT true,
  "requiresSeal" BOOLEAN NOT NULL DEFAULT false,
  "signatureTiming" "DecisionSignatureTiming",
  "effectiveDateRule" "DecisionEffectiveDateRule",
  "publicationStatus" "DecisionPublicationStatus" NOT NULL DEFAULT 'NOT_PUBLISHED',
  "reviewOrAppealConfiguration" JSONB,
  "instrumentIssuanceExpected" BOOLEAN NOT NULL DEFAULT false,
  "authorizedDecisionMakerType" "DecisionMakerActorType" NOT NULL DEFAULT 'OFFICEHOLDER',
  "supersededByVersionId" UUID,
  "institutionallyAcceptedAt" TIMESTAMP(3),
  "operationallyActivatedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "decision_type_versions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "decision_permissible_outcome_definitions" (
  "id" UUID NOT NULL,
  "code" "DecisionOutcomeCode" NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "isTerminal" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "decision_permissible_outcome_definitions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "decision_type_permissible_outcomes" (
  "id" UUID NOT NULL,
  "decisionTypeVersionId" UUID NOT NULL,
  "permissibleOutcomeDefinitionId" UUID NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "decision_type_permissible_outcomes_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "decision_type_requirement_elements" (
  "id" UUID NOT NULL,
  "decisionTypeVersionId" UUID NOT NULL,
  "elementType" "DecisionRequirementElementType" NOT NULL,
  "isRequired" BOOLEAN NOT NULL DEFAULT true,
  "configuration" JSONB,
  "evidencePacketPurpose" "EvidencePacketPurpose",
  "consultationInstitutionId" UUID,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "decision_type_requirement_elements_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "decision_type_lifecycle_transitions" (
  "id" UUID NOT NULL,
  "decisionTypeVersionId" UUID NOT NULL,
  "priorStatus" "DecisionTypeLifecycleStatus" NOT NULL,
  "newStatus" "DecisionTypeLifecycleStatus" NOT NULL,
  "transitionBasis" "DecisionTypeTransitionBasis" NOT NULL,
  "actorIdentityId" UUID NOT NULL,
  "officeholderId" UUID,
  "reason" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "decision_type_lifecycle_transitions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "decision_type_definitions_code_key" ON "decision_type_definitions"("code");
CREATE INDEX "decision_type_definitions_responsibleInstitutionId_idx" ON "decision_type_definitions"("responsibleInstitutionId");
CREATE INDEX "decision_type_definitions_responsibleDepartmentId_idx" ON "decision_type_definitions"("responsibleDepartmentId");
CREATE INDEX "decision_type_definitions_governingSourceId_idx" ON "decision_type_definitions"("governingSourceId");
CREATE INDEX "decision_type_definitions_governmentServiceId_idx" ON "decision_type_definitions"("governmentServiceId");
CREATE INDEX "decision_type_definitions_status_idx" ON "decision_type_definitions"("status");

CREATE UNIQUE INDEX "decision_type_versions_supersededByVersionId_key" ON "decision_type_versions"("supersededByVersionId");
CREATE INDEX "decision_type_versions_decisionTypeDefinitionId_idx" ON "decision_type_versions"("decisionTypeDefinitionId");
CREATE INDEX "decision_type_versions_functionAuthorityRecordId_idx" ON "decision_type_versions"("functionAuthorityRecordId");
CREATE INDEX "decision_type_versions_governmentServiceVersionId_idx" ON "decision_type_versions"("governmentServiceVersionId");
CREATE INDEX "decision_type_versions_governingSourceId_idx" ON "decision_type_versions"("governingSourceId");
CREATE INDEX "decision_type_versions_status_idx" ON "decision_type_versions"("status");
CREATE UNIQUE INDEX "decision_type_versions_decisionTypeDefinitionId_version_key" ON "decision_type_versions"("decisionTypeDefinitionId", "version");

CREATE UNIQUE INDEX "decision_permissible_outcome_definitions_code_key" ON "decision_permissible_outcome_definitions"("code");

CREATE INDEX "decision_type_permissible_outcomes_decisionTypeVersionId_idx" ON "decision_type_permissible_outcomes"("decisionTypeVersionId");
CREATE INDEX "decision_type_permissible_outcomes_permissibleOutcomeDefini_idx" ON "decision_type_permissible_outcomes"("permissibleOutcomeDefinitionId");
CREATE UNIQUE INDEX "decision_type_permissible_outcomes_decisionTypeVersionId_pe_key" ON "decision_type_permissible_outcomes"("decisionTypeVersionId", "permissibleOutcomeDefinitionId");

CREATE INDEX "decision_type_requirement_elements_decisionTypeVersionId_idx" ON "decision_type_requirement_elements"("decisionTypeVersionId");
CREATE INDEX "decision_type_requirement_elements_consultationInstitutionI_idx" ON "decision_type_requirement_elements"("consultationInstitutionId");

CREATE INDEX "decision_type_lifecycle_transitions_decisionTypeVersionId_idx" ON "decision_type_lifecycle_transitions"("decisionTypeVersionId");
CREATE INDEX "decision_type_lifecycle_transitions_createdAt_idx" ON "decision_type_lifecycle_transitions"("createdAt");

ALTER TABLE "decision_type_definitions"
  ADD CONSTRAINT "decision_type_definitions_responsibleInstitutionId_fkey"
  FOREIGN KEY ("responsibleInstitutionId") REFERENCES "institutions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "decision_type_definitions"
  ADD CONSTRAINT "decision_type_definitions_responsibleDepartmentId_fkey"
  FOREIGN KEY ("responsibleDepartmentId") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "decision_type_definitions"
  ADD CONSTRAINT "decision_type_definitions_governingSourceId_fkey"
  FOREIGN KEY ("governingSourceId") REFERENCES "governing_sources"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "decision_type_definitions"
  ADD CONSTRAINT "decision_type_definitions_governmentServiceId_fkey"
  FOREIGN KEY ("governmentServiceId") REFERENCES "government_services"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "decision_type_versions"
  ADD CONSTRAINT "decision_type_versions_decisionTypeDefinitionId_fkey"
  FOREIGN KEY ("decisionTypeDefinitionId") REFERENCES "decision_type_definitions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "decision_type_versions"
  ADD CONSTRAINT "decision_type_versions_functionAuthorityRecordId_fkey"
  FOREIGN KEY ("functionAuthorityRecordId") REFERENCES "function_authority_records"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "decision_type_versions"
  ADD CONSTRAINT "decision_type_versions_governmentServiceVersionId_fkey"
  FOREIGN KEY ("governmentServiceVersionId") REFERENCES "government_service_versions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "decision_type_versions"
  ADD CONSTRAINT "decision_type_versions_governingSourceId_fkey"
  FOREIGN KEY ("governingSourceId") REFERENCES "governing_sources"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "decision_type_versions"
  ADD CONSTRAINT "decision_type_versions_supersededByVersionId_fkey"
  FOREIGN KEY ("supersededByVersionId") REFERENCES "decision_type_versions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "decision_type_permissible_outcomes"
  ADD CONSTRAINT "decision_type_permissible_outcomes_decisionTypeVersionId_fkey"
  FOREIGN KEY ("decisionTypeVersionId") REFERENCES "decision_type_versions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "decision_type_permissible_outcomes"
  ADD CONSTRAINT "decision_type_permissible_outcomes_permissibleOutcomeDefin_fkey"
  FOREIGN KEY ("permissibleOutcomeDefinitionId") REFERENCES "decision_permissible_outcome_definitions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "decision_type_requirement_elements"
  ADD CONSTRAINT "decision_type_requirement_elements_decisionTypeVersionId_fkey"
  FOREIGN KEY ("decisionTypeVersionId") REFERENCES "decision_type_versions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "decision_type_requirement_elements"
  ADD CONSTRAINT "decision_type_requirement_elements_consultationInstitution_fkey"
  FOREIGN KEY ("consultationInstitutionId") REFERENCES "institutions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "decision_type_lifecycle_transitions"
  ADD CONSTRAINT "decision_type_lifecycle_transitions_decisionTypeVersionId_fkey"
  FOREIGN KEY ("decisionTypeVersionId") REFERENCES "decision_type_versions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO "decision_permissible_outcome_definitions" ("id", "code", "name", "description", "isTerminal", "createdAt", "updatedAt")
VALUES
  (gen_random_uuid(), 'APPROVED', 'Approved', 'Final approval without conditions', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'APPROVED_WITH_CONDITIONS', 'Approved with conditions', 'Final approval subject to stated conditions', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'PARTIALLY_APPROVED', 'Partially approved', 'Approval limited to part of the matter', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'REFUSED', 'Refused', 'Final refusal of the matter', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'DEFERRED', 'Deferred', 'Decision deferred to a later point', false, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'RETURNED_FOR_FURTHER_INFORMATION', 'Returned for further information', 'Matter returned pending further information', false, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'WITHDRAWN', 'Withdrawn', 'Matter withdrawn before final decision', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'LAPSED', 'Lapsed', 'Decision route lapsed without final decision', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'TRANSFERRED', 'Transferred', 'Matter transferred within institution', false, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'REFERRED_TO_OTHER_INSTITUTION', 'Referred to other institution', 'Matter referred to another institution', false, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'CLOSED_WITHOUT_DECISION', 'Closed without decision', 'Matter closed without a final institutional decision', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'OTHER_AUTHORIZED_OUTCOME', 'Other authorized outcome', 'Other outcome explicitly authorized for the decision type', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
