import { createHash } from 'node:crypto';

import { type INestApplication } from '@nestjs/common';
import {
  ChangeAssessmentOutcome,
  EnvironmentIntegrationMode,
  IdentityType,
  PlatformEnvironmentClassification,
} from '@prisma/client';
import { type App } from 'supertest/types';

import { type PrismaService } from '../../src/database/prisma.service';
import { ChangeManagementService } from '../../src/production-readiness/changes/change-management.service';
import { CiGovernanceService } from '../../src/production-readiness/ci/ci-governance.service';
import { EnvironmentRegistryService } from '../../src/production-readiness/environments/environment-registry.service';
import { EnvironmentSeparationService } from '../../src/production-readiness/environments/environment-separation.service';
import { FeatureActivationService } from '../../src/production-readiness/features/feature-activation.service';
import { REQUIRED_CI_CHECKS } from '../../src/production-readiness/production-readiness.constants';
import { DeploymentService } from '../../src/production-readiness/releases/deployment.service';
import { ReleaseGovernanceService } from '../../src/production-readiness/releases/release-governance.service';

export const NON_PRODUCTION_PHASE_13E_FIXTURE_MARKER = 'NON_PRODUCTION_PHASE_13E';

export interface Phase13EFixtureContext {
  identityId: string;
  testEnvironmentId: string;
  productionEnvironmentId: string;
  releaseDefinitionId: string;
  releaseArtifactId: string;
  artifactDigest: string;
  changeRequestId: string;
  ciPipelineRunId: string;
}

function buildChecksPassed(): Record<string, boolean> {
  return REQUIRED_CI_CHECKS.reduce<Record<string, boolean>>((checks, check) => {
    checks[check] = true;
    return checks;
  }, {});
}

export async function seedPhase13EFixture(
  app: INestApplication<App>,
  prisma: PrismaService,
): Promise<Phase13EFixtureContext> {
  const marker = NON_PRODUCTION_PHASE_13E_FIXTURE_MARKER;
  const identity = await prisma.identity.create({
    data: {
      type: IdentityType.SERVICE,
      displayName: `${marker} Release Operator`,
    },
  });

  const environmentRegistry = app.get(EnvironmentRegistryService);
  const releaseGovernance = app.get(ReleaseGovernanceService);
  const changeManagement = app.get(ChangeManagementService);
  const ciGovernance = app.get(CiGovernanceService);

  const testEnvironment = await environmentRegistry.registerEnvironment({
    code: `${marker}-TEST`,
    name: 'Phase 13E Test Environment',
    classification: PlatformEnvironmentClassification.TEST,
    credentialsNamespace: `${marker}-test-creds`,
    secretsNamespace: `${marker}-test-secrets`,
    dataPartitionKey: `${marker}-test-data`,
    integrationEndpointPrefix: 'https://mock.test.local',
    integrationMode: EnvironmentIntegrationMode.MOCK,
  });

  const productionEnvironment = await environmentRegistry.registerEnvironment({
    code: `${marker}-PROD`,
    name: 'Phase 13E Production Environment',
    classification: PlatformEnvironmentClassification.PRODUCTION,
    credentialsNamespace: `${marker}-prod-creds`,
    secretsNamespace: `${marker}-prod-secrets`,
    dataPartitionKey: `${marker}-prod-data`,
    integrationEndpointPrefix: 'https://api.government.local',
    integrationMode: EnvironmentIntegrationMode.LIVE,
  });

  await environmentRegistry.registerCredentialBinding(
    testEnvironment.id,
    `${marker}-dev-credential`,
    `${marker}-test-creds`,
    false,
  );

  await environmentRegistry.registerIntegrationEndpoint(
    testEnvironment.id,
    'registry-query',
    'https://mock.test.local/registry',
    EnvironmentIntegrationMode.MOCK,
    false,
  );

  const release = await releaseGovernance.createReleaseDefinition({
    version: `${marker}-1.0.0`,
    sourceCommitSha: 'abc123def456',
    buildIdentifier: `${marker}-build-1`,
    releaseNotes: 'Phase 13E integration fixture release',
  });

  const artifactDigest = createHash('sha256').update(`${marker}-artifact`).digest('hex');
  const artifact = await releaseGovernance.registerArtifact({
    releaseDefinitionId: release.id,
    artifactDigest,
    sbomDigest: createHash('sha256').update(`${marker}-sbom`).digest('hex'),
    provenanceRef: `${marker}-provenance`,
  });

  await releaseGovernance.acceptArtifact(artifact.id);
  await releaseGovernance.approveRelease({
    releaseArtifactId: artifact.id,
    approverIdentityId: identity.id,
  });

  const changeRequest = await changeManagement.createChangeRequest({
    changeNumber: `${marker}-CHG-001`,
    scope: 'Deploy release to production',
    reason: 'Scheduled production deployment',
    requesterIdentityId: identity.id,
    authorityImpact: { requiresEvaluation: true },
  });

  await changeManagement.submitChangeRequest(changeRequest.id);
  await changeManagement.assessChange({
    changeRequestId: changeRequest.id,
    assessorIdentityId: identity.id,
    outcome: ChangeAssessmentOutcome.APPROVED,
    findings: { authorityEvaluated: true },
  });
  await changeManagement.approveChangeRequest(changeRequest.id);

  const ciRun = await ciGovernance.recordPipelineRun({
    pipelineIdentifier: `${marker}-ci`,
    sourceCommitSha: 'abc123def456',
    checksPassed: buildChecksPassed(),
    artifactDigest,
    provenanceRef: `${marker}-ci-provenance`,
  });

  return {
    identityId: identity.id,
    testEnvironmentId: testEnvironment.id,
    productionEnvironmentId: productionEnvironment.id,
    releaseDefinitionId: release.id,
    releaseArtifactId: artifact.id,
    artifactDigest,
    changeRequestId: changeRequest.id,
    ciPipelineRunId: ciRun.id,
  };
}

export async function deployToProduction(
  app: INestApplication<App>,
  fixture: Phase13EFixtureContext,
) {
  const deployment = app.get(DeploymentService);
  return deployment.deployRelease({
    environmentDefinitionId: fixture.productionEnvironmentId,
    releaseArtifactId: fixture.releaseArtifactId,
    artifactDigest: fixture.artifactDigest,
    deployedByIdentityId: fixture.identityId,
    changeRequestId: fixture.changeRequestId,
    ciPipelineRunId: fixture.ciPipelineRunId,
  });
}

export async function seedFeatureActivationFixture(
  app: INestApplication<App>,
  fixture: Phase13EFixtureContext,
  featureKey: string,
) {
  const featureActivation = app.get(FeatureActivationService);
  await featureActivation.registerDeployedFeature({
    featureKey,
    environmentDefinitionId: fixture.testEnvironmentId,
  });
  await featureActivation.enableTechnically({
    featureKey,
    environmentDefinitionId: fixture.testEnvironmentId,
    activatedByIdentityId: fixture.identityId,
  });
}

export async function requestProductionDataTransfer(
  app: INestApplication<App>,
  fixture: Phase13EFixtureContext,
) {
  const separation = app.get(EnvironmentSeparationService);
  return separation.requestDataTransferApproval({
    sourceEnvironmentId: fixture.productionEnvironmentId,
    targetEnvironmentId: fixture.testEnvironmentId,
    deidentificationProcessRef: 'DEID-PROC-001',
  });
}
