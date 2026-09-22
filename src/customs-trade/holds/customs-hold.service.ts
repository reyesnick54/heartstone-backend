import { Injectable } from '@nestjs/common';
import { CustomsHoldStatus } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { CustomsTradeBoundaryService } from '../common/customs-trade-boundary.service';

@Injectable()
export class CustomsHoldService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly boundary: CustomsTradeBoundaryService,
  ) {}

  async placeHold(input: {
    shipmentReferenceId: string;
    basisReference: string;
    holdReference?: string;
  }) {
    const holdReference = input.holdReference ?? `HOLD-${String(Date.now())}`;
    return this.prisma.customsHold.create({
      data: {
        shipmentReferenceId: input.shipmentReferenceId,
        holdReference,
        basisReference: input.basisReference,
        status: CustomsHoldStatus.ACTIVE,
        blocksRelease: true,
      },
    });
  }

  rejectOrdinaryClientHoldUpdate(payload: Record<string, unknown>): void {
    this.boundary.rejectClientForgedHoldRemovalFields(payload);
  }

  async removeHoldWithGovernance(input: {
    holdId: string;
    governedRemovalByOfficeholderId: string;
    removalDecisionReference: string;
  }) {
    return this.prisma.customsHold.update({
      where: { id: input.holdId },
      data: {
        status: CustomsHoldStatus.REMOVED,
        removedAt: new Date(),
        governedRemovalByOfficeholderId: input.governedRemovalByOfficeholderId,
        removalDecisionReference: input.removalDecisionReference,
      },
    });
  }
}
