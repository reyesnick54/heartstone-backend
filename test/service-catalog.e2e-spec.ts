import { type INestApplication } from '@nestjs/common';
import {
  GovernmentServiceMaturityStatus,
  GovernmentServicePublicAvailability,
} from '@prisma/client';
import request from 'supertest';
import { type App } from 'supertest/types';

import { PrismaService } from '../src/database/prisma.service';
import { isPubliclyActive } from '../src/service-catalog/common/public-availability.util';
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

describe('Phase 5A Service Catalog (e2e)', () => {
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

  it('administrative service catalog lifecycle with authority crosswalk', async () => {
    const fixture = await seedServiceCatalogFixture(app, prisma);
    const functionRecord = await seedFunctionAuthorityRecord(prisma, fixture.institutionId);

    const serviceRes = await request(app.getHttpServer())
      .post('/api/v1/service-catalog/services')
      .set('Authorization', `Bearer ${fixture.sessionToken}`)
      .send({
        code: 'DEV-CONST-001',
        slug: 'development-construction-permit',
        officialName: 'Development & Construction Permit',
        publicName: 'Apply for a Construction Permit',
        summary: 'Permits development and construction activities.',
        responsibleInstitutionId: fixture.institutionId,
        responsibleDepartmentId: fixture.departmentId,
        serviceFamilyId: fixture.serviceFamilyId,
      })
      .expect(201);

    const service = asGovernmentServiceBody(serviceRes.body);

    const listRes = await request(app.getHttpServer())
      .get('/api/v1/service-catalog/services')
      .set('Authorization', `Bearer ${fixture.sessionToken}`)
      .expect(200);

    const services = listRes.body as unknown[];
    expect(services).toHaveLength(1);
    expect(asGovernmentServiceBody(services[0]).id).toBe(service.id);

    const versionRes = await request(app.getHttpServer())
      .post(`/api/v1/service-catalog/services/${service.id}/versions`)
      .set('Authorization', `Bearer ${fixture.sessionToken}`)
      .send({
        version: '1.0.0',
        purpose: 'Initial service definition',
        publicDescription: 'Public-facing construction permit service.',
      })
      .expect(201);

    const version = asGovernmentServiceVersionBody(versionRes.body);

    expect(version.maturityStatus).toBe(GovernmentServiceMaturityStatus.DRAFT);
    expect(version.publicAvailability).toBe(GovernmentServicePublicAvailability.HIDDEN);

    const mappingRes = await request(app.getHttpServer())
      .post(`/api/v1/service-catalog/service-versions/${version.id}/functions`)
      .set('Authorization', `Bearer ${fixture.sessionToken}`)
      .send({
        functionAuthorityRecordId: functionRecord.id,
        sequenceOrder: 1,
        isConsequential: true,
        publicStageLabel: 'Permit Approval',
      })
      .expect(201);

    const mapping = asServiceFunctionMappingBody(mappingRes.body);
    expect(mapping.functionAuthorityRecordCode).toBe(functionRecord.code);

    await request(app.getHttpServer())
      .patch(`/api/v1/service-catalog/service-versions/${version.id}`)
      .set('Authorization', `Bearer ${fixture.sessionToken}`)
      .send({
        maturityStatus: GovernmentServiceMaturityStatus.ACTIVE,
        publicAvailability: GovernmentServicePublicAvailability.ACTIVE,
      })
      .expect(200);

    const activeVersion = asGovernmentServiceVersionBody(
      (
        await request(app.getHttpServer())
          .get(`/api/v1/service-catalog/service-versions/${version.id}`)
          .set('Authorization', `Bearer ${fixture.sessionToken}`)
          .expect(200)
      ).body,
    );

    expect(isPubliclyActive(activeVersion.maturityStatus, activeVersion.publicAvailability)).toBe(
      true,
    );

    await request(app.getHttpServer())
      .patch(`/api/v1/service-catalog/services/${service.id}`)
      .set('Authorization', `Bearer ${fixture.sessionToken}`)
      .send({ publicName: 'Construction Permit Applications' })
      .expect(200);

    const updatedService = asGovernmentServiceBody(
      (
        await request(app.getHttpServer())
          .get(`/api/v1/service-catalog/services/${service.id}`)
          .set('Authorization', `Bearer ${fixture.sessionToken}`)
          .expect(200)
      ).body,
    );

    expect(updatedService.publicName).toBe('Construction Permit Applications');
    expect(updatedService.code).toBe('DEV-CONST-001');
  });
});
