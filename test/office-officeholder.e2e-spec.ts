import { type INestApplication } from '@nestjs/common';
import { StructuralLifecycleStatus } from '@prisma/client';
import request from 'supertest';
import { type App } from 'supertest/types';

import { PrismaService } from '../src/database/prisma.service';
import { createTestDepartment } from './helpers/government-fixtures';
import { asOfficeBody, asOfficeholderBody } from './helpers/government-test-types';
import { createIntegrationApp, resetGovernmentData } from './helpers/integration-app';

describe('Office and Officeholder (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    ({ app } = await createIntegrationApp());
  });

  beforeEach(async () => {
    await resetGovernmentData(app.get(PrismaService));
  });

  afterAll(async () => {
    await app.close();
  });

  it('lists and retrieves offices by id', async () => {
    const prisma = app.get(PrismaService);
    const department = await createTestDepartment(prisma);

    const createdResponse = await request(app.getHttpServer())
      .post('/api/v1/offices')
      .send({
        departmentId: department.id,
        code: 'REG',
        title: 'Registrar',
      })
      .expect(201);

    const created = asOfficeBody(createdResponse.body);

    const listResponse = await request(app.getHttpServer()).get('/api/v1/offices').expect(200);

    expect(listResponse.body).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: created.id,
          code: 'REG',
          title: 'Registrar',
        }),
      ]),
    );

    const getResponse = await request(app.getHttpServer())
      .get(`/api/v1/offices/${created.id}`)
      .expect(200);

    expect(asOfficeBody(getResponse.body)).toMatchObject({
      id: created.id,
      departmentId: department.id,
      code: 'REG',
    });
  });

  it('filters offices by department and status', async () => {
    const prisma = app.get(PrismaService);
    const departmentA = await createTestDepartment(prisma, { code: 'DEPT-A' });
    const departmentB = await createTestDepartment(prisma, { code: 'DEPT-B' });

    await request(app.getHttpServer())
      .post('/api/v1/offices')
      .send({
        departmentId: departmentA.id,
        code: 'ACTIVE-OFFICE',
        title: 'Active Office',
      })
      .expect(201);

    const inactiveResponse = await request(app.getHttpServer())
      .post('/api/v1/offices')
      .send({
        departmentId: departmentB.id,
        code: 'INACTIVE-OFFICE',
        title: 'Inactive Office',
        status: StructuralLifecycleStatus.INACTIVE,
      })
      .expect(201);

    const inactiveOffice = asOfficeBody(inactiveResponse.body);

    const departmentFilter = await request(app.getHttpServer())
      .get(`/api/v1/offices?departmentId=${departmentB.id}`)
      .expect(200);

    expect(departmentFilter.body).toEqual([
      expect.objectContaining({
        id: inactiveOffice.id,
        departmentId: departmentB.id,
      }),
    ]);

    const statusFilter = await request(app.getHttpServer())
      .get(`/api/v1/offices?status=${StructuralLifecycleStatus.INACTIVE}`)
      .expect(200);

    expect(statusFilter.body).toEqual([
      expect.objectContaining({
        id: inactiveOffice.id,
        status: StructuralLifecycleStatus.INACTIVE,
      }),
    ]);
  });

  it('lists and retrieves officeholders by id', async () => {
    const createdResponse = await request(app.getHttpServer())
      .post('/api/v1/officeholders')
      .send({
        referenceCode: 'OH-LIST-001',
        displayName: 'Listed Officeholder',
        givenName: 'Listed',
        familyName: 'Officeholder',
      })
      .expect(201);

    const created = asOfficeholderBody(createdResponse.body);

    const listResponse = await request(app.getHttpServer())
      .get('/api/v1/officeholders')
      .expect(200);

    expect(listResponse.body).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: created.id,
          referenceCode: 'OH-LIST-001',
        }),
      ]),
    );

    const getResponse = await request(app.getHttpServer())
      .get(`/api/v1/officeholders/${created.id}`)
      .expect(200);

    expect(asOfficeholderBody(getResponse.body)).toMatchObject({
      id: created.id,
      displayName: 'Listed Officeholder',
    });
  });

  it('rejects silent referenceCode changes on officeholder patch', async () => {
    const createdResponse = await request(app.getHttpServer())
      .post('/api/v1/officeholders')
      .send({
        referenceCode: 'OH-IMMUTABLE',
        displayName: 'Immutable Reference',
      })
      .expect(201);

    const created = asOfficeholderBody(createdResponse.body);

    await request(app.getHttpServer())
      .patch(`/api/v1/officeholders/${created.id}`)
      .send({
        referenceCode: 'OH-CHANGED',
      })
      .expect(400);

    const updatedResponse = await request(app.getHttpServer())
      .patch(`/api/v1/officeholders/${created.id}`)
      .send({
        displayName: 'Updated Display Name',
      })
      .expect(200);

    expect(asOfficeholderBody(updatedResponse.body)).toMatchObject({
      id: created.id,
      referenceCode: 'OH-IMMUTABLE',
      displayName: 'Updated Display Name',
    });
  });

  it('does not automatically assign officeholders to offices', async () => {
    const prisma = app.get(PrismaService);
    const department = await createTestDepartment(prisma);

    await request(app.getHttpServer())
      .post('/api/v1/offices')
      .send({
        departmentId: department.id,
        code: 'VACANT',
        title: 'Vacant Office',
      })
      .expect(201);

    const officeholderResponse = await request(app.getHttpServer())
      .post('/api/v1/officeholders')
      .send({
        referenceCode: 'OH-UNASSIGNED',
        displayName: 'Unassigned Person',
      })
      .expect(201);

    const officeholder = asOfficeholderBody(officeholderResponse.body);

    expect(officeholder).not.toHaveProperty('officeId');
    expect(officeholder).not.toHaveProperty('userId');
    expect(officeholder).not.toHaveProperty('authority');
    expect(officeholder).not.toHaveProperty('permissions');
  });
});
