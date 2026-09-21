import { type INestApplication } from '@nestjs/common';
import {
  AccountStatus,
  ApplicantCategory,
  ApplicationStatus,
  CaseStatus,
  DeficiencyNoticeStatus,
  RepresentativeAuthorityStatus,
} from '@prisma/client';
import request from 'supertest';
import { type App } from 'supertest/types';

import { CaseFoundationService } from '../src/application-processing/cases/case-foundation.service';
import { type PrismaService } from '../src/database/prisma.service';
import {
  seedApplicationProcessingFixture,
  seedCaseFromApplication,
} from './helpers/application-processing-test-fixtures';
import {
  asCitizenActionsBody,
  asCitizenApplicationDetailBody,
  asCitizenApplicationsBody,
  asCitizenCaseStatusBody,
  asCitizenHomeBody,
  asCitizenMeBody,
} from './helpers/citizen-experience-test-types';
import { createIntegrationApp, resetAllTestData } from './helpers/integration-app';

describe('Citizen Experience API (integration)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let fixture: Awaited<ReturnType<typeof seedApplicationProcessingFixture>>;
  let caseId: string;
  let applicationId: string;

  beforeAll(async () => {
    const integration = await createIntegrationApp();
    app = integration.app;
    prisma = integration.prisma;
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    await resetAllTestData(prisma);
    fixture = await seedApplicationProcessingFixture(app, prisma);
    const foundation = app.get(CaseFoundationService);
    const seeded = await seedCaseFromApplication(prisma, foundation, fixture);
    caseId = seeded.caseId;
    applicationId = seeded.applicationId;
  });

  it('returns aggregated /me profile for authenticated citizen', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/experience/citizen/me')
      .set('Authorization', `Bearer ${fixture.applicantSessionToken}`)
      .expect(200);

    const body = asCitizenMeBody(response.body);
    expect(body.profile.identityId).toBe(fixture.applicantIdentityId);
    expect(body.accountAssurance.hasGovernmentAuthority).toBe(false);
    expect(body.disclaimer.labelKey).toBe('citizen.me.disclaimer');
  });

  it('returns zero-state home aggregation when citizen has no additional records', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/experience/citizen/home')
      .set('Authorization', `Bearer ${fixture.applicantSessionToken}`)
      .expect(200);

    const body = asCitizenHomeBody(response.body);
    expect(typeof body.counts.activeApplications).toBe('number');
    expect(typeof body.counts.actionRequired).toBe('number');
    expect(typeof body.counts.pendingGovernmentRequests).toBe('number');
    expect(body.disclaimer.labelKey).toBe('citizen.home.disclaimer');
  });

  it('lists only the citizen own applications with pagination', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/experience/citizen/applications?page=1&pageSize=10')
      .set('Authorization', `Bearer ${fixture.applicantSessionToken}`)
      .expect(200);

    const body = asCitizenApplicationsBody(response.body);
    expect(body.items).toHaveLength(1);
    expect(body.items[0]?.applicationId).toBe(applicationId);
    expect(body.pagination.totalItems).toBe(1);
    expect(body.pagination.hasNextPage).toBe(false);
  });

  it('returns application detail for owned application', async () => {
    const response = await request(app.getHttpServer())
      .get(`/api/v1/experience/citizen/applications/${applicationId}`)
      .set('Authorization', `Bearer ${fixture.applicantSessionToken}`)
      .expect(200);

    const body = asCitizenApplicationDetailBody(response.body);
    expect(body.applicationId).toBe(applicationId);
    expect(body.attribution.serviceId).toBe(fixture.governmentServiceId);
    expect(body.disclaimer.labelKey).toBe('citizen.application.disclaimer');
  });

  it('returns applicant-safe case status without internal notes', async () => {
    await request(app.getHttpServer())
      .post(`/api/v1/cases/${caseId}/communications`)
      .set('Authorization', `Bearer ${fixture.officialSessionToken}`)
      .send({
        communicationType: 'INTERNAL_NOTE',
        recipientType: 'INTERNAL',
        channel: 'PORTAL',
        body: 'Privileged internal note',
      })
      .expect(201);

    const response = await request(app.getHttpServer())
      .get(`/api/v1/experience/citizen/cases/${caseId}/status`)
      .set('Authorization', `Bearer ${fixture.applicantSessionToken}`)
      .expect(200);

    const body = asCitizenCaseStatusBody(response.body);
    expect(body.caseId).toBe(caseId);
    expect(body.applicantDisclaimer.labelKey).toBe('citizen.case.applicant_disclaimer');
    expect(JSON.stringify(response.body)).not.toContain('Privileged internal note');
  });

  it('denies cross-citizen access to applications and cases', async () => {
    await request(app.getHttpServer())
      .get(`/api/v1/experience/citizen/applications/${applicationId}`)
      .set('Authorization', `Bearer ${fixture.officialSessionToken}`)
      .expect(403);

    await request(app.getHttpServer())
      .get(`/api/v1/experience/citizen/cases/${caseId}/status`)
      .set('Authorization', `Bearer ${fixture.officialSessionToken}`)
      .expect(403);
  });

  it('rejects suspended account session on citizen endpoints', async () => {
    const account = await prisma.userAccount.findFirstOrThrow({
      where: { identities: { some: { id: fixture.applicantIdentityId } } },
    });

    await prisma.userAccount.update({
      where: { id: account.id },
      data: { status: AccountStatus.SUSPENDED },
    });

    await request(app.getHttpServer())
      .get('/api/v1/experience/citizen/me')
      .set('Authorization', `Bearer ${fixture.applicantSessionToken}`)
      .expect(401);
  });

  it('derives action center tasks from existing state and does not invent actions', async () => {
    const emptyResponse = await request(app.getHttpServer())
      .get('/api/v1/experience/citizen/actions')
      .set('Authorization', `Bearer ${fixture.applicantSessionToken}`)
      .expect(200);

    expect(asCitizenActionsBody(emptyResponse.body).items).toEqual([]);

    await prisma.case.update({
      where: { id: caseId },
      data: { status: CaseStatus.WAITING_APPLICANT },
    });

    const withAction = await request(app.getHttpServer())
      .get('/api/v1/experience/citizen/actions')
      .set('Authorization', `Bearer ${fixture.applicantSessionToken}`)
      .expect(200);

    const actions = asCitizenActionsBody(withAction.body);
    expect(actions.items.length).toBeGreaterThan(0);
    expect(actions.items[0]?.actionCode).toBe('PROVIDE_MISSING_INFORMATION');
    expect(actions.items[0]?.label.labelKey).toBe('citizen.action.provide_missing_information');
    expect(actions.items[0]?.deepLink.route).toBe('citizen.case.status');
  });

  it('includes draft application and deficiency notice actions when present', async () => {
    await prisma.application.create({
      data: {
        applicantIdentityId: fixture.applicantIdentityId,
        governmentServiceId: fixture.governmentServiceId,
        governmentServiceVersionId: fixture.governmentServiceVersionId,
        formDefinitionId: fixture.formDefinitionId,
        formVersionId: fixture.formVersionId,
        configurationFingerprint: fixture.configurationFingerprint,
        applicantCategory: ApplicantCategory.CITIZEN,
        status: ApplicationStatus.DRAFT,
      },
    });

    const submission = await prisma.applicationSubmission.create({
      data: {
        applicationId,
        submissionNumber: 'SUB-CITIZEN-EXP-001',
        sequenceNumber: 1,
        answersSnapshot: {},
        configurationFingerprint: fixture.configurationFingerprint,
        governmentServiceVersionId: fixture.governmentServiceVersionId,
        formVersionId: fixture.formVersionId,
        contentHash: 'test-content-hash',
      },
    });

    await prisma.deficiencyNotice.create({
      data: {
        applicationSubmissionId: submission.id,
        status: DeficiencyNoticeStatus.ISSUED,
        instructions: 'Upload certificate',
        missingItems: [],
      },
    });

    const response = await request(app.getHttpServer())
      .get('/api/v1/experience/citizen/actions?page=1&pageSize=20')
      .set('Authorization', `Bearer ${fixture.applicantSessionToken}`)
      .expect(200);

    const actions = asCitizenActionsBody(response.body);
    const actionCodes = actions.items.map((item) => item.actionCode);
    expect(actionCodes).toContain('COMPLETE_DRAFT_APPLICATION');
    expect(actionCodes).toContain('PROVIDE_MISSING_INFORMATION');
    expect(actions.pagination.page).toBe(1);
    expect(actions.pagination.pageSize).toBe(20);
  });

  it('limits representative scope to active representation and excludes expired authority', async () => {
    const organization = await prisma.organization.create({
      data: {
        code: 'REP-ORG',
        name: 'Represented Organization',
      },
    });

    const expiredAuthority = await prisma.representativeAuthority.create({
      data: {
        organizationId: organization.id,
        identityId: fixture.applicantIdentityId,
        scopeDescription: 'Expired scope',
        status: RepresentativeAuthorityStatus.ENDED,
        effectiveFrom: new Date('2020-01-01'),
        effectiveUntil: new Date('2021-01-01'),
      },
    });

    const activeAuthority = await prisma.representativeAuthority.create({
      data: {
        organizationId: organization.id,
        identityId: fixture.applicantIdentityId,
        scopeDescription: 'Active scope',
        status: RepresentativeAuthorityStatus.ACTIVE,
        effectiveFrom: new Date('2020-01-01'),
      },
    });

    const repApplication = await prisma.application.create({
      data: {
        applicantIdentityId: fixture.applicantIdentityId,
        organizationId: organization.id,
        representativeAuthorityId: activeAuthority.id,
        governmentServiceId: fixture.governmentServiceId,
        governmentServiceVersionId: fixture.governmentServiceVersionId,
        formDefinitionId: fixture.formDefinitionId,
        formVersionId: fixture.formVersionId,
        configurationFingerprint: fixture.configurationFingerprint,
        applicantCategory: ApplicantCategory.AUTHORIZED_REPRESENTATIVE,
        status: ApplicationStatus.DRAFT,
      },
    });

    await prisma.application.create({
      data: {
        applicantIdentityId: fixture.applicantIdentityId,
        organizationId: organization.id,
        representativeAuthorityId: expiredAuthority.id,
        governmentServiceId: fixture.governmentServiceId,
        governmentServiceVersionId: fixture.governmentServiceVersionId,
        formDefinitionId: fixture.formDefinitionId,
        formVersionId: fixture.formVersionId,
        configurationFingerprint: fixture.configurationFingerprint,
        applicantCategory: ApplicantCategory.AUTHORIZED_REPRESENTATIVE,
        status: ApplicationStatus.DRAFT,
      },
    });

    const meResponse = await request(app.getHttpServer())
      .get('/api/v1/experience/citizen/me')
      .set('Authorization', `Bearer ${fixture.applicantSessionToken}`)
      .expect(200);

    const meBody = asCitizenMeBody(meResponse.body);
    expect(meBody.representationRelationships).toHaveLength(1);
    expect(meBody.representationRelationships[0]?.representativeAuthorityId).toBe(
      activeAuthority.id,
    );

    const listResponse = await request(app.getHttpServer())
      .get('/api/v1/experience/citizen/applications?page=1&pageSize=50')
      .set('Authorization', `Bearer ${fixture.applicantSessionToken}`)
      .expect(200);

    const listedIds = asCitizenApplicationsBody(listResponse.body).items.map(
      (item) => item.applicationId,
    );
    expect(listedIds).toContain(repApplication.id);
    expect(listedIds).not.toContain(
      (
        await prisma.application.findFirst({
          where: { representativeAuthorityId: expiredAuthority.id },
          select: { id: true },
        })
      )?.id,
    );
  });

  it('requires authentication for all citizen experience endpoints', async () => {
    await request(app.getHttpServer()).get('/api/v1/experience/citizen/me').expect(401);
    await request(app.getHttpServer()).get('/api/v1/experience/citizen/home').expect(401);
    await request(app.getHttpServer()).get('/api/v1/experience/citizen/actions').expect(401);
    await request(app.getHttpServer()).get('/api/v1/experience/citizen/applications').expect(401);
  });
});
