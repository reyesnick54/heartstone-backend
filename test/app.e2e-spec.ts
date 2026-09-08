import { type INestApplication } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { type App } from 'supertest/types';

import { AppModule } from '../src/app.module';
import { configureApplication } from '../src/bootstrap/configure-application';
import { overrideRedisService } from './redis-test-utils';

describe('System endpoints (e2e)', () => {
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

  it('GET /api/v1/health returns alive status', async () => {
    const response = await request(app.getHttpServer()).get('/api/v1/health').expect(200);

    expect(response.body).toEqual({ status: 'ok' });
  });

  it('GET /api/v1/ready returns ready status', async () => {
    const response = await request(app.getHttpServer()).get('/api/v1/ready').expect(200);

    expect(response.body).toMatchObject({
      status: 'ready',
      checks: {
        database: 'up',
        redis: 'up',
      },
    });
  });

  it('GET /api/v1/version returns metadata', async () => {
    const response = await request(app.getHttpServer()).get('/api/v1/version').expect(200);

    expect(response.body).toMatchObject({
      name: expect.any(String) as string,
      apiVersion: expect.any(String) as string,
      environment: expect.any(String) as string,
    });
    expect(response.body).toHaveProperty('build');
  });
});
