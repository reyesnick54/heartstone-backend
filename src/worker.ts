import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';

import { AppModule } from './app.module';
import { PrismaService } from './database/prisma.service';
import { OperationalJobRunnerService } from './instruments/lifecycle/instrument-renewal-monitoring.service';
import { OPERATIONAL_JOB_CODES } from './operational-lifecycle/operational-lifecycle.constants';
import { WorkflowDurableJobRunner } from './remediation/s12/jobs/workflow-durable-job.runner';

/**
 * Background worker: runs the same image as the API with `node dist/worker.js`.
 *
 * - Workflow jobs (SLA deadlines, escalations) are claimed with leases, so several workers
 *   can run safely.
 * - Interval jobs (renewal reminders) run under a PostgreSQL advisory lock so only one worker
 *   executes them at a time.
 *
 * Jobs only record and notify. No job approves, issues or decides anything.
 */
const POLL_INTERVAL_MS = Number(process.env.WORKER_POLL_INTERVAL_MS ?? 30_000);
const WORKFLOW_BATCH_SIZE = Number(process.env.WORKER_WORKFLOW_BATCH_SIZE ?? 50);
const RENEWAL_REMINDER_INTERVAL_MS = Number(
  process.env.WORKER_RENEWAL_REMINDER_INTERVAL_MS ?? 60 * 60 * 1000,
);
/** Arbitrary constant identifying the interval-job lock across workers. */
const INTERVAL_JOBS_ADVISORY_LOCK_KEY = 74_210_031;

async function bootstrap(): Promise<void> {
  const logger = new Logger('Worker');
  const app = await NestFactory.createApplicationContext(AppModule, { bufferLogs: false });
  app.enableShutdownHooks();

  const prisma = app.get(PrismaService);
  const workflowRunner = app.get(WorkflowDurableJobRunner);
  const intervalJobs = app.get(OperationalJobRunnerService);

  await ensureIntervalJobDefinitions(prisma);

  const state = { stopping: false };
  let wake: (() => void) | undefined;
  const stop = (signal: string) => {
    logger.log(`${signal} received; finishing current tick`);
    state.stopping = true;
    wake?.();
  };
  process.once('SIGTERM', () => {
    stop('SIGTERM');
  });
  process.once('SIGINT', () => {
    stop('SIGINT');
  });

  logger.log(`Worker started; polling every ${String(POLL_INTERVAL_MS)} ms`);

  while (!state.stopping) {
    await tick(prisma, workflowRunner, intervalJobs, logger);
    await new Promise<void>((resolve) => {
      const timer = setTimeout(resolve, POLL_INTERVAL_MS);
      wake = () => {
        clearTimeout(timer);
        resolve();
      };
    });
  }

  await app.close();
  logger.log('Worker stopped');
}

async function tick(
  prisma: PrismaService,
  workflowRunner: WorkflowDurableJobRunner,
  intervalJobs: OperationalJobRunnerService,
  logger: Logger,
): Promise<void> {
  try {
    let processed = 0;
    // Drain due workflow jobs in batches, bounded so one tick cannot run forever.
    for (let batch = 0; batch < 20; batch += 1) {
      const count = await workflowRunner.processDueJobs(WORKFLOW_BATCH_SIZE);
      processed += count;
      if (count < WORKFLOW_BATCH_SIZE) {
        break;
      }
    }
    if (processed > 0) {
      logger.log(`Processed ${String(processed)} workflow jobs`);
    }
  } catch (error) {
    logger.error(`Workflow job processing failed: ${describe(error)}`);
  }

  try {
    // A transaction-scoped lock is released when this transaction ends, on the same pooled
    // connection that took it. The transaction itself holds no job writes.
    await prisma.$transaction(
      async (tx) => {
        const rows = await tx.$queryRaw<{ locked: boolean }[]>`
          SELECT pg_try_advisory_xact_lock(${INTERVAL_JOBS_ADVISORY_LOCK_KEY}) AS locked`;
        if (!rows.some((row) => row.locked)) {
          return;
        }
        const results = await intervalJobs.runDueJobs(new Date());
        for (const result of results) {
          logger.log(`${result.jobCode}: ${result.status} ${result.summary ?? result.error ?? ''}`);
        }
      },
      { timeout: 10 * 60 * 1000, maxWait: 10_000 },
    );
  } catch (error) {
    logger.error(`Interval job processing failed: ${describe(error)}`);
  }
}

/** Registers known interval jobs if missing; never overwrites an administrator's settings. */
async function ensureIntervalJobDefinitions(prisma: PrismaService): Promise<void> {
  await prisma.operationalJobDefinition.upsert({
    where: { jobCode: OPERATIONAL_JOB_CODES.INSTRUMENT_RENEWAL_REMINDERS },
    create: {
      jobCode: OPERATIONAL_JOB_CODES.INSTRUMENT_RENEWAL_REMINDERS,
      description: 'Send renewal reminders for instruments approaching expiry',
      intervalMs: RENEWAL_REMINDER_INTERVAL_MS,
      enabled: true,
    },
    update: {},
  });
}

function describe(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

void bootstrap();
