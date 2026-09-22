import { Injectable, NotFoundException } from '@nestjs/common';

import { PrismaService } from '../../../database/prisma.service';
import { RevenueExperienceBoundaryService } from '../../../revenue/experience/revenue-experience-boundary.service';
import { RevenueScopeService } from '../../../revenue/experience/services/revenue-scope.service';
import { BusinessAccessService } from '../../common/business-access.service';
import { type PaginationQueryDto } from '../../common/dto/pagination-query.dto';

@Injectable()
export class BusinessRevenueService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: BusinessAccessService,
    private readonly scope: RevenueScopeService,
    private readonly boundary: RevenueExperienceBoundaryService,
  ) {}

  private async requireOrganizationAccount(identityId: string, organizationId: string) {
    await this.access.assertOrganizationAccess(organizationId, identityId);
    const account = await this.scope.findOrganizationTaxpayerAccount(organizationId);
    if (!account) {
      throw new NotFoundException('No taxpayer account is registered for this organization');
    }
    return account;
  }

  async getHome(identityId: string, organizationId: string) {
    const account = await this.requireOrganizationAccount(identityId, organizationId);
    const primaryIdentifier =
      account.identifiers.find((item) => item.isPrimary)?.identifierValue ?? account.accountNumber;

    return {
      organizationId,
      ruleEnvironment: this.boundary.ruleEnvironment,
      disclaimer: this.boundary.rulesDisclaimer,
      taxpayerAccountId: account.id,
      taxpayerIdentifier: primaryIdentifier,
      registrationStatus: account.registrations[0]?.status ?? null,
      activeTaxAccounts: [
        {
          accountId: account.id,
          accountNumber: account.accountNumber,
          displayName: account.displayName,
        },
      ],
    };
  }

  async listReturns(identityId: string, organizationId: string, query: PaginationQueryDto) {
    const account = await this.requireOrganizationAccount(identityId, organizationId);
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const skip = (page - 1) * pageSize;
    const where = { taxpayerAccountId: account.id };

    const [totalItems, items] = await Promise.all([
      this.prisma.taxReturn.count({ where }),
      this.prisma.taxReturn.findMany({
        where,
        include: { currentVersion: true },
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return { items, pagination: { page, pageSize, totalItems } };
  }

  async listAssessments(identityId: string, organizationId: string) {
    const account = await this.requireOrganizationAccount(identityId, organizationId);
    return this.prisma.taxAssessment.findMany({
      where: { taxpayerAccountId: account.id },
      orderBy: { createdAt: 'desc' },
    });
  }

  async listPayments(identityId: string, organizationId: string) {
    const account = await this.requireOrganizationAccount(identityId, organizationId);
    return this.prisma.taxPaymentAllocation.findMany({
      where: { taxLiability: { taxpayerAccountId: account.id } },
      include: { paymentTransaction: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async listCompliance(identityId: string, organizationId: string) {
    const account = await this.requireOrganizationAccount(identityId, organizationId);
    const [clearance, withholding, complianceStatuses] = await Promise.all([
      this.prisma.taxClearanceCertificateRequest.findMany({
        where: { taxpayerAccountId: account.id },
      }),
      this.prisma.taxWithholdingRecord.findMany({
        where: { taxpayerAccountId: account.id },
      }),
      this.prisma.taxComplianceStatus.findMany({
        where: { taxpayerAccountId: account.id },
      }),
    ]);
    return { clearance, withholding, complianceStatuses };
  }

  async listActions(identityId: string, organizationId: string) {
    await this.requireOrganizationAccount(identityId, organizationId);

    return {
      actions: [
        { actionCode: 'FILE_RETURN', label: 'File return' },
        { actionCode: 'PAY_BALANCE', label: 'Pay balance' },
        { actionCode: 'SUBMIT_WITHHOLDING', label: 'Submit employer withholding' },
        { actionCode: 'REQUEST_CLEARANCE', label: 'Request clearance certificate' },
      ],
    };
  }
}
