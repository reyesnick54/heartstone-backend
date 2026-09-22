import { Injectable } from '@nestjs/common';
import {
  CustomsAssessmentStatus,
  CustomsDeclarationStatus,
  CustomsExternalDependencyStatus,
  CustomsHoldStatus,
  CustomsReleaseStatus,
  TradePermitStatus,
} from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { CUSTOMS_DASHBOARD_METRIC_DISCLAIMER } from '../customs-trade.constants';

@Injectable()
export class CustomsTradeDashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getOperationalMetrics(jurisdictionIds?: string[]) {
    const profileFilter = jurisdictionIds?.length
      ? { jurisdictionId: { in: jurisdictionIds } }
      : {};

    const shipmentFilter = {
      tradeOrganizationProfile: profileFilter,
    };

    const [
      declarationsReceived,
      activeInspections,
      activeHolds,
      unresolvedPermits,
      outstandingAssessments,
      releaseBacklog,
      portDependencyIssues,
    ] = await Promise.all([
      this.prisma.customsDeclaration.count({
        where: {
          status: {
            in: [
              CustomsDeclarationStatus.SUBMITTED,
              CustomsDeclarationStatus.UNDER_REVIEW,
              CustomsDeclarationStatus.ACCEPTED,
            ],
          },
          tradeOrganizationProfile: profileFilter,
        },
      }),
      this.prisma.customsInspection.count({ where: { shipment: shipmentFilter } }),
      this.prisma.customsHold.count({
        where: { status: CustomsHoldStatus.ACTIVE, shipment: shipmentFilter },
      }),
      this.prisma.tradePermit.count({
        where: {
          status: { in: [TradePermitStatus.REQUESTED, TradePermitStatus.UNDER_REVIEW] },
          tradeOrganizationProfile: profileFilter,
        },
      }),
      this.prisma.customsAssessment.count({
        where: {
          status: {
            in: [CustomsAssessmentStatus.ISSUED, CustomsAssessmentStatus.PARTIALLY_PAID],
          },
          tradeOrganizationProfile: profileFilter,
        },
      }),
      this.prisma.customsReleaseRecord.count({
        where: {
          status: { in: [CustomsReleaseStatus.NOT_RELEASED, CustomsReleaseStatus.BLOCKED] },
          shipment: shipmentFilter,
        },
      }),
      this.prisma.customsExternalDependency.count({
        where: {
          status: {
            in: [CustomsExternalDependencyStatus.PENDING, CustomsExternalDependencyStatus.FAILED],
          },
          shipment: shipmentFilter,
        },
      }),
    ]);

    return {
      disclaimer: CUSTOMS_DASHBOARD_METRIC_DISCLAIMER,
      metrics: {
        declarationsReceived,
        clearanceTimeHours: null,
        inspections: activeInspections,
        holds: activeHolds,
        unresolvedPermits,
        outstandingAssessments,
        releaseBacklog,
        portBorderDependencyIssues: portDependencyIssues,
      },
    };
  }
}
