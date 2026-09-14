import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import {
  BackupDefinition,
  BackupDefinitionStatus,
  BackupExecutionRecord,
  BackupRecoverabilityStatus,
  BackupTargetType,
  ConfigurationConfirmationStatus,
  ContinuityCorrectiveActionSourceType,
  ContinuityCorrectiveActionStatus,
  RestoreTest,
  RestoreTestResult,
} from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import {
  BACKUP_DEFINITION_PREFIX,
  CORRECTIVE_ACTION_PREFIX,
  RESTORE_TEST_PREFIX,
} from '../business-continuity.constants';
import { BusinessContinuityBoundaryService } from '../common/business-continuity-boundary.service';

export interface CreateBackupDefinitionInput {
  backupCode: string;
  name: string;
  targetType: BackupTargetType;
  scopeDescription: string;
  ownerIdentityId: string;
  ownerInstitutionId?: string;
  scheduleExpression?: string;
  encryptionMethod?: string;
  retentionPolicyDescription?: string;
  verificationProcedureReference?: string;
}

export interface RecordBackupExecutionInput {
  backupDefinitionId: string;
  executionStartedAt: Date;
  executionCompletedAt?: Date;
  success: boolean;
  backupLocationReference?: string;
  encryptionVerified?: boolean;
  sizeBytes?: bigint;
  checksumHash?: string;
  notes?: string;
}

export interface RecordRestoreTestInput {
  backupDefinitionId: string;
  backupExecutionRecordId?: string;
  testStartedAt: Date;
  testedByIdentityId: string;
  backupAvailabilityVerified: boolean;
  decryptionVerified: boolean;
  integrityVerified: boolean;
  completenessVerified: boolean;
  databaseConsistencyVerified: boolean;
  objectIntegrityVerified: boolean;
  auditHistoryVerified: boolean;
  signatureHashVerified: boolean;
  applicationCompatibilityVerified: boolean;
  rpoAchieved: boolean;
  rtoAchieved: boolean;
  limitationsNotes?: string;
  corruptRestoreDetected?: boolean;
}

@Injectable()
export class BackupRecoveryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly boundary: BusinessContinuityBoundaryService,
  ) {}

  async createBackupDefinition(input: CreateBackupDefinitionInput): Promise<BackupDefinition> {
    this.boundary.rejectClientBackupFields(input as unknown as Record<string, unknown>);

    return this.prisma.backupDefinition.create({
      data: {
        backupCode: input.backupCode || `${BACKUP_DEFINITION_PREFIX}-${input.name}`,
        name: input.name,
        targetType: input.targetType,
        scopeDescription: input.scopeDescription,
        ownerIdentityId: input.ownerIdentityId,
        ownerInstitutionId: input.ownerInstitutionId,
        scheduleExpression: input.scheduleExpression,
        scheduleConfirmationStatus: input.scheduleExpression
          ? ConfigurationConfirmationStatus.UNCONFIRMED
          : ConfigurationConfirmationStatus.TBD,
        encryptionMethod: input.encryptionMethod,
        encryptionConfirmationStatus: input.encryptionMethod
          ? ConfigurationConfirmationStatus.UNCONFIRMED
          : ConfigurationConfirmationStatus.TBD,
        retentionPolicyDescription: input.retentionPolicyDescription,
        retentionConfirmationStatus: input.retentionPolicyDescription
          ? ConfigurationConfirmationStatus.UNCONFIRMED
          : ConfigurationConfirmationStatus.TBD,
        verificationProcedureReference: input.verificationProcedureReference,
        recoverabilityStatus: BackupRecoverabilityStatus.UNVERIFIED,
        status: BackupDefinitionStatus.DRAFT,
      },
    });
  }

  async recordBackupExecution(input: RecordBackupExecutionInput): Promise<BackupExecutionRecord> {
    this.boundary.assertBackupIsNotRecovery(input.notes ?? 'backup execution');

    const definition = await this.getBackupDefinitionOrThrow(input.backupDefinitionId);

    const record = await this.prisma.backupExecutionRecord.create({
      data: {
        backupDefinitionId: definition.id,
        executionStartedAt: input.executionStartedAt,
        executionCompletedAt: input.executionCompletedAt,
        success: input.success,
        backupLocationReference: input.backupLocationReference,
        encryptionVerified: input.encryptionVerified ?? false,
        sizeBytes: input.sizeBytes,
        checksumHash: input.checksumHash,
        notes: input.notes,
      },
    });

    if (input.success) {
      await this.prisma.backupDefinition.update({
        where: { id: definition.id },
        data: {
          lastSuccessfulBackupAt: input.executionCompletedAt ?? new Date(),
        },
      });
    }

    return record;
  }

  async recordRestoreTest(input: RecordRestoreTestInput): Promise<RestoreTest> {
    const definition = await this.getBackupDefinitionOrThrow(input.backupDefinitionId);

    if (input.corruptRestoreDetected) {
      this.boundary.assertCorruptRestoreRejected(RestoreTestResult.FAILED, false);
    }

    const provisionalResult = this.boundary.deriveRestoreTestResult({
      result: RestoreTestResult.UNVERIFIED,
      backupAvailabilityVerified: input.backupAvailabilityVerified,
      decryptionVerified: input.decryptionVerified,
      integrityVerified: input.integrityVerified,
      completenessVerified: input.completenessVerified,
      databaseConsistencyVerified: input.databaseConsistencyVerified,
      objectIntegrityVerified: input.objectIntegrityVerified,
      auditHistoryVerified: input.auditHistoryVerified,
      signatureHashVerified: input.signatureHashVerified,
      applicationCompatibilityVerified: input.applicationCompatibilityVerified,
      rpoAchieved: input.rpoAchieved,
      rtoAchieved: input.rtoAchieved,
    });

    const count = await this.prisma.restoreTest.count();
    const testReference = `${RESTORE_TEST_PREFIX}-${String(count + 1).padStart(6, '0')}`;

    const restoreTest = await this.prisma.restoreTest.create({
      data: {
        testReference,
        backupDefinitionId: definition.id,
        backupExecutionRecordId: input.backupExecutionRecordId,
        testStartedAt: input.testStartedAt,
        testCompletedAt: new Date(),
        result: provisionalResult,
        backupAvailabilityVerified: input.backupAvailabilityVerified,
        decryptionVerified: input.decryptionVerified,
        integrityVerified: input.integrityVerified,
        completenessVerified: input.completenessVerified,
        databaseConsistencyVerified: input.databaseConsistencyVerified,
        objectIntegrityVerified: input.objectIntegrityVerified,
        auditHistoryVerified: input.auditHistoryVerified,
        signatureHashVerified: input.signatureHashVerified,
        applicationCompatibilityVerified: input.applicationCompatibilityVerified,
        rpoAchieved: input.rpoAchieved,
        rtoAchieved: input.rtoAchieved,
        limitationsNotes: input.limitationsNotes,
        testedByIdentityId: input.testedByIdentityId,
      },
    });

    const recoverabilityStatus =
      provisionalResult === RestoreTestResult.PASSED ||
      provisionalResult === RestoreTestResult.PASSED_WITH_LIMITATIONS
        ? BackupRecoverabilityStatus.VERIFIED
        : provisionalResult === RestoreTestResult.FAILED
          ? BackupRecoverabilityStatus.FAILED_VERIFICATION
          : BackupRecoverabilityStatus.UNVERIFIED;

    await this.prisma.backupDefinition.update({
      where: { id: definition.id },
      data: {
        lastTestedRestoreAt: new Date(),
        recoverabilityStatus,
      },
    });

    if (provisionalResult === RestoreTestResult.FAILED) {
      const actionCount = await this.prisma.continuityCorrectiveAction.count();
      await this.prisma.continuityCorrectiveAction.create({
        data: {
          correctiveActionReference: `${CORRECTIVE_ACTION_PREFIX}-${String(actionCount + 1).padStart(6, '0')}`,
          sourceType: ContinuityCorrectiveActionSourceType.RESTORE_TEST,
          sourceReferenceId: restoreTest.id,
          restoreTestId: restoreTest.id,
          description:
            'Restore test failed; corrective action required before recoverability claim',
          status: ContinuityCorrectiveActionStatus.OPEN,
        },
      });
    }

    return restoreTest;
  }

  assertRecoverabilityClaim(definition: BackupDefinition): void {
    this.boundary.assertUnverifiedBackupCannotSupportReadiness(definition.recoverabilityStatus);
    this.boundary.assertUntestedBackupCannotBeRecoverable(
      definition.recoverabilityStatus,
      definition.recoverabilityStatus === BackupRecoverabilityStatus.VERIFIED,
    );
  }

  async assertRecoverabilityClaimById(backupDefinitionId: string): Promise<void> {
    const definition = await this.getBackupDefinitionOrThrow(backupDefinitionId);
    this.assertRecoverabilityClaim(definition);
  }

  async getBackupDefinitionOrThrow(id: string): Promise<BackupDefinition> {
    const definition = await this.prisma.backupDefinition.findUnique({ where: { id } });
    if (!definition) {
      throw new NotFoundException(`BackupDefinition ${id} not found`);
    }
    return definition;
  }

  rejectRestoreWithoutIntegrityValidation(integrityVerified: boolean): void {
    if (!integrityVerified) {
      throw new BadRequestException('Restore without integrity validation is rejected');
    }
  }
}
