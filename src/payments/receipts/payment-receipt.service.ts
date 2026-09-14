import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import {
  PaymentChannelCode,
  PaymentReceiptStatus,
  PaymentTransactionStatus,
  PaymentTransactionType,
  Prisma,
} from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { nextSequentialReference } from '../common/payment-reference.util';
import { PAYMENT_RECEIPT_NUMBER_PREFIX } from '../payments.constants';

@Injectable()
export class PaymentReceiptService {
  constructor(private readonly prisma: PrismaService) {}

  async issueForTransaction(
    transactionId: string,
    channel: PaymentChannelCode,
    tx: Prisma.TransactionClient = this.prisma,
  ) {
    const transaction = await tx.paymentTransaction.findUnique({
      where: { id: transactionId },
      include: { invoice: true, receipt: true, paymentIntent: true },
    });
    if (!transaction) {
      throw new BadRequestException('Transaction not found');
    }
    if (transaction.receipt) {
      return transaction.receipt;
    }
    if (
      transaction.status !== PaymentTransactionStatus.COMPLETED ||
      (transaction.type !== PaymentTransactionType.SETTLEMENT &&
        transaction.type !== PaymentTransactionType.MANUAL_CONFIRMED_PAYMENT)
    ) {
      throw new BadRequestException(
        'Receipt may only be issued after qualifying payment confirmation',
      );
    }

    const receiptNumber = await nextSequentialReference(
      this.prisma,
      PAYMENT_RECEIPT_NUMBER_PREFIX,
      'receiptNumber',
      'paymentReceipt',
    );

    return tx.paymentReceipt.create({
      data: {
        receiptNumber,
        invoiceId: transaction.invoiceId,
        paymentTransactionId: transaction.id,
        payerIdentityId: transaction.paymentIntent?.payerIdentityId ?? transaction.invoice.payerIdentityId,
        payerOrganizationId:
          transaction.paymentIntent?.payerOrganizationId ?? transaction.invoice.payerOrganizationId,
        amountCents: transaction.amountCents,
        currency: transaction.currency,
        paymentDate: transaction.occurredAt,
        channel,
        providerReference:
          transaction.settlementReference ?? transaction.providerTransactionReference ?? undefined,
        institutionId: transaction.invoice.institutionId,
        status: PaymentReceiptStatus.ISSUED,
      },
    });
  }

  async findById(receiptId: string) {
    const receipt = await this.prisma.paymentReceipt.findUnique({ where: { id: receiptId } });
    if (!receipt) {
      throw new BadRequestException(`Receipt ${receiptId} not found`);
    }
    return receipt;
  }

  assertReceiptImmutable(): never {
    throw new ForbiddenException('Payment receipts are immutable financial records');
  }
}
