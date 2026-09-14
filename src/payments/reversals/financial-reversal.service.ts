import { Injectable, NotFoundException } from '@nestjs/common';
import { FinancialReversalReason } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { PaymentsBoundaryService } from '../common/payments-boundary.service';

export interface RecordFinancialReversalInput {
  originalPaymentTransactionId?: string;
  originalRefundTransactionId?: string;
  reason: FinancialReversalReason;
  amountCents: number;
  currency?: string;
  recordedByIdentityId?: string;
  authorityEvaluationRecordId?: string;
  notes?: string;
}

@Injectable()
export class FinancialReversalService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly boundary: PaymentsBoundaryService,
  ) {}

  async recordReversal(input: RecordFinancialReversalInput) {
    this.boundary.assertFinancialCorrectionPreservesOriginal(true);
    this.boundary.assertAdjustmentCannotChangeGovernmentDecision(false);

    if (!input.originalPaymentTransactionId && !input.originalRefundTransactionId) {
      throw new NotFoundException('A reversal must reference an original transaction');
    }

    const reversalNumber = `FRV-${String(Date.now())}`;

    return this.prisma.financialReversalRecord.create({
      data: {
        reversalNumber,
        originalPaymentTransactionId: input.originalPaymentTransactionId,
        originalRefundTransactionId: input.originalRefundTransactionId,
        reason: input.reason,
        amountCents: input.amountCents,
        currency: input.currency ?? 'XCD',
        preservesOriginal: true,
        recordedByIdentityId: input.recordedByIdentityId,
        authorityEvaluationRecordId: input.authorityEvaluationRecordId,
        notes: input.notes,
      },
    });
  }
}
