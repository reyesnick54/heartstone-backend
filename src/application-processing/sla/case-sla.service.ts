import { Injectable } from '@nestjs/common';
import { CaseEventType, CaseSlaClockStatus } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { CaseEventsService } from '../cases/case-events.service';

@Injectable()
export class CaseSlaService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly caseEvents: CaseEventsService,
  ) {}

  async pauseClock(caseId: string, clockKey: string, reason: string) {
    const clock = await this.prisma.caseSlaClock.update({
      where: { caseId_clockKey: { caseId, clockKey } },
      data: { status: CaseSlaClockStatus.PAUSED, pausedAt: new Date() },
    });

    await this.caseEvents.record(caseId, CaseEventType.SLA_CLOCK_PAUSED, { clockKey, reason });
    return clock;
  }

  async resumeClock(caseId: string, clockKey: string) {
    const clock = await this.prisma.caseSlaClock.findUnique({
      where: { caseId_clockKey: { caseId, clockKey } },
    });

    if (!clock?.pausedAt) {
      return clock;
    }

    const pausedDuration = Date.now() - clock.pausedAt.getTime();

    const updated = await this.prisma.caseSlaClock.update({
      where: { caseId_clockKey: { caseId, clockKey } },
      data: {
        status: CaseSlaClockStatus.RUNNING,
        resumedAt: new Date(),
        pausedDurationMs: clock.pausedDurationMs + pausedDuration,
      },
    });

    await this.caseEvents.record(caseId, CaseEventType.SLA_CLOCK_RESUMED, { clockKey });
    return updated;
  }

  async checkBreach(caseId: string, clockKey: string) {
    const clock = await this.prisma.caseSlaClock.findUnique({
      where: { caseId_clockKey: { caseId, clockKey } },
    });

    if (!clock?.targetDurationMs || clock.status !== CaseSlaClockStatus.RUNNING) {
      return clock;
    }

    const elapsed = Date.now() - clock.startedAt.getTime() - clock.pausedDurationMs;
    if (elapsed <= clock.targetDurationMs) {
      return clock;
    }

    const breached = await this.prisma.caseSlaClock.update({
      where: { caseId_clockKey: { caseId, clockKey } },
      data: {
        status: CaseSlaClockStatus.BREACHED,
        breachedAt: new Date(),
        elapsedMs: elapsed,
      },
    });

    await this.caseEvents.record(caseId, CaseEventType.SLA_BREACHED, { clockKey, elapsed });
    return breached;
  }
}
