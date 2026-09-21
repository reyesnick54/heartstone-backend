import { type INestApplication } from '@nestjs/common';
import request from 'supertest';
import { type App } from 'supertest/types';

import { type PrismaService } from '../src/database/prisma.service';
import { seedExecutiveExperienceFixture } from './helpers/executive-experience-test-fixtures';
import {
  asExecutiveAlertsBody,
  asExecutiveHomeBody,
  asExecutiveInvestmentBody,
  asExecutiveRiskBody,
  asExecutiveSectionBody,
} from './helpers/executive-experience-test-types';
import { createIntegrationApp, resetAllTestData } from './helpers/integration-app';
import { seedPhase6Fixture } from './helpers/phase-6-test-fixtures';

describe('Executive Government Experience API (integration)', () => {
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

  it('denies citizen access to executive home', async () => {
    const fixture = await seedExecutiveExperienceFixture(prisma, app);

    await request(app.getHttpServer())
      .get('/api/v1/experience/executive/home')
      .set('Authorization', `Bearer ${fixture.citizenSessionToken}`)
      .expect(403);
  });

  it('denies ordinary departmental officer without executive briefing policy', async () => {
    const fixture = await seedExecutiveExperienceFixture(prisma, app);

    await request(app.getHttpServer())
      .get('/api/v1/experience/executive/home')
      .set('Authorization', `Bearer ${fixture.deptASessionToken}`)
      .expect(403);
  });

  it('denies technical system administrator substantive executive access', async () => {
    const fixture = await seedExecutiveExperienceFixture(prisma, app);

    await request(app.getHttpServer())
      .get('/api/v1/experience/executive/home')
      .set('Authorization', `Bearer ${fixture.technicalAdminSessionToken}`)
      .expect(403);
  });

  it('allows executive identity with briefing policy to access home', async () => {
    const fixture = await seedExecutiveExperienceFixture(prisma, app);

    const response = await request(app.getHttpServer())
      .get('/api/v1/experience/executive/home')
      .set('Authorization', `Bearer ${fixture.executiveSessionToken}`)
      .expect(200);

    const body = asExecutiveHomeBody(response.body);
    expect(body.visibilityDoesNotCreateAuthority).toBe(true);
    expect(body.executiveDashboardIsNotCommandAuthority).toBe(true);
    expect(body.metricIsNotVerifiedLegalFact).toBe(true);
    expect(body.riskScoreIsNotSanction).toBe(true);
    expect(body.governmentOperations).toBeDefined();
    expect(body.economyInvestment).toBeDefined();
    expect(body.compliance).toBeDefined();
    expect(body.digitalGovernment).toBeDefined();
    expect(body.risk).toBeDefined();
  });

  it('departmental dashboard access does not imply executive access', async () => {
    const fixture = await seedExecutiveExperienceFixture(prisma, app);

    await request(app.getHttpServer())
      .post('/api/v1/intelligence/command-console/departmental/query')
      .set('Authorization', `Bearer ${fixture.deptASessionToken}`)
      .send({
        dashboardDefinitionId: fixture.departmentalDashboardId,
        institutionId: fixture.institutionId,
        departmentId: fixture.departmentAId,
        purpose: 'DEPARTMENT_MANAGEMENT',
        sensitivityScope: 'RESTRICTED',
      })
      .expect(201);

    await request(app.getHttpServer())
      .get('/api/v1/experience/executive/home')
      .set('Authorization', `Bearer ${fixture.deptASessionToken}`)
      .expect(403);
  });

  it('flags stale projections on executive home', async () => {
    const fixture = await seedExecutiveExperienceFixture(prisma, app);

    const response = await request(app.getHttpServer())
      .get('/api/v1/experience/executive/home')
      .set('Authorization', `Bearer ${fixture.executiveSessionToken}`)
      .expect(200);

    const body = asExecutiveHomeBody(response.body);
    expect(body.hasStaleProjections).toBe(true);
    expect(body.staleProjectionCount).toBeGreaterThan(0);
  });

  it('does not display reported milestone as verified in investment view', async () => {
    const fixture = await seedExecutiveExperienceFixture(prisma, app);

    const response = await request(app.getHttpServer())
      .get('/api/v1/experience/executive/investment')
      .set('Authorization', `Bearer ${fixture.executiveSessionToken}`)
      .expect(200);

    const body = asExecutiveInvestmentBody(response.body);
    const reported = body.reportedMilestones.find(
      (milestone) => milestone.milestoneId === fixture.reportedMilestoneId,
    );
    const verified = body.verifiedMilestones.find(
      (milestone) => milestone.milestoneId === fixture.verifiedMilestoneId,
    );

    expect(reported).toBeDefined();
    expect(reported?.isVerified).toBe(false);
    expect(reported?.isReportedOnly).toBe(true);
    expect(reported?.reportedMilestoneIsNotVerifiedMilestone).toBe(true);

    expect(verified).toBeDefined();
    expect(verified?.isVerified).toBe(true);
    expect(verified?.isReportedOnly).toBe(false);
    expect(body.disclaimers.reportedMilestoneIsNotVerifiedMilestone).toBe(true);
  });

  it('does not display risk score as sanction', async () => {
    const fixture = await seedExecutiveExperienceFixture(prisma, app);

    const response = await request(app.getHttpServer())
      .get('/api/v1/experience/executive/risk')
      .set('Authorization', `Bearer ${fixture.executiveSessionToken}`)
      .expect(200);

    const body = asExecutiveRiskBody(response.body);
    expect(body.disclaimers.riskScoreIsNotSanction).toBe(true);
    for (const assessment of body.riskAssessments ?? []) {
      expect(assessment.isSanction).toBe(false);
      expect(assessment.riskScoreIsNotSanction).toBe(true);
    }
  });

  it('does not display AI alert as confirmed violation without verification', async () => {
    const fixture = await seedExecutiveExperienceFixture(prisma, app);

    const response = await request(app.getHttpServer())
      .get('/api/v1/experience/executive/alerts')
      .set('Authorization', `Bearer ${fixture.executiveSessionToken}`)
      .expect(200);

    const body = asExecutiveAlertsBody(response.body);
    const alert = body.alerts.find((item) => item.alertId === fixture.intelligenceAlertId);

    expect(alert).toBeDefined();
    expect(alert?.isConfirmedViolation).toBe(false);
    expect(alert?.isVerified).toBe(false);
    expect(alert?.hasVerificationRecord).toBe(false);
    expect(alert?.aiAlertIsNotConfirmedViolationWithoutVerification).toBe(true);
    expect(body.disclaimers.aiAlertIsNotConfirmedViolationWithoutVerification).toBe(true);
  });

  it('executive visibility does not alter cases', async () => {
    const fixture = await seedExecutiveExperienceFixture(prisma, app);
    const phase6 = await seedPhase6Fixture(app, prisma);

    const application = await prisma.application.create({
      data: {
        applicantIdentityId: phase6.applicantIdentityId,
        governmentServiceId: phase6.governmentServiceId,
        governmentServiceVersionId: phase6.governmentServiceVersionId,
        formDefinitionId: phase6.formDefinitionId,
        formVersionId: phase6.formVersionId,
        configurationFingerprint: phase6.configurationFingerprint,
        applicantCategory: 'INDIVIDUAL',
        status: 'SUBMITTED',
      },
    });

    const caseNumber = `EXEC-IMMUT-${String(Date.now())}`;
    const caseBefore = await prisma.case.create({
      data: {
        caseNumber,
        applicationId: application.id,
        applicantIdentityId: phase6.applicantIdentityId,
        governmentServiceId: phase6.governmentServiceId,
        governmentServiceVersionId: phase6.governmentServiceVersionId,
        responsibleInstitutionId: fixture.institutionId,
        responsibleDepartmentId: fixture.departmentAId,
        workflowVersionId: phase6.workflowVersionId,
        configurationFingerprint: phase6.configurationFingerprint,
        status: 'OPEN',
      },
    });

    await request(app.getHttpServer())
      .get('/api/v1/experience/executive/government-operations')
      .set('Authorization', `Bearer ${fixture.executiveSessionToken}`)
      .expect(200);

    const caseAfter = await prisma.case.findUniqueOrThrow({ where: { id: caseBefore.id } });

    expect(caseAfter.status).toBe(caseBefore.status);
    expect(caseAfter.version).toBe(caseBefore.version);
    expect(caseAfter.updatedAt.getTime()).toBe(caseBefore.updatedAt.getTime());
  });

  it('exposes all executive section endpoints for entitled actor', async () => {
    const fixture = await seedExecutiveExperienceFixture(prisma, app);
    const token = fixture.executiveSessionToken;
    const server = app.getHttpServer();

    const routes = [
      '/api/v1/experience/executive/home',
      '/api/v1/experience/executive/government-operations',
      '/api/v1/experience/executive/services',
      '/api/v1/experience/executive/departments',
      '/api/v1/experience/executive/investment',
      '/api/v1/experience/executive/projects',
      '/api/v1/experience/executive/compliance',
      '/api/v1/experience/executive/redress',
      '/api/v1/experience/executive/digital-government',
      '/api/v1/experience/executive/risk',
      '/api/v1/experience/executive/alerts',
    ];

    for (const route of routes) {
      const response = await request(server)
        .get(route)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      const body = asExecutiveSectionBody(response.body);
      expect(body.generatedAt).toBeDefined();
      expect(body.institutionId).toBe(fixture.institutionId);
    }
  });

  it('does not expose override or approval endpoints', async () => {
    const fixture = await seedExecutiveExperienceFixture(prisma, app);
    const server = app.getHttpServer();
    const token = fixture.executiveSessionToken;

    const forbiddenRoutes = [
      '/api/v1/experience/executive/approve-case',
      '/api/v1/experience/executive/override-department',
      '/api/v1/experience/executive/waive-requirement',
      '/api/v1/experience/executive/force-issuance',
    ];

    for (const route of forbiddenRoutes) {
      await request(server).post(route).set('Authorization', `Bearer ${token}`).expect(404);
    }
  });
});
