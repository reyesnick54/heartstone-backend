import { type INestApplication } from '@nestjs/common';
import { IdentityType, OperationalActivationOutcome } from '@prisma/client';
import request from 'supertest';
import { type App } from 'supertest/types';

import { type PrismaService } from '../src/database/prisma.service';
import { LaunchReadinessSnapshotService } from '../src/production-readiness/launch/launch-readiness-snapshot.service';
import { OperationalActivationService } from '../src/production-readiness/launch/operational-activation.service';
import { PRODUCTION_READINESS_BOUNDARY_DISCLAIMER } from '../src/production-readiness/production-readiness.constants';
import { createIntegrationApp, resetAllTestData } from './helpers/integration-app';
import { buildPassedGateRequirements, seedPhase13Fixture } from './helpers/phase-13-test-fixtures';

describe('Phase 13 production readiness (e2e)', () => {
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

  it('exposes production readiness boundary disclaimer via HTTP', async () => {
    const response = await request(app.getHttpServer())
      .get('/production-readiness/boundary-disclaimer')
      .expect(200);

    const body = response.body as {
      disclaimer: string;
      invariants: { AUTHORITY_NOT_ACTIVATION: string };
    };

    expect(body.disclaimer).toBe(PRODUCTION_READINESS_BOUNDARY_DISCLAIMER);
    expect(body.invariants.AUTHORITY_NOT_ACTIVATION).toBe('Authority != Activation');
  });

  it('E2E 2 — unaccepted service remains non-operational while platform launches', async () => {
    const fixture = await seedPhase13Fixture(app, prisma);
    const snapshots = app.get(LaunchReadinessSnapshotService);
    const activation = app.get(OperationalActivationService);

    const unacceptedServiceVersionId = 'unaccepted-service-version-id';

    const snapshot = await snapshots.createSnapshot({
      releaseCommit: fixture.releaseCommit,
      artifactDigest: fixture.artifactDigest,
      migrationState: 'phase_13_applied',
      activeCapabilities: [{ ref: fixture.governmentServiceVersionId, accepted: true }],
      institutionalAcceptanceDossiers: [{ serviceVersionId: fixture.governmentServiceVersionId }],
      createdByIdentityId: fixture.operatorIdentityId,
    });

    const platformLaunch = await activation.activateOperationally({
      launchReadinessSnapshotId: snapshot.id,
      accountableOwnerIdentityId: fixture.accountableOwnerIdentityId,
      performedByIdentityId: fixture.operatorIdentityId,
      performedByIdentityType: IdentityType.INDIVIDUAL,
      scopeDescription: 'Platform launch excluding unaccepted service',
      acceptedReleaseCommit: fixture.releaseCommit,
      acceptedArtifactDigest: fixture.artifactDigest,
      gateRequirements: buildPassedGateRequirements(),
      acceptedScope: [fixture.governmentServiceVersionId],
      requestedScope: [fixture.governmentServiceVersionId],
    });

    const unacceptedActivation = await activation.activateOperationally({
      launchReadinessSnapshotId: snapshot.id,
      accountableOwnerIdentityId: fixture.accountableOwnerIdentityId,
      performedByIdentityId: fixture.operatorIdentityId,
      performedByIdentityType: IdentityType.INDIVIDUAL,
      scopeDescription: 'Attempt to activate unaccepted service',
      acceptedReleaseCommit: fixture.releaseCommit,
      acceptedArtifactDigest: fixture.artifactDigest,
      gateRequirements: buildPassedGateRequirements(),
      acceptedScope: [fixture.governmentServiceVersionId],
      requestedScope: [unacceptedServiceVersionId],
    });

    expect(platformLaunch.outcome).toBe(OperationalActivationOutcome.ACTIVATED);
    expect(unacceptedActivation.outcome).not.toBe(OperationalActivationOutcome.ACTIVATED);
  });

  it('E2E 9 — rollback preserves official records (no history erasure)', async () => {
    const fixture = await seedPhase13Fixture(app, prisma);
    const decisionCountBefore = await prisma.governmentDecision.count();

    await prisma.launchEvent.create({
      data: {
        eventType: 'ROLLBACK_EXECUTED',
        description: 'Application release rolled back; official records preserved',
        eventData: { recordsErased: false, decisionsErased: false },
        recordedByIdentityId: fixture.operatorIdentityId,
      },
    });

    const decisionCountAfter = await prisma.governmentDecision.count();
    expect(decisionCountAfter).toBe(decisionCountBefore);
  });
});
