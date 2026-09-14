import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import {
  FeeAdjustmentType,
  IdentityType,
  PaymentTransactionStatus,
  RefundRequestStatus,
} from '@prisma/client';

import { PrismaService } from '../database/prisma.service';
import { FeeAdjustmentService } from './adjustments/fee-adjustment.service';
import { FinancialApprovalService } from './approvals/financial-approval.service';
import { ArrearsService } from './arrears/arrears.service';
import { PaymentsBoundaryService } from './common/payments-boundary.service';
import { FinancialDisputeService } from './disputes/financial-dispute.service';
import { PAYMENT_PROVIDER_PORT } from './ports/payment-provider.port';
import { ReconciliationService } from './reconciliation/reconciliation.service';
import { RefundService } from './refunds/refund.service';
import { FinancialReversalService } from './reversals/financial-reversal.service';

describe('Phase 11C must-fail gates', () => {
  describe('PaymentsBoundaryService', () => {
    let boundary: PaymentsBoundaryService;

    beforeEach(async () => {
      const module = await Test.createTestingModule({
        providers: [PaymentsBoundaryService],
      }).compile();
      boundary = module.get(PaymentsBoundaryService);
    });

    it('rejects waiver when route not permitted', () => {
      expect(() => {
        boundary.assertAdjustmentRoutePermitted(FeeAdjustmentType.WAIVER, [FeeAdjustmentType.REDUCTION]);
      }).toThrow(ForbiddenException);
    });

    it('rejects AI approving financial actions', () => {
      expect(() => {
        boundary.assertAiCannotApproveFinancialAction('APPROVE_REFUND', IdentityType.SERVICE);
      }).toThrow(ForbiddenException);
    });

    it('rejects technical admin waiver', () => {
      expect(() => {
        boundary.assertTechnicalAdminCannotWaive(['TECHNICAL_ADMIN'], FeeAdjustmentType.WAIVER);
      }).toThrow(ForbiddenException);
    });

    it('rejects refund exceeding refundable balance', () => {
      expect(() => {
        boundary.assertRefundWithinRefundableBalance(5000, 1000);
      }).toThrow(BadRequestException);
    });

    it('rejects duplicate refund', () => {
      expect(() => {
        boundary.assertNoDuplicateRefund(1);
      }).toThrow(BadRequestException);
    });

    it('rejects chargeback as authorized refund', () => {
      expect(() => {
        boundary.assertChargebackNotAuthorizedRefund(true);
      }).toThrow(ForbiddenException);
    });

    it('preserves reconciliation mismatch', () => {
      expect(() => {
        boundary.assertReconciliationMismatchPreserved('AMOUNT_MISMATCH', true);
      }).toThrow(ForbiddenException);
    });

    it('cannot fabricate missing bank record', () => {
      expect(() => {
        boundary.assertCannotFabricateBankRecord(false);
      }).toThrow(BadRequestException);
    });

    it('arrears is not a sanction', () => {
      expect(() => {
        boundary.assertArrearsNotSanction('REVOKE_LICENSE');
      }).toThrow(ForbiddenException);
    });

    it('dispute does not erase transaction', () => {
      expect(() => {
        boundary.assertDisputeDoesNotEraseTransaction(true);
      }).toThrow(ForbiddenException);
    });

    it('financial correction preserves original', () => {
      expect(() => {
        boundary.assertFinancialCorrectionPreservesOriginal(false);
      }).toThrow(BadRequestException);
    });

    it('adjustment cannot change government decision', () => {
      expect(() => {
        boundary.assertAdjustmentCannotChangeGovernmentDecision(true);
      }).toThrow(ForbiddenException);
    });

    it('blocks self-approval', () => {
      expect(() => {
        boundary.assertSelfApprovalBlocked('identity-1', 'identity-1');
      }).toThrow(ForbiddenException);
    });

    it('failed refund is not settled', () => {
      expect(() => {
        boundary.assertFailedRefundNotSettled('FAILED');
      }).toThrow(BadRequestException);
    });
  });

  describe('RefundService', () => {
    const prisma = {
      paymentTransaction: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      refundRequest: {
        create: jest.fn(),
        update: jest.fn(),
        findUnique: jest.fn(),
      },
      refundAuthorization: {
        create: jest.fn(),
        findUnique: jest.fn(),
      },
      refundTransaction: {
        create: jest.fn(),
        update: jest.fn(),
        count: jest.fn().mockResolvedValue(0),
      },
      chargebackEvent: { create: jest.fn() },
    };

    const paymentProvider = {
      providerName: 'test',
      supportsRefunds: false,
      refund: jest.fn(),
    };

    let refundService: RefundService;

    beforeEach(async () => {
      const module = await Test.createTestingModule({
        providers: [
          RefundService,
          PaymentsBoundaryService,
          { provide: PrismaService, useValue: prisma },
          { provide: PAYMENT_PROVIDER_PORT, useValue: paymentProvider },
        ],
      }).compile();

      refundService = module.get(RefundService);
      jest.clearAllMocks();
    });

    it('rejects refund on chargeback payment', async () => {
      prisma.paymentTransaction.findUnique.mockResolvedValue({
        id: 'pay-1',
        status: PaymentTransactionStatus.CHARGEBACK,
        settledAmountCents: 10000,
        amountCents: 10000,
        chargebackEvents: [{ id: 'cb-1' }],
        refundRequests: [],
      });

      await expect(
        refundService.createRequest({
          invoiceId: 'inv-1',
          originalPaymentTransactionId: 'pay-1',
          amountCents: 1000,
          reason: 'test',
          requestedByIdentityId: 'id-1',
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('does not mark failed provider refund as settled', async () => {
      prisma.refundAuthorization.findUnique.mockResolvedValue({
        id: 'auth-1',
        status: 'APPROVED',
        authorizedAmountCents: 1000,
        currency: 'XCD',
        reason: 'test',
        refundRequestId: 'req-1',
        refundRequest: {
          id: 'req-1',
          originalPaymentTransactionId: 'pay-1',
          reason: 'test',
        },
      });
      prisma.paymentTransaction.findUnique.mockResolvedValue({
        id: 'pay-1',
        providerReference: 'PAY-1',
      });
      paymentProvider.supportsRefunds = true;
      paymentProvider.refund.mockResolvedValue({ success: false, errorMessage: 'declined' });
      prisma.refundTransaction.create.mockResolvedValue({
        id: 'rt-1',
        status: RefundRequestStatus.FAILED,
      });
      prisma.refundRequest.update.mockResolvedValue({});

      const result = await refundService.executeRefund({
        refundRequestId: 'req-1',
        authorizationId: 'auth-1',
      });

      expect(result.settled).toBe(false);
      expect(result.transaction.status).toBe(RefundRequestStatus.FAILED);
      paymentProvider.supportsRefunds = false;
    });

    it('creates pending external execution when no provider integration', async () => {
      prisma.refundAuthorization.findUnique.mockResolvedValue({
        id: 'auth-1',
        status: 'APPROVED',
        authorizedAmountCents: 1000,
        currency: 'XCD',
        reason: 'test',
        refundRequestId: 'req-1',
        refundRequest: {
          id: 'req-1',
          originalPaymentTransactionId: 'pay-1',
          reason: 'test',
        },
      });
      prisma.paymentTransaction.findUnique.mockResolvedValue({
        id: 'pay-1',
        providerReference: null,
      });
      prisma.refundTransaction.create.mockResolvedValue({
        id: 'rt-1',
        status: RefundRequestStatus.PENDING_PROVIDER,
      });
      prisma.refundTransaction.update.mockResolvedValue({
        id: 'rt-1',
        status: RefundRequestStatus.PENDING_PROVIDER,
      });
      prisma.refundRequest.update.mockResolvedValue({});

      const result = await refundService.executeRefund({
        refundRequestId: 'req-1',
        authorizationId: 'auth-1',
      });

      expect(result.pendingExternalExecution).toBe(true);
      expect(result.transaction.status).not.toBe(RefundRequestStatus.SETTLED);
    });
  });

  describe('FeeAdjustmentService', () => {
    const prisma = {
      invoice: { findUnique: jest.fn(), update: jest.fn() },
      feeAdjustmentRequest: { create: jest.fn(), findUnique: jest.fn(), update: jest.fn() },
      feeAdjustmentDecision: { create: jest.fn() },
    };

    let feeAdjustmentService: FeeAdjustmentService;

    beforeEach(async () => {
      const module = await Test.createTestingModule({
        providers: [
          FeeAdjustmentService,
          PaymentsBoundaryService,
          { provide: PrismaService, useValue: prisma },
        ],
      }).compile();

      feeAdjustmentService = module.get(FeeAdjustmentService);
      jest.clearAllMocks();
    });

    it('rejects waiver when schedule does not permit route', async () => {
      prisma.invoice.findUnique.mockResolvedValue({
        id: 'inv-1',
        feeScheduleVersion: {
          permittedAdjustmentRoutes: [FeeAdjustmentType.REDUCTION],
        },
      });

      await expect(
        feeAdjustmentService.createRequest({
          adjustmentType: FeeAdjustmentType.WAIVER,
          basis: 'hardship',
          requestedAmountCents: 1000,
          source: 'OFFICER',
          requesterIdentityId: 'id-1',
          invoiceId: 'inv-1',
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('blocks self-approval on fee adjustment decision', async () => {
      prisma.feeAdjustmentRequest.findUnique.mockResolvedValue({
        id: 'req-1',
        adjustmentType: FeeAdjustmentType.REDUCTION,
        requesterIdentityId: 'id-1',
        decision: null,
        invoice: {
          feeScheduleVersion: {
            permittedAdjustmentRoutes: [FeeAdjustmentType.REDUCTION],
          },
        },
      });

      await expect(
        feeAdjustmentService.decide({
          requestId: 'req-1',
          deciderIdentityId: 'id-1',
          deciderIdentityType: IdentityType.INDIVIDUAL,
          approvedAmountCents: 500,
          reason: 'approved',
          effectiveDate: new Date(),
        }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('ReconciliationService', () => {
    const prisma = {
      reconciliationBatch: { findUnique: jest.fn(), create: jest.fn() },
      reconciliationItem: { create: jest.fn(), findUnique: jest.fn() },
      reconciliationException: { create: jest.fn() },
      paymentTransaction: { findUnique: jest.fn() },
      refundTransaction: { findUnique: jest.fn() },
      receipt: { findUnique: jest.fn() },
    };

    let reconciliationService: ReconciliationService;

    beforeEach(async () => {
      const module = await Test.createTestingModule({
        providers: [
          ReconciliationService,
          PaymentsBoundaryService,
          { provide: PrismaService, useValue: prisma },
        ],
      }).compile();

      reconciliationService = module.get(ReconciliationService);
      jest.clearAllMocks();
    });

    it('preserves amount mismatch without forcing match', async () => {
      prisma.reconciliationBatch.findUnique.mockResolvedValue({ id: 'batch-1' });
      prisma.paymentTransaction.findUnique.mockResolvedValue({
        settledAmountCents: 10000,
        amountCents: 10000,
        currency: 'XCD',
      });
      prisma.reconciliationItem.create.mockResolvedValue({
        id: 'item-1',
        matchStatus: 'AMOUNT_MISMATCH',
      });
      prisma.reconciliationException.create.mockResolvedValue({});

      const item = await reconciliationService.addItem({
        batchId: 'batch-1',
        paymentTransactionId: 'pay-1',
        externalReference: 'EXT-1',
        externalAmountCents: 9000,
        externalCurrency: 'XCD',
      });

      expect(item.matchStatus).toBe('AMOUNT_MISMATCH');
    });

    it('cannot fabricate bank record without external evidence', async () => {
      prisma.reconciliationBatch.findUnique.mockResolvedValue({ id: 'batch-1' });

      await expect(
        reconciliationService.addItem({
          batchId: 'batch-1',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('ArrearsService', () => {
    const prisma = {
      invoice: { findUnique: jest.fn() },
      arrearsRecord: { findFirst: jest.fn(), create: jest.fn(), update: jest.fn() },
    };

    let arrearsService: ArrearsService;

    beforeEach(async () => {
      const module = await Test.createTestingModule({
        providers: [
          ArrearsService,
          PaymentsBoundaryService,
          { provide: PrismaService, useValue: prisma },
        ],
      }).compile();

      arrearsService = module.get(ArrearsService);
      jest.clearAllMocks();
    });

    it('does not create sanction from arrears projection', async () => {
      await expect(
        arrearsService.projectArrears({
          invoiceId: 'inv-1',
          enforcementAction: 'REVOKE',
        }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('FinancialDisputeService', () => {
    const prisma = {
      financialDispute: { create: jest.fn() },
    };

    let disputeService: FinancialDisputeService;

    beforeEach(async () => {
      const module = await Test.createTestingModule({
        providers: [
          FinancialDisputeService,
          PaymentsBoundaryService,
          { provide: PrismaService, useValue: prisma },
        ],
      }).compile();

      disputeService = module.get(FinancialDisputeService);
      jest.clearAllMocks();
    });

    it('does not erase transaction on dispute', async () => {
      await expect(
        disputeService.createDispute({
          subject: 'AMOUNT',
          description: 'dispute',
          filerIdentityId: 'id-1',
          eraseTransaction: true,
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('requires phase 10 route for substantive disputes', async () => {
      await expect(
        disputeService.createDispute({
          subject: 'CALCULATION',
          description: 'substantive',
          filerIdentityId: 'id-1',
          isSubstantive: true,
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('FinancialReversalService', () => {
    const prisma = {
      financialReversalRecord: { create: jest.fn() },
    };

    let reversalService: FinancialReversalService;

    beforeEach(async () => {
      const module = await Test.createTestingModule({
        providers: [
          FinancialReversalService,
          PaymentsBoundaryService,
          { provide: PrismaService, useValue: prisma },
        ],
      }).compile();

      reversalService = module.get(FinancialReversalService);
      jest.clearAllMocks();
    });

    it('preserves original on financial reversal', async () => {
      prisma.financialReversalRecord.create.mockResolvedValue({
        id: 'rev-1',
        preservesOriginal: true,
      });

      const record = await reversalService.recordReversal({
        originalPaymentTransactionId: 'pay-1',
        reason: 'ACCOUNTING_CORRECTION',
        amountCents: 100,
      });

      expect(record.preservesOriginal).toBe(true);
      expect(prisma.financialReversalRecord.create).toHaveBeenCalledTimes(1);
    });
  });

  describe('FinancialApprovalService', () => {
    const prisma = {
      financialApprovalRecord: { create: jest.fn() },
    };

    let approvalService: FinancialApprovalService;

    beforeEach(async () => {
      const module = await Test.createTestingModule({
        providers: [
          FinancialApprovalService,
          PaymentsBoundaryService,
          { provide: PrismaService, useValue: prisma },
        ],
      }).compile();

      approvalService = module.get(FinancialApprovalService);
      jest.clearAllMocks();
    });

    it('enforces segregation on financial approval', async () => {
      await expect(
        approvalService.recordApproval({
          requesterIdentityId: 'id-1',
          approverIdentityId: 'id-1',
          approverIdentityType: IdentityType.INDIVIDUAL,
          amountCents: 1000,
          purpose: 'REFUND',
          decision: 'APPROVED',
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('rejects AI financial approval', async () => {
      await expect(
        approvalService.recordApproval({
          requesterIdentityId: 'id-1',
          approverIdentityId: 'id-2',
          approverIdentityType: IdentityType.SERVICE,
          amountCents: 1000,
          purpose: 'REFUND',
          decision: 'APPROVED',
        }),
      ).rejects.toThrow(ForbiddenException);
    });
  });
});
