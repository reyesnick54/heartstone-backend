import {
  ApplicantInformationRequestStatus,
  CaseEventType,
  CaseSlaClockStatus,
  CaseStatus,
  WorkflowDurableJobKind,
  WorkflowDurableJobStatus,
} from '@prisma/client';

import { type CaseEventsService } from '../../application-processing/cases/case-events.service';
import { type CaseCommunicationService } from '../../application-processing/cases/timeline/case-communication.service';
import { type PrismaService } from '../../database/prisma.service';
import { type RedisService } from '../../redis/redis.service';
import { WorkflowConditionEvaluatorService } from './branching/workflow-condition-evaluator.service';
import { ServerClockService } from './clock/server-clock.service';
import { GovernmentDecisionNumberService } from './decision/government-decision-number.service';
import { WorkflowEscalationService } from './escalation/workflow-escalation.service';
import { WorkflowDurableJobRunner } from './jobs/workflow-durable-job.runner';
import { WorkflowDurableJobService } from './jobs/workflow-durable-job.service';
import {
  PROTOCOL_SLA_RULE_CODES,
  PROTOCOL_TIME_STANDARD_MS,
} from './protocol/protocol-time-standards.constants';
import { RequestForInformationService } from './rfi/request-for-information.service';
import { SlaClockAuthorityService } from './sla/sla-clock-authority.service';
import { SlaStandardResolverService } from './sla/sla-standard-resolver.service';

describe('S12 workflow runtime', () => {
  const baseTime = new Date('2026-06-01T12:00:00.000Z').getTime();
  let nowMs = baseTime;

  const prisma = {
    caseSlaClock: {
      findUnique: jest.fn(),
      upsert: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    case: { findUnique: jest.fn() },
    caseEscalation: { findUnique: jest.fn(), create: jest.fn() },
    governmentServiceSlaRule: { findFirst: jest.fn(), findUnique: jest.fn() },
    governmentServiceEscalationLadder: { findUnique: jest.fn() },
    applicantInformationRequest: { create: jest.fn(), findUnique: jest.fn(), update: jest.fn() },
    workflowDurableJob: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      updateMany: jest.fn(),
      update: jest.fn(),
      findUniqueOrThrow: jest.fn(),
    },
    governmentDecisionNumberSequence: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  const caseEvents = { record: jest.fn().mockResolvedValue({}) };
  const communications = { create: jest.fn().mockResolvedValue({}) };

  beforeEach(() => {
    jest.clearAllMocks();
    nowMs = baseTime;
    prisma.$transaction.mockImplementation(async (fn: (tx: typeof prisma) => Promise<unknown>) =>
      fn(prisma),
    );
  });

  const buildModule = () => {
    const clock = new ServerClockService({ nowMs });
    const standards = new SlaStandardResolverService(prisma as unknown as PrismaService);
    const jobs = new WorkflowDurableJobService(
      prisma as unknown as PrismaService,
      { isConnected: () => false } as RedisService,
      clock,
    );
    const slaClocks = new SlaClockAuthorityService(
      prisma as unknown as PrismaService,
      clock,
      caseEvents as unknown as CaseEventsService,
      standards,
      jobs,
    );
    const escalation = new WorkflowEscalationService(
      prisma as unknown as PrismaService,
      clock,
      caseEvents as unknown as CaseEventsService,
      slaClocks,
    );
    const rfi = new RequestForInformationService(
      prisma as unknown as PrismaService,
      caseEvents as unknown as CaseEventsService,
      communications as unknown as CaseCommunicationService,
      slaClocks,
      standards,
    );
    const runner = new WorkflowDurableJobRunner(jobs, slaClocks, escalation);
    const decisionNumbers = new GovernmentDecisionNumberService(
      prisma as unknown as PrismaService,
      clock,
    );
    const conditionEvaluator = new WorkflowConditionEvaluatorService();

    return {
      clock,
      standards,
      jobs,
      slaClocks,
      escalation,
      rfi,
      runner,
      decisionNumbers,
      conditionEvaluator,
    };
  };

  it('resolves configured 72h, 24h, and 5-day standards', async () => {
    const { standards } = buildModule();
    prisma.governmentServiceSlaRule.findUnique.mockImplementation(
      (args: { where: { governmentServiceVersionId_ruleCode: { ruleCode: string } } }) => {
      const code = args.where.governmentServiceVersionId_ruleCode.ruleCode;
      const durations: Record<string, number> = {
        [PROTOCOL_SLA_RULE_CODES.INITIAL_RESPONSE_72H]: PROTOCOL_TIME_STANDARD_MS.HOURS_72,
        [PROTOCOL_SLA_RULE_CODES.URGENT_24H]: PROTOCOL_TIME_STANDARD_MS.HOURS_24,
        [PROTOCOL_SLA_RULE_CODES.SUBSTANTIVE_5D]: PROTOCOL_TIME_STANDARD_MS.DAYS_5,
      };
      const ms = durations[code];
      if (!ms) {
        return null;
      }
      return {
        ruleCode: code,
        label: code,
        targetDurationMs: ms,
        escalationLadderCode: null,
        pauseOnRfi: true,
        configuration: {},
      };
    },
    );

    const versionId = '00000000-0000-4000-8000-000000000001';
    const seventyTwo = await standards.resolveByRuleCode(
      versionId,
      PROTOCOL_SLA_RULE_CODES.INITIAL_RESPONSE_72H,
    );
    const twentyFour = await standards.resolveByRuleCode(
      versionId,
      PROTOCOL_SLA_RULE_CODES.URGENT_24H,
    );
    const fiveDay = await standards.resolveByRuleCode(
      versionId,
      PROTOCOL_SLA_RULE_CODES.SUBSTANTIVE_5D,
    );

    expect(seventyTwo?.targetDurationMs).toBe(PROTOCOL_TIME_STANDARD_MS.HOURS_72);
    expect(twentyFour?.targetDurationMs).toBe(PROTOCOL_TIME_STANDARD_MS.HOURS_24);
    expect(fiveDay?.targetDurationMs).toBe(PROTOCOL_TIME_STANDARD_MS.DAYS_5);
  });

  it('starts SLA clock with dueAt from configured standard', async () => {
    const { slaClocks } = buildModule();
    prisma.governmentServiceSlaRule.findFirst.mockResolvedValue({
      ruleCode: PROTOCOL_SLA_RULE_CODES.URGENT_24H,
      label: '24h',
      targetDurationMs: PROTOCOL_TIME_STANDARD_MS.HOURS_24,
      escalationLadderCode: null,
      pauseOnRfi: true,
      configuration: {},
    });
    prisma.caseSlaClock.upsert.mockResolvedValue({
      id: 'clock-1',
      clockKey: 'PROCESSING',
      dueAt: new Date(baseTime + PROTOCOL_TIME_STANDARD_MS.HOURS_24),
    });
    prisma.workflowDurableJob.create.mockResolvedValue({ id: 'job-1' });

    await slaClocks.startClockForCase('case-1', 'PROCESSING', 'version-1');

    expect(prisma.caseSlaClock.upsert).toHaveBeenCalled();
    expect(prisma.workflowDurableJob.create).toHaveBeenCalled();
    type CreateJobCall = [{ data: { jobKind: WorkflowDurableJobKind } }];
    const createCalls = prisma.workflowDurableJob.create.mock.calls as CreateJobCall[];
    const createArgs = createCalls[0];
    expect(createArgs).toBeDefined();
    expect(createArgs?.[0].data.jobKind).toBe(WorkflowDurableJobKind.SLA_DEADLINE_EVALUATION);
  });

  it('pauses and resumes SLA clock excluding paused duration', async () => {
    const startedAt = new Date(baseTime);
    const pauseAt = baseTime + 3600000;
    const resumeAt = baseTime + 3 * 3600000;

    const buildSla = (timeMs: number) => {
      const clock = new ServerClockService({ nowMs: timeMs });
      const standards = new SlaStandardResolverService(prisma as unknown as PrismaService);
      const jobs = new WorkflowDurableJobService(
        prisma as unknown as PrismaService,
        { isConnected: () => false } as RedisService,
        clock,
      );
      return new SlaClockAuthorityService(
        prisma as unknown as PrismaService,
        clock,
        caseEvents as unknown as CaseEventsService,
        standards,
        jobs,
      );
    };

    prisma.caseSlaClock.findUnique.mockResolvedValueOnce({
      id: 'clock-1',
      caseId: 'case-1',
      clockKey: 'PROCESSING',
      status: CaseSlaClockStatus.RUNNING,
      startedAt,
      pausedAt: null,
      pausedDurationMs: 0,
      targetDurationMs: PROTOCOL_TIME_STANDARD_MS.HOURS_24,
      dueAt: new Date(baseTime + PROTOCOL_TIME_STANDARD_MS.HOURS_24),
    });
    prisma.caseSlaClock.update.mockResolvedValue({});
    await buildSla(pauseAt).pauseClock('case-1', 'PROCESSING', 'RFI');

    prisma.caseSlaClock.findUnique.mockResolvedValueOnce({
      id: 'clock-1',
      caseId: 'case-1',
      clockKey: 'PROCESSING',
      status: CaseSlaClockStatus.PAUSED,
      startedAt,
      pausedAt: new Date(pauseAt),
      pausedDurationMs: 0,
      targetDurationMs: PROTOCOL_TIME_STANDARD_MS.HOURS_24,
      dueAt: new Date(baseTime + PROTOCOL_TIME_STANDARD_MS.HOURS_24),
    });
    prisma.workflowDurableJob.create.mockResolvedValue({ id: 'job-2' });
    await buildSla(resumeAt).resumeClock('case-1', 'PROCESSING');

    type UpdateClockCall = [{ data: { pausedDurationMs: number; status: CaseSlaClockStatus } }];
    const updateCalls = prisma.caseSlaClock.update.mock.calls as UpdateClockCall[];
    const lastUpdate = updateCalls.at(-1);
    expect(lastUpdate).toBeDefined();
    expect(lastUpdate?.[0].data.pausedDurationMs).toBe(2 * 3600000);
    expect(lastUpdate?.[0].data.status).toBe(CaseSlaClockStatus.RUNNING);
  });

  it('RFI pauses clock and authorized response resumes it', async () => {
    const { rfi } = buildModule();
    prisma.case.findUnique.mockResolvedValue({
      id: 'case-1',
      governmentServiceVersionId: 'version-1',
    });
    prisma.governmentServiceSlaRule.findFirst.mockResolvedValue({
      ruleCode: 'RULE',
      pauseOnRfi: true,
      targetDurationMs: PROTOCOL_TIME_STANDARD_MS.HOURS_72,
      configuration: {},
    });
    prisma.applicantInformationRequest.create.mockResolvedValue({
      id: 'rfi-1',
      caseId: 'case-1',
      pausedClockKey: 'PROCESSING',
      status: ApplicantInformationRequestStatus.ISSUED,
    });
    prisma.caseSlaClock.findUnique.mockResolvedValue({
      status: CaseSlaClockStatus.RUNNING,
      startedAt: new Date(baseTime),
      pausedDurationMs: 0,
      pausedAt: null,
      targetDurationMs: PROTOCOL_TIME_STANDARD_MS.HOURS_72,
      dueAt: new Date(baseTime + PROTOCOL_TIME_STANDARD_MS.HOURS_72),
    });
    prisma.caseSlaClock.update.mockResolvedValue({});

    await rfi.issueAuthorized({
      caseId: 'case-1',
      applicationSubmissionId: 'submission-1',
      requestedItems: [{ code: 'ID' }],
      instructions: 'Provide ID',
      issuedByIdentityId: 'official-1',
      functionAuthorityRecordId: 'far-1',
    });

    prisma.applicantInformationRequest.findUnique.mockResolvedValue({
      id: 'rfi-1',
      caseId: 'case-1',
      status: ApplicantInformationRequestStatus.ISSUED,
      pausedClockKey: 'PROCESSING',
    });
    prisma.applicantInformationRequest.update.mockResolvedValue({
      id: 'rfi-1',
      status: ApplicantInformationRequestStatus.RESPONDED,
    });
    prisma.caseSlaClock.findUnique.mockResolvedValue({
      status: CaseSlaClockStatus.PAUSED,
      startedAt: new Date(baseTime),
      pausedAt: new Date(baseTime + 1000),
      pausedDurationMs: 0,
      targetDurationMs: PROTOCOL_TIME_STANDARD_MS.HOURS_72,
      dueAt: new Date(baseTime + PROTOCOL_TIME_STANDARD_MS.HOURS_72),
    });

    await rfi.recordResponse({
      rfiId: 'rfi-1',
      actorIdentityId: 'applicant-1',
      satisfiesRequirements: true,
    });

    expect(prisma.caseSlaClock.update).toHaveBeenCalled();
  });

  it('evaluates deterministic workflow branch conditions from server state', () => {
    const { conditionEvaluator } = buildModule();
    const config = {
      version: 1,
      join: 'AND',
      rules: [{ field: 'step.outcome', op: 'EQ', value: 'APPROVED' }],
    };
    expect(
      conditionEvaluator.evaluate(config, {
        caseStatus: CaseStatus.SUBSTANTIVE_REVIEW,
        stepOutcome: 'APPROVED',
      }),
    ).toBe(true);
    expect(
      conditionEvaluator.evaluate(config, {
        caseStatus: CaseStatus.SUBSTANTIVE_REVIEW,
        stepOutcome: 'REJECTED',
      }),
    ).toBe(false);
  });

  it('deduplicates durable jobs by idempotency key', async () => {
    const { jobs } = buildModule();
    prisma.workflowDurableJob.create.mockRejectedValueOnce({ code: 'P2002' });
    prisma.workflowDurableJob.findUnique.mockResolvedValue({
      id: 'existing',
      idempotencyKey: 'sla-deadline:case-1:PROCESSING',
      status: WorkflowDurableJobStatus.PENDING,
    });

    const job = await jobs.scheduleSlaDeadlineEvaluation(
      'case-1',
      'PROCESSING',
      new Date(baseTime + 1000),
    );
    expect(job.id).toBe('existing');
  });

  it('allocates unique decision numbers via sequence table', async () => {
    const { decisionNumbers } = buildModule();
    prisma.governmentDecisionNumberSequence.findUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ year: 2026, nextValue: 2 });
    prisma.governmentDecisionNumberSequence.create.mockResolvedValue({ year: 2026, nextValue: 2 });
    prisma.governmentDecisionNumberSequence.update.mockResolvedValue({ year: 2026, nextValue: 3 });

    const first = await decisionNumbers.allocateNextDecisionNumber();
    const second = await decisionNumbers.allocateNextDecisionNumber();
    expect(first).not.toBe(second);
  });

  it('marks SLA breach and schedules escalation evaluation', async () => {
    const { slaClocks } = buildModule();
    prisma.caseSlaClock.findUnique.mockResolvedValue({
      caseId: 'case-1',
      clockKey: 'PROCESSING',
      status: CaseSlaClockStatus.RUNNING,
      startedAt: new Date(baseTime - PROTOCOL_TIME_STANDARD_MS.HOURS_72 - 1000),
      pausedDurationMs: 0,
      pausedAt: null,
      targetDurationMs: PROTOCOL_TIME_STANDARD_MS.HOURS_72,
      dueAt: new Date(baseTime - 1000),
    });
    prisma.caseSlaClock.update.mockResolvedValue({
      status: CaseSlaClockStatus.BREACHED,
    });
    prisma.workflowDurableJob.create.mockResolvedValue({ id: 'esc-job' });

    await slaClocks.evaluateBreach('case-1', 'PROCESSING');
    expect(caseEvents.record).toHaveBeenCalledWith(
      'case-1',
      CaseEventType.SLA_BREACHED,
      expect.any(Object),
    );
  });
});
