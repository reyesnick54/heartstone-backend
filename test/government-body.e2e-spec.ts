import { type INestApplication } from '@nestjs/common';
import request from 'supertest';
import { type App } from 'supertest/types';

import {
  createTestApp,
  GovernmentBodyType,
  RecordStatus,
  resetGovernmentStructureData,
  seedGovernmentStructure,
} from './government-structure-test-utils';

describe('GovernmentBody endpoints (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    app = await createTestApp();
  });

  beforeEach(async () => {
    await resetGovernmentStructureData(app);
  });

  afterAll(async () => {
    await app.close();
  });

  it('POST /api/v1/government-bodies creates a government body', async () => {
    const fixture = await seedGovernmentStructure(app);

    const response = await request(app.getHttpServer())
      .post('/api/v1/government-bodies')
      .send({
        institutionId: fixture.institutionAId,
        code: 'BOARD-01',
        name: 'Governing Board',
        description: 'Primary board',
        type: GovernmentBodyType.GOVERNING_BOARD,
      })
      .expect(201);

    expect(response.body).toMatchObject({
      institutionId: fixture.institutionAId,
      code: 'BOARD-01',
      name: 'Governing Board',
      description: 'Primary board',
      type: GovernmentBodyType.GOVERNING_BOARD,
      status: RecordStatus.ACTIVE,
    });
    expect(response.body).toHaveProperty('id');
    expect(response.body).toHaveProperty('createdAt');
    expect(response.body).toHaveProperty('updatedAt');
  });

  it('POST /api/v1/government-bodies rejects a nonexistent institution', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/government-bodies')
      .send({
        institutionId: 'missing-institution',
        code: 'BOARD-01',
        name: 'Governing Board',
        type: GovernmentBodyType.GOVERNING_BOARD,
      })
      .expect(400);
  });

  it('POST /api/v1/government-bodies rejects duplicate code within institution', async () => {
    const fixture = await seedGovernmentStructure(app);

    await request(app.getHttpServer())
      .post('/api/v1/government-bodies')
      .send({
        institutionId: fixture.institutionAId,
        code: 'BOARD-01',
        name: 'Governing Board',
        type: GovernmentBodyType.GOVERNING_BOARD,
      })
      .expect(201);

    await request(app.getHttpServer())
      .post('/api/v1/government-bodies')
      .send({
        institutionId: fixture.institutionAId,
        code: 'BOARD-01',
        name: 'Duplicate Board',
        type: GovernmentBodyType.COMMISSION,
      })
      .expect(409);
  });

  it('GET /api/v1/government-bodies supports institutionId, status, and type filters', async () => {
    const fixture = await seedGovernmentStructure(app);

    await request(app.getHttpServer())
      .post('/api/v1/government-bodies')
      .send({
        institutionId: fixture.institutionAId,
        code: 'BOARD-01',
        name: 'Governing Board',
        type: GovernmentBodyType.GOVERNING_BOARD,
        status: RecordStatus.INACTIVE,
      })
      .expect(201);

    const response = await request(app.getHttpServer())
      .get('/api/v1/government-bodies')
      .query({
        institutionId: fixture.institutionAId,
        status: RecordStatus.INACTIVE,
        type: GovernmentBodyType.GOVERNING_BOARD,
      })
      .expect(200);

    expect(response.body).toEqual([
      expect.objectContaining({
        code: 'BOARD-01',
        status: RecordStatus.INACTIVE,
        type: GovernmentBodyType.GOVERNING_BOARD,
      }),
    ]);
  });

  it('GET /api/v1/government-bodies/:id returns inactive records', async () => {
    const fixture = await seedGovernmentStructure(app);

    const createResponse = await request(app.getHttpServer())
      .post('/api/v1/government-bodies')
      .send({
        institutionId: fixture.institutionAId,
        code: 'BOARD-01',
        name: 'Governing Board',
        type: GovernmentBodyType.GOVERNING_BOARD,
        status: RecordStatus.INACTIVE,
      })
      .expect(201);

    const id = (createResponse.body as { id: string }).id;

    const response = await request(app.getHttpServer())
      .get(`/api/v1/government-bodies/${id}`)
      .expect(200);

    expect(response.body).toMatchObject({
      status: RecordStatus.INACTIVE,
    });
  });

  it('PATCH /api/v1/government-bodies/:id updates mutable fields', async () => {
    const fixture = await seedGovernmentStructure(app);

    const createResponse = await request(app.getHttpServer())
      .post('/api/v1/government-bodies')
      .send({
        institutionId: fixture.institutionAId,
        code: 'BOARD-01',
        name: 'Governing Board',
        type: GovernmentBodyType.GOVERNING_BOARD,
      })
      .expect(201);

    const id = (createResponse.body as { id: string }).id;

    const response = await request(app.getHttpServer())
      .patch(`/api/v1/government-bodies/${id}`)
      .send({
        name: 'Updated Board',
        type: GovernmentBodyType.COMMISSION,
        status: RecordStatus.SUSPENDED,
      })
      .expect(200);

    expect(response.body).toMatchObject({
      institutionId: fixture.institutionAId,
      name: 'Updated Board',
      type: GovernmentBodyType.COMMISSION,
      status: RecordStatus.SUSPENDED,
    });
  });
});
