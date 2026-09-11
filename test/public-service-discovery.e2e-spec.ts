import { type INestApplication } from '@nestjs/common';
import {
  ApplicantCategory,
  CatalogServiceType,
  GovernmentServiceMaturityStatus,
  GovernmentServicePublicAvailability,
} from '@prisma/client';
import request from 'supertest';
import { type App } from 'supertest/types';

import { type PrismaService } from '../src/database/prisma.service';
import { ServiceCatalogCacheService } from '../src/service-catalog/common/service-catalog-cache.service';
import { ServiceCatalogLifecycleService } from '../src/service-catalog/common/service-catalog-lifecycle.service';
import { createIntegrationApp, resetAllTestData } from './helpers/integration-app';
import { seedPublicServiceDiscoveryFixture } from './helpers/public-service-discovery-fixtures';
import {
  asPaginatedPublicServicesBody,
  asPublicEligibilityBody,
  asPublicServiceDetailBody,
  asPublicServiceFamilyListBody,
  asPublicServiceSummaryListBody,
  asServiceStartPackageBody,
} from './helpers/public-service-test-types';

describe('Public service discovery (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let lifecycleService: ServiceCatalogLifecycleService;
  let cacheService: ServiceCatalogCacheService;

  beforeAll(async () => {
    ({ app, prisma } = await createIntegrationApp());
    lifecycleService = app.get(ServiceCatalogLifecycleService);
    cacheService = app.get(ServiceCatalogCacheService);
  });

  beforeEach(async () => {
    await resetAllTestData(prisma);
  });

  afterAll(async () => {
    await app.close();
  });

  it('lists only publicly authorized services and excludes suspended ones from active listings', async () => {
    const fixture = await seedPublicServiceDiscoveryFixture(prisma);

    const response = await request(app.getHttpServer())
      .get('/api/v1/public/services')
      .expect(200);

    const body = asPaginatedPublicServicesBody(response.body);
    expect(body.total).toBe(3);
    const slugs = body.items.map((item) => item.slug);
    expect(slugs).toEqual(
      expect.arrayContaining([
        fixture.activeServiceSlug,
        fixture.pilotServiceSlug,
        fixture.informationServiceSlug,
      ]),
    );
    expect(slugs).not.toContain(fixture.suspendedServiceSlug);
  });

  it('marks pilot-only services explicitly and exposes active service detail from the current version', async () => {
    const fixture = await seedPublicServiceDiscoveryFixture(prisma);

    const listResponse = await request(app.getHttpServer())
      .get('/api/v1/public/services')
      .query({ status: GovernmentServicePublicAvailability.PILOT_ONLY })
      .expect(200);

    const listBody = asPaginatedPublicServicesBody(listResponse.body);
    expect(listBody.items).toHaveLength(1);
    expect(listBody.items[0]).toMatchObject({
      slug: fixture.pilotServiceSlug,
      isPilotOnly: true,
      applicationCapable: true,
    });

    const detailResponse = await request(app.getHttpServer())
      .get(`/api/v1/public/services/${fixture.activeServiceSlug}`)
      .expect(200);

    const detailBody = asPublicServiceDetailBody(detailResponse.body);
    expect(detailBody).toMatchObject({
      serviceVersionId: fixture.activeServiceVersionId,
      availabilityStatus: GovernmentServicePublicAvailability.ACTIVE,
      responsibleDepartmentDisplayName: 'Licensing Department',
    });
    expect(detailBody).not.toHaveProperty('internalNotes');
    expect(detailBody).not.toHaveProperty('internalGoverningSourceMaterial');
    expect(detailBody).not.toHaveProperty('restrictedSecurityNotes');
    expect(detailBody).not.toHaveProperty('sensitiveConfig');
  });

  it('supports search and filtering by family, applicant category, and service type', async () => {
    const fixture = await seedPublicServiceDiscoveryFixture(prisma);

    const response = await request(app.getHttpServer())
      .get('/api/v1/public/services')
      .query({
        family: fixture.familyCode,
        applicantCategory: ApplicantCategory.INVESTOR,
        keyword: 'investor',
        serviceType: CatalogServiceType.APPLICATION,
      })
      .expect(200);

    const body = asPaginatedPublicServicesBody(response.body);
    expect(body.items).toHaveLength(1);
    expect(body.items[0]?.slug).toBe(fixture.pilotServiceSlug);
  });

  it('matches services from citizen-facing queries', async () => {
    await seedPublicServiceDiscoveryFixture(prisma);

    const response = await request(app.getHttpServer())
      .post('/api/v1/public/services/match')
      .send({
        query: 'operate a business',
        applicantCategory: ApplicantCategory.BUSINESS,
      })
      .expect(201);

    const body = asPublicServiceSummaryListBody(response.body);
    expect(body).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ slug: 'business-operating-licence' }),
      ]),
    );
  });

  it('returns nonbinding eligibility guidance without leaking restricted fields', async () => {
    const fixture = await seedPublicServiceDiscoveryFixture(prisma);

    const response = await request(app.getHttpServer())
      .post(`/api/v1/public/services/${fixture.activeServiceSlug}/eligibility`)
      .send({
        applicantCategory: ApplicantCategory.BUSINESS,
        attributes: { registeredBusiness: true },
      })
      .expect(201);

    const body = asPublicEligibilityBody(response.body);
    expect(body).toMatchObject({
      serviceVersionId: fixture.activeServiceVersionId,
      eligible: true,
    });
    expect(body.nonbindingDisclaimer).toContain('informational only');
  });

  it('returns a start package with exact version pins and does not create downstream phase-6 records', async () => {
    const fixture = await seedPublicServiceDiscoveryFixture(prisma);
    const versionsBefore = await prisma.governmentServiceVersion.count();
    const servicesBefore = await prisma.governmentService.count();

    const response = await request(app.getHttpServer())
      .get(`/api/v1/public/services/${fixture.activeServiceSlug}/start-package`)
      .expect(200);

    expect(await prisma.governmentServiceVersion.count()).toBe(versionsBefore);
    expect(await prisma.governmentService.count()).toBe(servicesBefore);

    const body = asServiceStartPackageBody(response.body);
    expect(body).toMatchObject({
      serviceId: fixture.activeServiceId,
      serviceVersionId: fixture.activeServiceVersionId,
      formDefinitionId: fixture.formDefinitionId,
      formVersionId: fixture.formVersionId,
      applicationCapable: true,
    });
    expect(body.formSchema?.properties).toMatchObject({
      businessName: expect.any(Object) as object,
    });
    expect(body.configurationFingerprint).toHaveLength(64);
  });

  it('rejects information-only start packages and superseded pinned requests', async () => {
    const fixture = await seedPublicServiceDiscoveryFixture(prisma);

    await request(app.getHttpServer())
      .get(`/api/v1/public/services/${fixture.informationServiceSlug}/start-package`)
      .expect(422);

    await request(app.getHttpServer())
      .get(`/api/v1/public/services/${fixture.activeServiceSlug}/start-package`)
      .query({ configurationFingerprint: 'stale-fingerprint' })
      .expect(409);
  });

  it('requires refresh when a superseded serviceVersionId is requested for a start package', async () => {
    const fixture = await seedPublicServiceDiscoveryFixture(prisma);

    const secondVersion = await prisma.governmentServiceVersion.create({
      data: {
        governmentServiceId: fixture.activeServiceId,
        version: '2.0.0',
        purpose: 'Updated business licence application pathway.',
        coveredActivities: 'operate business',
        publicDescription: 'Updated business licence application pathway.',
        authorityClassificationSummary: 'ABSEZ delegated licensing function',
        informationLastVerifiedAt: new Date('2026-09-10T00:00:00.000Z'),
        publicDisclaimer: 'Updated disclaimer.',
        maturityStatus: GovernmentServiceMaturityStatus.ACTIVE,
        publicAvailability: GovernmentServicePublicAvailability.ACTIVE,
        formDefinitionId: fixture.formDefinitionId,
        formVersionId: fixture.formVersionId,
      },
    });

    await prisma.governmentServiceVersion.update({
      where: { id: fixture.activeServiceVersionId },
      data: {
        supersededAt: new Date('2026-09-10T00:00:00.000Z'),
        maturityStatus: GovernmentServiceMaturityStatus.SUPERSEDED,
        publicAvailability: GovernmentServicePublicAvailability.UNAVAILABLE,
      },
    });

    await cacheService.invalidateService(fixture.activeServiceSlug);

    await request(app.getHttpServer())
      .get(`/api/v1/public/services/${fixture.activeServiceSlug}/start-package`)
      .query({ serviceVersionId: fixture.activeServiceVersionId })
      .expect(409);

    const currentPackage = await request(app.getHttpServer())
      .get(`/api/v1/public/services/${fixture.activeServiceSlug}/start-package`)
      .expect(200);

    const body = asServiceStartPackageBody(currentPackage.body);
    expect(body.serviceVersionId).toBe(secondVersion.id);
  });

  it('invalidates cached active listings when a service is suspended', async () => {
    const fixture = await seedPublicServiceDiscoveryFixture(prisma);

    const cacheSetSpy = jest.spyOn(cacheService, 'set');
    const invalidateSpy = jest.spyOn(cacheService, 'invalidateService');

    await request(app.getHttpServer()).get('/api/v1/public/services').expect(200);
    expect(cacheSetSpy).toHaveBeenCalled();

    cacheSetSpy.mockClear();
    await lifecycleService.suspendServiceVersion(fixture.activeServiceVersionId);
    expect(invalidateSpy).toHaveBeenCalledWith(fixture.activeServiceSlug);

    const response = await request(app.getHttpServer())
      .get('/api/v1/public/services')
      .expect(200);

    const body = asPaginatedPublicServicesBody(response.body);
    const slugs = body.items.map((item) => item.slug);
    expect(slugs).not.toContain(fixture.activeServiceSlug);
  });

  it('lists public service families', async () => {
    const fixture = await seedPublicServiceDiscoveryFixture(prisma);

    const response = await request(app.getHttpServer())
      .get('/api/v1/public/service-families')
      .expect(200);

    const body = asPublicServiceFamilyListBody(response.body);
    expect(body).toEqual([
      expect.objectContaining({
        code: fixture.familyCode,
        name: 'Business Licensing',
      }),
    ]);
  });
});
