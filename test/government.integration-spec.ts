import { type INestApplication } from '@nestjs/common';
import { InstitutionType, JurisdictionType, StructuralLifecycleStatus } from '@prisma/client';
import request from 'supertest';
import { type App } from 'supertest/types';

import { PrismaService } from '../src/database/prisma.service';
import { asInstitutionListBody, asJurisdictionBody } from './helpers/government-test-types';
import { createIntegrationApp, resetGovernmentData } from './helpers/integration-app';

describe('Government structure (integration)', () => {
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

  it('persists jurisdictions and enforces unique codes in the database', async () => {
    const createResponse = await request(app.getHttpServer())
      .post('/api/v1/jurisdictions')
      .send({
        code: 'US-FED',
        name: 'United States Federal Government',
        type: JurisdictionType.NATIONAL,
      })
      .expect(201);

    expect(asJurisdictionBody(createResponse.body)).toMatchObject({
      code: 'US-FED',
      status: StructuralLifecycleStatus.ACTIVE,
    });

    await request(app.getHttpServer())
      .post('/api/v1/jurisdictions')
      .send({
        code: 'US-FED',
        name: 'Duplicate',
        type: JurisdictionType.NATIONAL,
      })
      .expect(409);

    const listResponse = await request(app.getHttpServer())
      .get('/api/v1/jurisdictions')
      .query({ status: StructuralLifecycleStatus.ACTIVE })
      .expect(200);

    expect(listResponse.body).toHaveLength(1);
  });

  it('persists institutions scoped to jurisdictions and enforces composite uniqueness', async () => {
    const jurisdictionResponse = await request(app.getHttpServer())
      .post('/api/v1/jurisdictions')
      .send({
        code: 'US-FED',
        name: 'United States Federal Government',
        type: JurisdictionType.NATIONAL,
      })
      .expect(201);

    const jurisdiction = asJurisdictionBody(jurisdictionResponse.body);

    await request(app.getHttpServer())
      .post('/api/v1/institutions')
      .send({
        jurisdictionId: jurisdiction.id,
        code: 'DOT',
        name: 'Department of Transportation',
        type: InstitutionType.AGENCY,
      })
      .expect(201);

    await request(app.getHttpServer())
      .post('/api/v1/institutions')
      .send({
        jurisdictionId: jurisdiction.id,
        code: 'DOT',
        name: 'Duplicate',
        type: InstitutionType.AGENCY,
      })
      .expect(409);

    const filteredResponse = await request(app.getHttpServer())
      .get('/api/v1/institutions')
      .query({ jurisdictionId: jurisdiction.id })
      .expect(200);

    const institutions = asInstitutionListBody(filteredResponse.body);
    expect(institutions).toHaveLength(1);
    expect(institutions[0]).toMatchObject({
      jurisdictionId: jurisdiction.id,
      code: 'DOT',
    });
  });

  it('rejects institutions that reference missing jurisdictions at the database layer', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/institutions')
      .send({
        jurisdictionId: '99999999-9999-4999-8999-999999999999',
        code: 'DOT',
        name: 'Department of Transportation',
        type: InstitutionType.AGENCY,
      })
      .expect(404);
  });
});
