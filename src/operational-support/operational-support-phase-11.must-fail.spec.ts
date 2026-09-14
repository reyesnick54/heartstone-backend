import { createHmac } from 'node:crypto';

import { ForbiddenException } from '@nestjs/common';
import {
  FeeScheduleStatus,
  FinancialApprovalStatus,
  IntegrationAcceptanceStatus,
  InvoiceStatus,
  PaymentWebhookProcessingStatus,
} from '@prisma/client';

import { type PrismaService } from '../database/prisma.service';
import { OperationalSupportBoundaryService } from './common/operational-support-boundary.service';
import { CommunicationTemplateService } from './communications/communication-template.service';
import { TestPaymentProviderAdapter } from './financial/adapters/test-payment-provider.adapter';
import { FeeScheduleService } from './financial/fee-schedule.service';
import { type FinancialApprovalService } from './financial/financial-approval.service';
import { InvoiceService } from './financial/invoice.service';
import { PaymentWebhookService } from './financial/payment-webhook.service';
import { ReconciliationService } from './financial/reconciliation.service';
import { RefundService } from './financial/refund.service';
import { IntegrationAcceptanceService } from './integrations/integration-acceptance.service';
import {
  FORBIDDEN_CLIENT_FEE_ASSESSMENT_FIELDS,
  FORBIDDEN_CLIENT_FEE_SCHEDULE_FIELDS,
  FORBIDDEN_CLIENT_FINANCIAL_APPROVAL_FIELDS,
  FORBIDDEN_CLIENT_INVOICE_FIELDS,
  FORBIDDEN_CLIENT_PAYMENT_INTENT_FIELDS,
  FORBIDDEN_CLIENT_PAYMENT_TRANSACTION_FIELDS,
  FORBIDDEN_CLIENT_REFUND_FIELDS,
  FORBIDDEN_PAYMENT_CARD_STORAGE_FIELDS,
  FORBIDDEN_PAYMENT_SIDE_EFFECT_FIELDS,
  IMMUTABLE_ISSUED_INVOICE_FIELDS,
  OPERATIONAL_SUPPORT_BOUNDARY_DISCLAIMER,
  OPERATIONAL_SUPPORT_REASON_CODES,
  PHASE_11A_BOUNDARY_DISCLAIMER,
  PHASE_11B_BOUNDARY_DISCLAIMER,
  TEMPLATE_INJECTION_PATTERNS,
} from './operational-support.constants';

describe('Phase 11 must-fail invariants', () => {
  const boundary = new OperationalSupportBoundaryService();

  describe('OperationalSupportBoundaryService', () => {
    it('exposes operational support boundary disclaimer', () => {
      expect(OPERATIONAL_SUPPORT_BOUNDARY_DISCLAIMER).toContain('payment processing');
      expect(PHASE_11A_BOUNDARY_DISCLAIMER).toContain(
        'Payment obligation does not constitute approval',
      );
      expect(PHASE_11B_BOUNDARY_DISCLAIMER).toContain('Payment success does not alter case status');
    });

    it.each(FORBIDDEN_PAYMENT_CARD_STORAGE_FIELDS.map((field) => [field]))(
      'rejects storage of forbidden payment card field "%s"',
      (field) => {
        expect(() => {
          boundary.rejectPaymentCardStorageFields({ [field]: 'forbidden-value' });
        }).toThrow(ForbiddenException);
        expect(() => {
          boundary.rejectPaymentCardStorageFields({ [field]: 'forbidden-value' });
        }).toThrow(OPERATIONAL_SUPPORT_REASON_CODES.PAN_CVV_STORAGE_FORBIDDEN);
      },
    );

    it('rejects payment constituting approval when context implies approval granted', () => {
      expect(() => {
        boundary.assertPaymentDoesNotConstituteApproval('payment recorded; approval granted');
      }).toThrow(OPERATIONAL_SUPPORT_REASON_CODES.PAYMENT_NOT_APPROVAL);
    });

    it('rejects receipt constituting decision when context implies decision recorded', () => {
      expect(() => {
        boundary.assertReceiptDoesNotConstituteDecision('receipt issued; decision recorded');
      }).toThrow(OPERATIONAL_SUPPORT_REASON_CODES.RECEIPT_NOT_DECISION);
    });

    it.each(FORBIDDEN_CLIENT_FEE_SCHEDULE_FIELDS.map((field) => [field]))(
      'rejects client-set fee schedule field "%s"',
      (field) => {
        expect(() => {
          boundary.rejectClientFeeScheduleFields({ [field]: 'client-value' });
        }).toThrow(ForbiddenException);
      },
    );

    it.each(FORBIDDEN_CLIENT_FEE_ASSESSMENT_FIELDS.map((field) => [field]))(
      'rejects client-set fee assessment field "%s"',
      (field) => {
        expect(() => {
          boundary.rejectClientFeeAssessmentFields({ [field]: 'client-value' });
        }).toThrow(OPERATIONAL_SUPPORT_REASON_CODES.CLIENT_TOTALS_FORBIDDEN);
      },
    );

    it.each(FORBIDDEN_CLIENT_INVOICE_FIELDS.map((field) => [field]))(
      'rejects client-set invoice field "%s"',
      (field) => {
        expect(() => {
          boundary.rejectClientInvoiceFields({ [field]: 'client-value' });
        }).toThrow(OPERATIONAL_SUPPORT_REASON_CODES.CLIENT_TOTALS_FORBIDDEN);
      },
    );

    it.each(FORBIDDEN_CLIENT_PAYMENT_INTENT_FIELDS.map((field) => [field]))(
      'rejects client-set payment intent field "%s"',
      (field) => {
        expect(() => {
          boundary.rejectClientPaymentIntentFields({ [field]: 'client-value' });
        }).toThrow(OPERATIONAL_SUPPORT_REASON_CODES.CLIENT_TOTALS_FORBIDDEN);
      },
    );

    it.each(FORBIDDEN_CLIENT_PAYMENT_TRANSACTION_FIELDS.map((field) => [field]))(
      'rejects client-set payment transaction field "%s"',
      (field) => {
        expect(() => {
          boundary.rejectClientPaymentTransactionFields({ [field]: 'client-value' });
        }).toThrow(OPERATIONAL_SUPPORT_REASON_CODES.CLIENT_TOTALS_FORBIDDEN);
      },
    );

    it.each(FORBIDDEN_CLIENT_REFUND_FIELDS.map((field) => [field]))(
      'rejects client-set refund field "%s"',
      (field) => {
        expect(() => {
          boundary.rejectClientRefundFields({ [field]: 'client-value' });
        }).toThrow(OPERATIONAL_SUPPORT_REASON_CODES.CLIENT_TOTALS_FORBIDDEN);
      },
    );

    it.each(FORBIDDEN_CLIENT_FINANCIAL_APPROVAL_FIELDS.map((field) => [field]))(
      'rejects client-set financial approval field "%s"',
      (field) => {
        expect(() => {
          boundary.rejectClientFinancialApprovalFields({ [field]: 'client-value' });
        }).toThrow(ForbiddenException);
      },
    );

    it.each(FORBIDDEN_PAYMENT_SIDE_EFFECT_FIELDS.map((field) => [field]))(
      'rejects payment side-effect field "%s"',
      (field) => {
        expect(() => {
          boundary.rejectPaymentSideEffects({ [field]: 'mutated-value' });
        }).toThrow(OPERATIONAL_SUPPORT_REASON_CODES.PAYMENT_DOES_NOT_ALTER_CASE);
      },
    );

    it.each(IMMUTABLE_ISSUED_INVOICE_FIELDS.map((field) => [field]))(
      'rejects mutation of issued invoice field "%s"',
      (field) => {
        expect(() => {
          boundary.assertIssuedInvoiceTotalsImmutable(InvoiceStatus.ISSUED, { [field]: 'changed' });
        }).toThrow(OPERATIONAL_SUPPORT_REASON_CODES.ISSUED_INVOICE_IMMUTABLE);
      },
    );

    it('allows draft invoice total mutation', () => {
      expect(() => {
        boundary.assertIssuedInvoiceTotalsImmutable(InvoiceStatus.DRAFT, {
          totalAmountCents: 100,
        });
      }).not.toThrow();
    });

    it('rejects payment altering case status', () => {
      expect(() => {
        boundary.assertPaymentDoesNotAlterCaseStatus(true);
      }).toThrow(OPERATIONAL_SUPPORT_REASON_CODES.PAYMENT_DOES_NOT_ALTER_CASE);
    });

    it('rejects payment altering government decision', () => {
      expect(() => {
        boundary.assertPaymentDoesNotAlterGovernmentDecision(true);
      }).toThrow(OPERATIONAL_SUPPORT_REASON_CODES.PAYMENT_DOES_NOT_ALTER_DECISION);
    });

    it('rejects webhook amount mismatch', () => {
      expect(() => {
        boundary.assertWebhookAmountMatches(10_000, 9_999);
      }).toThrow(OPERATIONAL_SUPPORT_REASON_CODES.WEBHOOK_AMOUNT_MISMATCH);
    });

    it('rejects webhook currency mismatch', () => {
      expect(() => {
        boundary.assertWebhookCurrencyMatches('XCD', 'USD');
      }).toThrow(OPERATIONAL_SUPPORT_REASON_CODES.WEBHOOK_CURRENCY_MISMATCH);
    });

    it('rejects refund exceeding settled amount', () => {
      expect(() => {
        boundary.assertRefundWithinSettledAmount(10_000, 2_000, 9_000);
      }).toThrow(OPERATIONAL_SUPPORT_REASON_CODES.REFUND_EXCEEDS_SETTLED);
    });

    it('rejects refund authorizer matching requester', () => {
      expect(() => {
        boundary.assertRefundAuthorizerDiffersFromRequester('identity-1', 'identity-1');
      }).toThrow(OPERATIONAL_SUPPORT_REASON_CODES.REFUND_SEGREGATION_REQUIRED);
    });
  });

  describe('FeeScheduleService', () => {
    const financialApproval = {
      requestApprovalTx: jest.fn().mockResolvedValue({ id: 'approval-1' }),
      approvePendingForSubject: jest.fn().mockResolvedValue({ id: 'approval-1' }),
    };
    const authorityEvaluation = {
      evaluate: jest.fn().mockResolvedValue({ outcome: 'ALLOW' }),
    };
    const prisma = {
      feeSchedule: {
        create: jest.fn(),
        update: jest.fn(),
      },
      feeScheduleVersion: {
        findUnique: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
      },
      financialApprovalRecord: {
        findFirst: jest.fn(),
      },
      $transaction: jest.fn((callback: (tx: unknown) => Promise<unknown>) =>
        callback({
          feeScheduleVersion: {
            update: jest
              .fn()
              .mockResolvedValue({ id: 'version-1', status: FeeScheduleStatus.ACTIVE }),
          },
          feeSchedule: {
            update: jest.fn().mockResolvedValue({ id: 'schedule-1' }),
          },
        }),
      ),
    } as unknown as PrismaService;

    const service = new FeeScheduleService(
      prisma,
      boundary,
      financialApproval as unknown as FinancialApprovalService,
      authorityEvaluation as unknown as never,
    );

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('rejects client-supplied fee schedule status on create', async () => {
      await expect(
        service.createSchedule({
          institutionId: 'inst-1',
          code: 'FEE-1',
          name: 'Test Schedule',
          status: FeeScheduleStatus.ACTIVE,
          items: [{ itemCode: 'APP', label: 'Application fee', amountCents: 1000 }],
        } as never),
      ).rejects.toThrow(ForbiddenException);
    });

    it('requires financial approval before fee schedule activation', async () => {
      (prisma.feeScheduleVersion.findUnique as jest.Mock).mockResolvedValue({
        id: 'version-1',
        feeScheduleId: 'schedule-1',
        status: FeeScheduleStatus.APPROVED,
        feeSchedule: { id: 'schedule-1' },
        items: [],
      });
      (prisma.financialApprovalRecord.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(
        service.activateVersion({
          feeScheduleVersionId: 'version-1',
          approverIdentityId: 'identity-1',
          approverOfficeholderId: 'officeholder-1',
          functionAuthorityRecordId: 'function-1',
        }),
      ).rejects.toThrow(OPERATIONAL_SUPPORT_REASON_CODES.FEE_SCHEDULE_APPROVAL_REQUIRED);
    });

    it('rejects activation when version is not APPROVED', async () => {
      (prisma.feeScheduleVersion.findUnique as jest.Mock).mockResolvedValue({
        id: 'version-1',
        feeScheduleId: 'schedule-1',
        status: FeeScheduleStatus.DRAFT,
        feeSchedule: { id: 'schedule-1' },
        items: [],
      });
      (prisma.financialApprovalRecord.findFirst as jest.Mock).mockResolvedValue({
        id: 'approval-1',
        status: FinancialApprovalStatus.APPROVED,
      });

      await expect(
        service.activateVersion({
          feeScheduleVersionId: 'version-1',
          approverIdentityId: 'identity-1',
          approverOfficeholderId: 'officeholder-1',
          functionAuthorityRecordId: 'function-1',
        }),
      ).rejects.toThrow('Fee schedule version must be APPROVED before activation');
    });
  });

  describe('PaymentWebhookService', () => {
    const paymentProvider = new TestPaymentProviderAdapter();
    const paymentTransaction = {
      settlePayment: jest.fn().mockResolvedValue({ transaction: { id: 'txn-1' } }),
    };
    const prisma = {
      paymentProviderConfiguration: {
        findUnique: jest.fn(),
      },
      paymentProviderWebhookEvent: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      paymentIntent: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
    } as unknown as PrismaService;

    const service = new PaymentWebhookService(
      prisma,
      boundary,
      paymentTransaction as never,
      paymentProvider,
    );

    const webhookSecret = 'test-webhook-secret';
    const providerConfig = {
      id: 'provider-1',
      configuration: { webhookSecret },
    };

    function signBody(rawBody: string): string {
      return createHmac('sha256', webhookSecret).update(rawBody).digest('hex');
    }

    beforeEach(() => {
      jest.clearAllMocks();
      (prisma.paymentProviderConfiguration.findUnique as jest.Mock).mockResolvedValue(
        providerConfig,
      );
    });

    it('rejects webhook payload containing PAN', async () => {
      const rawBody = JSON.stringify({
        eventType: 'payment.succeeded',
        externalEventId: 'evt-pan',
        paymentIntentReference: 'PI-00000001',
        amountCents: 1000,
        currency: 'XCD',
        succeeded: true,
        pan: '4111111111111111',
      });

      await expect(
        service.processWebhook({
          paymentProviderConfigurationId: 'provider-1',
          rawBody,
          signature: signBody(rawBody),
        }),
      ).rejects.toThrow(OPERATIONAL_SUPPORT_REASON_CODES.PAN_CVV_STORAGE_FORBIDDEN);
    });

    it('rejects webhook with invalid signature', async () => {
      const rawBody = JSON.stringify({
        eventType: 'payment.succeeded',
        externalEventId: 'evt-bad-sig',
        paymentIntentReference: 'PI-00000001',
        amountCents: 1000,
        currency: 'XCD',
        succeeded: true,
        providerTransactionReference: 'prov-1',
      });

      await expect(
        service.processWebhook({
          paymentProviderConfigurationId: 'provider-1',
          rawBody,
          signature: 'invalid-signature',
        }),
      ).rejects.toThrow(OPERATIONAL_SUPPORT_REASON_CODES.WEBHOOK_SIGNATURE_INVALID);
    });

    it('returns idempotent duplicate for already processed webhook event', async () => {
      const rawBody = JSON.stringify({
        eventType: 'payment.succeeded',
        externalEventId: 'evt-dup',
        paymentIntentReference: 'PI-00000001',
        amountCents: 1000,
        currency: 'XCD',
        succeeded: true,
        providerTransactionReference: 'prov-dup',
      });

      (prisma.paymentProviderWebhookEvent.findUnique as jest.Mock).mockResolvedValue({
        id: 'event-1',
        processingStatus: PaymentWebhookProcessingStatus.PROCESSED,
      });

      const result = await service.processWebhook({
        paymentProviderConfigurationId: 'provider-1',
        rawBody,
        signature: signBody(rawBody),
      });

      expect(result.idempotent).toBe(true);
      expect(result.status).toBe(PaymentWebhookProcessingStatus.DUPLICATE);
    });

    it('rejects webhook replay while prior event is not fully processed', async () => {
      const rawBody = JSON.stringify({
        eventType: 'payment.succeeded',
        externalEventId: 'evt-replay',
        paymentIntentReference: 'PI-00000001',
        amountCents: 1000,
        currency: 'XCD',
        succeeded: true,
        providerTransactionReference: 'prov-replay',
      });

      (prisma.paymentProviderWebhookEvent.findUnique as jest.Mock).mockResolvedValue({
        id: 'event-1',
        processingStatus: PaymentWebhookProcessingStatus.AUTHENTICATED,
      });

      await expect(
        service.processWebhook({
          paymentProviderConfigurationId: 'provider-1',
          rawBody,
          signature: signBody(rawBody),
        }),
      ).rejects.toThrow(OPERATIONAL_SUPPORT_REASON_CODES.WEBHOOK_DUPLICATE);
    });

    it('rejects webhook amount mismatch against payment intent', async () => {
      const rawBody = JSON.stringify({
        eventType: 'payment.succeeded',
        externalEventId: 'evt-amount',
        paymentIntentReference: 'PI-00000001',
        amountCents: 500,
        currency: 'XCD',
        succeeded: true,
        providerTransactionReference: 'prov-amount',
      });

      (prisma.paymentProviderWebhookEvent.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.paymentIntent.findUnique as jest.Mock).mockResolvedValue({
        id: 'intent-1',
        amountCents: 1000,
        currency: 'XCD',
        invoice: { id: 'invoice-1' },
      });

      await expect(
        service.processWebhook({
          paymentProviderConfigurationId: 'provider-1',
          rawBody,
          signature: signBody(rawBody),
        }),
      ).rejects.toThrow(OPERATIONAL_SUPPORT_REASON_CODES.WEBHOOK_AMOUNT_MISMATCH);
    });

    it('rejects webhook currency mismatch against payment intent', async () => {
      const rawBody = JSON.stringify({
        eventType: 'payment.succeeded',
        externalEventId: 'evt-currency',
        paymentIntentReference: 'PI-00000001',
        amountCents: 1000,
        currency: 'USD',
        succeeded: true,
        providerTransactionReference: 'prov-currency',
      });

      (prisma.paymentProviderWebhookEvent.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.paymentIntent.findUnique as jest.Mock).mockResolvedValue({
        id: 'intent-1',
        amountCents: 1000,
        currency: 'XCD',
        invoice: { id: 'invoice-1' },
      });

      await expect(
        service.processWebhook({
          paymentProviderConfigurationId: 'provider-1',
          rawBody,
          signature: signBody(rawBody),
        }),
      ).rejects.toThrow(OPERATIONAL_SUPPORT_REASON_CODES.WEBHOOK_CURRENCY_MISMATCH);
    });
  });

  describe('IntegrationAcceptanceService', () => {
    const prisma = {
      integrationDefinition: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      integrationAcceptanceRecord: {
        create: jest
          .fn()
          .mockImplementation(({ data }) => Promise.resolve({ id: 'acc-1', ...data })),
      },
    } as unknown as PrismaService;

    const service = new IntegrationAcceptanceService(prisma);

    beforeEach(() => {
      jest.clearAllMocks();
      (prisma.integrationDefinition.findUnique as jest.Mock).mockResolvedValue({
        id: 'def-1',
        acceptanceRecords: [],
      });
    });

    it('requires initial acceptance at TECHNICALLY_CONNECTED', async () => {
      await expect(
        service.recordAcceptance({
          integrationDefinitionId: 'def-1',
          acceptanceStatus: IntegrationAcceptanceStatus.TESTED,
        }),
      ).rejects.toThrow('Initial acceptance must begin at TECHNICALLY_CONNECTED');
    });

    it('requires sequential acceptance progression', async () => {
      (prisma.integrationDefinition.findUnique as jest.Mock).mockResolvedValue({
        id: 'def-1',
        acceptanceRecords: [
          { acceptanceStatus: IntegrationAcceptanceStatus.TECHNICALLY_CONNECTED },
        ],
      });

      await expect(
        service.recordAcceptance({
          integrationDefinitionId: 'def-1',
          acceptanceStatus: IntegrationAcceptanceStatus.TECHNICALLY_READY,
        }),
      ).rejects.toThrow('Acceptance must progress sequentially');
    });

    it('rejects non-advancing acceptance status', async () => {
      (prisma.integrationDefinition.findUnique as jest.Mock).mockResolvedValue({
        id: 'def-1',
        acceptanceRecords: [{ acceptanceStatus: IntegrationAcceptanceStatus.TESTED }],
      });

      await expect(
        service.recordAcceptance({
          integrationDefinitionId: 'def-1',
          acceptanceStatus: IntegrationAcceptanceStatus.TESTED,
        }),
      ).rejects.toThrow('does not advance beyond current');
    });
  });

  describe('CommunicationTemplateService', () => {
    const prisma = {
      communicationTemplate: {
        create: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      communicationTemplateVersion: {
        create: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
      },
    } as unknown as PrismaService;

    const service = new CommunicationTemplateService(prisma);

    it.each([
      '<script>alert(1)</script>',
      'javascript:alert(1)',
      '{{{unsafe}}}',
      '<iframe src="evil"></iframe>',
      'onerror=alert(1)',
    ])('rejects unsafe template content pattern in "%s"', (content) => {
      expect(() => {
        service.assertTemplateContentSafe(content);
      }).toThrow('unsafe injection pattern');
    });

    it('defines template injection guard patterns', () => {
      expect(TEMPLATE_INJECTION_PATTERNS.length).toBeGreaterThanOrEqual(5);
    });

    it('rejects unbalanced template placeholders', async () => {
      await expect(
        service.createVersion({
          communicationTemplateId: 'template-1',
          versionNumber: '1.0.0',
          subjectTemplate: 'Hello {{name',
          bodyTemplate: 'Body',
        }),
      ).rejects.toThrow('unbalanced placeholders');
    });
  });

  describe('RefundService', () => {
    const financialApproval = {
      requestApprovalTx: jest.fn(),
      approvePendingForSubjectTx: jest.fn(),
    };
    const authorityEvaluation = {
      evaluate: jest.fn().mockResolvedValue({ outcome: 'ALLOW' }),
    };
    const paymentProvider = new TestPaymentProviderAdapter();
    const prisma = {
      paymentTransaction: { findUnique: jest.fn() },
      refundTransaction: { findMany: jest.fn().mockResolvedValue([]) },
      refundRequest: {
        create: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      refundAuthorization: { count: jest.fn().mockResolvedValue(0), create: jest.fn() },
      $transaction: jest.fn((callback: (tx: unknown) => Promise<unknown>) =>
        callback({
          refundAuthorization: { create: jest.fn().mockResolvedValue({ id: 'auth-1' }) },
          refundRequest: {
            update: jest.fn().mockResolvedValue({ id: 'request-1', status: 'AUTHORIZED' }),
          },
        }),
      ),
    } as unknown as PrismaService;

    const service = new RefundService(
      prisma,
      boundary,
      financialApproval as unknown as FinancialApprovalService,
      authorityEvaluation as never,
      paymentProvider,
    );

    beforeEach(() => {
      jest.clearAllMocks();
      (prisma.paymentTransaction.findUnique as jest.Mock).mockResolvedValue({
        id: 'txn-1',
        status: 'SETTLED',
        amountCents: 10_000,
        currency: 'XCD',
      });
    });

    it('rejects client-set authorized refund amount', async () => {
      await expect(
        service.requestRefund({
          paymentTransactionId: 'txn-1',
          requestedAmountCents: 1000,
          authorizedAmountCents: 1000,
          reason: 'Overpayment',
          requestedByIdentityId: 'identity-1',
        } as never),
      ).rejects.toThrow(OPERATIONAL_SUPPORT_REASON_CODES.CLIENT_TOTALS_FORBIDDEN);
    });

    it('rejects refund request exceeding settled balance', async () => {
      await expect(
        service.requestRefund({
          paymentTransactionId: 'txn-1',
          requestedAmountCents: 20_000,
          reason: 'Overpayment',
          requestedByIdentityId: 'identity-1',
        }),
      ).rejects.toThrow(OPERATIONAL_SUPPORT_REASON_CODES.REFUND_EXCEEDS_SETTLED);
    });

    it('rejects self-authorized refund', async () => {
      (prisma.refundRequest.findUnique as jest.Mock).mockResolvedValue({
        id: 'request-1',
        status: 'PENDING',
        requestedByIdentityId: 'identity-1',
        paymentTransactionId: 'txn-1',
        paymentTransaction: { id: 'txn-1', amountCents: 10_000 },
      });

      await expect(
        service.authorizeRefund({
          refundRequestId: 'request-1',
          authorizerIdentityId: 'identity-1',
          authorizerOfficeholderId: 'officeholder-1',
          functionAuthorityRecordId: 'function-1',
          authorizedAmountCents: 1000,
        }),
      ).rejects.toThrow(OPERATIONAL_SUPPORT_REASON_CODES.REFUND_SEGREGATION_REQUIRED);
    });
  });

  describe('ReconciliationService', () => {
    const financialApproval = {
      requestApproval: jest.fn(),
      approvePendingForSubject: jest.fn(),
    };
    const authorityEvaluation = {
      evaluate: jest.fn().mockResolvedValue({ outcome: 'ALLOW' }),
    };
    const prisma = {
      reconciliationBatch: {
        findUnique: jest.fn(),
        count: jest.fn().mockResolvedValue(0),
        create: jest.fn(),
        update: jest.fn(),
      },
      reconciliationItem: {
        create: jest.fn(),
        count: jest.fn(),
      },
      paymentTransaction: { findUnique: jest.fn() },
      financialApprovalRecord: { findFirst: jest.fn() },
    } as unknown as PrismaService;

    const service = new ReconciliationService(
      prisma,
      financialApproval as unknown as FinancialApprovalService,
      authorityEvaluation as never,
    );

    it('flags reconciliation mismatch items', async () => {
      (prisma.reconciliationBatch.findUnique as jest.Mock).mockResolvedValue({
        id: 'batch-1',
        status: 'OPEN',
      });
      (prisma.paymentTransaction.findUnique as jest.Mock).mockResolvedValue({
        id: 'txn-1',
        amountCents: 9_500,
      });
      (prisma.reconciliationItem.create as jest.Mock).mockResolvedValue({
        id: 'item-1',
        status: 'MISMATCH',
      });

      const item = await service.addItem({
        reconciliationBatchId: 'batch-1',
        paymentTransactionId: 'txn-1',
        expectedAmountCents: 10_000,
      });

      expect(item.status).toBe('MISMATCH');
    });

    it('blocks reconciliation closure with unresolved mismatches', async () => {
      (prisma.reconciliationBatch.findUnique as jest.Mock).mockResolvedValue({
        id: 'batch-1',
        status: 'EXCEPTION',
      });
      (prisma.reconciliationItem.count as jest.Mock).mockResolvedValue(1);

      await expect(
        service.closeBatch({
          reconciliationBatchId: 'batch-1',
          approverIdentityId: 'identity-1',
          approverOfficeholderId: 'officeholder-1',
          functionAuthorityRecordId: 'function-1',
        }),
      ).rejects.toThrow('unresolved mismatch exceptions');
    });

    it('requires reconciliation closure approval before close', async () => {
      (prisma.reconciliationBatch.findUnique as jest.Mock).mockResolvedValue({
        id: 'batch-1',
        status: 'IN_PROGRESS',
      });
      (prisma.reconciliationItem.count as jest.Mock).mockResolvedValue(0);
      (prisma.financialApprovalRecord.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(
        service.closeBatch({
          reconciliationBatchId: 'batch-1',
          approverIdentityId: 'identity-1',
          approverOfficeholderId: 'officeholder-1',
          functionAuthorityRecordId: 'function-1',
        }),
      ).rejects.toThrow(OPERATIONAL_SUPPORT_REASON_CODES.RECONCILIATION_CLOSURE_APPROVAL_REQUIRED);
    });
  });

  describe('Operational support reason codes', () => {
    it('defines payment-not-approval reason code', () => {
      expect(OPERATIONAL_SUPPORT_REASON_CODES.PAYMENT_NOT_APPROVAL).toBe('PAYMENT_NOT_APPROVAL');
    });

    it('defines active fee schedule required reason code', () => {
      expect(OPERATIONAL_SUPPORT_REASON_CODES.ACTIVE_FEE_SCHEDULE_REQUIRED).toBe(
        'ACTIVE_FEE_SCHEDULE_REQUIRED',
      );
    });

    it('defines webhook duplicate reason code', () => {
      expect(OPERATIONAL_SUPPORT_REASON_CODES.WEBHOOK_DUPLICATE).toBe('WEBHOOK_DUPLICATE');
    });

    it('defines reconciliation closure approval required reason code', () => {
      expect(OPERATIONAL_SUPPORT_REASON_CODES.RECONCILIATION_CLOSURE_APPROVAL_REQUIRED).toBe(
        'RECONCILIATION_CLOSURE_APPROVAL_REQUIRED',
      );
    });

    it('defines refund segregation required reason code', () => {
      expect(OPERATIONAL_SUPPORT_REASON_CODES.REFUND_SEGREGATION_REQUIRED).toBe(
        'REFUND_SEGREGATION_REQUIRED',
      );
    });
  });

  describe('InvoiceService', () => {
    const prisma = {
      invoice: {
        findUnique: jest.fn(),
        count: jest.fn().mockResolvedValue(0),
        create: jest.fn(),
      },
      feeAssessment: { findUnique: jest.fn(), update: jest.fn() },
      $transaction: jest.fn(),
    } as unknown as PrismaService;

    const service = new InvoiceService(prisma, boundary);

    it('rejects client-set invoice totals on issue', async () => {
      await expect(
        service.issueInvoice({
          feeAssessmentId: 'assessment-1',
          masterAdministrativeFileId: 'maf-1',
          totalAmountCents: 1000,
        } as never),
      ).rejects.toThrow(OPERATIONAL_SUPPORT_REASON_CODES.CLIENT_TOTALS_FORBIDDEN);
    });

    it('rejects patch to issued invoice totals', async () => {
      (prisma.invoice.findUnique as jest.Mock).mockResolvedValue({
        id: 'invoice-1',
        status: InvoiceStatus.ISSUED,
      });

      await expect(
        service.assertInvoicePatchAllowed('invoice-1', { totalAmountCents: 2000 }),
      ).rejects.toThrow(OPERATIONAL_SUPPORT_REASON_CODES.ISSUED_INVOICE_IMMUTABLE);
    });
  });
});
