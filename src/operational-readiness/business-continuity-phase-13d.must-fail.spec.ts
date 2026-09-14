import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import {
  BacklogPriorityBasis,
  BackupRecoverabilityStatus,
  ContinuityCorrectiveActionStatus,
  ManualOperationAuthorizationStatus,
  RecoveryExerciseStatus,
  RestoreTestResult,
  ResumptionAuthorizationStatus,
} from '@prisma/client';

import {
  CONTINUITY_SCENARIO_TYPES,
  FORBIDDEN_BACKLOG_PRIORITY_BASES,
  PHASE_13D_BOUNDARY_DISCLAIMER,
  PRODUCTION_READINESS_BOUNDARY_DISCLAIMER,
  PRODUCTION_READINESS_REASON_CODES,
} from './business-continuity.constants';
import { BusinessContinuityBoundaryService } from './common/business-continuity-boundary.service';
import { BackupRecoveryService } from './continuity/backup-recovery.service';
import { ResumptionService } from './continuity/resumption.service';

describe('Phase 13D must-fail invariants', () => {
  describe('BusinessContinuityBoundaryService', () => {
    let boundary: BusinessContinuityBoundaryService;

    beforeEach(async () => {
      const module = await Test.createTestingModule({
        providers: [BusinessContinuityBoundaryService],
      }).compile();
      boundary = module.get(BusinessContinuityBoundaryService);
    });

    it('exposes production readiness boundary disclaimers', () => {
      expect(PRODUCTION_READINESS_BOUNDARY_DISCLAIMER).toContain(
        'Backup success does not prove recoverability',
      );
      expect(PHASE_13D_BOUNDARY_DISCLAIMER).toContain(
        'Continuity mode is not normal production mode',
      );
    });

    it('blocks backup labeled as recovery complete', () => {
      expect(() => {
        boundary.assertBackupIsNotRecovery('backup job recorded; recovery complete');
      }).toThrow(PRODUCTION_READINESS_REASON_CODES.BACKUP_NOT_RECOVERY);
    });

    it('blocks restore completed without integrity verification', () => {
      expect(() => {
        boundary.assertRestoreCompletedIsNotIntegrityVerified(true, false);
      }).toThrow(PRODUCTION_READINESS_REASON_CODES.RESTORE_NOT_INTEGRITY_VERIFIED);
    });

    it('blocks technical restoration treated as institutional resumption', () => {
      expect(() => {
        boundary.assertTechnicalRestorationIsNotInstitutionalResumption(true, false);
      }).toThrow(PRODUCTION_READINESS_REASON_CODES.TECHNICAL_RESTORATION_NOT_RESUMPTION);
    });

    it('requires emergency authority expiration', () => {
      expect(() => {
        boundary.assertEmergencyAuthorityIsTimeBounded(undefined);
      }).toThrow(PRODUCTION_READINESS_REASON_CODES.MANUAL_AUTHORIZATION_EXPIRATION_REQUIRED);
    });

    it('blocks expired emergency authority', () => {
      expect(() => {
        boundary.assertEmergencyAuthorityNotExpired(new Date('2020-01-01'), new Date('2026-01-01'));
      }).toThrow(PRODUCTION_READINESS_REASON_CODES.EMERGENCY_AUTHORITY_EXPIRED);
    });

    it('blocks silent continuation after emergency authority expiry', () => {
      expect(() => {
        boundary.assertEmergencyAuthorityCannotSilentlyContinue(
          ManualOperationAuthorizationStatus.ACTIVE,
          new Date('2020-01-01'),
          new Date('2026-01-01'),
        );
      }).toThrow(PRODUCTION_READINESS_REASON_CODES.EMERGENCY_AUTHORITY_EXPIRED);
    });

    it('blocks manual mode authority bypass', () => {
      expect(() => {
        boundary.assertManualOperationNotAuthorityBypass(true);
      }).toThrow(PRODUCTION_READINESS_REASON_CODES.MANUAL_MODE_AUTHORITY_BYPASS);
    });

    it('blocks manual mode segregation of duties bypass', () => {
      expect(() => {
        boundary.assertManualOperationSegregation('same-id', 'same-id', 'other-id');
      }).toThrow(PRODUCTION_READINESS_REASON_CODES.MANUAL_MODE_SOD_BYPASS);
    });

    it('blocks disaster waiving mandatory requirements', () => {
      expect(() => {
        boundary.assertDisasterNotWaiverOfMandatoryRequirement(true);
      }).toThrow(PRODUCTION_READINESS_REASON_CODES.DISASTER_NOT_REQUIREMENT_WAIVER);
    });

    it('blocks untested backup recoverability claim', () => {
      expect(() => {
        boundary.assertUntestedBackupCannotBeRecoverable(
          BackupRecoverabilityStatus.VERIFIED,
          false,
        );
      }).toThrow(PRODUCTION_READINESS_REASON_CODES.UNTESTED_BACKUP_NOT_RECOVERABLE);
    });

    it('blocks unverified backup readiness claims', () => {
      expect(() => {
        boundary.assertUnverifiedBackupCannotSupportReadiness(
          BackupRecoverabilityStatus.UNVERIFIED,
        );
      }).toThrow(PRODUCTION_READINESS_REASON_CODES.UNVERIFIED_BACKUP_READINESS);
    });

    it('rejects corrupt restore', () => {
      expect(() => {
        boundary.assertCorruptRestoreRejected(RestoreTestResult.FAILED, false);
      }).toThrow(PRODUCTION_READINESS_REASON_CODES.CORRUPT_RESTORE_REJECTED);
    });

    it('rejects restore without integrity validation', () => {
      expect(() => {
        boundary.assertRestoreWithoutIntegrityValidationRejected({
          result: RestoreTestResult.PASSED,
          backupAvailabilityVerified: true,
          decryptionVerified: true,
          integrityVerified: false,
          completenessVerified: true,
          databaseConsistencyVerified: true,
          objectIntegrityVerified: true,
          auditHistoryVerified: true,
          signatureHashVerified: true,
          applicationCompatibilityVerified: true,
          rpoAchieved: true,
          rtoAchieved: true,
        });
      }).toThrow(PRODUCTION_READINESS_REASON_CODES.RESTORE_WITHOUT_INTEGRITY_REJECTED);
    });

    it('requires manual original preservation during reconciliation', () => {
      expect(() => {
        boundary.assertManualOriginalPreserved(false);
      }).toThrow(PRODUCTION_READINESS_REASON_CODES.MANUAL_ORIGINAL_NOT_PRESERVED);
    });

    it('blocks shared emergency credentials', () => {
      expect(() => {
        boundary.assertEmergencyCredentialNotShared(true);
      }).toThrow(PRODUCTION_READINESS_REASON_CODES.EMERGENCY_CREDENTIAL_SHARED);
    });

    it('blocks integration outage verification waiver', () => {
      expect(() => {
        boundary.assertIntegrationOutageCannotWaiveMandatoryVerification(true);
      }).toThrow(PRODUCTION_READINESS_REASON_CODES.INTEGRATION_OUTAGE_VERIFICATION_WAIVER);
    });

    it('blocks AI substituting unavailable regulator', () => {
      expect(() => {
        boundary.assertAiCannotSubstituteUnavailableRegulator(true);
      }).toThrow(PRODUCTION_READINESS_REASON_CODES.AI_CANNOT_SUBSTITUTE_REGULATOR);
    });

    it('blocks technical auto-resumption', () => {
      expect(() => {
        boundary.assertTechnicalRecoveryCannotResumeAutomatically(true);
      }).toThrow(PRODUCTION_READINESS_REASON_CODES.TECHNICAL_AUTO_RESUMPTION_FORBIDDEN);
    });

    it('requires institutional resumption authorization', () => {
      expect(() => {
        boundary.assertInstitutionalResumptionAuthorizationRequired(
          ResumptionAuthorizationStatus.PENDING,
        );
      }).toThrow(PRODUCTION_READINESS_REASON_CODES.INSTITUTIONAL_RESUMPTION_REQUIRED);
    });

    it('blocks insecure communication fallback', () => {
      expect(() => {
        boundary.assertInsecureCommunicationFallbackBlocked('unencrypted personal-email relay');
      }).toThrow(PRODUCTION_READINESS_REASON_CODES.INSECURE_COMMUNICATION_FALLBACK);
    });

    it.each(FORBIDDEN_BACKLOG_PRIORITY_BASES.map((basis) => [basis]))(
      'blocks backlog favoritism basis %s without approved criteria',
      (basis) => {
        expect(() => {
          boundary.assertBacklogCannotUseArbitraryFavoritism(basis, null);
        }).toThrow(PRODUCTION_READINESS_REASON_CODES.BACKLOG_ARBITRARY_FAVORITISM);
      },
    );

    it('blocks recovery exercise represented as guarantee', () => {
      expect(() => {
        boundary.assertRecoveryExerciseNotGuarantee(RecoveryExerciseStatus.COMPLETED, true);
      }).toThrow(PRODUCTION_READINESS_REASON_CODES.EXERCISE_NOT_GUARANTEE);
    });

    it('keeps failed recovery corrective action open', () => {
      expect(() => {
        boundary.assertFailedRecoveryCorrectiveActionRemainsOpen(
          ContinuityCorrectiveActionStatus.CLOSED,
          true,
        );
      }).toThrow(PRODUCTION_READINESS_REASON_CODES.FAILED_RECOVERY_CORRECTIVE_OPEN);
    });

    it('keeps suspended AI suspended unless reauthorized', () => {
      expect(() => {
        boundary.assertSuspendedAiRemainsSuspendedUnlessReauthorized(true, false);
      }).toThrow(PRODUCTION_READINESS_REASON_CODES.SUSPENDED_AI_REAUTHORIZATION_REQUIRED);
    });

    it('blocks anonymous emergency decisions', () => {
      expect(() => {
        boundary.assertNamedInstitutionalActorPresent(undefined, 'identity-id');
      }).toThrow(PRODUCTION_READINESS_REASON_CODES.ANONYMOUS_EMERGENCY_DECISION);
    });

    it('marks restore test UNVERIFIED when integrity not validated', () => {
      expect(
        boundary.deriveRestoreTestResult({
          result: RestoreTestResult.UNVERIFIED,
          backupAvailabilityVerified: true,
          decryptionVerified: true,
          integrityVerified: false,
          completenessVerified: true,
          databaseConsistencyVerified: true,
          objectIntegrityVerified: true,
          auditHistoryVerified: true,
          signatureHashVerified: true,
          applicationCompatibilityVerified: true,
          rpoAchieved: true,
          rtoAchieved: true,
        }),
      ).toBe(RestoreTestResult.FAILED);
    });

    it('supports all required continuity scenario types', () => {
      expect(CONTINUITY_SCENARIO_TYPES).toHaveLength(15);
    });
  });

  describe('BackupRecoveryService gates', () => {
    it('rejects recoverability claim for unverified backup', () => {
      const boundary = new BusinessContinuityBoundaryService();
      const service = new BackupRecoveryService({} as never, boundary);

      expect(() => {
        service.assertRecoverabilityClaim({
          recoverabilityStatus: BackupRecoverabilityStatus.UNVERIFIED,
        } as never);
      }).toThrow(BadRequestException);
    });
  });

  describe('ResumptionService gates', () => {
    it('rejects technical auto-resumption', () => {
      const boundary = new BusinessContinuityBoundaryService();
      const service = new ResumptionService({} as never, boundary, {} as never);

      expect(() => {
        service.rejectTechnicalAutoResumption(true);
      }).toThrow(ForbiddenException);
    });
  });

  describe('RecoveryExerciseService gates', () => {
    it('rejects backlog favoritism for executive request', () => {
      const boundary = new BusinessContinuityBoundaryService();

      expect(() => {
        boundary.assertBacklogCannotUseArbitraryFavoritism(
          BacklogPriorityBasis.EXECUTIVE_REQUEST,
          undefined,
        );
      }).toThrow(ForbiddenException);
    });
  });
});
