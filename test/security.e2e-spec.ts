import { Body, Controller, INestApplication, Post } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';

import { AppModule } from '../src/app.module';
import { configureApplication } from '../src/bootstrap/configure-application';

@Controller('security-test')
class SecurityTestController {
  @Post('echo')
  echo(@Body() body: Record<string, unknown>): Record<string, unknown> {
    return body;
  }
}

describe('Phase 1 security baseline (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    process.env.JSON_BODY_LIMIT = '1kb';

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
      controllers: [SecurityTestController],
    }).compile();

    app = moduleFixture.createNestApplication({ bodyParser: false });
    configureApplication(app);
    await app.init();
  });

  afterEach(async () => {
    delete process.env.JSON_BODY_LIMIT;
    await app.close();
  });

  it('sets secure HTTP headers', async () => {
    const response = await request(app.getHttpServer()).get('/api/v1/health');

    expect(response.headers['x-powered-by']).toBeUndefined();
    expect(response.headers['x-content-type-options']).toBe('nosniff');
    expect(response.headers['x-frame-options']).toBe('SAMEORIGIN');
  });

  it('applies configured CORS headers for allowed origins', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/health')
      .set('Origin', 'http://localhost:3000');

    expect(response.headers['access-control-allow-origin']).toBe('http://localhost:3000');
  });

  it('rejects request bodies above the configured limit', async () => {
    const oversizedPayload = { data: 'x'.repeat(2048) };

    await request(app.getHttpServer())
      .post('/api/v1/security-test/echo')
      .send(oversizedPayload)
      .expect(413);
  });
});
