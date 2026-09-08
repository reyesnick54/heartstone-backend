import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { AllExceptionsFilter } from '../src/common/filters/all-exceptions.filter';

describe('System endpoints (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    app.useGlobalFilters(new AllExceptionsFilter());
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('GET /api/v1/health returns alive status', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/health')
      .expect(200);

    expect(response.body).toEqual({ status: 'ok' });
  });

  it('GET /api/v1/ready returns ready status', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/ready')
      .expect(200);

    expect(response.body).toEqual({ status: 'ready' });
  });

  it('GET /api/v1/version returns metadata', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/version')
      .expect(200);

    expect(response.body).toMatchObject({
      name: expect.any(String) as string,
      apiVersion: expect.any(String) as string,
      environment: expect.any(String) as string,
    });
    expect(response.body).toHaveProperty('build');
  });
});
