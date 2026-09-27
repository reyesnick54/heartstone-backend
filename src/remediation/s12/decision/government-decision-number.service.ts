import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../../database/prisma.service';
import { DECISION_NUMBER_PREFIX } from '../../../decisions/decisions.constants';
import { ServerClockService } from '../clock/server-clock.service';

@Injectable()
export class GovernmentDecisionNumberService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly clock: ServerClockService,
  ) {}

  async allocateNextDecisionNumber(): Promise<string> {
    const year = this.clock.now().getFullYear();

    const allocated = await this.prisma.$transaction(async (tx) => {
      const existing = await tx.governmentDecisionNumberSequence.findUnique({ where: { year } });
      if (!existing) {
        await tx.governmentDecisionNumberSequence.create({ data: { year, nextValue: 2 } });
        return 1;
      }
      const value = existing.nextValue;
      await tx.governmentDecisionNumberSequence.update({
        where: { year },
        data: { nextValue: value + 1 },
      });
      return value;
    });

    return `${DECISION_NUMBER_PREFIX}-${String(year)}-${String(allocated).padStart(6, '0')}`;
  }
}
