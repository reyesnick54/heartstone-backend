import { ForbiddenException } from '@nestjs/common';
import { type INestApplication } from '@nestjs/common';
import {
  DataTransferApprovalStatus,
  FeatureActivationStatus,
  PlatformEnvironmentClassification,
  ReleaseArtifactStatus,
} from '@prisma/client';
import { type App } from 'supertest/types';

import { type PrismaService } from '../src/database/prisma.service';
import { EmergencyChangeService } from '../src/production-readiness/changes/emergency-change.service';
import { ProductionReadinessBoundaryService } from '../src/production-readiness/common/production-readiness-boundary.service';
import { ConfigurationGovernanceService } from '../src/production-readiness/configuration/configuration-governance.service';
import { EnvironmentRegistryService } from '../src/production-readiness/environments/environment-registry.service';
import { EnvironmentSeparationService } from '../src/production-readiness/environments/environment-separation.service';
import { FeatureActivationService } from '../src/production-readiness/features/feature-activation.service';
import { DeploymentService } from '../src/production-readiness/releases/deployment.service';
import { ReleaseGovernanceService } from '../src/production-readiness/releases/release-governance.service';
import { RollbackService } from '../src/production-readiness/releases/rollback.service';
import { createIntegrationApp, resetAllTestData } from './helpers/integration-app';
import {
  deployToProduction,
  NON_PRODUCTION_PHASE_13E_FIXTURE_MARKER,
  requestProductionDataTransfer,
  seedPhase13EFixture,
} from './helpers/phase-13e-test-fixtures';

describe('Phase 13E production readiness (integration)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

  beforeAll(async () => {
    ({ app, prisma } = await createIntegrationApp());
  });

  beforeEach(async () => {
    await resetAllTestData(prisma);
  });

  afterAll(async () => {
    await app.close();
  });

  it('deploys accepted artifact to production with approved change request', async () => {
    const fixture = await seedPhase13EFixture(app, prisma);
    const deployment = await deployToProduction(app, fixture);

    expect(deployment.status).toBe('COMPLETED');
    expect(deployment.environmentDefinitionId).toBe(fixture.productionEnvironmentId);
    expect(deployment.releaseArtifactId).toBe(fixture.releaseArtifactId);
  });

  it('blocks production deploy when artifact digest mismatches', async () => {
    const fixture = await seedPhase13EFixture(app, prisma);
    const deployment = app.get(DeploymentService);

    await expect(
      deployment.deployRelease({
        environmentDefinitionId: fixture.productionEnvironmentId,
        releaseArtifactId: fixture.releaseArtifactId,
        artifactDigest: 'mismatched-digest',
        deployedByIdentityId: fixture.identityId,
        changeRequestId: fixture.changeRequestId,
      }),
    ).rejects.toThrow(ForbiddenException);
  });

  it('blocks unaccepted artifact from production deployment', async () => {
    const fixture = await seedPhase13EFixture(app, prisma);
    const releaseGovernance = app.get(ReleaseGovernanceService);
    const deployment = app.get(DeploymentService);

    const release = await releaseGovernance.createReleaseDefinition({
      version: `${NON_PRODUCTION_PHASE_13E_FIXTURE_MARKER}-unaccepted`,
      sourceCommitSha: 'unaccepted123',
      buildIdentifier: 'build-unaccepted',
    });

    const artifact = await releaseGovernance.registerArtifact({
      releaseDefinitionId: release.id,
      artifactDigest: 'unaccepted-artifact-digest',
      sbomDigest: 'unaccepted-sbom',
    });

    await expect(
      deployment.deployRelease({
        environmentDefinitionId: fixture.productionEnvironmentId,
        releaseArtifactId: artifact.id,
        artifactDigest: artifact.artifactDigest,
        deployedByIdentityId: fixture.identityId,
        changeRequestId: fixture.changeRequestId,
      }),
    ).rejects.toThrow(ForbiddenException);

    const stored = await prisma.releaseArtifact.findUniqueOrThrow({ where: { id: artifact.id } });
    expect(stored.status).toBe(ReleaseArtifactStatus.BUILT);
  });

  it('blocks dev credential from being bound to production environment', async () => {
    const fixture = await seedPhase13EFixture(app, prisma);
    const registry = app.get(EnvironmentRegistryService);

    await expect(
      registry.registerCredentialBinding(
        fixture.testEnvironmentId,
        'prod-credential-leak',
        `${NON_PRODUCTION_PHASE_13E_FIXTURE_MARKER}-test-creds`,
        true,
      ),
    ).rejects.toThrow(ForbiddenException);
  });

  it('blocks live government endpoint registration in test environment', async () => {
    const fixture = await seedPhase13EFixture(app, prisma);
    const registry = app.get(EnvironmentRegistryService);

    await expect(
      registry.registerIntegrationEndpoint(
        fixture.testEnvironmentId,
        'live-registry',
        'https://live.government.local/registry',
        'LIVE',
        true,
      ),
    ).rejects.toThrow(ForbiddenException);
  });

  it('blocks production data transfer without approved de-identification process', async () => {
    const fixture = await seedPhase13EFixture(app, prisma);
    const separation = app.get(EnvironmentSeparationService);

    await requestProductionDataTransfer(app, fixture);

    await expect(
      separation.assertDataTransferAllowed(
        fixture.productionEnvironmentId,
        fixture.testEnvironmentId,
      ),
    ).rejects.toThrow(ForbiddenException);
  });

  it('allows production data transfer after approved de-identification', async () => {
    const fixture = await seedPhase13EFixture(app, prisma);
    const separation = app.get(EnvironmentSeparationService);

    const approval = await requestProductionDataTransfer(app, fixture);
    await separation.approveDataTransfer(approval.id, fixture.identityId);

    await expect(
      separation.assertDataTransferAllowed(
        fixture.productionEnvironmentId,
        fixture.testEnvironmentId,
      ),
    ).resolves.toBeUndefined();

    const stored = await prisma.dataTransferApproval.findUniqueOrThrow({
      where: { id: approval.id },
    });
    expect(stored.status).toBe(DataTransferApprovalStatus.APPROVED);
  });

  it('separates feature deployment from institutional activation', async () => {
    const fixture = await seedPhase13EFixture(app, prisma);
    const featureKey = `${NON_PRODUCTION_PHASE_13E_FIXTURE_MARKER}-FEATURE`;
    const featureActivation = app.get(FeatureActivationService);

    await featureActivation.registerDeployedFeature({
      featureKey,
      environmentDefinitionId: fixture.testEnvironmentId,
    });

    await expect(
      featureActivation.assertFeatureUsable(featureKey, fixture.testEnvironmentId),
    ).rejects.toThrow(ForbiddenException);

    await featureActivation.enableTechnically({
      featureKey,
      environmentDefinitionId: fixture.testEnvironmentId,
      activatedByIdentityId: fixture.identityId,
    });

    await expect(
      featureActivation.assertFeatureUsable(featureKey, fixture.testEnvironmentId),
    ).rejects.toThrow(ForbiddenException);

    await featureActivation.activateInstitutionally({
      featureKey,
      environmentDefinitionId: fixture.testEnvironmentId,
      activatedByIdentityId: fixture.identityId,
    });

    await expect(
      featureActivation.assertFeatureUsable(featureKey, fixture.testEnvironmentId),
    ).resolves.toBeUndefined();

    const stored = await prisma.featureActivation.findUniqueOrThrow({
      where: {
        featureKey_environmentDefinitionId: {
          featureKey,
          environmentDefinitionId: fixture.testEnvironmentId,
        },
      },
    });
    expect(stored.status).toBe(FeatureActivationStatus.INSTITUTIONALLY_ACTIVATED);
  });

  it('records CI pipeline without authorizing production deployment', async () => {
    const fixture = await seedPhase13EFixture(app, prisma);
    const ciRun = await prisma.ciPipelineRun.findUniqueOrThrow({
      where: { id: fixture.ciPipelineRunId },
    });

    expect(ciRun.status).toBe('PASSED');
    expect(ciRun.authorizesProduction).toBe(false);

    const boundary = app.get(ProductionReadinessBoundaryService);
    expect(() => {
      boundary.assertCiGreenDoesNotAuthorizeProduction(true);
    }).toThrow(ForbiddenException);
  });

  it('expires emergency changes past retrospective deadline', async () => {
    const fixture = await seedPhase13EFixture(app, prisma);
    const emergency = app.get(EmergencyChangeService);

    const change = await emergency.createEmergencyChange({
      incidentRef: 'INC-001',
      necessity: 'Restore service availability',
      scope: 'Hotfix configuration',
      authorizedActorIdentityId: fixture.identityId,
      retrospectiveDeadline: new Date(Date.now() - 60_000),
    });

    await emergency.expireOverdueChanges();

    const stored = await prisma.emergencyChange.findUniqueOrThrow({ where: { id: change.id } });
    expect(stored.status).toBe('EXPIRED');
  });

  it('executes rollback while preserving official records', async () => {
    const fixture = await seedPhase13EFixture(app, prisma);
    const deployment = await deployToProduction(app, fixture);
    const rollback = app.get(RollbackService);

    const plan = await rollback.createRollbackPlan({
      releaseDefinitionId: fixture.releaseDefinitionId,
      targetArtifactDigest: fixture.artifactDigest,
      databaseStrategy: { preserveOfficialRecords: true, forwardRepair: true },
    });

    const execution = await rollback.executeRollback({
      rollbackPlanId: plan.id,
      deploymentRecordId: deployment.id,
      initiatedByIdentityId: fixture.identityId,
    });

    expect(execution.preservesOfficialRecords).toBe(true);
    expect(execution.status).toBe('COMPLETED');
  });

  it('triggers revalidation for material configuration changes', async () => {
    const fixture = await seedPhase13EFixture(app, prisma);
    const config = app.get(ConfigurationGovernanceService);

    const item = await config.registerConfigurationItem({
      key: `${NON_PRODUCTION_PHASE_13E_FIXTURE_MARKER}-config`,
      name: 'Integration endpoint base URL',
      currentVersion: '1.0.0',
      isMaterial: true,
    });

    const change = await config.submitConfigurationChange({
      configurationItemId: item.id,
      fromVersion: '1.0.0',
      toVersion: '1.1.0',
      changeDigest: 'config-change-digest',
      requesterIdentityId: fixture.identityId,
    });

    await config.applyConfigurationChange(change.id);

    const triggers = await prisma.releaseRevalidationTrigger.findMany({
      where: { sourceRecordId: change.id },
    });
    expect(triggers.length).toBeGreaterThan(0);
    expect(triggers[0]?.triggerType).toBe('MATERIAL_CONFIGURATION_CHANGE');
  });

  it('registers all required platform environment classifications', async () => {
    const registry = app.get(EnvironmentRegistryService);
    const marker = NON_PRODUCTION_PHASE_13E_FIXTURE_MARKER;

    const classifications = [
      PlatformEnvironmentClassification.LOCAL,
      PlatformEnvironmentClassification.DEVELOPMENT,
      PlatformEnvironmentClassification.INTEGRATION,
      PlatformEnvironmentClassification.SANDBOX,
      PlatformEnvironmentClassification.STAGING,
      PlatformEnvironmentClassification.PILOT,
      PlatformEnvironmentClassification.DISASTER_RECOVERY,
    ];

    for (const classification of classifications) {
      const environment = await registry.registerEnvironment({
        code: `${marker}-${classification}`,
        name: `${classification} environment`,
        classification,
        credentialsNamespace: `${marker}-${classification}-creds`,
        secretsNamespace: `${marker}-${classification}-secrets`,
        dataPartitionKey: `${marker}-${classification}-data`,
        integrationEndpointPrefix: `https://${classification.toLowerCase()}.local`,
      });
      expect(environment.classification).toBe(classification);
    }
  });
});
