import { type INestApplication } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { type App } from 'supertest/types';

import { AppModule } from '../src/app.module';
import { configureApplication } from '../src/bootstrap/configure-application';
import { createRedisServiceMock, overrideRedisService } from './redis-test-utils';

describe('Readiness endpoints (e2e)', () => {
  jest.setTimeout(60_000);

  async function createHealthyApp(): Promise<INestApplication<App>> {
    const moduleBuilder = Test.createTestingModule({
      imports: [AppModule],
    });
    overrideRedisService(moduleBuilder);
    const moduleFixture: TestingModule = await moduleBuilder.compile();
    const nestApp: INestApplication<App> = moduleFixture.createNestApplication({
      bodyParser: false,
    });
    configureApplication(nestApp);
    await nestApp.init();
    return nestApp;
  }

  it('GET /api/v1/ready returns 200 when Redis is healthy', async () => {
    const app = await createHealthyApp();
    try {
      await request(app.getHttpServer())
        .get('/api/v1/ready')
        .expect(200)
        .expect({
          status: 'ready',
          checks: {
            database: 'up',
            redis: 'up',
            identityAuth: 'ready',
          },
        });
    } finally {
      await app.close();
    }
  });

  it('GET /api/v1/ready returns 503 when Redis is unhealthy', async () => {
    const moduleBuilder = Test.createTestingModule({
      imports: [AppModule],
    });

    const redisServiceMock = createRedisServiceMock();
    redisServiceMock.ping.mockRejectedValue(new Error('Redis unavailable'));
    overrideRedisService(moduleBuilder, redisServiceMock);

    const moduleFixture: TestingModule = await moduleBuilder.compile();
    const unhealthyApp: INestApplication<App> = moduleFixture.createNestApplication({
      bodyParser: false,
    });
    configureApplication(unhealthyApp);
    await unhealthyApp.init();

    try {
      await request(unhealthyApp.getHttpServer())
        .get('/api/v1/ready')
        .expect(503)
        .expect({
          status: 'not_ready',
          checks: {
            database: 'up',
            redis: 'down',
            identityAuth: 'ready',
          },
        });
    } finally {
      await unhealthyApp.close();
    }
  });
});
