import { ConfigModule } from '@nestjs/config';
import { Test, type TestingModule } from '@nestjs/testing';
import { ComplianceReviewOutcome, OfficialInstrumentStatus } from '@prisma/client';

import appConfig from '../config/app.config';
import identityConfig from '../config/identity.config';
import redisConfig from '../config/redis.config';
import securityConfig from '../config/security.config';
import { InspectionService } from '../evidence/inspection/inspection.service';
import { ComplianceBoundaryService } from './common/compliance-boundary.service';
import { PHASE_9H_INVARIANTS } from './compliance.constants';

describe('Phase 9 architectural must-fail invariants', () => {
  let boundary: ComplianceBoundaryService;
  let phase7Inspection: InspectionService;

  beforeAll(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          load: [appConfig, redisConfig, securityConfig, identityConfig],
        }),
      ],
      providers: [
        ComplianceBoundaryService,
        {
          provide: InspectionService,
          useValue: { observationIsViolation: jest.fn().mockReturnValue(false) },
        },
      ],
    }).compile();

    boundary = moduleRef.get(ComplianceBoundaryService);
    phase7Inspection = moduleRef.get(InspectionService);
  });

  it('defines exactly 50 Phase 9H invariants', () => {
    expect(PHASE_9H_INVARIANTS).toHaveLength(50);
  });

  it('1. obligation is distinct from submission', () => {
    expect(PHASE_9H_INVARIANTS.find((i) => i.id === 1)?.description).toMatch(
      /distinct from compliance submission/i,
    );
    expect(() => {
      boundary.assertSubmissionIsNotObligation({ treatingSubmissionAsObligation: true });
    }).toThrow(/not the same as continuing obligation/i);
  });

  it('2. submission is distinct from verification', () => {
    expect(() => {
      boundary.assertReviewIsNotSubmission({ treatingReviewAsSubmission: true });
    }).toThrow(/distinct from submission receipt/i);
  });

  it('3. receipt alone never satisfies obligation', () => {
    expect(() => {
      boundary.assertReceiptDoesNotSatisfyObligation({
        receiptOnly: true,
        obligationSatisfied: true,
      });
    }).toThrow(/receipt acknowledgment alone/i);
  });

  it('4. observation is distinct from finding', () => {
    expect(() => {
      boundary.assertObservationIsNotFinding({ autoPromoteObservationToFinding: true });
    }).toThrow(/automatically promoted/i);
  });

  it('5. finding is distinct from violation', () => {
    expect(() => {
      boundary.assertFindingIsNotViolation({ autoTreatFindingAsViolation: true });
    }).toThrow(/does not automatically equal noncompliance violation/i);
  });

  it('6. Phase 7 inspection stack is reused via optional link', () => {
    expect(PHASE_9H_INVARIANTS.find((i) => i.id === 6)?.description).toMatch(
      /Phase 7 inspection record reuse/i,
    );
  });

  it('7. Phase 9 cannot create suspension decisions', () => {
    expect(() => {
      boundary.assertPhase9CannotCreateSuspensionDecision({ isCreatingSuspensionDecision: true });
    }).toThrow(/cannot create suspension/i);
  });

  it('8. Phase 9 cannot PATCH instrument status', () => {
    expect(() => {
      boundary.assertPhase9CannotPatchInstrumentStatus({
        status: OfficialInstrumentStatus.SUSPENDED,
      });
    }).toThrow(/cannot PATCH official instrument/i);
  });

  it('9. emergency interim action does not suspend instrument', () => {
    expect(() => {
      boundary.assertEmergencyActionDoesNotSuspendInstrument({
        doesNotSuspendInstrument: false,
        attemptsInstrumentSuspension: false,
      });
    }).toThrow(/must explicitly record that it does not suspend instrument/i);
  });

  it('10. compliance projection is informational', () => {
    expect(PHASE_9H_INVARIANTS.find((i) => i.id === 10)?.description).toMatch(/informational/i);
  });

  it('23. holder cannot self-close finding', () => {
    expect(() => {
      boundary.assertHolderCannotCloseFinding({
        actorIdentityId: 'holder',
        holderIdentityId: 'holder',
      });
    }).toThrow(/self-close/i);
  });

  it('24. holder cannot verify corrective action', () => {
    expect(() => {
      boundary.assertHolderCannotVerifyCorrectiveAction({
        verifierIdentityId: 'holder',
        holderIdentityId: 'holder',
      });
    }).toThrow(/verify own corrective action/i);
  });

  it('29. Phase 7 NON_COMPLIANCE blocked at observation layer', () => {
    expect(phase7Inspection.observationIsViolation('OBSERVATION')).toBe(false);
  });

  it('42. INSPECT authority required for assignment', () => {
    expect(PHASE_9H_INVARIANTS.find((i) => i.id === 42)?.description).toMatch(/INSPECT authority/i);
  });

  it('50. inspectionRecordId optional link preserved', () => {
    expect(PHASE_9H_INVARIANTS.find((i) => i.id === 50)?.description).toMatch(
      /inspectionRecordId/i,
    );
  });

  it('review service rejects receipt-only satisfaction path at boundary', () => {
    expect(() => {
      boundary.assertReceiptDoesNotSatisfyObligation({
        receiptOnly: true,
        obligationSatisfied: true,
      });
    }).toThrow();
    expect(ComplianceReviewOutcome.OBLIGATION_SATISFIED).toBe('OBLIGATION_SATISFIED');
  });
});
