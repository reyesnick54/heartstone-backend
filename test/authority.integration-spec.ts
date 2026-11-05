import { type INestApplication } from '@nestjs/common';
import { AuthorityClassification, ControlledFunctionClass } from '@prisma/client';
import request from 'supertest';
import { type App } from 'supertest/types';

import { NON_PRODUCTION_FIXTURE_MARKER } from '../src/authority/authority.constants';
import { type PrismaService } from '../src/database/prisma.service';
import {
  asFunctionAuthorityRecordBody,
  asGoverningSourceBody,
} from './helpers/authority-test-types';
import { authHeader, ensureIntegrationAdminSession } from './helpers/identity-provisioning.fixture';
import { createIntegrationApp, resetAllTestData } from './helpers/integration-app';
import { grantAuthorityAssuranceOfficer } from './helpers/technical-access.fixture';

describe('Authority domain (integration)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let adminSessionToken: string;
  let adminIdentityId: string;

  beforeAll(async () => {
    ({ app, prisma } = await createIntegrationApp());
  });

  beforeEach(async () => {
    await resetAllTestData(prisma);
    const admin = await ensureIntegrationAdminSession(app, prisma);
    adminSessionToken = admin.sessionToken;
    adminIdentityId = admin.identityId;
  });

  afterAll(async () => {
    await app.close();
  });

  it('persists governing sources and function authority records', async () => {
    const actor = await prisma.identity.create({
      data: { type: 'INDIVIDUAL', displayName: 'Actor' },
    });

    const sourceResponse = await request(app.getHttpServer())
      .post('/api/v1/authority/governing-sources')
      .set(authHeader(adminSessionToken))
      .send({
        code: `${NON_PRODUCTION_FIXTURE_MARKER}-INT-SRC`,
        title: 'Integration Source',
        versionLabel: '1.0.0',
        content: 'NON_PRODUCTION sample content',
        effectiveFrom: '2020-01-01T00:00:00.000Z',
      })
      .expect(201);

    const source = asGoverningSourceBody(sourceResponse.body);

    // A platform administrator (level E) cannot make a source count as authoritative.
    await request(app.getHttpServer())
      .patch(`/api/v1/authority/governing-sources/${source.id}/authenticate`)
      .set(authHeader(adminSessionToken))
      .send({ verificationReference: 'Gazette 2026/14' })
      .expect(403);

    // The request can no longer name someone else as the authenticating officer.
    await grantAuthorityAssuranceOfficer(prisma, adminIdentityId);
    await request(app.getHttpServer())
      .patch(`/api/v1/authority/governing-sources/${source.id}/authenticate`)
      .set(authHeader(adminSessionToken))
      .send({ authenticatedByIdentityId: actor.id })
      .expect(400);

    await request(app.getHttpServer())
      .patch(`/api/v1/authority/governing-sources/${source.id}/authenticate`)
      .set(authHeader(adminSessionToken))
      .send({ verificationReference: 'Gazette 2026/14' })
      .expect(200);

    const stored = await prisma.governingSource.findUniqueOrThrow({ where: { id: source.id } });
    expect(stored.authenticatedByIdentityId).toBe(adminIdentityId);

    const functionResponse = await request(app.getHttpServer())
      .post('/api/v1/authority/functions')
      .set(authHeader(adminSessionToken))
      .send({
        code: `${NON_PRODUCTION_FIXTURE_MARKER}-INT-FN`,
        name: 'Integration Function',
        classification: AuthorityClassification.INSTITUTION_OWNED,
        functionClass: ControlledFunctionClass.OTHER,
      })
      .expect(201);

    expect(asFunctionAuthorityRecordBody(functionResponse.body).lifecycleStatus).toBe('DRAFT');

    const listResponse = await request(app.getHttpServer())
      .get('/api/v1/authority/functions')
      .set(authHeader(adminSessionToken))
      .expect(200);

    expect(listResponse.body).toHaveLength(1);
  });
});
