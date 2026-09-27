import { ForbiddenException, Injectable } from '@nestjs/common';
import { MembershipStatus, RepresentativeAuthorityStatus } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';

export type CorporateRegistryWriteScope = 'GENERAL' | 'BENEFICIAL_OWNERSHIP';

export interface CorporateRegistryActorAccess {
  organizationId: string;
  identityId: string;
  hasActiveMembership: boolean;
  activeRepresentativeAuthorityIds: string[];
}

@Injectable()
export class CorporateRegistryActorAccessService {
  constructor(private readonly prisma: PrismaService) {}

  async assertOrganizationWriteAccess(
    organizationId: string,
    identityId: string,
    scope: CorporateRegistryWriteScope,
  ): Promise<CorporateRegistryActorAccess> {
    const now = new Date();
    const [memberships, authorities] = await Promise.all([
      this.prisma.organizationMembership.findMany({
        where: {
          organizationId,
          identityId,
          status: MembershipStatus.ACTIVE,
          effectiveFrom: { lte: now },
          OR: [{ effectiveUntil: null }, { effectiveUntil: { gt: now } }],
        },
        select: { id: true },
      }),
      this.prisma.representativeAuthority.findMany({
        where: {
          organizationId,
          identityId,
          status: RepresentativeAuthorityStatus.ACTIVE,
          effectiveFrom: { lte: now },
          OR: [{ effectiveUntil: null }, { effectiveUntil: { gt: now } }],
        },
        select: { id: true },
      }),
    ]);

    if (memberships.length === 0 && authorities.length === 0) {
      throw new ForbiddenException('Corporate registry access denied');
    }

    if (scope === 'BENEFICIAL_OWNERSHIP' && memberships.length === 0) {
      throw new ForbiddenException(
        'Beneficial ownership filings require full organization membership',
      );
    }

    if (scope === 'GENERAL' && memberships.length === 0 && authorities.length === 0) {
      throw new ForbiddenException('Corporate registry access denied');
    }

    return {
      organizationId,
      identityId,
      hasActiveMembership: memberships.length > 0,
      activeRepresentativeAuthorityIds: authorities.map((authority) => authority.id),
    };
  }
}
