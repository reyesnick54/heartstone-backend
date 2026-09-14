import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InvoiceStatus, Prisma } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { nextSequentialReference } from '../common/payment-reference.util';
import { PaymentsBoundaryService } from '../common/payments-boundary.service';
import { INVOICE_NUMBER_PREFIX } from '../payments.constants';

export interface CreateInvoiceInput {
  institutionId: string;
  payerIdentityId: string;
  payerOrganizationId?: string;
  caseId?: string;
  applicationId?: string;
  currency?: string;
  dueDate?: Date;
  lines: {
    description: string;
    amountCents: number;
    currency?: string;
    feeDefinitionId?: string;
  }[];
}

@Injectable()
export class InvoiceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly boundary: PaymentsBoundaryService,
  ) {}

  async createDraft(input: CreateInvoiceInput) {
    if (input.lines.length === 0) {
      throw new BadRequestException('Invoice requires at least one line');
    }

    const currency = input.currency ?? 'XCD';
    for (const line of input.lines) {
      this.boundary.assertCurrencyMatch(currency, line.currency ?? currency);
    }

    const totalAmountCents = input.lines.reduce((sum, line) => sum + line.amountCents, 0);
    const invoiceNumber = await nextSequentialReference(
      this.prisma,
      INVOICE_NUMBER_PREFIX,
      'invoiceNumber',
      'invoice',
    );

    return this.prisma.invoice.create({
      data: {
        invoiceNumber,
        institutionId: input.institutionId,
        caseId: input.caseId,
        applicationId: input.applicationId,
        payerIdentityId: input.payerIdentityId,
        payerOrganizationId: input.payerOrganizationId,
        totalAmountCents,
        currency,
        dueDate: input.dueDate,
        status: InvoiceStatus.DRAFT,
        lines: {
          create: input.lines.map((line, index) => ({
            lineNumber: index + 1,
            description: line.description,
            amountCents: line.amountCents,
            currency: line.currency ?? currency,
            feeDefinitionId: line.feeDefinitionId,
          })),
        },
      },
      include: { lines: true },
    });
  }

  async issue(invoiceId: string) {
    const invoice = await this.findById(invoiceId);
    if (invoice.status !== InvoiceStatus.DRAFT) {
      throw new BadRequestException('Only draft invoices can be issued');
    }

    return this.prisma.invoice.update({
      where: { id: invoiceId },
      data: { status: InvoiceStatus.ISSUED, issuedAt: new Date() },
      include: { lines: true },
    });
  }

  async findById(invoiceId: string) {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: { lines: true },
    });
    if (!invoice) {
      throw new NotFoundException(`Invoice ${invoiceId} not found`);
    }
    return invoice;
  }

  async applySettledPayment(invoiceId: string, amountCents: number, tx: Prisma.TransactionClient) {
    const invoice = await tx.invoice.findUnique({ where: { id: invoiceId } });
    if (!invoice) {
      throw new NotFoundException(`Invoice ${invoiceId} not found`);
    }

    this.boundary.assertPaymentDoesNotExceedInvoice({
      invoiceTotalCents: invoice.totalAmountCents,
      currentPaidCents: invoice.paidAmountCents,
      paymentAmountCents: amountCents,
    });

    const newPaid = invoice.paidAmountCents + amountCents;
    const status =
      newPaid >= invoice.totalAmountCents
        ? InvoiceStatus.PAID
        : InvoiceStatus.PARTIALLY_PAID;

    return tx.invoice.update({
      where: { id: invoiceId },
      data: { paidAmountCents: newPaid, status },
    });
  }
}
