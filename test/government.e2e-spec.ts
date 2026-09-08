import { type INestApplication } from '@nestjs/common';
import { InstitutionType, JurisdictionType, StructuralLifecycleStatus } from '@prisma/client';
import request from 'supertest';
import { type App } from 'supertest/types';

import { PrismaService } from '../src/database/prisma.service';
import { asInstitutionBody, asJurisdictionBody } from './helpers/government-test-types';
import { createIntegrationApp, resetGovernmentData } from './helpers/integration-app';

describe('Government structure (e2e)', () => {
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

  it('creates a jurisdiction', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/jurisdictions')
      .send({
        code: 'US-FED',
        name: 'United States Federal Government',
        type: JurisdictionType.NATIONAL,
      })
      .expect(201);

    const jurisdiction = asJurisdictionBody(response.body);

    expect(jurisdiction).toMatchObject({
      code: 'US-FED',
      name: 'United States Federal Government',
      type: JurisdictionType.NATIONAL,
      status: StructuralLifecycleStatus.ACTIVE,
    });
    expect(jurisdiction.id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    );
  });

  it('retrieves a jurisdiction by id', async () => {
    const createdResponse = await request(app.getHttpServer())
      .post('/api/v1/jurisdictions')
      .send({
        code: 'US-FED',
        name: 'United States Federal Government',
        type: JurisdictionType.NATIONAL,
      })
      .expect(201);

    const created = asJurisdictionBody(createdResponse.body);

    const response = await request(app.getHttpServer())
      .get(`/api/v1/jurisdictions/${created.id}`)
      .expect(200);

    expect(asJurisdictionBody(response.body)).toMatchObject({
      id: created.id,
      code: 'US-FED',
    });
  });

  it('updates a jurisdiction without changing immutable identifiers', async () => {
    const createdResponse = await request(app.getHttpServer())
      .post('/api/v1/jurisdictions')
      .send({
        code: 'US-FED',
        name: 'United States Federal Government',
        type: JurisdictionType.NATIONAL,
      })
      .expect(201);

    const created = asJurisdictionBody(createdResponse.body);

    await request(app.getHttpServer())
      .patch(`/api/v1/jurisdictions/${created.id}`)
      .send({
        code: 'CHANGED',
      })
      .expect(400);

    const response = await request(app.getHttpServer())
      .patch(`/api/v1/jurisdictions/${created.id}`)
      .send({
        name: 'Updated Federal Government',
        status: StructuralLifecycleStatus.INACTIVE,
      })
      .expect(200);

    expect(asJurisdictionBody(response.body)).toMatchObject({
      id: created.id,
      code: 'US-FED',
      name: 'Updated Federal Government',
      status: StructuralLifecycleStatus.INACTIVE,
    });
  });

  it('rejects duplicate jurisdiction codes', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/jurisdictions')
      .send({
        code: 'US-FED',
        name: 'United States Federal Government',
        type: JurisdictionType.NATIONAL,
      })
      .expect(201);

    await request(app.getHttpServer())
      .post('/api/v1/jurisdictions')
      .send({
        code: 'US-FED',
        name: 'Duplicate',
        type: JurisdictionType.NATIONAL,
      })
      .expect(409);
  });

  it('creates an institution linked to a jurisdiction', async () => {
    const jurisdictionResponse = await request(app.getHttpServer())
      .post('/api/v1/jurisdictions')
      .send({
        code: 'US-FED',
        name: 'United States Federal Government',
        type: JurisdictionType.NATIONAL,
      })
      .expect(201);

    const jurisdiction = asJurisdictionBody(jurisdictionResponse.body);

    const response = await request(app.getHttpServer())
      .post('/api/v1/institutions')
      .send({
        jurisdictionId: jurisdiction.id,
        code: 'DOT',
        name: 'Department of Transportation',
        type: InstitutionType.AGENCY,
      })
      .expect(201);

    expect(asInstitutionBody(response.body)).toMatchObject({
      jurisdictionId: jurisdiction.id,
      code: 'DOT',
      type: InstitutionType.AGENCY,
    });
  });

  it('rejects institutions referencing a nonexistent jurisdiction', async () => {
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

  it('rejects duplicate institution codes within the same jurisdiction', async () => {
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
  });

  it('does not expose DELETE endpoints for jurisdictions or institutions', async () => {
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
      .delete(`/api/v1/jurisdictions/${jurisdiction.id}`)
      .expect(404);

    const institutionResponse = await request(app.getHttpServer())
      .post('/api/v1/institutions')
      .send({
        jurisdictionId: jurisdiction.id,
        code: 'DOT',
        name: 'Department of Transportation',
        type: InstitutionType.AGENCY,
      })
      .expect(201);

    const institution = asInstitutionBody(institutionResponse.body);

    await request(app.getHttpServer()).delete(`/api/v1/institutions/${institution.id}`).expect(404);
  });
});
