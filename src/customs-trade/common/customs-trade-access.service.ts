import { ForbiddenException, Injectable } from '@nestjs/common';
import { Prisma, RepresentativeAuthorityStatus, TradeAccessActorKind } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { type BusinessOrganizationAccess } from '../../experience/common/business-access.service';
import { CUSTOMS_REASON_CODES } from '../customs-trade.constants';

export interface TradeOrganizationAccessContext {
  accessorIdentityId: string;
  organizationId: string;
  actorKind: TradeAccessActorKind;
  endpoint: string;
  businessAccess?: BusinessOrganizationAccess;
}

@Injectable()
export class CustomsTradeAccessService {
  constructor(private readonly prisma: PrismaService) {}

  buildShipmentWhere(access: BusinessOrganizationAccess): Prisma.TradeShipmentWhereInput {
    const base: Prisma.TradeShipmentWhereInput = {
      organizationId: access.organizationId,
    };

    if (access.hasFullOrganizationVisibility) {
      return base;
    }

    return {
      ...base,
      representativeAuthorityId: { in: access.activeRepresentativeAuthorityIds },
    };
  }

  async assertOrganizationTradeAccess(context: TradeOrganizationAccessContext): Promise<void> {
    let granted = false;
    let denialReason: string | undefined;

    if (context.actorKind === TradeAccessActorKind.CUSTOMS_OFFICER) {
      granted = true;
    } else if (context.actorKind === TradeAccessActorKind.PLATFORM_ADMIN) {
      granted = false;
      denialReason = CUSTOMS_REASON_CODES.CROSS_ORGANIZATION_ACCESS_DENIED;
    } else if (context.businessAccess) {
      const access = context.businessAccess;
      granted =
        access.organizationId === context.organizationId &&
        (access.hasFullOrganizationVisibility ||
          access.activeRepresentativeAuthorityIds.length > 0);
      if (!granted) {
        denialReason = CUSTOMS_REASON_CODES.CROSS_ORGANIZATION_ACCESS_DENIED;
      }
      if (
        granted &&
        !access.hasFullOrganizationVisibility &&
        context.actorKind === TradeAccessActorKind.CUSTOMS_BROKER
      ) {
        // broker path requires explicit representative authority
        granted = access.activeRepresentativeAuthorityIds.length > 0;
        if (!granted) {
          denialReason = CUSTOMS_REASON_CODES.BROKER_SCOPE_REQUIRED;
        }
      }
    } else {
      denialReason = CUSTOMS_REASON_CODES.CROSS_ORGANIZATION_ACCESS_DENIED;
    }

    await this.prisma.tradeAccessAudit.create({
      data: {
        organizationId: context.organizationId,
        accessorIdentityId: context.accessorIdentityId,
        actorKind: context.actorKind,
        endpoint: context.endpoint,
        accessGranted: granted,
        denialReason,
      },
    });

    if (!granted) {
      throw new ForbiddenException(
        denialReason ?? CUSTOMS_REASON_CODES.CROSS_ORGANIZATION_ACCESS_DENIED,
      );
    }
  }

  async assertShipmentAccess(
    accessorIdentityId: string,
    shipmentId: string,
    businessAccess: BusinessOrganizationAccess,
    endpoint: string,
  ): Promise<void> {
    const shipment = await this.prisma.tradeShipment.findFirst({
      where: {
        id: shipmentId,
        ...this.buildShipmentWhere(businessAccess),
      },
    });

    await this.prisma.tradeAccessAudit.create({
      data: {
        organizationId: businessAccess.organizationId,
        shipmentId,
        accessorIdentityId,
        actorKind: businessAccess.hasFullOrganizationVisibility
          ? TradeAccessActorKind.ORGANIZATION_MEMBER
          : TradeAccessActorKind.CUSTOMS_BROKER,
        endpoint,
        accessGranted: Boolean(shipment),
        denialReason: shipment ? undefined : CUSTOMS_REASON_CODES.CROSS_SHIPMENT_ACCESS_DENIED,
      },
    });

    if (!shipment) {
      throw new ForbiddenException(CUSTOMS_REASON_CODES.CROSS_SHIPMENT_ACCESS_DENIED);
    }
  }

  async assertActiveRepresentativeAuthority(
    representativeAuthorityId: string,
    accessorIdentityId: string,
    organizationId: string,
  ): Promise<void> {
    const authority = await this.prisma.representativeAuthority.findUnique({
      where: { id: representativeAuthorityId },
    });
    const now = new Date();
    const granted =
      authority?.status === RepresentativeAuthorityStatus.ACTIVE &&
      authority.identityId === accessorIdentityId &&
      authority.organizationId === organizationId &&
      authority.effectiveFrom <= now &&
      (authority.effectiveUntil == null || authority.effectiveUntil > now);

    if (!granted) {
      throw new ForbiddenException(CUSTOMS_REASON_CODES.REPRESENTATIVE_AUTHORITY_REQUIRED);
    }
  }
}
