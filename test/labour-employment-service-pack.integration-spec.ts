import { type INestApplication } from '@nestjs/common';
import { OrganizationStatus } from '@prisma/client';
import request from 'supertest';
import { type App } from 'supertest/types';

import { PrismaService } from '../src/database/prisma.service';
import { WorkerProfileReferenceService } from '../src/labour/workers/worker-profile-reference.service';
import { LABOUR_EMPLOYMENT_WORK_PERMIT_TEMPLATE } from '../src/service-catalog/service-packs/labour-employment-work-permit.template';
import { validateServicePackManifest } from '../src/service-catalog/service-packs/validate-service-pack';
import { provisionAuthenticatedIdentity } from './helpers/identity-provisioning.fixture';
import { createIntegrationApp, resetAllTestData } from './helpers/integration-app';

describe('Labour, Employment & Work Permit service pack and experience (integration)', () => {
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

  it('validates the labour service pack manifest and NON_PRODUCTION services', () => {
    const result = validateServicePackManifest(LABOUR_EMPLOYMENT_WORK_PERMIT_TEMPLATE);
    expect(result.valid).toBe(true);
    expect(LABOUR_EMPLOYMENT_WORK_PERMIT_TEMPLATE.services).toHaveLength(16);
    for (const service of LABOUR_EMPLOYMENT_WORK_PERMIT_TEMPLATE.services) {
      expect(service.description).toMatch(/NON_PRODUCTION/);
    }
  });

  it('exposes citizen employment home for registered worker profile reference', async () => {
    const worker = await provisionAuthenticatedIdentity(app, prisma, {
      loginIdentifier: 'worker-lab@test.local',
      password: 'WorkerLab123!',
    });

    const jurisdiction = await prisma.jurisdiction.create({
      data: {
        code: 'JUR-LAB-TEST',
        name: 'Labour Test Jurisdiction',
        type: 'NATIONAL',
        status: 'ACTIVE',
      },
    });

    const profiles = app.get(WorkerProfileReferenceService);
    await profiles.createWorkerProfileReference({
      workerIdentityId: worker.identityId,
      jurisdictionId: jurisdiction.id,
    });

    const home = (
      await request(app.getHttpServer())
        .get('/api/v1/experience/citizen/employment')
        .set('Authorization', `Bearer ${worker.sessionToken}`)
        .expect(200)
    ).body as { ruleEnvironment: string; profileReferenceNumber: string };

    expect(home.profileReferenceNumber).toMatch(/^WKPR-/);
    expect(home.ruleEnvironment).toBe('NON_PRODUCTION');
  });

  it('denies business workforce access without organization relationship', async () => {
    const outsider = await provisionAuthenticatedIdentity(app, prisma, {
      loginIdentifier: 'outsider-lab@test.local',
      password: 'OutsiderLab123!',
    });

    const organization = await prisma.organization.create({
      data: { code: 'ORG-LAB-1', name: 'Lab Org', status: OrganizationStatus.ACTIVE },
    });

    await request(app.getHttpServer())
      .get(`/api/v1/experience/business/organizations/${organization.id}/workforce`)
      .set('Authorization', `Bearer ${outsider.sessionToken}`)
      .expect(403);
  });
});
