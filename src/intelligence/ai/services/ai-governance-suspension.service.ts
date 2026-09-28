import { Injectable } from '@nestjs/common';
import { AiSuspensionSubjectType } from '@prisma/client';

import { PrismaService } from '../../../database/prisma.service';

@Injectable()
export class AiGovernanceSuspensionService {
  constructor(private readonly prisma: PrismaService) {}

  async isSubjectSuspended(subjectType: AiSuspensionSubjectType, subjectId: string): Promise<boolean> {
    const now = new Date();
    const active = await this.prisma.aiGovernanceSuspension.findFirst({
      where: {
        subjectType,
        subjectId,
        liftedAt: null,
        OR: [{ suspendedUntil: null }, { suspendedUntil: { gt: now } }],
      },
    });
    return active !== null;
  }
}
