import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { PaymentsBoundaryService } from '../common/payments-boundary.service';

@Injectable()
export class PaymentAllocationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly boundary: PaymentsBoundaryService,
  ) {}

  async allocateSettlement(transactionId: string, tx: Prisma.TransactionClient = this.prisma) {
    const transaction = await tx.paymentTransaction.findUnique({
      where: { id: transactionId },
      include: { invoice: { include: { lines: true } }, allocations: true },
    });
    if (!transaction) {
      throw new BadRequestException('Transaction not found for allocation');
    }

    let remaining = transaction.amountCents - transaction.allocations.reduce((sum, row) => sum + row.amountCents, 0);
    if (remaining <= 0) {
      return transaction.allocations;
    }

    const created = [];
    const sortedLines = [...transaction.invoice.lines].sort((a, b) => a.lineNumber - b.lineNumber);

    for (const line of sortedLines) {
      if (remaining <= 0) {
        break;
      }
      const lineRemaining = line.amountCents - line.allocatedAmountCents;
      if (lineRemaining <= 0) {
        continue;
      }

      const allocationAmount = Math.min(lineRemaining, remaining);
      this.boundary.assertCurrencyMatch(transaction.currency, line.currency);
      this.recordAllocationBounds(transaction.amountCents, transaction.allocations, created, allocationAmount);

      const allocation = await tx.paymentAllocation.create({
        data: {
          transactionId: transaction.id,
          invoiceId: transaction.invoiceId,
          invoiceLineId: line.id,
          amountCents: allocationAmount,
          currency: transaction.currency,
        },
      });
      created.push(allocation);
      remaining -= allocationAmount;

      await tx.invoiceLine.update({
        where: { id: line.id },
        data: { allocatedAmountCents: line.allocatedAmountCents + allocationAmount },
      });
    }

    if (remaining > 0) {
      this.recordAllocationBounds(transaction.amountCents, transaction.allocations, created, remaining);
      const balanceAllocation = await tx.paymentAllocation.create({
        data: {
          transactionId: transaction.id,
          invoiceId: transaction.invoiceId,
          amountCents: remaining,
          currency: transaction.currency,
        },
      });
      created.push(balanceAllocation);
    }

    return created;
  }

  private recordAllocationBounds(
    settledAmountCents: number,
    existing: { amountCents: number }[],
    created: { amountCents: number }[],
    requestedAllocationCents: number,
  ): void {
    this.boundary.assertAllocationWithinSettled({
      settledAmountCents,
      existingAllocationCents:
        existing.reduce((sum, row) => sum + row.amountCents, 0) +
        created.reduce((sum, row) => sum + row.amountCents, 0),
      requestedAllocationCents,
    });
  }
}
