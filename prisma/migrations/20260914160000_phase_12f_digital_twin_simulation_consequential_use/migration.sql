-- Phase 12F: Digital Twin, Scenario Simulation, Consequential-Use Controls

CREATE TYPE "DigitalTwinType" AS ENUM (
  'INSTITUTION',
  'DEPARTMENT',
  'SERVICE',
  'APPLICATION',
  'CASE',
  'PROJECT',
  'INFRASTRUCTURE',
  'DEPENDENCY',
  'AUTHORITY',
  'WORKFLOW',
  'OTHER_APPROVED'
);

CREATE TYPE "DigitalTwinDefinitionStatus" AS ENUM (
  'DRAFT',
  'UNDER_REVIEW',
  'ACTIVE',
  'SUSPENDED',
  'RETIRED',
  'SAFE_HALTED'
);

CREATE TYPE "DigitalTwinPrivacyClassification" AS ENUM (
  'PUBLIC',
  'INTERNAL',
  'RESTRICTED',
  'CONFIDENTIAL',
  'HIGHLY_CONFIDENTIAL'
);

CREATE TYPE "DigitalTwinMode" AS ENUM (
  'DESIGN',
  'TRAINING',
  'SIMULATION',
  'TEST',
  'SHADOW',
  'ADVISORY',
  'CONTROLLED_PILOT',
  'APPROVED_LIVE_REFERENCE'
);

CREATE TYPE "DigitalTwinSourceStatus" AS ENUM (
  'AUTHORITATIVE',
  'SUPPORTING',
  'MODELED',
  'UNVERIFIED'
);

CREATE TYPE "DigitalTwinRelationshipType" AS ENUM (
  'PARENT',
  'CHILD',
  'DEPENDS_ON',
  'SUPPORTS',
  'REPRESENTS',
  'RELATED'
);

CREATE TYPE "SimulationScenarioStatus" AS ENUM (
  'DRAFT',
  'ACTIVE',
  'ARCHIVED'
);

CREATE TYPE "SimulationRunStatus" AS ENUM (
  'PENDING',
  'RUNNING',
  'COMPLETED',
  'FAILED',
  'CANCELLED'
);

CREATE TYPE "SimulationReviewOutcome" AS ENUM (
  'DRAFT',
  'UNDER_REVIEW',
  'ACCEPTED',
  'REJECTED',
  'NEEDS_REVISION'
);

CREATE TYPE "ConsequentialUseReviewDecision" AS ENUM (
  'APPROVED',
  'REJECTED',
  'CONDITIONAL',
  'SAFE_HALT',
  'DEFERRED'
);

CREATE TYPE "ConsequentialUseImpactArea" AS ENUM (
  'PERSON',
  'PROJECT',
  'INSTITUTION',
  'PUBLIC_SERVICE',
  'FINANCIAL_INTEREST',
  'INFRASTRUCTURE',
  'LEGAL_POSITION',
  'GOVERNMENT_DECISION'
);

CREATE TYPE "SimulationToLiveTransitionStatus" AS ENUM (
  'PROPOSED',
  'TESTING',
  'SECURITY_REVIEW',
  'PENDING_ACCEPTANCE',
  'ACCEPTED',
  'SUSPENDED',
  'ROLLED_BACK'
);

CREATE TABLE "digital_twin_definitions" (
  "id" UUID NOT NULL,
  "twinCode" TEXT NOT NULL,
  "representedSubjectType" "DigitalTwinType" NOT NULL,
  "representedSubjectId" UUID NOT NULL,
  "representedSubjectReference" TEXT NOT NULL,
  "institutionalOwnerId" UUID NOT NULL,
  "institutionalOwnerOfficeholderId" UUID,
  "purpose" TEXT NOT NULL,
  "scope" TEXT NOT NULL,
  "permittedUses" JSONB NOT NULL DEFAULT '[]',
  "prohibitedUses" JSONB NOT NULL DEFAULT '[]',
  "sourceRequirements" TEXT NOT NULL,
  "privacyClassification" "DigitalTwinPrivacyClassification" NOT NULL DEFAULT 'INTERNAL',
  "status" "DigitalTwinDefinitionStatus" NOT NULL DEFAULT 'DRAFT',
  "isAuthoritativeRecord" BOOLEAN NOT NULL DEFAULT false,
  "preventsPersonalProfileExpansion" BOOLEAN NOT NULL DEFAULT true,
  "staleAsOf" TIMESTAMP(3),
  "isStale" BOOLEAN NOT NULL DEFAULT false,
  "isIncomplete" BOOLEAN NOT NULL DEFAULT false,
  "isInconsistent" BOOLEAN NOT NULL DEFAULT false,
  "isCompromised" BOOLEAN NOT NULL DEFAULT false,
  "outsideApprovedUse" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "digital_twin_definitions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "digital_twin_versions" (
  "id" UUID NOT NULL,
  "definitionId" UUID NOT NULL,
  "versionNumber" INTEGER NOT NULL,
  "versionLabel" TEXT NOT NULL,
  "configuration" JSONB NOT NULL DEFAULT '{}',
  "modelVersionReference" TEXT,
  "effectiveFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "effectiveTo" TIMESTAMP(3),
  "isCurrent" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "digital_twin_versions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "digital_twin_sources" (
  "id" UUID NOT NULL,
  "twinVersionId" UUID NOT NULL,
  "sourceName" TEXT NOT NULL,
  "sourceStatus" "DigitalTwinSourceStatus" NOT NULL,
  "integrationReference" TEXT NOT NULL,
  "evidenceReference" TEXT,
  "freshnessAsOf" TIMESTAMP(3) NOT NULL,
  "ownerIdentityId" UUID,
  "ownerOfficeholderId" UUID,
  "lastUpdatedAt" TIMESTAMP(3) NOT NULL,
  "limitations" TEXT NOT NULL,
  "isDisclosed" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "digital_twin_sources_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "digital_twin_relationships" (
  "id" UUID NOT NULL,
  "fromDefinitionId" UUID NOT NULL,
  "toDefinitionId" UUID NOT NULL,
  "relationshipType" "DigitalTwinRelationshipType" NOT NULL,
  "isModeledOnly" BOOLEAN NOT NULL DEFAULT true,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "digital_twin_relationships_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "digital_twin_mode_records" (
  "id" UUID NOT NULL,
  "twinVersionId" UUID NOT NULL,
  "mode" "DigitalTwinMode" NOT NULL,
  "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "recordedByIdentityId" UUID,
  "rationale" TEXT NOT NULL,
  "isOperationalControl" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "digital_twin_mode_records_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "digital_twin_snapshots" (
  "id" UUID NOT NULL,
  "twinVersionId" UUID NOT NULL,
  "snapshotAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "snapshotPayload" JSONB NOT NULL,
  "snapshotHash" TEXT NOT NULL,
  "isImmutable" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "digital_twin_snapshots_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "simulation_scenarios" (
  "id" UUID NOT NULL,
  "scenarioCode" TEXT NOT NULL,
  "purpose" TEXT NOT NULL,
  "scenarioDescription" TEXT NOT NULL,
  "twinVersionId" UUID NOT NULL,
  "inputSnapshotId" UUID,
  "modelVersionReference" TEXT NOT NULL,
  "parameters" JSONB NOT NULL DEFAULT '{}',
  "scenarioDate" TIMESTAMP(3) NOT NULL,
  "limitations" TEXT NOT NULL,
  "isPrediction" BOOLEAN NOT NULL DEFAULT false,
  "status" "SimulationScenarioStatus" NOT NULL DEFAULT 'DRAFT',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "simulation_scenarios_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "simulation_runs" (
  "id" UUID NOT NULL,
  "scenarioId" UUID NOT NULL,
  "runNumber" INTEGER NOT NULL,
  "twinVersionId" UUID NOT NULL,
  "inputSnapshotId" UUID NOT NULL,
  "mode" "DigitalTwinMode" NOT NULL DEFAULT 'SIMULATION',
  "status" "SimulationRunStatus" NOT NULL DEFAULT 'PENDING',
  "startedAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "simulation_runs_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "simulation_inputs" (
  "id" UUID NOT NULL,
  "simulationRunId" UUID NOT NULL,
  "inputSnapshotId" UUID NOT NULL,
  "inputPayload" JSONB NOT NULL,
  "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "simulation_inputs_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "simulation_outputs" (
  "id" UUID NOT NULL,
  "simulationRunId" UUID NOT NULL,
  "outputPayload" JSONB NOT NULL,
  "outputType" TEXT NOT NULL,
  "isAdvisoryOnly" BOOLEAN NOT NULL DEFAULT true,
  "presentedAsPrediction" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "simulation_outputs_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "simulation_assumptions" (
  "id" UUID NOT NULL,
  "simulationRunId" UUID NOT NULL,
  "assumptionText" TEXT NOT NULL,
  "assumptionCategory" TEXT,
  "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "simulation_assumptions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "simulation_uncertainties" (
  "id" UUID NOT NULL,
  "simulationRunId" UUID NOT NULL,
  "uncertaintyDescription" TEXT NOT NULL,
  "uncertaintyLevel" TEXT,
  "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "simulation_uncertainties_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "simulation_reviews" (
  "id" UUID NOT NULL,
  "simulationRunId" UUID NOT NULL,
  "reviewerIdentityId" UUID,
  "reviewerOfficeholderId" UUID,
  "outcome" "SimulationReviewOutcome" NOT NULL DEFAULT 'DRAFT',
  "reviewNotes" TEXT,
  "reviewedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "simulation_reviews_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "consequential_use_reviews" (
  "id" UUID NOT NULL,
  "twinVersionId" UUID NOT NULL,
  "simulationRunId" UUID,
  "simulationOutputId" UUID,
  "representedSubjectType" "DigitalTwinType" NOT NULL,
  "representedSubjectId" UUID NOT NULL,
  "impactAreas" JSONB NOT NULL DEFAULT '[]',
  "reviewerIdentityId" UUID NOT NULL,
  "reviewerOfficeholderId" UUID,
  "authorityReference" TEXT NOT NULL,
  "evidenceReference" TEXT,
  "decision" "ConsequentialUseReviewDecision" NOT NULL,
  "reasons" TEXT NOT NULL,
  "limitations" TEXT NOT NULL,
  "conditions" TEXT,
  "reviewedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "isStaleTwinBlocked" BOOLEAN NOT NULL DEFAULT false,
  "missingDataDisclosed" BOOLEAN NOT NULL DEFAULT false,
  "proposedUse" TEXT NOT NULL,
  "alternativesConsidered" TEXT,
  "conflictNotes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "consequential_use_reviews_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "simulation_to_live_transition_records" (
  "id" UUID NOT NULL,
  "twinVersionId" UUID NOT NULL,
  "exactVersionLabel" TEXT NOT NULL,
  "acceptedMode" "DigitalTwinMode" NOT NULL,
  "testingCompleted" BOOLEAN NOT NULL DEFAULT false,
  "securityReviewCompleted" BOOLEAN NOT NULL DEFAULT false,
  "authorityReference" TEXT NOT NULL,
  "institutionalAcceptanceReference" TEXT NOT NULL,
  "rollbackPlanReference" TEXT NOT NULL,
  "trainingCompleted" BOOLEAN NOT NULL DEFAULT false,
  "effectiveDate" TIMESTAMP(3),
  "suspensionTriggers" JSONB NOT NULL DEFAULT '[]',
  "status" "SimulationToLiveTransitionStatus" NOT NULL DEFAULT 'PROPOSED',
  "technicalSuccessAcknowledged" BOOLEAN NOT NULL DEFAULT false,
  "liveActivationAuthorized" BOOLEAN NOT NULL DEFAULT false,
  "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "simulation_to_live_transition_records_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "digital_twin_definitions_twinCode_key" ON "digital_twin_definitions"("twinCode");
CREATE INDEX "digital_twin_definitions_representedSubjectType_representedSubjectId_idx" ON "digital_twin_definitions"("representedSubjectType", "representedSubjectId");
CREATE INDEX "digital_twin_definitions_institutionalOwnerId_idx" ON "digital_twin_definitions"("institutionalOwnerId");
CREATE INDEX "digital_twin_definitions_status_idx" ON "digital_twin_definitions"("status");

CREATE UNIQUE INDEX "digital_twin_versions_definitionId_versionNumber_key" ON "digital_twin_versions"("definitionId", "versionNumber");
CREATE INDEX "digital_twin_versions_definitionId_idx" ON "digital_twin_versions"("definitionId");
CREATE INDEX "digital_twin_versions_isCurrent_idx" ON "digital_twin_versions"("isCurrent");

CREATE INDEX "digital_twin_sources_twinVersionId_idx" ON "digital_twin_sources"("twinVersionId");
CREATE INDEX "digital_twin_sources_sourceStatus_idx" ON "digital_twin_sources"("sourceStatus");

CREATE UNIQUE INDEX "digital_twin_relationships_fromDefinitionId_toDefinitionId_relationshipType_key" ON "digital_twin_relationships"("fromDefinitionId", "toDefinitionId", "relationshipType");
CREATE INDEX "digital_twin_relationships_fromDefinitionId_idx" ON "digital_twin_relationships"("fromDefinitionId");
CREATE INDEX "digital_twin_relationships_toDefinitionId_idx" ON "digital_twin_relationships"("toDefinitionId");

CREATE INDEX "digital_twin_mode_records_twinVersionId_idx" ON "digital_twin_mode_records"("twinVersionId");
CREATE INDEX "digital_twin_mode_records_mode_idx" ON "digital_twin_mode_records"("mode");

CREATE INDEX "digital_twin_snapshots_twinVersionId_idx" ON "digital_twin_snapshots"("twinVersionId");
CREATE INDEX "digital_twin_snapshots_snapshotAt_idx" ON "digital_twin_snapshots"("snapshotAt");

CREATE UNIQUE INDEX "simulation_scenarios_scenarioCode_key" ON "simulation_scenarios"("scenarioCode");
CREATE INDEX "simulation_scenarios_twinVersionId_idx" ON "simulation_scenarios"("twinVersionId");
CREATE INDEX "simulation_scenarios_status_idx" ON "simulation_scenarios"("status");

CREATE UNIQUE INDEX "simulation_runs_scenarioId_runNumber_key" ON "simulation_runs"("scenarioId", "runNumber");
CREATE INDEX "simulation_runs_scenarioId_idx" ON "simulation_runs"("scenarioId");
CREATE INDEX "simulation_runs_twinVersionId_idx" ON "simulation_runs"("twinVersionId");
CREATE INDEX "simulation_runs_status_idx" ON "simulation_runs"("status");

CREATE INDEX "simulation_inputs_simulationRunId_idx" ON "simulation_inputs"("simulationRunId");
CREATE INDEX "simulation_outputs_simulationRunId_idx" ON "simulation_outputs"("simulationRunId");
CREATE INDEX "simulation_assumptions_simulationRunId_idx" ON "simulation_assumptions"("simulationRunId");
CREATE INDEX "simulation_uncertainties_simulationRunId_idx" ON "simulation_uncertainties"("simulationRunId");
CREATE INDEX "simulation_reviews_simulationRunId_idx" ON "simulation_reviews"("simulationRunId");

CREATE INDEX "consequential_use_reviews_twinVersionId_idx" ON "consequential_use_reviews"("twinVersionId");
CREATE INDEX "consequential_use_reviews_simulationRunId_idx" ON "consequential_use_reviews"("simulationRunId");
CREATE INDEX "consequential_use_reviews_decision_idx" ON "consequential_use_reviews"("decision");

CREATE INDEX "simulation_to_live_transition_records_twinVersionId_idx" ON "simulation_to_live_transition_records"("twinVersionId");
CREATE INDEX "simulation_to_live_transition_records_status_idx" ON "simulation_to_live_transition_records"("status");

ALTER TABLE "digital_twin_definitions" ADD CONSTRAINT "digital_twin_definitions_institutionalOwnerId_fkey" FOREIGN KEY ("institutionalOwnerId") REFERENCES "institutions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "digital_twin_definitions" ADD CONSTRAINT "digital_twin_definitions_institutionalOwnerOfficeholderId_fkey" FOREIGN KEY ("institutionalOwnerOfficeholderId") REFERENCES "officeholders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "digital_twin_versions" ADD CONSTRAINT "digital_twin_versions_definitionId_fkey" FOREIGN KEY ("definitionId") REFERENCES "digital_twin_definitions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "digital_twin_sources" ADD CONSTRAINT "digital_twin_sources_twinVersionId_fkey" FOREIGN KEY ("twinVersionId") REFERENCES "digital_twin_versions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "digital_twin_sources" ADD CONSTRAINT "digital_twin_sources_ownerIdentityId_fkey" FOREIGN KEY ("ownerIdentityId") REFERENCES "identities"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "digital_twin_sources" ADD CONSTRAINT "digital_twin_sources_ownerOfficeholderId_fkey" FOREIGN KEY ("ownerOfficeholderId") REFERENCES "officeholders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "digital_twin_relationships" ADD CONSTRAINT "digital_twin_relationships_fromDefinitionId_fkey" FOREIGN KEY ("fromDefinitionId") REFERENCES "digital_twin_definitions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "digital_twin_relationships" ADD CONSTRAINT "digital_twin_relationships_toDefinitionId_fkey" FOREIGN KEY ("toDefinitionId") REFERENCES "digital_twin_definitions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "digital_twin_mode_records" ADD CONSTRAINT "digital_twin_mode_records_twinVersionId_fkey" FOREIGN KEY ("twinVersionId") REFERENCES "digital_twin_versions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "digital_twin_mode_records" ADD CONSTRAINT "digital_twin_mode_records_recordedByIdentityId_fkey" FOREIGN KEY ("recordedByIdentityId") REFERENCES "identities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "digital_twin_snapshots" ADD CONSTRAINT "digital_twin_snapshots_twinVersionId_fkey" FOREIGN KEY ("twinVersionId") REFERENCES "digital_twin_versions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "simulation_scenarios" ADD CONSTRAINT "simulation_scenarios_twinVersionId_fkey" FOREIGN KEY ("twinVersionId") REFERENCES "digital_twin_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "simulation_scenarios" ADD CONSTRAINT "simulation_scenarios_inputSnapshotId_fkey" FOREIGN KEY ("inputSnapshotId") REFERENCES "digital_twin_snapshots"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "simulation_runs" ADD CONSTRAINT "simulation_runs_scenarioId_fkey" FOREIGN KEY ("scenarioId") REFERENCES "simulation_scenarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "simulation_runs" ADD CONSTRAINT "simulation_runs_twinVersionId_fkey" FOREIGN KEY ("twinVersionId") REFERENCES "digital_twin_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "simulation_runs" ADD CONSTRAINT "simulation_runs_inputSnapshotId_fkey" FOREIGN KEY ("inputSnapshotId") REFERENCES "digital_twin_snapshots"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "simulation_inputs" ADD CONSTRAINT "simulation_inputs_simulationRunId_fkey" FOREIGN KEY ("simulationRunId") REFERENCES "simulation_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "simulation_inputs" ADD CONSTRAINT "simulation_inputs_inputSnapshotId_fkey" FOREIGN KEY ("inputSnapshotId") REFERENCES "digital_twin_snapshots"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "simulation_outputs" ADD CONSTRAINT "simulation_outputs_simulationRunId_fkey" FOREIGN KEY ("simulationRunId") REFERENCES "simulation_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "simulation_assumptions" ADD CONSTRAINT "simulation_assumptions_simulationRunId_fkey" FOREIGN KEY ("simulationRunId") REFERENCES "simulation_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "simulation_uncertainties" ADD CONSTRAINT "simulation_uncertainties_simulationRunId_fkey" FOREIGN KEY ("simulationRunId") REFERENCES "simulation_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "simulation_reviews" ADD CONSTRAINT "simulation_reviews_simulationRunId_fkey" FOREIGN KEY ("simulationRunId") REFERENCES "simulation_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "simulation_reviews" ADD CONSTRAINT "simulation_reviews_reviewerIdentityId_fkey" FOREIGN KEY ("reviewerIdentityId") REFERENCES "identities"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "simulation_reviews" ADD CONSTRAINT "simulation_reviews_reviewerOfficeholderId_fkey" FOREIGN KEY ("reviewerOfficeholderId") REFERENCES "officeholders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "consequential_use_reviews" ADD CONSTRAINT "consequential_use_reviews_twinVersionId_fkey" FOREIGN KEY ("twinVersionId") REFERENCES "digital_twin_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "consequential_use_reviews" ADD CONSTRAINT "consequential_use_reviews_simulationRunId_fkey" FOREIGN KEY ("simulationRunId") REFERENCES "simulation_runs"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "consequential_use_reviews" ADD CONSTRAINT "consequential_use_reviews_simulationOutputId_fkey" FOREIGN KEY ("simulationOutputId") REFERENCES "simulation_outputs"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "consequential_use_reviews" ADD CONSTRAINT "consequential_use_reviews_reviewerIdentityId_fkey" FOREIGN KEY ("reviewerIdentityId") REFERENCES "identities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "consequential_use_reviews" ADD CONSTRAINT "consequential_use_reviews_reviewerOfficeholderId_fkey" FOREIGN KEY ("reviewerOfficeholderId") REFERENCES "officeholders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "simulation_to_live_transition_records" ADD CONSTRAINT "simulation_to_live_transition_records_twinVersionId_fkey" FOREIGN KEY ("twinVersionId") REFERENCES "digital_twin_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
