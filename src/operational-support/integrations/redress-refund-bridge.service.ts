import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import {
  FinancialApprovalStatus,
  FinancialApprovalType,
  RedressImplementationActionStatus,
  RedressRemedyType,
  RefundRequestStatus,
} from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { RedressImplementationService } from '../../redress/implementation/redress-implementation.service';
import { REDRESS_REFUND_LIFECYCLE_SERVICE } from '../operational-support.constants';

export interface ExecuteRefundIfAuthorizedInput {
  actionId: string;
  paymentTransactionId: string;
  requestedAmountCents: number;
  reason: string;
  requestedByIdentityId?: string;
  authorizedByIdentityId?: string;
}

@Injectable()
export class RedressRefundBridgeService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redressImplementation: RedressImplementationService,
  ) {}

  async executeRefundIfAuthorized(input: ExecuteRefundIfAuthorizedInput) {
    const action = await this.prisma.redressImplementationAction.findUnique({
      where: { id: input.actionId },
      include: { implementationPlan: true },
    });

    if (!action) {
      throw new NotFoundException(`RedressImplementationAction ${input.actionId} not found`);
    }

    if (action.requiredOperation !== RedressRemedyType.REFUND_IF_AUTHORIZED) {
      throw new BadRequestException(
        'Redress refund bridge applies only to REFUND_IF_AUTHORIZED remedies',
      );
    }

    if (action.status !== RedressImplementationActionStatus.PENDING) {
      throw new BadRequestException('Refund bridge may execute only for pending implementation actions');
    }

    const transaction = await this.prisma.paymentTransaction.findUnique({
      where: { id: input.paymentTransactionId },
    });

    if (!transaction) {
      throw new NotFoundException(`PaymentTransaction ${input.paymentTransactionId} not found`);
    }

    const inProgress = await this.prisma.redressImplementationAction.update({
      where: { id: action.id },
      data: {
        status: RedressImplementationActionStatus.IN_PROGRESS,
        lifecycleServiceReference: REDRESS_REFUND_LIFECYCLE_SERVICE,
      },
    });

    const refundRequest = await this.prisma.refundRequest.create({
      data: {
        paymentTransactionId: input.paymentTransactionId,
        redressImplementationActionId: action.id,
        requestedAmountCents: input.requestedAmountCents,
        reason: input.reason,
        requestedByIdentityId: input.requestedByIdentityId,
        status: RefundRequestStatus.PENDING,
      },
    });

    const authorization = await this.prisma.refundAuthorization.create({
      data: {
        refundRequestId: refundRequest.id,
        authorizedByIdentityId: input.authorizedByIdentityId,
        authorizedAmountCents: input.requestedAmountCents,
        authorizationReference: `redress-refund:${refundRequest.id}`,
      },
    });

    await this.prisma.financialApprovalRecord.create({
      data: {
        approvalType: FinancialApprovalType.REFUND_AUTHORIZATION,
        status: FinancialApprovalStatus.APPROVED,
        subjectReference: refundRequest.id,
        subjectType: 'RefundRequest',
        approvedByIdentityId: input.authorizedByIdentityId,
        approvedAt: new Date(),
        refundAuthorizationId: authorization.id,
      },
    });

    await this.prisma.refundRequest.update({
      where: { id: refundRequest.id },
      data: { status: RefundRequestStatus.AUTHORIZED },
    });

    return this.redressImplementation.completeAction({
      actionId: inProgress.id,
      lifecycleServiceReference: REDRESS_REFUND_LIFECYCLE_SERVICE,
      verifiedByIdentityId: input.authorizedByIdentityId,
      verificationNotes: `Refund authorized via ${authorization.authorizationReference}`,
    });
  }
}
