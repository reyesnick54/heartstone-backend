import { Injectable } from '@nestjs/common';
import { CaseEventType, type CaseSlaClock, CaseSlaClockStatus, Prisma } from '@prisma/client';

import { CaseEventsService } from '../../../application-processing/cases/case-events.service';
import { PrismaService } from '../../../database/prisma.service';
import { ServerClockService } from '../clock/server-clock.service';
import { WorkflowDurableJobService } from '../jobs/workflow-durable-job.service';
import {
  type ResolvedSlaStandard,
  SlaStandardResolverService,
} from './sla-standard-resolver.service';

@Injectable()
export class SlaClockAuthorityService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly clock: ServerClockService,
    private readonly caseEvents: CaseEventsService,
    private readonly standards: SlaStandardResolverService,
    private readonly jobs: WorkflowDurableJobService,
  ) {}

  async startClockForCase(
    caseId: string,
    clockKey: string,
    governmentServiceVersionId: string,
    ruleCode?: string,
  ): Promise<CaseSlaClock> {
    const standard =
      (ruleCode
        ? await this.standards.resolveByRuleCode(governmentServiceVersionId, ruleCode)
        : await this.standards.resolvePrimaryProcessingStandard(governmentServiceVersionId)) ??
      (await this.standards.resolveByRuleCode(
        governmentServiceVersionId,
        'PROTOCOL-5D-SUBSTANTIVE',
      ));

    const startedAt = this.clock.now();
    const targetDurationMs = standard?.targetDurationMs ?? 5 * 24 * 60 * 60 * 1000;
    const dueAt = new Date(startedAt.getTime() + targetDurationMs);

    const created = await this.prisma.caseSlaClock.upsert({
      where: { caseId_clockKey: { caseId, clockKey } },
      create: {
        caseId,
        clockKey,
        status: CaseSlaClockStatus.RUNNING,
        startedAt,
        dueAt,
        targetDurationMs,
        serviceStandardRuleCode: standard?.ruleCode,
        governmentServiceVersionId,
        standardConfiguration: (standard?.configuration ?? {}) as Prisma.InputJsonValue,
      },
      update: {
        status: CaseSlaClockStatus.RUNNING,
        startedAt,
        dueAt,
        targetDurationMs,
        pausedDurationMs: 0,
        pausedAt: null,
        resumedAt: null,
        breachedAt: null,
        serviceStandardRuleCode: standard?.ruleCode,
        governmentServiceVersionId,
      },
    });

    await this.caseEvents.record(caseId, CaseEventType.SLA_CLOCK_STARTED, {
      clockKey,
      dueAt: dueAt.toISOString(),
      ruleCode: standard?.ruleCode,
    });

    await this.jobs.scheduleSlaDeadlineEvaluation(caseId, clockKey, dueAt);

    return created;
  }

  async pauseClock(caseId: string, clockKey: string, reason: string): Promise<CaseSlaClock | null> {
    const existing = await this.prisma.caseSlaClock.findUnique({
      where: { caseId_clockKey: { caseId, clockKey } },
    });
    if (existing?.status !== CaseSlaClockStatus.RUNNING) {
      return existing;
    }

    const pausedAt = this.clock.now();
    const updated = await this.prisma.caseSlaClock.update({
      where: { caseId_clockKey: { caseId, clockKey } },
      data: { status: CaseSlaClockStatus.PAUSED, pausedAt },
    });

    await this.caseEvents.record(caseId, CaseEventType.SLA_CLOCK_PAUSED, { clockKey, reason });
    return updated;
  }

  async resumeClock(caseId: string, clockKey: string): Promise<CaseSlaClock | null> {
    const existing = await this.prisma.caseSlaClock.findUnique({
      where: { caseId_clockKey: { caseId, clockKey } },
    });
    if (!existing?.pausedAt || existing.status !== CaseSlaClockStatus.PAUSED) {
      return existing;
    }

    const resumedAt = this.clock.now();
    const pauseSegmentMs = resumedAt.getTime() - existing.pausedAt.getTime();
    const pausedDurationMs = existing.pausedDurationMs + pauseSegmentMs;
    const dueAt =
      existing.dueAt ??
      new Date(existing.startedAt.getTime() + (existing.targetDurationMs ?? 0) + pauseSegmentMs);

    const adjustedDueAt = new Date(dueAt.getTime() + pauseSegmentMs);

    const updated = await this.prisma.caseSlaClock.update({
      where: { caseId_clockKey: { caseId, clockKey } },
      data: {
        status: CaseSlaClockStatus.RUNNING,
        resumedAt,
        pausedAt: null,
        pausedDurationMs,
        dueAt: adjustedDueAt,
      },
    });

    await this.caseEvents.record(caseId, CaseEventType.SLA_CLOCK_RESUMED, { clockKey });
    await this.jobs.scheduleSlaDeadlineEvaluation(caseId, clockKey, adjustedDueAt);
    return updated;
  }

  computeElapsedMs(clock: CaseSlaClock, at: Date = this.clock.now()): number {
    let elapsed = at.getTime() - clock.startedAt.getTime() - clock.pausedDurationMs;
    if (clock.status === CaseSlaClockStatus.PAUSED && clock.pausedAt) {
      elapsed -= at.getTime() - clock.pausedAt.getTime();
    }
    return Math.max(0, elapsed);
  }

  async evaluateBreach(caseId: string, clockKey: string): Promise<CaseSlaClock | null> {
    const clock = await this.prisma.caseSlaClock.findUnique({
      where: { caseId_clockKey: { caseId, clockKey } },
    });

    if (clock?.status !== CaseSlaClockStatus.RUNNING || !clock.targetDurationMs) {
      return clock;
    }

    const elapsed = this.computeElapsedMs(clock);
    if (elapsed <= clock.targetDurationMs) {
      return clock;
    }

    const breachedAt = this.clock.now();
    const breached = await this.prisma.caseSlaClock.update({
      where: { caseId_clockKey: { caseId, clockKey } },
      data: {
        status: CaseSlaClockStatus.BREACHED,
        breachedAt,
        elapsedMs: elapsed,
      },
    });

    await this.caseEvents.record(caseId, CaseEventType.SLA_BREACHED, {
      clockKey,
      elapsed,
      dueAt: clock.dueAt?.toISOString(),
    });

    await this.jobs.scheduleEscalationEvaluation(caseId, clockKey);
    return breached;
  }

  async completeClock(caseId: string, clockKey: string): Promise<CaseSlaClock | null> {
    const clock = await this.prisma.caseSlaClock.findUnique({
      where: { caseId_clockKey: { caseId, clockKey } },
    });
    if (!clock || clock.status === CaseSlaClockStatus.COMPLETED) {
      return clock;
    }

    return this.prisma.caseSlaClock.update({
      where: { caseId_clockKey: { caseId, clockKey } },
      data: {
        status: CaseSlaClockStatus.COMPLETED,
        completedAt: this.clock.now(),
        elapsedMs: this.computeElapsedMs(clock),
      },
    });
  }
}

export type { ResolvedSlaStandard };
