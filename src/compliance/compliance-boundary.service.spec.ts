import { ConfigModule } from '@nestjs/config';
import { Test, type TestingModule } from '@nestjs/testing';
import {
  ComplianceObservationClassification,
  ComplianceReviewOutcome,
  OfficialInstrumentStatus,
} from '@prisma/client';

import appConfig from '../config/app.config';
import identityConfig from '../config/identity.config';
import redisConfig from '../config/redis.config';
import securityConfig from '../config/security.config';
import {
  FORBIDDEN_CLIENT_COMPLIANCE_FIELDS,
  PHASE_9_BOUNDARY_DISCLAIMER,
  PHASE_9H_INVARIANTS,
} from './compliance.constants';
import { ComplianceBoundaryService } from './compliance-boundary.service';

describe('ComplianceBoundaryService', () => {
  let boundary: ComplianceBoundaryService;

  beforeAll(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          load: [appConfig, redisConfig, securityConfig, identityConfig],
        }),
      ],
      providers: [ComplianceBoundaryService],
    }).compile();

    boundary = moduleRef.get(ComplianceBoundaryService);
  });

  it('blocks protected client fields', () => {
    for (const field of FORBIDDEN_CLIENT_COMPLIANCE_FIELDS) {
      expect(() => {
        boundary.assertClientPayloadDoesNotSetProtectedFields({ [field]: true });
      }).toThrow(/protected compliance field/i);
    }
  });

  it('blocks receipt-only obligation satisfaction', () => {
    expect(() => {
      boundary.assertReceiptDoesNotSatisfyObligation({
        receiptOnly: true,
        obligationSatisfied: true,
      });
    }).toThrow(/receipt acknowledgment alone/i);
  });

  it('blocks holder self-closing finding', () => {
    expect(() => {
      boundary.assertHolderCannotCloseFinding({
        actorIdentityId: 'holder-1',
        holderIdentityId: 'holder-1',
      });
    }).toThrow(/self-close/i);
  });

  it('blocks holder self-verifying corrective action', () => {
    expect(() => {
      boundary.assertHolderCannotVerifyCorrectiveAction({
        verifierIdentityId: 'holder-1',
        holderIdentityId: 'holder-1',
      });
    }).toThrow(/verify own corrective action/i);
  });

  it('blocks Phase 9 suspension decision creation', () => {
    expect(() => {
      boundary.assertPhase9CannotCreateSuspensionDecision({
        isCreatingSuspensionDecision: true,
      });
    }).toThrow(/cannot create suspension/i);
  });

  it('blocks Phase 9 instrument status patch', () => {
    expect(() => {
      boundary.assertPhase9CannotPatchInstrumentStatus({
        status: OfficialInstrumentStatus.SUSPENDED,
      });
    }).toThrow(/cannot PATCH official instrument/i);
  });

  it('documents Phase 9 boundary disclaimer', () => {
    expect(PHASE_9_BOUNDARY_DISCLAIMER).toMatch(/does not create suspension decisions/i);
  });

  it('defines exactly 50 Phase 9H invariants', () => {
    expect(PHASE_9H_INVARIANTS).toHaveLength(50);
    expect(new Set(PHASE_9H_INVARIANTS.map((item) => item.id)).size).toBe(50);
  });

  it('distinguishes observation from finding', () => {
    expect(() => {
      boundary.assertObservationIsNotFinding({ autoPromoteObservationToFinding: true });
    }).toThrow(/observation cannot be automatically promoted/i);
    expect(ComplianceObservationClassification.OBSERVATION).toBe('OBSERVATION');
  });

  it('distinguishes review outcome satisfaction semantics', () => {
    expect(
      boundary.assertReviewOutcomeRequiresExplicitSatisfaction(
        ComplianceReviewOutcome.OBLIGATION_SATISFIED,
      ),
    ).toBe(true);
    expect(
      boundary.assertReviewOutcomeRequiresExplicitSatisfaction(
        ComplianceReviewOutcome.OBLIGATION_NOT_SATISFIED,
      ),
    ).toBe(false);
  });
});
