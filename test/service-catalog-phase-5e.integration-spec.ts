import { type INestApplication } from '@nestjs/common';
import { ServiceOperatingMetadataStatus } from '@prisma/client';
import request from 'supertest';
import { type App } from 'supertest/types';

import { type PrismaService } from '../src/database/prisma.service';
import { seedPhase5eOperatingMetadataFixture } from '../src/service-catalog/fixtures/phase-5e-test-fixtures';
import { createIntegrationApp, resetAllTestData } from './helpers/integration-app';
import {
  asServiceDependencyDefinitionListBody,
  asServiceFeeDefinitionBody,
  asServiceFeeDefinitionListBody,
  asServiceLevelTargetListBody,
  asServiceOutputDefinitionListBody,
  asServiceRedressRouteListBody,
} from './helpers/service-catalog-test-types';

describe('Phase 5E service operating metadata (integration)', () => {
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

  it('links fee definitions to governing source and reconstructs historical versions', async () => {
    const fixture = await seedPhase5eOperatingMetadataFixture(prisma);

    const response = await request(app.getHttpServer())
      .get(`/api/v1/service-catalog/fee-definitions/by-service-version/${fixture.serviceVersionId}`)
      .expect(200);

    const fees = asServiceFeeDefinitionListBody(response.body);
    expect(fees).toHaveLength(2);
    for (const fee of fees) {
      expect(fee.governingSourceId).toBe(fixture.governingSourceId);
      expect(fee.waived).toBe(false);
      expect(fee).not.toHaveProperty('paymentStatus');
      expect(fee).not.toHaveProperty('isPaid');
    }

    const currentResponse = await request(app.getHttpServer())
      .get(
        `/api/v1/service-catalog/fee-definitions/current/by-service-version/${fixture.serviceVersionId}?feeCode=APPLICATION_FEE`,
      )
      .expect(200);

    const currentFee = asServiceFeeDefinitionBody(currentResponse.body);
    expect(currentFee.fixedAmount).toBe('300.00');
    expect(currentFee.isCurrent).toBe(true);

    const expiredFee = fees.find((fee) => fee.fixedAmount === '250.00');
    expect(expiredFee?.isCurrent).toBe(false);
  });

  it('exposes SLA metadata without implying approval on expiry', async () => {
    const fixture = await seedPhase5eOperatingMetadataFixture(prisma);

    const response = await request(app.getHttpServer())
      .get(`/api/v1/service-catalog/level-targets/by-service-version/${fixture.serviceVersionId}`)
      .expect(200);

    const targets = asServiceLevelTargetListBody(response.body);
    expect(targets).toHaveLength(1);
    expect(targets[0]?.approved).toBe(false);
    expect(targets[0]?.isCurrent).toBe(true);
  });

  it('describes external dependency metadata without transferring authority', async () => {
    const fixture = await seedPhase5eOperatingMetadataFixture(prisma);

    const response = await request(app.getHttpServer())
      .get(
        `/api/v1/service-catalog/dependency-definitions/by-service-version/${fixture.serviceVersionId}`,
      )
      .expect(200);

    const dependencies = asServiceDependencyDefinitionListBody(response.body);
    expect(dependencies).toHaveLength(1);
    expect(dependencies[0]?.authorityDependencyId).toBe(fixture.authorityDependencyId);
    expect(dependencies[0]?.authorityTransferred).toBe(false);
    expect(dependencies[0]?.metadataOnly).toBe(true);
  });

  it('defines certificate and decision outputs without issuing or deciding', async () => {
    const fixture = await seedPhase5eOperatingMetadataFixture(prisma);

    const response = await request(app.getHttpServer())
      .get(
        `/api/v1/service-catalog/output-definitions/by-service-version/${fixture.serviceVersionId}`,
      )
      .expect(200);

    const outputs = asServiceOutputDefinitionListBody(response.body);
    expect(outputs).toHaveLength(2);
    for (const output of outputs) {
      expect(output.issued).toBe(false);
      expect(output).not.toHaveProperty('issuedCertificateId');
      expect(output).not.toHaveProperty('decisionOutcome');
    }
  });

  it('defines appeal route metadata without deciding appeal', async () => {
    const fixture = await seedPhase5eOperatingMetadataFixture(prisma);

    const response = await request(app.getHttpServer())
      .get(`/api/v1/service-catalog/redress-routes/by-service-version/${fixture.serviceVersionId}`)
      .expect(200);

    const routes = asServiceRedressRouteListBody(response.body);
    expect(routes).toHaveLength(1);
    expect(routes[0]?.routeType).toBe('APPEAL');
    expect(routes[0]?.decided).toBe(false);
  });

  it('creates operating metadata through API with governing source linkage', async () => {
    const fixture = await seedPhase5eOperatingMetadataFixture(prisma);

    const feeResponse = await request(app.getHttpServer())
      .post('/api/v1/service-catalog/fee-definitions')
      .send({
        serviceVersionId: fixture.serviceVersionId,
        feeCode: 'LATE_FEE',
        name: 'Late Submission Fee',
        currency: 'XCD',
        calculationType: 'NO_FEE',
        governingSourceId: fixture.governingSourceId,
        collectingInstitutionId: fixture.institutionId,
        refundability: 'NON_REFUNDABLE',
        effectiveFrom: '2024-01-01',
        status: ServiceOperatingMetadataStatus.ACTIVE,
      })
      .expect(201);

    const createdFee = asServiceFeeDefinitionBody(feeResponse.body);
    expect(createdFee.governingSourceId).toBe(fixture.governingSourceId);
    expect(createdFee.waived).toBe(false);
  });
});
