import { Injectable } from '@nestjs/common';
import {
  CustomsAssessmentStatus,
  CustomsDeclarationStatus,
  CustomsHoldStatus,
  CustomsRefundClaimStatus,
  ShipmentReferenceStatus,
} from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { CUSTOMS_DASHBOARD_METRIC_DISCLAIMER } from '../customs-trade.constants';

@Injectable()
export class CustomsTradeDashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getOperationalMetrics(jurisdictionIds?: string[]) {
    const traderFilter = jurisdictionIds?.length ? { jurisdictionId: { in: jurisdictionIds } } : {};

    const shipmentFilter = traderFilter.jurisdictionId ? { traderAccount: traderFilter } : {};

    const [
      declarationsReceived,
      activeInspections,
      activeHolds,
      outstandingAssessments,
      releaseBacklog,
      refundClaimsOpen,
    ] = await Promise.all([
      this.prisma.customsDeclaration.count({
        where: {
          status: {
            in: [
              CustomsDeclarationStatus.SUBMITTED,
              CustomsDeclarationStatus.UNDER_REVIEW,
              CustomsDeclarationStatus.ASSESSED,
            ],
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
      this.prisma.customsAssessment.count({
        where: {
          status: { in: [CustomsAssessmentStatus.ISSUED, CustomsAssessmentStatus.PROPOSED] },
          customsDeclaration: { traderAccount: traderFilter },
        },
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
    ]);

    return {
      disclaimer: CUSTOMS_DASHBOARD_METRIC_DISCLAIMER,
      declarationsReceived,
      activeInspections,
      activeHolds,
      outstandingAssessments,
      releaseBacklog,
      refundClaimsOpen,
      analyticsDoNotReleaseCargo: true,
    };
  }
}
