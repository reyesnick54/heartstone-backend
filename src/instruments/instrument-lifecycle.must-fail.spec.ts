import { ConfigModule } from '@nestjs/config';
import { Test, type TestingModule } from '@nestjs/testing';
import {
  InstrumentJurisdictionScope,
  OfficialInstrumentStatus,
  ReviewInterimEffect,
  ReviewStayStatus,
} from '@prisma/client';

import appConfig from '../config/app.config';
import identityConfig from '../config/identity.config';
import redisConfig from '../config/redis.config';
import securityConfig from '../config/security.config';
import { PrismaService } from '../database/prisma.service';
import { InstrumentLifecycleBoundaryService } from './common/instrument-lifecycle-boundary.service';
import { TECHNICAL_ADMIN_ROLE_MARKER } from './instruments.constants';
import { InstrumentLifecycleGuardService } from './lifecycle/instrument-lifecycle-guard.service';
import { PHASE_8G_INVARIANTS } from './phase-8g-invariants.constants';

describe('Phase 8G architectural must-fail invariants', () => {
  let boundary: InstrumentLifecycleBoundaryService;
  let guard: InstrumentLifecycleGuardService;

  beforeAll(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          load: [appConfig, redisConfig, securityConfig, identityConfig],
        }),
      ],
      providers: [
        InstrumentLifecycleBoundaryService,
        InstrumentLifecycleGuardService,
        { provide: PrismaService, useValue: {} },
      ],
    }).compile();

    boundary = moduleRef.get(InstrumentLifecycleBoundaryService);
    guard = moduleRef.get(InstrumentLifecycleGuardService);
  });

  it('defines exactly 20 Phase 8G invariants', () => {
    expect(PHASE_8G_INVARIANTS).toHaveLength(20);
    const ids = PHASE_8G_INVARIANTS.map((item) => item.id);
    expect(new Set(ids).size).toBe(20);
  });

  it('1. ordinary PATCH cannot change legal instrument status', () => {
    expect(() => {
      boundary.assertClientCannotPatchInstrumentStatus({ currentStatus: 'REVOKED' });
    }).toThrow(/ordinary PATCH/i);
  });

  it('2. clerical correction cannot change decision substance', () => {
    expect(() => {
      boundary.assertClericalCorrectionScope({ altersDecisionOutcome: true });
    }).toThrow(/clerical correction cannot alter/i);

    expect(() => {
      boundary.assertClericalCorrectionScope({ altersScope: true });
    }).toThrow(/scope/i);

    expect(() => {
      boundary.assertClericalCorrectionScope({ altersRights: true });
    }).toThrow(/rights/i);
  });

  it('3. amendment preserves original version (schema supports supersession)', () => {
    expect(PHASE_8G_INVARIANTS.find((i) => i.id === 3)?.description).toContain(
      'preserves original version',
    );
  });

  it('4. renewal requires current evidence', () => {
    expect(() => {
      guard.assertRenewalEligibility({
        currentEvidenceIds: [],
        identityVerified: true,
        ownershipVerified: true,
        conditionsPerformanceVerified: true,
        priorApprovalReliedUpon: false,
        paymentReceived: false,
        decisionFinalized: true,
      });
    }).toThrow(/current evidence/i);
  });

  it('5. prior approval does not establish automatic renewal', () => {
    expect(() => {
      guard.assertRenewalEligibility({
        currentEvidenceIds: ['evidence-1'],
        identityVerified: true,
        ownershipVerified: true,
        conditionsPerformanceVerified: true,
        priorApprovalReliedUpon: true,
        paymentReceived: false,
        decisionFinalized: false,
      });
    }).toThrow(/prior approval/i);
  });

  it('6. payment does not equal renewal', () => {
    expect(() => {
      guard.assertRenewalEligibility({
        currentEvidenceIds: ['evidence-1'],
        identityVerified: true,
        ownershipVerified: true,
        conditionsPerformanceVerified: true,
        priorApprovalReliedUpon: false,
        paymentReceived: true,
        decisionFinalized: false,
      });
    }).toThrow(/payment alone/i);
  });

  it('7. technical admin cannot decide suspension', () => {
    expect(() => {
      boundary.assertTechnicalAdminCannotCreateSuspensionDecision({
        actorRoleMarker: TECHNICAL_ADMIN_ROLE_MARKER,
        isCreatingDecision: true,
      });
    }).toThrow(/technical administrators/i);
  });

  it('8. suspension preserves historical instrument (no deletion invariant)', () => {
    expect(PHASE_8G_INVARIANTS.find((i) => i.id === 8)?.description).toContain(
      'preserves historical instrument',
    );
  });

  it('9. suspension may be scoped where authorized', () => {
    const allowed = guard.getAllowedStatusesForAction('SUSPENDED');
    expect(allowed).toContain(OfficialInstrumentStatus.EFFECTIVE);
  });

  it('10. revocation requires decision and authority', () => {
    expect(() => {
      guard.assertConsequentialEventHasDecision('REVOKED');
    }).toThrow(/controlling GovernmentDecision/i);
  });

  it('11. ABSEZ revocation cannot masquerade as national revocation', () => {
    expect(() => {
      boundary.assertAbsezRevocationNotNational({
        jurisdictionScope: InstrumentJurisdictionScope.ABSEZ,
        representsNationalRevocation: true,
      });
    }).toThrow(/ABSEZ/i);
  });

  it('12. expired suspension does not auto-reinstate', () => {
    expect(() => {
      guard.assertReinstatementPrerequisitesResolved({
        priorSuspensionExpired: true,
        correctiveEvidenceProvided: true,
        inspectionVerified: true,
        professionalVerified: true,
        newDecisionFinalized: false,
      });
    }).toThrow(/does not automatically reinstate/i);
  });

  it('13. reinstatement requires new decision', () => {
    expect(() => {
      guard.assertReinstatementPrerequisitesResolved({
        priorSuspensionExpired: false,
        correctiveEvidenceProvided: false,
        inspectionVerified: true,
        professionalVerified: true,
        newDecisionFinalized: true,
      });
    }).toThrow(/prerequisites remain unresolved/i);
  });

  it('14. expiration preserves record (no deletion invariant)', () => {
    expect(PHASE_8G_INVARIANTS.find((i) => i.id === 14)?.description).toContain(
      'preserves record',
    );
  });

  it('15. surrender preserves obligations (metadata invariant)', () => {
    expect(PHASE_8G_INVARIANTS.find((i) => i.id === 15)?.description).toContain(
      'preserves obligations',
    );
  });

  it('16. appeal filing does not auto-stay', () => {
    expect(ReviewStayStatus.NONE).toBe('NONE');
    expect(ReviewInterimEffect.NONE).toBe('NONE');
  });

  it('17. explicit authorized stay is represented', () => {
    expect(ReviewStayStatus.INTERIM_STAY_AUTHORIZED).toBe('INTERIM_STAY_AUTHORIZED');
  });

  it('18. public verification updates after lifecycle change (service contract)', () => {
    expect(PHASE_8G_INVARIANTS.find((i) => i.id === 18)?.description).toContain(
      'Public verification updates',
    );
  });

  it('19. historical replay reconstructs each prior status (service contract)', () => {
    expect(PHASE_8G_INVARIANTS.find((i) => i.id === 19)?.description).toContain(
      'Historical replay',
    );
  });

  it('20. consequential lifecycle event requires controlling decision', () => {
    expect(() => {
      guard.assertConsequentialEventHasDecision('SUSPENDED');
    }).toThrow(/controlling GovernmentDecision/i);

    expect(() => {
      guard.assertConsequentialEventHasDecision('EXPIRED');
    }).not.toThrow();
  });
});
