import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InvoiceStatus, PaymentIntent, PaymentIntentStatus } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { OperationalSupportBoundaryService } from '../common/operational-support-boundary.service';
import { PAYMENT_INTENT_REFERENCE_PREFIX } from '../operational-support.constants';

export interface CreatePaymentIntentInput {
  invoiceId: string;
  amountCents?: number;
  currency?: string;
  expiresAt?: Date;
}

@Injectable()
export class PaymentIntentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly boundary: OperationalSupportBoundaryService,
  ) {}

  async findByReference(intentReference: string): Promise<PaymentIntent | null> {
    return this.prisma.paymentIntent.findUnique({
      where: { intentReference },
      include: { transactions: true },
    });
  }

  async findById(id: string): Promise<PaymentIntent | null> {
    return this.prisma.paymentIntent.findUnique({ where: { id } });
  }

  async getByIdOrThrow(id: string): Promise<PaymentIntent> {
    const intent = await this.findById(id);
    if (!intent) {
      throw new NotFoundException(`PaymentIntent ${id} not found`);
    }
    return intent;
  }

  async createPaymentIntent(input: CreatePaymentIntentInput) {
    this.boundary.rejectClientPaymentIntentFields(input as unknown as Record<string, unknown>);

    const invoice = await this.prisma.invoice.findUnique({
      where: { id: input.invoiceId },
    });

    if (!invoice) {
      throw new NotFoundException(`Invoice ${input.invoiceId} not found`);
    }

    if (
      invoice.status !== InvoiceStatus.ISSUED &&
      invoice.status !== InvoiceStatus.PARTIALLY_PAID &&
      invoice.status !== InvoiceStatus.OVERDUE
    ) {
      throw new BadRequestException('Payment intents may only be created for payable invoices');
    }

    const outstandingCents = invoice.totalAmountCents - invoice.amountPaidCents;
    const amountCents = input.amountCents ?? outstandingCents;

    if (amountCents <= 0 || amountCents > outstandingCents) {
      throw new BadRequestException(
        'Payment intent amount must be positive and not exceed outstanding balance',
      );
    }

    const currency = input.currency ?? invoice.currency;
    this.boundary.assertWebhookCurrencyMatches(invoice.currency, currency);

    const count = await this.prisma.paymentIntent.count();
    const intentReference = `${PAYMENT_INTENT_REFERENCE_PREFIX}-${String(count + 1).padStart(8, '0')}`;

    return this.prisma.paymentIntent.create({
      data: {
        invoiceId: invoice.id,
        intentReference,
        status: PaymentIntentStatus.CREATED,
        amountCents,
        currency,
        expiresAt: input.expiresAt,
      },
    });
  }
}
