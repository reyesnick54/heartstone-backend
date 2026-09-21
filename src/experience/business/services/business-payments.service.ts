import { Injectable } from '@nestjs/common';
import { InvoiceStatus } from '@prisma/client';

import { PrismaService } from '../../../database/prisma.service';
import { mapInstitutionAttribution } from '../../citizen/mappers/citizen-attribution.mapper';
import { BusinessAccessService } from '../../common/business-access.service';
import { type PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { type BusinessPaymentsResponseDto } from '../dto/business-payment.dto';

const OUTSTANDING_INVOICE_STATUSES: InvoiceStatus[] = [
  InvoiceStatus.ISSUED,
  InvoiceStatus.PARTIALLY_PAID,
  InvoiceStatus.OVERDUE,
];

@Injectable()
export class BusinessPaymentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: BusinessAccessService,
  ) {}

  async listPayments(
    identityId: string,
    organizationId: string,
    query: PaginationQueryDto,
  ): Promise<BusinessPaymentsResponseDto> {
    const orgAccess = await this.access.assertOrganizationAccess(organizationId, identityId);
    const caseWhere = this.access.buildCaseWhere(orgAccess);
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const skip = (page - 1) * pageSize;

    const where = {
      status: { in: OUTSTANDING_INVOICE_STATUSES },
      case: caseWhere,
    };

    const [totalItems, invoices] = await Promise.all([
      this.prisma.invoice.count({ where }),
      this.prisma.invoice.findMany({
        where,
        include: {
          case: {
            include: {
              governmentService: {
                include: { responsibleInstitution: true, responsibleDepartment: true },
              },
            },
          },
        },
        orderBy: [{ dueAt: 'asc' }, { issuedAt: 'asc' }, { id: 'asc' }],
        skip,
        take: pageSize,
      }),
    ]);

    return {
      items: invoices.map((invoice) => ({
        invoiceId: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        status: invoice.status,
        totalAmountCents: invoice.totalAmountCents,
        amountPaidCents: invoice.amountPaidCents,
        currency: invoice.currency,
        dueAt: invoice.dueAt?.toISOString() ?? null,
        paymentDoesNotImplyApproval: true,
        caseId: invoice.caseId,
        attribution: invoice.case ? mapInstitutionAttribution(invoice.case) : undefined,
      })),
      pagination: this.access.buildPaginationMeta(page, pageSize, totalItems),
      disclaimer: {
        label:
          'Outstanding fees and invoices are shown for payment purposes only. Payment does not imply government approval or authorization.',
        labelKey: 'business.payments.disclaimer',
      },
    };
  }
}
