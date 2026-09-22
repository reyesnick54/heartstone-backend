import { Injectable } from '@nestjs/common';
import {
  CustomsDocumentDeficiencyStatus,
  CustomsExternalDependencyStatus,
  CustomsHoldStatus,
  CustomsReleaseStatus,
  CustomsReviewStageStatus,
  TradePermitStatus,
} from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import {
  CUSTOMS_RELEASE_REQUIRED_CONDITION_KEYS,
  type CustomsReleaseConditionKey,
} from '../customs-trade.constants';

export interface CustomsReleaseEligibilityResult {
  eligible: boolean;
  conditions: Record<CustomsReleaseConditionKey, boolean>;
  blockingReasons: string[];
}

@Injectable()
export class CustomsReleaseEligibilityService {
  constructor(private readonly prisma: PrismaService) {}

  async evaluateShipmentRelease(shipmentId: string, officeholderId?: string | null) {
    const shipment = await this.prisma.tradeShipment.findUnique({
      where: { id: shipmentId },
      include: {
        holds: true,
        permits: { where: { requiredForRelease: true } },
        assessments: true,
        externalDependencies: true,
        documentDeficiencies: true,
        releaseReview: true,
        releaseRecord: true,
        tradeOrganizationProfile: { select: { jurisdictionId: true } },
      },
    });

    if (!shipment) {
      return this.emptyResult(['Shipment not found']);
    }

    if (shipment.releaseRecord?.status === CustomsReleaseStatus.RELEASED) {
      return this.emptyResult(['Already released']);
    }

    const review = shipment.releaseReview;
    const reviewsComplete =
      review != null &&
      [
        review.declarationReviewStatus,
        review.classificationReviewStatus,
        review.valuationReviewStatus,
        review.permitVerificationStatus,
        review.riskReviewStatus,
      ].every(
        (status) =>
          status === CustomsReviewStageStatus.COMPLETE ||
          status === CustomsReviewStageStatus.NOT_REQUIRED,
      );

    let officialReleaseAuthority = false;
    if (officeholderId) {
      const authority = await this.prisma.customsOfficialReleaseAuthority.findFirst({
        where: {
          officeholderId,
          jurisdictionId: shipment.tradeOrganizationProfile.jurisdictionId,
          isActive: true,
        },
      });
      officialReleaseAuthority = Boolean(authority);
    }

    const holdsCleared = !shipment.holds.some((hold) => hold.status === CustomsHoldStatus.ACTIVE);

    const permitsSatisfied = shipment.permits.every(
      (permit) => permit.status === TradePermitStatus.APPROVED,
    );

    const paymentConditionsSatisfied = shipment.assessments.every((assessment) => {
      if (!assessment.paymentRequiredForRelease) {
        return true;
      }
      return assessment.paidAmountCents >= assessment.amountCents;
    });

    const externalDependenciesSatisfied = shipment.externalDependencies.every(
      (dependency) => dependency.status === CustomsExternalDependencyStatus.SATISFIED,
    );

    const documentDeficienciesResolved = !shipment.documentDeficiencies.some(
      (item) => item.status === CustomsDocumentDeficiencyStatus.OPEN,
    );

    const conditions: Record<CustomsReleaseConditionKey, boolean> = {
      reviewsComplete,
      officialReleaseAuthority,
      holdsCleared,
      permitsSatisfied,
      paymentConditionsSatisfied,
      externalDependenciesSatisfied,
      documentDeficienciesResolved,
    };

    const blockingReasons = CUSTOMS_RELEASE_REQUIRED_CONDITION_KEYS.filter(
      (key) => !conditions[key],
    ).map((key) => key);

    return {
      eligible: blockingReasons.length === 0,
      conditions,
      blockingReasons,
    } satisfies CustomsReleaseEligibilityResult;
  }

  private emptyResult(blockingReasons: string[]): CustomsReleaseEligibilityResult {
    const conditions = Object.fromEntries(
      CUSTOMS_RELEASE_REQUIRED_CONDITION_KEYS.map((key) => [key, false]),
    ) as Record<CustomsReleaseConditionKey, boolean>;

    return {
      eligible: false,
      conditions,
      blockingReasons,
    };
  }
}
