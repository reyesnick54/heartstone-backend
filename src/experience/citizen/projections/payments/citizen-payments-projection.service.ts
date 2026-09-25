import { Injectable, NotFoundException } from '@nestjs/common';
import { InvoiceStatus, Prisma } from '@prisma/client';

import { PrismaService } from '../../../../database/prisma.service';
import { PaymentIntentService } from '../../../../operational-support/financial/payment-intent.service';
import { PHASE_11B_BOUNDARY_DISCLAIMER } from '../../../../operational-support/operational-support.constants';
import {
  CitizenAccessScope,
  CitizenAccessScopeService,
} from '../common/citizen-access-scope.service';
import { CitizenExperienceBoundaryService } from '../common/citizen-experience-boundary.service';

export interface CitizenPaymentReceiptSummary {
  id: string;
  receiptNumber: string;
  issuedAt: string;
}

export interface CitizenPaymentRefundSummary {
  id: string;
  status: string;
  requestedAmountCents: number;
  reason: string;
}

export interface CitizenPaymentDisputeSummary {
  id: string;
  disputeReference: string;
  status: string;
  amountCents: number;
  reason: string;
}

export interface CitizenPaymentSummary {
  id: string;
  invoiceNumber: string;
  status: InvoiceStatus;
  feeAssessment: {
    assessmentReference: string;
    totalAmountCents: number;
    currency: string;
  };
  balanceCents: number;
  totalAmountCents: number;
  amountPaidCents: number;
  currency: string;
  issuedAt?: string;
  dueAt?: string;
  relatedCaseId?: string;
  receipts: CitizenPaymentReceiptSummary[];
  refunds: CitizenPaymentRefundSummary[];
  disputes: CitizenPaymentDisputeSummary[];
  disclaimer: string;
}

export interface CitizenPaymentDetail extends CitizenPaymentSummary {
  lines: {
    lineCode: string;
    description: string;
    lineAmountCents: number;
  }[];
  paymentIntents: {
    id: string;
    intentReference: string;
    status: string;
    amountCents: number;
  }[];
}

export interface CitizenPaymentIntentResult {
  id: string;
  intentReference: string;
  status: string;
  amountCents: number;
  currency: string;
  invoiceId: string;
  disclaimer: string;
}

type AccessibleInvoice = Prisma.InvoiceGetPayload<{
  include: {
    feeAssessment: true;
    lines: true;
    paymentIntents: true;
    financialDisputes: true;
  };
}>;

@Injectable()
export class CitizenPaymentsProjectionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly scopeService: CitizenAccessScopeService,
    private readonly boundary: CitizenExperienceBoundaryService,
    private readonly paymentIntents: PaymentIntentService,
  ) {}

  async listPayments(identityId: string): Promise<CitizenPaymentSummary[]> {
    const scope = await this.scopeService.resolveScope(identityId);
    const invoices = await this.findAccessibleInvoices(scope);
    return Promise.all(invoices.map((invoice) => this.toSummary(invoice)));
  }

  async getPayment(identityId: string, invoiceId: string): Promise<CitizenPaymentDetail> {
    const scope = await this.scopeService.resolveScope(identityId);
    const invoice = await this.findAccessibleInvoiceById(scope, invoiceId);
    if (!invoice) {
      throw new NotFoundException(`Payment record ${invoiceId} not found`);
    }
    return this.toDetail(invoice);
  }

  async createPaymentIntent(
    identityId: string,
    invoiceId: string,
  ): Promise<CitizenPaymentIntentResult> {
    const scope = await this.scopeService.resolveScope(identityId);
    const invoice = await this.findAccessibleInvoiceById(scope, invoiceId);
    if (!invoice) {
      throw new NotFoundException(`Invoice ${invoiceId} not found`);
    }

    const intent = await this.paymentIntents.createPaymentIntent({ invoiceId: invoice.id });

    return {
      id: intent.id,
      intentReference: intent.intentReference,
      status: intent.status,
      amountCents: intent.amountCents,
      currency: intent.currency,
      invoiceId: intent.invoiceId,
      disclaimer: PHASE_11B_BOUNDARY_DISCLAIMER,
    };
  }

  private async findAccessibleInvoices(scope: CitizenAccessScope): Promise<AccessibleInvoice[]> {
    if (scope.caseIds.length === 0 && scope.applicationIds.length === 0) {
      return [];
    }

    const invoices = await this.prisma.invoice.findMany({
      where: {
        OR: [
          ...(scope.caseIds.length > 0 ? [{ caseId: { in: scope.caseIds } }] : []),
          ...(scope.applicationIds.length > 0
            ? [{ feeAssessment: { applicationId: { in: scope.applicationIds } } }]
            : []),
        ],
        status: { not: InvoiceStatus.DRAFT },
      },
      include: this.invoiceInclude(),
      orderBy: { createdAt: 'desc' },
    });

    return invoices;
  }

  private async isInvoiceAccessible(
    invoice: AccessibleInvoice,
    scope: CitizenAccessScope,
  ): Promise<boolean> {
    if (invoice.caseId != null && scope.caseIds.includes(invoice.caseId)) {
      return true;
    }

    if (
      invoice.feeAssessment.applicationId != null &&
      scope.applicationIds.includes(invoice.feeAssessment.applicationId)
    ) {
      return true;
    }

    if (invoice.caseId != null) {
      const caseRecord = await this.prisma.case.findUnique({
        where: { id: invoice.caseId },
        select: { applicantIdentityId: true },
      });
      if (caseRecord?.applicantIdentityId === scope.identityId) {
        return true;
      }
    }

    return false;
  }

  private async findAccessibleInvoiceById(
    scope: CitizenAccessScope,
    invoiceId: string,
  ): Promise<AccessibleInvoice | null> {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: this.invoiceInclude(),
    });

    if (!invoice || invoice.status === InvoiceStatus.DRAFT) {
      return null;
    }

    const accessible = await this.isInvoiceAccessible(invoice, scope);

    if (!accessible) {
      this.boundary.assertCrossCitizenAccessAllowed(false);
    }

    return invoice;
  }

  private invoiceInclude() {
    return {
      feeAssessment: true,
      lines: { orderBy: { sortOrder: 'asc' as const } },
      paymentIntents: { orderBy: { createdAt: 'desc' as const } },
      financialDisputes: true,
    };
  }

  private async loadReceipts(invoiceId: string): Promise<CitizenPaymentReceiptSummary[]> {
    const transactions = await this.prisma.paymentTransaction.findMany({
      where: {
        paymentIntent: { invoiceId },
        status: 'SETTLED',
      },
      include: { receipts: true },
    });

    return transactions.flatMap((txn) =>
      txn.receipts.map((receipt) => ({
        id: receipt.id,
        receiptNumber: receipt.receiptNumber,
        issuedAt: receipt.issuedAt.toISOString(),
      })),
    );
  }

  private async loadRefunds(invoiceId: string): Promise<CitizenPaymentRefundSummary[]> {
    const transactions = await this.prisma.paymentTransaction.findMany({
      where: { paymentIntent: { invoiceId } },
      include: { refundRequests: true },
    });

    return transactions.flatMap((txn) =>
      txn.refundRequests.map((refund) => ({
        id: refund.id,
        status: refund.status,
        requestedAmountCents: refund.requestedAmountCents,
        reason: refund.reason,
      })),
    );
  }

  private async toSummary(invoice: AccessibleInvoice): Promise<CitizenPaymentSummary> {
    const [receipts, refunds] = await Promise.all([
      this.loadReceipts(invoice.id),
      this.loadRefunds(invoice.id),
    ]);

    return {
      id: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      status: invoice.status,
      feeAssessment: {
        assessmentReference: invoice.feeAssessment.assessmentReference,
        totalAmountCents: invoice.feeAssessment.totalAmountCents,
        currency: invoice.feeAssessment.currency,
      },
      balanceCents: invoice.totalAmountCents - invoice.amountPaidCents,
      totalAmountCents: invoice.totalAmountCents,
      amountPaidCents: invoice.amountPaidCents,
      currency: invoice.currency,
      issuedAt: invoice.issuedAt?.toISOString(),
      dueAt: invoice.dueAt?.toISOString(),
      relatedCaseId: invoice.caseId ?? undefined,
      receipts,
      refunds,
      disputes: invoice.financialDisputes.map((dispute) => ({
        id: dispute.id,
        disputeReference: dispute.disputeReference,
        status: dispute.status,
        amountCents: dispute.amountCents,
        reason: dispute.reason,
      })),
      disclaimer: PHASE_11B_BOUNDARY_DISCLAIMER,
    };
  }

  private async toDetail(invoice: AccessibleInvoice): Promise<CitizenPaymentDetail> {
    const summary = await this.toSummary(invoice);

    return {
      ...summary,
      lines: invoice.lines.map((line) => ({
        lineCode: line.lineCode,
        description: line.description,
        lineAmountCents: line.lineAmountCents,
      })),
      paymentIntents: invoice.paymentIntents.map((intent) => ({
        id: intent.id,
        intentReference: intent.intentReference,
        status: intent.status,
        amountCents: intent.amountCents,
      })),
    };
  }
}
