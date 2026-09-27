import { randomUUID } from 'node:crypto';

import { Injectable, Logger } from '@nestjs/common';
import {
  Prisma,
  WorkflowDurableJobKind,
  WorkflowDurableJobStatus,
} from '@prisma/client';

import { PrismaService } from '../../../database/prisma.service';
import { RedisService } from '../../../redis/redis.service';
import { ServerClockService } from '../clock/server-clock.service';

const LEASE_SECONDS = 120;

@Injectable()
export class WorkflowDurableJobService {
  private readonly logger = new Logger(WorkflowDurableJobService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly clock: ServerClockService,
  ) {}

  async enqueue(input: {
    jobKind: WorkflowDurableJobKind;
    idempotencyKey: string;
    payload: Record<string, unknown>;
    scheduledFor?: Date;
  }) {
    try {
      return await this.prisma.workflowDurableJob.create({
        data: {
          jobKind: input.jobKind,
          idempotencyKey: input.idempotencyKey,
          payload: input.payload as Prisma.InputJsonValue,
          scheduledFor: input.scheduledFor ?? this.clock.now(),
          status: WorkflowDurableJobStatus.PENDING,
        },
      });
    } catch (error) {
      const existing = await this.prisma.workflowDurableJob.findUnique({
        where: { idempotencyKey: input.idempotencyKey },
      });
      if (existing) {
        return existing;
      }
      throw error;
    }
  }

  scheduleSlaDeadlineEvaluation(caseId: string, clockKey: string, dueAt: Date) {
    return this.enqueue({
      jobKind: WorkflowDurableJobKind.SLA_DEADLINE_EVALUATION,
      idempotencyKey: `sla-deadline:${caseId}:${clockKey}`,
      payload: { caseId, clockKey },
      scheduledFor: dueAt,
    });
  }

  scheduleEscalationEvaluation(caseId: string, clockKey: string) {
    return this.enqueue({
      jobKind: WorkflowDurableJobKind.ESCALATION_EVALUATION,
      idempotencyKey: `escalation-eval:${caseId}:${clockKey}:${String(this.clock.nowMs())}`,
      payload: { caseId, clockKey },
      scheduledFor: this.clock.now(),
    });
  }

  async claimDueJobs(limit = 20) {
    const now = this.clock.now();
    const candidates = await this.prisma.workflowDurableJob.findMany({
      where: {
        status: WorkflowDurableJobStatus.PENDING,
        scheduledFor: { lte: now },
      },
      orderBy: { scheduledFor: 'asc' },
      take: limit,
    });

    const claimed = [];
    for (const job of candidates) {
      const leaseToken = randomUUID();
      const leaseExpiresAt = new Date(now.getTime() + LEASE_SECONDS * 1000);
      const redisKey = `workflow-job-lease:${job.id}`;

      let redisAcquired = true;
      if (this.redis.isConnected()) {
        const result = await this.redis.getClient().set(redisKey, leaseToken, 'EX', LEASE_SECONDS, 'NX');
        redisAcquired = result === 'OK';
      }

      if (!redisAcquired) {
        continue;
      }

      const updated = await this.prisma.workflowDurableJob.updateMany({
        where: {
          id: job.id,
          status: WorkflowDurableJobStatus.PENDING,
        },
        data: {
          status: WorkflowDurableJobStatus.RUNNING,
          leaseToken,
          leaseExpiresAt,
          startedAt: now,
          attemptCount: { increment: 1 },
        },
      });

      if (updated.count === 1) {
        claimed.push(await this.prisma.workflowDurableJob.findUniqueOrThrow({ where: { id: job.id } }));
      } else if (this.redis.isConnected()) {
        await this.redis.getClient().del(redisKey);
      }
    }

    return claimed;
  }

  async completeJob(jobId: string, leaseToken: string | null) {
    await this.prisma.workflowDurableJob.updateMany({
      where: { id: jobId, leaseToken: leaseToken ?? undefined },
      data: {
        status: WorkflowDurableJobStatus.COMPLETED,
        completedAt: this.clock.now(),
        leaseToken: null,
        leaseExpiresAt: null,
      },
    });
  }

  async failJob(jobId: string, leaseToken: string | null, error: Error) {
    const job = await this.prisma.workflowDurableJob.findUnique({ where: { id: jobId } });
    if (!job) {
      return;
    }

    const dead = job.attemptCount >= job.maxAttempts;
    await this.prisma.workflowDurableJob.update({
      where: { id: jobId },
      data: {
        status: dead ? WorkflowDurableJobStatus.DEAD : WorkflowDurableJobStatus.PENDING,
        lastError: error.message,
        leaseToken: null,
        leaseExpiresAt: null,
        scheduledFor: dead ? job.scheduledFor : new Date(this.clock.nowMs() + 60_000),
      },
    });

    if (!dead) {
      this.logger.warn(`Job ${jobId} will retry: ${error.message}`);
    }
  }
}
