import { type INestApplication } from '@nestjs/common';
import { StructuralLifecycleStatus } from '@prisma/client';
import request from 'supertest';
import { type App } from 'supertest/types';

import { PrismaService } from '../src/database/prisma.service';
import { createTestDepartment } from './helpers/government-fixtures';
import { asOfficeBody, asOfficeholderBody } from './helpers/government-test-types';
import { createIntegrationApp, resetGovernmentData } from './helpers/integration-app';

describe('Office and Officeholder (integration)', () => {
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

  it('creates an office linked to a valid department', async () => {
    const prisma = app.get(PrismaService);
    const department = await createTestDepartment(prisma);

    const response = await request(app.getHttpServer())
      .post('/api/v1/offices')
      .send({
        departmentId: department.id,
        code: 'DIR-BL',
        title: 'Director of Business Licensing',
      })
      .expect(201);

    expect(asOfficeBody(response.body)).toMatchObject({
      departmentId: department.id,
      code: 'DIR-BL',
      title: 'Director of Business Licensing',
      status: StructuralLifecycleStatus.ACTIVE,
    });
  });

  it('rejects offices referencing a nonexistent department', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/offices')
      .send({
        departmentId: '99999999-9999-4999-8999-999999999999',
        code: 'DIR-BL',
        title: 'Director of Business Licensing',
      })
      .expect(404);
  });

  it('rejects duplicate office codes within the same department', async () => {
    const prisma = app.get(PrismaService);
    const department = await createTestDepartment(prisma);

    await request(app.getHttpServer())
      .post('/api/v1/offices')
      .send({
        departmentId: department.id,
        code: 'REG',
        title: 'Registrar',
      })
      .expect(201);

    await request(app.getHttpServer())
      .post('/api/v1/offices')
      .send({
        departmentId: department.id,
        code: 'REG',
        title: 'Duplicate Registrar',
      })
      .expect(409);
  });

  it('rejects silent department changes on office patch', async () => {
    const prisma = app.get(PrismaService);
    const department = await createTestDepartment(prisma);
    const otherDepartment = await createTestDepartment(prisma, { code: 'OTHER' });

    const createdResponse = await request(app.getHttpServer())
      .post('/api/v1/offices')
      .send({
        departmentId: department.id,
        code: 'SEC',
        title: 'Department Secretary',
      })
      .expect(201);

    const office = asOfficeBody(createdResponse.body);

    await request(app.getHttpServer())
      .patch(`/api/v1/offices/${office.id}`)
      .send({
        departmentId: otherDepartment.id,
      })
      .expect(400);

    const updatedResponse = await request(app.getHttpServer())
      .patch(`/api/v1/offices/${office.id}`)
      .send({
        title: 'Updated Department Secretary',
        status: StructuralLifecycleStatus.INACTIVE,
      })
      .expect(200);

    expect(asOfficeBody(updatedResponse.body)).toMatchObject({
      id: office.id,
      departmentId: department.id,
      code: 'SEC',
      title: 'Updated Department Secretary',
      status: StructuralLifecycleStatus.INACTIVE,
    });
  });

  it('creates an officeholder without linking to an office', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/officeholders')
      .send({
        referenceCode: 'OH-2026-001',
        displayName: 'Jane Q. Public',
      })
      .expect(201);

    const officeholder = asOfficeholderBody(response.body);

    expect(officeholder).toMatchObject({
      referenceCode: 'OH-2026-001',
      displayName: 'Jane Q. Public',
      status: StructuralLifecycleStatus.ACTIVE,
    });
    expect(officeholder).not.toHaveProperty('officeId');
    expect(officeholder).not.toHaveProperty('userId');
  });

  it('rejects duplicate officeholder reference codes', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/officeholders')
      .send({
        referenceCode: 'OH-DUP',
        displayName: 'First Record',
      })
      .expect(201);

    await request(app.getHttpServer())
      .post('/api/v1/officeholders')
      .send({
        referenceCode: 'OH-DUP',
        displayName: 'Second Record',
      })
      .expect(409);
  });

  it('keeps inactive officeholders available for retrieval', async () => {
    const createdResponse = await request(app.getHttpServer())
      .post('/api/v1/officeholders')
      .send({
        referenceCode: 'OH-HIST',
        displayName: 'Historical Record',
      })
      .expect(201);

    const created = asOfficeholderBody(createdResponse.body);

    await request(app.getHttpServer())
      .patch(`/api/v1/officeholders/${created.id}`)
      .send({
        status: StructuralLifecycleStatus.ARCHIVED,
      })
      .expect(200);

    const retrievedResponse = await request(app.getHttpServer())
      .get(`/api/v1/officeholders/${created.id}`)
      .expect(200);

    expect(asOfficeholderBody(retrievedResponse.body)).toMatchObject({
      id: created.id,
      referenceCode: 'OH-HIST',
      status: StructuralLifecycleStatus.ARCHIVED,
    });
  });

  it('does not expose DELETE endpoints for offices or officeholders', async () => {
    const prisma = app.get(PrismaService);
    const department = await createTestDepartment(prisma);

    const officeResponse = await request(app.getHttpServer())
      .post('/api/v1/offices')
      .send({
        departmentId: department.id,
        code: 'CIO',
        title: 'Chief Immigration Officer',
      })
      .expect(201);

    const office = asOfficeBody(officeResponse.body);

    await request(app.getHttpServer()).delete(`/api/v1/offices/${office.id}`).expect(404);

    const officeholderResponse = await request(app.getHttpServer())
      .post('/api/v1/officeholders')
      .send({
        referenceCode: 'OH-NODELETE',
        displayName: 'No Delete',
      })
      .expect(201);

    const officeholder = asOfficeholderBody(officeholderResponse.body);

    await request(app.getHttpServer())
      .delete(`/api/v1/officeholders/${officeholder.id}`)
      .expect(404);
  });
});
