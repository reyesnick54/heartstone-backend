import { Injectable, NotFoundException } from '@nestjs/common';
import {
  type CaseSlaClock,
  CaseSlaClockStatus,
  CaseSlaClockType,
} from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { CASE_COORDINATION_EXPLANATION_CODES } from '../applications-workflow.constants';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export interface StartSlaClockInput {
  caseId: string;
  clockType: CaseSlaClockType;
  serviceLevelTargetLabel?: string;
  targetDurationDays?: number;
  serviceFunctionMappingId?: string;
  startedAt?: Date;
}

export interface SlaBreachResult {
  breached: boolean;
  approvesApplication: false;
  explanationCode: string;
  clockId: string;
}

@Injectable()
export class CaseSlaClocksService {
  constructor(private readonly prisma: PrismaService) {}

  async startClock(input: StartSlaClockInput): Promise<CaseSlaClock> {
    const caseRecord = await this.prisma.case.findUnique({ where: { id: input.caseId } });
    if (!caseRecord) {
      throw new NotFoundException(`Case "${input.caseId}" was not found`);
    }

    const startedAt = input.startedAt ?? new Date();
    const dueAt =
      input.targetDurationDays !== undefined
        ? new Date(startedAt.getTime() + input.targetDurationDays * MS_PER_DAY)
        : undefined;

    return this.prisma.caseSlaClock.create({
      data: {
        caseId: input.caseId,
        clockType: input.clockType,
        serviceLevelTargetLabel: input.serviceLevelTargetLabel,
        targetDurationDays: input.targetDurationDays,
        serviceFunctionMappingId: input.serviceFunctionMappingId,
        startedAt,
        dueAt,
        status: CaseSlaClockStatus.RUNNING,
      },
    });
  }

  async recordApplicantDelay(caseId: string, durationMs: number): Promise<CaseSlaClock> {
    return this.recordDelayClock(caseId, CaseSlaClockType.APPLICANT_TIME, durationMs);
  }

  async recordExternalDependencyDelay(
    caseId: string,
    durationMs: number,
  ): Promise<CaseSlaClock> {
    return this.recordDelayClock(
      caseId,
      CaseSlaClockType.EXTERNAL_DEPENDENCY_TIME,
      durationMs,
    );
  }

  async resumeClock(clockId: string): Promise<CaseSlaClock> {
    const clock = await this.requireClock(clockId);
    const openPause = await this.prisma.caseSlaPause.findFirst({
      where: { slaClockId: clock.id, resumedAt: null },
      orderBy: { pausedAt: 'desc' },
    });

    const now = new Date();
    if (openPause) {
      const pauseDurationMs = now.getTime() - openPause.pausedAt.getTime();
      await this.prisma.$transaction([
        this.prisma.caseSlaPause.update({
          where: { id: openPause.id },
          data: { resumedAt: now },
        }),
        this.prisma.caseSlaClock.update({
          where: { id: clock.id },
          data: {
            pausedDurationMs: clock.pausedDurationMs + pauseDurationMs,
            status: CaseSlaClockStatus.RUNNING,
          },
        }),
      ]);
    } else {
      await this.prisma.caseSlaClock.update({
        where: { id: clock.id },
        data: { status: CaseSlaClockStatus.RUNNING },
      });
    }

    return this.requireClock(clockId);
  }

  async evaluateBreach(clockId: string, at: Date = new Date()): Promise<SlaBreachResult> {
    const clock = await this.requireClock(clockId);
    const effectiveElapsedMs =
      at.getTime() - clock.startedAt.getTime() - clock.pausedDurationMs;
    const breached =
      clock.dueAt !== null && effectiveElapsedMs > clock.dueAt.getTime() - clock.startedAt.getTime();

    if (breached && clock.status !== CaseSlaClockStatus.BREACHED) {
      await this.prisma.caseSlaClock.update({
        where: { id: clock.id },
        data: {
          status: CaseSlaClockStatus.BREACHED,
          breachAt: at,
        },
      });
    }

    return {
      breached,
      approvesApplication: false,
      explanationCode: breached
        ? CASE_COORDINATION_EXPLANATION_CODES.SLA_BREACH_NOT_APPROVAL
        : 'SLA_WITHIN_TARGET',
      clockId: clock.id,
    };
  }

  async getClocksByCase(caseId: string): Promise<CaseSlaClock[]> {
    return this.prisma.caseSlaClock.findMany({
      where: { caseId },
      orderBy: { startedAt: 'asc' },
    });
  }

  private async recordDelayClock(
    caseId: string,
    clockType: CaseSlaClockType,
    durationMs: number,
  ): Promise<CaseSlaClock> {
    const startedAt = new Date();
    return this.prisma.caseSlaClock.create({
      data: {
        caseId,
        clockType,
        startedAt,
        elapsedMs: durationMs,
        status: CaseSlaClockStatus.COMPLETED,
        completedAt: startedAt,
        serviceLevelTargetLabel:
          clockType === CaseSlaClockType.APPLICANT_TIME
            ? 'Applicant response delay'
            : 'External dependency delay',
      },
    });
  }

  private async requireClock(clockId: string): Promise<CaseSlaClock> {
    const clock = await this.prisma.caseSlaClock.findUnique({ where: { id: clockId } });
    if (!clock) {
      throw new NotFoundException(`SLA clock "${clockId}" was not found`);
    }
    return clock;
  }
}
