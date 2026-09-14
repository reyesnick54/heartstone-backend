import { Injectable, NotFoundException } from '@nestjs/common';
import {
  ReconciliationBatchSource,
  ReconciliationBatchStatus,
  ReconciliationMatchStatus,
} from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { PaymentsBoundaryService } from '../common/payments-boundary.service';

export interface CreateReconciliationBatchInput {
  periodStart: Date;
  periodEnd: Date;
  source: ReconciliationBatchSource;
  currency?: string;
  expectedTotalCents: number;
  externalTotalCents: number;
}

export interface AddReconciliationItemInput {
  batchId: string;
  paymentTransactionId?: string;
  refundTransactionId?: string;
  receiptId?: string;
  externalReference?: string;
  externalAmountCents?: number;
  externalCurrency?: string;
}

export interface MatchReconciliationItemInput {
  itemId: string;
  forceMatch?: boolean;
}

@Injectable()
export class ReconciliationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly boundary: PaymentsBoundaryService,
  ) {}

  async createBatch(input: CreateReconciliationBatchInput) {
    const batchNumber = `RCB-${String(Date.now())}`;
    const unmatchedTotalCents = Math.abs(input.expectedTotalCents - input.externalTotalCents);

    return this.prisma.reconciliationBatch.create({
      data: {
        batchNumber,
        periodStart: input.periodStart,
        periodEnd: input.periodEnd,
        source: input.source,
        currency: input.currency ?? 'XCD',
        expectedTotalCents: input.expectedTotalCents,
        externalTotalCents: input.externalTotalCents,
        matchedTotalCents: 0,
        unmatchedTotalCents,
        status: ReconciliationBatchStatus.PENDING,
      },
    });
  }

  async addItem(input: AddReconciliationItemInput) {
    const batch = await this.prisma.reconciliationBatch.findUnique({
      where: { id: input.batchId },
    });

    if (!batch) {
      throw new NotFoundException(`ReconciliationBatch ${input.batchId} not found`);
    }

    let matchStatus: ReconciliationMatchStatus = ReconciliationMatchStatus.UNDER_REVIEW;
    let internalAmountCents: number | undefined;
    let internalCurrency: string | undefined;

    if (input.paymentTransactionId) {
      const payment = await this.prisma.paymentTransaction.findUnique({
        where: { id: input.paymentTransactionId },
      });
      if (payment) {
        internalAmountCents = payment.settledAmountCents || payment.amountCents;
        internalCurrency = payment.currency;
      }
    } else if (input.refundTransactionId) {
      const refund = await this.prisma.refundTransaction.findUnique({
        where: { id: input.refundTransactionId },
      });
      if (refund) {
        internalAmountCents = refund.settledAmountCents || refund.amountCents;
        internalCurrency = refund.currency;
      }
    } else if (input.receiptId) {
      const receipt = await this.prisma.receipt.findUnique({
        where: { id: input.receiptId },
      });
      if (receipt) {
        internalAmountCents = receipt.amountCents;
        internalCurrency = receipt.currency;
      }
    }

    if (!input.paymentTransactionId && !input.refundTransactionId && !input.receiptId) {
      if (!input.externalReference) {
        this.boundary.assertCannotFabricateBankRecord(false);
      }
      matchStatus = ReconciliationMatchStatus.MISSING_INTERNAL;
    } else if (!input.externalReference) {
      matchStatus = ReconciliationMatchStatus.MISSING_EXTERNAL;
    } else if (
      internalAmountCents !== undefined &&
      input.externalAmountCents !== undefined &&
      internalAmountCents !== input.externalAmountCents
    ) {
      matchStatus = ReconciliationMatchStatus.AMOUNT_MISMATCH;
    } else if (
      internalCurrency &&
      input.externalCurrency &&
      internalCurrency !== input.externalCurrency
    ) {
      matchStatus = ReconciliationMatchStatus.CURRENCY_MISMATCH;
    } else if (input.externalReference && internalAmountCents !== undefined) {
      matchStatus = ReconciliationMatchStatus.MATCHED;
    }

    const item = await this.prisma.reconciliationItem.create({
      data: {
        batchId: input.batchId,
        paymentTransactionId: input.paymentTransactionId,
        refundTransactionId: input.refundTransactionId,
        receiptId: input.receiptId,
        externalReference: input.externalReference,
        externalAmountCents: input.externalAmountCents,
        externalCurrency: input.externalCurrency,
        matchStatus,
      },
    });

    if (matchStatus !== ReconciliationMatchStatus.MATCHED) {
      const differenceCents =
        (input.externalAmountCents ?? 0) - (internalAmountCents ?? 0);

      await this.prisma.reconciliationException.create({
        data: {
          itemId: item.id,
          differenceCents,
        },
      });
    }

    return item;
  }

  async attemptMatch(input: MatchReconciliationItemInput) {
    const item = await this.prisma.reconciliationItem.findUnique({
      where: { id: input.itemId },
    });

    if (!item) {
      throw new NotFoundException(`ReconciliationItem ${input.itemId} not found`);
    }

    this.boundary.assertReconciliationMismatchPreserved(item.matchStatus, input.forceMatch);

    return item;
  }

  async recordMissingExternal(batchId: string, externalReference: string, externalAmountCents: number) {
    return this.addItem({
      batchId,
      externalReference,
      externalAmountCents,
      externalCurrency: 'XCD',
    });
  }
}
