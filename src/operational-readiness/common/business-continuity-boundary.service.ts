import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import {
  BacklogPriorityBasis,
  BackupRecoverabilityStatus,
  ContinuityCorrectiveActionStatus,
  ContinuityOperatingMode,
  ManualOperationAuthorizationStatus,
  RecoveryExerciseStatus,
  RestoreTestResult,
  ResumptionAuthorizationStatus,
} from '@prisma/client';

import {
  CONTINUITY_OPERATING_MODES,
  FORBIDDEN_BACKLOG_PRIORITY_BASES,
  FORBIDDEN_CLIENT_BACKUP_FIELDS,
  FORBIDDEN_CLIENT_RESTORE_TEST_FIELDS,
  FORBIDDEN_CLIENT_RESUMPTION_FIELDS,
  INSECURE_COMMUNICATION_FALLBACK_PATTERNS,
  PRODUCTION_READINESS_REASON_CODES,
  RESTORE_TEST_PASSING_RESULTS,
  RESTORE_TEST_VERIFICATION_FIELDS,
} from '../business-continuity.constants';

export interface RestoreTestVerificationInput {
  result: RestoreTestResult;
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
}

@Injectable()
export class BusinessContinuityBoundaryService {
  assertBackupIsNotRecovery(operationLabel: string): void {
    if (/recovery complete|service restored|institutional resumption/i.test(operationLabel)) {
      throw new BadRequestException(PRODUCTION_READINESS_REASON_CODES.BACKUP_NOT_RECOVERY);
    }
  }

  assertRestoreCompletedIsNotIntegrityVerified(
    restoreCompleted: boolean,
    integrityVerified: boolean,
  ): void {
    if (restoreCompleted && !integrityVerified) {
      throw new BadRequestException(
        PRODUCTION_READINESS_REASON_CODES.RESTORE_NOT_INTEGRITY_VERIFIED,
      );
    }
  }

  assertTechnicalRestorationIsNotInstitutionalResumption(
    technicalRecoveryComplete: boolean,
    institutionalResumptionAuthorized: boolean,
  ): void {
    if (technicalRecoveryComplete && !institutionalResumptionAuthorized) {
      throw new ForbiddenException(
        PRODUCTION_READINESS_REASON_CODES.TECHNICAL_RESTORATION_NOT_RESUMPTION,
      );
    }
  }

  assertEmergencyAuthorityIsTimeBounded(expiresAt: Date | null | undefined): void {
    if (!expiresAt) {
      throw new BadRequestException(
        PRODUCTION_READINESS_REASON_CODES.MANUAL_AUTHORIZATION_EXPIRATION_REQUIRED,
      );
    }
  }

  assertEmergencyAuthorityNotExpired(expiresAt: Date, at: Date = new Date()): void {
    if (expiresAt <= at) {
      throw new ForbiddenException(PRODUCTION_READINESS_REASON_CODES.EMERGENCY_AUTHORITY_EXPIRED);
    }
  }

  assertEmergencyAuthorityCannotSilentlyContinue(
    status: ManualOperationAuthorizationStatus,
    expiresAt: Date,
    at: Date = new Date(),
  ): void {
    if (
      (status === ManualOperationAuthorizationStatus.ACTIVE ||
        status === ManualOperationAuthorizationStatus.AUTHORIZED) &&
      expiresAt <= at
    ) {
      throw new ForbiddenException(PRODUCTION_READINESS_REASON_CODES.EMERGENCY_AUTHORITY_EXPIRED);
    }
  }

  assertManualOperationNotAuthorityBypass(bypassAuthorityRequested: boolean): void {
    if (bypassAuthorityRequested) {
      throw new ForbiddenException(PRODUCTION_READINESS_REASON_CODES.MANUAL_MODE_AUTHORITY_BYPASS);
    }
  }

  assertManualOperationSegregation(
    actorIdentityId: string,
    authorizerIdentityId: string,
    segregatedApproverIdentityId: string,
  ): void {
    if (
      actorIdentityId === authorizerIdentityId ||
      actorIdentityId === segregatedApproverIdentityId
    ) {
      throw new ForbiddenException(PRODUCTION_READINESS_REASON_CODES.MANUAL_MODE_SOD_BYPASS);
    }
    if (authorizerIdentityId === segregatedApproverIdentityId) {
      throw new ForbiddenException(PRODUCTION_READINESS_REASON_CODES.MANUAL_MODE_SOD_BYPASS);
    }
  }

  assertDisasterNotWaiverOfMandatoryRequirement(waiverRequested: boolean): void {
    if (waiverRequested) {
      throw new ForbiddenException(
        PRODUCTION_READINESS_REASON_CODES.DISASTER_NOT_REQUIREMENT_WAIVER,
      );
    }
  }

  assertContinuityModeNotNormalProduction(mode: ContinuityOperatingMode): void {
    if (mode !== ContinuityOperatingMode.NORMAL) {
      throw new BadRequestException(
        PRODUCTION_READINESS_REASON_CODES.CONTINUITY_NOT_NORMAL_PRODUCTION,
      );
    }
  }

  assertUntestedBackupCannotBeRecoverable(
    recoverabilityStatus: BackupRecoverabilityStatus,
    hasPassingRestoreTest: boolean,
  ): void {
    if (recoverabilityStatus === BackupRecoverabilityStatus.VERIFIED && !hasPassingRestoreTest) {
      throw new BadRequestException(
        PRODUCTION_READINESS_REASON_CODES.UNTESTED_BACKUP_NOT_RECOVERABLE,
      );
    }
  }

  assertUnverifiedBackupCannotSupportReadiness(
    recoverabilityStatus: BackupRecoverabilityStatus,
  ): void {
    if (recoverabilityStatus === BackupRecoverabilityStatus.UNVERIFIED) {
      throw new BadRequestException(PRODUCTION_READINESS_REASON_CODES.UNVERIFIED_BACKUP_READINESS);
    }
  }

  assertCorruptRestoreRejected(result: RestoreTestResult, integrityVerified: boolean): void {
    if (
      result === RestoreTestResult.FAILED ||
      (!integrityVerified && result !== RestoreTestResult.UNVERIFIED)
    ) {
      throw new BadRequestException(PRODUCTION_READINESS_REASON_CODES.CORRUPT_RESTORE_REJECTED);
    }
  }

  assertRestoreWithoutIntegrityValidationRejected(input: RestoreTestVerificationInput): void {
    const completedWithoutIntegrity =
      input.result !== RestoreTestResult.UNVERIFIED && !input.integrityVerified;
    if (completedWithoutIntegrity) {
      throw new BadRequestException(
        PRODUCTION_READINESS_REASON_CODES.RESTORE_WITHOUT_INTEGRITY_REJECTED,
      );
    }
  }

  assertManualOriginalPreserved(manualOriginalPreserved: boolean): void {
    if (!manualOriginalPreserved) {
      throw new ForbiddenException(PRODUCTION_READINESS_REASON_CODES.MANUAL_ORIGINAL_NOT_PRESERVED);
    }
  }

  assertEmergencyCredentialNotShared(sharedCredentialUseDetected: boolean): void {
    if (sharedCredentialUseDetected) {
      throw new ForbiddenException(PRODUCTION_READINESS_REASON_CODES.EMERGENCY_CREDENTIAL_SHARED);
    }
  }

  assertIntegrationOutageCannotWaiveMandatoryVerification(waiverRequested: boolean): void {
    if (waiverRequested) {
      throw new ForbiddenException(
        PRODUCTION_READINESS_REASON_CODES.INTEGRATION_OUTAGE_VERIFICATION_WAIVER,
      );
    }
  }

  assertAiCannotSubstituteUnavailableRegulator(aiActorRequested: boolean): void {
    if (aiActorRequested) {
      throw new ForbiddenException(
        PRODUCTION_READINESS_REASON_CODES.AI_CANNOT_SUBSTITUTE_REGULATOR,
      );
    }
  }

  assertTechnicalRecoveryCannotResumeAutomatically(autoResumeRequested: boolean): void {
    if (autoResumeRequested) {
      throw new ForbiddenException(
        PRODUCTION_READINESS_REASON_CODES.TECHNICAL_AUTO_RESUMPTION_FORBIDDEN,
      );
    }
  }

  assertInstitutionalResumptionAuthorizationRequired(
    authorizationStatus: ResumptionAuthorizationStatus | null | undefined,
  ): void {
    if (authorizationStatus !== ResumptionAuthorizationStatus.GRANTED) {
      throw new ForbiddenException(
        PRODUCTION_READINESS_REASON_CODES.INSTITUTIONAL_RESUMPTION_REQUIRED,
      );
    }
  }

  assertInsecureCommunicationFallbackBlocked(fallbackMode: string): void {
    for (const pattern of INSECURE_COMMUNICATION_FALLBACK_PATTERNS) {
      if (pattern.test(fallbackMode)) {
        throw new ForbiddenException(
          PRODUCTION_READINESS_REASON_CODES.INSECURE_COMMUNICATION_FALLBACK,
        );
      }
    }
  }

  assertBacklogCannotUseArbitraryFavoritism(
    priorityBasis: BacklogPriorityBasis,
    approvedCriteriaDocumentReference?: string | null,
  ): void {
    if (
      (FORBIDDEN_BACKLOG_PRIORITY_BASES as readonly BacklogPriorityBasis[]).includes(
        priorityBasis,
      ) &&
      !approvedCriteriaDocumentReference
    ) {
      throw new ForbiddenException(PRODUCTION_READINESS_REASON_CODES.BACKLOG_ARBITRARY_FAVORITISM);
    }
  }

  assertRecoveryExerciseNotGuarantee(
    _exerciseStatus: RecoveryExerciseStatus,
    representedAsGuarantee: boolean,
  ): void {
    if (representedAsGuarantee) {
      throw new BadRequestException(PRODUCTION_READINESS_REASON_CODES.EXERCISE_NOT_GUARANTEE);
    }
  }

  assertFailedRecoveryCorrectiveActionRemainsOpen(
    correctiveActionStatus: ContinuityCorrectiveActionStatus,
    recoveryFailed: boolean,
  ): void {
    if (
      recoveryFailed &&
      (correctiveActionStatus === ContinuityCorrectiveActionStatus.CLOSED ||
        correctiveActionStatus === ContinuityCorrectiveActionStatus.VERIFIED)
    ) {
      throw new BadRequestException(
        PRODUCTION_READINESS_REASON_CODES.FAILED_RECOVERY_CORRECTIVE_OPEN,
      );
    }
  }

  assertSuspendedAiRemainsSuspendedUnlessReauthorized(
    aiSuspended: boolean,
    reauthorized: boolean,
  ): void {
    if (aiSuspended && !reauthorized) {
      throw new ForbiddenException(
        PRODUCTION_READINESS_REASON_CODES.SUSPENDED_AI_REAUTHORIZATION_REQUIRED,
      );
    }
  }

  assertNamedInstitutionalActorPresent(
    officeholderId: string | null | undefined,
    identityId: string | null | undefined,
  ): void {
    if (!officeholderId || !identityId) {
      throw new ForbiddenException(PRODUCTION_READINESS_REASON_CODES.ANONYMOUS_EMERGENCY_DECISION);
    }
  }

  rejectClientBackupFields(payload: Record<string, unknown>): void {
    for (const field of FORBIDDEN_CLIENT_BACKUP_FIELDS) {
      if (field in payload && payload[field] !== undefined) {
        throw new ForbiddenException(`Client may not set backup field "${field}"`);
      }
    }
  }

  rejectClientRestoreTestFields(payload: Record<string, unknown>): void {
    for (const field of FORBIDDEN_CLIENT_RESTORE_TEST_FIELDS) {
      if (field in payload && payload[field] !== undefined) {
        throw new ForbiddenException(`Client may not set restore test field "${field}"`);
      }
    }
  }

  rejectClientResumptionFields(payload: Record<string, unknown>): void {
    for (const field of FORBIDDEN_CLIENT_RESUMPTION_FIELDS) {
      if (field in payload && payload[field] !== undefined) {
        throw new ForbiddenException(`Client may not set resumption field "${field}"`);
      }
    }
  }

  deriveRestoreTestResult(input: RestoreTestVerificationInput): RestoreTestResult {
    if (input.result === RestoreTestResult.UNVERIFIED && !input.integrityVerified) {
      return RestoreTestResult.FAILED;
    }

    this.assertRestoreWithoutIntegrityValidationRejected(input);

    if (input.result === RestoreTestResult.UNVERIFIED) {
      return RestoreTestResult.UNVERIFIED;
    }

    const verificationValues = RESTORE_TEST_VERIFICATION_FIELDS.map(
      (field) => input[field as keyof RestoreTestVerificationInput],
    );
    const allVerified = verificationValues.every((value) => value === true);

    if (!input.integrityVerified || input.result === RestoreTestResult.FAILED) {
      return RestoreTestResult.FAILED;
    }

    if (!allVerified) {
      return RestoreTestResult.PASSED_WITH_LIMITATIONS;
    }

    return RestoreTestResult.PASSED;
  }

  isPassingRestoreResult(result: RestoreTestResult): boolean {
    return (RESTORE_TEST_PASSING_RESULTS as readonly RestoreTestResult[]).includes(result);
  }

  assertOperatingModeIsContinuityCapable(mode: ContinuityOperatingMode): boolean {
    return CONTINUITY_OPERATING_MODES.includes(mode);
  }
}
