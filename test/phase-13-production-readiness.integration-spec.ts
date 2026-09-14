import { type INestApplication } from '@nestjs/common';
import {
  ExitAcceptanceOutcome,
  IdentityType,
  LaunchGateOutcome,
  OperationalActivationOutcome,
  OperationalRevalidationOutcome,
  OperationalRevalidationTrigger,
  OperationalSuspensionScope,
  OperationalSuspensionStatus,
  ProductionCorrectiveActionStatus,
  ProductionDefectSeverity,
  StabilizationObservationCategory,
} from '@prisma/client';
import { type App } from 'supertest/types';

import { type PrismaService } from '../src/database/prisma.service';
import { LaunchGateService } from '../src/production-readiness/launch/launch-gate.service';
import { LaunchReadinessSnapshotService } from '../src/production-readiness/launch/launch-readiness-snapshot.service';
import { OperationalActivationService } from '../src/production-readiness/launch/operational-activation.service';
import {
  CapabilityReplacementService,
  CapabilityRetirementService,
  DecommissioningService,
  ExitAcceptanceService,
} from '../src/production-readiness/lifecycle/decommissioning.service';
import {
  ProductionDefectService,
  StabilizationService,
} from '../src/production-readiness/stabilization/stabilization.service';
import {
  OperationalRevalidationService,
  OperationalSuspensionService,
} from '../src/production-readiness/suspension/operational-suspension.service';
import { createIntegrationApp, resetAllTestData } from './helpers/integration-app';
import { buildPassedGateRequirements, seedPhase13Fixture } from './helpers/phase-13-test-fixtures';

describe('Phase 13 production readiness (integration)', () => {
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

  it('E2E 1 — clean production launch records operational activation when gate passes', async () => {
    const fixture = await seedPhase13Fixture(app, prisma);
    const snapshots = app.get(LaunchReadinessSnapshotService);
    const activation = app.get(OperationalActivationService);

    const snapshot = await snapshots.createSnapshot({
      releaseCommit: fixture.releaseCommit,
      artifactDigest: fixture.artifactDigest,
      migrationState: 'phase_13_applied',
      activeCapabilities: [{ ref: fixture.governmentServiceVersionId, accepted: true }],
      institutionalAcceptanceDossiers: [{ serviceVersionId: fixture.governmentServiceVersionId }],
      securityReadiness: { accepted: true },
      continuityReadiness: { restoreTested: true, exercisePassed: true },
      createdByIdentityId: fixture.operatorIdentityId,
    });

    const result = await activation.activateOperationally({
      launchReadinessSnapshotId: snapshot.id,
      accountableOwnerIdentityId: fixture.accountableOwnerIdentityId,
      performedByIdentityId: fixture.operatorIdentityId,
      performedByIdentityType: IdentityType.INDIVIDUAL,
      scopeDescription: 'Accepted national launch scope',
      acceptedReleaseCommit: fixture.releaseCommit,
      acceptedArtifactDigest: fixture.artifactDigest,
      gateRequirements: buildPassedGateRequirements(),
      acceptedScope: [fixture.governmentServiceVersionId],
      requestedScope: [fixture.governmentServiceVersionId],
    });

    expect(result.outcome).toBe(OperationalActivationOutcome.ACTIVATED);
    expect(result.gateOutcome).toBe(LaunchGateOutcome.PASSED);
    expect(result.record?.newStatus).toBe('ACTIVATED');
  });

  it('E2E 8 — major defect blocks issuance via scoped suspension path', async () => {
    const fixture = await seedPhase13Fixture(app, prisma);
    const defects = app.get(ProductionDefectService);
    const suspensions = app.get(OperationalSuspensionService);

    const defect = await defects.recordDefect({
      title: 'Issuance authentication failure',
      description: 'Issuance pipeline cannot authenticate instruments',
      severity: ProductionDefectSeverity.MAJOR,
      affectedCapabilityRef: 'issuance-capability',
      discoveryContext: 'production monitoring',
      reportedByIdentityId: fixture.operatorIdentityId,
      mayTriggerSafeHalt: true,
    });

    const action = await defects.assignCorrectiveAction({
      productionDefectId: defect.id,
      actionDescription: 'Suspend issuance pending fix',
      assignedToIdentityId: fixture.operatorIdentityId,
    });

    await defects.verifyAndCloseCorrectiveAction({
      correctiveActionId: action.id,
      verifiedByIdentityId: fixture.operatorIdentityId,
      verificationNotes: 'Issuance suspended; applications continue to safe boundary only',
    });

    const suspension = await suspensions.issueSuspension({
      scope: OperationalSuspensionScope.ISSUANCE_CAPABILITY,
      targetReference: 'issuance-capability',
      reason: `Production defect ${defect.defectNumber}`,
      suspendedByIdentityId: fixture.operatorIdentityId,
    });

    expect(suspension.status).toBe(OperationalSuspensionStatus.ACTIVE);
    expect(suspension.preserveRecords).toBe(true);
    expect(action.status).toBe(ProductionCorrectiveActionStatus.VERIFIED);
  });

  it('E2E 10 — material change triggers revalidation requirement', async () => {
    const fixture = await seedPhase13Fixture(app, prisma);
    const revalidations = app.get(OperationalRevalidationService);

    const revalidation = await revalidations.requireRevalidation({
      triggerReason: OperationalRevalidationTrigger.AI_MODEL_CHANGE,
      triggerDescription: 'Production AI model version changed',
      targetCapabilityRef: 'ai-case-summary',
      scopeDescription: 'AI-assisted case summary use case',
      recordedByIdentityId: fixture.operatorIdentityId,
    });

    expect(revalidation.outcome).toBeNull();

    const completed = await revalidations.completeRevalidation({
      revalidationId: revalidation.id,
      outcome: OperationalRevalidationOutcome.SUSPEND,
      outcomeNotes: 'Suspended pending institutional review',
      conductedByIdentityId: fixture.operatorIdentityId,
    });

    expect(completed.outcome).toBe(OperationalRevalidationOutcome.SUSPEND);
    expect(completed.completedAt).not.toBeNull();
  });

  it('E2E 11 — partial department suspension does not suspend unrelated departments', async () => {
    const fixture = await seedPhase13Fixture(app, prisma);
    const suspensions = app.get(OperationalSuspensionService);

    await suspensions.issueSuspension({
      scope: OperationalSuspensionScope.DEPARTMENT,
      targetReference: fixture.departmentId,
      reason: 'Department-specific incident',
      suspendedByIdentityId: fixture.operatorIdentityId,
    });

    const unrelatedActive = await suspensions.getActiveSuspensionsForTarget(
      OperationalSuspensionScope.DEPARTMENT,
      'unrelated-department-id',
    );

    expect(unrelatedActive).toHaveLength(0);
  });

  it('E2E 12 — retirement, replacement, decommissioning, and exit acceptance preserve records', async () => {
    const fixture = await seedPhase13Fixture(app, prisma);
    const retirements = app.get(CapabilityRetirementService);
    const replacements = app.get(CapabilityReplacementService);
    const decommissioning = app.get(DecommissioningService);
    const exit = app.get(ExitAcceptanceService);

    const retirement = await retirements.recordRetirement({
      capabilityRef: 'legacy-service-v1',
      capabilityType: 'SERVICE',
      reason: 'Superseded by successor',
      effectiveAt: new Date(),
      authorizedByIdentityId: fixture.operatorIdentityId,
      successorCapabilityRef: 'successor-service-v2',
      recordsPreserved: true,
      credentialsRevoked: true,
      integrationsShutdown: true,
    });

    const replacement = await replacements.planReplacement({
      predecessorCapabilityRef: 'legacy-service-v1',
      successorCapabilityRef: 'successor-service-v2',
      predecessorRetirementId: retirement.id,
    });

    await replacements.acceptSuccessor({
      replacementId: replacement.id,
      acceptanceRecordRef: 'institutional-acceptance-ref-001',
    });

    const plan = await decommissioning.createPlan({
      targetSystemRef: 'legacy-service-v1',
      recordsDisposition: { preserve: true },
      legalHolds: [{ holdRef: 'hold-001' }],
    });

    await decommissioning.approvePlan(plan.id, fixture.accountableOwnerIdentityId);

    const execution = await decommissioning.executePlan({
      decommissioningPlanId: plan.id,
      executedByIdentityId: fixture.operatorIdentityId,
      executionNotes: 'Legacy capability decommissioned; records preserved',
      executedSteps: [{ step: 'revoke_credentials' }, { step: 'shutdown_integrations' }],
      credentialShutdowns: [
        {
          credentialRef: 'legacy-api-key',
          credentialType: 'API_KEY',
          shutdownReason: 'Capability retired',
        },
      ],
    });

    const preservation = await decommissioning.createRecordsPreservationManifest({
      preservedRecords: [{ ref: 'legacy-service-v1-records' }],
      createdByIdentityId: fixture.operatorIdentityId,
    });

    const exportManifest = await decommissioning.createDataExportManifest({
      exportScope: { system: 'legacy-service-v1' },
      dataCategories: ['official_records', 'audit_logs'],
      formatDescription: 'JSON lines with verification hash',
    });

    await decommissioning.verifyDataExportManifest({
      manifestId: exportManifest.id,
      verifiedByIdentityId: fixture.accountableOwnerIdentityId,
    });

    const exitRecord = await exit.recordExitAcceptance({
      decommissioningExecutionId: execution.id,
      institutionalAcceptorIdentityId: fixture.accountableOwnerIdentityId,
      acceptanceOutcome: ExitAcceptanceOutcome.ACCEPTED,
      acceptanceNotes:
        'Institutional exit acceptance recorded; records preserved and export verified',
    });

    expect(retirement.recordsPreserved).toBe(true);
    expect(preservation.verificationHash).toBeTruthy();
    expect(exportManifest.isUsable).toBe(false);
    expect(exitRecord.acceptanceOutcome).toBe(ExitAcceptanceOutcome.ACCEPTED);
  });

  it('launch gate blocks activation when blocking requirements fail', async () => {
    const fixture = await seedPhase13Fixture(app, prisma);
    const snapshots = app.get(LaunchReadinessSnapshotService);
    const gates = app.get(LaunchGateService);

    const snapshot = await snapshots.createSnapshot({
      releaseCommit: fixture.releaseCommit,
      artifactDigest: fixture.artifactDigest,
      migrationState: 'phase_13_applied',
      knownDefects: [{ severity: 'CRITICAL', status: 'OPEN', title: 'Blocking defect' }],
      createdByIdentityId: fixture.operatorIdentityId,
    });

    const requirements = buildPassedGateRequirements();
    requirements.no_unresolved_blocking_defect = false;
    requirements.security_readiness_accepted = false;

    const evaluation = await gates.evaluateGate({
      snapshotId: snapshot.id,
      requirements,
      recordedByIdentityId: fixture.operatorIdentityId,
    });

    expect(evaluation.gateOutcome).toBe(LaunchGateOutcome.BLOCKED);
    expect(evaluation.unmetRequirements.length).toBeGreaterThan(0);
  });

  it('stabilization records observations across monitoring categories', async () => {
    const fixture = await seedPhase13Fixture(app, prisma);
    const snapshots = app.get(LaunchReadinessSnapshotService);
    const activation = app.get(OperationalActivationService);
    const stabilization = app.get(StabilizationService);

    const snapshot = await snapshots.createSnapshot({
      releaseCommit: fixture.releaseCommit,
      artifactDigest: fixture.artifactDigest,
      migrationState: 'phase_13_applied',
      createdByIdentityId: fixture.operatorIdentityId,
    });

    const activationResult = await activation.activateOperationally({
      launchReadinessSnapshotId: snapshot.id,
      accountableOwnerIdentityId: fixture.accountableOwnerIdentityId,
      performedByIdentityId: fixture.operatorIdentityId,
      performedByIdentityType: IdentityType.INDIVIDUAL,
      scopeDescription: 'Stabilization test scope',
      acceptedReleaseCommit: fixture.releaseCommit,
      acceptedArtifactDigest: fixture.artifactDigest,
      gateRequirements: buildPassedGateRequirements(),
      acceptedScope: [fixture.governmentServiceVersionId],
      requestedScope: [fixture.governmentServiceVersionId],
    });

    const monitoringPlan = await stabilization.createMonitoringPlan({
      name: 'Post-launch monitoring',
      description: 'Initial stabilization monitoring',
      incidentProcessRef: 'incident-process-v1',
      ownerIdentityId: fixture.operatorIdentityId,
      effectiveFrom: new Date(),
    });

    expect(activationResult.record).toBeDefined();
    if (!activationResult.record) {
      throw new Error('Expected activation record');
    }

    const period = await stabilization.startStabilizationPeriod({
      operationalActivationRecordId: activationResult.record.id,
      monitoringPlanId: monitoringPlan.id,
      startAt: new Date(),
      plannedEndAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      recordedByIdentityId: fixture.operatorIdentityId,
    });

    const observation = await stabilization.recordObservation({
      stabilizationPeriodId: period.id,
      category: StabilizationObservationCategory.PERFORMANCE,
      observationText: 'P95 latency within SLO during stabilization window',
      recordedByIdentityId: fixture.operatorIdentityId,
    });

    expect(observation.category).toBe(StabilizationObservationCategory.PERFORMANCE);
    expect(period.status).toBe('ACTIVE');
  });
});
