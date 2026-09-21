import { type INestApplication } from '@nestjs/common';
import {
  CaseAssignmentStatus,
  CaseStatus,
  ComplianceDashboardAudience,
  DashboardDataQuality,
  GovernmentServiceMaturityStatus,
} from '@prisma/client';
import request from 'supertest';
import { type App } from 'supertest/types';

import { PrismaService } from '../src/database/prisma.service';
import { seedDepartmentExperienceFixture } from './helpers/department-experience-test-fixtures';
import {
  asDepartmentComplianceBody,
  asDepartmentHomeBody,
  asDepartmentMeBody,
  asDepartmentServicesBody,
  asDepartmentWorkloadBody,
} from './helpers/department-experience-test-types';
import { createIntegrationApp, resetAllTestData } from './helpers/integration-app';
import { seedPhase6Fixture, VALID_FORM_ANSWERS } from './helpers/phase-6-test-fixtures';
import { asApplicationBody, asSubmitApplicationResponseBody } from './helpers/phase-6-test-types';
import { asServiceStartPackageBody } from './helpers/public-service-test-types';

describe('Department Management Experience API (e2e)', () => {
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

  async function submitCase(fixture: Awaited<ReturnType<typeof seedPhase6Fixture>>) {
    asServiceStartPackageBody(
      (
        await request(app.getHttpServer())
          .get(`/api/v1/public/services/${fixture.serviceSlug}/start-package`)
          .expect(200)
      ).body,
    );

    const draft = asApplicationBody(
      (
        await request(app.getHttpServer())
          .post('/api/v1/applications')
          .set('Authorization', `Bearer ${fixture.applicantSessionToken}`)
          .send({
            governmentServiceVersionId: fixture.governmentServiceVersionId,
            formDefinitionId: fixture.formDefinitionId,
            formVersionId: fixture.formVersionId,
            configurationFingerprint: fixture.configurationFingerprint,
            applicantCategory: 'INDIVIDUAL',
            draftAnswers: VALID_FORM_ANSWERS,
          })
          .expect(201)
      ).body,
    );

    const submitRes = await request(app.getHttpServer())
      .post(`/api/v1/applications/${draft.id}/submit`)
      .set('Authorization', `Bearer ${fixture.applicantSessionToken}`)
      .send({
        answers: VALID_FORM_ANSWERS,
        configurationFingerprint: fixture.configurationFingerprint,
        idempotencyKey: `dept-exp-${String(Date.now())}`,
      })
      .expect(201);

    return asSubmitApplicationResponseBody(submitRes.body);
  }

  it('denies ordinary citizen access to department management endpoints', async () => {
    const fixture = await seedDepartmentExperienceFixture(app, prisma);

    await request(app.getHttpServer())
      .get('/api/v1/experience/department/me')
      .set('Authorization', `Bearer ${fixture.applicantSessionToken}`)
      .expect(403);

    await request(app.getHttpServer())
      .get(`/api/v1/experience/department/${fixture.departmentId}/home`)
      .set('Authorization', `Bearer ${fixture.applicantSessionToken}`)
      .expect(403);
  });

  it('denies official in unrelated department without management policy', async () => {
    const fixture = await seedDepartmentExperienceFixture(app, prisma);

    await request(app.getHttpServer())
      .get(`/api/v1/experience/department/${fixture.otherDepartmentId}/home`)
      .set('Authorization', `Bearer ${fixture.officialSessionToken}`)
      .expect(403);
  });

  it('denies management access when official membership alone without configured policy', async () => {
    const fixture = await seedPhase6Fixture(app, prisma);

    const me = asDepartmentMeBody(
      (
        await request(app.getHttpServer())
          .get('/api/v1/experience/department/me')
          .set('Authorization', `Bearer ${fixture.officialSessionToken}`)
          .expect(200)
      ).body,
    );

    expect(me.departments.every((department) => !department.hasManagementAccess)).toBe(true);

    await request(app.getHttpServer())
      .get(`/api/v1/experience/department/${fixture.departmentId}/home`)
      .set('Authorization', `Bearer ${fixture.officialSessionToken}`)
      .expect(403);
  });

  it('denies department head access to another department without policy for that department', async () => {
    const fixture = await seedDepartmentExperienceFixture(app, prisma);

    await request(app.getHttpServer())
      .get(`/api/v1/experience/department/${fixture.otherDepartmentId}/home`)
      .set('Authorization', `Bearer ${fixture.departmentHeadSessionToken}`)
      .expect(403);
  });

  it('labels stale metrics clearly on department home', async () => {
    const fixture = await seedDepartmentExperienceFixture(app, prisma);
    const staleDerivedAt = new Date(Date.now() - 3 * 60 * 60 * 1000);

    await prisma.complianceStatusProjection.create({
      data: {
        audience: ComplianceDashboardAudience.DEPARTMENT_HEAD,
        subjectDepartmentId: fixture.departmentId,
        subjectInstitutionId: fixture.institutionId,
        status: 'MONITORING',
        projectionDisclaimer: 'Test projection disclaimer',
        lastDerivedAt: staleDerivedAt,
      },
    });

    const home = asDepartmentHomeBody(
      (
        await request(app.getHttpServer())
          .get(`/api/v1/experience/department/${fixture.departmentId}/home`)
          .set('Authorization', `Bearer ${fixture.departmentHeadSessionToken}`)
          .expect(200)
      ).body,
    );

    expect(home.metricsFreshness.isStale).toBe(true);
    expect(home.metricsFreshness.staleDataDisclaimer).toContain('Stale');
  });

  it('states aggregate views do not create case disposition or authority', async () => {
    const fixture = await seedDepartmentExperienceFixture(app, prisma);

    const home = asDepartmentHomeBody(
      (
        await request(app.getHttpServer())
          .get(`/api/v1/experience/department/${fixture.departmentId}/home`)
          .set('Authorization', `Bearer ${fixture.departmentHeadSessionToken}`)
          .expect(200)
      ).body,
    );

    expect(home.aggregateDoesNotCreateCaseDisposition).toBe(true);
    expect(home.dashboardVisibilityDoesNotCreateAuthority).toBe(true);

    const me = asDepartmentMeBody(
      (
        await request(app.getHttpServer())
          .get('/api/v1/experience/department/me')
          .set('Authorization', `Bearer ${fixture.departmentHeadSessionToken}`)
          .expect(200)
      ).body,
    );

    expect(me.hasUniversalAuthority).toBe(false);
    expect(me.dashboardVisibilityDoesNotCreateAuthority).toBe(true);
  });

  it('keeps internal restricted records scoped in compliance view', async () => {
    const fixture = await seedDepartmentExperienceFixture(app, prisma);

    const compliance = asDepartmentComplianceBody(
      (
        await request(app.getHttpServer())
          .get(`/api/v1/experience/department/${fixture.departmentId}/compliance`)
          .set('Authorization', `Bearer ${fixture.departmentHeadSessionToken}`)
          .expect(200)
      ).body,
    );

    expect(compliance.restrictedInternalRecordsScoped).toBe(true);
    for (const matter of compliance.openMatters) {
      expect(matter).not.toHaveProperty('holderIdentityId');
      expect(matter).not.toHaveProperty('holderPersonalData');
    }
  });

  it('returns deterministic department workload counts', async () => {
    const fixture = await seedDepartmentExperienceFixture(app, prisma);
    const firstSubmit = await submitCase(fixture);
    await submitCase(fixture);

    await prisma.case.update({
      where: { id: firstSubmit.case.id },
      data: { status: CaseStatus.IN_PROGRESS },
    });

    const first = asDepartmentWorkloadBody(
      (
        await request(app.getHttpServer())
          .get(`/api/v1/experience/department/${fixture.departmentId}/workload`)
          .set('Authorization', `Bearer ${fixture.departmentHeadSessionToken}`)
          .expect(200)
      ).body,
    );

    const second = asDepartmentWorkloadBody(
      (
        await request(app.getHttpServer())
          .get(`/api/v1/experience/department/${fixture.departmentId}/workload`)
          .set('Authorization', `Bearer ${fixture.departmentHeadSessionToken}`)
          .expect(200)
      ).body,
    );

    expect(first.totalCases).toBe(2);
    expect(first.totalCases).toBe(second.totalCases);
    expect(first.unassignedWorkload).toBe(second.unassignedWorkload);
    expect(first.statusBreakdown).toEqual(second.statusBreakdown);
  });

  it('represents suspended department service correctly', async () => {
    const fixture = await seedDepartmentExperienceFixture(app, prisma);

    await prisma.governmentServiceVersion.update({
      where: { id: fixture.governmentServiceVersionId },
      data: { maturityStatus: GovernmentServiceMaturityStatus.SUSPENDED },
    });

    const services = asDepartmentServicesBody(
      (
        await request(app.getHttpServer())
          .get(`/api/v1/experience/department/${fixture.departmentId}/services`)
          .set('Authorization', `Bearer ${fixture.departmentHeadSessionToken}`)
          .expect(200)
      ).body,
    );

    const targetService = services.items.find(
      (item) => item.serviceId === fixture.governmentServiceId,
    );
    expect(targetService?.serviceSuspended).toBe(true);
    expect(targetService?.status).toBe(GovernmentServiceMaturityStatus.SUSPENDED);
    expect(services.suspendedServiceCount).toBeGreaterThanOrEqual(1);
  });

  it('allows configured department head to access management endpoints', async () => {
    const fixture = await seedDepartmentExperienceFixture(app, prisma);
    await submitCase(fixture);

    await request(app.getHttpServer())
      .get(`/api/v1/experience/department/${fixture.departmentId}/home`)
      .set('Authorization', `Bearer ${fixture.departmentHeadSessionToken}`)
      .expect(200);

    await request(app.getHttpServer())
      .get(`/api/v1/experience/department/${fixture.departmentId}/alerts`)
      .set('Authorization', `Bearer ${fixture.departmentHeadSessionToken}`)
      .expect(200);
  });

  it('surfaces data-quality stale alert when stale projection exists', async () => {
    const fixture = await seedDepartmentExperienceFixture(app, prisma);

    const dashboardVersion = await prisma.dashboardVersion.create({
      data: {
        dashboardDefinitionId: fixture.departmentalDashboardId,
        versionNumber: 1,
        status: 'PUBLISHED',
        filterDimensions: ['DEPARTMENT'],
        projectionDisclaimer: 'Test',
        effectiveFrom: new Date(),
      },
    });

    const statusEntry = await prisma.dashboardStatusDictionaryEntry.create({
      data: {
        code: 'DEPT_STALE_TEST',
        label: 'Stale Test',
        meaning: 'Presentation only stale marker',
        colorSemantic: 'NEUTRAL',
        calculationRule: 'stale_count',
        limitations: 'Presentation only',
        stalenessRule: 'stale after 1 hour',
        ownerType: 'PLATFORM',
        ownerReference: 'platform',
      },
    });

    const indicatorDefinition = await prisma.dashboardIndicatorDefinition.create({
      data: {
        code: 'DEPT-STALE-TEST',
        label: 'Stale Test Indicator',
        category: 'SERVICE_VOLUMES',
        statusDictionaryEntryId: statusEntry.id,
        calculationRuleRef: 'department.stale_test',
      },
    });

    await prisma.dashboardIndicatorProjection.create({
      data: {
        indicatorDefinitionId: indicatorDefinition.id,
        dashboardVersionId: dashboardVersion.id,
        statusDictionaryEntryId: statusEntry.id,
        departmentId: fixture.departmentId,
        institutionId: fixture.institutionId,
        countValue: 1,
        displayLabel: 'Stale workload metric',
        dataQuality: DashboardDataQuality.STALE_CACHED,
        calculatedAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
        staleAfter: new Date(Date.now() - 60 * 60 * 1000),
      },
    });

    const alertsRes = await request(app.getHttpServer())
      .get(`/api/v1/experience/department/${fixture.departmentId}/alerts`)
      .set('Authorization', `Bearer ${fixture.departmentHeadSessionToken}`)
      .expect(200);

    const alertItems = alertsRes.body as { items: { alertType: string }[] };
    expect(alertItems.items.some((item) => item.alertType === 'data-quality')).toBe(true);
  });

  it('counts assigned and unassigned workload consistently after assignment', async () => {
    const fixture = await seedDepartmentExperienceFixture(app, prisma);
    const submitResult = await submitCase(fixture);

    const before = asDepartmentHomeBody(
      (
        await request(app.getHttpServer())
          .get(`/api/v1/experience/department/${fixture.departmentId}/home`)
          .set('Authorization', `Bearer ${fixture.departmentHeadSessionToken}`)
          .expect(200)
      ).body,
    );

    await prisma.caseAssignment.create({
      data: {
        caseId: submitResult.case.id,
        assigneeIdentityId: fixture.officialIdentityId,
        assigneeOfficeholderId: fixture.officialOfficeholderId,
        status: CaseAssignmentStatus.ACTIVE,
        assignmentRole: 'CASE_MANAGER',
      },
    });

    const after = asDepartmentHomeBody(
      (
        await request(app.getHttpServer())
          .get(`/api/v1/experience/department/${fixture.departmentId}/home`)
          .set('Authorization', `Bearer ${fixture.departmentHeadSessionToken}`)
          .expect(200)
      ).body,
    );

    expect(after.unassignedWorkload).toBeLessThanOrEqual(before.unassignedWorkload);
  });
});
