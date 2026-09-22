import { Injectable } from '@nestjs/common';
import {
  TaxArrearStatus,
  TaxAssessmentStatus,
  TaxClearanceCertificateRequestStatus,
  TaxObjectionStatus,
  TaxObligationStatus,
  TaxpayerRegistrationStatus,
  TaxPaymentPlanStatus,
  TaxRefundClaimStatus,
  TaxReturnStatus,
} from '@prisma/client';

import { PrismaService } from '../../../database/prisma.service';
import { type ResolvedOfficialContext } from '../../../experience/official/types/official-context.types';
import { RevenueExperienceBoundaryService } from '../revenue-experience-boundary.service';

@Injectable()
export class OfficialRevenueProjectionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly boundary: RevenueExperienceBoundaryService,
  ) {}

  async buildWorkspace(context: ResolvedOfficialContext) {
    if (!context.technicalCapabilities.substantiveAccessAllowed) {
      return this.emptyWorkspace();
    }

    const jurisdictionFilter = context.institutionalContext.jurisdictionIds.length
      ? { jurisdictionId: { in: context.institutionalContext.jurisdictionIds } }
      : {};

    const taxpayerAccountFilter = { taxpayerAccount: jurisdictionFilter };

    const [
      registrations,
      returnsForReview,
      assessmentQueue,
      refundQueue,
      arrearsAccounts,
      paymentPlans,
      objections,
      clearanceRequests,
      anomalies,
      slaRiskObligations,
    ] = await Promise.all([
      this.prisma.taxpayerRegistration.count({
        where: {
          status: {
            in: [TaxpayerRegistrationStatus.SUBMITTED, TaxpayerRegistrationStatus.UNDER_REVIEW],
          },
          taxpayerAccount: jurisdictionFilter,
        },
      }),
      this.prisma.taxReturn.count({
        where: {
          status: TaxReturnStatus.DRAFT,
          ...taxpayerAccountFilter,
        },
      }),
      this.prisma.taxAssessment.count({
        where: {
          status: TaxAssessmentStatus.PROPOSED,
          ...taxpayerAccountFilter,
        },
      }),
      this.prisma.taxRefundClaim.count({
        where: {
          status: { in: [TaxRefundClaimStatus.REQUESTED, TaxRefundClaimStatus.UNDER_REVIEW] },
          ...taxpayerAccountFilter,
        },
      }),
      this.prisma.taxArrear.count({
        where: { status: TaxArrearStatus.OPEN, ...taxpayerAccountFilter },
      }),
      this.prisma.taxPaymentPlan.count({
        where: {
          status: { in: [TaxPaymentPlanStatus.PROPOSED, TaxPaymentPlanStatus.ACTIVE] },
          ...taxpayerAccountFilter,
        },
      }),
      this.prisma.taxObjection.count({
        where: { status: TaxObjectionStatus.UNDER_REVIEW, ...taxpayerAccountFilter },
      }),
      this.prisma.taxClearanceCertificateRequest.count({
        where: {
          status: {
            in: [
              TaxClearanceCertificateRequestStatus.REQUESTED,
              TaxClearanceCertificateRequestStatus.UNDER_REVIEW,
            ],
          },
          ...taxpayerAccountFilter,
        },
      }),
      this.prisma.taxAssessment.count({
        where: {
          status: TaxAssessmentStatus.PROPOSED,
          issuedByOfficeholderId: null,
          ...taxpayerAccountFilter,
        },
      }),
      this.prisma.taxObligation.count({
        where: {
          dueDate: { lt: new Date() },
          status: TaxObligationStatus.ACTIVE,
          ...taxpayerAccountFilter,
        },
      }),
    ]);

    return {
      generatedAt: new Date().toISOString(),
      ruleEnvironment: this.boundary.ruleEnvironment,
      analyticsCannotIssueAssessment: this.boundary.analyticsCannotIssueAssessment,
      queues: {
        taxpayerRegistrations: registrations,
        returnsRequiringReview: returnsForReview,
        assessmentWorkQueue: assessmentQueue,
        refundReviewQueue: refundQueue,
        arrears: arrearsAccounts,
        paymentPlanRequests: paymentPlans,
        auditReviewMatters: 0,
        objections,
        certificateRequests: clearanceRequests,
        anomaliesRequiringHumanReview: anomalies,
        slaRisk: slaRiskObligations,
      },
      disclaimers: [
        'Analytics and AI assistance cannot issue final tax assessments or sanctions.',
        this.boundary.paymentDisclaimer,
      ],
    };
  }

  private emptyWorkspace() {
    return {
      generatedAt: new Date().toISOString(),
      ruleEnvironment: this.boundary.ruleEnvironment,
      analyticsCannotIssueAssessment: this.boundary.analyticsCannotIssueAssessment,
      queues: {
        taxpayerRegistrations: 0,
        returnsRequiringReview: 0,
        assessmentWorkQueue: 0,
        refundReviewQueue: 0,
        arrears: 0,
        paymentPlanRequests: 0,
        auditReviewMatters: 0,
        objections: 0,
        certificateRequests: 0,
        anomaliesRequiringHumanReview: 0,
        slaRisk: 0,
      },
      disclaimers: [],
    };
  }
}
