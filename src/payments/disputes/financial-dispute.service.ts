import { Injectable } from '@nestjs/common';
import { FinancialDisputeStatus, FinancialDisputeSubject } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { PaymentsBoundaryService } from '../common/payments-boundary.service';

export interface CreateFinancialDisputeInput {
  subject: FinancialDisputeSubject;
  description: string;
  filerIdentityId: string;
  invoiceId?: string;
  paymentTransactionId?: string;
  refundRequestId?: string;
  feeAdjustmentRequestId?: string;
  substantiveRouteReference?: string;
  isSubstantive?: boolean;
  eraseTransaction?: boolean;
}

@Injectable()
export class FinancialDisputeService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly boundary: PaymentsBoundaryService,
  ) {}

  async createDispute(input: CreateFinancialDisputeInput) {
    this.boundary.rejectForbiddenClientFields(input as unknown as Record<string, unknown>);
    this.boundary.assertDisputeDoesNotEraseTransaction(input.eraseTransaction);
    this.boundary.assertSubstantiveDisputeRequiresPhase10Route(
      input.isSubstantive ?? false,
      input.substantiveRouteReference,
    );

    const disputeNumber = `FD-${String(Date.now())}`;

    const status =
      input.isSubstantive && input.substantiveRouteReference
        ? FinancialDisputeStatus.REFERRED_TO_SUBSTANTIVE_ROUTE
        : FinancialDisputeStatus.OPEN;

    return this.prisma.financialDispute.create({
      data: {
        disputeNumber,
        subject: input.subject,
        description: input.description,
        filerIdentityId: input.filerIdentityId,
        invoiceId: input.invoiceId,
        paymentTransactionId: input.paymentTransactionId,
        refundRequestId: input.refundRequestId,
        feeAdjustmentRequestId: input.feeAdjustmentRequestId,
        substantiveRouteReference: input.substantiveRouteReference,
        status,
      },
    });
  }
}
