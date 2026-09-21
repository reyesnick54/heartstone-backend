import { type INestApplication } from '@nestjs/common';
import { AnalysisFunctionType } from '@prisma/client';
import request from 'supertest';
import { type App } from 'supertest/types';

import { type PrismaService } from '../src/database/prisma.service';
import { createIntegrationApp, resetAllTestData } from './helpers/integration-app';
import { seedIntelligenceActorFixture } from './helpers/intelligence-actor-test-fixtures';

describe('Intelligence actor context and institutional scoping (integration)', () => {
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

  it('rejects forged reviewer identity on performance claim review', async () => {
    const fixture = await seedIntelligenceActorFixture(app, prisma);

    await request(app.getHttpServer())
      .post(`/api/v1/intelligence/claims/${fixture.claimId}/review`)
      .set('Authorization', `Bearer ${fixture.officialSessionToken}`)
      .send({
        reviewerIdentityId: fixture.otherOfficialIdentityId,
        outcome: 'SUPPORTED',
        approved: true,
      })
      .expect(403);
  });

  it('rejects forged owner identity on performance claim creation', async () => {
    const fixture = await seedIntelligenceActorFixture(app, prisma);

    await request(app.getHttpServer())
      .post('/api/v1/intelligence/claims')
      .set('Authorization', `Bearer ${fixture.officialSessionToken}`)
      .send({
        ownerIdentityId: fixture.otherOfficialIdentityId,
        claimStatement: 'Forged owner claim',
        metricDefinitionVersionId: fixture.metricVersionId,
        calculationRunId: fixture.calculationRunId,
      })
      .expect(403);
  });

  it('blocks cross-institution metric framework access', async () => {
    const fixture = await seedIntelligenceActorFixture(app, prisma);

    await request(app.getHttpServer())
      .get(`/api/v1/intelligence/frameworks/${fixture.institutionBFrameworkId}`)
      .set('Authorization', `Bearer ${fixture.officialSessionToken}`)
      .expect(403);
  });

  it('blocks cross-institution AI analysis execution', async () => {
    const fixture = await seedIntelligenceActorFixture(app, prisma);

    await request(app.getHttpServer())
      .post('/api/v1/intelligence/analysis/runs')
      .set('Authorization', `Bearer ${fixture.aiSessionToken}`)
      .send({
        requestId: fixture.institutionBAnalysisRequestId,
        method: 'deterministic-summary',
        assumptions: {},
        limitations: 'test',
      })
      .expect(403);
  });

  it('blocks cross-institution analysis replay retrieval', async () => {
    const fixture = await seedIntelligenceActorFixture(app, prisma);

    await request(app.getHttpServer())
      .get(`/api/v1/intelligence/analysis/runs/${fixture.institutionBAnalysisRunId}/replay`)
      .set('Authorization', `Bearer ${fixture.officialSessionToken}`)
      .expect(403);
  });

  it('blocks suspended AI agent intelligence operations', async () => {
    const fixture = await seedIntelligenceActorFixture(app, prisma);

    await request(app.getHttpServer())
      .post('/api/v1/intelligence/analysis/requests')
      .set('Authorization', `Bearer ${fixture.suspendedAiSessionToken}`)
      .send({
        question: 'Should suspended agent run?',
        functionType: AnalysisFunctionType.DECISION_SUPPORT_SUMMARY,
        institutionId: fixture.institutionAId,
      })
      .expect(403);
  });

  it('blocks unauthorized consequential-use review without authority evaluation', async () => {
    const fixture = await seedIntelligenceActorFixture(app, prisma, {
      seedConsequentialAuthority: false,
    });

    await request(app.getHttpServer())
      .post('/api/v1/intelligence/consequential-use/reviews')
      .set('Authorization', `Bearer ${fixture.officialSessionToken}`)
      .send({
        twinVersionId: fixture.twinVersionId,
        representedSubjectType: 'INSTITUTION',
        representedSubjectId: fixture.institutionAId,
        impactAreas: ['INSTITUTION'],
        authorityReference: 'audit-ref-001',
        decision: 'APPROVED',
        reasons: 'test',
        limitations: 'test',
        proposedUse: 'simulation review',
        reviewerIdentityType: 'INDIVIDUAL',
      })
      .expect(403);
  });

  it('rejects technical access alone for substantive dashboard query', async () => {
    const fixture = await seedIntelligenceActorFixture(app, prisma);

    await request(app.getHttpServer())
      .post('/api/v1/intelligence/command-console/executive/query')
      .set('Authorization', `Bearer ${fixture.officialSessionToken}`)
      .send({
        dashboardDefinitionId: fixture.dashboardDefinitionId,
        institutionId: fixture.institutionAId,
        purpose: 'OPERATIONAL_OVERSIGHT',
        sensitivityScope: 'OFFICIAL',
        technicalPermissionOnly: true,
      })
      .expect(403);
  });

  it('rejects client-supplied authority indicators', async () => {
    const fixture = await seedIntelligenceActorFixture(app, prisma);

    await request(app.getHttpServer())
      .post('/api/v1/intelligence/frameworks')
      .set('Authorization', `Bearer ${fixture.officialSessionToken}`)
      .send({
        code: 'FORGED-AUTH-FW',
        name: 'Forged authority framework',
        institutionId: fixture.institutionAId,
        authorityGranted: true,
      })
      .expect(403);
  });

  it('blocks AI actors from performance claim review', async () => {
    const fixture = await seedIntelligenceActorFixture(app, prisma, {
      seedConsequentialAuthority: true,
    });

    await request(app.getHttpServer())
      .post(`/api/v1/intelligence/claims/${fixture.claimId}/review`)
      .set('Authorization', `Bearer ${fixture.aiSessionToken}`)
      .send({
        outcome: 'SUPPORTED',
        approved: true,
      })
      .expect(403);
  });
});
