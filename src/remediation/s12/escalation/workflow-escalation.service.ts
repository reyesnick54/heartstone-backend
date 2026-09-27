import { Injectable } from '@nestjs/common';
import { CaseEventType } from '@prisma/client';

import { CaseEventsService } from '../../../application-processing/cases/case-events.service';
import { PrismaService } from '../../../database/prisma.service';
import { ServerClockService } from '../clock/server-clock.service';
import { DEFAULT_ESCALATION_LADDER_CODE } from '../protocol/protocol-time-standards.constants';
import { SlaClockAuthorityService } from '../sla/sla-clock-authority.service';

@Injectable()
export class WorkflowEscalationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly clock: ServerClockService,
    private readonly caseEvents: CaseEventsService,
    private readonly slaClocks: SlaClockAuthorityService,
  ) {}

  async evaluateAndEscalate(caseId: string, clockKey: string): Promise<void> {
    const caseRecord = await this.prisma.case.findUnique({
      where: { id: caseId },
      select: {
        id: true,
        governmentServiceVersionId: true,
        responsibleDepartmentId: true,
        responsibleInstitutionId: true,
      },
    });
    if (!caseRecord) {
      return;
    }

    const clock = await this.prisma.caseSlaClock.findUnique({
      where: { caseId_clockKey: { caseId, clockKey } },
    });
    if (!clock) {
      return;
    }

    const elapsed = this.slaClocks.computeElapsedMs(clock);
    const overdueMs =
      clock.targetDurationMs != null ? Math.max(0, elapsed - clock.targetDurationMs) : 0;

    const ladderCode =
      (clock.serviceStandardRuleCode
        ? await this.resolveLadderCodeForRule(
            caseRecord.governmentServiceVersionId,
            clock.serviceStandardRuleCode,
          )
        : null) ?? DEFAULT_ESCALATION_LADDER_CODE;

    const ladder = await this.prisma.governmentServiceEscalationLadder.findUnique({
      where: {
        governmentServiceVersionId_ladderCode: {
          governmentServiceVersionId: caseRecord.governmentServiceVersionId,
          ladderCode,
        },
      },
      include: { steps: { orderBy: { level: 'asc' } } },
    });

    const steps =
      ladder?.steps ??
      this.defaultProtocolSteps(
        caseRecord.responsibleDepartmentId,
        caseRecord.responsibleInstitutionId,
      );

    for (const step of steps) {
      if (overdueMs < step.triggerOverdueMs) {
        continue;
      }

      const idempotencyKey = `escalation:${caseId}:${clockKey}:level-${String(step.level)}`;
      const existing = await this.prisma.caseEscalation.findUnique({
        where: { idempotencyKey },
      });
      if (existing) {
        continue;
      }

      try {
        await this.prisma.caseEscalation.create({
          data: {
            caseId,
            reason: `Escalation level ${String(step.level)}: ${step.label}`,
            escalationLevel: step.level,
            escalationLadderCode: ladderCode,
            idempotencyKey,
            slaClockKey: clockKey,
            responsibleDepartmentId:
              step.responsibleDepartmentId ?? caseRecord.responsibleDepartmentId,
            responsibleInstitutionId:
              step.responsibleInstitutionId ?? caseRecord.responsibleInstitutionId,
          },
        });

        await this.caseEvents.record(caseId, CaseEventType.ESCALATION_CREATED, {
          level: step.level,
          ladderCode,
          clockKey,
          overdueMs,
        });
      } catch {
        // Unique idempotency — concurrent workers.
      }
    }
  }

  private async resolveLadderCodeForRule(
    governmentServiceVersionId: string,
    ruleCode: string,
  ): Promise<string | null> {
    const rule = await this.prisma.governmentServiceSlaRule.findUnique({
      where: {
        governmentServiceVersionId_ruleCode: { governmentServiceVersionId, ruleCode },
      },
    });
    return rule?.escalationLadderCode ?? null;
  }

  private defaultProtocolSteps(
    responsibleDepartmentId: string,
    responsibleInstitutionId: string,
  ) {
    return [
      {
        level: 1,
        label: 'Team lead review',
        triggerOverdueMs: 0,
        responsibleDepartmentId,
        responsibleInstitutionId,
      },
      {
        level: 2,
        label: 'Section supervisor',
        triggerOverdueMs: 4 * 60 * 60 * 1000,
        responsibleDepartmentId,
        responsibleInstitutionId,
      },
      {
        level: 3,
        label: 'Department manager',
        triggerOverdueMs: 24 * 60 * 60 * 1000,
        responsibleDepartmentId,
        responsibleInstitutionId,
      },
      {
        level: 4,
        label: 'Institution executive officer',
        triggerOverdueMs: 48 * 60 * 60 * 1000,
        responsibleDepartmentId,
        responsibleInstitutionId,
      },
      {
        level: 5,
        label: 'Executive escalation',
        triggerOverdueMs: 72 * 60 * 60 * 1000,
        responsibleDepartmentId,
        responsibleInstitutionId,
      },
    ];
  }

  async seedDefaultLadderForServiceVersion(
    governmentServiceVersionId: string,
    responsibleDepartmentId: string,
    responsibleInstitutionId: string,
  ): Promise<void> {
    const ladder = await this.prisma.governmentServiceEscalationLadder.upsert({
      where: {
        governmentServiceVersionId_ladderCode: {
          governmentServiceVersionId,
          ladderCode: DEFAULT_ESCALATION_LADDER_CODE,
        },
      },
      create: {
        governmentServiceVersionId,
        ladderCode: DEFAULT_ESCALATION_LADDER_CODE,
        label: 'Protocol five-level escalation',
      },
      update: {},
    });

    const steps = this.defaultProtocolSteps(
      responsibleDepartmentId,
      responsibleInstitutionId,
    );
    for (const step of steps) {
      await this.prisma.governmentServiceEscalationLadderStep.upsert({
        where: {
          escalationLadderId_level: { escalationLadderId: ladder.id, level: step.level },
        },
        create: {
          escalationLadderId: ladder.id,
          level: step.level,
          label: step.label,
          triggerOverdueMs: step.triggerOverdueMs,
          responsibleDepartmentId: step.responsibleDepartmentId,
          responsibleInstitutionId: step.responsibleInstitutionId,
        },
        update: {
          label: step.label,
          triggerOverdueMs: step.triggerOverdueMs,
        },
      });
    }
  }
}
