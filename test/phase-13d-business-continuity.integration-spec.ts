import { type INestApplication } from '@nestjs/common';
import {
  BackupRecoverabilityStatus,
  BackupTargetType,
  ConfigurationConfirmationStatus,
  ContinuityScenarioType,
  RestoreTestResult,
} from '@prisma/client';
import { type App } from 'supertest/types';

import { type PrismaService } from '../src/database/prisma.service';
import { BackupRecoveryService } from '../src/operational-readiness/continuity/backup-recovery.service';
import { CriticalServiceService } from '../src/operational-readiness/continuity/critical-service.service';
import { ManualOperationService } from '../src/operational-readiness/continuity/manual-operation.service';
import { RecoveryExerciseService } from '../src/operational-readiness/continuity/recovery-exercise.service';
import { createIntegrationApp, resetAllTestData } from './helpers/integration-app';
import { seedPhase13DFixture } from './helpers/phase-13d-test-fixtures';

describe('Phase 13D business continuity (integration)', () => {
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

  it('creates critical service definition with TBD recovery objectives', async () => {
    const fixture = await seedPhase13DFixture(app, prisma);
    const criticalServices = app.get(CriticalServiceService);

    const definition = await criticalServices.createDefinition({
      serviceCode: 'CS-CASE-INTAKE',
      name: 'Case Intake',
      institutionalOwnerInstitutionId: fixture.institutionId,
      authorityBasisReference: 'TBD pending institutional confirmation',
      minimumServiceDescription: 'Accept and register inbound applications',
    });

    expect(definition.rtoConfirmationStatus).toBe(ConfigurationConfirmationStatus.TBD);
    expect(definition.rpoConfirmationStatus).toBe(ConfigurationConfirmationStatus.TBD);
    expect(definition.mtiConfirmationStatus).toBe(ConfigurationConfirmationStatus.TBD);
  });

  it('records successful backup without marking backup recoverable', async () => {
    const fixture = await seedPhase13DFixture(app, prisma);
    const backups = app.get(BackupRecoveryService);

    const definition = await backups.createBackupDefinition({
      backupCode: 'BK-DB-PRIMARY',
      name: 'Primary Database Backup',
      targetType: BackupTargetType.DATABASE,
      scopeDescription: 'PostgreSQL full backup',
      ownerIdentityId: fixture.identityId,
      ownerInstitutionId: fixture.institutionId,
    });

    await backups.recordBackupExecution({
      backupDefinitionId: definition.id,
      executionStartedAt: new Date('2026-01-01T00:00:00Z'),
      executionCompletedAt: new Date('2026-01-01T01:00:00Z'),
      success: true,
      encryptionVerified: true,
      checksumHash: 'abc123',
    });

    const updated = await prisma.backupDefinition.findUniqueOrThrow({
      where: { id: definition.id },
    });

    expect(updated.lastSuccessfulBackupAt).not.toBeNull();
    expect(updated.recoverabilityStatus).toBe(BackupRecoverabilityStatus.UNVERIFIED);
  });

  it('marks backup verified only after passing restore test', async () => {
    const fixture = await seedPhase13DFixture(app, prisma);
    const backups = app.get(BackupRecoveryService);

    const definition = await backups.createBackupDefinition({
      backupCode: 'BK-STORAGE',
      name: 'Evidence Storage Backup',
      targetType: BackupTargetType.STORAGE,
      scopeDescription: 'Object storage bucket',
      ownerIdentityId: fixture.identityId,
    });

    const execution = await backups.recordBackupExecution({
      backupDefinitionId: definition.id,
      executionStartedAt: new Date('2026-01-02T00:00:00Z'),
      executionCompletedAt: new Date('2026-01-02T01:00:00Z'),
      success: true,
    });

    const restoreTest = await backups.recordRestoreTest({
      backupDefinitionId: definition.id,
      backupExecutionRecordId: execution.id,
      testStartedAt: new Date('2026-01-03T00:00:00Z'),
      testedByIdentityId: fixture.identityId,
      backupAvailabilityVerified: true,
      decryptionVerified: true,
      integrityVerified: true,
      completenessVerified: true,
      databaseConsistencyVerified: true,
      objectIntegrityVerified: true,
      auditHistoryVerified: true,
      signatureHashVerified: true,
      applicationCompatibilityVerified: true,
      rpoAchieved: true,
      rtoAchieved: true,
    });

    expect(restoreTest.result).toBe(RestoreTestResult.PASSED);

    const updated = await prisma.backupDefinition.findUniqueOrThrow({
      where: { id: definition.id },
    });
    expect(updated.recoverabilityStatus).toBe(BackupRecoverabilityStatus.VERIFIED);
  });

  it('preserves manual original during manual-to-digital reconciliation', async () => {
    const fixture = await seedPhase13DFixture(app, prisma);
    const manualOps = app.get(ManualOperationService);

    const reconciliation = await manualOps.reconcileManualToDigital({
      manualRecordReference: 'MANUAL-REG-001',
      digitizedRepresentationReference: 'DIGITAL-REG-001',
      reconcilerIdentityId: fixture.identityId,
      comparisonNotes: 'Field-by-field comparison completed',
    });

    expect(reconciliation.manualOriginalPreserved).toBe(true);
    expect(reconciliation.manualRecordReference).toBe('MANUAL-REG-001');
  });

  it('plans architecture recovery exercises for all required scenario types', async () => {
    const fixture = await seedPhase13DFixture(app, prisma);
    const exercises = app.get(RecoveryExerciseService);

    expect(exercises.getArchitectureScenarioTypes()).toEqual(
      expect.arrayContaining([
        ContinuityScenarioType.DATABASE_OUTAGE,
        ContinuityScenarioType.AI_PROVIDER_OUTAGE,
        ContinuityScenarioType.CYBERATTACK,
      ]),
    );

    const exercise = await exercises.planExercise({
      scenarioType: ContinuityScenarioType.DATABASE_OUTAGE,
      title: 'Database outage tabletop',
      description: 'Architecture validation only',
      leadIdentityId: fixture.identityId,
      institutionId: fixture.institutionId,
    });

    expect(exercise.doesNotGuaranteeRecovery).toBe(true);
    expect(exercise.isArchitectureTest).toBe(true);
  });
});
