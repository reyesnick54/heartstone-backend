import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import {
  FeeAssessmentStatus,
  FinancialAuditEventType,
  type Invoice,
  InvoiceStatus,
} from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { FinancialBoundaryService } from '../common/financial-boundary.service';
import { assertSameCurrency } from '../common/monetary-arithmetic.util';
import { type CalculatedFeeItem } from '../fee-assessments/fee-assessment.service';
import { INVOICE_NUMBER_PREFIX } from '../financial-administration.constants';

export interface CreateInvoiceInput {
  feeAssessmentId: string;
  institutionId: string;
  payerIdentityId: string;
  organizationId?: string;
  caseId?: string;
  masterAdministrativeFileId?: string;
  dueAt?: Date;
  actorIdentityId: string;
}

@Injectable()
export class InvoiceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly boundary: FinancialBoundaryService,
  ) {}

  async createInvoice(input: CreateInvoiceInput): Promise<Invoice> {
    this.boundary.assertInvoiceDoesNotAlterApplicationDecision();
    this.boundary.assertInvoicePaidDoesNotCreateApproval();

    const assessment = await this.prisma.feeAssessment.findUnique({
      where: { id: input.feeAssessmentId },
      include: {
        feeScheduleVersion: {
          include: { items: true },
        },
      },
    });

    if (!assessment) {
      throw new NotFoundException('Fee assessment not found');
    }

    if (assessment.status === FeeAssessmentStatus.LOCKED_FOR_INVOICE) {
      throw new BadRequestException('Assessment is already locked for an existing invoice');
    }

    if (assessment.status === FeeAssessmentStatus.SUPERSEDED) {
      throw new BadRequestException('Cannot create invoice from superseded assessment');
    }

    const calculatedItems = assessment.calculatedItems as unknown as CalculatedFeeItem[];
    const invoiceNumber = `${INVOICE_NUMBER_PREFIX}-${String(Date.now())}-${crypto.randomUUID().slice(0, 8)}`;

    const invoice = await this.prisma.$transaction(async (tx) => {
      const created = await tx.invoice.create({
        data: {
          invoiceNumber,
          feeAssessmentId: input.feeAssessmentId,
          institutionId: input.institutionId,
          payerIdentityId: input.payerIdentityId,
          organizationId: input.organizationId,
          caseId: input.caseId ?? assessment.caseId,
          masterAdministrativeFileId:
            input.masterAdministrativeFileId ?? assessment.masterAdministrativeFileId,
          currency: assessment.currency,
          subtotalCents: assessment.subtotalCents,
          adjustmentTotalCents: assessment.adjustmentsCents,
          totalCents: assessment.totalCents,
          amountPaidCents: 0,
          amountOutstandingCents: assessment.totalCents,
          dueAt: input.dueAt,
          status: InvoiceStatus.DRAFT,
          lines: {
            create: calculatedItems.map((item, index) => {
              assertSameCurrency(assessment.currency, item.currency);

              const scheduleItem = assessment.feeScheduleVersion.items.find(
                (si) => si.id === item.feeScheduleItemId,
              );

              if (!scheduleItem) {
                throw new BadRequestException(
                  `Fee schedule item ${item.feeScheduleItemId} not found in pinned version`,
                );
              }

              return {
                feeScheduleItemId: scheduleItem.id,
                feeCode: item.feeCode,
                description: item.description,
                quantity: item.quantity,
                unitAmountCents: item.unitAmountCents,
                lineTotalCents: item.lineTotalCents,
                currency: item.currency,
                assessmentLineIndex: index,
              };
            }),
          },
        },
        include: { lines: true },
      });

      await tx.feeAssessment.update({
        where: { id: input.feeAssessmentId },
        data: { status: FeeAssessmentStatus.LOCKED_FOR_INVOICE },
      });

      await tx.financialAuditEvent.create({
        data: {
          entityType: 'Invoice',
          entityId: created.id,
          eventType: FinancialAuditEventType.INVOICE_CREATED,
          actorIdentityId: input.actorIdentityId,
          details: {
            feeAssessmentId: input.feeAssessmentId,
            totalCents: assessment.totalCents,
          },
        },
      });

      return created;
    });

    return invoice;
  }

  async findById(id: string): Promise<Invoice> {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id },
      include: {
        lines: {
          include: { feeScheduleItem: true },
        },
        feeAssessment: {
          include: {
            feeScheduleVersion: true,
          },
        },
      },
    });

    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }

    return invoice;
  }

  async issueInvoice(id: string, actorIdentityId: string): Promise<Invoice> {
    const invoice = await this.findById(id);

    if (invoice.status !== InvoiceStatus.DRAFT) {
      throw new BadRequestException('Only DRAFT invoices may be issued');
    }

    const issued = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.invoice.update({
        where: { id },
        data: {
          status: InvoiceStatus.ISSUED,
          issuedAt: new Date(),
        },
        include: { lines: true },
      });

      await tx.financialAuditEvent.create({
        data: {
          entityType: 'Invoice',
          entityId: id,
          eventType: FinancialAuditEventType.INVOICE_ISSUED,
          actorIdentityId,
          details: { invoiceNumber: invoice.invoiceNumber },
        },
      });

      return updated;
    });

    this.boundary.assertInvoicePaidDoesNotCreateApproval();

    return issued;
  }
}
