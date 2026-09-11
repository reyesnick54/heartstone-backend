import { ConfigModule } from '@nestjs/config';
import { Test, type TestingModule } from '@nestjs/testing';
import {
  AppointmentStatus,
  AuthorityEvaluationResult,
  AuthorityFunctionStatus,
  AuthorityRevalidationState,
  AuthorityRevalidationTrigger,
  DelegationStatus,
  IdentityOfficeholderLinkStatus,
  IdentityType,
  SecurityAuditEventType,
} from '@prisma/client';

import { resetAllTestData } from '../../test/helpers/integration-app';
import appConfig from '../config/app.config';
import identityConfig from '../config/identity.config';
import redisConfig from '../config/redis.config';
import securityConfig from '../config/security.config';
import { DatabaseModule } from '../database/database.module';
import { PrismaService } from '../database/prisma.service';
import { GovernmentModule } from '../government/government.module';
import { IdentityModule } from '../identity/identity.module';
import { RedisService } from '../redis/redis.service';
import { AuthorityModule } from './authority.module';
import { AuthorityCacheService } from './cache/authority-cache.service';
import { AuthorityReasonCode, AuthorityReplayMode } from './common/authority.constants';
import { AuthorityEvaluationService } from './evaluation/authority-evaluation.service';
import { AuthorityEvaluationRecordRepository } from './evaluation/authority-evaluation-record.repository';
import { AuthorityExplanationService } from './explanation/authority-explanation.service';
import { AuthorityRegistryService } from './registry/authority-registry.service';
import { AuthorityReplayService } from './replay/authority-replay.service';
import { AuthorityRevalidationService } from './revalidation/authority-revalidation.service';

describe('Phase 4G authority explainability, replay, safe halt, and revalidation', () => {
  let moduleRef: TestingModule;
  let prisma: PrismaService;
  let registry: AuthorityRegistryService;
  let evaluation: AuthorityEvaluationService;
  let explanation: AuthorityExplanationService;
  let replay: AuthorityReplayService;
  let revalidation: AuthorityRevalidationService;
  let records: AuthorityEvaluationRecordRepository;
  let cache: AuthorityCacheService;
  let redisService: RedisService;

  beforeAll(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          load: [appConfig, redisConfig, securityConfig, identityConfig],
        }),
        DatabaseModule,
        GovernmentModule,
        IdentityModule,
        AuthorityModule,
      ],
    }).compile();

    prisma = moduleRef.get(PrismaService);
    registry = moduleRef.get(AuthorityRegistryService);
    evaluation = moduleRef.get(AuthorityEvaluationService);
    explanation = moduleRef.get(AuthorityExplanationService);
    replay = moduleRef.get(AuthorityReplayService);
    revalidation = moduleRef.get(AuthorityRevalidationService);
    records = moduleRef.get(AuthorityEvaluationRecordRepository);
    cache = moduleRef.get(AuthorityCacheService);
    redisService = moduleRef.get(RedisService);
  });

  beforeEach(async () => {
    await resetAllTestData(prisma);
  });

  afterAll(async () => {
    await moduleRef.close();
  });

  async function seedGovernmentStructure() {
    const jurisdiction = await prisma.jurisdiction.create({
      data: {
        code: 'AG',
        name: 'Antigua and Barbuda',
        type: 'NATIONAL',
      },
    });

    const institution = await prisma.institution.create({
      data: {
        jurisdictionId: jurisdiction.id,
        code: 'FIN-MIN',
        name: 'Ministry of Finance',
        type: 'MINISTRY',
      },
    });

    const department = await prisma.department.create({
      data: {
        institutionId: institution.id,
        code: 'REV',
        name: 'Revenue Department',
      },
    });

    const office = await prisma.office.create({
      data: {
        departmentId: department.id,
        code: 'DIR-REV',
        name: 'Director of Revenue',
      },
    });

    const officeholder = await prisma.officeholder.create({
      data: {
        code: 'OH-DIR-REV',
        name: 'Director Holder',
      },
    });

    return { jurisdiction, institution, department, office, officeholder };
  }

  async function seedAuthorityFixtures() {
    const structure = await seedGovernmentStructure();

    const fn = await registry.createFunction({
      code: 'APPROVE-LICENSE',
      name: 'Approve License',
    });
    await registry.activateFunction(fn.id);

    const source = await registry.createGoverningSource({
      code: 'LIC-ACT-2020',
      version: '1.0.0',
      name: 'Licensing Act 2020',
      authenticated: true,
    });

    const assignment = await registry.createAssignment({
      functionId: fn.id,
      governingSourceId: source.id,
      officeholderId: structure.officeholder.id,
      officeId: structure.office.id,
    });

    const appointment = await prisma.appointment.create({
      data: {
        officeId: structure.office.id,
        officeholderId: structure.officeholder.id,
        status: AppointmentStatus.ACTIVE,
        effectiveFrom: new Date('2020-01-01'),
      },
    });

    const identity = await prisma.identity.create({
      data: {
        type: IdentityType.INDIVIDUAL,
        displayName: 'Director Identity',
      },
    });

    await prisma.identityOfficeholderLink.create({
      data: {
        identityId: identity.id,
        officeholderId: structure.officeholder.id,
        status: IdentityOfficeholderLinkStatus.ACTIVE,
      },
    });

    return {
      ...structure,
      fn,
      source,
      assignment,
      appointment,
      identity,
    };
  }

  it('preserves historical evaluation for reconstruction', async () => {
    const fixtures = await seedAuthorityFixtures();
    const evaluatedAt = new Date('2024-06-01T12:00:00.000Z');

    const outcome = await evaluation.evaluate({
      actorIdentityId: fixtures.identity.id,
      officeholderId: fixtures.officeholder.id,
      functionCode: fixtures.fn.code,
      requestedAction: 'approve',
      assignmentId: fixtures.assignment.id,
      appointmentId: fixtures.appointment.id,
      correlationId: 'corr-hist-1',
      evaluatedAt,
    });

    const record = await records.findById(outcome.recordId);
    expect(record.result).toBe(AuthorityEvaluationResult.ALLOWED);
    expect(record.evaluatedAt.toISOString()).toBe(evaluatedAt.toISOString());
    expect(record.reasonCodes).toContain(AuthorityReasonCode.ALL_CONDITIONS_SATISFIED);
    expect(record.replaySnapshot).toMatchObject({
      functionCode: fixtures.fn.code,
      requestedAction: 'approve',
      result: AuthorityEvaluationResult.ALLOWED,
    });
  });

  it('allows current reevaluation to differ from historical result', async () => {
    const fixtures = await seedAuthorityFixtures();
    const historical = await evaluation.evaluate({
      actorIdentityId: fixtures.identity.id,
      officeholderId: fixtures.officeholder.id,
      functionCode: fixtures.fn.code,
      requestedAction: 'approve',
      assignmentId: fixtures.assignment.id,
      appointmentId: fixtures.appointment.id,
      evaluatedAt: new Date('2024-01-01'),
    });

    await prisma.authorityFunction.update({
      where: { id: fixtures.fn.id },
      data: { status: AuthorityFunctionStatus.SUSPENDED },
    });

    const replayOutcome = await replay.replay(
      historical.recordId,
      AuthorityReplayMode.CURRENT_REEVALUATION,
    );

    expect(replayOutcome.historicalResult).toBe(AuthorityEvaluationResult.ALLOWED);
    expect(replayOutcome.replayResult).toBe(AuthorityEvaluationResult.SAFE_HALT);
    expect(replayOutcome.differsFromHistorical).toBe(true);
  });

  it('returns historical replay without silently rerunning against current data', async () => {
    const fixtures = await seedAuthorityFixtures();
    const historical = await evaluation.evaluate({
      officeholderId: fixtures.officeholder.id,
      functionCode: fixtures.fn.code,
      requestedAction: 'approve',
      assignmentId: fixtures.assignment.id,
      appointmentId: fixtures.appointment.id,
      evaluatedAt: new Date('2024-01-01'),
    });

    await prisma.authorityFunction.update({
      where: { id: fixtures.fn.id },
      data: { status: AuthorityFunctionStatus.SUSPENDED },
    });

    const replayOutcome = await replay.replay(
      historical.recordId,
      AuthorityReplayMode.HISTORICAL_REPLAY,
    );

    expect(replayOutcome.replayResult).toBe(AuthorityEvaluationResult.ALLOWED);
    expect(replayOutcome.differsFromHistorical).toBe(false);
    expect(replayOutcome.governingSourcesConsidered[0]?.code).toBe('LIC-ACT-2020');
  });

  it('triggers revalidation when delegation expires', async () => {
    const fixtures = await seedAuthorityFixtures();
    const delegation = await prisma.delegation.create({
      data: {
        institutionId: fixtures.institution.id,
        delegatorOfficeholderId: fixtures.officeholder.id,
        recipientOfficeholderId: fixtures.officeholder.id,
        scopeDescription: 'License approval delegation',
        status: DelegationStatus.ACTIVE,
        effectiveFrom: new Date('2023-01-01'),
        effectiveUntil: new Date('2023-12-31'),
      },
    });

    const outcome = await evaluation.evaluate({
      officeholderId: fixtures.officeholder.id,
      functionCode: fixtures.fn.code,
      requestedAction: 'approve',
      assignmentId: fixtures.assignment.id,
      appointmentId: fixtures.appointment.id,
      delegationId: delegation.id,
      evaluatedAt: new Date('2023-06-01'),
    });

    await revalidation.onDelegationExpired(delegation.id);

    const pending = await revalidation.findPendingRevalidations();
    expect(pending.some((item) => item.trigger === AuthorityRevalidationTrigger.DELEGATION_CHANGE)).toBe(
      true,
    );

    const updatedAssignment = await prisma.authorityAssignment.findUnique({
      where: { id: fixtures.assignment.id },
    });
    expect(updatedAssignment?.revalidationState).toBe(AuthorityRevalidationState.REQUIRES_REVALIDATION);

    const auditEvents = await prisma.securityAuditEvent.findMany({
      where: { eventType: SecurityAuditEventType.AUTHORITY_REVALIDATION_TRIGGERED },
    });
    expect(auditEvents.length).toBeGreaterThan(0);
    expect(outcome.recordId).toBeTruthy();
  });

  it('triggers revalidation when governing source is amended', async () => {
    const fixtures = await seedAuthorityFixtures();
    await registry.amendGoverningSource(fixtures.source.id);
    await revalidation.onSourceAmended(fixtures.source.id, 'Section 12 amended');

    const assignment = await prisma.authorityAssignment.findUnique({
      where: { id: fixtures.assignment.id },
    });
    expect(assignment?.revalidationState).toBe(AuthorityRevalidationState.REQUIRES_REVALIDATION);

    const pending = await revalidation.findPendingRevalidations();
    expect(pending.some((item) => item.trigger === AuthorityRevalidationTrigger.SOURCE_AMENDMENT)).toBe(
      true,
    );
  });

  it('invalidates prior operational ability after function suspension', async () => {
    const fixtures = await seedAuthorityFixtures();

    const allowed = await evaluation.evaluate({
      officeholderId: fixtures.officeholder.id,
      functionCode: fixtures.fn.code,
      requestedAction: 'approve',
      assignmentId: fixtures.assignment.id,
      appointmentId: fixtures.appointment.id,
    });
    expect(allowed.result).toBe(AuthorityEvaluationResult.ALLOWED);

    await revalidation.onFunctionSuspended(fixtures.fn.id);

    const blocked = await evaluation.evaluate({
      officeholderId: fixtures.officeholder.id,
      functionCode: fixtures.fn.code,
      requestedAction: 'approve',
      assignmentId: fixtures.assignment.id,
      appointmentId: fixtures.appointment.id,
    });

    expect(blocked.result).toBe(AuthorityEvaluationResult.SAFE_HALT);
    expect(blocked.reasonCodes).toContain(AuthorityReasonCode.FUNCTION_SUSPENDED);
  });

  it('operates safe-halt conditions stronger than ordinary not authorized', async () => {
    const fixtures = await seedAuthorityFixtures();
    await prisma.authorityGoverningSource.update({
      where: { id: fixtures.source.id },
      data: { authenticatedAt: null },
    });

    const outcome = await evaluation.evaluate({
      officeholderId: fixtures.officeholder.id,
      functionCode: fixtures.fn.code,
      requestedAction: 'approve',
      assignmentId: fixtures.assignment.id,
      appointmentId: fixtures.appointment.id,
    });

    expect(outcome.result).toBe(AuthorityEvaluationResult.SAFE_HALT);
    expect(outcome.result).not.toBe(AuthorityEvaluationResult.NOT_AUTHORIZED);
    expect(outcome.reasonCodes).toContain(AuthorityReasonCode.SOURCE_NOT_AUTHENTICATED);

    const auditEvents = await prisma.securityAuditEvent.findMany({
      where: { eventType: SecurityAuditEventType.AUTHORITY_SAFE_HALT_TRIGGERED },
    });
    expect(auditEvents.length).toBeGreaterThan(0);
  });

  it('prevents destructive overwrite of historical evaluation records', async () => {
    const fixtures = await seedAuthorityFixtures();
    const outcome = await evaluation.evaluate({
      officeholderId: fixtures.officeholder.id,
      functionCode: fixtures.fn.code,
      requestedAction: 'approve',
      assignmentId: fixtures.assignment.id,
      appointmentId: fixtures.appointment.id,
    });

    expect(() => records.update()).toThrow(
      'Authority evaluation records are append-only and cannot be updated',
    );
    expect(() => records.delete()).toThrow(
      'Authority evaluation records are append-only and cannot be deleted',
    );

    const preserved = await records.findById(outcome.recordId);
    expect(preserved.result).toBe(AuthorityEvaluationResult.ALLOWED);
  });

  it('matches reason codes and explanations to evaluation facts', async () => {
    const fixtures = await seedAuthorityFixtures();
    await prisma.authorityAssignment.update({
      where: { id: fixtures.assignment.id },
      data: { revalidationState: AuthorityRevalidationState.REQUIRES_REVALIDATION },
    });

    const outcome = await evaluation.evaluate({
      officeholderId: fixtures.officeholder.id,
      functionCode: fixtures.fn.code,
      requestedAction: 'approve',
      assignmentId: fixtures.assignment.id,
      appointmentId: fixtures.appointment.id,
    });

    expect(outcome.reasonCodes).toContain(AuthorityReasonCode.ASSIGNMENT_REQUIRES_REVALIDATION);
    expect(outcome.result).toBe(AuthorityEvaluationResult.NOT_AUTHORIZED);

    const structured = await explanation.explainEvaluation(outcome.recordId);
    expect(structured.result).toBe(AuthorityEvaluationResult.NOT_AUTHORIZED);
    expect(
      structured.items.some(
        (item) =>
          item.code === 'ASSIGNMENT_REQUIRES_REVALIDATION' &&
          item.statement.includes('ASSIGNMENT_REQUIRES_REVALIDATION'),
      ),
    ).toBe(true);
  });

  it('redacts secret values from evaluation and audit records', async () => {
    const fixtures = await seedAuthorityFixtures();
    const outcome = await evaluation.evaluate({
      actorIdentityId: fixtures.identity.id,
      officeholderId: fixtures.officeholder.id,
      functionCode: fixtures.fn.code,
      requestedAction: 'approve',
      assignmentId: fixtures.assignment.id,
      appointmentId: fixtures.appointment.id,
      contextReference: JSON.stringify({
        token: 'super-secret-token',
        secretHash: 'hashed-secret',
        officeholderId: fixtures.officeholder.id,
      }),
    });

    const record = await records.findById(outcome.recordId);
    const serialized = JSON.stringify(record);
    expect(serialized).not.toContain('super-secret-token');
    expect(serialized).not.toContain('hashed-secret');

    const auditEvents = await prisma.securityAuditEvent.findMany({
      where: { eventType: SecurityAuditEventType.AUTHORITY_EVALUATION_PERFORMED },
    });
    expect(JSON.stringify(auditEvents)).not.toContain('super-secret-token');
  });

  it('does not serve stale cached allow decisions after suspension', async () => {
    const fixtures = await seedAuthorityFixtures();
    const request = {
      officeholderId: fixtures.officeholder.id,
      functionCode: fixtures.fn.code,
      requestedAction: 'approve',
      assignmentId: fixtures.assignment.id,
      appointmentId: fixtures.appointment.id,
    };

    const redisStore = new Map<string, string>();
    const mockRedis = {
      get: jest.fn((key: string) => Promise.resolve(redisStore.get(key) ?? null)),
      setex: jest.fn((key: string, _ttl: number, value: string) => {
        redisStore.set(key, value);
        return Promise.resolve(undefined);
      }),
      keys: jest.fn((pattern: string) => {
        const prefix = pattern.replace('*', '');
        return Promise.resolve([...redisStore.keys()].filter((key) => key.startsWith(prefix)));
      }),
      del: jest.fn((...keys: string[]) => {
        keys.forEach((key) => redisStore.delete(key));
        return Promise.resolve(undefined);
      }),
    };

    jest.spyOn(redisService, 'getClient').mockReturnValue(mockRedis as never);

    const first = await cache.evaluateWithCache(request);
    expect(first.result).toBe(AuthorityEvaluationResult.ALLOWED);
    expect(first.fromCache).toBe(false);

    const cached = await cache.evaluateWithCache(request);
    expect(cached.fromCache).toBe(true);

    await revalidation.onFunctionSuspended(fixtures.fn.id);
    await cache.invalidateForFunction(fixtures.fn.code);

    const afterInvalidation = await cache.evaluateWithCache(request);
    expect(afterInvalidation.fromCache).toBe(false);
    expect(afterInvalidation.result).toBe(AuthorityEvaluationResult.SAFE_HALT);
  });
});
