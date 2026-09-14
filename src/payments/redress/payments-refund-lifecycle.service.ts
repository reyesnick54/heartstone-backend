import { Injectable, NotFoundException } from '@nestjs/common';
import { IdentityType } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { RefundService } from '../refunds/refund.service';

export interface ExecuteRedressRefundInput {
  redressDecisionId: string;
  invoiceId: string;
  originalPaymentTransactionId: string;
  amountCents: number;
  reason: string;
  requestedByIdentityId: string;
  requesterIdentityId: string;
  approverIdentityId: string;
  approverIdentityType: IdentityType;
  approverOfficeholderId?: string;
  authorityEvaluationRecordId?: string;
  financialAuthorityReference?: string;
}

@Injectable()
export class PaymentsRefundLifecycleService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly refundService: RefundService,
  ) {}

  async executeRedressRefund(input: ExecuteRedressRefundInput) {
    const redressDecision = await this.prisma.redressDecision.findUnique({
      where: { id: input.redressDecisionId },
      include: { remedies: true },
    });

    if (!redressDecision) {
      throw new NotFoundException(`RedressDecision ${input.redressDecisionId} not found`);
    }

    const hasRefundRemedy = redressDecision.remedies.some(
      (remedy) => remedy.remedyType === 'REFUND_IF_AUTHORIZED',
    );

    if (!hasRefundRemedy) {
      throw new NotFoundException('Redress decision does not include REFUND_IF_AUTHORIZED remedy');
    }

    const request = await this.refundService.createRequest({
      invoiceId: input.invoiceId,
      originalPaymentTransactionId: input.originalPaymentTransactionId,
      amountCents: input.amountCents,
      reason: input.reason,
      requestedByIdentityId: input.requestedByIdentityId,
      redressDecisionId: input.redressDecisionId,
      financialAuthorityReference: input.financialAuthorityReference,
    });

    const authorization = await this.refundService.authorize({
      refundRequestId: request.id,
      requesterIdentityId: input.requesterIdentityId,
      approverIdentityId: input.approverIdentityId,
      approverIdentityType: input.approverIdentityType,
      approverOfficeholderId: input.approverOfficeholderId,
      authorityEvaluationRecordId: input.authorityEvaluationRecordId,
      authorizedAmountCents: input.amountCents,
      reason: `Phase 10 redress remedy implementation: ${input.reason}`,
    });

    return this.refundService.executeRefund({
      refundRequestId: request.id,
      authorizationId: authorization.id,
    });
  }
}
