import { ForbiddenException, Injectable } from '@nestjs/common';
import { RepresentativeAuthorityStatus } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { CustomsTradeBoundaryService } from '../common/customs-trade-boundary.service';
import { CUSTOMS_REASON_CODES } from '../customs-trade.constants';

export interface CustomsBrokerAccessContext {
  accessorIdentityId: string;
  traderAccountId: string;
  representativeAuthorityId: string;
  endpoint: string;
}

@Injectable()
export class CustomsTradeAccessService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly boundary: CustomsTradeBoundaryService,
  ) {}

  async assertBrokerHasActiveRepresentation(context: CustomsBrokerAccessContext): Promise<void> {
    const traderAccount = await this.prisma.traderAccount.findUnique({
      where: { id: context.traderAccountId },
    });
    if (!traderAccount?.organizationId) {
      throw new ForbiddenException(CUSTOMS_REASON_CODES.REPRESENTATIVE_AUTHORITY_REQUIRED);
    }

    const authorization = await this.prisma.customsBrokerAuthorization.findFirst({
      where: {
        traderAccountId: context.traderAccountId,
        representativeAuthorityId: context.representativeAuthorityId,
        status: 'ACTIVE',
      },
      include: { representativeAuthority: true },
    });

    const authority = authorization?.representativeAuthority;
    const now = new Date();
    const active =
      authorization != null &&
      authority?.status === RepresentativeAuthorityStatus.ACTIVE &&
      authority.identityId === context.accessorIdentityId &&
      authority.organizationId === traderAccount.organizationId &&
      authority.effectiveFrom <= now &&
      (authority.effectiveUntil == null || authority.effectiveUntil > now);

    if (!active) {
      throw new ForbiddenException(CUSTOMS_REASON_CODES.REPRESENTATIVE_AUTHORITY_REQUIRED);
    }
  }

  async assertShipmentOrganizationAccess(
    requesterOrganizationId: string,
    shipmentReferenceId: string,
  ): Promise<void> {
    const shipment = await this.prisma.shipmentReference.findUnique({
      where: { id: shipmentReferenceId },
      select: { ownerOrganizationId: true },
    });
    if (!shipment) {
      throw new ForbiddenException(CUSTOMS_REASON_CODES.CROSS_COMPANY_DENIED);
    }
    this.boundary.assertCrossCompanyAccessBlocked(
      requesterOrganizationId,
      shipment.ownerOrganizationId,
    );
  }
}
