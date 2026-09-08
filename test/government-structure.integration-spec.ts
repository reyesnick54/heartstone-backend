import { type INestApplication } from '@nestjs/common';
import request from 'supertest';
import { type App } from 'supertest/types';

import {
  createTestApp,
  GovernmentBodyType,
  resetGovernmentStructureData,
  seedGovernmentStructure,
} from './government-structure-test-utils';

describe('Government structure integration', () => {
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

  it('allows the same government body code in different institutions', async () => {
    const fixture = await seedGovernmentStructure(app);

    await request(app.getHttpServer())
      .post('/api/v1/government-bodies')
      .send({
        institutionId: fixture.institutionAId,
        code: 'SHARED-CODE',
        name: 'Board A',
        type: GovernmentBodyType.COUNCIL,
      })
      .expect(201);

    const secondResponse = await request(app.getHttpServer())
      .post('/api/v1/government-bodies')
      .send({
        institutionId: fixture.institutionBId,
        code: 'SHARED-CODE',
        name: 'Board B',
        type: GovernmentBodyType.COUNCIL,
      })
      .expect(201);

    expect(secondResponse.body).toMatchObject({
      code: 'SHARED-CODE',
      institutionId: fixture.institutionBId,
    });
  });

  it('allows the same department code in different institutions', async () => {
    const fixture = await seedGovernmentStructure(app);

    await request(app.getHttpServer())
      .post('/api/v1/departments')
      .send({
        institutionId: fixture.institutionAId,
        code: 'SHARED-DEPT',
        name: 'Department A',
      })
      .expect(201);

    const secondResponse = await request(app.getHttpServer())
      .post('/api/v1/departments')
      .send({
        institutionId: fixture.institutionBId,
        code: 'SHARED-DEPT',
        name: 'Department B',
      })
      .expect(201);

    expect(secondResponse.body).toMatchObject({
      code: 'SHARED-DEPT',
      institutionId: fixture.institutionBId,
    });
  });

  it('rejects reassignment of government body institutionId via PATCH', async () => {
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

    await request(app.getHttpServer())
      .patch(`/api/v1/government-bodies/${id}`)
      .send({ institutionId: fixture.institutionBId })
      .expect(400);
  });

  it('rejects reassignment of department institutionId via PATCH', async () => {
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

    await request(app.getHttpServer())
      .patch(`/api/v1/departments/${id}`)
      .send({ institutionId: fixture.institutionBId })
      .expect(400);
  });
});
