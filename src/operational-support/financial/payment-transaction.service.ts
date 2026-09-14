import { createHash } from 'node:crypto';

import { Injectable, NotFoundException } from '@nestjs/common';
import {
  InvoiceStatus,
  PaymentIntentStatus,
  PaymentTransaction,
  PaymentTransactionStatus,
  Prisma,
} from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { OperationalSupportBoundaryService } from '../common/operational-support-boundary.service';
import {
  PAYMENT_RECEIPT_NUMBER_PREFIX,
  PHASE_11B_BOUNDARY_DISCLAIMER,
} from '../operational-support.constants';

export interface SettlePaymentInput {
  paymentIntentId: string;
  paymentProviderConfigurationId: string;
  providerTransactionReference: string;
  amountCents: number;
  currency: string;
  rawResponse?: Prisma.InputJsonValue;
}

@Injectable()
export class PaymentTransactionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly boundary: OperationalSupportBoundaryService,
  ) {}

  async findById(id: string): Promise<PaymentTransaction | null> {
    return this.prisma.paymentTransaction.findUnique({
      where: { id },
      include: { allocations: true, receipts: true },
    });
  }

  async getByIdOrThrow(id: string): Promise<PaymentTransaction> {
    const transaction = await this.findById(id);
    if (!transaction) {
      throw new NotFoundException(`PaymentTransaction ${id} not found`);
    }
    return transaction;
  }

  async settlePayment(input: SettlePaymentInput) {
    this.boundary.rejectClientPaymentTransactionFields(input as unknown as Record<string, unknown>);
    this.boundary.rejectPaymentSideEffects(input as unknown as Record<string, unknown>);
    this.boundary.assertPaymentDoesNotAlterCaseStatus(false);
    this.boundary.assertPaymentDoesNotAlterGovernmentDecision(false);
    this.boundary.assertPaymentDoesNotConstituteApproval();
    this.boundary.assertReceiptDoesNotConstituteDecision();

    const paymentIntent = await this.prisma.paymentIntent.findUnique({
      where: { id: input.paymentIntentId },
      include: {
        invoice: {
          include: { lines: true },
        },
      },
    });

    if (!paymentIntent) {
      throw new NotFoundException(`PaymentIntent ${input.paymentIntentId} not found`);
    }

    this.boundary.assertWebhookAmountMatches(paymentIntent.amountCents, input.amountCents);
    this.boundary.assertWebhookCurrencyMatches(paymentIntent.currency, input.currency);

    const existingTransaction = await this.prisma.paymentTransaction.findUnique({
      where: {
        paymentProviderConfigurationId_providerTransactionReference: {
          paymentProviderConfigurationId: input.paymentProviderConfigurationId,
          providerTransactionReference: input.providerTransactionReference,
        },
      },
      include: { receipts: true },
    });

    if (existingTransaction?.status === PaymentTransactionStatus.SETTLED) {
      return {
        transaction: existingTransaction,
        receipt: existingTransaction.receipts[0] ?? null,
        invoice: paymentIntent.invoice,
        receiptDisclaimer: PHASE_11B_BOUNDARY_DISCLAIMER,
        idempotent: true,
      };
    }

    const settledAt = new Date();

    return this.prisma.$transaction(async (tx) => {
      const transaction = await tx.paymentTransaction.upsert({
        where: {
          paymentProviderConfigurationId_providerTransactionReference: {
            paymentProviderConfigurationId: input.paymentProviderConfigurationId,
            providerTransactionReference: input.providerTransactionReference,
          },
        },
        create: {
          paymentIntentId: paymentIntent.id,
          paymentProviderConfigurationId: input.paymentProviderConfigurationId,
          providerTransactionReference: input.providerTransactionReference,
          status: PaymentTransactionStatus.SETTLED,
          amountCents: input.amountCents,
          currency: input.currency,
          authorizedAt: settledAt,
          settledAt,
          rawResponse: input.rawResponse,
        },
        update: {
          status: PaymentTransactionStatus.SETTLED,
          settledAt,
          rawResponse: input.rawResponse,
        },
      });

      const receiptCount = await tx.paymentReceipt.count();
      const receiptNumber = `${PAYMENT_RECEIPT_NUMBER_PREFIX}-${String(receiptCount + 1).padStart(8, '0')}`;
      const contentHash = createHash('sha256')
        .update(
          JSON.stringify({
            transactionId: transaction.id,
            amountCents: transaction.amountCents,
            currency: transaction.currency,
            settledAt: settledAt.toISOString(),
          }),
        )
        .digest('hex');

      const receipt = await tx.paymentReceipt.create({
        data: {
          paymentTransactionId: transaction.id,
          receiptNumber,
          contentHash,
          issuedAt: settledAt,
        },
      });

      await tx.paymentAllocation.create({
        data: {
          paymentTransactionId: transaction.id,
          invoiceLineId: paymentIntent.invoice.lines[0]?.id,
          allocatedAmountCents: input.amountCents,
          allocationType: 'INVOICE_SETTLEMENT',
        },
      });

      const newAmountPaidCents = paymentIntent.invoice.amountPaidCents + input.amountCents;
      const invoiceStatus =
        newAmountPaidCents >= paymentIntent.invoice.totalAmountCents
          ? InvoiceStatus.PAID
          : InvoiceStatus.PARTIALLY_PAID;

      const invoice = await tx.invoice.update({
        where: { id: paymentIntent.invoiceId },
        data: {
          amountPaidCents: newAmountPaidCents,
          status: invoiceStatus,
        },
      });

      await tx.paymentIntent.update({
        where: { id: paymentIntent.id },
        data: {
          status: PaymentIntentStatus.SUCCEEDED,
          completedAt: settledAt,
        },
      });

      return {
        transaction,
        receipt,
        invoice,
        receiptDisclaimer: PHASE_11B_BOUNDARY_DISCLAIMER,
        idempotent: false,
      };
    });
  }
}
