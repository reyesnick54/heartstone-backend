import { randomUUID } from 'node:crypto';

import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../database/prisma.service';
import { CUSTOMS_TRADE_RULE_ENVIRONMENT } from '../customs-trade.constants';

@Injectable()
export class TradeOrganizationProfileService {
  constructor(private readonly prisma: PrismaService) {}

  async ensureProfile(input: { organizationId: string; jurisdictionId: string }) {
    const existing = await this.prisma.tradeOrganizationProfile.findUnique({
      where: { organizationId: input.organizationId },
    });
    if (existing) {
      return existing;
    }

    return this.prisma.tradeOrganizationProfile.create({
      data: {
        organizationId: input.organizationId,
        jurisdictionId: input.jurisdictionId,
        profileReference: `TRADE-${randomUUID().slice(0, 8).toUpperCase()}`,
        ruleEnvironment: CUSTOMS_TRADE_RULE_ENVIRONMENT,
      },
    });
  }
}
