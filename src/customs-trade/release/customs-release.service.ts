import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import { CustomsReleaseStatus, TradeShipmentStatus } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { CustomsTradeBoundaryService } from '../common/customs-trade-boundary.service';
import { CUSTOMS_REASON_CODES } from '../customs-trade.constants';
import { CustomsReleaseEligibilityService } from './customs-release-eligibility.service';

@Injectable()
export class CustomsReleaseService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly boundary: CustomsTradeBoundaryService,
    private readonly eligibility: CustomsReleaseEligibilityService,
  ) {}

  async getAvailableOfficialActions(shipmentId: string, officeholderId?: string | null) {
    const evaluation = await this.eligibility.evaluateShipmentRelease(shipmentId, officeholderId);
    const actions: { actionCode: string; label: string }[] = [];

    if (evaluation.eligible) {
      actions.push({
        actionCode: 'EXECUTE_CARGO_RELEASE',
        label: 'Execute cargo release (re-evaluated at execution)',
      });
    }

    return {
      actions,
      eligibilityPreview: evaluation,
      releaseRequiresExecutionReevaluation: true,
    };
  }

  async executeCargoRelease(input: {
    shipmentId: string;
    officeholderId: string;
    actorPayload?: Record<string, unknown>;
  }) {
    if (input.actorPayload) {
      this.boundary.rejectClientReleaseFields(input.actorPayload);
    }

    const evaluation = await this.eligibility.evaluateShipmentRelease(
      input.shipmentId,
      input.officeholderId,
    );

    if (!evaluation.conditions.officialReleaseAuthority) {
      throw new ForbiddenException(CUSTOMS_REASON_CODES.OFFICIAL_WITHOUT_AUTHORITY);
    }

    this.boundary.assertReleaseAuthoritativeConditions(evaluation.conditions);

    const now = new Date();

    await this.prisma.$transaction([
      this.prisma.customsReleaseRecord.upsert({
        where: { shipmentId: input.shipmentId },
        create: {
          shipmentId: input.shipmentId,
          status: CustomsReleaseStatus.RELEASED,
          releasedAt: now,
          releasedByOfficeholderId: input.officeholderId,
          lastEligibilitySnapshot: evaluation.conditions,
        },
        update: {
          status: CustomsReleaseStatus.RELEASED,
          releasedAt: now,
          releasedByOfficeholderId: input.officeholderId,
          lastEligibilitySnapshot: evaluation.conditions,
        },
      }),
      this.prisma.tradeShipment.update({
        where: { id: input.shipmentId },
        data: { status: TradeShipmentStatus.RELEASED },
      }),
    ]);

    return {
      shipmentId: input.shipmentId,
      status: CustomsReleaseStatus.RELEASED,
      releasedAt: now.toISOString(),
      reevaluatedAtExecution: true,
    };
  }

  assertReleaseNotAvailableFromClientActionList(actionCode: string): void {
    if (actionCode === 'EXECUTE_CARGO_RELEASE') {
      throw new BadRequestException(CUSTOMS_REASON_CODES.RELEASE_REEVALUATION_REQUIRED);
    }
  }
}
