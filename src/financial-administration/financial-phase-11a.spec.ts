import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import {
  AuthorityEvaluationOutcome,
  FeeAssessmentStatus,
  FeeScheduleLifecycleStatus,
  IdentityType,
  InvoiceStatus,
} from '@prisma/client';

import { AuthorityEvaluationService } from '../authority/evaluation/authority-evaluation.service';
import { PrismaService } from '../database/prisma.service';
import { FinancialBoundaryService } from './common/financial-boundary.service';
import {
  addCents,
  assertIntegerCents,
  assertSameCurrency,
  rejectFxConversion,
} from './common/monetary-arithmetic.util';
import { FeeAssessmentService } from './fee-assessments/fee-assessment.service';
import { FeeScheduleService } from './fee-schedules/fee-schedule.service';
import {
  FINANCIAL_REASON_CODES,
  PHASE_11A_BOUNDARY_DISCLAIMER,
  TECHNICAL_ADMIN_ROLE_MARKER,
} from './financial-administration.constants';
import { PHASE_11A_INVARIANTS } from './financial-phase-11a-invariants.constants';
import { InvoiceService } from './invoices/invoice.service';

describe('Phase 11A financial administration', () => {
  let boundary: FinancialBoundaryService;
  let feeSchedules: FeeScheduleService;
  let feeAssessments: FeeAssessmentService;
  let invoices: InvoiceService;

  const prisma = {
    feeSchedule: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
    feeScheduleVersion: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    feeAssessment: { create: jest.fn(), findUnique: jest.fn(), update: jest.fn() },
    invoice: { create: jest.fn(), findUnique: jest.fn(), update: jest.fn() },
    financialAuditEvent: { create: jest.fn() },
    $transaction: jest.fn(),
  };

  prisma.$transaction.mockImplementation((callback: (tx: typeof prisma) => Promise<unknown>) =>
    callback(prisma),
  );

  const authorityEvaluation = {
    evaluate: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FinancialBoundaryService,
        FeeScheduleService,
        FeeAssessmentService,
        InvoiceService,
        { provide: PrismaService, useValue: prisma },
        { provide: AuthorityEvaluationService, useValue: authorityEvaluation },
      ],
    }).compile();

    boundary = module.get(FinancialBoundaryService);
    feeSchedules = module.get(FeeScheduleService);
    feeAssessments = module.get(FeeAssessmentService);
    invoices = module.get(InvoiceService);
    jest.clearAllMocks();
  });

  it('defines Phase 11A invariants', () => {
    expect(PHASE_11A_INVARIANTS).toHaveLength(16);
    expect(PHASE_11A_BOUNDARY_DISCLAIMER).toContain('Payment recording does not constitute');
  });

  describe('boundary invariants', () => {
    it('rejects client-supplied fee amounts on assessment', () => {
      expect(() => {
        boundary.rejectClientProtectedFeeAssessmentFields({ totalCents: 100 });
      }).toThrow(ForbiddenException);
    });

    it('rejects technical admin fee schedule activation', () => {
      expect(() => {
        boundary.assertTechnicalAdminCannotActivateFeeSchedule(TECHNICAL_ADMIN_ROLE_MARKER);
      }).toThrow(FINANCIAL_REASON_CODES.ADMIN_OVERRIDE_FORBIDDEN);
    });

    it('rejects AI fee waiver', () => {
      expect(() => {
        boundary.assertAiCannotPerformFinancialAction(IdentityType.SERVICE, 'WAIVE_FEE');
      }).toThrow(/AI assistance cannot perform financial action/);
    });

    it('rejects inactive schedule for assessment', () => {
      expect(() => {
        boundary.assertScheduleVersionUsableForAssessment(FeeScheduleLifecycleStatus.DRAFT);
      }).toThrow(FINANCIAL_REASON_CODES.SCHEDULE_NOT_ACTIVE);
    });

    it('rejects arbitrary fee selection', () => {
      expect(() => {
        boundary.assertClientCannotSelectArbitraryFee('item-1', ['item-2']);
      }).toThrow(FINANCIAL_REASON_CODES.ARBITRARY_FEE_FORBIDDEN);
    });
  });

  describe('monetary arithmetic', () => {
    it('uses integer cents without floating point', () => {
      expect(addCents(100, 200, 300)).toBe(600);
      expect(() => {
        assertIntegerCents(10.5, 'amount');
      }).toThrow(/integer cent amount/);
    });

    it('rejects currency mismatch', () => {
      expect(() => {
        assertSameCurrency('XCD', 'USD');
      }).toThrow(FINANCIAL_REASON_CODES.CURRENCY_MISMATCH);
    });

    it('rejects unconfigured FX conversion', () => {
      expect(() => {
        rejectFxConversion('XCD', 'USD', false);
      }).toThrow(FINANCIAL_REASON_CODES.FX_NOT_CONFIGURED);
    });
  });

  describe('fee schedule service', () => {
    it('requires authority to activate fee schedule version', async () => {
      prisma.feeScheduleVersion.findUnique.mockResolvedValue({
        id: 'version-1',
        feeScheduleId: 'schedule-1',
        status: FeeScheduleLifecycleStatus.DRAFT,
        feeSchedule: { id: 'schedule-1', currency: 'XCD' },
        items: [],
      });
      authorityEvaluation.evaluate.mockResolvedValue({
        outcome: AuthorityEvaluationOutcome.DENY,
        evaluationId: 'eval-1',
      });

      await expect(
        feeSchedules.approveAndActivateVersion({
          feeScheduleVersionId: 'version-1',
          actorIdentityId: 'identity-1',
          officeholderId: 'officeholder-1',
          functionAuthorityRecordId: 'far-1',
        }),
      ).rejects.toThrow(FINANCIAL_REASON_CODES.MISSING_AUTHORITY);
    });

    it('supersedes prior active version on activation', async () => {
      prisma.feeScheduleVersion.findUnique.mockResolvedValue({
        id: 'version-2',
        feeScheduleId: 'schedule-1',
        status: FeeScheduleLifecycleStatus.APPROVED,
        feeSchedule: { id: 'schedule-1', currency: 'XCD' },
        items: [],
      });
      authorityEvaluation.evaluate.mockResolvedValue({
        outcome: AuthorityEvaluationOutcome.ALLOW,
        evaluationId: 'eval-1',
      });
      prisma.feeScheduleVersion.findFirst.mockResolvedValue({
        id: 'version-1',
        status: FeeScheduleLifecycleStatus.ACTIVE,
      });
      prisma.feeScheduleVersion.update.mockResolvedValue({
        id: 'version-2',
        status: FeeScheduleLifecycleStatus.ACTIVE,
        items: [],
      });
      prisma.feeSchedule.update.mockResolvedValue({ id: 'schedule-1' });
      prisma.financialAuditEvent.create.mockResolvedValue({});

      const result = await feeSchedules.approveAndActivateVersion({
        feeScheduleVersionId: 'version-2',
        actorIdentityId: 'identity-1',
        officeholderId: 'officeholder-1',
        functionAuthorityRecordId: 'far-1',
      });

      expect(result.status).toBe(FeeScheduleLifecycleStatus.ACTIVE);
      expect(prisma.feeScheduleVersion.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'version-1' },
          data: { status: FeeScheduleLifecycleStatus.SUPERSEDED },
        }),
      );
    });
  });

  describe('fee assessment service', () => {
    it('pins schedule version and rejects inactive schedule', async () => {
      prisma.feeScheduleVersion.findUnique.mockResolvedValue({
        id: 'version-1',
        status: FeeScheduleLifecycleStatus.DRAFT,
        feeSchedule: {
          id: 'schedule-1',
          status: FeeScheduleLifecycleStatus.DRAFT,
          currency: 'XCD',
        },
        items: [],
      });

      await expect(
        feeAssessments.calculateAssessment({
          feeScheduleVersionId: 'version-1',
          serviceId: 'service-1',
          calculatedByIdentityId: 'identity-1',
        }),
      ).rejects.toThrow(FINANCIAL_REASON_CODES.SCHEDULE_NOT_ACTIVE);
    });

    it('calculates fees from schedule items without client amounts', async () => {
      const now = new Date();
      prisma.feeScheduleVersion.findUnique.mockResolvedValue({
        id: 'version-1',
        status: FeeScheduleLifecycleStatus.ACTIVE,
        feeSchedule: {
          id: 'schedule-1',
          status: FeeScheduleLifecycleStatus.ACTIVE,
          currency: 'XCD',
        },
        items: [
          {
            id: 'item-1',
            serviceId: 'service-1',
            feeCode: 'APPLICATION_FEE',
            description: 'Application fee',
            amountCents: 5000,
            currency: 'XCD',
            calculationMethod: 'FIXED',
            minimumAmountCents: null,
            maximumAmountCents: null,
            effectiveFrom: new Date(now.getTime() - 86400000),
            effectiveUntil: null,
          },
        ],
      });
      prisma.feeAssessment.create.mockResolvedValue({
        id: 'assessment-1',
        feeScheduleVersionId: 'version-1',
        totalCents: 5000,
        status: FeeAssessmentStatus.CALCULATED,
      });
      prisma.financialAuditEvent.create.mockResolvedValue({});

      const result = await feeAssessments.calculateAssessment({
        feeScheduleVersionId: 'version-1',
        serviceId: 'service-1',
        calculatedByIdentityId: 'identity-1',
      });

      expect(result.feeScheduleVersionId).toBe('version-1');
      expect(prisma.feeAssessment.create).toHaveBeenCalled();
      const createArgs = prisma.feeAssessment.create.mock.calls as [
        [{ data: { feeScheduleVersionId: string; totalCents: number } }],
      ];
      expect(createArgs[0][0].data.feeScheduleVersionId).toBe('version-1');
      expect(createArgs[0][0].data.totalCents).toBe(5000);
    });
  });

  describe('invoice service', () => {
    it('locks assessment and does not alter application state', async () => {
      prisma.feeAssessment.findUnique.mockResolvedValue({
        id: 'assessment-1',
        status: FeeAssessmentStatus.CALCULATED,
        currency: 'XCD',
        subtotalCents: 5000,
        adjustmentsCents: 0,
        totalCents: 5000,
        caseId: 'case-1',
        masterAdministrativeFileId: 'maf-1',
        calculatedItems: [
          {
            feeScheduleItemId: 'item-1',
            feeCode: 'APPLICATION_FEE',
            description: 'Application fee',
            quantity: 1,
            unitAmountCents: 5000,
            lineTotalCents: 5000,
            currency: 'XCD',
            calculationMethod: 'FIXED',
          },
        ],
        feeScheduleVersion: {
          items: [
            {
              id: 'item-1',
              feeCode: 'APPLICATION_FEE',
            },
          ],
        },
      });
      prisma.invoice.create.mockResolvedValue({
        id: 'invoice-1',
        status: InvoiceStatus.DRAFT,
        totalCents: 5000,
      });
      prisma.feeAssessment.update.mockResolvedValue({});
      prisma.financialAuditEvent.create.mockResolvedValue({});

      const result = await invoices.createInvoice({
        feeAssessmentId: 'assessment-1',
        institutionId: 'inst-1',
        payerIdentityId: 'identity-1',
        actorIdentityId: 'identity-1',
      });

      expect(result.status).toBe(InvoiceStatus.DRAFT);
      expect(prisma.feeAssessment.update).toHaveBeenCalledWith({
        where: { id: 'assessment-1' },
        data: { status: FeeAssessmentStatus.LOCKED_FOR_INVOICE },
      });
    });

    it('rejects invoice from locked assessment', async () => {
      prisma.feeAssessment.findUnique.mockResolvedValue({
        id: 'assessment-1',
        status: FeeAssessmentStatus.LOCKED_FOR_INVOICE,
      });

      await expect(
        invoices.createInvoice({
          feeAssessmentId: 'assessment-1',
          institutionId: 'inst-1',
          payerIdentityId: 'identity-1',
          actorIdentityId: 'identity-1',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
