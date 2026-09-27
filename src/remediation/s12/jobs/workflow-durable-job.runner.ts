import { Injectable, Logger } from '@nestjs/common';
import { WorkflowDurableJobKind } from '@prisma/client';

import { WorkflowEscalationService } from '../escalation/workflow-escalation.service';
import { SlaClockAuthorityService } from '../sla/sla-clock-authority.service';
import { WorkflowDurableJobService } from './workflow-durable-job.service';

@Injectable()
export class WorkflowDurableJobRunner {
  private readonly logger = new Logger(WorkflowDurableJobRunner.name);

  constructor(
    private readonly jobs: WorkflowDurableJobService,
    private readonly slaClocks: SlaClockAuthorityService,
    private readonly escalation: WorkflowEscalationService,
  ) {}

  async processDueJobs(limit = 20): Promise<number> {
    const claimed = await this.jobs.claimDueJobs(limit);
    let processed = 0;

    for (const job of claimed) {
      try {
        const payload = job.payload as Record<string, unknown>;
        const caseId =
          typeof payload.caseId === 'string' ? payload.caseId : '';
        const clockKey =
          typeof payload.clockKey === 'string' ? payload.clockKey : 'PROCESSING';
        if (!caseId) {
          continue;
        }
        switch (job.jobKind) {
          case WorkflowDurableJobKind.SLA_DEADLINE_EVALUATION:
            await this.slaClocks.evaluateBreach(caseId, clockKey);
            break;
          case WorkflowDurableJobKind.ESCALATION_EVALUATION:
            await this.escalation.evaluateAndEscalate(caseId, clockKey);
            break;
          case WorkflowDurableJobKind.REMINDER:
          case WorkflowDurableJobKind.TIMEOUT_ACTION:
          case WorkflowDurableJobKind.RENEWAL_SCHEDULE_HOOK:
            this.logger.debug(`No-op handler for ${job.jobKind} (${job.id})`);
            break;
          default: {
            const unknownKind: string = job.jobKind;
            this.logger.warn(`Unknown job kind ${unknownKind}`);
          }
        }

        await this.jobs.completeJob(job.id, job.leaseToken);
        processed += 1;
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        await this.jobs.failJob(job.id, job.leaseToken, err);
      }
    }

    return processed;
  }
}
