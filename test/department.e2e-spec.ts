import { type INestApplication } from '@nestjs/common';
import request from 'supertest';
import { type App } from 'supertest/types';

import {
  createTestApp,
  RecordStatus,
  resetGovernmentStructureData,
  seedGovernmentStructure,
} from './government-structure-test-utils';

describe('Department endpoints (e2e)', () => {
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

  it('POST /api/v1/departments creates a department', async () => {
    const fixture = await seedGovernmentStructure(app);

    const response = await request(app.getHttpServer())
      .post('/api/v1/departments')
      .send({
        institutionId: fixture.institutionAId,
        code: 'FIN-OPS',
        name: 'Financial Operations',
        description: 'Finance unit',
      })
      .expect(201);

    expect(response.body).toMatchObject({
      institutionId: fixture.institutionAId,
      code: 'FIN-OPS',
      name: 'Financial Operations',
      description: 'Finance unit',
      status: RecordStatus.ACTIVE,
    });
    expect(response.body).toHaveProperty('id');
    expect(response.body).toHaveProperty('createdAt');
    expect(response.body).toHaveProperty('updatedAt');
  });

  it('POST /api/v1/departments rejects a nonexistent institution', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/departments')
      .send({
        institutionId: 'missing-institution',
        code: 'FIN-OPS',
        name: 'Financial Operations',
      })
      .expect(400);
  });

  it('POST /api/v1/departments rejects duplicate code within institution', async () => {
    const fixture = await seedGovernmentStructure(app);

    await request(app.getHttpServer())
      .post('/api/v1/departments')
      .send({
        institutionId: fixture.institutionAId,
        code: 'FIN-OPS',
        name: 'Financial Operations',
      })
      .expect(201);

    await request(app.getHttpServer())
      .post('/api/v1/departments')
      .send({
        institutionId: fixture.institutionAId,
        code: 'FIN-OPS',
        name: 'Duplicate Department',
      })
      .expect(409);
  });

  it('GET /api/v1/departments supports institutionId and status filters', async () => {
    const fixture = await seedGovernmentStructure(app);

    await request(app.getHttpServer())
      .post('/api/v1/departments')
      .send({
        institutionId: fixture.institutionAId,
        code: 'FIN-OPS',
        name: 'Financial Operations',
        status: RecordStatus.INACTIVE,
      })
      .expect(201);

    const response = await request(app.getHttpServer())
      .get('/api/v1/departments')
      .query({
        institutionId: fixture.institutionAId,
        status: RecordStatus.INACTIVE,
      })
      .expect(200);

    expect(response.body).toEqual([
      expect.objectContaining({
        code: 'FIN-OPS',
        status: RecordStatus.INACTIVE,
      }),
    ]);
  });

  it('GET /api/v1/departments/:id returns inactive records', async () => {
    const fixture = await seedGovernmentStructure(app);

    const createResponse = await request(app.getHttpServer())
      .post('/api/v1/departments')
      .send({
        institutionId: fixture.institutionAId,
        code: 'FIN-OPS',
        name: 'Financial Operations',
        status: RecordStatus.INACTIVE,
      })
      .expect(201);

    const id = (createResponse.body as { id: string }).id;

    const response = await request(app.getHttpServer())
      .get(`/api/v1/departments/${id}`)
      .expect(200);

    expect(response.body).toMatchObject({
      status: RecordStatus.INACTIVE,
    });
  });

  it('PATCH /api/v1/departments/:id updates mutable fields', async () => {
    const fixture = await seedGovernmentStructure(app);

    const createResponse = await request(app.getHttpServer())
      .post('/api/v1/departments')
      .send({
        institutionId: fixture.institutionAId,
        code: 'FIN-OPS',
        name: 'Financial Operations',
      })
      .expect(201);

    const id = (createResponse.body as { id: string }).id;

    const response = await request(app.getHttpServer())
      .patch(`/api/v1/departments/${id}`)
      .send({
        name: 'Updated Department',
        status: RecordStatus.HISTORICAL,
      })
      .expect(200);

    expect(response.body).toMatchObject({
      institutionId: fixture.institutionAId,
      name: 'Updated Department',
      status: RecordStatus.HISTORICAL,
    });
  });
});
