import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../../database/prisma.service';

@Injectable()
export class TradeScopeService {
  constructor(private readonly prisma: PrismaService) {}

  findOrganizationTradeProfile(organizationId: string) {
    return this.prisma.tradeOrganizationProfile.findUnique({
      where: { organizationId },
    });
  }
}
