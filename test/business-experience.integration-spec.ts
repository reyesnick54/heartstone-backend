import { type INestApplication } from '@nestjs/common';
import {
  ApplicantCategory,
  ApplicationStatus,
  CaseStatus,
  ComplianceMatterStatus,
  ContinuingObligationSourceType,
  ContinuingObligationStatus,
  ContinuingObligationType,
  DeficiencyNoticeStatus,
  MembershipStatus,
  OfficialInstrumentStatus,
  RepresentativeAuthorityStatus,
  StrategicProjectMilestoneStatus,
} from '@prisma/client';
import request from 'supertest';
import { type App } from 'supertest/types';

import { type PrismaService } from '../src/database/prisma.service';
import { StrategicProjectProfileService } from '../src/intelligence/strategic-projects/strategic-project-profile.service';
import { seedBusinessExperienceFixture } from './helpers/business-experience-test-fixtures';
import {
  asBusinessActionsBody,
  asBusinessApplicationsBody,
  asBusinessComplianceBody,
  asBusinessHomeBody,
  asBusinessLicensesBody,
  asBusinessMessagesBody,
  asBusinessOrganizationDetailBody,
  asBusinessOrganizationsBody,
  asBusinessPaymentsBody,
  asBusinessProjectsBody,
} from './helpers/business-experience-test-types';
import { createIntegrationApp, resetAllTestData } from './helpers/integration-app';

describe('Business Experience API (integration)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let fixture: Awaited<ReturnType<typeof seedBusinessExperienceFixture>>;

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
    fixture = await seedBusinessExperienceFixture(app, prisma);
  });

  it('lists accessible organizations for member and representative actors', async () => {
    const memberResponse = await request(app.getHttpServer())
      .get('/api/v1/experience/business/organizations')
      .set('Authorization', `Bearer ${fixture.memberSessionToken}`)
      .expect(200);

    const memberBody = asBusinessOrganizationsBody(memberResponse.body);
    expect(memberBody.items.some((item) => item.organizationId === fixture.organizationId)).toBe(
      true,
    );
    expect(memberBody.items[0]?.accessPaths).toContain('MEMBERSHIP');
    expect(memberBody.disclaimer.labelKey).toBe('business.organizations.disclaimer');

    const repResponse = await request(app.getHttpServer())
      .get('/api/v1/experience/business/organizations')
      .set('Authorization', `Bearer ${fixture.representativeSessionToken}`)
      .expect(200);

    const repBody = asBusinessOrganizationsBody(repResponse.body);
    expect(repBody.items.some((item) => item.organizationId === fixture.organizationId)).toBe(true);
    expect(repBody.items[0]?.accessPaths).toContain('REPRESENTATIVE_AUTHORITY');
  });

  it('denies unauthorized person from accessing organization resources', async () => {
    await request(app.getHttpServer())
      .get(`/api/v1/experience/business/organizations/${fixture.organizationId}`)
      .set('Authorization', `Bearer ${fixture.outsiderSessionToken}`)
      .expect(403);

    await request(app.getHttpServer())
      .get(`/api/v1/experience/business/organizations/${fixture.organizationId}/home`)
      .set('Authorization', `Bearer ${fixture.outsiderSessionToken}`)
      .expect(403);
  });

  it('denies cross-business UUID access', async () => {
    await request(app.getHttpServer())
      .get(`/api/v1/experience/business/organizations/${fixture.otherOrganizationId}/home`)
      .set('Authorization', `Bearer ${fixture.memberSessionToken}`)
      .expect(403);
  });

  it('fails when organization membership is inactive', async () => {
    await prisma.organizationMembership.updateMany({
      where: {
        organizationId: fixture.organizationId,
        identityId: fixture.memberIdentityId,
      },
      data: { status: MembershipStatus.REVOKED },
    });

    await request(app.getHttpServer())
      .get(`/api/v1/experience/business/organizations/${fixture.organizationId}`)
      .set('Authorization', `Bearer ${fixture.memberSessionToken}`)
      .expect(403);
  });

  it('fails when representative authority is revoked', async () => {
    await prisma.representativeAuthority.updateMany({
      where: {
        organizationId: fixture.organizationId,
        identityId: fixture.representativeIdentityId,
      },
      data: { status: RepresentativeAuthorityStatus.REVOKED },
    });

    await request(app.getHttpServer())
      .get(`/api/v1/experience/business/organizations/${fixture.organizationId}/applications`)
      .set('Authorization', `Bearer ${fixture.representativeSessionToken}`)
      .expect(403);
  });

  it('limits representative scope to applications under active representative authority', async () => {
    const scopedApplication = await prisma.application.create({
      data: {
        applicantIdentityId: fixture.representativeIdentityId,
        organizationId: fixture.organizationId,
        governmentServiceId: fixture.governmentServiceId,
        governmentServiceVersionId: fixture.governmentServiceVersionId,
        formDefinitionId: fixture.formDefinitionId,
        formVersionId: fixture.formVersionId,
        configurationFingerprint: fixture.configurationFingerprint,
        applicantCategory: ApplicantCategory.BUSINESS,
        status: ApplicationStatus.DRAFT,
      },
    });

    const expiredAuthority = await prisma.representativeAuthority.create({
      data: {
        organizationId: fixture.organizationId,
        identityId: fixture.representativeIdentityId,
        scopeDescription: 'Expired scope only',
        status: RepresentativeAuthorityStatus.ENDED,
        effectiveFrom: new Date('2020-01-01'),
        effectiveUntil: new Date('2021-01-01'),
      },
    });

    await prisma.application.create({
      data: {
        applicantIdentityId: fixture.representativeIdentityId,
        organizationId: fixture.organizationId,
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

    const response = await request(app.getHttpServer())
      .get(
        `/api/v1/experience/business/organizations/${fixture.organizationId}/applications?page=1&pageSize=50`,
      )
      .set('Authorization', `Bearer ${fixture.representativeSessionToken}`)
      .expect(200);

    const body = asBusinessApplicationsBody(response.body);
    const listedIds = body.items.map((item) => item.applicationId);
    expect(listedIds).toContain(fixture.applicationId);
    expect(listedIds).not.toContain(scopedApplication.id);
  });

  it('returns organization detail and home summary for authorized member', async () => {
    const detailResponse = await request(app.getHttpServer())
      .get(`/api/v1/experience/business/organizations/${fixture.organizationId}`)
      .set('Authorization', `Bearer ${fixture.memberSessionToken}`)
      .expect(200);

    const detail = asBusinessOrganizationDetailBody(detailResponse.body);
    expect(detail.organizationId).toBe(fixture.organizationId);
    expect(detail.disclaimer.labelKey).toBe('business.organization.disclaimer');

    const homeResponse = await request(app.getHttpServer())
      .get(`/api/v1/experience/business/organizations/${fixture.organizationId}/home`)
      .set('Authorization', `Bearer ${fixture.memberSessionToken}`)
      .expect(200);

    const home = asBusinessHomeBody(homeResponse.body);
    expect(home.organizationId).toBe(fixture.organizationId);
    expect(typeof home.counts.activeApplications).toBe('number');
    expect(home.disclaimer.labelKey).toBe('business.home.disclaimer');
  });

  it('excludes internal government case notes from business messages', async () => {
    await request(app.getHttpServer())
      .post(`/api/v1/cases/${fixture.caseId}/communications`)
      .set('Authorization', `Bearer ${fixture.officialSessionToken}`)
      .send({
        communicationType: 'INTERNAL_NOTE',
        recipientType: 'INTERNAL',
        channel: 'PORTAL',
        body: 'Privileged internal deliberation note',
      })
      .expect(201);

    const response = await request(app.getHttpServer())
      .get(
        `/api/v1/experience/business/organizations/${fixture.organizationId}/messages?page=1&pageSize=20`,
      )
      .set('Authorization', `Bearer ${fixture.memberSessionToken}`)
      .expect(200);

    const body = asBusinessMessagesBody(response.body);
    expect(body.disclaimer.labelKey).toBe('business.messages.disclaimer');
    expect(JSON.stringify(response.body)).not.toContain('Privileged internal deliberation note');
  });

  it('states that payment does not imply approval', async () => {
    const response = await request(app.getHttpServer())
      .get(
        `/api/v1/experience/business/organizations/${fixture.organizationId}/payments?page=1&pageSize=20`,
      )
      .set('Authorization', `Bearer ${fixture.memberSessionToken}`)
      .expect(200);

    const body = asBusinessPaymentsBody(response.body);
    expect(body.items.length).toBeGreaterThan(0);
    expect(body.items[0]?.paymentDoesNotImplyApproval).toBe(true);
    expect(body.disclaimer.labelKey).toBe('business.payments.disclaimer');
  });

  it('reflects authoritative compliance records in compliance listing', async () => {
    const instrumentTypeVersion = await prisma.instrumentTypeVersion.findFirstOrThrow({
      select: { id: true },
    });

    if (!fixture.governmentDecisionId) {
      throw new Error('Expected government decision in business fixture');
    }

    const instrument = await prisma.officialInstrument.create({
      data: {
        instrumentTypeVersionId: instrumentTypeVersion.id,
        governmentDecisionId: fixture.governmentDecisionId,
        caseId: fixture.caseId,
        masterAdministrativeFileId: fixture.masterAdministrativeFileId,
        issuerInstitutionId: fixture.institutionId,
        holderOrganizationId: fixture.organizationId,
        instrumentNumber: 'BIZ-LIC-001',
        status: OfficialInstrumentStatus.ISSUED,
        effectiveFrom: new Date(),
        scope: { activity: 'regulated' },
      },
    });

    const instrumentVersion = await prisma.officialInstrumentVersion.findFirstOrThrow({
      where: { officialInstrumentId: instrument.id },
      select: { id: true },
    });

    const matter = await prisma.complianceMatter.create({
      data: {
        complianceMatterNumber: 'BIZ-CM-001',
        masterAdministrativeFileId: fixture.masterAdministrativeFileId,
        caseId: fixture.caseId,
        officialInstrumentId: instrument.id,
        holderOrganizationId: fixture.organizationId,
        responsibleInstitutionId: fixture.institutionId,
        responsibleDepartmentId: fixture.departmentId,
        status: ComplianceMatterStatus.OPEN,
      },
    });

    await prisma.continuingObligation.create({
      data: {
        complianceMatterId: matter.id,
        sourceType: ContinuingObligationSourceType.INSTRUMENT_VERSION,
        sourceInstrumentVersionId: instrumentVersion.id,
        obligationCode: 'ANNUAL-RETURN',
        description: 'Submit annual return',
        responsibleParty: 'Organization',
        obligationType: ContinuingObligationType.REPORTING,
        startDate: new Date(),
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        status: ContinuingObligationStatus.DUE,
      },
    });

    const response = await request(app.getHttpServer())
      .get(
        `/api/v1/experience/business/organizations/${fixture.organizationId}/compliance?page=1&pageSize=20`,
      )
      .set('Authorization', `Bearer ${fixture.memberSessionToken}`)
      .expect(200);

    const body = asBusinessComplianceBody(response.body);
    expect(body.items.some((item) => item.complianceMatterId === matter.id)).toBe(true);
    expect(body.items[0]?.outstandingObligations[0]?.status).toBe(ContinuingObligationStatus.DUE);
    expect(body.disclaimer.labelKey).toBe('business.compliance.disclaimer');
  });

  it('does not treat reported strategic project milestones as verified completion', async () => {
    const profileService = app.get(StrategicProjectProfileService);
    const project = await profileService.createProfile({
      projectCode: 'BIZ-PROJECT-001',
      title: 'Organization investment project',
      sponsoringInstitutionId: fixture.institutionId,
      responsibleDepartmentId: fixture.departmentId,
      caseId: fixture.caseId,
      attributionMetadata: { platformCausation: false },
    });

    await prisma.strategicProjectMilestone.create({
      data: {
        profileId: project.id,
        title: 'Construction phase reported',
        status: StrategicProjectMilestoneStatus.REPORTED,
        reportedDate: new Date(),
      },
    });

    const response = await request(app.getHttpServer())
      .get(
        `/api/v1/experience/business/organizations/${fixture.organizationId}/projects?page=1&pageSize=20`,
      )
      .set('Authorization', `Bearer ${fixture.memberSessionToken}`)
      .expect(200);

    const body = asBusinessProjectsBody(response.body);
    const projectItem = body.items.find((item) => item.projectId === project.id);
    expect(projectItem?.reportedStatusIsNotVerifiedCompletion).toBe(true);
    expect(projectItem?.milestones[0]?.isVerifiedCompletion).toBe(false);
    expect(body.disclaimer.labelKey).toBe('business.projects.disclaimer');
  });

  it('prevents business from accessing another investor project via cross-org routes', async () => {
    const response = await request(app.getHttpServer())
      .get(
        `/api/v1/experience/business/organizations/${fixture.organizationId}/projects?page=1&pageSize=50`,
      )
      .set('Authorization', `Bearer ${fixture.memberSessionToken}`)
      .expect(200);

    const body = asBusinessProjectsBody(response.body);
    expect(body.items.some((item) => item.projectId === fixture.otherProjectId)).toBe(false);
  });

  it('derives action center tasks from existing state and does not fabricate actions', async () => {
    const emptyResponse = await request(app.getHttpServer())
      .get(
        `/api/v1/experience/business/organizations/${fixture.organizationId}/actions?page=1&pageSize=20`,
      )
      .set('Authorization', `Bearer ${fixture.memberSessionToken}`)
      .expect(200);

    expect(asBusinessActionsBody(emptyResponse.body).items).toEqual([]);

    await prisma.case.update({
      where: { id: fixture.caseId },
      data: { status: CaseStatus.WAITING_APPLICANT },
    });

    const withAction = await request(app.getHttpServer())
      .get(
        `/api/v1/experience/business/organizations/${fixture.organizationId}/actions?page=1&pageSize=20`,
      )
      .set('Authorization', `Bearer ${fixture.memberSessionToken}`)
      .expect(200);

    const actions = asBusinessActionsBody(withAction.body);
    expect(actions.items.length).toBeGreaterThan(0);
    expect(actions.items[0]?.actionCode).toBe('PROVIDE_MISSING_INFORMATION');
    expect(actions.items[0]?.deepLink.route).toBe('business.case.status');
  });

  it('includes deficiency-driven actions when present without inventing unsupported actions', async () => {
    const submission = await prisma.applicationSubmission.create({
      data: {
        applicationId: fixture.applicationId,
        submissionNumber: 'BIZ-SUB-001',
        sequenceNumber: 1,
        answersSnapshot: {},
        configurationFingerprint: fixture.configurationFingerprint,
        governmentServiceVersionId: fixture.governmentServiceVersionId,
        formVersionId: fixture.formVersionId,
        contentHash: 'business-test-hash',
      },
    });

    await prisma.deficiencyNotice.create({
      data: {
        applicationSubmissionId: submission.id,
        status: DeficiencyNoticeStatus.ISSUED,
        instructions: 'Upload corporate registration certificate',
        missingItems: [],
      },
    });

    const response = await request(app.getHttpServer())
      .get(
        `/api/v1/experience/business/organizations/${fixture.organizationId}/actions?page=1&pageSize=20`,
      )
      .set('Authorization', `Bearer ${fixture.memberSessionToken}`)
      .expect(200);

    const actions = asBusinessActionsBody(response.body);
    expect(actions.items.map((item) => item.actionCode)).toContain('PROVIDE_MISSING_INFORMATION');
  });

  it('lists organization-held licenses for authorized member', async () => {
    const instrumentTypeVersion = await prisma.instrumentTypeVersion.findFirstOrThrow({
      select: { id: true },
    });

    if (!fixture.governmentDecisionId) {
      throw new Error('Expected government decision in business fixture');
    }

    await prisma.officialInstrument.create({
      data: {
        instrumentTypeVersionId: instrumentTypeVersion.id,
        governmentDecisionId: fixture.governmentDecisionId,
        caseId: fixture.caseId,
        masterAdministrativeFileId: fixture.masterAdministrativeFileId,
        issuerInstitutionId: fixture.institutionId,
        holderOrganizationId: fixture.organizationId,
        instrumentNumber: 'BIZ-LIC-002',
        status: OfficialInstrumentStatus.EFFECTIVE,
        effectiveFrom: new Date(),
        effectiveUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        scope: { activity: 'regulated' },
      },
    });

    const response = await request(app.getHttpServer())
      .get(
        `/api/v1/experience/business/organizations/${fixture.organizationId}/licenses?page=1&pageSize=20`,
      )
      .set('Authorization', `Bearer ${fixture.memberSessionToken}`)
      .expect(200);

    const body = asBusinessLicensesBody(response.body);
    expect(body.items.length).toBeGreaterThan(0);
    expect(body.items[0]?.approachingExpiry).toBe(true);
    expect(body.disclaimer.labelKey).toBe('business.licenses.disclaimer');
  });

  it('requires authentication for all business experience endpoints', async () => {
    await request(app.getHttpServer()).get('/api/v1/experience/business/organizations').expect(401);
    await request(app.getHttpServer())
      .get(`/api/v1/experience/business/organizations/${fixture.organizationId}/home`)
      .expect(401);
  });
});
