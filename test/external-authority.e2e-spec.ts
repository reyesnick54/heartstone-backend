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
  type ExternalAuthorityResponseBody,
  type InstitutionExternalAuthorityResponseBody,
  resetPhase2FData,
  seedInstitution,
} from './phase-2f-test-utils';
import { overrideRedisService } from './redis-test-utils';

describe('Phase 2F external authority (e2e)', () => {
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

  it('supports external authority lifecycle and relationship updates', async () => {
    const institution = await seedInstitution(prisma, {
      code: 'GOV-TREASURY',
      name: 'Treasury Department',
    });

    const createAuthorityResponse = await request(app.getHttpServer())
      .post('/api/v1/external-authorities')
      .send({
        code: 'REG-AUDITOR',
        name: 'Supreme Audit Institution',
        description: 'Independent audit body',
        type: ExternalAuthorityType.REGULATOR,
        jurisdictionDescription: 'National',
      })
      .expect(201);

    const authorityBody = createAuthorityResponse.body as ExternalAuthorityResponseBody;
    const authorityId = authorityBody.id;

    const getAuthorityResponse = await request(app.getHttpServer())
      .get(`/api/v1/external-authorities/${authorityId}`)
      .expect(200);

    expect((getAuthorityResponse.body as ExternalAuthorityResponseBody).code).toBe('REG-AUDITOR');

    await request(app.getHttpServer())
      .patch(`/api/v1/external-authorities/${authorityId}`)
      .send({ status: RecordStatus.INACTIVE })
      .expect(200);

    await request(app.getHttpServer())
      .post('/api/v1/institution-external-authorities')
      .send({
        institutionId: institution.id,
        externalAuthorityId: authorityId,
        relationshipType: InstitutionExternalAuthorityRelationshipType.SUPERVISION,
      })
      .expect(404);

    await request(app.getHttpServer())
      .patch(`/api/v1/external-authorities/${authorityId}`)
      .send({ status: RecordStatus.ACTIVE })
      .expect(200);

    const relationshipResponse = await request(app.getHttpServer())
      .post('/api/v1/institution-external-authorities')
      .send({
        institutionId: institution.id,
        externalAuthorityId: authorityId,
        relationshipType: InstitutionExternalAuthorityRelationshipType.SUPERVISION,
        description: 'Annual supervision channel',
      })
      .expect(201);

    const relationshipBody = relationshipResponse.body as InstitutionExternalAuthorityResponseBody;
    const relationshipId = relationshipBody.id;

    await request(app.getHttpServer())
      .patch(`/api/v1/institution-external-authorities/${relationshipId}`)
      .send({
        status: RecordStatus.INACTIVE,
        description: 'Retired coordination channel',
      })
      .expect(200);

    const activeListResponse = await request(app.getHttpServer())
      .get(
        `/api/v1/institution-external-authorities?institutionId=${institution.id}&status=${RecordStatus.ACTIVE}`,
      )
      .expect(200);

    expect(activeListResponse.body).toHaveLength(0);

    const inactiveListResponse = await request(app.getHttpServer())
      .get(
        `/api/v1/institution-external-authorities?institutionId=${institution.id}&status=${RecordStatus.INACTIVE}`,
      )
      .expect(200);

    expect(inactiveListResponse.body).toHaveLength(1);
  });

  it('rejects invalid external authority references', async () => {
    const institution = await seedInstitution(prisma);

    await request(app.getHttpServer())
      .post('/api/v1/institution-external-authorities')
      .send({
        institutionId: institution.id,
        externalAuthorityId: 'missing-authority',
        relationshipType: InstitutionExternalAuthorityRelationshipType.CONSULTATION,
      })
      .expect(404);
  });
});
