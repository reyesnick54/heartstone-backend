import { type INestApplication } from '@nestjs/common';
import {
  ApplicantCategory,
  GovernmentServiceMaturityStatus,
  GovernmentServicePublicAvailability,
  IdentityType,
  OrganizationStatus,
  RepresentativeAuthorityStatus,
} from '@prisma/client';
import request from 'supertest';
import { type App } from 'supertest/types';

import { PrismaService } from '../src/database/prisma.service';
import { ServiceCatalogCacheService } from '../src/service-catalog/common/service-catalog-cache.service';
import { ServiceCatalogLifecycleService } from '../src/service-catalog/common/service-catalog-lifecycle.service';
import { seedPhase5RepresentativeCatalog } from '../src/service-catalog/fixtures/phase-5-representative-catalog.fixture';
import { createIntegrationApp, resetAllTestData } from './helpers/integration-app';
import {
  asPaginatedPublicServicesBody,
  asPublicEligibilityBody,
  asPublicServiceDetailBody,
  asServiceStartPackageBody,
} from './helpers/public-service-test-types';
import { seedFunctionAuthorityRecord } from './helpers/service-catalog-test-fixtures';

const PHASE_6_PLUS_TABLES = ['applications', 'cases'] as const;

describe('Phase 5H representative scenarios (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let lifecycleService: ServiceCatalogLifecycleService;
  let cacheService: ServiceCatalogCacheService;

  beforeAll(async () => {
    ({ app } = await createIntegrationApp());
    prisma = app.get(PrismaService);
    lifecycleService = app.get(ServiceCatalogLifecycleService);
    cacheService = app.get(ServiceCatalogCacheService);
  });

  beforeEach(async () => {
    await resetAllTestData(prisma);
  });

  afterAll(async () => {
    await app.close();
  });

  async function seedRepresentativeCatalog() {
    const jurisdiction = await prisma.jurisdiction.create({
      data: { code: 'REP-JUR', name: 'Representative Jurisdiction', type: 'NATIONAL' },
    });
    const institution = await prisma.institution.create({
      data: {
        jurisdictionId: jurisdiction.id,
        code: 'REP-INST',
        name: 'Representative Institution',
        type: 'AGENCY',
      },
    });
    const functionRecord = await seedFunctionAuthorityRecord(prisma, institution.id);
    return seedPhase5RepresentativeCatalog(prisma, functionRecord.id);
  }

  async function expectNoPhase6Records(): Promise<void> {
    for (const tableName of PHASE_6_PLUS_TABLES) {
      const rows = await prisma.$queryRawUnsafe<{ count: bigint }[]>(
        'SELECT COUNT(*) as count FROM information_schema.tables WHERE table_schema = current_schema() AND table_name = $1',
        tableName,
      );
      expect(Number(rows[0]?.count ?? 0) > 0).toBe(false);
    }
  }

  it('1. Service Discovery', async () => {
    const catalog = await seedRepresentativeCatalog();

    const response = await request(app.getHttpServer()).get('/api/v1/public/services').expect(200);
    const body = asPaginatedPublicServicesBody(response.body);

    expect(body.total).toBe(8);
    expect(body.items.map((item) => item.slug).sort()).toEqual(
      catalog.services.map((service) => service.slug).sort(),
    );

    const licensing = catalog.services.find(
      (service) => service.slug === 'business-operating-licence',
    );
    if (!licensing) {
      throw new Error('Expected business licensing representative service');
    }

    const detail = await request(app.getHttpServer())
      .get(`/api/v1/public/services/${licensing.slug}`)
      .expect(200);

    const detailBody = asPublicServiceDetailBody(detail.body);
    expect(detailBody).toMatchObject({
      slug: licensing.slug,
      serviceFamilyName: 'Business Licensing',
      applicationCapable: true,
    });
    expect(detailBody).not.toHaveProperty('internalNotes');
    expect(detailBody).not.toHaveProperty('sensitiveConfig');

    await expectNoPhase6Records();
  });

  it('2. Guided Eligibility', async () => {
    const catalog = await seedRepresentativeCatalog();
    const licensing = catalog.services.find(
      (service) => service.slug === 'business-operating-licence',
    );
    if (!licensing) {
      throw new Error('Expected business licensing representative service');
    }

    const eligible = await request(app.getHttpServer())
      .post(`/api/v1/public/services/${licensing.slug}/eligibility`)
      .send({
        applicantCategory: ApplicantCategory.BUSINESS,
        attributes: { businessName: 'Example Trading Ltd' },
      })
      .expect(201);

    const eligibleBody = asPublicEligibilityBody(eligible.body);
    expect(eligibleBody).toMatchObject({
      serviceVersionId: licensing.serviceVersionId,
      eligible: true,
    });
    expect(eligibleBody.matchedRules).toContain('REGISTERED_BUSINESS');
    expect(eligibleBody.nonbindingDisclaimer).toContain('informational only');

    const ineligible = await request(app.getHttpServer())
      .post(`/api/v1/public/services/${licensing.slug}/eligibility`)
      .send({
        applicantCategory: ApplicantCategory.BUSINESS,
        attributes: {},
      })
      .expect(201);

    const ineligibleBody = asPublicEligibilityBody(ineligible.body);
    expect(ineligibleBody.eligible).toBe(false);
    expect(ineligibleBody.unmatchedRequiredRules).toContain('REGISTERED_BUSINESS');

    await expectNoPhase6Records();
  });

  it('3. Conditional Form', async () => {
    const catalog = await seedRepresentativeCatalog();
    const licensing = catalog.services.find(
      (service) => service.slug === 'business-operating-licence',
    );
    if (!licensing) {
      throw new Error('Expected business licensing representative service');
    }

    const response = await request(app.getHttpServer())
      .get(`/api/v1/public/services/${licensing.slug}/start-package`)
      .expect(200);

    const body = asServiceStartPackageBody(response.body);
    expect(body).toMatchObject({
      serviceVersionId: licensing.serviceVersionId,
      formDefinitionId: licensing.formDefinitionId,
      formVersionId: licensing.formVersionId,
      applicationCapable: true,
    });

    const conditional = body.conditionalChecklist.find(
      (item) => item.itemCode === 'RESTRICTED_ACTIVITY_DETAIL',
    );
    expect(conditional).toMatchObject({
      isRequired: true,
      conditionExpression: { field: 'activityType', equals: 'RESTRICTED' },
    });
    expect(body.formSchema?.properties?.activityType).toBeDefined();
    expect(body.formSchema?.properties?.restrictedActivityDetail).toBeDefined();

    await expectNoPhase6Records();
  });

  it('4. Representative', async () => {
    const catalog = await seedRepresentativeCatalog();
    const customs = catalog.services.find((service) => service.slug === 'customs-trade-clearance');
    if (!customs) {
      throw new Error('Expected customs representative service');
    }

    const organization = await prisma.organization.create({
      data: {
        code: 'REP-ORG',
        name: 'Authorized Representative Org',
        status: OrganizationStatus.ACTIVE,
      },
    });
    const repIdentity = await prisma.identity.create({
      data: { type: IdentityType.INDIVIDUAL, displayName: 'Authorized Representative' },
    });
    await prisma.representativeAuthority.create({
      data: {
        organizationId: organization.id,
        identityId: repIdentity.id,
        scopeDescription: 'Customs clearance representation',
        status: RepresentativeAuthorityStatus.ACTIVE,
        effectiveFrom: new Date('2020-01-01'),
      },
    });

    const beforeFnCount = await prisma.functionAuthorityRecord.count();

    const response = await request(app.getHttpServer())
      .post(`/api/v1/public/services/${customs.slug}/eligibility`)
      .send({
        applicantCategory: ApplicantCategory.AUTHORIZED_REPRESENTATIVE,
        attributes: {
          shipmentReference: 'SHIP-001',
          representativeAuthorityId: repIdentity.id,
        },
      })
      .expect(201);

    const body = asPublicEligibilityBody(response.body);
    expect(body.eligible).toBe(true);
    expect(body.nonbindingDisclaimer).toContain('informational only');
    expect(await prisma.functionAuthorityRecord.count()).toBe(beforeFnCount);

    await expectNoPhase6Records();
  });

  it('5. Service Suspension', async () => {
    const catalog = await seedRepresentativeCatalog();
    const immigration = catalog.services.find(
      (service) => service.slug === 'immigration-residency',
    );
    if (!immigration) {
      throw new Error('Expected immigration representative service');
    }

    const beforeList = await request(app.getHttpServer())
      .get('/api/v1/public/services')
      .expect(200);
    expect(
      asPaginatedPublicServicesBody(beforeList.body).items.some(
        (item) => item.slug === immigration.slug,
      ),
    ).toBe(true);

    await lifecycleService.suspendServiceVersion(immigration.serviceVersionId);

    const afterList = await request(app.getHttpServer()).get('/api/v1/public/services').expect(200);
    expect(
      asPaginatedPublicServicesBody(afterList.body).items.some(
        (item) => item.slug === immigration.slug,
      ),
    ).toBe(false);

    await request(app.getHttpServer())
      .get(`/api/v1/public/services/${immigration.slug}/start-package`)
      .expect(404);

    await expectNoPhase6Records();
  });

  it('6. Version Change', async () => {
    const catalog = await seedRepresentativeCatalog();
    const corporate = catalog.services.find((service) => service.slug === 'corporate-registration');
    if (!corporate) {
      throw new Error('Expected corporate registration representative service');
    }

    const v1Package = await request(app.getHttpServer())
      .get(`/api/v1/public/services/${corporate.slug}/start-package`)
      .expect(200);

    const v1Body = asServiceStartPackageBody(v1Package.body);

    const version2 = await prisma.governmentServiceVersion.create({
      data: {
        governmentServiceId: corporate.serviceId,
        version: '2.0.0',
        purpose: 'Updated corporate registration pathway.',
        coveredActivities: 'incorporate company',
        publicDescription: 'Updated corporate registration pathway.',
        authorityClassificationSummary: 'ABSEZ delegated registration function',
        informationLastVerifiedAt: new Date('2026-09-10T00:00:00.000Z'),
        publicDisclaimer: 'Updated disclaimer.',
        maturityStatus: GovernmentServiceMaturityStatus.ACTIVE,
        publicAvailability: GovernmentServicePublicAvailability.ACTIVE,
        formDefinitionId: corporate.formDefinitionId,
        formVersionId: corporate.formVersionId,
      },
    });

    await prisma.governmentServiceVersion.update({
      where: { id: corporate.serviceVersionId },
      data: {
        supersededAt: new Date('2026-09-10T00:00:00.000Z'),
        maturityStatus: GovernmentServiceMaturityStatus.SUPERSEDED,
        publicAvailability: GovernmentServicePublicAvailability.UNAVAILABLE,
      },
    });

    await cacheService.invalidateService(corporate.slug);

    await request(app.getHttpServer())
      .get(`/api/v1/public/services/${corporate.slug}/start-package`)
      .query({ serviceVersionId: corporate.serviceVersionId })
      .expect(409);

    const currentPackage = await request(app.getHttpServer())
      .get(`/api/v1/public/services/${corporate.slug}/start-package`)
      .expect(200);

    const currentBody = asServiceStartPackageBody(currentPackage.body);
    expect(currentBody.serviceVersionId).toBe(version2.id);
    expect(currentBody.serviceVersionId).not.toBe(v1Body.serviceVersionId);
    expect(currentBody.configurationFingerprint).not.toBe(v1Body.configurationFingerprint);

    await expectNoPhase6Records();
  });
});
