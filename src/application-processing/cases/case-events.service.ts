import { Injectable } from '@nestjs/common';
import { CaseEventType, Prisma } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class CaseEventsService {
  constructor(private readonly prisma: PrismaService) {}

  async record(
    caseId: string,
    eventType: CaseEventType,
    payload: Record<string, unknown> = {},
    actorIdentityId?: string,
  ) {
    return this.prisma.caseEvent.create({
      data: {
        caseId,
        eventType,
        payload: payload as Prisma.InputJsonValue,
        actorIdentityId,
      },
    });
  }
}
