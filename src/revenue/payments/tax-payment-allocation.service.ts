import { Injectable, NotFoundException } from '@nestjs/common';
import { TaxComplianceStatusCode, TaxLiabilityStatus } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { RevenueBoundaryService } from '../common/revenue-boundary.service';
import { REVENUE_PAYMENT_BOUNDARY_DISCLAIMER } from '../revenue.constants';

export interface RecordTaxPaymentAllocationInput {
  taxLiabilityId: string;
  paymentTransactionId: string;
  paymentAllocationId?: string;
  allocatedAmountCents: number;
  sideEffectContext?: string;
}

@Injectable()
export class TaxPaymentAllocationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly boundary: RevenueBoundaryService,
  ) {}

  async recordAllocation(input: RecordTaxPaymentAllocationInput) {
    this.boundary.assertPaymentDoesNotGrantClearance(input.sideEffectContext);

    const liability = await this.prisma.taxLiability.findUnique({
      where: { id: input.taxLiabilityId },
    });
    if (!liability) {
      throw new NotFoundException(`TaxLiability ${input.taxLiabilityId} not found`);
    }

    const paymentTransaction = await this.prisma.paymentTransaction.findUnique({
      where: { id: input.paymentTransactionId },
    });
    if (!paymentTransaction) {
      throw new NotFoundException(`PaymentTransaction ${input.paymentTransactionId} not found`);
    }

    const allocation = await this.prisma.taxPaymentAllocation.create({
      data: {
        taxLiabilityId: input.taxLiabilityId,
        paymentTransactionId: input.paymentTransactionId,
        paymentAllocationId: input.paymentAllocationId,
        allocatedAmountCents: input.allocatedAmountCents,
      },
    });

    const remaining = liability.principalCents - input.allocatedAmountCents;
    await this.prisma.taxLiability.update({
      where: { id: liability.id },
      data: {
        status:
          remaining <= 0 ? TaxLiabilityStatus.SATISFIED : TaxLiabilityStatus.PARTIALLY_SATISFIED,
      },
    });

    await this.prisma.taxComplianceStatus.create({
      data: {
        taxpayerAccountId: liability.taxpayerAccountId,
        statusCode:
          remaining <= 0
            ? TaxComplianceStatusCode.FILING_CURRENT
            : TaxComplianceStatusCode.BALANCE_OUTSTANDING,
        isClearanceEligible: false,
        basis: {
          paymentRecorded: true,
          clearanceGranted: false,
        },
      },
    });

    return {
      allocation,
      paymentDisclaimer: REVENUE_PAYMENT_BOUNDARY_DISCLAIMER,
      clearanceGranted: false,
    };
  }
}
