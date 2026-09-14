-- Phase 12D: Controlled AI, Model and Agent Governance

CREATE TYPE "AIRiskClass" AS ENUM (
  'LOW',
  'MODERATE',
  'HIGH',
  'CONSEQUENTIAL_ASSISTANCE',
  'PROHIBITED'
);

CREATE TYPE "AIModelDefinitionStatus" AS ENUM (
  'DRAFT',
  'REGISTERED',
  'APPROVED',
  'ACTIVE',
  'SUSPENDED',
  'RETIRED'
);

CREATE TYPE "AIModelVersionStatus" AS ENUM (
  'DRAFT',
  'APPROVED',
  'ACTIVE',
  'SUPERSEDED',
  'SUSPENDED',
  'RETIRED'
);

CREATE TYPE "AIDeploymentType" AS ENUM (
  'CLOUD_MANAGED',
  'SELF_HOSTED',
  'ON_PREMISE',
  'EDGE',
  'SAAS_API'
);

CREATE TYPE "AICapabilityDefinitionStatus" AS ENUM (
  'DRAFT',
  'REGISTERED',
  'APPROVED',
  'ACTIVE',
  'SUSPENDED',
  'RETIRED'
);

CREATE TYPE "AIUseCaseStatus" AS ENUM (
  'DRAFT',
  'PENDING_APPROVAL',
  'APPROVED',
  'ACTIVE',
  'SUSPENDED',
  'EXPIRED',
  'RETIRED'
);

CREATE TYPE "AIAgentDefinitionStatus" AS ENUM (
  'DRAFT',
  'REGISTERED',
  'APPROVED',
  'ACTIVE',
  'SUSPENDED',
  'EXPIRED',
  'RETIRED'
);

CREATE TYPE "AIAgentVersionStatus" AS ENUM (
  'DRAFT',
  'APPROVED',
  'ACTIVE',
  'SUPERSEDED',
  'SUSPENDED'
);

CREATE TYPE "AIEntitlementStatus" AS ENUM (
  'DRAFT',
  'APPROVED',
  'ACTIVE',
  'SUSPENDED',
  'REVOKED'
);

CREATE TYPE "AIOutputContractStatus" AS ENUM (
  'DRAFT',
  'APPROVED',
  'ACTIVE',
  'SUPERSEDED',
  'RETIRED'
);

CREATE TYPE "AIPromptPolicyType" AS ENUM (
  'SYSTEM',
  'INSTITUTION',
  'USE_CASE'
);

CREATE TYPE "AIPromptPolicyStatus" AS ENUM (
  'DRAFT',
  'APPROVED',
  'ACTIVE',
  'SUPERSEDED',
  'RETIRED'
);

CREATE TYPE "AIExecutionStatus" AS ENUM (
  'PREPARED',
  'EXECUTED',
  'BLOCKED',
  'FAILED'
);

CREATE TYPE "AIHumanDispositionType" AS ENUM (
  'ACCEPTED_FOR_ASSISTIVE_USE',
  'REVISED',
  'REJECTED',
  'ESCALATED',
  'UNSAFE',
  'OUTSIDE_SCOPE'
);

CREATE TYPE "AISuspensionScope" AS ENUM (
  'MODEL_DEFINITION',
  'MODEL_VERSION',
  'USE_CASE',
  'USE_CASE_VERSION',
  'AGENT_DEFINITION',
  'AGENT_VERSION',
  'CAPABILITY_DEFINITION'
);

CREATE TYPE "AISuspensionStatus" AS ENUM (
  'ACTIVE',
  'LIFTED',
  'SUPERSEDED'
);

CREATE TYPE "AIEvaluationStatus" AS ENUM (
  'PLANNED',
  'IN_PROGRESS',
  'COMPLETED',
  'FAILED'
);

CREATE TYPE "AIEvaluationTestCategory" AS ENUM (
  'HALLUCINATION',
  'UNSUPPORTED_AUTHORITY_CLAIM',
  'SOURCE_MISATTRIBUTION',
  'PROMPT_INJECTION',
  'DATA_POISONING',
  'RETRIEVAL_AUTHORIZATION_BYPASS',
  'PII_LEAKAGE',
  'CROSS_CASE_LEAKAGE',
  'TOOL_MISUSE',
  'BIAS_DISPARATE_IMPACT',
  'MODEL_DRIFT',
  'UNSAFE_RECOMMENDATION',
  'REFUSAL_BEHAVIOR',
  'SUSPENSION',
  'REPLAYABILITY'
);

CREATE TYPE "AIEvaluationTestOutcome" AS ENUM (
  'PASS',
  'FAIL',
  'INCONCLUSIVE',
  'NOT_RUN'
);

CREATE TYPE "AIIncidentSeverity" AS ENUM (
  'LOW',
  'MEDIUM',
  'HIGH',
  'CRITICAL'
);

CREATE TYPE "AIIncidentStatus" AS ENUM (
  'OPEN',
  'INVESTIGATING',
  'CONTAINED',
  'RESOLVED',
  'CLOSED'
);

CREATE TYPE "AIRevalidationStatus" AS ENUM (
  'SCHEDULED',
  'IN_PROGRESS',
  'PASSED',
  'FAILED',
  'OVERDUE'
);

CREATE TABLE "ai_model_definitions" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "institutionId" UUID NOT NULL,
  "technicalOwnerId" UUID NOT NULL,
  "code" TEXT NOT NULL,
  "provider" TEXT NOT NULL,
  "modelFamily" TEXT NOT NULL,
  "deploymentType" "AIDeploymentType" NOT NULL,
  "description" TEXT,
  "status" "AIModelDefinitionStatus" NOT NULL DEFAULT 'DRAFT',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ai_model_definitions_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ai_model_definitions_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "institutions"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "ai_model_definitions_technicalOwnerId_fkey" FOREIGN KEY ("technicalOwnerId") REFERENCES "identities"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "ai_model_definitions_institutionId_code_key" ON "ai_model_definitions"("institutionId", "code");
CREATE INDEX "ai_model_definitions_institutionId_idx" ON "ai_model_definitions"("institutionId");
CREATE INDEX "ai_model_definitions_technicalOwnerId_idx" ON "ai_model_definitions"("technicalOwnerId");
CREATE INDEX "ai_model_definitions_status_idx" ON "ai_model_definitions"("status");

CREATE TABLE "ai_model_versions" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "aiModelDefinitionId" UUID NOT NULL,
  "modelIdentifier" TEXT NOT NULL,
  "providerVersion" TEXT,
  "weightsReference" TEXT,
  "deploymentHash" TEXT,
  "deploymentConfig" JSONB NOT NULL DEFAULT '{}',
  "contextTokenLimit" INTEGER,
  "capabilities" JSONB NOT NULL DEFAULT '[]',
  "knownLimitations" JSONB NOT NULL DEFAULT '[]',
  "approvedEnvironment" TEXT NOT NULL,
  "effectiveFrom" TIMESTAMP(3),
  "effectiveUntil" TIMESTAMP(3),
  "status" "AIModelVersionStatus" NOT NULL DEFAULT 'DRAFT',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ai_model_versions_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ai_model_versions_aiModelDefinitionId_fkey" FOREIGN KEY ("aiModelDefinitionId") REFERENCES "ai_model_definitions"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "ai_model_versions_aiModelDefinitionId_modelIdentifier_providerVe_key" ON "ai_model_versions"("aiModelDefinitionId", "modelIdentifier", "providerVersion");
CREATE INDEX "ai_model_versions_aiModelDefinitionId_idx" ON "ai_model_versions"("aiModelDefinitionId");
CREATE INDEX "ai_model_versions_status_idx" ON "ai_model_versions"("status");
CREATE INDEX "ai_model_versions_effectiveFrom_idx" ON "ai_model_versions"("effectiveFrom");

CREATE TABLE "ai_capability_definitions" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "institutionId" UUID NOT NULL,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "capabilityTags" JSONB NOT NULL DEFAULT '[]',
  "status" "AICapabilityDefinitionStatus" NOT NULL DEFAULT 'DRAFT',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ai_capability_definitions_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ai_capability_definitions_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "institutions"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "ai_capability_definitions_institutionId_code_key" ON "ai_capability_definitions"("institutionId", "code");
CREATE INDEX "ai_capability_definitions_institutionId_idx" ON "ai_capability_definitions"("institutionId");
CREATE INDEX "ai_capability_definitions_status_idx" ON "ai_capability_definitions"("status");

CREATE TABLE "ai_output_contracts" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "contractCode" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "requiredDisclaimers" JSONB NOT NULL DEFAULT '[]',
  "prohibitedOutputTypes" JSONB NOT NULL DEFAULT '[]',
  "evidenceGateRequired" BOOLEAN NOT NULL DEFAULT true,
  "humanReviewRequired" BOOLEAN NOT NULL DEFAULT true,
  "status" "AIOutputContractStatus" NOT NULL DEFAULT 'DRAFT',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ai_output_contracts_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ai_output_contracts_contractCode_key" ON "ai_output_contracts"("contractCode");
CREATE INDEX "ai_output_contracts_status_idx" ON "ai_output_contracts"("status");

CREATE TABLE "ai_use_cases" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "institutionId" UUID NOT NULL,
  "code" TEXT NOT NULL,
  "purpose" TEXT NOT NULL,
  "humanReviewerIdentityId" UUID NOT NULL,
  "riskClass" "AIRiskClass" NOT NULL,
  "retentionPolicy" TEXT NOT NULL,
  "escalationPolicy" TEXT NOT NULL,
  "revalidationPolicy" TEXT NOT NULL,
  "allowsAutonomousFinalDecision" BOOLEAN NOT NULL DEFAULT false,
  "status" "AIUseCaseStatus" NOT NULL DEFAULT 'DRAFT',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ai_use_cases_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ai_use_cases_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "institutions"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "ai_use_cases_humanReviewerIdentityId_fkey" FOREIGN KEY ("humanReviewerIdentityId") REFERENCES "identities"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "ai_use_cases_institutionId_code_key" ON "ai_use_cases"("institutionId", "code");
CREATE INDEX "ai_use_cases_institutionId_idx" ON "ai_use_cases"("institutionId");
CREATE INDEX "ai_use_cases_humanReviewerIdentityId_idx" ON "ai_use_cases"("humanReviewerIdentityId");
CREATE INDEX "ai_use_cases_riskClass_idx" ON "ai_use_cases"("riskClass");
CREATE INDEX "ai_use_cases_status_idx" ON "ai_use_cases"("status");

CREATE TABLE "ai_use_case_versions" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "aiUseCaseId" UUID NOT NULL,
  "versionNumber" TEXT NOT NULL,
  "approvedUserReferences" JSONB NOT NULL DEFAULT '[]',
  "approvedModelIds" JSONB NOT NULL DEFAULT '[]',
  "approvedDataReferences" JSONB NOT NULL DEFAULT '[]',
  "approvedToolReferences" JSONB NOT NULL DEFAULT '[]',
  "prohibitedUses" JSONB NOT NULL DEFAULT '[]',
  "aiOutputContractId" UUID,
  "aiCapabilityDefinitionId" UUID,
  "approvedModelDefinitionId" UUID,
  "effectiveFrom" TIMESTAMP(3),
  "effectiveUntil" TIMESTAMP(3),
  "status" "AIUseCaseStatus" NOT NULL DEFAULT 'DRAFT',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ai_use_case_versions_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ai_use_case_versions_aiUseCaseId_fkey" FOREIGN KEY ("aiUseCaseId") REFERENCES "ai_use_cases"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "ai_use_case_versions_aiOutputContractId_fkey" FOREIGN KEY ("aiOutputContractId") REFERENCES "ai_output_contracts"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "ai_use_case_versions_aiCapabilityDefinitionId_fkey" FOREIGN KEY ("aiCapabilityDefinitionId") REFERENCES "ai_capability_definitions"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "ai_use_case_versions_approvedModelDefinitionId_fkey" FOREIGN KEY ("approvedModelDefinitionId") REFERENCES "ai_model_definitions"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "ai_use_case_versions_aiUseCaseId_versionNumber_key" ON "ai_use_case_versions"("aiUseCaseId", "versionNumber");
CREATE INDEX "ai_use_case_versions_aiUseCaseId_idx" ON "ai_use_case_versions"("aiUseCaseId");
CREATE INDEX "ai_use_case_versions_status_idx" ON "ai_use_case_versions"("status");
CREATE INDEX "ai_use_case_versions_effectiveFrom_idx" ON "ai_use_case_versions"("effectiveFrom");
CREATE INDEX "ai_use_case_versions_effectiveUntil_idx" ON "ai_use_case_versions"("effectiveUntil");

CREATE TABLE "ai_agent_definitions" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "institutionId" UUID NOT NULL,
  "aiUseCaseId" UUID NOT NULL,
  "ownerIdentityId" UUID NOT NULL,
  "reviewerIdentityId" UUID NOT NULL,
  "stableAgentKey" TEXT NOT NULL,
  "purpose" TEXT NOT NULL,
  "delegationChain" JSONB NOT NULL DEFAULT '[]',
  "permittedOperations" JSONB NOT NULL DEFAULT '[]',
  "restrictions" JSONB NOT NULL DEFAULT '[]',
  "expirationAt" TIMESTAMP(3),
  "suspensionState" TEXT NOT NULL DEFAULT 'NONE',
  "status" "AIAgentDefinitionStatus" NOT NULL DEFAULT 'DRAFT',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ai_agent_definitions_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ai_agent_definitions_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "institutions"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "ai_agent_definitions_aiUseCaseId_fkey" FOREIGN KEY ("aiUseCaseId") REFERENCES "ai_use_cases"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "ai_agent_definitions_ownerIdentityId_fkey" FOREIGN KEY ("ownerIdentityId") REFERENCES "identities"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "ai_agent_definitions_reviewerIdentityId_fkey" FOREIGN KEY ("reviewerIdentityId") REFERENCES "identities"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "ai_agent_definitions_institutionId_stableAgentKey_key" ON "ai_agent_definitions"("institutionId", "stableAgentKey");
CREATE INDEX "ai_agent_definitions_institutionId_idx" ON "ai_agent_definitions"("institutionId");
CREATE INDEX "ai_agent_definitions_aiUseCaseId_idx" ON "ai_agent_definitions"("aiUseCaseId");
CREATE INDEX "ai_agent_definitions_ownerIdentityId_idx" ON "ai_agent_definitions"("ownerIdentityId");
CREATE INDEX "ai_agent_definitions_status_idx" ON "ai_agent_definitions"("status");

CREATE TABLE "ai_agent_versions" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "aiAgentDefinitionId" UUID NOT NULL,
  "versionNumber" TEXT NOT NULL,
  "aiModelDefinitionId" UUID NOT NULL,
  "aiModelVersionId" UUID,
  "permittedToolRefs" JSONB NOT NULL DEFAULT '[]',
  "dataEntitlementIds" JSONB NOT NULL DEFAULT '[]',
  "toolEntitlementIds" JSONB NOT NULL DEFAULT '[]',
  "status" "AIAgentVersionStatus" NOT NULL DEFAULT 'DRAFT',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ai_agent_versions_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ai_agent_versions_aiAgentDefinitionId_fkey" FOREIGN KEY ("aiAgentDefinitionId") REFERENCES "ai_agent_definitions"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "ai_agent_versions_aiModelDefinitionId_fkey" FOREIGN KEY ("aiModelDefinitionId") REFERENCES "ai_model_definitions"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "ai_agent_versions_aiModelVersionId_fkey" FOREIGN KEY ("aiModelVersionId") REFERENCES "ai_model_versions"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "ai_agent_versions_aiAgentDefinitionId_versionNumber_key" ON "ai_agent_versions"("aiAgentDefinitionId", "versionNumber");
CREATE INDEX "ai_agent_versions_aiAgentDefinitionId_idx" ON "ai_agent_versions"("aiAgentDefinitionId");
CREATE INDEX "ai_agent_versions_aiModelDefinitionId_idx" ON "ai_agent_versions"("aiModelDefinitionId");
CREATE INDEX "ai_agent_versions_status_idx" ON "ai_agent_versions"("status");

CREATE TABLE "ai_data_entitlements" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "aiUseCaseVersionId" UUID NOT NULL,
  "datasetReference" TEXT NOT NULL,
  "recordCategory" TEXT,
  "accessScope" TEXT NOT NULL,
  "status" "AIEntitlementStatus" NOT NULL DEFAULT 'DRAFT',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ai_data_entitlements_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ai_data_entitlements_aiUseCaseVersionId_fkey" FOREIGN KEY ("aiUseCaseVersionId") REFERENCES "ai_use_case_versions"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "ai_data_entitlements_aiUseCaseVersionId_datasetReference_recordC_key" ON "ai_data_entitlements"("aiUseCaseVersionId", "datasetReference", "recordCategory");
CREATE INDEX "ai_data_entitlements_aiUseCaseVersionId_idx" ON "ai_data_entitlements"("aiUseCaseVersionId");
CREATE INDEX "ai_data_entitlements_status_idx" ON "ai_data_entitlements"("status");

CREATE TABLE "ai_tool_entitlements" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "aiUseCaseVersionId" UUID NOT NULL,
  "toolReference" TEXT NOT NULL,
  "permittedActions" JSONB NOT NULL DEFAULT '[]',
  "status" "AIEntitlementStatus" NOT NULL DEFAULT 'DRAFT',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ai_tool_entitlements_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ai_tool_entitlements_aiUseCaseVersionId_fkey" FOREIGN KEY ("aiUseCaseVersionId") REFERENCES "ai_use_case_versions"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "ai_tool_entitlements_aiUseCaseVersionId_toolReference_key" ON "ai_tool_entitlements"("aiUseCaseVersionId", "toolReference");
CREATE INDEX "ai_tool_entitlements_aiUseCaseVersionId_idx" ON "ai_tool_entitlements"("aiUseCaseVersionId");
CREATE INDEX "ai_tool_entitlements_status_idx" ON "ai_tool_entitlements"("status");

CREATE TABLE "ai_prompt_policies" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "aiUseCaseVersionId" UUID NOT NULL,
  "policyType" "AIPromptPolicyType" NOT NULL,
  "versionLabel" TEXT NOT NULL,
  "policyContentHash" TEXT NOT NULL,
  "policyReference" TEXT NOT NULL,
  "treatsDocumentsAsUntrustedContent" BOOLEAN NOT NULL DEFAULT true,
  "status" "AIPromptPolicyStatus" NOT NULL DEFAULT 'DRAFT',
  "effectiveFrom" TIMESTAMP(3),
  "effectiveUntil" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ai_prompt_policies_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ai_prompt_policies_aiUseCaseVersionId_fkey" FOREIGN KEY ("aiUseCaseVersionId") REFERENCES "ai_use_case_versions"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "ai_prompt_policies_aiUseCaseVersionId_policyType_versionLabel_key" ON "ai_prompt_policies"("aiUseCaseVersionId", "policyType", "versionLabel");
CREATE INDEX "ai_prompt_policies_aiUseCaseVersionId_idx" ON "ai_prompt_policies"("aiUseCaseVersionId");
CREATE INDEX "ai_prompt_policies_status_idx" ON "ai_prompt_policies"("status");

CREATE TABLE "ai_execution_records" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "aiUseCaseVersionId" UUID NOT NULL,
  "aiModelVersionId" UUID NOT NULL,
  "aiAgentVersionId" UUID,
  "aiOutputContractId" UUID,
  "aiPromptPolicyId" UUID,
  "actorIdentityId" UUID NOT NULL,
  "humanReviewerIdentityId" UUID,
  "purpose" TEXT NOT NULL,
  "promptPolicyVersion" TEXT,
  "inputSourceReferences" JSONB NOT NULL DEFAULT '[]',
  "toolsCalled" JSONB NOT NULL DEFAULT '[]',
  "retrievedRecordReferences" JSONB NOT NULL DEFAULT '[]',
  "outputSummary" TEXT NOT NULL,
  "outputReference" TEXT,
  "confidenceScore" DOUBLE PRECISION,
  "limitations" JSONB NOT NULL DEFAULT '[]',
  "humanChangesSummary" TEXT,
  "decisionAffectedReference" TEXT,
  "status" "AIExecutionStatus" NOT NULL DEFAULT 'PREPARED',
  "executedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ai_execution_records_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ai_execution_records_aiUseCaseVersionId_fkey" FOREIGN KEY ("aiUseCaseVersionId") REFERENCES "ai_use_case_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "ai_execution_records_aiModelVersionId_fkey" FOREIGN KEY ("aiModelVersionId") REFERENCES "ai_model_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "ai_execution_records_aiAgentVersionId_fkey" FOREIGN KEY ("aiAgentVersionId") REFERENCES "ai_agent_versions"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "ai_execution_records_aiOutputContractId_fkey" FOREIGN KEY ("aiOutputContractId") REFERENCES "ai_output_contracts"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "ai_execution_records_aiPromptPolicyId_fkey" FOREIGN KEY ("aiPromptPolicyId") REFERENCES "ai_prompt_policies"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "ai_execution_records_actorIdentityId_fkey" FOREIGN KEY ("actorIdentityId") REFERENCES "identities"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "ai_execution_records_humanReviewerIdentityId_fkey" FOREIGN KEY ("humanReviewerIdentityId") REFERENCES "identities"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX "ai_execution_records_aiUseCaseVersionId_idx" ON "ai_execution_records"("aiUseCaseVersionId");
CREATE INDEX "ai_execution_records_aiModelVersionId_idx" ON "ai_execution_records"("aiModelVersionId");
CREATE INDEX "ai_execution_records_aiAgentVersionId_idx" ON "ai_execution_records"("aiAgentVersionId");
CREATE INDEX "ai_execution_records_actorIdentityId_idx" ON "ai_execution_records"("actorIdentityId");
CREATE INDEX "ai_execution_records_executedAt_idx" ON "ai_execution_records"("executedAt");
CREATE INDEX "ai_execution_records_status_idx" ON "ai_execution_records"("status");

CREATE TABLE "ai_human_dispositions" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "aiExecutionRecordId" UUID NOT NULL,
  "recorderIdentityId" UUID NOT NULL,
  "disposition" "AIHumanDispositionType" NOT NULL,
  "notes" TEXT,
  "revisedOutputReference" TEXT,
  "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ai_human_dispositions_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ai_human_dispositions_aiExecutionRecordId_fkey" FOREIGN KEY ("aiExecutionRecordId") REFERENCES "ai_execution_records"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "ai_human_dispositions_recorderIdentityId_fkey" FOREIGN KEY ("recorderIdentityId") REFERENCES "identities"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX "ai_human_dispositions_aiExecutionRecordId_idx" ON "ai_human_dispositions"("aiExecutionRecordId");
CREATE INDEX "ai_human_dispositions_recorderIdentityId_idx" ON "ai_human_dispositions"("recorderIdentityId");
CREATE INDEX "ai_human_dispositions_disposition_idx" ON "ai_human_dispositions"("disposition");

CREATE TABLE "ai_suspension_records" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "scope" "AISuspensionScope" NOT NULL,
  "status" "AISuspensionStatus" NOT NULL DEFAULT 'ACTIVE',
  "reason" TEXT NOT NULL,
  "aiModelDefinitionId" UUID,
  "aiModelVersionId" UUID,
  "aiUseCaseId" UUID,
  "aiUseCaseVersionId" UUID,
  "aiAgentDefinitionId" UUID,
  "aiAgentVersionId" UUID,
  "aiCapabilityDefinitionId" UUID,
  "issuedByIdentityId" UUID NOT NULL,
  "liftedByIdentityId" UUID,
  "effectiveFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "effectiveUntil" TIMESTAMP(3),
  "liftedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ai_suspension_records_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ai_suspension_records_aiModelDefinitionId_fkey" FOREIGN KEY ("aiModelDefinitionId") REFERENCES "ai_model_definitions"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "ai_suspension_records_aiModelVersionId_fkey" FOREIGN KEY ("aiModelVersionId") REFERENCES "ai_model_versions"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "ai_suspension_records_aiUseCaseId_fkey" FOREIGN KEY ("aiUseCaseId") REFERENCES "ai_use_cases"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "ai_suspension_records_aiUseCaseVersionId_fkey" FOREIGN KEY ("aiUseCaseVersionId") REFERENCES "ai_use_case_versions"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "ai_suspension_records_aiAgentDefinitionId_fkey" FOREIGN KEY ("aiAgentDefinitionId") REFERENCES "ai_agent_definitions"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "ai_suspension_records_aiAgentVersionId_fkey" FOREIGN KEY ("aiAgentVersionId") REFERENCES "ai_agent_versions"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "ai_suspension_records_aiCapabilityDefinitionId_fkey" FOREIGN KEY ("aiCapabilityDefinitionId") REFERENCES "ai_capability_definitions"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "ai_suspension_records_issuedByIdentityId_fkey" FOREIGN KEY ("issuedByIdentityId") REFERENCES "identities"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "ai_suspension_records_liftedByIdentityId_fkey" FOREIGN KEY ("liftedByIdentityId") REFERENCES "identities"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX "ai_suspension_records_scope_status_idx" ON "ai_suspension_records"("scope", "status");
CREATE INDEX "ai_suspension_records_aiModelDefinitionId_idx" ON "ai_suspension_records"("aiModelDefinitionId");
CREATE INDEX "ai_suspension_records_aiUseCaseId_idx" ON "ai_suspension_records"("aiUseCaseId");
CREATE INDEX "ai_suspension_records_aiAgentDefinitionId_idx" ON "ai_suspension_records"("aiAgentDefinitionId");
CREATE INDEX "ai_suspension_records_effectiveFrom_idx" ON "ai_suspension_records"("effectiveFrom");

CREATE TABLE "ai_revalidation_records" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "aiUseCaseId" UUID NOT NULL,
  "scheduledFor" TIMESTAMP(3) NOT NULL,
  "completedAt" TIMESTAMP(3),
  "status" "AIRevalidationStatus" NOT NULL DEFAULT 'SCHEDULED',
  "outcomeSummary" TEXT,
  "recorderIdentityId" UUID,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ai_revalidation_records_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ai_revalidation_records_aiUseCaseId_fkey" FOREIGN KEY ("aiUseCaseId") REFERENCES "ai_use_cases"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "ai_revalidation_records_recorderIdentityId_fkey" FOREIGN KEY ("recorderIdentityId") REFERENCES "identities"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX "ai_revalidation_records_aiUseCaseId_idx" ON "ai_revalidation_records"("aiUseCaseId");
CREATE INDEX "ai_revalidation_records_status_idx" ON "ai_revalidation_records"("status");
CREATE INDEX "ai_revalidation_records_scheduledFor_idx" ON "ai_revalidation_records"("scheduledFor");

CREATE TABLE "ai_evaluations" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "evaluationCode" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "targetDescription" TEXT NOT NULL,
  "status" "AIEvaluationStatus" NOT NULL DEFAULT 'PLANNED',
  "conductorIdentityId" UUID,
  "startedAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ai_evaluations_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ai_evaluations_conductorIdentityId_fkey" FOREIGN KEY ("conductorIdentityId") REFERENCES "identities"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "ai_evaluations_evaluationCode_key" ON "ai_evaluations"("evaluationCode");
CREATE INDEX "ai_evaluations_status_idx" ON "ai_evaluations"("status");

CREATE TABLE "ai_evaluation_tests" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "aiEvaluationId" UUID NOT NULL,
  "category" "AIEvaluationTestCategory" NOT NULL,
  "testName" TEXT NOT NULL,
  "testDescription" TEXT,
  "outcome" "AIEvaluationTestOutcome" NOT NULL DEFAULT 'NOT_RUN',
  "evidenceReference" TEXT,
  "executedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ai_evaluation_tests_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ai_evaluation_tests_aiEvaluationId_fkey" FOREIGN KEY ("aiEvaluationId") REFERENCES "ai_evaluations"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "ai_evaluation_tests_aiEvaluationId_category_testName_key" ON "ai_evaluation_tests"("aiEvaluationId", "category", "testName");
CREATE INDEX "ai_evaluation_tests_aiEvaluationId_idx" ON "ai_evaluation_tests"("aiEvaluationId");
CREATE INDEX "ai_evaluation_tests_category_idx" ON "ai_evaluation_tests"("category");
CREATE INDEX "ai_evaluation_tests_outcome_idx" ON "ai_evaluation_tests"("outcome");

CREATE TABLE "ai_incidents" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "aiExecutionRecordId" UUID,
  "reporterIdentityId" UUID NOT NULL,
  "severity" "AIIncidentSeverity" NOT NULL,
  "status" "AIIncidentStatus" NOT NULL DEFAULT 'OPEN',
  "summary" TEXT NOT NULL,
  "details" TEXT,
  "detectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "containedAt" TIMESTAMP(3),
  "resolvedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ai_incidents_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ai_incidents_aiExecutionRecordId_fkey" FOREIGN KEY ("aiExecutionRecordId") REFERENCES "ai_execution_records"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "ai_incidents_reporterIdentityId_fkey" FOREIGN KEY ("reporterIdentityId") REFERENCES "identities"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX "ai_incidents_aiExecutionRecordId_idx" ON "ai_incidents"("aiExecutionRecordId");
CREATE INDEX "ai_incidents_reporterIdentityId_idx" ON "ai_incidents"("reporterIdentityId");
CREATE INDEX "ai_incidents_severity_idx" ON "ai_incidents"("severity");
CREATE INDEX "ai_incidents_status_idx" ON "ai_incidents"("status");
