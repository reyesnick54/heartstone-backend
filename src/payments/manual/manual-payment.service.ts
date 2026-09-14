import { BadRequestException, Injectable } from '@nestjs/common';
import {
  AuthorityActionType,
  ManualPaymentSource,
  PaymentChannelCode,
  PaymentIntentStatus,
  PaymentTransactionStatus,
  PaymentTransactionType,
} from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { PaymentAllocationService } from '../allocations/payment-allocation.service';
import { hashPaymentPayload } from '../common/payment-hash.util';
import { nextSequentialReference } from '../common/payment-reference.util';
import { PaymentsBoundaryService } from '../common/payments-boundary.service';
import { InvoiceService } from '../invoicing/invoice.service';
import {
  PAYMENT_INTENT_NUMBER_PREFIX,
  PAYMENT_TRANSACTION_NUMBER_PREFIX,
} from '../payments.constants';
import { PaymentReceiptService } from '../receipts/payment-receipt.service';

export interface ConfirmManualPaymentInput {
  invoiceId: string;
  payerIdentityId: string;
  amountCents: number;
  currency: string;
  source: ManualPaymentSource;
  bankOrCounterReference: string;
  evidenceReference: string;
  reviewerOfficeholderId: string;
  confirmationDate: Date;
  reason: string;
  channel?: PaymentChannelCode;
  isAiActor?: boolean;
  authorityAction?: AuthorityActionType;
}

@Injectable()
export class ManualPaymentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly boundary: PaymentsBoundaryService,
    private readonly invoices: InvoiceService,
    private readonly allocations: PaymentAllocationService,
    private readonly receipts: PaymentReceiptService,
  ) {}

  async confirm(input: ConfirmManualPaymentInput) {
    this.boundary.assertAiCannotExecutePayment('CONFIRM_MANUAL_PAYMENT', input.isAiActor);
    this.boundary.assertManualPaymentRequiresReviewer(input.reviewerOfficeholderId);
    this.boundary.assertManualPaymentCannotImpersonateProviderSettled(true, 'MANUAL');

    if (input.authorityAction && input.authorityAction !== AuthorityActionType.CONFIRM_MANUAL_PAYMENT) {
      throw new BadRequestException('Manual payment confirmation requires CONFIRM_MANUAL_PAYMENT authority');
    }

    const invoice = await this.invoices.findById(input.invoiceId);
    this.boundary.assertCurrencyMatch(invoice.currency, input.currency);
    this.boundary.assertPaymentDoesNotExceedInvoice({
      invoiceTotalCents: invoice.totalAmountCents,
      currentPaidCents: invoice.paidAmountCents,
      paymentAmountCents: input.amountCents,
    });

    const paymentIntentNumber = await nextSequentialReference(
      this.prisma,
      PAYMENT_INTENT_NUMBER_PREFIX,
      'paymentIntentNumber',
      'paymentIntent',
    );
    const transactionNumber = await nextSequentialReference(
      this.prisma,
      PAYMENT_TRANSACTION_NUMBER_PREFIX,
      'transactionNumber',
      'paymentTransaction',
    );

    const channel = input.channel ?? PaymentChannelCode.COUNTER_PAYMENT;
    const payload = {
      source: input.source,
      bankOrCounterReference: input.bankOrCounterReference,
      evidenceReference: input.evidenceReference,
      reviewerOfficeholderId: input.reviewerOfficeholderId,
      reason: input.reason,
    };

    return this.prisma.$transaction(async (tx) => {
      const intent = await tx.paymentIntent.create({
        data: {
          paymentIntentNumber,
          invoiceId: invoice.id,
          payerIdentityId: input.payerIdentityId,
          payerOrganizationId: invoice.payerOrganizationId,
          requestedAmountCents: input.amountCents,
          currency: input.currency,
          providerCode: 'MANUAL',
          channel,
          providerIntentReference: `manual-${invoice.id}-${String(Date.now())}`,
          providerStatusRaw: 'manual_confirmed',
          status: PaymentIntentStatus.SETTLED,
        },
      });

      const transaction = await tx.paymentTransaction.create({
        data: {
          transactionNumber,
          paymentIntentId: intent.id,
          invoiceId: invoice.id,
          providerCode: 'MANUAL',
          providerTransactionReference: input.bankOrCounterReference,
          type: PaymentTransactionType.MANUAL_CONFIRMED_PAYMENT,
          amountCents: input.amountCents,
          currency: input.currency,
          status: PaymentTransactionStatus.COMPLETED,
          occurredAt: input.confirmationDate,
          providerPayloadHash: hashPaymentPayload(payload),
          settlementReference: input.bankOrCounterReference,
          isManualConfirmation: true,
          manualSource: input.source,
          manualBankReference: input.bankOrCounterReference,
          manualEvidenceReference: input.evidenceReference,
          manualReviewerOfficeholderId: input.reviewerOfficeholderId,
          manualConfirmationDate: input.confirmationDate,
          manualConfirmationReason: input.reason,
        },
      });

      await tx.paymentTransactionEvent.create({
        data: {
          paymentTransactionId: transaction.id,
          eventType: 'MANUAL_CONFIRMED',
          providerStatusRaw: 'manual_confirmed',
          canonicalStatus: PaymentTransactionStatus.COMPLETED,
          payloadHash: hashPaymentPayload(payload),
          occurredAt: input.confirmationDate,
        },
      });

      await this.invoices.applySettledPayment(invoice.id, input.amountCents, tx);
      await this.allocations.allocateSettlement(transaction.id, tx);
      const receipt = await this.receipts.issueForTransaction(transaction.id, channel, tx);

      return { intent, transaction, receipt };
    });
  }
}
