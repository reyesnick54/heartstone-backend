import { randomUUID } from 'node:crypto';

import { Injectable } from '@nestjs/common';
import { CustomsTraderAccountStatus } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { CUSTOMS_TRADE_RULE_ENVIRONMENT } from '../customs-trade.constants';

@Injectable()
export class TraderAccountProfileService {
  constructor(private readonly prisma: PrismaService) {}

  async ensureTraderAccount(input: { organizationId: string; jurisdictionId: string }) {
    const existing = await this.prisma.traderAccount.findFirst({
      where: { organizationId: input.organizationId },
    });
    if (existing) {
      return existing;
    }

    return this.prisma.traderAccount.create({
      data: {
        accountNumber: `TRADE-${randomUUID().slice(0, 8).toUpperCase()}`,
        organizationId: input.organizationId,
        jurisdictionId: input.jurisdictionId,
        status: CustomsTraderAccountStatus.ACTIVE,
      },
    });
  }

  ruleEnvironment(): string {
    return CUSTOMS_TRADE_RULE_ENVIRONMENT;
  }
}
