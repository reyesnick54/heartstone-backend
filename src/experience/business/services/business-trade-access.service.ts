import { Injectable } from '@nestjs/common';
import { CustomsBrokerAuthorizationStatus, Prisma } from '@prisma/client';

import { PrismaService } from '../../../database/prisma.service';
import { type BusinessOrganizationAccess } from '../../common/business-access.service';

@Injectable()
export class BusinessTradeAccessService {
  constructor(private readonly prisma: PrismaService) {}

  async buildShipmentReferenceWhere(
    access: BusinessOrganizationAccess,
  ): Promise<Prisma.ShipmentReferenceWhereInput> {
    const base: Prisma.ShipmentReferenceWhereInput = {
      ownerOrganizationId: access.organizationId,
    };

    if (access.hasFullOrganizationVisibility) {
      return base;
    }

    const authorizations = await this.prisma.customsBrokerAuthorization.findMany({
      where: {
        representativeAuthorityId: { in: access.activeRepresentativeAuthorityIds },
        status: CustomsBrokerAuthorizationStatus.ACTIVE,
      },
      select: { traderAccountId: true },
    });

    const traderAccountIds = authorizations.map((authorization) => authorization.traderAccountId);
    return {
      ...base,
      traderAccountId: { in: traderAccountIds },
    };
  }
}
