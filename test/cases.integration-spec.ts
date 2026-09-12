import { type INestApplication } from '@nestjs/common';
import { ApplicationStatus, CaseLegalStatus, CaseStatus } from '@prisma/client';
import request from 'supertest';
import { type App } from 'supertest/types';

import { type PrismaService } from '../src/database/prisma.service';
import {
  createReceivedApplication,
  seedCasesFixture,
} from './helpers/cases-test-fixtures';
import { asCaseBody, asCaseStatusHistoryBody } from './helpers/cases-test-types';
import { createIntegrationApp, resetAllTestData } from './helpers/integration-app';

describe('Phase 6B Cases (integration)', () => {
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

  async function createCaseFromApplication(
    fixture: Awaited<ReturnType<typeof seedCasesFixture>>,
    applicationId: string,
  ) {
    const response = await request(app.getHttpServer())
      .post(`/api/v1/cases/from-application/${applicationId}`)
      .set('Authorization', `Bearer ${fixture.responsibleOfficialSessionToken}`)
      .expect(201);

    return asCaseBody(response.body);
  }

  it('creates a case from a received application with pinned service version', async () => {
    const fixture = await seedCasesFixture(app, prisma);
    const { application, acknowledgment } = await createReceivedApplication(app, fixture);

    const caseRecord = await createCaseFromApplication(fixture, application.id);

    expect(caseRecord.caseNumber).toMatch(/^CASE-\d{4}-[A-F0-9]{8}$/);
    expect(caseRecord.applicationId).toBe(application.id);
    expect(caseRecord.applicationSubmissionId).toBe(acknowledgment.submissionId);
    expect(caseRecord.governmentServiceVersionId).toBe(fixture.governmentServiceVersionId);
    expect(caseRecord.responsibleDepartmentId).toBe(fixture.responsibleDepartmentId);
    expect(caseRecord.caseStatus).toBe(CaseStatus.RECEIVED);
  });

  it('transfers the application to TRANSFERRED_TO_CASE when a case is created', async () => {
    const fixture = await seedCasesFixture(app, prisma);
    const { application } = await createReceivedApplication(app, fixture);

    await createCaseFromApplication(fixture, application.id);

    const updatedApplication = await prisma.application.findUnique({
      where: { id: application.id },
    });

    expect(updatedApplication?.currentStatus).toBe(ApplicationStatus.TRANSFERRED_TO_CASE);
  });

  it('blocks case creation when the application is not RECEIVED', async () => {
    const fixture = await seedCasesFixture(app, prisma);
    const { application } = await createReceivedApplication(app, fixture);

    await prisma.application.update({
      where: { id: application.id },
      data: { currentStatus: ApplicationStatus.DRAFT },
    });

    await request(app.getHttpServer())
      .post(`/api/v1/cases/from-application/${application.id}`)
      .set('Authorization', `Bearer ${fixture.responsibleOfficialSessionToken}`)
      .expect(400);
  });

  it('blocks duplicate case creation for the same application', async () => {
    const fixture = await seedCasesFixture(app, prisma);
    const { application } = await createReceivedApplication(app, fixture);

    await createCaseFromApplication(fixture, application.id);

    await request(app.getHttpServer())
      .post(`/api/v1/cases/from-application/${application.id}`)
      .set('Authorization', `Bearer ${fixture.responsibleOfficialSessionToken}`)
      .expect(409);
  });

  it('allows the applicant to view their case', async () => {
    const fixture = await seedCasesFixture(app, prisma);
    const { application } = await createReceivedApplication(app, fixture);
    const createdCase = await createCaseFromApplication(fixture, application.id);

    const response = await request(app.getHttpServer())
      .get(`/api/v1/cases/${createdCase.id}`)
      .set('Authorization', `Bearer ${fixture.applicantSessionToken}`)
      .expect(200);

    expect(asCaseBody(response.body).id).toBe(createdCase.id);
  });

  it('denies unauthorized users from viewing a case', async () => {
    const fixture = await seedCasesFixture(app, prisma);
    const { application } = await createReceivedApplication(app, fixture);
    const createdCase = await createCaseFromApplication(fixture, application.id);

    await request(app.getHttpServer())
      .get(`/api/v1/cases/${createdCase.id}`)
      .set('Authorization', `Bearer ${fixture.otherSessionToken}`)
      .expect(403);
  });

  it('allows a responsible department official to view the case', async () => {
    const fixture = await seedCasesFixture(app, prisma);
    const { application } = await createReceivedApplication(app, fixture);
    const createdCase = await createCaseFromApplication(fixture, application.id);

    const response = await request(app.getHttpServer())
      .get(`/api/v1/cases/${createdCase.id}`)
      .set('Authorization', `Bearer ${fixture.responsibleOfficialSessionToken}`)
      .expect(200);

    expect(asCaseBody(response.body).id).toBe(createdCase.id);
  });

  it('denies a wrong-department official from viewing the case', async () => {
    const fixture = await seedCasesFixture(app, prisma);
    const { application } = await createReceivedApplication(app, fixture);
    const createdCase = await createCaseFromApplication(fixture, application.id);

    await request(app.getHttpServer())
      .get(`/api/v1/cases/${createdCase.id}`)
      .set('Authorization', `Bearer ${fixture.wrongDeptOfficialSessionToken}`)
      .expect(403);
  });

  it('blocks applicants from updating case status', async () => {
    const fixture = await seedCasesFixture(app, prisma);
    const { application } = await createReceivedApplication(app, fixture);
    const createdCase = await createCaseFromApplication(fixture, application.id);

    await request(app.getHttpServer())
      .patch(`/api/v1/cases/${createdCase.id}/status`)
      .set('Authorization', `Bearer ${fixture.applicantSessionToken}`)
      .send({ caseStatus: CaseStatus.COMPLETENESS_REVIEW })
      .expect(403);
  });

  it('allows officials to update status and append history', async () => {
    const fixture = await seedCasesFixture(app, prisma);
    const { application } = await createReceivedApplication(app, fixture);
    const createdCase = await createCaseFromApplication(fixture, application.id);

    const updated = asCaseBody(
      (
        await request(app.getHttpServer())
          .patch(`/api/v1/cases/${createdCase.id}/status`)
          .set('Authorization', `Bearer ${fixture.responsibleOfficialSessionToken}`)
          .send({
            caseStatus: CaseStatus.COMPLETENESS_REVIEW,
            legalStatus: CaseLegalStatus.PENDING,
            reason: 'Starting completeness review',
            officeholderId: fixture.responsibleOfficialOfficeholderId,
            correlationId: 'corr-001',
          })
          .expect(200)
      ).body,
    );

    expect(updated.caseStatus).toBe(CaseStatus.COMPLETENESS_REVIEW);
    expect(updated.legalStatus).toBe(CaseLegalStatus.PENDING);

    const history = (
      await request(app.getHttpServer())
        .get(`/api/v1/cases/${createdCase.id}/history`)
        .set('Authorization', `Bearer ${fixture.responsibleOfficialSessionToken}`)
        .expect(200)
    ).body as unknown[];

    expect(history).toHaveLength(2);

    const latest = asCaseStatusHistoryBody(history[1]);
    expect(latest.previousStatus).toBe(CaseStatus.RECEIVED);
    expect(latest.newStatus).toBe(CaseStatus.COMPLETENESS_REVIEW);
    expect(latest.previousLegalStatus).toBe(CaseLegalStatus.NONE);
    expect(latest.newLegalStatus).toBe(CaseLegalStatus.PENDING);
    expect(latest.reason).toBe('Starting completeness review');
    expect(latest.officeholderId).toBe(fixture.responsibleOfficialOfficeholderId);
    expect(latest.correlationId).toBe('corr-001');
  });

  it('blocks ordinary status patches to decision-engine-owned statuses', async () => {
    const fixture = await seedCasesFixture(app, prisma);
    const { application } = await createReceivedApplication(app, fixture);
    const createdCase = await createCaseFromApplication(fixture, application.id);

    await request(app.getHttpServer())
      .patch(`/api/v1/cases/${createdCase.id}/status`)
      .set('Authorization', `Bearer ${fixture.responsibleOfficialSessionToken}`)
      .send({ caseStatus: CaseStatus.DECIDED })
      .expect(400);

    await request(app.getHttpServer())
      .patch(`/api/v1/cases/${createdCase.id}/status`)
      .set('Authorization', `Bearer ${fixture.responsibleOfficialSessionToken}`)
      .send({ caseStatus: CaseStatus.ISSUED })
      .expect(400);
  });

  it('allows officials to assign a case manager and blocks applicants', async () => {
    const fixture = await seedCasesFixture(app, prisma);
    const { application } = await createReceivedApplication(app, fixture);
    const createdCase = await createCaseFromApplication(fixture, application.id);

    const assigned = asCaseBody(
      (
        await request(app.getHttpServer())
          .patch(`/api/v1/cases/${createdCase.id}/manager`)
          .set('Authorization', `Bearer ${fixture.responsibleOfficialSessionToken}`)
          .send({
            caseManagerOfficeholderId: fixture.responsibleOfficialOfficeholderId,
            assignedOfficeId: fixture.responsibleOfficeId,
          })
          .expect(200)
      ).body,
    );

    expect(assigned.currentCaseManagerOfficeholderId).toBe(
      fixture.responsibleOfficialOfficeholderId,
    );
    expect(assigned.currentAssignedOfficeId).toBe(fixture.responsibleOfficeId);

    await request(app.getHttpServer())
      .patch(`/api/v1/cases/${createdCase.id}/manager`)
      .set('Authorization', `Bearer ${fixture.applicantSessionToken}`)
      .send({
        caseManagerOfficeholderId: fixture.responsibleOfficialOfficeholderId,
      })
      .expect(403);
  });
});
