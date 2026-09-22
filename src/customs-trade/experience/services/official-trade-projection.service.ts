import { Injectable } from '@nestjs/common';
import {
  CustomsDeclarationStatus,
  CustomsHoldStatus,
  CustomsRefundClaimStatus,
  ShipmentReferenceStatus,
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
    const traderFilter = jurisdictionIds.length ? { jurisdictionId: { in: jurisdictionIds } } : {};
    const shipmentFilter = jurisdictionIds.length ? { traderAccount: traderFilter } : {};

    const [
      declarationReviewQueue,
      inspectionQueue,
      holdQueue,
      releaseReadyQueue,
      refundAdjustmentQueue,
      metrics,
    ] = await Promise.all([
      this.prisma.customsDeclaration.count({
        where: {
          status: {
            in: [CustomsDeclarationStatus.SUBMITTED, CustomsDeclarationStatus.UNDER_REVIEW],
          },
          traderAccount: traderFilter,
        },
      }),
      this.prisma.customsInspection.count({
        where: { shipmentReference: shipmentFilter },
      }),
      this.prisma.customsHold.count({
        where: { status: CustomsHoldStatus.ACTIVE, shipmentReference: shipmentFilter },
      }),
      this.prisma.shipmentReference.count({
        where: {
          status: ShipmentReferenceStatus.UNDER_CUSTOMS,
          ...shipmentFilter,
        },
      }),
      this.prisma.customsRefundClaim.count({
        where: {
          status: {
            in: [CustomsRefundClaimStatus.SUBMITTED, CustomsRefundClaimStatus.UNDER_REVIEW],
          },
          customsDeclaration: { traderAccount: traderFilter },
        },
      }),
      this.dashboard.getOperationalMetrics(jurisdictionIds),
    ]);

    return {
      generatedAt: new Date().toISOString(),
      ruleEnvironment: this.boundary.ruleEnvironment,
      disclaimer: this.boundary.rulesDisclaimer,
      aiDisclaimer: this.boundary.aiDisclaimer,
      queues: {
        declarationReviewQueue,
        inspectionQueue,
        holdQueue,
        releaseReadyQueue,
        refundAdjustmentQueue,
      },
      metrics,
      releaseExecutionExcludedFromWorkspace: true,
    };
  }

  private emptyWorkspace() {
    return {
      generatedAt: new Date().toISOString(),
      ruleEnvironment: this.boundary.ruleEnvironment,
      disclaimer: this.boundary.rulesDisclaimer,
      queues: {},
      metrics: null,
      releaseExecutionExcludedFromWorkspace: true,
    };
  }
}
