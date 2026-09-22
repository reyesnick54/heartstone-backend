import { type INestApplication } from '@nestjs/common';
import { OrganizationStatus } from '@prisma/client';
import request from 'supertest';
import { type App } from 'supertest/types';

import { PrismaService } from '../src/database/prisma.service';
import { PLANNING_CONSTRUCTION_SERVICE_PACK_TEMPLATE } from '../src/service-catalog/service-packs/planning-construction-service-pack.template';
import { validateServicePackManifest } from '../src/service-catalog/service-packs/validate-service-pack';
import { provisionAuthenticatedIdentity } from './helpers/identity-provisioning.fixture';
import { createIntegrationApp, resetAllTestData } from './helpers/integration-app';

describe('Planning & Construction service pack and development portal (integration)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

  beforeAll(async () => {
    ({ app } = await createIntegrationApp());
    prisma = app.get(PrismaService);
  });

  beforeEach(async () => {
    await resetAllTestData(prisma);
  });

  afterAll(async () => {
    await app.close();
  });

  it('validates the planning construction service pack manifest', () => {
    const result = validateServicePackManifest(PLANNING_CONSTRUCTION_SERVICE_PACK_TEMPLATE);
    expect(result.valid).toBe(true);
    expect(PLANNING_CONSTRUCTION_SERVICE_PACK_TEMPLATE.services).toHaveLength(15);
  });

  it('exposes citizen development projects for the primary applicant only', async () => {
    const citizen = await provisionAuthenticatedIdentity(app, prisma, {
      loginIdentifier: 'citizen-pc@test.local',
      password: 'CitizenPc123!',
    });

    const jurisdiction = await prisma.jurisdiction.create({
      data: {
        code: 'JUR-PC-TEST',
        name: 'Planning Test Jurisdiction',
        type: 'NATIONAL',
        status: 'ACTIVE',
      },
    });

    await prisma.developmentProject.create({
      data: {
        jurisdictionId: jurisdiction.id,
        projectReference: 'DEVPROJ-00000001',
        title: 'Citizen home extension',
        primaryApplicantIdentityId: citizen.identityId,
        site: {
          create: {
            siteLabel: 'Lot 1',
            addressLine: '1 Test Street',
          },
        },
      },
    });

    const list = (
      await request(app.getHttpServer())
        .get('/api/v1/experience/citizen/development-projects')
        .set('Authorization', `Bearer ${citizen.sessionToken}`)
        .expect(200)
    ).body as { items: { projectReference: string }[] };

    expect(list.items).toHaveLength(1);
    expect(list.items[0]?.projectReference).toBe('DEVPROJ-00000001');
  });

  it('denies business development project access without organization membership', async () => {
    const outsider = await provisionAuthenticatedIdentity(app, prisma, {
      loginIdentifier: 'outsider-pc@test.local',
      password: 'OutsiderPc123!',
    });

    const organization = await prisma.organization.create({
      data: { code: 'ORG-PC-1', name: 'Dev Org', status: OrganizationStatus.ACTIVE },
    });

    await request(app.getHttpServer())
      .get(`/api/v1/experience/business/organizations/${organization.id}/development-projects`)
      .set('Authorization', `Bearer ${outsider.sessionToken}`)
      .expect(403);
  });
});
