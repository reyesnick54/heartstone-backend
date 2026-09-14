import { ForbiddenException } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import {
  ContinuingObligationStatus,
  DecisionConditionStatus,
  DecisionConditionType,
  ObligationStatusChangeActor,
  OfficialInstrumentStatus,
} from '@prisma/client';

import { PrismaService } from '../database/prisma.service';
import { ComplianceBoundaryService } from './common/compliance-boundary.service';
import { ObligationRecurrenceService } from './common/obligation-recurrence.service';
import { ComplianceMatterService } from './matters/compliance-matter.service';
import { ContinuingObligationService } from './obligations/continuing-obligation.service';

describe('Phase 9A compliance foundation', () => {
  let boundary: ComplianceBoundaryService;
  let recurrence: ObligationRecurrenceService;
  let matters: ComplianceMatterService;
  let obligations: ContinuingObligationService;

  const prisma: {
    officialInstrument: { findUnique: jest.Mock };
    complianceMatter: { create: jest.Mock; findUnique: jest.Mock };
    decisionCondition: { findUnique: jest.Mock };
    continuingObligation: {
      create: jest.Mock;
      findUnique: jest.Mock;
      findMany: jest.Mock;
      update: jest.Mock;
    };
    obligationSchedule: { createMany: jest.Mock; updateMany: jest.Mock };
    obligationStatusHistory: { findMany: jest.Mock };
    $transaction: jest.Mock;
  } = {
    officialInstrument: { findUnique: jest.fn() },
    complianceMatter: { create: jest.fn(), findUnique: jest.fn() },
    decisionCondition: { findUnique: jest.fn() },
    continuingObligation: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
    obligationSchedule: { createMany: jest.fn(), updateMany: jest.fn() },
    obligationStatusHistory: { findMany: jest.fn() },
    $transaction: jest.fn(async (fn: (tx: unknown) => Promise<unknown>) => fn(prisma)),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ComplianceBoundaryService,
        ObligationRecurrenceService,
        ComplianceMatterService,
        ContinuingObligationService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    boundary = module.get(ComplianceBoundaryService);
    recurrence = module.get(ObligationRecurrenceService);
    matters = module.get(ComplianceMatterService);
    obligations = module.get(ContinuingObligationService);
    jest.clearAllMocks();
  });

  describe('boundary invariants', () => {
    it('rejects client setting SATISFIED through protected fields', () => {
      expect(() => {
        boundary.rejectClientProtectedObligationFields({ status: 'SATISFIED' });
      }).toThrow(ForbiddenException);
    });

    it('rejects holder setting SATISFIED', () => {
      expect(() => {
        boundary.assertHolderCannotSetSatisfied(
          ObligationStatusChangeActor.HOLDER,
          ContinuingObligationStatus.SATISFIED,
        );
      }).toThrow(/does not prove compliance/i);
    });

    it('allows SUBMITTED without treating it as SATISFIED', () => {
      expect(() => {
        boundary.assertActorMayChangeStatus(
          ObligationStatusChangeActor.HOLDER,
          ContinuingObligationStatus.SUBMITTED,
        );
      }).not.toThrow();
    });

    it('rejects AI status changes and waivers', () => {
      expect(() => {
        boundary.assertAiCannotWaive(ObligationStatusChangeActor.AI_ASSISTANCE);
      }).toThrow(/AI cannot waive/i);

      expect(() => {
        boundary.assertActorMayChangeStatus(
          ObligationStatusChangeActor.AI_ASSISTANCE,
          ContinuingObligationStatus.EXEMPTED_BY_AUTHORIZED_ACTION,
        );
      }).toThrow(/AI assistance cannot alter/i);
    });

    it('rejects AI deadline changes', () => {
      expect(() => {
        boundary.assertAiCannotChangeDeadline(
          { dueDate: '2026-12-31' },
          ObligationStatusChangeActor.AI_ASSISTANCE,
        );
      }).toThrow(/AI cannot change lawful obligation deadlines/i);
    });

    it('rejects payment actor satisfying substantive obligations', () => {
      expect(() => {
        boundary.assertActorMayChangeStatus(
          ObligationStatusChangeActor.PAYMENT_SYSTEM,
          ContinuingObligationStatus.SATISFIED,
        );
      }).toThrow(/Payment receipt does not automatically satisfy/i);
    });

    it('rejects rewriting approved condition text through obligation administration', () => {
      expect(() => {
        boundary.assertConditionTextImmutable({
          approvedConditionText: 'Maintain valid insurance at all times.',
          proposedDescription: 'Maintain insurance sometimes.',
        });
      }).toThrow(/preserve approved condition wording/i);
    });

    it('rejects cron-like recurrence configuration', () => {
      expect(() => {
        boundary.validateRecurrenceConfiguration({ ruleType: '0 0 * * *' });
      }).toThrow(/controlled rule types/i);
    });

    it('rejects automatic violation language on overdue transitions', () => {
      expect(() => {
        boundary.assertOverdueIsNotAutomaticViolation('automatic violation recorded');
      }).toThrow(/does not create an automatic violation/i);

      expect(() => {
        boundary.assertOverdueIsNotAutomaticViolation('automatic revocation triggered');
      }).toThrow(/does not trigger automatic revocation/i);
    });
  });

  describe('recurrence schedules preserve history', () => {
    it('generates controlled recurring due dates', () => {
      const occurrences = recurrence.generateOccurrences({
        startDate: new Date('2026-01-01T00:00:00.000Z'),
        initialDueDate: new Date('2026-01-31T00:00:00.000Z'),
        recurrenceConfiguration: { ruleType: 'MONTHLY', occurrences: 3 },
        throughDate: new Date('2026-06-01T00:00:00.000Z'),
      });

      expect(occurrences).toHaveLength(3);
      expect(occurrences[0]?.lawfulDueDate.toISOString()).toBe('2026-01-31T00:00:00.000Z');
      expect(occurrences[1]?.occurrenceNumber).toBe(2);
      const secondOccurrence = occurrences[1];
      expect(occurrences[2]?.occurrenceNumber).toBe(3);
      if (secondOccurrence) {
        expect(occurrences[2]?.lawfulDueDate.getTime()).toBeGreaterThan(
          secondOccurrence.lawfulDueDate.getTime(),
        );
      }
    });
  });

  describe('services', () => {
    it('opens monitoring only for issued instruments', async () => {
      prisma.officialInstrument.findUnique.mockResolvedValue({
        id: 'inst-1',
        status: OfficialInstrumentStatus.PENDING_ISSUANCE,
        masterAdministrativeFileId: 'maf-1',
        caseId: 'case-1',
        holderIdentityId: 'holder-1',
        holderOrganizationId: null,
        instrumentNumber: 'LIC-1',
      });

      await expect(
        matters.openFromIssuedInstrument({
          masterAdministrativeFileId: 'maf-1',
          officialInstrumentId: 'inst-1',
          responsibleInstitutionId: 'institution-1',
          responsibleDepartmentId: 'department-1',
        }),
      ).rejects.toThrow(/ISSUED instrument/i);
    });

    it('materializes obligations without changing approved condition text', async () => {
      prisma.decisionCondition.findUnique.mockResolvedValue({
        id: 'cond-1',
        conditionType: DecisionConditionType.ONGOING,
        status: DecisionConditionStatus.PENDING,
        description: 'Submit quarterly environmental reports.',
      });
      prisma.continuingObligation.create.mockResolvedValue({
        id: 'obl-1',
        description: 'Submit quarterly environmental reports.',
        approvedConditionText: 'Submit quarterly environmental reports.',
      });
      prisma.continuingObligation.findUnique.mockResolvedValue({
        id: 'obl-1',
        description: 'Submit quarterly environmental reports.',
        approvedConditionText: 'Submit quarterly environmental reports.',
        schedules: [],
        statusHistory: [],
        sourceDecisionCondition: {
          description: 'Submit quarterly environmental reports.',
        },
        supersededByObligation: null,
        supersedesObligation: null,
      });

      const result = await obligations.createFromApprovedCondition({
        complianceMatterId: 'matter-1',
        sourceDecisionConditionId: 'cond-1',
        sourceInstrumentVersionId: 'ver-1',
        obligationCode: 'ENV-REPORT-QTR',
        responsibleParty: 'License holder',
        obligationType: 'REPORTING',
        startDate: new Date('2026-01-01T00:00:00.000Z'),
        dueDate: new Date('2026-03-31T00:00:00.000Z'),
      });

      expect(prisma.continuingObligation.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            description: 'Submit quarterly environmental reports.',
            approvedConditionText: 'Submit quarterly environmental reports.',
          }) as Record<string, unknown>,
        }),
      );
      expect(result.description).toBe('Submit quarterly environmental reports.');
    });

    it('records submitted separately from satisfied', async () => {
      prisma.continuingObligation.findUnique
        .mockResolvedValueOnce({
          id: 'obl-1',
          status: ContinuingObligationStatus.DUE,
          description: 'Submit quarterly environmental reports.',
          approvedConditionText: 'Submit quarterly environmental reports.',
        })
        .mockResolvedValueOnce({
          id: 'obl-1',
          status: ContinuingObligationStatus.SUBMITTED,
          description: 'Submit quarterly environmental reports.',
          approvedConditionText: 'Submit quarterly environmental reports.',
          schedules: [],
          statusHistory: [],
          sourceDecisionCondition: null,
          supersededByObligation: null,
          supersedesObligation: null,
        });
      prisma.continuingObligation.update.mockResolvedValue({
        id: 'obl-1',
        status: ContinuingObligationStatus.SUBMITTED,
      });

      const submitted = await obligations.recordAdministrativeStatus({
        obligationId: 'obl-1',
        toStatus: ContinuingObligationStatus.SUBMITTED,
        actor: ObligationStatusChangeActor.HOLDER,
      });

      expect(submitted.status).toBe(ContinuingObligationStatus.SUBMITTED);
      expect(submitted.status).not.toBe(ContinuingObligationStatus.SATISFIED);
    });
  });
});
