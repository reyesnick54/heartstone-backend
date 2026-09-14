import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AuthorityActionType,
  AuthorityEvaluationOutcome,
  FinancialApprovalType,
  PaymentTransactionStatus,
  RefundRequestStatus,
  RefundTransactionStatus,
} from '@prisma/client';

import { AuthorityEvaluationService } from '../../authority/evaluation/authority-evaluation.service';
import { PrismaService } from '../../database/prisma.service';
import { OperationalSupportBoundaryService } from '../common/operational-support-boundary.service';
import { REFUND_AUTHORIZATION_REFERENCE_PREFIX } from '../operational-support.constants';
import { FinancialApprovalService } from './financial-approval.service';
import {
  PAYMENT_PROVIDER_PORT,
  PaymentProviderPort,
} from './ports/payment-provider.port';

export interface RequestRefundInput {
  paymentTransactionId: string;
  requestedAmountCents: number;
  reason: string;
  requestedByIdentityId: string;
  redressImplementationActionId?: string;
}

export interface AuthorizeRefundInput {
  refundRequestId: string;
  authorizerIdentityId: string;
  authorizerOfficeholderId: string;
  functionAuthorityRecordId: string;
  authorizedAmountCents: number;
  appointmentId?: string;
  delegationId?: string;
}

export interface ProcessRefundInput {
  refundRequestId: string;
  paymentProviderConfigurationId: string;
}

@Injectable()
export class RefundService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly boundary: OperationalSupportBoundaryService,
    private readonly financialApproval: FinancialApprovalService,
    private readonly authorityEvaluation: AuthorityEvaluationService,
    @Inject(PAYMENT_PROVIDER_PORT)
    private readonly paymentProvider: PaymentProviderPort,
  ) {}

  async requestRefund(input: RequestRefundInput) {
    this.boundary.rejectClientRefundFields(input as unknown as Record<string, unknown>);

    const transaction = await this.loadSettledTransaction(input.paymentTransactionId);
    const priorRefundedCents = await this.sumCompletedRefunds(transaction.id);

    this.boundary.assertRefundWithinSettledAmount(
      transaction.amountCents,
      priorRefundedCents,
      input.requestedAmountCents,
    );

    return this.prisma.refundRequest.create({
      data: {
        paymentTransactionId: transaction.id,
        redressImplementationActionId: input.redressImplementationActionId,
        requestedAmountCents: input.requestedAmountCents,
        reason: input.reason,
        requestedByIdentityId: input.requestedByIdentityId,
        status: RefundRequestStatus.PENDING,
      },
    });
  }

  async authorizeRefund(input: AuthorizeRefundInput) {
    const request = await this.prisma.refundRequest.findUnique({
      where: { id: input.refundRequestId },
      include: { paymentTransaction: true },
    });

    if (!request) {
      throw new NotFoundException(`RefundRequest ${input.refundRequestId} not found`);
    }

    if (request.status !== RefundRequestStatus.PENDING) {
      throw new BadRequestException('Only PENDING refund requests may be authorized');
    }

    this.boundary.assertRefundAuthorizerDiffersFromRequester(
      request.requestedByIdentityId,
      input.authorizerIdentityId,
    );

    const priorRefundedCents = await this.sumCompletedRefunds(request.paymentTransactionId);
    this.boundary.assertRefundWithinSettledAmount(
      request.paymentTransaction.amountCents,
      priorRefundedCents,
      input.authorizedAmountCents,
    );

    const authorityResult = await this.authorityEvaluation.evaluate({
      identityId: input.authorizerIdentityId,
      functionAuthorityRecordId: input.functionAuthorityRecordId,
      action: AuthorityActionType.APPROVE,
      officeholderId: input.authorizerOfficeholderId,
      appointmentId: input.appointmentId,
      delegationId: input.delegationId,
    });

    if (authorityResult.outcome !== AuthorityEvaluationOutcome.ALLOW) {
      throw new ForbiddenException('Authority evaluation denied refund authorization');
    }

    const count = await this.prisma.refundAuthorization.count();
    const authorizationReference = `${REFUND_AUTHORIZATION_REFERENCE_PREFIX}-${String(count + 1).padStart(8, '0')}`;

    return this.prisma.$transaction(async (tx) => {
      const authorization = await tx.refundAuthorization.create({
        data: {
          refundRequestId: request.id,
          authorizedByIdentityId: input.authorizerIdentityId,
          authorizedAmountCents: input.authorizedAmountCents,
          authorizationReference,
        },
      });

      await this.financialApproval.requestApprovalTx(tx, {
        approvalType: FinancialApprovalType.REFUND_AUTHORIZATION,
        subjectReference: authorization.id,
        subjectType: 'RefundAuthorization',
        refundAuthorizationId: authorization.id,
      });

      await this.financialApproval.approvePendingForSubjectTx(
        tx,
        FinancialApprovalType.REFUND_AUTHORIZATION,
        authorization.id,
        input.authorizerIdentityId,
      );

      return tx.refundRequest.update({
        where: { id: request.id },
        data: { status: RefundRequestStatus.AUTHORIZED },
        include: { authorizations: true },
      });
    });
  }

  async processRefund(input: ProcessRefundInput) {
    const request = await this.prisma.refundRequest.findUnique({
      where: { id: input.refundRequestId },
      include: {
        authorizations: true,
        paymentTransaction: {
          include: { paymentProviderConfiguration: true },
        },
      },
    });

    if (!request) {
      throw new NotFoundException(`RefundRequest ${input.refundRequestId} not found`);
    }

    if (request.status !== RefundRequestStatus.AUTHORIZED) {
      throw new BadRequestException('Refund must be authorized before processing');
    }

    const authorization = request.authorizations[0];
    if (!authorization) {
      throw new BadRequestException('Refund authorization record is required');
    }

    await this.financialApproval.requireApproved(
      FinancialApprovalType.REFUND_AUTHORIZATION,
      authorization.id,
    );

    const providerConfig = request.paymentTransaction.paymentProviderConfiguration;
    const configuration = providerConfig.configuration as Record<string, unknown>;

    const providerResult = await this.paymentProvider.initiateRefund({
      providerTransactionReference: request.paymentTransaction.providerTransactionReference,
      amountCents: authorization.authorizedAmountCents,
      currency: request.paymentTransaction.currency,
      reason: request.reason,
      configuration,
    });

    return this.prisma.$transaction(async (tx) => {
      const refundTransaction = await tx.refundTransaction.create({
        data: {
          refundRequestId: request.id,
          refundAuthorizationId: authorization.id,
          providerRefundReference: providerResult.providerRefundReference,
          amountCents: authorization.authorizedAmountCents,
          status: RefundTransactionStatus.COMPLETED,
          processedAt: new Date(),
        },
      });

      await tx.refundRequest.update({
        where: { id: request.id },
        data: { status: RefundRequestStatus.COMPLETED },
      });

      return refundTransaction;
    });
  }

  private async loadSettledTransaction(paymentTransactionId: string) {
    const transaction = await this.prisma.paymentTransaction.findUnique({
      where: { id: paymentTransactionId },
    });

    if (!transaction) {
      throw new NotFoundException(`PaymentTransaction ${paymentTransactionId} not found`);
    }

    if (transaction.status !== PaymentTransactionStatus.SETTLED) {
      throw new BadRequestException('Refunds may only be requested against SETTLED transactions');
    }

    return transaction;
  }

  private async sumCompletedRefunds(paymentTransactionId: string): Promise<number> {
    const completed = await this.prisma.refundTransaction.findMany({
      where: {
        status: RefundTransactionStatus.COMPLETED,
        refundRequest: { paymentTransactionId },
      },
    });

    return completed.reduce((sum, item) => sum + item.amountCents, 0);
  }
}
