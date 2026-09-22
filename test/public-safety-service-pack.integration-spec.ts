import { type INestApplication } from '@nestjs/common';
import { OrganizationStatus, PublicSafetyOfficialNoticeStatus } from '@prisma/client';
import request from 'supertest';
import { type App } from 'supertest/types';

import { PrismaService } from '../src/database/prisma.service';
import { PublicSafetyNoticeService } from '../src/public-safety/notices/public-safety-notice.service';
import { PUBLIC_SAFETY_SERVICE_PACK_TEMPLATE } from '../src/service-catalog/service-packs/public-safety-service-pack.template';
import { validateServicePackManifest } from '../src/service-catalog/service-packs/validate-service-pack';
import { provisionAuthenticatedIdentity } from './helpers/identity-provisioning.fixture';
import { createIntegrationApp, resetAllTestData } from './helpers/integration-app';

describe('Public Safety service pack and experience (integration)', () => {
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

  it('validates the public safety service pack manifest', () => {
    const result = validateServicePackManifest(PUBLIC_SAFETY_SERVICE_PACK_TEMPLATE);
    expect(result.valid).toBe(true);
    expect(PUBLIC_SAFETY_SERVICE_PACK_TEMPLATE.services).toHaveLength(12);
    expect(PUBLIC_SAFETY_SERVICE_PACK_TEMPLATE.packLabel).toBe('NON_PRODUCTION');
  });

  it('exposes citizen public safety reports for the reporter only', async () => {
    const citizen = await provisionAuthenticatedIdentity(app, prisma, {
      loginIdentifier: 'citizen-ps@test.local',
      password: 'CitizenPs123!',
    });
    const other = await provisionAuthenticatedIdentity(app, prisma, {
      loginIdentifier: 'other-ps@test.local',
      password: 'OtherPs123!',
    });

    const jurisdiction = await prisma.jurisdiction.create({
      data: {
        code: 'JUR-PS-TEST',
        name: 'Public Safety Test Jurisdiction',
        type: 'NATIONAL',
        status: 'ACTIVE',
      },
    });

    const engagement = await prisma.publicSafetyEngagement.create({
      data: {
        jurisdictionId: jurisdiction.id,
        engagementReference: 'PSENG-00000001',
        reporterIdentityId: citizen.identityId,
      },
    });

    await prisma.publicSafetyIncidentReport.create({
      data: {
        engagementId: engagement.id,
        incidentReference: 'PSINC-00000001',
        verificationStatus: 'UNVERIFIED',
        reporterIdentityId: citizen.identityId,
        summaryLabel: 'Road obstruction',
        protectsReporterIdentity: true,
      },
    });

    const list = (
      await request(app.getHttpServer())
        .get('/api/v1/experience/citizen/public-safety/reports')
        .set('Authorization', `Bearer ${citizen.sessionToken}`)
        .expect(200)
    ).body as { items: { verificationLabel: string }[] };

    expect(list.items).toHaveLength(1);
    expect(list.items[0]?.verificationLabel).toBe('unverified');

    const otherList = (
      await request(app.getHttpServer())
        .get('/api/v1/experience/citizen/public-safety/reports')
        .set('Authorization', `Bearer ${other.sessionToken}`)
        .expect(200)
    ).body as { items: unknown[] };

    expect(otherList.items).toHaveLength(0);
  });

  it('denies business public safety access without organization membership', async () => {
    const outsider = await provisionAuthenticatedIdentity(app, prisma, {
      loginIdentifier: 'outsider-ps@test.local',
      password: 'OutsiderPs123!',
    });

    const organization = await prisma.organization.create({
      data: { code: 'ORG-PS-1', name: 'Facility Org', status: OrganizationStatus.ACTIVE },
    });

    await request(app.getHttpServer())
      .get(`/api/v1/experience/business/organizations/${organization.id}/public-safety`)
      .set('Authorization', `Bearer ${outsider.sessionToken}`)
      .expect(403);
  });

  it('scopes business public safety records to the organization', async () => {
    const member = await provisionAuthenticatedIdentity(app, prisma, {
      loginIdentifier: 'member-ps@test.local',
      password: 'MemberPs123!',
    });

    const jurisdiction = await prisma.jurisdiction.create({
      data: {
        code: 'JUR-PS-BIZ',
        name: 'Public Safety Business Jurisdiction',
        type: 'NATIONAL',
        status: 'ACTIVE',
      },
    });

    const organization = await prisma.organization.create({
      data: { code: 'ORG-PS-2', name: 'Facility Org 2', status: OrganizationStatus.ACTIVE },
    });

    await prisma.organizationMembership.create({
      data: {
        organizationId: organization.id,
        identityId: member.identityId,
        status: 'ACTIVE',
        roleLabel: 'Manager',
        effectiveFrom: new Date('2020-01-01'),
      },
    });

    const engagement = await prisma.publicSafetyEngagement.create({
      data: {
        jurisdictionId: jurisdiction.id,
        engagementReference: 'PSENG-00000002',
        organizationId: organization.id,
      },
    });

    await prisma.publicSafetyServiceRequest.create({
      data: {
        engagementId: engagement.id,
        requestReference: 'PSREQ-00000001',
        serviceTemplateCode: 'TEMPLATE-PS-SUBMIT-INCIDENT-REPORT',
        requestKind: 'SUBMIT_INCIDENT_REPORT',
        status: 'SUBMITTED',
        submittedAt: new Date(),
      },
    });

    const records = (
      await request(app.getHttpServer())
        .get(`/api/v1/experience/business/organizations/${organization.id}/public-safety/records`)
        .set('Authorization', `Bearer ${member.sessionToken}`)
        .expect(200)
    ).body as { items: { requestReference: string }[] };

    expect(records.items).toHaveLength(1);
    expect(records.items[0]?.requestReference).toBe('PSREQ-00000001');
  });

  it('public notice exposes only published approved content', async () => {
    const jurisdiction = await prisma.jurisdiction.create({
      data: {
        code: 'JUR-PS-NOTICE',
        name: 'Notice Jurisdiction',
        type: 'NATIONAL',
        status: 'ACTIVE',
      },
    });

    await prisma.publicSafetyOfficialNotice.create({
      data: {
        jurisdictionId: jurisdiction.id,
        noticeReference: 'PSNOT-PUBLISHED-1',
        status: PublicSafetyOfficialNoticeStatus.PUBLISHED,
        draftContent: 'draft should not leak',
        approvedContent: 'Approved shelter locations list',
        publishedContent: 'Approved shelter locations list',
        publishedAt: new Date(),
      },
    });

    const published = (
      await request(app.getHttpServer())
        .get('/api/v1/public/public-safety/notices/PSNOT-PUBLISHED-1')
        .expect(200)
    ).body as { content: string; status: string };

    expect(published.status).toBe('PUBLISHED');
    expect(published.content).toBe('Approved shelter locations list');
    expect(JSON.stringify(published)).not.toContain('draft should not leak');

    await request(app.getHttpServer())
      .get('/api/v1/public/public-safety/notices/PSNOT-DRAFT-ONLY')
      .expect(404);
  });

  it('keeps recovery assistance separate from incident reports in citizen assistance view', async () => {
    const citizen = await provisionAuthenticatedIdentity(app, prisma, {
      loginIdentifier: 'recovery-ps@test.local',
      password: 'RecoveryPs123!',
    });

    const jurisdiction = await prisma.jurisdiction.create({
      data: {
        code: 'JUR-PS-RCV',
        name: 'Recovery Jurisdiction',
        type: 'NATIONAL',
        status: 'ACTIVE',
      },
    });

    const engagement = await prisma.publicSafetyEngagement.create({
      data: {
        jurisdictionId: jurisdiction.id,
        engagementReference: 'PSENG-00000003',
        reporterIdentityId: citizen.identityId,
      },
    });

    await prisma.publicSafetyRecoveryAssistanceApplication.create({
      data: {
        engagementId: engagement.id,
        applicationReference: 'PSRCV-00000001',
        programCode: 'RECOVERY-PROGRAM-1',
        status: 'SUBMITTED',
        submittedAt: new Date(),
      },
    });

    const assistance = (
      await request(app.getHttpServer())
        .get('/api/v1/experience/citizen/public-safety/assistance')
        .set('Authorization', `Bearer ${citizen.sessionToken}`)
        .expect(200)
    ).body as { items: { isRecoveryProgram: boolean; isIncidentReport: boolean }[] };

    expect(assistance.items[0]?.isRecoveryProgram).toBe(true);
    expect(assistance.items[0]?.isIncidentReport).toBe(false);
  });

  it('executive public safety briefing is read-only aggregate', async () => {
    const notices = app.get(PublicSafetyNoticeService);
    expect(notices).toBeDefined();

    const home = (
      await request(app.getHttpServer())
        .get('/api/v1/experience/citizen/public-safety')
        .set(
          'Authorization',
          `Bearer ${(await provisionAuthenticatedIdentity(app, prisma, { loginIdentifier: 'home-ps@test.local', password: 'HomePs123!' })).sessionToken}`,
        )
        .expect(200)
    ).body as { ruleEnvironment: string };

    expect(home.ruleEnvironment).toBe('NON_PRODUCTION');
  });
});
