import { Injectable } from '@nestjs/common';
import {
  CustomsAppealStatus,
  CustomsAssessmentStatus,
  CustomsDeclarationStatus,
  CustomsExternalDependencyStatus,
  CustomsHoldStatus,
  CustomsInspectionStatus,
  CustomsReleaseStatus,
  CustomsReviewStageStatus,
  TradePermitStatus,
} from '@prisma/client';

import { PrismaService } from '../../../database/prisma.service';
import { type ResolvedOfficialContext } from '../../../experience/official/types/official-context.types';
import { CustomsTradeDashboardService } from '../../dashboard/customs-trade-dashboard.service';
import { TradeExperienceBoundaryService } from '../trade-experience-boundary.service';

@Injectable()
export class OfficialTradeProjectionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly boundary: TradeExperienceBoundaryService,
    private readonly dashboard: CustomsTradeDashboardService,
  ) {}

  async buildWorkspace(context: ResolvedOfficialContext) {
    if (!context.technicalCapabilities.substantiveAccessAllowed) {
      return this.emptyWorkspace();
    }

    const jurisdictionIds = context.institutionalContext.jurisdictionIds;
    const profileFilter = jurisdictionIds.length ? { jurisdictionId: { in: jurisdictionIds } } : {};
    const shipmentFilter = { tradeOrganizationProfile: profileFilter };

    const [
      declarationReviewQueue,
      classificationReview,
      valuationReview,
      permitVerification,
      riskReviewQueue,
      inspectionQueue,
      holdQueue,
      releaseReadyQueue,
      refundAdjustmentQueue,
      appealQueue,
      slaRisk,
      metrics,
    ] = await Promise.all([
      this.prisma.customsDeclaration.count({
        where: {
          status: {
            in: [CustomsDeclarationStatus.SUBMITTED, CustomsDeclarationStatus.UNDER_REVIEW],
          },
          tradeOrganizationProfile: profileFilter,
        },
      }),
      this.prisma.customsReleaseReview.count({
        where: {
          classificationReviewStatus: {
            in: [CustomsReviewStageStatus.NOT_STARTED, CustomsReviewStageStatus.IN_PROGRESS],
          },
          shipment: shipmentFilter,
        },
      }),
      this.prisma.customsReleaseReview.count({
        where: {
          valuationReviewStatus: {
            in: [CustomsReviewStageStatus.NOT_STARTED, CustomsReviewStageStatus.IN_PROGRESS],
          },
          shipment: shipmentFilter,
        },
      }),
      this.prisma.tradePermit.count({
        where: {
          status: { in: [TradePermitStatus.REQUESTED, TradePermitStatus.UNDER_REVIEW] },
          tradeOrganizationProfile: profileFilter,
        },
      }),
      this.prisma.customsReleaseReview.count({
        where: {
          riskReviewStatus: {
            in: [CustomsReviewStageStatus.NOT_STARTED, CustomsReviewStageStatus.IN_PROGRESS],
          },
          shipment: shipmentFilter,
        },
      }),
      this.prisma.customsInspection.count({
        where: {
          status: {
            in: [
              CustomsInspectionStatus.REQUESTED,
              CustomsInspectionStatus.SCHEDULED,
              CustomsInspectionStatus.IN_PROGRESS,
            ],
          },
          shipment: shipmentFilter,
        },
      }),
      this.prisma.customsHold.count({
        where: { status: CustomsHoldStatus.ACTIVE, shipment: shipmentFilter },
      }),
      this.prisma.customsReleaseRecord.count({
        where: {
          status: CustomsReleaseStatus.RELEASE_AUTHORIZED,
          shipment: shipmentFilter,
        },
      }),
      this.prisma.customsAssessment.count({
        where: {
          status: { in: [CustomsAssessmentStatus.ADJUSTED, CustomsAssessmentStatus.ISSUED] },
          tradeOrganizationProfile: profileFilter,
        },
      }),
      this.prisma.customsAppeal.count({
        where: {
          status: { in: [CustomsAppealStatus.FILED, CustomsAppealStatus.UNDER_REVIEW] },
          tradeOrganizationProfile: profileFilter,
        },
      }),
      this.prisma.customsExternalDependency.count({
        where: {
          status: CustomsExternalDependencyStatus.PENDING,
          shipment: shipmentFilter,
        },
      }),
      this.dashboard.getOperationalMetrics(jurisdictionIds),
    ]);

    return {
      generatedAt: new Date().toISOString(),
      ruleEnvironment: this.boundary.ruleEnvironment,
      analyticsCannotExecuteRelease: this.boundary.analyticsCannotExecuteRelease,
      queues: {
        declarationReviewQueue,
        classificationReview,
        valuationReview,
        permitVerification,
        riskReviewQueue,
        inspectionQueue,
        holdQueue,
        releaseReadyQueue,
        refundAdjustmentQueue,
        appealQueue,
        slaRisk,
      },
      metrics: metrics.metrics,
      metricsDisclaimer: metrics.disclaimer,
    };
  }

  private emptyWorkspace() {
    return {
      generatedAt: new Date().toISOString(),
      ruleEnvironment: this.boundary.ruleEnvironment,
      analyticsCannotExecuteRelease: this.boundary.analyticsCannotExecuteRelease,
      queues: {},
      metrics: {},
      metricsDisclaimer: this.boundary.aiDisclaimer,
    };
  }
}
