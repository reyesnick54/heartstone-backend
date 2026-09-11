import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { type INestApplication } from '@nestjs/common';
import request from 'supertest';
import { type App } from 'supertest/types';

import { type PrismaService } from '../src/database/prisma.service';
import { seedPhase5eOperatingMetadataFixture } from '../src/service-catalog/fixtures/phase-5e-test-fixtures';
import { FORBIDDEN_SERVICE_CATALOG_BOUNDARY_FIELDS } from '../src/service-catalog/service-catalog-schema.constants';
import { createIntegrationApp, resetAllTestData } from './helpers/integration-app';
import { asServiceFeeDefinitionListBody } from './helpers/service-catalog-test-types';

const SCHEMA_PATH = join(__dirname, '../prisma/schema.prisma');

describe('Phase 5E must-fail invariants (e2e)', () => {
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

  it('does not expose payment state on fee definition responses', async () => {
    const fixture = await seedPhase5eOperatingMetadataFixture(prisma);

    const response = await request(app.getHttpServer())
      .get(`/api/v1/service-catalog/fee-definitions/by-service-version/${fixture.serviceVersionId}`)
      .expect(200);

    const fees = asServiceFeeDefinitionListBody(response.body);
    for (const fee of fees) {
      for (const forbiddenField of FORBIDDEN_SERVICE_CATALOG_BOUNDARY_FIELDS) {
        expect(fee).not.toHaveProperty(forbiddenField);
      }
    }
  });

  it('does not include payment fields in Phase 5 Prisma schema models', () => {
    const schema = readFileSync(SCHEMA_PATH, 'utf-8');
    const serviceCatalogModels = [
      'GovernmentService',
      'ServiceVersion',
      'ServiceFeeDefinition',
      'ServiceLevelTarget',
      'ServiceDependencyDefinition',
      'ServiceOutputDefinition',
      'ServiceRedressRoute',
    ];

    for (const modelName of serviceCatalogModels) {
      const pattern = new RegExp(`model ${modelName}\\s*\\{([^}]*)\\}`, 's');
      const block = pattern.exec(schema)?.[1] ?? '';
      for (const forbiddenField of FORBIDDEN_SERVICE_CATALOG_BOUNDARY_FIELDS) {
        expect(block).not.toMatch(new RegExp(`\\b${forbiddenField}\\b`));
      }
    }
  });

  it('rejects fee creation without governing source reference', async () => {
    const fixture = await seedPhase5eOperatingMetadataFixture(prisma);

    await request(app.getHttpServer())
      .post('/api/v1/service-catalog/fee-definitions')
      .send({
        serviceVersionId: fixture.serviceVersionId,
        feeCode: 'ORPHAN_FEE',
        name: 'Orphan Fee',
        currency: 'XCD',
        calculationType: 'FIXED',
        fixedAmount: '100.00',
        governingSourceId: '00000000-0000-4000-8000-000000000000',
        collectingInstitutionId: fixture.institutionId,
        refundability: 'NON_REFUNDABLE',
        effectiveFrom: '2024-01-01',
      })
      .expect(400);
  });
});
