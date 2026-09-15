import { ForbiddenException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import {
  IdentityType,
  LaunchGateOutcome,
  OperationalActivationOutcome,
  ProductionCorrectiveActionStatus,
} from '@prisma/client';

import { ProductionReadinessBoundaryService } from './common/production-readiness-boundary.service';
import {
  FORBIDDEN_CLIENT_ACTIVATION_FIELDS,
  FORBIDDEN_CLIENT_GATE_FIELDS,
  FORBIDDEN_CLIENT_SUSPENSION_FIELDS,
  LAUNCH_GATE_REQUIREMENTS,
  MUST_FAIL_INVARIANT_COUNT,
  PHASE_13_BOUNDARY_DISCLAIMERS,
  PRODUCTION_READINESS_BOUNDARY_DISCLAIMER,
  PRODUCTION_READINESS_REASON_CODES,
} from './production-readiness.constants';

describe('Phase 13 must-fail invariants', () => {
  let boundary: ProductionReadinessBoundaryService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [ProductionReadinessBoundaryService],
    }).compile();
    boundary = module.get(ProductionReadinessBoundaryService);
  });

  describe('boundary disclaimers', () => {
    it('exposes production readiness boundary disclaimer', () => {
      expect(PRODUCTION_READINESS_BOUNDARY_DISCLAIMER).toContain('National launch');
      expect(PHASE_13_BOUNDARY_DISCLAIMERS.AUTHORITY_NOT_ACTIVATION).toBe(
        'Authority != Activation',
      );
      expect(PHASE_13_BOUNDARY_DISCLAIMERS.RETIREMENT_NOT_RECORD_DESTRUCTION).toContain(
        'Retirement != Record Destruction',
      );
    });

    it('tracks 100 must-fail invariants', () => {
      expect(MUST_FAIL_INVARIANT_COUNT).toBe(100);
      expect(Object.keys(PRODUCTION_READINESS_REASON_CODES).length).toBeGreaterThanOrEqual(80);
    });
  });

  describe('ProductionReadinessBoundaryService client field rejection', () => {
    it.each(FORBIDDEN_CLIENT_ACTIVATION_FIELDS.map((field) => [field]))(
      'rejects client-set activation field "%s"',
      (field) => {
        expect(() => {
          boundary.rejectClientActivationFields({ [field]: 'forbidden' });
        }).toThrow(ForbiddenException);
      },
    );

    it.each(FORBIDDEN_CLIENT_GATE_FIELDS.map((field) => [field]))(
      'rejects client-set gate field "%s"',
      (field) => {
        expect(() => {
          boundary.rejectClientGateFields({ [field]: 'forbidden' });
        }).toThrow(ForbiddenException);
      },
    );

    it.each(FORBIDDEN_CLIENT_SUSPENSION_FIELDS.map((field) => [field]))(
      'rejects client-set suspension field "%s"',
      (field) => {
        expect(() => {
          boundary.rejectClientSuspensionFields({ [field]: 'forbidden' });
        }).toThrow(ForbiddenException);
      },
    );
  });

  describe('acceptance and activation separation', () => {
    it('1. CI success cannot equal institutional acceptance', () => {
      expect(() => {
        boundary.assertCiSuccessNotInstitutionalAcceptance(true, false);
      }).toThrow(PRODUCTION_READINESS_REASON_CODES.CI_NOT_INSTITUTIONAL_ACCEPTANCE);
    });

    it('4. Pilot success cannot equal production authorization', () => {
      expect(() => {
        boundary.assertPilotNotAuthorization(true, false);
      }).toThrow(PRODUCTION_READINESS_REASON_CODES.PILOT_NOT_AUTHORIZATION);
    });

    it('7. Activation cannot exceed accepted scope', () => {
      expect(() => {
        boundary.assertActivationWithinScope(['service-a', 'service-b'], ['service-a']);
      }).toThrow(PRODUCTION_READINESS_REASON_CODES.ACTIVATION_EXCEEDS_SCOPE);
    });

    it('8. System admin cannot activate institutional function', () => {
      expect(() => {
        boundary.assertSystemAdminCannotActivateInstitutionalFunction(true, true);
      }).toThrow(PRODUCTION_READINESS_REASON_CODES.SYSADMIN_CANNOT_ACTIVATE);
    });

    it('9. Vendor cannot accept institutional risk', () => {
      expect(() => {
        boundary.assertVendorCannotAcceptInstitutionalRisk(IdentityType.SERVICE);
      }).toThrow(PRODUCTION_READINESS_REASON_CODES.VENDOR_CANNOT_ACCEPT_RISK);
    });

    it('10. AI cannot accept institutional risk', () => {
      expect(() => {
        boundary.assertAiCannotAcceptInstitutionalRisk(IdentityType.INDIVIDUAL, true);
      }).toThrow(PRODUCTION_READINESS_REASON_CODES.AI_CANNOT_ACCEPT_RISK);
    });

    it('11. AI cannot activate production', () => {
      expect(() => {
        boundary.assertAiCannotActivateProduction(true);
      }).toThrow(PRODUCTION_READINESS_REASON_CODES.AI_CANNOT_ACTIVATE);
    });

    it('12. AI cannot override safe halt', () => {
      expect(() => {
        boundary.assertAiCannotOverrideSafeHalt(true, true);
      }).toThrow(PRODUCTION_READINESS_REASON_CODES.AI_CANNOT_OVERRIDE_SAFE_HALT);
    });

    it('13. Developer cannot assign themselves acceptance authority', () => {
      expect(() => {
        boundary.assertDeveloperCannotSelfAssignAcceptance(true, true);
      }).toThrow(PRODUCTION_READINESS_REASON_CODES.DEVELOPER_CANNOT_SELF_ACCEPT);
    });

    it('14. Expired acceptance cannot remain valid indefinitely', () => {
      expect(() => {
        boundary.assertExpiredAcceptanceInvalid(new Date('2020-01-01'));
      }).toThrow(PRODUCTION_READINESS_REASON_CODES.EXPIRED_ACCEPTANCE);
    });
  });

  describe('recovery and resumption separation', () => {
    it('37. Backup success cannot equal recoverability', () => {
      expect(() => {
        boundary.assertBackupNotRecovery(true, false);
      }).toThrow(PRODUCTION_READINESS_REASON_CODES.BACKUP_NOT_RECOVERY);
    });

    it('38. Untested restore cannot support production readiness', () => {
      expect(() => {
        boundary.assertUntestedRestoreCannotSupportReadiness(false);
      }).toThrow(PRODUCTION_READINESS_REASON_CODES.UNTESTED_RESTORE);
    });

    it('39. Corrupt restore cannot resume operation', () => {
      expect(() => {
        boundary.assertCorruptRestoreCannotResume(false);
      }).toThrow(PRODUCTION_READINESS_REASON_CODES.CORRUPT_RESTORE);
    });

    it('40. Technical restoration cannot equal institutional resumption', () => {
      expect(() => {
        boundary.assertTechnicalRestorationNotInstitutionalResumption(true, false);
      }).toThrow(PRODUCTION_READINESS_REASON_CODES.RESTORATION_NOT_RESUMPTION);
    });
  });

  describe('operational validity separation', () => {
    it('32. Green health check cannot equal institutional service validity', () => {
      expect(() => {
        boundary.assertHealthCheckNotInstitutionalValidity(true, false);
      }).toThrow(PRODUCTION_READINESS_REASON_CODES.HEALTH_NOT_VALIDITY);
    });

    it('33. HTTP 200 cannot prove Government determination', () => {
      expect(() => {
        boundary.assertHttp200NotGovernmentDetermination(true, false);
      }).toThrow(PRODUCTION_READINESS_REASON_CODES.HTTP200_NOT_DETERMINATION);
    });

    it('75. Risk score cannot override launch gate', () => {
      expect(() => {
        boundary.assertRiskScoreCannotOverrideLaunchGate(true, true);
      }).toThrow(PRODUCTION_READINESS_REASON_CODES.RISK_SCORE_NO_OVERRIDE);
    });
  });

  describe('launch gate', () => {
    it('blocks activation when mandatory requirements unmet', () => {
      const requirements = Object.fromEntries(LAUNCH_GATE_REQUIREMENTS.map((key) => [key, false]));
      const outcome = boundary.assertLaunchGateRequirementsMet(
        requirements,
        LAUNCH_GATE_REQUIREMENTS,
      );
      expect(outcome).toBe(LaunchGateOutcome.BLOCKED);
    });

    it('passes when all launch gate requirements met', () => {
      const requirements = Object.fromEntries(LAUNCH_GATE_REQUIREMENTS.map((key) => [key, true]));
      const outcome = boundary.assertLaunchGateRequirementsMet(
        requirements,
        LAUNCH_GATE_REQUIREMENTS,
      );
      expect(outcome).toBe(LaunchGateOutcome.PASSED);
    });

    it('maps blocked gate to requires gate activation outcome', () => {
      expect(boundary.mapGateOutcomeToActivationOutcome(LaunchGateOutcome.BLOCKED)).toBe(
        OperationalActivationOutcome.REQUIRES_GATE,
      );
    });
  });

  describe('suspension, retirement, and exit', () => {
    it('65. Rollback cannot erase official history', () => {
      expect(() => {
        boundary.assertRollbackCannotEraseHistory(true);
      }).toThrow(PRODUCTION_READINESS_REASON_CODES.ROLLBACK_NO_ERASE);
    });

    it('90. Suspension must preserve records', () => {
      expect(() => {
        boundary.assertSuspensionPreservesRecords(true);
      }).toThrow(PRODUCTION_READINESS_REASON_CODES.SUSPENSION_PRESERVES_RECORDS);
    });

    it('96. Decommission cannot destroy legal-held records', () => {
      expect(() => {
        boundary.assertRetirementNotDestruction(false);
      }).toThrow(PRODUCTION_READINESS_REASON_CODES.DECOMMISSION_NO_DESTROY);
    });

    it('98. Replacement capability cannot operate before required acceptance', () => {
      expect(() => {
        boundary.assertReplacementRequiresAcceptance(false);
      }).toThrow(PRODUCTION_READINESS_REASON_CODES.REPLACEMENT_NO_PRE_ACCEPTANCE);
    });

    it('corrective action requires verification before closure', () => {
      expect(() => {
        boundary.assertCorrectiveActionRequiresVerificationBeforeClosure(
          true,
          ProductionCorrectiveActionStatus.CLOSED,
          null,
        );
      }).toThrow(PRODUCTION_READINESS_REASON_CODES.CORRECTIVE_ACTION_NO_SKIP_VERIFY);
    });
  });

  describe('artifact and secret handling', () => {
    it('26. Unsigned release artifact blocked', () => {
      expect(() => {
        boundary.assertReleaseArtifactSignatureRequired(false);
      }).toThrow(PRODUCTION_READINESS_REASON_CODES.UNSIGNED_ARTIFACT);
    });

    it('27. Wrong artifact digest blocked', () => {
      expect(() => {
        boundary.assertWrongDigestBlocked('expected-digest', 'wrong-digest');
      }).toThrow(PRODUCTION_READINESS_REASON_CODES.WRONG_DIGEST);
    });

    it('24. Secret cannot appear in log', () => {
      expect(() => {
        boundary.assertSecretNotInLog('log contains secret-value-here', 'secret-value-here');
      }).toThrow(PRODUCTION_READINESS_REASON_CODES.SECRET_IN_LOG);
    });
  });
});
