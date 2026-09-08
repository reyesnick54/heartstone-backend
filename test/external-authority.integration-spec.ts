import { type INestApplication } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import {
  ExternalAuthorityType,
  InstitutionExternalAuthorityRelationshipType,
  RecordStatus,
} from '@prisma/client';
import request from 'supertest';
import { type App } from 'supertest/types';

import { AppModule } from '../src/app.module';
import { configureApplication } from '../src/bootstrap/configure-application';
import { PrismaService } from '../src/database/prisma.service';
import {
  type InstitutionExternalAuthorityResponseBody,
  resetPhase2FData,
  seedExternalAuthority,
  seedInstitution,
} from './phase-2f-test-utils';
import { overrideRedisService } from './redis-test-utils';

describe('Phase 2F external authority (integration)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

  beforeAll(async () => {
    const moduleBuilder = Test.createTestingModule({
      imports: [AppModule],
    });

    overrideRedisService(moduleBuilder);

    const moduleFixture: TestingModule = await moduleBuilder.compile();

    app = moduleFixture.createNestApplication({ bodyParser: false });
    configureApplication(app);
    await app.init();

    prisma = app.get(PrismaService);
    await resetPhase2FData(prisma);
  });

  afterAll(async () => {
    await resetPhase2FData(prisma);
    await app.close();
  });

  beforeEach(async () => {
    await resetPhase2FData(prisma);
  });

  it('creates and lists external authorities', async () => {
    const createResponse = await request(app.getHttpServer())
      .post('/api/v1/external-authorities')
      .send({
        code: 'EU-COMMISSION',
        name: 'European Commission',
        type: ExternalAuthorityType.INTERNATIONAL_BODY,
      })
      .expect(201);

    expect(createResponse.body).toMatchObject({
      code: 'EU-COMMISSION',
      status: RecordStatus.ACTIVE,
    });

    const listResponse = await request(app.getHttpServer())
      .get('/api/v1/external-authorities')
      .expect(200);

    expect(listResponse.body).toHaveLength(1);
  });

  it('rejects duplicate external authority codes', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/external-authorities')
      .send({
        code: 'REG-1',
        name: 'Regulator One',
        type: ExternalAuthorityType.REGULATOR,
      })
      .expect(201);

    await request(app.getHttpServer())
      .post('/api/v1/external-authorities')
      .send({
        code: 'REG-1',
        name: 'Regulator Two',
        type: ExternalAuthorityType.REGULATOR,
      })
      .expect(409);
  });

  it('creates relationships and preserves historical records', async () => {
    const institution = await seedInstitution(prisma);
    const authority = await seedExternalAuthority(prisma);

    const createResponse = await request(app.getHttpServer())
      .post('/api/v1/institution-external-authorities')
      .send({
        institutionId: institution.id,
        externalAuthorityId: authority.id,
        relationshipType: InstitutionExternalAuthorityRelationshipType.COORDINATION,
      })
      .expect(201);

    const createBody = createResponse.body as InstitutionExternalAuthorityResponseBody;

    await request(app.getHttpServer())
      .post('/api/v1/institution-external-authorities')
      .send({
        institutionId: institution.id,
        externalAuthorityId: authority.id,
        relationshipType: InstitutionExternalAuthorityRelationshipType.COORDINATION,
      })
      .expect(409);

    await request(app.getHttpServer())
      .patch(`/api/v1/institution-external-authorities/${createBody.id}`)
      .send({ status: RecordStatus.HISTORICAL })
      .expect(200);

    const historicalResponse = await request(app.getHttpServer())
      .get(
        `/api/v1/institution-external-authorities?institutionId=${institution.id}&status=${RecordStatus.HISTORICAL}`,
      )
      .expect(200);

    const historicalBody = historicalResponse.body as InstitutionExternalAuthorityResponseBody[];

    expect(historicalBody).toHaveLength(1);
    expect(historicalBody[0]?.status).toBe(RecordStatus.HISTORICAL);
  });

  it('rejects relationships with invalid institution references', async () => {
    const authority = await seedExternalAuthority(prisma);

    await request(app.getHttpServer())
      .post('/api/v1/institution-external-authorities')
      .send({
        institutionId: 'missing-institution',
        externalAuthorityId: authority.id,
        relationshipType: InstitutionExternalAuthorityRelationshipType.REFERRAL,
      })
      .expect(404);
  });

  it('lists relationships by external authority', async () => {
    const institution = await seedInstitution(prisma);
    const authority = await seedExternalAuthority(prisma);

    await request(app.getHttpServer())
      .post('/api/v1/institution-external-authorities')
      .send({
        institutionId: institution.id,
        externalAuthorityId: authority.id,
        relationshipType: InstitutionExternalAuthorityRelationshipType.VERIFICATION,
      })
      .expect(201);

    const listResponse = await request(app.getHttpServer())
      .get(`/api/v1/institution-external-authorities?externalAuthorityId=${authority.id}`)
      .expect(200);

    expect(listResponse.body).toHaveLength(1);
  });
});
