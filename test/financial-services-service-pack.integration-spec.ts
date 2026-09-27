import { type INestApplication } from '@nestjs/common';
import { OrganizationStatus } from '@prisma/client';
import { type App } from 'supertest/types';

import { PrismaService } from '../src/database/prisma.service';
import { FinancialRegulatedEntityProfileService } from '../src/financial-services/profiles/financial-regulated-entity-profile.service';
import { FINANCIAL_SERVICES_SERVICE_PACK_TEMPLATE } from '../src/service-catalog/service-packs/financial-services-service-pack.template';
import { validateServicePackManifest } from '../src/service-catalog/service-packs/validate-service-pack';
import { createIntegrationApp, resetAllTestData } from './helpers/integration-app';

describe('Financial services administration (integration)', () => {
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

  it('validates the financial services service pack manifest', () => {
    const result = validateServicePackManifest(FINANCIAL_SERVICES_SERVICE_PACK_TEMPLATE);
    expect(result.valid).toBe(true);
    expect(FINANCIAL_SERVICES_SERVICE_PACK_TEMPLATE.services.length).toBeGreaterThanOrEqual(6);
    for (const service of FINANCIAL_SERVICES_SERVICE_PACK_TEMPLATE.services) {
      expect(service.serviceFamilyCode).toBe('TEMPLATE-FAMILY-FINANCIAL-SERVICES');
    }
  });

  it('registers regulated entity profile against canonical organization', async () => {
    const organization = await prisma.organization.create({
      data: { code: 'ORG-FS-1', name: 'FS Test Org', status: OrganizationStatus.ACTIVE },
    });

    const profiles = app.get(FinancialRegulatedEntityProfileService);
    const profile = await profiles.registerRegulatedEntity({
      organizationId: organization.id,
      activityCategoryCode: 'CONFIGURED_ACTIVITY_CATEGORY',
    });

    expect(profile.entityReference).toMatch(/^FSRE-/);
    expect(profile.organizationId).toBe(organization.id);
    expect(profile.delegatedLicenceFunctionActivation).toBe('INACTIVE');
  });
});
