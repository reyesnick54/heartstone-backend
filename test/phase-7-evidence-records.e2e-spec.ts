import { type INestApplication } from '@nestjs/common';
import request from 'supertest';
import { type App } from 'supertest/types';

import { PrismaService } from '../src/database/prisma.service';
import { createPhase7IntegrationApp, resetAllTestData } from './helpers/phase-7-integration-app';
import { seedPhase7Fixture } from './helpers/phase-7-test-fixtures';
import { asCompletenessBody } from './helpers/phase-7-test-types';

describe('Phase 7H evidence records (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

  beforeAll(async () => {
    ({ app } = await createPhase7IntegrationApp());
    prisma = app.get(PrismaService);
  });

  beforeEach(async () => {
    await resetAllTestData(prisma);
  });

  afterAll(async () => {
    await app.close();
  });

  it('assesses master file completeness without issuing instruments or decisions', async () => {
    const fixture = await seedPhase7Fixture(app, prisma);

    const assessment = asCompletenessBody(
      (
        await request(app.getHttpServer())
          .post(`/api/v1/records/master-files/${fixture.masterFileId}/completeness`)
          .set('Authorization', `Bearer ${fixture.officialSessionToken}`)
          .send({ requiredRequirementCodes: fixture.requirementCodes })
          .expect(201)
      ).body,
    );

    expect(assessment.outcome).toBe('UNRESOLVED');
    expect(assessment.explanationCodes).not.toContain('GOVERNMENT_DECISION');

    const decisionCount = await prisma.governmentDecision.count();
    expect(decisionCount).toBe(0);
    const decisionRowCount = await prisma.governmentDecision.count({
      where: { caseId: fixture.caseId },
    });
    expect(decisionRowCount).toBe(0);
  });

  it('allows applicant to read own master file but not unrelated files', async () => {
    const fixture = await seedPhase7Fixture(app, prisma);

    await request(app.getHttpServer())
      .get(`/api/v1/records/master-files/${fixture.masterFileId}`)
      .set('Authorization', `Bearer ${fixture.applicantSessionToken}`)
      .expect(200);

    await request(app.getHttpServer())
      .get(`/api/v1/records/master-files/${fixture.masterFileId}`)
      .set('Authorization', `Bearer ${fixture.officialSessionToken}`)
      .expect(200);
  });
});
