-- Phase 13A: Operational Readiness and Activation Foundation

CREATE TYPE "CapabilitySubjectType" AS ENUM (
  'DEPARTMENT',
  'SERVICE',
  'FUNCTION',
  'WORKFLOW',
  'INTEGRATION',
  'ENVIRONMENT',
  'APPLICATION',
  'ISSUANCE_FUNCTION',
  'AI_USE_CASE',
  'AI_AGENT',
  'DIGITAL_TWIN',
  'PAYMENT_CAPABILITY',
  'COMMUNICATION_CAPABILITY',
  'REPORTING_CAPABILITY',
  'SECURITY_CAPABILITY',
  'OTHER_CONTROLLED_CAPABILITY'
);

CREATE TYPE "CapabilityMaturityState" AS ENUM (
  'CONCEPTUAL',
  'DESIGNED',
  'PROTOTYPED',
  'PILOT_READY',
  'PILOT_OPERATIONAL',
  'PRODUCTION_READY',
  'INSTITUTIONALLY_ACCEPTED',
  'OPERATIONALLY_ACTIVATED',
  'REVALIDATION_REQUIRED',
  'REVALIDATED',
  'SUSPENDED',
  'RETIRED',
  'REPLACED'
);

CREATE TYPE "ProductionReadinessDomain" AS ENUM (
  'AUTHORITY',
  'GOVERNANCE',
  'FUNCTIONAL',
  'WORKFLOW',
  'DATA',
  'RECORDS',
  'IDENTITY',
  'SECURITY',
  'PRIVACY',
  'CRYPTOGRAPHY',
  'INTEGRATION',
  'AI_GOVERNANCE',
  'PERFORMANCE',
  'CAPACITY',
  'CONTINUITY',
  'BACKUP_RECOVERY',
  'SUPPORT',
  'WORKFORCE',
  'TRAINING',
  'ACCESSIBILITY',
  'MONITORING',
  'INCIDENT_RESPONSE',
  'CHANGE_MANAGEMENT',
  'VENDOR',
  'EXIT_PORTABILITY'
);

CREATE TYPE "ProductionReadinessStatus" AS ENUM (
  'NOT_ASSESSED',
  'NOT_READY',
  'PARTIALLY_READY',
  'READY_WITH_CONDITIONS',
  'READY',
  'SAFE_HALTED'
);

CREATE TYPE "CapabilityMaturityAssessmentDecision" AS ENUM (
  'APPROVED',
  'REJECTED',
  'DEFERRED',
  'CONDITIONALLY_APPROVED'
);

CREATE TYPE "CapabilityDependencyControlScope" AS ENUM (
  'HEARTSTONE_CONTROLLED',
  'EXTERNAL',
  'PARTIALLY_CONTROLLED'
);

CREATE TYPE "CapabilityDependencyVerificationStatus" AS ENUM (
  'NOT_VERIFIED',
  'VERIFIED',
  'VERIFICATION_FAILED',
  'STALE'
);

CREATE TYPE "ActivationConditionStatus" AS ENUM (
  'PENDING',
  'SATISFIED',
  'UNSATISFIED',
  'WAIVED',
  'EXPIRED'
);

CREATE TYPE "SafeHaltTriggerType" AS ENUM (
  'AUTHORITY_UNAVAILABLE',
  'REQUIRED_OFFICEHOLDER_UNAVAILABLE',
  'SECURITY_CONTROL_FAILURE',
  'IDENTITY_TRUST_FAILURE',
  'RECORD_INTEGRITY_FAILURE',
  'REQUIRED_INTEGRATION_UNAVAILABLE',
  'MANDATORY_PROFESSIONAL_REVIEW_UNAVAILABLE',
  'UNRESOLVED_CRITICAL_DEFECT',
  'CONTINUITY_FAILURE',
  'AI_GOVERNANCE_FAILURE',
  'QUALIFICATION_EXPIRY'
);

CREATE TYPE "CapabilityRevalidationTrigger" AS ENUM (
  'AUTHORITY_SOURCE_CHANGE',
  'POLICY_CHANGE',
  'CONFIGURATION_CHANGE',
  'RELEASE_CHANGE',
  'SCHEMA_CHANGE',
  'MODEL_CHANGE',
  'AI_MODEL_CHANGE',
  'INTEGRATION_CHANGE',
  'VENDOR_CHANGE',
  'HOSTING_CHANGE',
  'SECURITY_ARCHITECTURE_CHANGE',
  'CRYPTOGRAPHIC_ALGORITHM_CHANGE',
  'STAFFING_CHANGE',
  'OFFICEHOLDER_CHANGE',
  'PROFESSIONAL_QUALIFICATION_CHANGE',
  'SERVICE_POPULATION_CHANGE',
  'DATA_CLASSIFICATION_CHANGE',
  'OPERATING_ENVIRONMENT_CHANGE',
  'INCIDENT',
  'MAJOR_DEFECT'
);

CREATE TABLE "capability_definitions" (
  "id" UUID NOT NULL,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "subjectType" "CapabilitySubjectType" NOT NULL,
  "subjectReferenceId" UUID,
  "currentMaturityState" "CapabilityMaturityState" NOT NULL DEFAULT 'CONCEPTUAL',
  "isOperational" BOOLEAN NOT NULL DEFAULT false,
  "isSuspended" BOOLEAN NOT NULL DEFAULT false,
  "isRetired" BOOLEAN NOT NULL DEFAULT false,
  "replacedByCapabilityId" UUID,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "capability_definitions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "capability_versions" (
  "id" UUID NOT NULL,
  "capabilityDefinitionId" UUID NOT NULL,
  "versionNumber" TEXT NOT NULL,
  "description" TEXT,
  "releaseReference" TEXT,
  "isCurrent" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "capability_versions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "capability_maturity_assessments" (
  "id" UUID NOT NULL,
  "capabilityDefinitionId" UUID NOT NULL,
  "capabilityVersionId" UUID NOT NULL,
  "currentMaturity" "CapabilityMaturityState" NOT NULL,
  "requestedMaturity" "CapabilityMaturityState" NOT NULL,
  "scope" TEXT,
  "environment" TEXT,
  "usersPopulation" TEXT,
  "authorityBasis" TEXT,
  "institutionalOwnerId" UUID,
  "technicalOwnerIdentityId" UUID,
  "requirements" JSONB NOT NULL DEFAULT '[]',
  "evidence" JSONB NOT NULL DEFAULT '[]',
  "openDefects" JSONB NOT NULL DEFAULT '[]',
  "residualRisks" JSONB NOT NULL DEFAULT '[]',
  "dependencies" JSONB NOT NULL DEFAULT '[]',
  "staffingReadiness" JSONB NOT NULL DEFAULT '{}',
  "trainingReadiness" JSONB NOT NULL DEFAULT '{}',
  "securityReadiness" JSONB NOT NULL DEFAULT '{}',
  "privacyReadiness" JSONB NOT NULL DEFAULT '{}',
  "recordsReadiness" JSONB NOT NULL DEFAULT '{}',
  "continuityReadiness" JSONB NOT NULL DEFAULT '{}',
  "integrationReadiness" JSONB NOT NULL DEFAULT '{}',
  "supportReadiness" JSONB NOT NULL DEFAULT '{}',
  "decision" "CapabilityMaturityAssessmentDecision",
  "reviewerIdentityId" UUID,
  "decidedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "capability_maturity_assessments_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "capability_maturity_history" (
  "id" UUID NOT NULL,
  "capabilityDefinitionId" UUID NOT NULL,
  "capabilityVersionId" UUID NOT NULL,
  "priorMaturity" "CapabilityMaturityState" NOT NULL,
  "newMaturity" "CapabilityMaturityState" NOT NULL,
  "assessmentId" UUID,
  "changeReason" TEXT NOT NULL,
  "changedByIdentityId" UUID,
  "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "capability_maturity_history_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "production_readiness_assessments" (
  "id" UUID NOT NULL,
  "capabilityDefinitionId" UUID NOT NULL,
  "capabilityVersionId" UUID NOT NULL,
  "overallStatus" "ProductionReadinessStatus" NOT NULL DEFAULT 'NOT_ASSESSED',
  "assessedByIdentityId" UUID,
  "assessedAt" TIMESTAMP(3),
  "summary" TEXT,
  "conditions" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "production_readiness_assessments_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "production_readiness_requirements" (
  "id" UUID NOT NULL,
  "assessmentId" UUID NOT NULL,
  "domain" "ProductionReadinessDomain" NOT NULL,
  "status" "ProductionReadinessStatus" NOT NULL DEFAULT 'NOT_ASSESSED',
  "requirementText" TEXT NOT NULL,
  "measurableConditions" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "blockers" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "production_readiness_requirements_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "production_readiness_evidence" (
  "id" UUID NOT NULL,
  "assessmentId" UUID NOT NULL,
  "requirementId" UUID,
  "evidenceReference" TEXT NOT NULL,
  "evidenceType" TEXT NOT NULL,
  "evidenceHash" TEXT,
  "description" TEXT,
  "submittedByIdentityId" UUID,
  "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "isReplayable" BOOLEAN NOT NULL DEFAULT true,
  "replaySnapshot" JSONB NOT NULL DEFAULT '{}',

  CONSTRAINT "production_readiness_evidence_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "activation_conditions" (
  "id" UUID NOT NULL,
  "capabilityDefinitionId" UUID NOT NULL,
  "conditionText" TEXT NOT NULL,
  "ownerIdentityId" UUID,
  "ownerOfficeholderId" UUID,
  "evidenceReference" TEXT,
  "deadline" TIMESTAMP(3),
  "status" "ActivationConditionStatus" NOT NULL DEFAULT 'PENDING',
  "verificationNotes" TEXT,
  "isMandatory" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "activation_conditions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "activation_restrictions" (
  "id" UUID NOT NULL,
  "capabilityDefinitionId" UUID NOT NULL,
  "restrictionText" TEXT NOT NULL,
  "restrictionBasis" TEXT,
  "effectiveFrom" TIMESTAMP(3),
  "effectiveUntil" TIMESTAMP(3),
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "activation_restrictions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "capability_dependencies" (
  "id" UUID NOT NULL,
  "capabilityDefinitionId" UUID NOT NULL,
  "dependencyName" TEXT NOT NULL,
  "ownerIdentityId" UUID,
  "ownerOfficeholderId" UUID,
  "requiredState" TEXT NOT NULL,
  "actualState" TEXT,
  "verificationStatus" "CapabilityDependencyVerificationStatus" NOT NULL DEFAULT 'NOT_VERIFIED',
  "verificationNotes" TEXT,
  "fallbackPlan" TEXT,
  "effectIfUnavailable" TEXT NOT NULL,
  "controlScope" "CapabilityDependencyControlScope" NOT NULL,
  "isReady" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "capability_dependencies_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "capability_owner_assignments" (
  "id" UUID NOT NULL,
  "capabilityDefinitionId" UUID NOT NULL,
  "institutionalOwnerId" UUID,
  "technicalOwnerIdentityId" UUID,
  "assignedByIdentityId" UUID,
  "effectiveFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "effectiveUntil" TIMESTAMP(3),
  "isCurrent" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "capability_owner_assignments_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "capability_safe_halt_conditions" (
  "id" UUID NOT NULL,
  "capabilityDefinitionId" UUID NOT NULL,
  "triggerType" "SafeHaltTriggerType" NOT NULL,
  "triggerDescription" TEXT NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "haltAction" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "capability_safe_halt_conditions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "capability_revalidation_requirements" (
  "id" UUID NOT NULL,
  "capabilityDefinitionId" UUID NOT NULL,
  "trigger" "CapabilityRevalidationTrigger" NOT NULL,
  "description" TEXT NOT NULL,
  "requiredEvidence" JSONB NOT NULL DEFAULT '[]',
  "isTriggered" BOOLEAN NOT NULL DEFAULT false,
  "triggeredAt" TIMESTAMP(3),
  "triggeredByIdentityId" UUID,
  "priorMaturityState" "CapabilityMaturityState",
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "capability_revalidation_requirements_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "capability_definitions_code_key" ON "capability_definitions"("code");
CREATE INDEX "capability_definitions_subjectType_idx" ON "capability_definitions"("subjectType");
CREATE INDEX "capability_definitions_currentMaturityState_idx" ON "capability_definitions"("currentMaturityState");
CREATE INDEX "capability_definitions_isSuspended_idx" ON "capability_definitions"("isSuspended");
CREATE INDEX "capability_definitions_isRetired_idx" ON "capability_definitions"("isRetired");

CREATE UNIQUE INDEX "capability_versions_capabilityDefinitionId_versionNumber_key" ON "capability_versions"("capabilityDefinitionId", "versionNumber");
CREATE INDEX "capability_versions_capabilityDefinitionId_idx" ON "capability_versions"("capabilityDefinitionId");
CREATE INDEX "capability_versions_isCurrent_idx" ON "capability_versions"("isCurrent");

CREATE INDEX "capability_maturity_assessments_capabilityDefinitionId_idx" ON "capability_maturity_assessments"("capabilityDefinitionId");
CREATE INDEX "capability_maturity_assessments_capabilityVersionId_idx" ON "capability_maturity_assessments"("capabilityVersionId");
CREATE INDEX "capability_maturity_assessments_requestedMaturity_idx" ON "capability_maturity_assessments"("requestedMaturity");
CREATE INDEX "capability_maturity_assessments_decision_idx" ON "capability_maturity_assessments"("decision");

CREATE INDEX "capability_maturity_history_capabilityDefinitionId_idx" ON "capability_maturity_history"("capabilityDefinitionId");
CREATE INDEX "capability_maturity_history_capabilityVersionId_idx" ON "capability_maturity_history"("capabilityVersionId");
CREATE INDEX "capability_maturity_history_recordedAt_idx" ON "capability_maturity_history"("recordedAt");

CREATE INDEX "production_readiness_assessments_capabilityDefinitionId_idx" ON "production_readiness_assessments"("capabilityDefinitionId");
CREATE INDEX "production_readiness_assessments_capabilityVersionId_idx" ON "production_readiness_assessments"("capabilityVersionId");
CREATE INDEX "production_readiness_assessments_overallStatus_idx" ON "production_readiness_assessments"("overallStatus");

CREATE UNIQUE INDEX "production_readiness_requirements_assessmentId_domain_key" ON "production_readiness_requirements"("assessmentId", "domain");
CREATE INDEX "production_readiness_requirements_assessmentId_idx" ON "production_readiness_requirements"("assessmentId");
CREATE INDEX "production_readiness_requirements_domain_idx" ON "production_readiness_requirements"("domain");
CREATE INDEX "production_readiness_requirements_status_idx" ON "production_readiness_requirements"("status");

CREATE INDEX "production_readiness_evidence_assessmentId_idx" ON "production_readiness_evidence"("assessmentId");
CREATE INDEX "production_readiness_evidence_requirementId_idx" ON "production_readiness_evidence"("requirementId");
CREATE INDEX "production_readiness_evidence_evidenceReference_idx" ON "production_readiness_evidence"("evidenceReference");

CREATE INDEX "activation_conditions_capabilityDefinitionId_idx" ON "activation_conditions"("capabilityDefinitionId");
CREATE INDEX "activation_conditions_status_idx" ON "activation_conditions"("status");
CREATE INDEX "activation_conditions_isMandatory_idx" ON "activation_conditions"("isMandatory");

CREATE INDEX "activation_restrictions_capabilityDefinitionId_idx" ON "activation_restrictions"("capabilityDefinitionId");
CREATE INDEX "activation_restrictions_isActive_idx" ON "activation_restrictions"("isActive");

CREATE INDEX "capability_dependencies_capabilityDefinitionId_idx" ON "capability_dependencies"("capabilityDefinitionId");
CREATE INDEX "capability_dependencies_controlScope_idx" ON "capability_dependencies"("controlScope");
CREATE INDEX "capability_dependencies_verificationStatus_idx" ON "capability_dependencies"("verificationStatus");

CREATE INDEX "capability_owner_assignments_capabilityDefinitionId_idx" ON "capability_owner_assignments"("capabilityDefinitionId");
CREATE INDEX "capability_owner_assignments_isCurrent_idx" ON "capability_owner_assignments"("isCurrent");

CREATE INDEX "capability_safe_halt_conditions_capabilityDefinitionId_idx" ON "capability_safe_halt_conditions"("capabilityDefinitionId");
CREATE INDEX "capability_safe_halt_conditions_triggerType_idx" ON "capability_safe_halt_conditions"("triggerType");
CREATE INDEX "capability_safe_halt_conditions_isActive_idx" ON "capability_safe_halt_conditions"("isActive");

CREATE INDEX "capability_revalidation_requirements_capabilityDefinitionId_idx" ON "capability_revalidation_requirements"("capabilityDefinitionId");
CREATE INDEX "capability_revalidation_requirements_trigger_idx" ON "capability_revalidation_requirements"("trigger");
CREATE INDEX "capability_revalidation_requirements_isTriggered_idx" ON "capability_revalidation_requirements"("isTriggered");

ALTER TABLE "capability_definitions" ADD CONSTRAINT "capability_definitions_replacedByCapabilityId_fkey" FOREIGN KEY ("replacedByCapabilityId") REFERENCES "capability_definitions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "capability_versions" ADD CONSTRAINT "capability_versions_capabilityDefinitionId_fkey" FOREIGN KEY ("capabilityDefinitionId") REFERENCES "capability_definitions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "capability_maturity_assessments" ADD CONSTRAINT "capability_maturity_assessments_capabilityDefinitionId_fkey" FOREIGN KEY ("capabilityDefinitionId") REFERENCES "capability_definitions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "capability_maturity_assessments" ADD CONSTRAINT "capability_maturity_assessments_capabilityVersionId_fkey" FOREIGN KEY ("capabilityVersionId") REFERENCES "capability_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "capability_maturity_assessments" ADD CONSTRAINT "capability_maturity_assessments_institutionalOwnerId_fkey" FOREIGN KEY ("institutionalOwnerId") REFERENCES "officeholders"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "capability_maturity_assessments" ADD CONSTRAINT "capability_maturity_assessments_technicalOwnerIdentityId_fkey" FOREIGN KEY ("technicalOwnerIdentityId") REFERENCES "identities"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "capability_maturity_assessments" ADD CONSTRAINT "capability_maturity_assessments_reviewerIdentityId_fkey" FOREIGN KEY ("reviewerIdentityId") REFERENCES "identities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "capability_maturity_history" ADD CONSTRAINT "capability_maturity_history_capabilityDefinitionId_fkey" FOREIGN KEY ("capabilityDefinitionId") REFERENCES "capability_definitions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "capability_maturity_history" ADD CONSTRAINT "capability_maturity_history_capabilityVersionId_fkey" FOREIGN KEY ("capabilityVersionId") REFERENCES "capability_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "capability_maturity_history" ADD CONSTRAINT "capability_maturity_history_changedByIdentityId_fkey" FOREIGN KEY ("changedByIdentityId") REFERENCES "identities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "production_readiness_assessments" ADD CONSTRAINT "production_readiness_assessments_capabilityDefinitionId_fkey" FOREIGN KEY ("capabilityDefinitionId") REFERENCES "capability_definitions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "production_readiness_assessments" ADD CONSTRAINT "production_readiness_assessments_capabilityVersionId_fkey" FOREIGN KEY ("capabilityVersionId") REFERENCES "capability_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "production_readiness_assessments" ADD CONSTRAINT "production_readiness_assessments_assessedByIdentityId_fkey" FOREIGN KEY ("assessedByIdentityId") REFERENCES "identities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "production_readiness_requirements" ADD CONSTRAINT "production_readiness_requirements_assessmentId_fkey" FOREIGN KEY ("assessmentId") REFERENCES "production_readiness_assessments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "production_readiness_evidence" ADD CONSTRAINT "production_readiness_evidence_assessmentId_fkey" FOREIGN KEY ("assessmentId") REFERENCES "production_readiness_assessments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "production_readiness_evidence" ADD CONSTRAINT "production_readiness_evidence_requirementId_fkey" FOREIGN KEY ("requirementId") REFERENCES "production_readiness_requirements"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "production_readiness_evidence" ADD CONSTRAINT "production_readiness_evidence_submittedByIdentityId_fkey" FOREIGN KEY ("submittedByIdentityId") REFERENCES "identities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "activation_conditions" ADD CONSTRAINT "activation_conditions_capabilityDefinitionId_fkey" FOREIGN KEY ("capabilityDefinitionId") REFERENCES "capability_definitions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "activation_conditions" ADD CONSTRAINT "activation_conditions_ownerIdentityId_fkey" FOREIGN KEY ("ownerIdentityId") REFERENCES "identities"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "activation_conditions" ADD CONSTRAINT "activation_conditions_ownerOfficeholderId_fkey" FOREIGN KEY ("ownerOfficeholderId") REFERENCES "officeholders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "activation_restrictions" ADD CONSTRAINT "activation_restrictions_capabilityDefinitionId_fkey" FOREIGN KEY ("capabilityDefinitionId") REFERENCES "capability_definitions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "capability_dependencies" ADD CONSTRAINT "capability_dependencies_capabilityDefinitionId_fkey" FOREIGN KEY ("capabilityDefinitionId") REFERENCES "capability_definitions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "capability_dependencies" ADD CONSTRAINT "capability_dependencies_ownerIdentityId_fkey" FOREIGN KEY ("ownerIdentityId") REFERENCES "identities"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "capability_dependencies" ADD CONSTRAINT "capability_dependencies_ownerOfficeholderId_fkey" FOREIGN KEY ("ownerOfficeholderId") REFERENCES "officeholders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "capability_owner_assignments" ADD CONSTRAINT "capability_owner_assignments_capabilityDefinitionId_fkey" FOREIGN KEY ("capabilityDefinitionId") REFERENCES "capability_definitions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "capability_owner_assignments" ADD CONSTRAINT "capability_owner_assignments_institutionalOwnerId_fkey" FOREIGN KEY ("institutionalOwnerId") REFERENCES "officeholders"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "capability_owner_assignments" ADD CONSTRAINT "capability_owner_assignments_technicalOwnerIdentityId_fkey" FOREIGN KEY ("technicalOwnerIdentityId") REFERENCES "identities"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "capability_owner_assignments" ADD CONSTRAINT "capability_owner_assignments_assignedByIdentityId_fkey" FOREIGN KEY ("assignedByIdentityId") REFERENCES "identities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "capability_safe_halt_conditions" ADD CONSTRAINT "capability_safe_halt_conditions_capabilityDefinitionId_fkey" FOREIGN KEY ("capabilityDefinitionId") REFERENCES "capability_definitions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "capability_revalidation_requirements" ADD CONSTRAINT "capability_revalidation_requirements_capabilityDefinitionId_fkey" FOREIGN KEY ("capabilityDefinitionId") REFERENCES "capability_definitions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "capability_revalidation_requirements" ADD CONSTRAINT "capability_revalidation_requirements_triggeredByIdentityId_fkey" FOREIGN KEY ("triggeredByIdentityId") REFERENCES "identities"("id") ON DELETE SET NULL ON UPDATE CASCADE;
