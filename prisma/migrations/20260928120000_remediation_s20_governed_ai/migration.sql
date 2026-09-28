-- Remediation S20: governed AI registry, policy gate, call audit, and provider runtime

-- CreateEnum
CREATE TYPE "AiAgentIdentityStatus" AS ENUM ('DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'ACTIVE', 'SUSPENDED', 'RETIRED');
CREATE TYPE "AiModelProviderStatus" AS ENUM ('DRAFT', 'APPROVED', 'ACTIVE', 'SUSPENDED', 'RETIRED');
CREATE TYPE "AiModelStatus" AS ENUM ('DRAFT', 'EVALUATION', 'APPROVED', 'ACTIVE', 'SUSPENDED', 'RETIRED');
CREATE TYPE "AiAgentDefinitionStatus" AS ENUM ('DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'ACTIVE', 'SUSPENDED', 'RETIRED');
CREATE TYPE "AiGovernedDataClass" AS ENUM ('UNCLASSIFIED', 'OFFICIAL', 'PROTECTED', 'RESTRICTED', 'HIGHLY_RESTRICTED', 'PROHIBITED_EXTERNAL');
CREATE TYPE "AiPolicyDecisionOutcome" AS ENUM ('ALLOW', 'DENY', 'INDETERMINATE');
CREATE TYPE "AiCallStatus" AS ENUM ('POLICY_DENIED', 'AUDIT_PENDING', 'PROVIDER_FAILED', 'COMPLETED', 'SAFE_HALTED', 'CANCELLED');
CREATE TYPE "AiCallUserDeliveryStatus" AS ENUM ('BLOCKED', 'PENDING_REVIEW', 'DELIVERED');
CREATE TYPE "AiHumanReviewOutcome" AS ENUM ('ACCEPTED', 'ACCEPTED_WITH_MODIFICATION', 'REJECTED', 'ESCALATED', 'DEFERRED', 'NO_ACTION_REQUIRED');
CREATE TYPE "AiSuspensionSubjectType" AS ENUM ('MODEL', 'MODEL_PROVIDER', 'AGENT', 'AGENT_IDENTITY');

ALTER TYPE "GovernmentAuditActorType" ADD VALUE IF NOT EXISTS 'AI_AGENT';

-- CreateTable
CREATE TABLE "ai_agent_identities" (
    "id" UUID NOT NULL,
    "agentCode" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "ownerInstitutionId" UUID NOT NULL,
    "responsibleOwnerIdentityId" UUID NOT NULL,
    "purpose" TEXT NOT NULL,
    "status" "AiAgentIdentityStatus" NOT NULL DEFAULT 'DRAFT',
    "approvedCapabilities" JSONB NOT NULL DEFAULT '[]',
    "effectiveFrom" TIMESTAMP(3),
    "effectiveUntil" TIMESTAMP(3),
    "configurationPolicyReference" TEXT,
    "versionLabel" TEXT NOT NULL DEFAULT '1.0.0',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ai_agent_identities_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ai_model_provider_registry" (
    "id" UUID NOT NULL,
    "providerCode" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "ownerInstitutionId" UUID,
    "status" "AiModelProviderStatus" NOT NULL DEFAULT 'DRAFT',
    "hostingSovereigntyReference" TEXT,
    "secretConfigurationKey" TEXT,
    "effectiveFrom" TIMESTAMP(3),
    "effectiveUntil" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ai_model_provider_registry_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ai_model_definitions" (
    "id" UUID NOT NULL,
    "modelCode" TEXT NOT NULL,
    "ownerInstitutionId" UUID NOT NULL,
    "providerRegistryId" UUID NOT NULL,
    "providerModelIdentifier" TEXT NOT NULL,
    "status" "AiModelStatus" NOT NULL DEFAULT 'DRAFT',
    "dataPolicyReference" TEXT,
    "allowedUseClasses" JSONB NOT NULL DEFAULT '[]',
    "effectiveFrom" TIMESTAMP(3),
    "effectiveUntil" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ai_model_definitions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ai_model_versions" (
    "id" UUID NOT NULL,
    "modelDefinitionId" UUID NOT NULL,
    "versionLabel" TEXT NOT NULL,
    "deploymentReference" TEXT,
    "configurationVersion" TEXT,
    "status" "AiModelStatus" NOT NULL DEFAULT 'DRAFT',
    "effectiveFrom" TIMESTAMP(3),
    "effectiveUntil" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ai_model_versions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ai_agent_definitions" (
    "id" UUID NOT NULL,
    "agentCode" TEXT NOT NULL,
    "ownerInstitutionId" UUID NOT NULL,
    "aiAgentIdentityId" UUID NOT NULL,
    "modelDefinitionId" UUID NOT NULL,
    "modelPolicyReference" TEXT,
    "purpose" TEXT NOT NULL,
    "status" "AiAgentDefinitionStatus" NOT NULL DEFAULT 'DRAFT',
    "allowedUserEnvironments" JSONB NOT NULL DEFAULT '[]',
    "humanOversightRequired" BOOLEAN NOT NULL DEFAULT true,
    "outputDispositionPolicy" TEXT,
    "versionLabel" TEXT NOT NULL DEFAULT '1.0.0',
    "effectiveFrom" TIMESTAMP(3),
    "effectiveUntil" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ai_agent_definitions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ai_agent_tool_allowlist" (
    "id" UUID NOT NULL,
    "agentDefinitionId" UUID NOT NULL,
    "toolCode" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_agent_tool_allowlist_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ai_agent_data_class_allowlist" (
    "id" UUID NOT NULL,
    "agentDefinitionId" UUID NOT NULL,
    "dataClass" "AiGovernedDataClass" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_agent_data_class_allowlist_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ai_governance_suspensions" (
    "id" UUID NOT NULL,
    "subjectType" "AiSuspensionSubjectType" NOT NULL,
    "subjectId" UUID NOT NULL,
    "reason" TEXT NOT NULL,
    "suspendedFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "suspendedUntil" TIMESTAMP(3),
    "liftedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_governance_suspensions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ai_policy_decision_records" (
    "id" UUID NOT NULL,
    "outcome" "AiPolicyDecisionOutcome" NOT NULL,
    "reasonCodes" JSONB NOT NULL DEFAULT '[]',
    "evaluatedFactors" JSONB NOT NULL DEFAULT '{}',
    "policyReference" TEXT,
    "evaluatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_policy_decision_records_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ai_call_records" (
    "id" UUID NOT NULL,
    "correlationId" TEXT NOT NULL,
    "institutionId" UUID NOT NULL,
    "aiAgentIdentityId" UUID NOT NULL,
    "agentDefinitionId" UUID NOT NULL,
    "modelDefinitionId" UUID NOT NULL,
    "modelVersionId" UUID NOT NULL,
    "providerRegistryId" UUID NOT NULL,
    "initiatorIdentityId" UUID NOT NULL,
    "purpose" TEXT NOT NULL,
    "dataClassification" "AiGovernedDataClass" NOT NULL,
    "policyDecisionId" UUID,
    "policyOutcome" "AiPolicyDecisionOutcome" NOT NULL,
    "policyReference" TEXT,
    "status" "AiCallStatus" NOT NULL DEFAULT 'AUDIT_PENDING',
    "userDeliveryStatus" "AiCallUserDeliveryStatus" NOT NULL DEFAULT 'BLOCKED',
    "governmentAuditLedgerEntryId" UUID,
    "isRecommendatoryOnly" BOOLEAN NOT NULL DEFAULT true,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ai_call_records_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ai_call_input_records" (
    "id" UUID NOT NULL,
    "callRecordId" UUID NOT NULL,
    "instructions" TEXT NOT NULL,
    "promptRetentionClass" TEXT,
    "promptStored" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_call_input_records_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ai_call_source_references" (
    "id" UUID NOT NULL,
    "callRecordId" UUID NOT NULL,
    "sourceType" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "sourceLabel" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_call_source_references_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ai_call_output_records" (
    "id" UUID NOT NULL,
    "callRecordId" UUID NOT NULL,
    "rawOutput" TEXT,
    "outputHash" TEXT NOT NULL,
    "outputDisposition" TEXT,
    "policyOutcome" "AiPolicyDecisionOutcome",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_call_output_records_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ai_call_output_edits" (
    "id" UUID NOT NULL,
    "outputRecordId" UUID NOT NULL,
    "editorIdentityId" UUID NOT NULL,
    "editedOutput" TEXT NOT NULL,
    "editReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_call_output_edits_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ai_call_review_records" (
    "id" UUID NOT NULL,
    "callRecordId" UUID NOT NULL,
    "reviewerIdentityId" UUID NOT NULL,
    "reviewOutcome" "AiHumanReviewOutcome" NOT NULL,
    "governmentRecordReference" TEXT,
    "reviewedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_call_review_records_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ai_agent_identities_agentCode_key" ON "ai_agent_identities"("agentCode");
CREATE INDEX "ai_agent_identities_ownerInstitutionId_status_idx" ON "ai_agent_identities"("ownerInstitutionId", "status");

CREATE UNIQUE INDEX "ai_model_provider_registry_providerCode_key" ON "ai_model_provider_registry"("providerCode");
CREATE INDEX "ai_model_provider_registry_status_idx" ON "ai_model_provider_registry"("status");

CREATE UNIQUE INDEX "ai_model_definitions_ownerInstitutionId_modelCode_key" ON "ai_model_definitions"("ownerInstitutionId", "modelCode");
CREATE INDEX "ai_model_definitions_providerRegistryId_status_idx" ON "ai_model_definitions"("providerRegistryId", "status");

CREATE UNIQUE INDEX "ai_model_versions_modelDefinitionId_versionLabel_key" ON "ai_model_versions"("modelDefinitionId", "versionLabel");

CREATE UNIQUE INDEX "ai_agent_definitions_ownerInstitutionId_agentCode_versionLabel_key" ON "ai_agent_definitions"("ownerInstitutionId", "agentCode", "versionLabel");
CREATE INDEX "ai_agent_definitions_aiAgentIdentityId_status_idx" ON "ai_agent_definitions"("aiAgentIdentityId", "status");

CREATE UNIQUE INDEX "ai_agent_tool_allowlist_agentDefinitionId_toolCode_key" ON "ai_agent_tool_allowlist"("agentDefinitionId", "toolCode");
CREATE UNIQUE INDEX "ai_agent_data_class_allowlist_agentDefinitionId_dataClass_key" ON "ai_agent_data_class_allowlist"("agentDefinitionId", "dataClass");

CREATE INDEX "ai_governance_suspensions_subjectType_subjectId_liftedAt_idx" ON "ai_governance_suspensions"("subjectType", "subjectId", "liftedAt");

CREATE INDEX "ai_call_records_institutionId_requestedAt_idx" ON "ai_call_records"("institutionId", "requestedAt");
CREATE INDEX "ai_call_records_correlationId_idx" ON "ai_call_records"("correlationId");
CREATE INDEX "ai_call_records_agentDefinitionId_status_idx" ON "ai_call_records"("agentDefinitionId", "status");

CREATE UNIQUE INDEX "ai_call_input_records_callRecordId_key" ON "ai_call_input_records"("callRecordId");
CREATE INDEX "ai_call_source_references_callRecordId_idx" ON "ai_call_source_references"("callRecordId");
CREATE UNIQUE INDEX "ai_call_output_records_callRecordId_key" ON "ai_call_output_records"("callRecordId");
CREATE INDEX "ai_call_output_edits_outputRecordId_idx" ON "ai_call_output_edits"("outputRecordId");
CREATE UNIQUE INDEX "ai_call_review_records_callRecordId_key" ON "ai_call_review_records"("callRecordId");

-- AddForeignKey
ALTER TABLE "ai_agent_identities" ADD CONSTRAINT "ai_agent_identities_ownerInstitutionId_fkey" FOREIGN KEY ("ownerInstitutionId") REFERENCES "institutions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ai_agent_identities" ADD CONSTRAINT "ai_agent_identities_responsibleOwnerIdentityId_fkey" FOREIGN KEY ("responsibleOwnerIdentityId") REFERENCES "identities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ai_model_provider_registry" ADD CONSTRAINT "ai_model_provider_registry_ownerInstitutionId_fkey" FOREIGN KEY ("ownerInstitutionId") REFERENCES "institutions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ai_model_definitions" ADD CONSTRAINT "ai_model_definitions_ownerInstitutionId_fkey" FOREIGN KEY ("ownerInstitutionId") REFERENCES "institutions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ai_model_definitions" ADD CONSTRAINT "ai_model_definitions_providerRegistryId_fkey" FOREIGN KEY ("providerRegistryId") REFERENCES "ai_model_provider_registry"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ai_model_versions" ADD CONSTRAINT "ai_model_versions_modelDefinitionId_fkey" FOREIGN KEY ("modelDefinitionId") REFERENCES "ai_model_definitions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ai_agent_definitions" ADD CONSTRAINT "ai_agent_definitions_ownerInstitutionId_fkey" FOREIGN KEY ("ownerInstitutionId") REFERENCES "institutions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ai_agent_definitions" ADD CONSTRAINT "ai_agent_definitions_aiAgentIdentityId_fkey" FOREIGN KEY ("aiAgentIdentityId") REFERENCES "ai_agent_identities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ai_agent_definitions" ADD CONSTRAINT "ai_agent_definitions_modelDefinitionId_fkey" FOREIGN KEY ("modelDefinitionId") REFERENCES "ai_model_definitions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ai_agent_tool_allowlist" ADD CONSTRAINT "ai_agent_tool_allowlist_agentDefinitionId_fkey" FOREIGN KEY ("agentDefinitionId") REFERENCES "ai_agent_definitions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ai_agent_data_class_allowlist" ADD CONSTRAINT "ai_agent_data_class_allowlist_agentDefinitionId_fkey" FOREIGN KEY ("agentDefinitionId") REFERENCES "ai_agent_definitions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ai_call_records" ADD CONSTRAINT "ai_call_records_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "institutions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ai_call_records" ADD CONSTRAINT "ai_call_records_aiAgentIdentityId_fkey" FOREIGN KEY ("aiAgentIdentityId") REFERENCES "ai_agent_identities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ai_call_records" ADD CONSTRAINT "ai_call_records_agentDefinitionId_fkey" FOREIGN KEY ("agentDefinitionId") REFERENCES "ai_agent_definitions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ai_call_records" ADD CONSTRAINT "ai_call_records_modelDefinitionId_fkey" FOREIGN KEY ("modelDefinitionId") REFERENCES "ai_model_definitions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ai_call_records" ADD CONSTRAINT "ai_call_records_modelVersionId_fkey" FOREIGN KEY ("modelVersionId") REFERENCES "ai_model_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ai_call_records" ADD CONSTRAINT "ai_call_records_initiatorIdentityId_fkey" FOREIGN KEY ("initiatorIdentityId") REFERENCES "identities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ai_call_records" ADD CONSTRAINT "ai_call_records_policyDecisionId_fkey" FOREIGN KEY ("policyDecisionId") REFERENCES "ai_policy_decision_records"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ai_call_input_records" ADD CONSTRAINT "ai_call_input_records_callRecordId_fkey" FOREIGN KEY ("callRecordId") REFERENCES "ai_call_records"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ai_call_source_references" ADD CONSTRAINT "ai_call_source_references_callRecordId_fkey" FOREIGN KEY ("callRecordId") REFERENCES "ai_call_records"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ai_call_output_records" ADD CONSTRAINT "ai_call_output_records_callRecordId_fkey" FOREIGN KEY ("callRecordId") REFERENCES "ai_call_records"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ai_call_output_edits" ADD CONSTRAINT "ai_call_output_edits_outputRecordId_fkey" FOREIGN KEY ("outputRecordId") REFERENCES "ai_call_output_records"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ai_call_output_edits" ADD CONSTRAINT "ai_call_output_edits_editorIdentityId_fkey" FOREIGN KEY ("editorIdentityId") REFERENCES "identities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ai_call_review_records" ADD CONSTRAINT "ai_call_review_records_callRecordId_fkey" FOREIGN KEY ("callRecordId") REFERENCES "ai_call_records"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ai_call_review_records" ADD CONSTRAINT "ai_call_review_records_reviewerIdentityId_fkey" FOREIGN KEY ("reviewerIdentityId") REFERENCES "identities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
