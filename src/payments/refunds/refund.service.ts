import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import {
  IdentityType,
  PaymentTransactionStatus,
  RefundAuthorizationStatus,
  RefundRequestStatus,
} from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { PaymentsBoundaryService } from '../common/payments-boundary.service';
import { PAYMENTS_REASON_CODES } from '../payments.constants';
import {
  PAYMENT_PROVIDER_PORT,
  PaymentProviderPort,
} from '../ports/payment-provider.port';

export interface CreateRefundRequestInput {
  invoiceId: string;
  originalPaymentTransactionId: string;
  amountCents: number;
  currency?: string;
  reason: string;
  requestedByIdentityId: string;
  redressDecisionId?: string;
  financialAuthorityReference?: string;
}

export interface AuthorizeRefundInput {
  refundRequestId: string;
  requesterIdentityId: string;
  approverIdentityId: string;
  approverIdentityType: IdentityType;
  approverOfficeholderId?: string;
  authorityEvaluationRecordId?: string;
  authorizedAmountCents: number;
  reason?: string;
  segregationRequired?: boolean;
}

export interface ExecuteRefundInput {
  refundRequestId: string;
  authorizationId: string;
}

@Injectable()
export class RefundService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly boundary: PaymentsBoundaryService,
    @Inject(PAYMENT_PROVIDER_PORT) private readonly paymentProvider: PaymentProviderPort,
  ) {}

  async calculateRefundableBalance(paymentTransactionId: string): Promise<number> {
    const payment = await this.prisma.paymentTransaction.findUnique({
      where: { id: paymentTransactionId },
      include: {
        refundRequests: {
          include: { refundTransactions: true },
        },
        chargebackEvents: true,
      },
    });

    if (!payment) {
      throw new NotFoundException(`PaymentTransaction ${paymentTransactionId} not found`);
    }

    if (payment.status === PaymentTransactionStatus.CHARGEBACK) {
      return 0;
    }

    const settled = payment.settledAmountCents || payment.amountCents;
    const priorRefunds = payment.refundRequests.flatMap((request) =>
      request.refundTransactions
        .filter((tx) => tx.status === RefundRequestStatus.SETTLED || tx.status === RefundRequestStatus.PARTIALLY_SETTLED)
        .map((tx) => tx.settledAmountCents),
    );
    const refundedTotal = priorRefunds.reduce((sum, amount) => sum + amount, 0);

    return Math.max(0, settled - refundedTotal);
  }

  async createRequest(input: CreateRefundRequestInput) {
    this.boundary.rejectForbiddenClientFields(input as unknown as Record<string, unknown>);

    const payment = await this.prisma.paymentTransaction.findUnique({
      where: { id: input.originalPaymentTransactionId },
      include: { chargebackEvents: true },
    });

    if (!payment) {
      throw new NotFoundException(
        `PaymentTransaction ${input.originalPaymentTransactionId} not found`,
      );
    }

    this.boundary.assertChargebackNotAuthorizedRefund(
      payment.status === PaymentTransactionStatus.CHARGEBACK || payment.chargebackEvents.length > 0,
    );

    const refundable = await this.calculateRefundableBalance(input.originalPaymentTransactionId);
    this.boundary.assertRefundWithinRefundableBalance(input.amountCents, refundable);

    const existingSettled = await this.prisma.refundTransaction.count({
      where: {
        refundRequest: { originalPaymentTransactionId: input.originalPaymentTransactionId },
        status: { in: [RefundRequestStatus.SETTLED, RefundRequestStatus.PROCESSING] },
        amountCents: input.amountCents,
      },
    });

    if (existingSettled > 0) {
      this.boundary.assertNoDuplicateRefund(existingSettled);
    }

    const requestNumber = `RFD-${String(Date.now())}`;

    return this.prisma.refundRequest.create({
      data: {
        requestNumber,
        invoiceId: input.invoiceId,
        originalPaymentTransactionId: input.originalPaymentTransactionId,
        amountCents: input.amountCents,
        currency: input.currency ?? 'XCD',
        reason: input.reason,
        requestedByIdentityId: input.requestedByIdentityId,
        redressDecisionId: input.redressDecisionId,
        financialAuthorityReference: input.financialAuthorityReference,
      },
    });
  }

  async authorize(input: AuthorizeRefundInput) {
    this.boundary.assertAiCannotApproveFinancialAction(
      'APPROVE_REFUND',
      input.approverIdentityType,
    );

    const request = await this.prisma.refundRequest.findUnique({
      where: { id: input.refundRequestId },
      include: { authorization: true },
    });

    if (!request) {
      throw new NotFoundException(`RefundRequest ${input.refundRequestId} not found`);
    }

    if (request.authorization) {
      throw new NotFoundException('Authorization already exists for this refund request');
    }

    this.boundary.assertSegregationEnforced(
      input.segregationRequired ?? true,
      input.requesterIdentityId,
      input.approverIdentityId,
    );

    const refundable = await this.calculateRefundableBalance(request.originalPaymentTransactionId);
    this.boundary.assertRefundWithinRefundableBalance(input.authorizedAmountCents, refundable);

    const authorization = await this.prisma.refundAuthorization.create({
      data: {
        refundRequestId: request.id,
        requesterIdentityId: input.requesterIdentityId,
        approverIdentityId: input.approverIdentityId,
        approverOfficeholderId: input.approverOfficeholderId,
        authorityEvaluationRecordId: input.authorityEvaluationRecordId,
        authorizedAmountCents: input.authorizedAmountCents,
        status: RefundAuthorizationStatus.APPROVED,
        reason: input.reason,
        authorizedAt: new Date(),
      },
    });

    await this.prisma.refundRequest.update({
      where: { id: request.id },
      data: { status: RefundRequestStatus.APPROVED },
    });

    return authorization;
  }

  async executeRefund(input: ExecuteRefundInput) {
    const authorization = await this.prisma.refundAuthorization.findUnique({
      where: { id: input.authorizationId },
      include: { refundRequest: true },
    });

    if (!authorization) {
      throw new NotFoundException(`RefundAuthorization ${input.authorizationId} not found`);
    }

    if (authorization.status !== RefundAuthorizationStatus.APPROVED) {
      throw new NotFoundException('Refund is not authorized');
    }

    const payment = await this.prisma.paymentTransaction.findUnique({
      where: { id: authorization.refundRequest.originalPaymentTransactionId },
    });

    if (!payment?.providerReference && !this.paymentProvider.supportsRefunds) {
      const transaction = await this.prisma.refundTransaction.create({
        data: {
          refundRequestId: authorization.refundRequestId,
          authorizationId: authorization.id,
          amountCents: authorization.authorizedAmountCents,
          currency: authorization.currency,
          status: RefundRequestStatus.APPROVED,
        },
      });

      await this.prisma.refundRequest.update({
        where: { id: authorization.refundRequestId },
        data: { status: RefundRequestStatus.PENDING_PROVIDER },
      });

      await this.prisma.refundTransaction.update({
        where: { id: transaction.id },
        data: { status: RefundRequestStatus.PENDING_PROVIDER },
      });

      return {
        transaction,
        pendingExternalExecution: true,
        reason: PAYMENTS_REASON_CODES.NO_PROVIDER_INTEGRATION_PENDING_EXTERNAL,
      };
    }

    const providerResult = await this.paymentProvider.refund({
      originalProviderReference: payment?.providerReference ?? '',
      amountCents: authorization.authorizedAmountCents,
      currency: authorization.currency,
      reason: authorization.reason ?? authorization.refundRequest.reason,
    });

    if (!providerResult.success) {
      const failedTransaction = await this.prisma.refundTransaction.create({
        data: {
          refundRequestId: authorization.refundRequestId,
          authorizationId: authorization.id,
          amountCents: authorization.authorizedAmountCents,
          currency: authorization.currency,
          status: RefundRequestStatus.FAILED,
          providerErrorMessage: providerResult.errorMessage,
        },
      });

      await this.prisma.refundRequest.update({
        where: { id: authorization.refundRequestId },
        data: { status: RefundRequestStatus.FAILED },
      });

      return { transaction: failedTransaction, settled: false };
    }

    const settledTransaction = await this.prisma.refundTransaction.create({
      data: {
        refundRequestId: authorization.refundRequestId,
        authorizationId: authorization.id,
        amountCents: authorization.authorizedAmountCents,
        settledAmountCents: authorization.authorizedAmountCents,
        currency: authorization.currency,
        status: RefundRequestStatus.SETTLED,
        providerReference: providerResult.providerReference,
        settledAt: new Date(),
      },
    });

    await this.prisma.refundRequest.update({
      where: { id: authorization.refundRequestId },
      data: { status: RefundRequestStatus.SETTLED },
    });

    return { transaction: settledTransaction, settled: true };
  }

  async recordChargeback(
    paymentTransactionId: string,
    providerReference: string,
    amountCents: number,
    recordedByIdentityId?: string,
  ) {
    const payment = await this.prisma.paymentTransaction.findUnique({
      where: { id: paymentTransactionId },
    });

    if (!payment) {
      throw new NotFoundException(`PaymentTransaction ${paymentTransactionId} not found`);
    }

    const chargeback = await this.prisma.chargebackEvent.create({
      data: {
        paymentTransactionId,
        providerReference,
        amountCents,
        currency: payment.currency,
        recordedByIdentityId,
      },
    });

    await this.prisma.paymentTransaction.update({
      where: { id: paymentTransactionId },
      data: { status: PaymentTransactionStatus.CHARGEBACK },
    });

    return chargeback;
  }
}
