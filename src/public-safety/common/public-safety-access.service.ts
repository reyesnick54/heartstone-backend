import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { MembershipStatus } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { PUBLIC_SAFETY_REASON_CODES } from '../public-safety.constants';

@Injectable()
export class PublicSafetyAccessService {
  constructor(private readonly prisma: PrismaService) {}

  async assertCitizenEngagementAccess(identityId: string, engagementId: string): Promise<void> {
    const engagement = await this.prisma.publicSafetyEngagement.findUnique({
      where: { id: engagementId },
      select: { reporterIdentityId: true, organizationId: true },
    });
    if (!engagement) {
      throw new NotFoundException('Public safety engagement not found');
    }
    if (engagement.reporterIdentityId !== identityId) {
      throw new ForbiddenException(PUBLIC_SAFETY_REASON_CODES.CROSS_REPORTER_ACCESS_DENIED);
    }
  }

  async assertOrganizationMembership(identityId: string, organizationId: string): Promise<void> {
    const now = new Date();
    const membership = await this.prisma.organizationMembership.findFirst({
      where: {
        organizationId,
        identityId,
        status: MembershipStatus.ACTIVE,
        effectiveFrom: { lte: now },
        OR: [{ effectiveUntil: null }, { effectiveUntil: { gt: now } }],
      },
    });
    if (!membership) {
      throw new ForbiddenException(PUBLIC_SAFETY_REASON_CODES.CROSS_ORGANIZATION_ACCESS_DENIED);
    }
  }

  async assertBusinessEngagementAccess(
    identityId: string,
    organizationId: string,
    engagementId: string,
  ): Promise<void> {
    await this.assertOrganizationMembership(identityId, organizationId);
    const engagement = await this.prisma.publicSafetyEngagement.findUnique({
      where: { id: engagementId },
      select: { organizationId: true },
    });
    if (engagement?.organizationId !== organizationId) {
      throw new ForbiddenException(PUBLIC_SAFETY_REASON_CODES.CROSS_ORGANIZATION_ACCESS_DENIED);
    }
  }
}
