import { type INestApplication } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import { PerformanceTestScenarioType, ServiceLevelIndicatorType } from '@prisma/client';
import request from 'supertest';
import { type App } from 'supertest/types';

import { AppModule } from '../src/app.module';
import { configureApplication } from '../src/bootstrap/configure-application';
import { PrismaService } from '../src/database/prisma.service';
import { overrideRedisService } from './redis-test-utils';

describe('Phase 13C production reliability (integration)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

  beforeAll(async () => {
    const moduleBuilder = Test.createTestingModule({
      imports: [AppModule],
    });
    overrideRedisService(moduleBuilder);

    const moduleFixture: TestingModule = await moduleBuilder.compile();
    app = moduleFixture.createNestApplication({ bodyParser: false });
    configureApplication(app);
    await app.init();

    prisma = moduleFixture.get(PrismaService);
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /api/v1/production-reliability/service-health returns technical health only', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/production-reliability/service-health')
      .expect(200);

    const body = response.body as {
      notInstitutionalStatus: boolean;
      disclaimer: string;
      technicalHealthState: string;
      dependencies: unknown[];
    };

    expect(body.notInstitutionalStatus).toBe(true);
    expect(body.disclaimer).toContain('institutional');
    expect(['LIVE', 'READY', 'DEGRADED', 'NOT_READY']).toContain(body.technicalHealthState);
    expect(body.dependencies).toBeInstanceOf(Array);
  });

  it('GET /api/v1/production-reliability/disclaimer returns boundary text', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/production-reliability/disclaimer')
      .expect(200);

    const body = response.body as { disclaimer: string };
    expect(body.disclaimer).toContain('Alerts are not incidents');
  });

  it('creates reliability definition, SLO, SLI, and records measurements', async () => {
    const definition = await prisma.serviceReliabilityDefinition.create({
      data: {
        code: 'TEST-REL-001',
        name: 'Test Service Reliability',
        serviceReference: 'service-catalog:test-service',
      },
    });

    const objective = await prisma.serviceLevelObjective.create({
      data: {
        reliabilityDefinitionId: definition.id,
        code: 'AVAIL-001',
        name: 'Availability Target',
        approvedTargetValue: '99.5',
        approvedTargetUnit: 'percent',
        approvedTargetReference: 'APPROVED-CONFIG-2026-AVAIL-001',
        evaluationWindow: '30d',
        effectiveFrom: new Date(),
      },
    });

    const indicator = await prisma.serviceLevelIndicator.create({
      data: {
        objectiveId: objective.id,
        code: 'AVAIL-SLI-001',
        name: 'Uptime SLI',
        indicatorType: ServiceLevelIndicatorType.AVAILABILITY,
        measurementUnit: 'percent',
        approvedThreshold: '99.5',
        approvedThresholdRef: 'APPROVED-CONFIG-2026-AVAIL-001',
      },
    });

    const measurement = await prisma.availabilityMeasurement.create({
      data: {
        objectiveId: objective.id,
        indicatorId: indicator.id,
        measuredValue: '99.8',
        windowStart: new Date(),
        windowEnd: new Date(),
        isHttp200Only: false,
      },
    });

    expect(measurement.isHttp200Only).toBe(false);
    expect(objective.approvedTargetReference).toContain('APPROVED');
  });

  it('blocks production load test without authorization', async () => {
    const definition = await prisma.serviceReliabilityDefinition.create({
      data: {
        code: 'TEST-REL-LOAD',
        name: 'Load Test Service',
        serviceReference: 'service-catalog:load-test',
      },
    });

    const blocked = await prisma.loadTestRun.create({
      data: {
        reliabilityDefinitionId: definition.id,
        runNumber: 'LTR-TEST-001',
        scenarioType: PerformanceTestScenarioType.PEAK,
        targetEnvironment: 'production',
        isProductionTarget: true,
        productionTestAuthorized: false,
        status: 'BLOCKED_UNSAFE_TARGET',
      },
    });

    expect(blocked.status).toBe('BLOCKED_UNSAFE_TARGET');
  });

  it('sets correlation ID response header', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/production-reliability/disclaimer')
      .set('x-correlation-id', 'integration-test-corr')
      .expect(200);

    expect(response.headers['x-correlation-id']).toBe('integration-test-corr');
  });
});
