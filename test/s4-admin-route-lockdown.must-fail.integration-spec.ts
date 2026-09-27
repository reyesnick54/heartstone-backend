import { type INestApplication } from '@nestjs/common';
import { TechnicalAccessScopeType } from '@prisma/client';
import request from 'supertest';
import { type App } from 'supertest/types';

import { type PrismaService } from '../src/database/prisma.service';
import { TechnicalRoleCodes } from '../src/technical-access/config/technical-access-bootstrap.config';
import {
  authHeader,
  provisionAuthenticatedIdentity,
} from './helpers/identity-provisioning.fixture';
import { createIntegrationApp, resetAllTestData } from './helpers/integration-app';
import { assignTechnicalRole } from './helpers/technical-access.fixture';

describe('S4 administrative route lockdown must-fail (integration)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

  beforeAll(async () => {
    ({ app, prisma } = await createIntegrationApp());
  });

  beforeEach(async () => {
    await resetAllTestData(prisma);
  });

  afterAll(async () => {
    await app.close();
  });

  async function provisionCitizen() {
    return provisionAuthenticatedIdentity(app, prisma, {
      loginIdentifier: 'ordinary-citizen@test.gov',
      password: 'OrdinaryCitizen123!',
    });
  }

  it('rejects citizen attempts to administer user accounts', async () => {
    const citizen = await provisionCitizen();

    await request(app.getHttpServer())
      .post('/api/v1/identity/user-accounts')
      .set(authHeader(citizen.sessionToken))
      .send({ loginIdentifier: 'hijacked@test.gov' })
      .expect(403);
  });

  it('rejects citizen self-link to an officeholder', async () => {
    const citizen = await provisionCitizen();
    const officeholder = await prisma.officeholder.create({
      data: { code: 'OH-S4', name: 'S4 Officeholder' },
    });

    await request(app.getHttpServer())
      .post('/api/v1/identity/officeholder-links')
      .set(authHeader(citizen.sessionToken))
      .send({
        identityId: citizen.identityId,
        officeholderId: officeholder.id,
        linkedByIdentityId: citizen.identityId,
      })
      .expect(403);
  });

  it('rejects citizen appointment creation', async () => {
    const citizen = await provisionCitizen();

    await request(app.getHttpServer())
      .post('/api/v1/appointments')
      .set(authHeader(citizen.sessionToken))
      .send({
        officeId: '00000000-0000-0000-0000-000000000001',
        officeholderId: '00000000-0000-0000-0000-000000000002',
        effectiveFrom: new Date().toISOString(),
      })
      .expect(403);
  });

  it('rejects citizen delegation creation', async () => {
    const citizen = await provisionCitizen();

    await request(app.getHttpServer())
      .post('/api/v1/delegations')
      .set(authHeader(citizen.sessionToken))
      .send({
        institutionId: '00000000-0000-0000-0000-000000000001',
        effectiveFrom: new Date().toISOString(),
      })
      .expect(403);
  });

  it('rejects citizen authority function record creation', async () => {
    const citizen = await provisionCitizen();

    await request(app.getHttpServer())
      .post('/api/v1/authority/functions')
      .set(authHeader(citizen.sessionToken))
      .send({})
      .expect(403);
  });

  it('rejects citizen workflow definition creation', async () => {
    const citizen = await provisionCitizen();

    await request(app.getHttpServer())
      .post('/api/v1/workflow-definitions')
      .set(authHeader(citizen.sessionToken))
      .send({ code: 'citizen-workflow', name: 'Citizen Workflow' })
      .expect(403);
  });

  it('rejects cross-institution institution reads with institution-scoped grant only', async () => {
    const citizen = await provisionCitizen();
    const jurisdiction = await prisma.jurisdiction.create({
      data: { code: 'S4-JUR', name: 'S4 Jurisdiction', type: 'NATIONAL' },
    });
    const institutionA = await prisma.institution.create({
      data: {
        jurisdictionId: jurisdiction.id,
        code: 'INST-A',
        name: 'Institution A',
        type: 'AGENCY',
      },
    });
    const institutionB = await prisma.institution.create({
      data: {
        jurisdictionId: jurisdiction.id,
        code: 'INST-B',
        name: 'Institution B',
        type: 'AGENCY',
      },
    });

    await assignTechnicalRole(prisma, {
      identityId: citizen.identityId,
      roleCode: TechnicalRoleCodes.INSTITUTION_SCOPED_OPERATOR,
      scopeType: TechnicalAccessScopeType.INSTITUTION,
      institutionId: institutionA.id,
    });

    await request(app.getHttpServer())
      .get(`/api/v1/institutions/${institutionA.id}`)
      .set(authHeader(citizen.sessionToken))
      .expect(200);

    await request(app.getHttpServer())
      .get(`/api/v1/institutions/${institutionB.id}`)
      .set(authHeader(citizen.sessionToken))
      .expect(403);
  });
});
