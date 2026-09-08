import { type INestApplication } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { type App } from 'supertest/types';

import { AppModule } from '../src/app.module';
import { configureApplication } from '../src/bootstrap/configure-application';
import { createRedisServiceMock, overrideRedisService } from './redis-test-utils';

describe('Readiness endpoints (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    const moduleBuilder = Test.createTestingModule({
      imports: [AppModule],
    });

    overrideRedisService(moduleBuilder);

    const moduleFixture: TestingModule = await moduleBuilder.compile();

    app = moduleFixture.createNestApplication({ bodyParser: false });
    configureApplication(app);
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('GET /api/v1/ready returns 200 when Redis is healthy', () => {
    return request(app.getHttpServer())
      .get('/api/v1/ready')
      .expect(200)
      .expect({
        status: 'ready',
        checks: {
          database: 'up',
          redis: 'up',
        },
      });
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

    await request(unhealthyApp.getHttpServer())
      .get('/api/v1/ready')
      .expect(503)
      .expect({
        status: 'not_ready',
        checks: {
          database: 'up',
          redis: 'down',
        },
      });

    await unhealthyApp.close();
  });
});
