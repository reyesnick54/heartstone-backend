import { type INestApplication } from '@nestjs/common';
import { OrganizationStatus, TaxpayerAccountKind } from '@prisma/client';
import request from 'supertest';
import { type App } from 'supertest/types';

import { PrismaService } from '../src/database/prisma.service';
import { TaxpayerAccountService } from '../src/revenue/accounts/taxpayer-account.service';
import { REVENUE_TAX_ADMINISTRATION_TEMPLATE } from '../src/service-catalog/service-packs/revenue-tax-administration.template';
import { validateServicePackManifest } from '../src/service-catalog/service-packs/validate-service-pack';
import { provisionAuthenticatedIdentity } from './helpers/identity-provisioning.fixture';
import { createIntegrationApp, resetAllTestData } from './helpers/integration-app';

describe('Revenue & Tax Administration service pack and experience (integration)', () => {
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

  it('validates the revenue service pack manifest', () => {
    const result = validateServicePackManifest(REVENUE_TAX_ADMINISTRATION_TEMPLATE);
    expect(result.valid).toBe(true);
    expect(REVENUE_TAX_ADMINISTRATION_TEMPLATE.services).toHaveLength(14);
  });

  it('exposes citizen revenue home only for registered taxpayer account', async () => {
    const citizen = await provisionAuthenticatedIdentity(app, prisma, {
      loginIdentifier: 'citizen-rev@test.local',
      password: 'CitizenRev123!',
    });

    const jurisdiction = await prisma.jurisdiction.create({
      data: {
        code: 'JUR-REV-TEST',
        name: 'Revenue Test Jurisdiction',
        type: 'NATIONAL',
        status: 'ACTIVE',
      },
    });

    const taxpayerAccounts = app.get(TaxpayerAccountService);
    await taxpayerAccounts.registerAccount({
      jurisdictionId: jurisdiction.id,
      accountKind: TaxpayerAccountKind.INDIVIDUAL,
      displayName: 'Citizen Taxpayer',
      primaryIdentityId: citizen.identityId,
    });

    const home = (
      await request(app.getHttpServer())
        .get('/api/v1/experience/citizen/revenue')
        .set('Authorization', `Bearer ${citizen.sessionToken}`)
        .expect(200)
    ).body as {
      taxpayerIdentifier: string;
      ruleEnvironment: string;
      accountNumber: string;
    };

    expect(home.accountNumber).toMatch(/^TAXACCT-/);
    expect(home.ruleEnvironment).toBe('NON_PRODUCTION');
  });

  it('denies business revenue access without organization relationship', async () => {
    const outsider = await provisionAuthenticatedIdentity(app, prisma, {
      loginIdentifier: 'outsider-rev@test.local',
      password: 'OutsiderRev123!',
    });

    const organization = await prisma.organization.create({
      data: { code: 'ORG-REV-1', name: 'Rev Org', status: OrganizationStatus.ACTIVE },
    });

    await request(app.getHttpServer())
      .get(`/api/v1/experience/business/organizations/${organization.id}/revenue`)
      .set('Authorization', `Bearer ${outsider.sessionToken}`)
      .expect(403);
  });
});
