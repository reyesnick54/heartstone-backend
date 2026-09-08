import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import {
  createRedisServiceMock,
  overrideRedisService,
} from './redis-test-utils';

describe('HealthController (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    const moduleBuilder = Test.createTestingModule({
      imports: [AppModule],
    });

    overrideRedisService(moduleBuilder);

    const moduleFixture: TestingModule = await moduleBuilder.compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('/ready (GET) returns 200 when Redis is healthy', () => {
    return request(app.getHttpServer())
      .get('/ready')
      .expect(200)
      .expect({
        status: 'ok',
        checks: {
          redis: 'up',
        },
      });
  });

  it('/ready (GET) returns 503 when Redis is unhealthy', async () => {
    const moduleBuilder = Test.createTestingModule({
      imports: [AppModule],
    });

    const redisServiceMock = createRedisServiceMock();
    redisServiceMock.ping.mockRejectedValue(new Error('Redis unavailable'));
    overrideRedisService(moduleBuilder, redisServiceMock);

    const moduleFixture: TestingModule = await moduleBuilder.compile();
    const unhealthyApp: INestApplication<App> =
      moduleFixture.createNestApplication();
    await unhealthyApp.init();

    await request(unhealthyApp.getHttpServer())
      .get('/ready')
      .expect(503)
      .expect({
        status: 'error',
        checks: {
          redis: 'down',
        },
      });

    await unhealthyApp.close();
  });
});
