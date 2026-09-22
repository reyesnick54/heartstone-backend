import { BadRequestException, Injectable } from '@nestjs/common';
import {
  CustomsActorPersona,
  CustomsHoldStatus,
  CustomsPermitReferenceStatus,
  CustomsReleaseRecordStatus,
  ShipmentReferenceStatus,
} from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { CustomsTradeBoundaryService } from '../common/customs-trade-boundary.service';

@Injectable()
export class CustomsReleaseService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly boundary: CustomsTradeBoundaryService,
  ) {}

  async evaluateReleaseReadiness(
    shipmentReferenceId: string,
  ): Promise<{ mayRelease: boolean; reasons: string[] }> {
    const reasons: string[] = [];

    const activeHolds = await this.prisma.customsHold.count({
      where: { shipmentReferenceId, status: CustomsHoldStatus.ACTIVE, blocksRelease: true },
    });
    if (activeHolds > 0) {
      reasons.push('ACTIVE_HOLD');
    }

    const declaration = await this.prisma.customsDeclaration.findFirst({
      where: { shipmentReferenceId },
      include: { permitReferences: true },
    });
    if (declaration) {
      try {
        this.boundary.assertMandatoryPermitsResolved(declaration.permitReferences);
      } catch {
        reasons.push('MANDATORY_PERMIT');
      }
    }

    return { mayRelease: reasons.length === 0, reasons };
  }

  async authorizeRelease(input: {
    shipmentReferenceId: string;
    actorPersona: CustomsActorPersona;
    actorRoleMarker?: string;
    authorizedByOfficeholderId: string;
    releaseDecisionReferenceId?: string;
  }) {
    this.boundary.assertTechnicalAdminCannotReleaseShipment(
      input.actorPersona,
      input.actorRoleMarker,
    );
    this.boundary.assertAiCannotAuthorizeRelease('AUTHORIZE_RELEASE', input.actorPersona);

    const readiness = await this.evaluateReleaseReadiness(input.shipmentReferenceId);
    if (!readiness.mayRelease) {
      throw new BadRequestException(`Release blocked: ${readiness.reasons.join(',')}`);
    }

    const releaseReference = `REL-${String(Date.now())}-${Math.random().toString(36).slice(2, 8)}`;

    const record = await this.prisma.customsReleaseRecord.create({
      data: {
        shipmentReferenceId: input.shipmentReferenceId,
        releaseReference,
        status: CustomsReleaseRecordStatus.RELEASED,
        authorizedByOfficeholderId: input.authorizedByOfficeholderId,
        releaseDecisionReferenceId: input.releaseDecisionReferenceId,
        releasedAt: new Date(),
        paymentRecordedDoesNotRelease: true,
      },
    });

    await this.prisma.shipmentReference.update({
      where: { id: input.shipmentReferenceId },
      data: {
        currentReleaseRecordId: record.id,
        status: ShipmentReferenceStatus.RELEASED,
      },
    });

    return record;
  }

  assertPaymentEventDoesNotRelease(actorPersona: CustomsActorPersona): void {
    this.boundary.assertPaymentDoesNotReleaseCargo(actorPersona);
  }

  listBlockingPermits(
    permits: {
      isMandatoryForRelease: boolean;
      blocksReleaseWhenUnresolved: boolean;
      status: CustomsPermitReferenceStatus;
    }[],
  ): number {
    return permits.filter(
      (permit) =>
        permit.isMandatoryForRelease &&
        permit.blocksReleaseWhenUnresolved &&
        permit.status === CustomsPermitReferenceStatus.UNRESOLVED_MANDATORY,
    ).length;
  }
}
