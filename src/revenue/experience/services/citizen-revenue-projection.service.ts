import { Injectable } from '@nestjs/common';
import {
  TaxAssessmentStatus,
  TaxClearanceCertificateRequestStatus,
  TaxObligationStatus,
  TaxRefundClaimStatus,
  TaxReturnStatus,
} from '@prisma/client';

import { PrismaService } from '../../../database/prisma.service';
import { type PaginationQueryDto } from '../../../experience/common/dto/pagination-query.dto';
import { RevenueExperienceBoundaryService } from '../revenue-experience-boundary.service';
import { RevenueScopeService } from './revenue-scope.service';

@Injectable()
export class CitizenRevenueProjectionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly scope: RevenueScopeService,
    private readonly boundary: RevenueExperienceBoundaryService,
  ) {}

  async getHome(identityId: string) {
    const account = await this.scope.requireCitizenTaxpayerAccount(identityId);
    const accountIds = [account.id];

    const [
      obligations,
      draftReturns,
      assessments,
      refundClaims,
      clearanceRequests,
      arrears,
      paymentPlans,
      objections,
    ] = await Promise.all([
      this.prisma.taxObligation.findMany({
        where: {
          taxpayerAccountId: { in: accountIds },
          status: TaxObligationStatus.ACTIVE,
        },
        orderBy: { dueDate: 'asc' },
        take: 10,
      }),
      this.prisma.taxReturn.count({
        where: {
          taxpayerAccountId: { in: accountIds },
          status: TaxReturnStatus.DRAFT,
        },
      }),
      this.prisma.taxAssessment.findMany({
        where: {
          taxpayerAccountId: { in: accountIds },
          status: TaxAssessmentStatus.ISSUED,
        },
        orderBy: { createdAt: 'desc' },
        take: 20,
      }),
      this.prisma.taxRefundClaim.findMany({
        where: { taxpayerAccountId: { in: accountIds } },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
      this.prisma.taxClearanceCertificateRequest.findMany({
        where: { taxpayerAccountId: { in: accountIds } },
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),
      this.prisma.taxArrear.findMany({
        where: { taxpayerAccountId: { in: accountIds } },
      }),
      this.prisma.taxPaymentPlan.findMany({
        where: { taxpayerAccountId: { in: accountIds } },
        take: 10,
      }),
      this.prisma.taxObjection.findMany({
        where: { taxpayerAccountId: { in: accountIds } },
      }),
    ]);

    const primaryIdentifier =
      account.identifiers.find((item) => item.isPrimary)?.identifierValue ?? account.accountNumber;
    const registrationStatus = account.registrations[0]?.status ?? null;
    const outstandingBalanceCents = arrears.reduce(
      (sum, arrear) => sum + arrear.outstandingCents,
      0,
    );

    return {
      generatedAt: new Date().toISOString(),
      ruleEnvironment: this.boundary.ruleEnvironment,
      disclaimer: this.boundary.rulesDisclaimer,
      taxpayerAccountId: account.id,
      taxpayerIdentifier: primaryIdentifier,
      accountNumber: account.accountNumber,
      registrationStatus,
      activeTaxAccounts: [
        {
          accountId: account.id,
          accountNumber: account.accountNumber,
          displayName: account.displayName,
          accountKind: account.accountKind,
        },
      ],
      upcomingObligations: obligations.map((obligation) => ({
        obligationId: obligation.id,
        obligationCode: obligation.obligationCode,
        description: obligation.description,
        dueDate: obligation.dueDate?.toISOString() ?? null,
        status: obligation.status,
      })),
      outstandingReturns: draftReturns,
      assessments: assessments.map((item) => ({
        assessmentId: item.id,
        assessmentReference: item.assessmentReference,
        status: item.status,
      })),
      outstandingBalanceCents,
      refunds: refundClaims.map((item) => ({
        refundClaimId: item.id,
        status: item.status,
        requestedAmountCents: item.requestedAmountCents,
      })),
      paymentPlans,
      disputes: objections,
      complianceClearance: clearanceRequests.map((item) => ({
        requestId: item.id,
        status: item.status,
      })),
      paymentDoesNotAlterAssessment: true,
    };
  }

  async listAccounts(identityId: string) {
    const account = await this.scope.requireCitizenTaxpayerAccount(identityId);
    return {
      items: [
        {
          taxpayerAccountId: account.id,
          accountNumber: account.accountNumber,
          displayName: account.displayName,
          accountKind: account.accountKind,
        },
      ],
    };
  }

  async listObligations(identityId: string) {
    const accountIds = await this.scope.listCitizenAccountIds(identityId);
    if (accountIds.length === 0) {
      await this.scope.requireCitizenTaxpayerAccount(identityId);
    }

    const [obligations, arrears] = await Promise.all([
      this.prisma.taxObligation.findMany({
        where: { taxpayerAccountId: { in: accountIds } },
        orderBy: { dueDate: 'asc' },
      }),
      this.prisma.taxArrear.aggregate({
        where: { taxpayerAccountId: { in: accountIds } },
        _sum: { outstandingCents: true },
      }),
    ]);

    return {
      authoritativeOnly: true,
      obligations,
      outstandingBalanceCents: arrears._sum.outstandingCents ?? 0,
      note: 'Obligations are derived only from registered accounts, assessments, and configured NON_PRODUCTION obligations.',
    };
  }

  async listReturns(identityId: string, query: PaginationQueryDto) {
    const accountIds = await this.scope.listCitizenAccountIds(identityId);
    if (accountIds.length === 0) {
      await this.scope.requireCitizenTaxpayerAccount(identityId);
    }

    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const skip = (page - 1) * pageSize;
    const where = { taxpayerAccountId: { in: accountIds } };

    const [totalItems, items] = await Promise.all([
      this.prisma.taxReturn.count({ where }),
      this.prisma.taxReturn.findMany({
        where,
        include: { currentVersion: true },
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
      }),
    ]);

    return { items, pagination: { page, pageSize, totalItems } };
  }

  async listAssessments(identityId: string) {
    const accountIds = await this.scope.listCitizenAccountIds(identityId);
    if (accountIds.length === 0) {
      await this.scope.requireCitizenTaxpayerAccount(identityId);
    }

    return this.prisma.taxAssessment.findMany({
      where: { taxpayerAccountId: { in: accountIds } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async listPayments(identityId: string) {
    const accountIds = await this.scope.listCitizenAccountIds(identityId);
    if (accountIds.length === 0) {
      await this.scope.requireCitizenTaxpayerAccount(identityId);
    }

    return this.prisma.taxPaymentAllocation.findMany({
      where: { taxLiability: { taxpayerAccountId: { in: accountIds } } },
      include: { paymentTransaction: true, taxLiability: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async listActions(identityId: string) {
    const home = await this.getHome(identityId);
    const actions: { actionCode: string; label: string; priority: string }[] = [];

    if (home.outstandingReturns > 0) {
      actions.push({ actionCode: 'FILE_RETURN', label: 'File return', priority: 'HIGH' });
    }
    if (home.outstandingBalanceCents > 0) {
      actions.push({ actionCode: 'PAY_BALANCE', label: 'Pay balance', priority: 'HIGH' });
    }
    if (home.refunds.some((refund) => refund.status === TaxRefundClaimStatus.REQUESTED)) {
      actions.push({ actionCode: 'REQUEST_REFUND', label: 'Request refund', priority: 'MEDIUM' });
    }
    if (
      home.complianceClearance.some(
        (request) => request.status === TaxClearanceCertificateRequestStatus.REQUESTED,
      )
    ) {
      actions.push({
        actionCode: 'REQUEST_CLEARANCE_CERTIFICATE',
        label: 'Request clearance certificate',
        priority: 'MEDIUM',
      });
    }

    actions.push(
      { actionCode: 'AMEND_RETURN', label: 'Amend return', priority: 'LOW' },
      { actionCode: 'SUBMIT_EVIDENCE', label: 'Submit supporting evidence', priority: 'LOW' },
      { actionCode: 'FILE_OBJECTION', label: 'File objection', priority: 'LOW' },
      { actionCode: 'REQUEST_PAYMENT_PLAN', label: 'Request payment plan', priority: 'LOW' },
    );

    return { generatedAt: new Date().toISOString(), actions };
  }
}
