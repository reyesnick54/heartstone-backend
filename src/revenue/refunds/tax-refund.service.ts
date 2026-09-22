import { Injectable, NotFoundException } from '@nestjs/common';
import { TaxRefundClaimStatus, TaxRefundDecisionOutcome } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { RevenueBoundaryService } from '../common/revenue-boundary.service';
import { REVENUE_REFUND_BOUNDARY_DISCLAIMER, TAX_REFUND_CLAIM_PREFIX } from '../revenue.constants';

@Injectable()
export class TaxRefundService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly boundary: RevenueBoundaryService,
  ) {}

  async requestRefund(input: {
    taxpayerAccountId: string;
    requestedByIdentityId: string;
    requestedAmountCents: number;
    currency?: string;
    clientPayload?: Record<string, unknown>;
  }) {
    if (input.clientPayload) {
      this.boundary.rejectClientTaxRefundFields(input.clientPayload);
    }

    const count = await this.prisma.taxRefundClaim.count();
    const claimReference = `${TAX_REFUND_CLAIM_PREFIX}-${String(count + 1).padStart(8, '0')}`;

    const claim = await this.prisma.taxRefundClaim.create({
      data: {
        taxpayerAccountId: input.taxpayerAccountId,
        claimReference,
        status: TaxRefundClaimStatus.REQUESTED,
        requestedAmountCents: input.requestedAmountCents,
        currency: input.currency ?? 'XCD',
        requestedByIdentityId: input.requestedByIdentityId,
      },
    });

    return {
      claim,
      refundDisclaimer: REVENUE_REFUND_BOUNDARY_DISCLAIMER,
      disbursementIssued: false,
    };
  }

  async authorizeRefundDecision(input: {
    taxRefundClaimId: string;
    decidedByOfficeholderId: string;
    outcome: TaxRefundDecisionOutcome;
    authorizedAmountCents?: number;
    financialRefundRequestId?: string;
  }) {
    const claim = await this.prisma.taxRefundClaim.findUnique({
      where: { id: input.taxRefundClaimId },
    });
    if (!claim) {
      throw new NotFoundException(`TaxRefundClaim ${input.taxRefundClaimId} not found`);
    }

    const decision = await this.prisma.taxRefundDecision.create({
      data: {
        taxRefundClaimId: claim.id,
        decisionReference: `${claim.claimReference}-DEC`,
        outcome: input.outcome,
        authorizedAmountCents: input.authorizedAmountCents,
        decidedByOfficeholderId: input.decidedByOfficeholderId,
        financialRefundRequestId: input.financialRefundRequestId,
      },
    });

    await this.prisma.taxRefundClaim.update({
      where: { id: claim.id },
      data: {
        status:
          input.outcome === TaxRefundDecisionOutcome.DENIED
            ? TaxRefundClaimStatus.DENIED
            : TaxRefundClaimStatus.APPROVED_FOR_PROCESSING,
      },
    });

    return { decision, financialDisbursementAutomatic: false };
  }
}
