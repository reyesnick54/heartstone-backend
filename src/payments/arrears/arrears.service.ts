import { Injectable, NotFoundException } from '@nestjs/common';
import { ArrearsRecordStatus } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { PaymentsBoundaryService } from '../common/payments-boundary.service';

export interface ProjectArrearsInput {
  invoiceId: string;
  enforcementAction?: string;
}

@Injectable()
export class ArrearsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly boundary: PaymentsBoundaryService,
  ) {}

  async projectArrears(input: ProjectArrearsInput) {
    this.boundary.assertArrearsNotSanction(input.enforcementAction);

    const invoice = await this.prisma.invoice.findUnique({
      where: { id: input.invoiceId },
    });

    if (!invoice) {
      throw new NotFoundException(`Invoice ${input.invoiceId} not found`);
    }

    const amountOutstandingCents = invoice.amountDueCents - invoice.amountPaidCents;

    if (amountOutstandingCents <= 0 || !invoice.dueDate) {
      return null;
    }

    const now = new Date();
    const daysPastDue = Math.max(
      0,
      Math.floor((now.getTime() - invoice.dueDate.getTime()) / (1000 * 60 * 60 * 24)),
    );

    if (daysPastDue <= 0) {
      return null;
    }

    const existing = await this.prisma.arrearsRecord.findFirst({
      where: { invoiceId: input.invoiceId, status: { not: ArrearsRecordStatus.CLOSED } },
    });

    if (existing) {
      return this.prisma.arrearsRecord.update({
        where: { id: existing.id },
        data: {
          amountOutstandingCents,
          daysPastDue,
          status: ArrearsRecordStatus.OPEN,
        },
      });
    }

    return this.prisma.arrearsRecord.create({
      data: {
        invoiceId: input.invoiceId,
        amountOutstandingCents,
        dueDate: invoice.dueDate,
        daysPastDue,
        status: ArrearsRecordStatus.OPEN,
      },
    });
  }
}
