import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  FeeAssessmentStatus,
  Invoice,
  InvoiceStatus,
} from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { OperationalSupportBoundaryService } from '../common/operational-support-boundary.service';
import { INVOICE_NUMBER_PREFIX } from '../operational-support.constants';

export interface IssueInvoiceInput {
  feeAssessmentId: string;
  masterAdministrativeFileId: string;
  dueAt?: Date;
}

@Injectable()
export class InvoiceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly boundary: OperationalSupportBoundaryService,
  ) {}

  async findByNumber(invoiceNumber: string): Promise<Invoice | null> {
    return this.prisma.invoice.findUnique({
      where: { invoiceNumber },
      include: { lines: true, paymentIntents: true },
    });
  }

  async findById(id: string): Promise<Invoice | null> {
    return this.prisma.invoice.findUnique({
      where: { id },
      include: { lines: true },
    });
  }

  async getByIdOrThrow(id: string): Promise<Invoice> {
    const invoice = await this.findById(id);
    if (!invoice) {
      throw new NotFoundException(`Invoice ${id} not found`);
    }
    return invoice;
  }

  async issueInvoice(input: IssueInvoiceInput) {
    this.boundary.rejectClientInvoiceFields(input as unknown as Record<string, unknown>);

    const assessment = await this.prisma.feeAssessment.findUnique({
      where: { id: input.feeAssessmentId },
      include: {
        feeScheduleVersion: {
          include: { items: true },
        },
      },
    });

    if (!assessment) {
      throw new NotFoundException(`FeeAssessment ${input.feeAssessmentId} not found`);
    }

    if (assessment.status !== FeeAssessmentStatus.CALCULATED) {
      throw new BadRequestException('Only CALCULATED assessments may be invoiced');
    }

    const count = await this.prisma.invoice.count();
    const invoiceNumber = `${INVOICE_NUMBER_PREFIX}-${String(count + 1).padStart(8, '0')}`;
    const issuedAt = new Date();

    const lines = assessment.feeScheduleVersion.items.map((item) => ({
      feeScheduleItemId: item.id,
      lineCode: item.itemCode,
      description: item.label,
      quantity: 1,
      unitAmountCents: item.amountCents ?? 0,
      lineAmountCents: item.amountCents ?? 0,
      sortOrder: item.sortOrder,
    }));

    const lineTotal = lines.reduce((sum, line) => sum + line.lineAmountCents, 0);
    if (lineTotal !== assessment.totalAmountCents && lines.length > 0) {
      const lastLine = lines[lines.length - 1];
      if (lastLine) {
        const adjustment = assessment.totalAmountCents - lineTotal;
        lastLine.lineAmountCents += adjustment;
        lastLine.unitAmountCents += adjustment;
      }
    }

    return this.prisma.$transaction(async (tx) => {
      const invoice = await tx.invoice.create({
        data: {
          feeAssessmentId: assessment.id,
          caseId: assessment.caseId,
          masterAdministrativeFileId: input.masterAdministrativeFileId,
          invoiceNumber,
          status: InvoiceStatus.ISSUED,
          totalAmountCents: assessment.totalAmountCents,
          amountPaidCents: 0,
          currency: assessment.currency,
          issuedAt,
          dueAt: input.dueAt,
          lines: {
            create: lines,
          },
        },
        include: { lines: true },
      });

      await tx.feeAssessment.update({
        where: { id: assessment.id },
        data: { status: FeeAssessmentStatus.INVOICED },
      });

      return invoice;
    });
  }

  async assertInvoicePatchAllowed(invoiceId: string, payload: Record<string, unknown>) {
    const invoice = await this.prisma.invoice.findUnique({ where: { id: invoiceId } });
    if (!invoice) {
      throw new NotFoundException(`Invoice ${invoiceId} not found`);
    }

    this.boundary.assertIssuedInvoiceTotalsImmutable(invoice.status, payload);
    return invoice;
  }
}
