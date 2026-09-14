import { type INestApplication } from '@nestjs/common';
import { type App } from 'supertest/types';

import { ComplianceBoundaryService } from '../src/compliance/common/compliance-boundary.service';
import { type PrismaService } from '../src/database/prisma.service';
import { createIntegrationApp, resetAllTestData } from './helpers/integration-app';
import { seedPhase9Fixture } from './helpers/phase-9-test-fixtures';

describe('Phase 9 inspection and compliance concurrency (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let boundary: ComplianceBoundaryService;

  beforeAll(async () => {
    ({ app, prisma } = await createIntegrationApp());
    boundary = app.get(ComplianceBoundaryService);
  });

  beforeEach(async () => {
    await resetAllTestData(prisma);
  });

  afterAll(async () => {
    await app.close();
  });

  it('preserves boundary invariants after sequential fixture seeding', async () => {
    const fixture = await seedPhase9Fixture(app, prisma, { includeComplianceGraph: true });

    expect(fixture.complianceMatterId).toEqual(expect.any(String));
    expect(() => {
      boundary.assertSubmissionIsNotObligation({ treatingSubmissionAsObligation: true });
    }).toThrow(/not the same as continuing obligation/i);
  });
});
