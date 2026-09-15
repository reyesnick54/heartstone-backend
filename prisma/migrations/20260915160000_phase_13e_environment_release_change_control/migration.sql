-- CreateEnum
CREATE TYPE "public"."PlatformEnvironmentClassification" AS ENUM ('LOCAL', 'DEVELOPMENT', 'TEST', 'INTEGRATION', 'SANDBOX', 'STAGING', 'PILOT', 'PRODUCTION', 'DISASTER_RECOVERY');

-- CreateEnum
CREATE TYPE "public"."EnvironmentDefinitionStatus" AS ENUM ('DRAFT', 'ACTIVE', 'SUSPENDED', 'RETIRED');

-- CreateEnum
CREATE TYPE "public"."ReleaseDefinitionStatus" AS ENUM ('DRAFT', 'BUILDING', 'AWAITING_APPROVAL', 'APPROVED', 'RELEASED', 'SUPERSEDED', 'REJECTED');

-- CreateEnum
CREATE TYPE "public"."ReleaseArtifactStatus" AS ENUM ('PENDING', 'BUILT', 'ACCEPTED', 'REJECTED', 'SUPERSEDED');

-- CreateEnum
CREATE TYPE "public"."ReleaseApprovalStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "public"."DeploymentRecordStatus" AS ENUM ('PLANNED', 'IN_PROGRESS', 'COMPLETED', 'FAILED', 'VERIFIED', 'ROLLED_BACK');

-- CreateEnum
CREATE TYPE "public"."DeploymentVerificationStatus" AS ENUM ('PENDING', 'PASSED', 'FAILED');

-- CreateEnum
CREATE TYPE "public"."RollbackPlanStatus" AS ENUM ('DRAFT', 'APPROVED', 'EXECUTED', 'SUPERSEDED');

-- CreateEnum
CREATE TYPE "public"."RollbackExecutionStatus" AS ENUM ('PLANNED', 'IN_PROGRESS', 'COMPLETED', 'FAILED', 'ABORTED');

-- CreateEnum
CREATE TYPE "public"."ChangeRequestStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'IMPLEMENTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "public"."ChangeAssessmentOutcome" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'CONDITIONAL');

-- CreateEnum
CREATE TYPE "public"."EmergencyChangeStatus" AS ENUM ('DRAFT', 'ACTIVE', 'IMPLEMENTED', 'EXPIRED', 'RETROSPECTIVE_ACCEPTED', 'RETROSPECTIVE_REJECTED');

-- CreateEnum
CREATE TYPE "public"."ConfigurationItemStatus" AS ENUM ('DRAFT', 'ACTIVE', 'DEPRECATED', 'RETIRED');

-- CreateEnum
CREATE TYPE "public"."ConfigurationChangeStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED', 'APPLIED', 'ROLLED_BACK');

-- CreateEnum
CREATE TYPE "public"."FeatureActivationStatus" AS ENUM ('DEPLOYED_ONLY', 'TECHNICALLY_ENABLED', 'INSTITUTIONALLY_ACTIVATED', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "public"."ReleaseRevalidationTriggerType" AS ENUM ('MATERIAL_CONFIGURATION_CHANGE', 'INTEGRATION_ENDPOINT_CHANGE', 'AI_MODEL_UPDATE', 'SCHEMA_MIGRATION', 'SECURITY_ASSESSMENT_CHANGE', 'AUTHORITY_POLICY_CHANGE', 'MATERIAL_FEATURE_CHANGE');

-- CreateEnum
CREATE TYPE "public"."CiPipelineRunStatus" AS ENUM ('PENDING', 'RUNNING', 'PASSED', 'FAILED');

-- CreateEnum
CREATE TYPE "public"."DataTransferApprovalStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "public"."EnvironmentIntegrationMode" AS ENUM ('MOCK', 'SANDBOX', 'STAGING', 'LIVE');

-- CreateTable
CREATE TABLE "public"."environment_definitions" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "classification" "public"."PlatformEnvironmentClassification" NOT NULL,
    "status" "public"."EnvironmentDefinitionStatus" NOT NULL DEFAULT 'DRAFT',
    "credentialsNamespace" TEXT NOT NULL,
    "secretsNamespace" TEXT NOT NULL,
    "dataPartitionKey" TEXT NOT NULL,
    "integrationEndpointPrefix" TEXT NOT NULL,
    "integrationMode" "public"."EnvironmentIntegrationMode" NOT NULL DEFAULT 'MOCK',
    "accessControlPolicy" JSONB NOT NULL DEFAULT '{}',
    "allowsProductionSemantics" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "environment_definitions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."environment_configuration_baselines" (
    "id" UUID NOT NULL,
    "environmentDefinitionId" UUID NOT NULL,
    "version" TEXT NOT NULL,
    "configurationDigest" TEXT NOT NULL,
    "baselineContent" JSONB NOT NULL DEFAULT '{}',
    "effectiveFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "effectiveUntil" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "environment_configuration_baselines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."environment_credential_bindings" (
    "id" UUID NOT NULL,
    "environmentDefinitionId" UUID NOT NULL,
    "credentialReference" TEXT NOT NULL,
    "credentialNamespace" TEXT NOT NULL,
    "isProductionCredential" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "environment_credential_bindings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."environment_integration_endpoints" (
    "id" UUID NOT NULL,
    "environmentDefinitionId" UUID NOT NULL,
    "endpointKey" TEXT NOT NULL,
    "endpointUrl" TEXT NOT NULL,
    "integrationMode" "public"."EnvironmentIntegrationMode" NOT NULL DEFAULT 'MOCK',
    "isLiveGovernmentEndpoint" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "environment_integration_endpoints_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."release_definitions" (
    "id" UUID NOT NULL,
    "version" TEXT NOT NULL,
    "sourceCommitSha" TEXT NOT NULL,
    "buildIdentifier" TEXT NOT NULL,
    "status" "public"."ReleaseDefinitionStatus" NOT NULL DEFAULT 'DRAFT',
    "schemaMigrationSet" JSONB NOT NULL DEFAULT '[]',
    "featureManifest" JSONB NOT NULL DEFAULT '[]',
    "knownDefects" JSONB NOT NULL DEFAULT '[]',
    "securityAssessmentRef" TEXT,
    "testEvidenceRef" TEXT,
    "releaseNotes" TEXT,
    "configurationBaselineId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "release_definitions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."release_artifacts" (
    "id" UUID NOT NULL,
    "releaseDefinitionId" UUID NOT NULL,
    "artifactDigest" TEXT NOT NULL,
    "sbomDigest" TEXT NOT NULL,
    "provenanceRef" TEXT,
    "status" "public"."ReleaseArtifactStatus" NOT NULL DEFAULT 'PENDING',
    "acceptedAt" TIMESTAMP(3),
    "immutable" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "release_artifacts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."release_approvals" (
    "id" UUID NOT NULL,
    "releaseArtifactId" UUID NOT NULL,
    "approverIdentityId" UUID NOT NULL,
    "status" "public"."ReleaseApprovalStatus" NOT NULL DEFAULT 'PENDING',
    "artifactDigestAtApproval" TEXT NOT NULL,
    "approvedAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "release_approvals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."change_requests" (
    "id" UUID NOT NULL,
    "changeNumber" TEXT NOT NULL,
    "scope" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "requesterIdentityId" UUID NOT NULL,
    "affectedCapabilities" JSONB NOT NULL DEFAULT '[]',
    "authorityImpact" JSONB NOT NULL DEFAULT '{}',
    "securityImpact" JSONB NOT NULL DEFAULT '{}',
    "privacyImpact" JSONB NOT NULL DEFAULT '{}',
    "recordsImpact" JSONB NOT NULL DEFAULT '{}',
    "integrationImpact" JSONB NOT NULL DEFAULT '{}',
    "aiImpact" JSONB NOT NULL DEFAULT '{}',
    "continuityImpact" JSONB NOT NULL DEFAULT '{}',
    "migrationImpact" JSONB NOT NULL DEFAULT '{}',
    "testRequirements" JSONB NOT NULL DEFAULT '[]',
    "rollbackPlanRef" TEXT,
    "reviewers" JSONB NOT NULL DEFAULT '[]',
    "status" "public"."ChangeRequestStatus" NOT NULL DEFAULT 'DRAFT',
    "changeWindowStart" TIMESTAMP(3),
    "changeWindowEnd" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "change_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."deployment_records" (
    "id" UUID NOT NULL,
    "environmentDefinitionId" UUID NOT NULL,
    "releaseArtifactId" UUID NOT NULL,
    "changeRequestId" UUID,
    "deployedByIdentityId" UUID NOT NULL,
    "status" "public"."DeploymentRecordStatus" NOT NULL DEFAULT 'PLANNED',
    "deployedAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "deployment_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."deployment_verifications" (
    "id" UUID NOT NULL,
    "deploymentRecordId" UUID NOT NULL,
    "verificationType" TEXT NOT NULL,
    "status" "public"."DeploymentVerificationStatus" NOT NULL DEFAULT 'PENDING',
    "evidence" JSONB NOT NULL DEFAULT '{}',
    "verifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "deployment_verifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."rollback_plans" (
    "id" UUID NOT NULL,
    "releaseDefinitionId" UUID NOT NULL,
    "targetArtifactDigest" TEXT NOT NULL,
    "databaseStrategy" JSONB NOT NULL DEFAULT '{}',
    "externalTransactionStrategy" JSONB NOT NULL DEFAULT '{}',
    "preservesOfficialRecords" BOOLEAN NOT NULL DEFAULT true,
    "status" "public"."RollbackPlanStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rollback_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."rollback_executions" (
    "id" UUID NOT NULL,
    "rollbackPlanId" UUID NOT NULL,
    "deploymentRecordId" UUID NOT NULL,
    "initiatedByIdentityId" UUID NOT NULL,
    "status" "public"."RollbackExecutionStatus" NOT NULL DEFAULT 'PLANNED',
    "preservesOfficialRecords" BOOLEAN NOT NULL DEFAULT true,
    "executedAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rollback_executions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."change_assessments" (
    "id" UUID NOT NULL,
    "changeRequestId" UUID NOT NULL,
    "assessorIdentityId" UUID NOT NULL,
    "outcome" "public"."ChangeAssessmentOutcome" NOT NULL DEFAULT 'PENDING',
    "findings" JSONB NOT NULL DEFAULT '{}',
    "requiresRevalidation" BOOLEAN NOT NULL DEFAULT false,
    "assessedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "change_assessments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."emergency_changes" (
    "id" UUID NOT NULL,
    "incidentRef" TEXT NOT NULL,
    "necessity" TEXT NOT NULL,
    "scope" TEXT NOT NULL,
    "authorizedActorIdentityId" UUID NOT NULL,
    "isTemporary" BOOLEAN NOT NULL DEFAULT true,
    "riskAssessment" JSONB NOT NULL DEFAULT '{}',
    "rollbackPlanId" UUID,
    "retrospectiveDeadline" TIMESTAMP(3) NOT NULL,
    "status" "public"."EmergencyChangeStatus" NOT NULL DEFAULT 'DRAFT',
    "cannotAlterInstitutionalAuthority" BOOLEAN NOT NULL DEFAULT true,
    "postChangeReviewNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "emergency_changes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."configuration_items" (
    "id" UUID NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "currentVersion" TEXT NOT NULL,
    "status" "public"."ConfigurationItemStatus" NOT NULL DEFAULT 'DRAFT',
    "environmentScope" TEXT,
    "isMaterial" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "configuration_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."configuration_changes" (
    "id" UUID NOT NULL,
    "configurationItemId" UUID NOT NULL,
    "fromVersion" TEXT NOT NULL,
    "toVersion" TEXT NOT NULL,
    "changeDigest" TEXT NOT NULL,
    "status" "public"."ConfigurationChangeStatus" NOT NULL DEFAULT 'DRAFT',
    "requesterIdentityId" UUID NOT NULL,
    "triggersRevalidation" BOOLEAN NOT NULL DEFAULT false,
    "appliedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "configuration_changes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."feature_activations" (
    "id" UUID NOT NULL,
    "featureKey" TEXT NOT NULL,
    "environmentDefinitionId" UUID NOT NULL,
    "governmentServiceId" UUID,
    "status" "public"."FeatureActivationStatus" NOT NULL DEFAULT 'DEPLOYED_ONLY',
    "technicallyEnabledAt" TIMESTAMP(3),
    "institutionallyActivatedAt" TIMESTAMP(3),
    "activatedByIdentityId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "feature_activations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."release_revalidation_triggers" (
    "id" UUID NOT NULL,
    "triggerType" "public"."ReleaseRevalidationTriggerType" NOT NULL,
    "sourceRecordType" TEXT NOT NULL,
    "sourceRecordId" UUID NOT NULL,
    "releaseDefinitionId" UUID,
    "reason" TEXT NOT NULL,
    "revalidationRequired" BOOLEAN NOT NULL DEFAULT true,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "release_revalidation_triggers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ci_pipeline_runs" (
    "id" UUID NOT NULL,
    "pipelineIdentifier" TEXT NOT NULL,
    "sourceCommitSha" TEXT NOT NULL,
    "lockfileDigest" TEXT NOT NULL,
    "artifactDigest" TEXT,
    "status" "public"."CiPipelineRunStatus" NOT NULL DEFAULT 'PENDING',
    "checksPassed" JSONB NOT NULL DEFAULT '{}',
    "provenanceRef" TEXT,
    "authorizesProduction" BOOLEAN NOT NULL DEFAULT false,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ci_pipeline_runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."data_transfer_approvals" (
    "id" UUID NOT NULL,
    "sourceEnvironmentId" UUID NOT NULL,
    "targetEnvironmentId" UUID NOT NULL,
    "deidentificationProcessRef" TEXT NOT NULL,
    "status" "public"."DataTransferApprovalStatus" NOT NULL DEFAULT 'PENDING',
    "approvedByIdentityId" UUID,
    "approvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "data_transfer_approvals_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "environment_definitions_code_key" ON "public"."environment_definitions"("code");

-- CreateIndex
CREATE INDEX "environment_definitions_classification_idx" ON "public"."environment_definitions"("classification");

-- CreateIndex
CREATE INDEX "environment_definitions_status_idx" ON "public"."environment_definitions"("status");

-- CreateIndex
CREATE UNIQUE INDEX "environment_configuration_baselines_environmentDefinitionId_v_key" ON "public"."environment_configuration_baselines"("environmentDefinitionId", "version");

-- CreateIndex
CREATE INDEX "environment_configuration_baselines_environmentDefinitionId_idx" ON "public"."environment_configuration_baselines"("environmentDefinitionId");

-- CreateIndex
CREATE UNIQUE INDEX "environment_credential_bindings_environmentDefinitionId_crede_key" ON "public"."environment_credential_bindings"("environmentDefinitionId", "credentialReference");

-- CreateIndex
CREATE INDEX "environment_credential_bindings_environmentDefinitionId_idx" ON "public"."environment_credential_bindings"("environmentDefinitionId");

-- CreateIndex
CREATE UNIQUE INDEX "environment_integration_endpoints_environmentDefinitionId_end_key" ON "public"."environment_integration_endpoints"("environmentDefinitionId", "endpointKey");

-- CreateIndex
CREATE INDEX "environment_integration_endpoints_environmentDefinitionId_idx" ON "public"."environment_integration_endpoints"("environmentDefinitionId");

-- CreateIndex
CREATE UNIQUE INDEX "release_definitions_version_key" ON "public"."release_definitions"("version");

-- CreateIndex
CREATE INDEX "release_definitions_status_idx" ON "public"."release_definitions"("status");

-- CreateIndex
CREATE INDEX "release_definitions_configurationBaselineId_idx" ON "public"."release_definitions"("configurationBaselineId");

-- CreateIndex
CREATE UNIQUE INDEX "release_artifacts_artifactDigest_key" ON "public"."release_artifacts"("artifactDigest");

-- CreateIndex
CREATE INDEX "release_artifacts_releaseDefinitionId_idx" ON "public"."release_artifacts"("releaseDefinitionId");

-- CreateIndex
CREATE INDEX "release_artifacts_status_idx" ON "public"."release_artifacts"("status");

-- CreateIndex
CREATE INDEX "release_approvals_releaseArtifactId_idx" ON "public"."release_approvals"("releaseArtifactId");

-- CreateIndex
CREATE INDEX "release_approvals_approverIdentityId_idx" ON "public"."release_approvals"("approverIdentityId");

-- CreateIndex
CREATE INDEX "release_approvals_status_idx" ON "public"."release_approvals"("status");

-- CreateIndex
CREATE UNIQUE INDEX "change_requests_changeNumber_key" ON "public"."change_requests"("changeNumber");

-- CreateIndex
CREATE INDEX "change_requests_requesterIdentityId_idx" ON "public"."change_requests"("requesterIdentityId");

-- CreateIndex
CREATE INDEX "change_requests_status_idx" ON "public"."change_requests"("status");

-- CreateIndex
CREATE INDEX "deployment_records_environmentDefinitionId_idx" ON "public"."deployment_records"("environmentDefinitionId");

-- CreateIndex
CREATE INDEX "deployment_records_releaseArtifactId_idx" ON "public"."deployment_records"("releaseArtifactId");

-- CreateIndex
CREATE INDEX "deployment_records_changeRequestId_idx" ON "public"."deployment_records"("changeRequestId");

-- CreateIndex
CREATE INDEX "deployment_records_status_idx" ON "public"."deployment_records"("status");

-- CreateIndex
CREATE INDEX "deployment_verifications_deploymentRecordId_idx" ON "public"."deployment_verifications"("deploymentRecordId");

-- CreateIndex
CREATE INDEX "deployment_verifications_status_idx" ON "public"."deployment_verifications"("status");

-- CreateIndex
CREATE INDEX "rollback_plans_releaseDefinitionId_idx" ON "public"."rollback_plans"("releaseDefinitionId");

-- CreateIndex
CREATE INDEX "rollback_plans_status_idx" ON "public"."rollback_plans"("status");

-- CreateIndex
CREATE INDEX "rollback_executions_rollbackPlanId_idx" ON "public"."rollback_executions"("rollbackPlanId");

-- CreateIndex
CREATE INDEX "rollback_executions_deploymentRecordId_idx" ON "public"."rollback_executions"("deploymentRecordId");

-- CreateIndex
CREATE INDEX "rollback_executions_status_idx" ON "public"."rollback_executions"("status");

-- CreateIndex
CREATE INDEX "change_assessments_changeRequestId_idx" ON "public"."change_assessments"("changeRequestId");

-- CreateIndex
CREATE INDEX "change_assessments_assessorIdentityId_idx" ON "public"."change_assessments"("assessorIdentityId");

-- CreateIndex
CREATE INDEX "emergency_changes_authorizedActorIdentityId_idx" ON "public"."emergency_changes"("authorizedActorIdentityId");

-- CreateIndex
CREATE INDEX "emergency_changes_status_idx" ON "public"."emergency_changes"("status");

-- CreateIndex
CREATE INDEX "emergency_changes_rollbackPlanId_idx" ON "public"."emergency_changes"("rollbackPlanId");

-- CreateIndex
CREATE UNIQUE INDEX "configuration_items_key_key" ON "public"."configuration_items"("key");

-- CreateIndex
CREATE INDEX "configuration_items_status_idx" ON "public"."configuration_items"("status");

-- CreateIndex
CREATE INDEX "configuration_changes_configurationItemId_idx" ON "public"."configuration_changes"("configurationItemId");

-- CreateIndex
CREATE INDEX "configuration_changes_requesterIdentityId_idx" ON "public"."configuration_changes"("requesterIdentityId");

-- CreateIndex
CREATE INDEX "configuration_changes_status_idx" ON "public"."configuration_changes"("status");

-- CreateIndex
CREATE UNIQUE INDEX "feature_activations_featureKey_environmentDefinitionId_key" ON "public"."feature_activations"("featureKey", "environmentDefinitionId");

-- CreateIndex
CREATE INDEX "feature_activations_environmentDefinitionId_idx" ON "public"."feature_activations"("environmentDefinitionId");

-- CreateIndex
CREATE INDEX "feature_activations_governmentServiceId_idx" ON "public"."feature_activations"("governmentServiceId");

-- CreateIndex
CREATE INDEX "feature_activations_status_idx" ON "public"."feature_activations"("status");

-- CreateIndex
CREATE INDEX "release_revalidation_triggers_releaseDefinitionId_idx" ON "public"."release_revalidation_triggers"("releaseDefinitionId");

-- CreateIndex
CREATE INDEX "release_revalidation_triggers_sourceRecordType_sourceRecordId_idx" ON "public"."release_revalidation_triggers"("sourceRecordType", "sourceRecordId");

-- CreateIndex
CREATE INDEX "ci_pipeline_runs_sourceCommitSha_idx" ON "public"."ci_pipeline_runs"("sourceCommitSha");

-- CreateIndex
CREATE INDEX "ci_pipeline_runs_status_idx" ON "public"."ci_pipeline_runs"("status");

-- CreateIndex
CREATE INDEX "data_transfer_approvals_sourceEnvironmentId_idx" ON "public"."data_transfer_approvals"("sourceEnvironmentId");

-- CreateIndex
CREATE INDEX "data_transfer_approvals_targetEnvironmentId_idx" ON "public"."data_transfer_approvals"("targetEnvironmentId");

-- CreateIndex
CREATE INDEX "data_transfer_approvals_status_idx" ON "public"."data_transfer_approvals"("status");

-- AddForeignKey
ALTER TABLE "public"."environment_configuration_baselines" ADD CONSTRAINT "environment_configuration_baselines_environmentDefinitionI_fkey" FOREIGN KEY ("environmentDefinitionId") REFERENCES "public"."environment_definitions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."environment_credential_bindings" ADD CONSTRAINT "environment_credential_bindings_environmentDefinitionId_fkey" FOREIGN KEY ("environmentDefinitionId") REFERENCES "public"."environment_definitions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."environment_integration_endpoints" ADD CONSTRAINT "environment_integration_endpoints_environmentDefinitionId_fkey" FOREIGN KEY ("environmentDefinitionId") REFERENCES "public"."environment_definitions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."release_definitions" ADD CONSTRAINT "release_definitions_configurationBaselineId_fkey" FOREIGN KEY ("configurationBaselineId") REFERENCES "public"."environment_configuration_baselines"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."release_artifacts" ADD CONSTRAINT "release_artifacts_releaseDefinitionId_fkey" FOREIGN KEY ("releaseDefinitionId") REFERENCES "public"."release_definitions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."release_approvals" ADD CONSTRAINT "release_approvals_releaseArtifactId_fkey" FOREIGN KEY ("releaseArtifactId") REFERENCES "public"."release_artifacts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."release_approvals" ADD CONSTRAINT "release_approvals_approverIdentityId_fkey" FOREIGN KEY ("approverIdentityId") REFERENCES "public"."identities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."change_requests" ADD CONSTRAINT "change_requests_requesterIdentityId_fkey" FOREIGN KEY ("requesterIdentityId") REFERENCES "public"."identities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."deployment_records" ADD CONSTRAINT "deployment_records_environmentDefinitionId_fkey" FOREIGN KEY ("environmentDefinitionId") REFERENCES "public"."environment_definitions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."deployment_records" ADD CONSTRAINT "deployment_records_releaseArtifactId_fkey" FOREIGN KEY ("releaseArtifactId") REFERENCES "public"."release_artifacts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."deployment_records" ADD CONSTRAINT "deployment_records_changeRequestId_fkey" FOREIGN KEY ("changeRequestId") REFERENCES "public"."change_requests"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."deployment_records" ADD CONSTRAINT "deployment_records_deployedByIdentityId_fkey" FOREIGN KEY ("deployedByIdentityId") REFERENCES "public"."identities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."deployment_verifications" ADD CONSTRAINT "deployment_verifications_deploymentRecordId_fkey" FOREIGN KEY ("deploymentRecordId") REFERENCES "public"."deployment_records"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."rollback_plans" ADD CONSTRAINT "rollback_plans_releaseDefinitionId_fkey" FOREIGN KEY ("releaseDefinitionId") REFERENCES "public"."release_definitions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."rollback_executions" ADD CONSTRAINT "rollback_executions_rollbackPlanId_fkey" FOREIGN KEY ("rollbackPlanId") REFERENCES "public"."rollback_plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."rollback_executions" ADD CONSTRAINT "rollback_executions_deploymentRecordId_fkey" FOREIGN KEY ("deploymentRecordId") REFERENCES "public"."deployment_records"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."rollback_executions" ADD CONSTRAINT "rollback_executions_initiatedByIdentityId_fkey" FOREIGN KEY ("initiatedByIdentityId") REFERENCES "public"."identities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."change_assessments" ADD CONSTRAINT "change_assessments_changeRequestId_fkey" FOREIGN KEY ("changeRequestId") REFERENCES "public"."change_requests"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."change_assessments" ADD CONSTRAINT "change_assessments_assessorIdentityId_fkey" FOREIGN KEY ("assessorIdentityId") REFERENCES "public"."identities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."emergency_changes" ADD CONSTRAINT "emergency_changes_authorizedActorIdentityId_fkey" FOREIGN KEY ("authorizedActorIdentityId") REFERENCES "public"."identities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."emergency_changes" ADD CONSTRAINT "emergency_changes_rollbackPlanId_fkey" FOREIGN KEY ("rollbackPlanId") REFERENCES "public"."rollback_plans"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."configuration_changes" ADD CONSTRAINT "configuration_changes_configurationItemId_fkey" FOREIGN KEY ("configurationItemId") REFERENCES "public"."configuration_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."configuration_changes" ADD CONSTRAINT "configuration_changes_requesterIdentityId_fkey" FOREIGN KEY ("requesterIdentityId") REFERENCES "public"."identities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."feature_activations" ADD CONSTRAINT "feature_activations_environmentDefinitionId_fkey" FOREIGN KEY ("environmentDefinitionId") REFERENCES "public"."environment_definitions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."feature_activations" ADD CONSTRAINT "feature_activations_governmentServiceId_fkey" FOREIGN KEY ("governmentServiceId") REFERENCES "public"."government_services"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."feature_activations" ADD CONSTRAINT "feature_activations_activatedByIdentityId_fkey" FOREIGN KEY ("activatedByIdentityId") REFERENCES "public"."identities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."release_revalidation_triggers" ADD CONSTRAINT "release_revalidation_triggers_releaseDefinitionId_fkey" FOREIGN KEY ("releaseDefinitionId") REFERENCES "public"."release_definitions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."data_transfer_approvals" ADD CONSTRAINT "data_transfer_approvals_sourceEnvironmentId_fkey" FOREIGN KEY ("sourceEnvironmentId") REFERENCES "public"."environment_definitions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."data_transfer_approvals" ADD CONSTRAINT "data_transfer_approvals_targetEnvironmentId_fkey" FOREIGN KEY ("targetEnvironmentId") REFERENCES "public"."environment_definitions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."data_transfer_approvals" ADD CONSTRAINT "data_transfer_approvals_approvedByIdentityId_fkey" FOREIGN KEY ("approvedByIdentityId") REFERENCES "public"."identities"("id") ON DELETE SET NULL ON UPDATE CASCADE;
