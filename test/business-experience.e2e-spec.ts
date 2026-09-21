import { type INestApplication } from '@nestjs/common';
import request from 'supertest';
import { type App } from 'supertest/types';

import { type PrismaService } from '../src/database/prisma.service';
import { seedBusinessExperienceFixture } from './helpers/business-experience-test-fixtures';
import {
  asBusinessApplicationsBody,
  asBusinessHomeBody,
  asBusinessOrganizationsBody,
} from './helpers/business-experience-test-types';
import { createIntegrationApp, resetAllTestData } from './helpers/integration-app';

describe('Business Experience API (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let fixture: Awaited<ReturnType<typeof seedBusinessExperienceFixture>>;

  beforeAll(async () => {
    const integration = await createIntegrationApp();
    app = integration.app;
    prisma = integration.prisma;
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    await resetAllTestData(prisma);
    fixture = await seedBusinessExperienceFixture(app, prisma);
  });

  it('supports unified business organization journey across list, detail, home, and applications', async () => {
    const organizations = await request(app.getHttpServer())
      .get('/api/v1/experience/business/organizations')
      .set('Authorization', `Bearer ${fixture.memberSessionToken}`)
      .expect(200);

    const orgList = asBusinessOrganizationsBody(organizations.body);
    expect(orgList.items.length).toBeGreaterThan(0);

    const firstOrganization = orgList.items[0];
    if (!firstOrganization) {
      throw new Error('Expected at least one accessible organization');
    }
    const organizationId = firstOrganization.organizationId;
    expect(organizationId).toBe(fixture.organizationId);

    await request(app.getHttpServer())
      .get(`/api/v1/experience/business/organizations/${organizationId}`)
      .set('Authorization', `Bearer ${fixture.memberSessionToken}`)
      .expect(200);

    const home = await request(app.getHttpServer())
      .get(`/api/v1/experience/business/organizations/${organizationId}/home`)
      .set('Authorization', `Bearer ${fixture.memberSessionToken}`)
      .expect(200);

    const homeBody = asBusinessHomeBody(home.body);
    expect(homeBody.counts.activeApplications).toBeGreaterThanOrEqual(1);

    const applications = await request(app.getHttpServer())
      .get(
        `/api/v1/experience/business/organizations/${organizationId}/applications?page=1&pageSize=10`,
      )
      .set('Authorization', `Bearer ${fixture.memberSessionToken}`)
      .expect(200);

    const appBody = asBusinessApplicationsBody(applications.body);
    expect(appBody.items.some((item) => item.applicationId === fixture.applicationId)).toBe(true);
  });
});
