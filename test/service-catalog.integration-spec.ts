import { type INestApplication } from '@nestjs/common';
import {
  ApplicantCategory,
  FunctionAuthorityLifecycleStatus,
  GovernmentServiceMaturityStatus,
  GovernmentServicePublicAvailability,
} from '@prisma/client';
import request from 'supertest';
import { type App } from 'supertest/types';

import { PrismaService } from '../src/database/prisma.service';
import {
  isPubliclyActive,
  isSuspendedFromPublic,
} from '../src/service-catalog/common/public-availability.util';
import { createIntegrationApp, resetAllTestData } from './helpers/integration-app';
import {
  seedFunctionAuthorityRecord,
  seedServiceCatalogFixture,
} from './helpers/service-catalog-test-fixtures';
import {
  asGovernmentServiceBody,
  asGovernmentServiceVersionBody,
  asServiceFunctionMappingBody,
} from './helpers/service-catalog-test-types';

describe('Phase 5A Service Catalog (integration)', () => {
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

  it('rejects unauthenticated service catalog administration', async () => {
    await request(app.getHttpServer()).get('/api/v1/service-catalog/services').expect(401);
  });

  it('creates a service with unique code and slug and links versions to stable identity', async () => {
    const fixture = await seedServiceCatalogFixture(app, prisma);

    const serviceRes = await request(app.getHttpServer())
      .post('/api/v1/service-catalog/services')
      .set('Authorization', `Bearer ${fixture.sessionToken}`)
      .send({
        code: 'CORP-REG-001',
        slug: 'corporate-registration',
        officialName: 'Corporate Registration Service',
        publicName: 'Register Your Business',
        summary: 'Registers new corporate entities.',
        responsibleInstitutionId: fixture.institutionId,
        responsibleDepartmentId: fixture.departmentId,
        serviceFamilyId: fixture.serviceFamilyId,
      })
      .expect(201);

    const service = asGovernmentServiceBody(serviceRes.body);

    await request(app.getHttpServer())
      .post('/api/v1/service-catalog/services')
      .set('Authorization', `Bearer ${fixture.sessionToken}`)
      .send({
        code: 'CORP-REG-001',
        slug: 'duplicate-code',
        officialName: 'Duplicate',
        publicName: 'Duplicate',
        responsibleInstitutionId: fixture.institutionId,
        responsibleDepartmentId: fixture.departmentId,
        serviceFamilyId: fixture.serviceFamilyId,
      })
      .expect(409);

    await request(app.getHttpServer())
      .post('/api/v1/service-catalog/services')
      .set('Authorization', `Bearer ${fixture.sessionToken}`)
      .send({
        code: 'CORP-REG-002',
        slug: 'corporate-registration',
        officialName: 'Duplicate Slug',
        publicName: 'Duplicate Slug',
        responsibleInstitutionId: fixture.institutionId,
        responsibleDepartmentId: fixture.departmentId,
        serviceFamilyId: fixture.serviceFamilyId,
      })
      .expect(409);

    const versionOneRes = await request(app.getHttpServer())
      .post(`/api/v1/service-catalog/services/${service.id}/versions`)
      .set('Authorization', `Bearer ${fixture.sessionToken}`)
      .send({
        version: '1.0.0',
        purpose: 'Initial publication',
        applicantCategories: [ApplicantCategory.BUSINESS, ApplicantCategory.COMPANY],
      })
      .expect(201);

    const versionOne = asGovernmentServiceVersionBody(versionOneRes.body);

    const versionTwoRes = await request(app.getHttpServer())
      .post(`/api/v1/service-catalog/services/${service.id}/versions`)
      .set('Authorization', `Bearer ${fixture.sessionToken}`)
      .send({ version: '2.0.0', purpose: 'Revised publication' })
      .expect(201);

    const versionTwo = asGovernmentServiceVersionBody(versionTwoRes.body);

    const versionsRes = await request(app.getHttpServer())
      .get(`/api/v1/service-catalog/services/${service.id}/versions`)
      .set('Authorization', `Bearer ${fixture.sessionToken}`)
      .expect(200);

    expect(versionsRes.body).toHaveLength(2);

    const oldVersionRes = await request(app.getHttpServer())
      .get(`/api/v1/service-catalog/service-versions/${versionOne.id}`)
      .set('Authorization', `Bearer ${fixture.sessionToken}`)
      .expect(200);

    expect(asGovernmentServiceVersionBody(oldVersionRes.body)).toMatchObject({
      id: versionOne.id,
      governmentServiceId: service.id,
      version: '1.0.0',
    });

    await request(app.getHttpServer())
      .patch(`/api/v1/service-catalog/service-versions/${versionTwo.id}`)
      .set('Authorization', `Bearer ${fixture.sessionToken}`)
      .send({
        maturityStatus: GovernmentServiceMaturityStatus.SUPERSEDED,
        publicAvailability: GovernmentServicePublicAvailability.HIDDEN,
      })
      .expect(400);

    await prisma.governmentServiceVersion.update({
      where: { id: versionTwo.id },
      data: {
        maturityStatus: GovernmentServiceMaturityStatus.SUPERSEDED,
        publicAvailability: GovernmentServicePublicAvailability.HIDDEN,
      },
    });

    const supersededRes = await request(app.getHttpServer())
      .get(`/api/v1/service-catalog/service-versions/${versionTwo.id}`)
      .set('Authorization', `Bearer ${fixture.sessionToken}`)
      .expect(200);

    expect(asGovernmentServiceVersionBody(supersededRes.body).maturityStatus).toBe(
      GovernmentServiceMaturityStatus.SUPERSEDED,
    );
  });

  it('maps service versions to Phase 4 function authority records without creating authority', async () => {
    const fixture = await seedServiceCatalogFixture(app, prisma);
    const functionRecord = await seedFunctionAuthorityRecord(prisma, fixture.institutionId);

    const authorityCountBefore = await prisma.functionAuthorityRecord.count();

    const serviceRes = await request(app.getHttpServer())
      .post('/api/v1/service-catalog/services')
      .set('Authorization', `Bearer ${fixture.sessionToken}`)
      .send({
        code: 'LIC-001',
        slug: 'business-license',
        officialName: 'Business License Service',
        publicName: 'Apply for a Business License',
        responsibleInstitutionId: fixture.institutionId,
        responsibleDepartmentId: fixture.departmentId,
        serviceFamilyId: fixture.serviceFamilyId,
      })
      .expect(201);

    const service = asGovernmentServiceBody(serviceRes.body);

    const versionRes = await request(app.getHttpServer())
      .post(`/api/v1/service-catalog/services/${service.id}/versions`)
      .set('Authorization', `Bearer ${fixture.sessionToken}`)
      .send({ version: '1.0.0' })
      .expect(201);

    const version = asGovernmentServiceVersionBody(versionRes.body);

    const mappingRes = await request(app.getHttpServer())
      .post(`/api/v1/service-catalog/service-versions/${version.id}/functions`)
      .set('Authorization', `Bearer ${fixture.sessionToken}`)
      .send({
        functionAuthorityRecordId: functionRecord.id,
        isConsequential: true,
        publicStageLabel: 'License Issuance',
      })
      .expect(201);

    const mapping = asServiceFunctionMappingBody(mappingRes.body);

    expect(mapping).toMatchObject({
      functionAuthorityRecordId: functionRecord.id,
      isConsequential: true,
      functionAuthorityRecordCode: functionRecord.code,
    });

    const authorityCountAfter = await prisma.functionAuthorityRecord.count();
    expect(authorityCountAfter).toBe(authorityCountBefore);

    const functionRecordAfter = await prisma.functionAuthorityRecord.findUnique({
      where: { id: functionRecord.id },
    });

    expect(functionRecordAfter?.lifecycleStatus).toBe(FunctionAuthorityLifecycleStatus.DRAFT);

    const mappingsRes = await request(app.getHttpServer())
      .get(`/api/v1/service-catalog/service-versions/${version.id}/functions`)
      .set('Authorization', `Bearer ${fixture.sessionToken}`)
      .expect(200);

    const mappings = mappingsRes.body as unknown[];
    expect(mappings).toHaveLength(1);
    expect(asServiceFunctionMappingBody(mappings[0]).functionAuthorityRecordId).toBe(
      functionRecord.id,
    );
  });

  it('distinguishes CONFIGURED maturity from ACTIVE and suspended public availability', async () => {
    const fixture = await seedServiceCatalogFixture(app, prisma);

    const serviceRes = await request(app.getHttpServer())
      .post('/api/v1/service-catalog/services')
      .set('Authorization', `Bearer ${fixture.sessionToken}`)
      .send({
        code: 'INV-001',
        slug: 'investor-service',
        officialName: 'Investor Service',
        publicName: 'Investor Services',
        responsibleInstitutionId: fixture.institutionId,
        responsibleDepartmentId: fixture.departmentId,
        serviceFamilyId: fixture.serviceFamilyId,
      })
      .expect(201);

    const service = asGovernmentServiceBody(serviceRes.body);

    const versionRes = await request(app.getHttpServer())
      .post(`/api/v1/service-catalog/services/${service.id}/versions`)
      .set('Authorization', `Bearer ${fixture.sessionToken}`)
      .send({ version: '1.0.0' })
      .expect(201);

    const version = asGovernmentServiceVersionBody(versionRes.body);

    await request(app.getHttpServer())
      .patch(`/api/v1/service-catalog/service-versions/${version.id}`)
      .set('Authorization', `Bearer ${fixture.sessionToken}`)
      .send({
        maturityStatus: GovernmentServiceMaturityStatus.CONFIGURED,
        publicAvailability: GovernmentServicePublicAvailability.ACTIVE,
      })
      .expect(400);

    await prisma.governmentServiceVersion.update({
      where: { id: version.id },
      data: {
        maturityStatus: GovernmentServiceMaturityStatus.CONFIGURED,
        publicAvailability: GovernmentServicePublicAvailability.ACTIVE,
      },
    });

    const configuredVersion = asGovernmentServiceVersionBody(
      (
        await request(app.getHttpServer())
          .get(`/api/v1/service-catalog/service-versions/${version.id}`)
          .set('Authorization', `Bearer ${fixture.sessionToken}`)
          .expect(200)
      ).body,
    );

    expect(
      isPubliclyActive(configuredVersion.maturityStatus, configuredVersion.publicAvailability),
    ).toBe(false);

    await request(app.getHttpServer())
      .patch(`/api/v1/service-catalog/service-versions/${version.id}`)
      .set('Authorization', `Bearer ${fixture.sessionToken}`)
      .send({
        maturityStatus: GovernmentServiceMaturityStatus.ACTIVE,
        publicAvailability: GovernmentServicePublicAvailability.SUSPENDED,
      })
      .expect(400);

    await prisma.governmentServiceVersion.update({
      where: { id: version.id },
      data: {
        maturityStatus: GovernmentServiceMaturityStatus.ACTIVE,
        publicAvailability: GovernmentServicePublicAvailability.SUSPENDED,
      },
    });

    const suspendedVersion = asGovernmentServiceVersionBody(
      (
        await request(app.getHttpServer())
          .get(`/api/v1/service-catalog/service-versions/${version.id}`)
          .set('Authorization', `Bearer ${fixture.sessionToken}`)
          .expect(200)
      ).body,
    );

    expect(
      isSuspendedFromPublic(suspendedVersion.maturityStatus, suspendedVersion.publicAvailability),
    ).toBe(true);
    expect(
      isPubliclyActive(suspendedVersion.maturityStatus, suspendedVersion.publicAvailability),
    ).toBe(false);
  });

  it('allows service families to expand without code changes', async () => {
    const fixture = await seedServiceCatalogFixture(app, prisma);

    const newFamily = await prisma.serviceFamily.create({
      data: {
        code: 'IMMIGRATION-RESIDENCY',
        name: 'Immigration / Residency',
      },
    });

    const serviceRes = await request(app.getHttpServer())
      .post('/api/v1/service-catalog/services')
      .set('Authorization', `Bearer ${fixture.sessionToken}`)
      .send({
        code: 'IMM-001',
        slug: 'residency-permit',
        officialName: 'Residency Permit Service',
        publicName: 'Apply for Residency',
        responsibleInstitutionId: fixture.institutionId,
        responsibleDepartmentId: fixture.departmentId,
        serviceFamilyId: newFamily.id,
      })
      .expect(201);

    expect(asGovernmentServiceBody(serviceRes.body).serviceFamilyId).toBe(newFamily.id);
  });
});
