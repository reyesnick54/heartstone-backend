import { type INestApplication } from '@nestjs/common';
import {
  ApplicantCategory,
  DashboardConsoleType,
  DashboardDefinitionStatus,
  RepresentativeAuthorityStatus,
  SecurityAuditEventType,
} from '@prisma/client';
import request from 'supertest';
import { type App } from 'supertest/types';

import { PrismaService } from '../src/database/prisma.service';
import {
  ScopeAccessIntent,
  ScopedResourceType,
} from '../src/institutional-scope/institutional-scope.types';
import { ResourceAccessService } from '../src/institutional-scope/resource-access.service';
import {
  provisionAuthenticatedIdentity,
  sessionPrincipalForIdentity,
} from './helpers/identity-provisioning.fixture';
import { createIntegrationApp, resetAllTestData } from './helpers/integration-app';
import {
  type Phase6FixtureContext,
  seedPhase6Fixture,
  VALID_FORM_ANSWERS,
} from './helpers/phase-6-test-fixtures';
import { asApplicationBody, asSubmitApplicationResponseBody } from './helpers/phase-6-test-types';

describe('Institutional scope enforcement (integration)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let resourceAccess: ResourceAccessService;
  let fixture: Phase6FixtureContext;

  beforeAll(async () => {
    ({ app } = await createIntegrationApp());
    prisma = app.get(PrismaService);
    resourceAccess = app.get(ResourceAccessService);
  });

  beforeEach(async () => {
    await resetAllTestData(prisma);
    fixture = await seedPhase6Fixture(app, prisma);
  });

  afterAll(async () => {
    await app.close();
  });

  async function createCitizenSession(loginSuffix: string) {
    const marker = `scope-${loginSuffix}`;
    const identity = await provisionAuthenticatedIdentity(app, prisma, {
      loginIdentifier: `${marker}@test.gov`,
      password: 'ScopeTest123!',
      givenName: 'Scope',
      familyName: loginSuffix,
      displayName: `Scope ${loginSuffix}`,
    });

    const session = await sessionPrincipalForIdentity(prisma, identity.identityId);
    return { identityId: identity.identityId, sessionToken: identity.sessionToken, session };
  }

  async function submitApplicationForApplicant(sessionToken: string) {
    const draft = asApplicationBody(
      (
        await request(app.getHttpServer())
          .post('/api/v1/applications')
          .set('Authorization', `Bearer ${sessionToken}`)
          .send({
            governmentServiceVersionId: fixture.governmentServiceVersionId,
            formDefinitionId: fixture.formDefinitionId,
            formVersionId: fixture.formVersionId,
            configurationFingerprint: fixture.configurationFingerprint,
            applicantCategory: ApplicantCategory.INDIVIDUAL,
            draftAnswers: VALID_FORM_ANSWERS,
          })
          .expect(201)
      ).body,
    );

    return asSubmitApplicationResponseBody(
      (
        await request(app.getHttpServer())
          .post(`/api/v1/applications/${draft.id}/submit`)
          .set('Authorization', `Bearer ${sessionToken}`)
          .send({
            answers: VALID_FORM_ANSWERS,
            configurationFingerprint: fixture.configurationFingerprint,
            idempotencyKey: `scope-${draft.id}`,
          })
          .expect(201)
      ).body,
    );
  }

  it('denies random authenticated citizen from enumerating another citizen application', async () => {
    const owner = await createCitizenSession('owner');
    const intruder = await createCitizenSession('intruder');
    const submitted = await submitApplicationForApplicant(owner.sessionToken);

    await request(app.getHttpServer())
      .get(`/api/v1/applications/${submitted.applicationId}`)
      .set('Authorization', `Bearer ${intruder.sessionToken}`)
      .expect(404);

    const audit = await prisma.securityAuditEvent.findFirst({
      where: {
        eventType: SecurityAuditEventType.SCOPE_ACCESS_DENIED,
        identityId: intruder.identityId,
      },
    });

    expect(audit?.metadata).toMatchObject({
      resourceType: ScopedResourceType.APPLICATION,
      resourceId: submitted.applicationId,
      idorAttempt: true,
    });
  });

  it('denies applicant from retrieving another applicant case', async () => {
    const owner = await createCitizenSession('case-owner');
    const intruder = await createCitizenSession('case-intruder');
    const submitted = await submitApplicationForApplicant(owner.sessionToken);

    await request(app.getHttpServer())
      .get(`/api/v1/cases/${submitted.case.id}`)
      .set('Authorization', `Bearer ${intruder.sessionToken}`)
      .expect(403);
  });

  it('denies official from Department A accessing Department B case', async () => {
    const owner = await createCitizenSession('dept-case-owner');
    const submitted = await submitApplicationForApplicant(owner.sessionToken);

    const departmentB = await prisma.department.create({
      data: {
        institutionId: fixture.institutionId,
        code: 'SCOPE-DEPT-B',
        name: 'Scope Department B',
      },
    });

    await prisma.case.update({
      where: { id: submitted.case.id },
      data: { responsibleDepartmentId: departmentB.id },
    });

    await request(app.getHttpServer())
      .get(`/api/v1/cases/${submitted.case.id}`)
      .set('Authorization', `Bearer ${fixture.officialSessionToken}`)
      .expect(403);
  });

  it('denies institution A actor from institution B dashboard visibility', async () => {
    const institutionB = await prisma.institution.create({
      data: {
        jurisdictionId: fixture.jurisdictionId,
        code: 'SCOPE-INST-B',
        name: 'Scope Institution B',
        type: 'AGENCY',
      },
    });

    const dashboard = await prisma.dashboardDefinition.create({
      data: {
        code: 'SCOPE-DASH-B',
        name: 'Institution B Dashboard',
        consoleType: DashboardConsoleType.EXECUTIVE_COMMAND,
        status: DashboardDefinitionStatus.ACTIVE,
        institutionId: institutionB.id,
      },
    });

    const session = await sessionPrincipalForIdentity(prisma, fixture.officialIdentityId);

    const dashboardAccess = await resourceAccess.evaluateWithoutThrow({
      session,
      resourceType: ScopedResourceType.DASHBOARD,
      resourceId: dashboard.id,
      intent: ScopeAccessIntent.VISIBILITY,
    });

    expect(dashboardAccess.allowed).toBe(false);
    expect(dashboardAccess.reason).toBe('cross_institution');
  });

  it('denies representative acting outside representation scope', async () => {
    const applicant = await createCitizenSession('represented-applicant');
    const representative = await createCitizenSession('representative');
    const organization = await prisma.organization.create({
      data: { code: 'SCOPE-ORG-A', name: 'Scope Org A' },
    });
    const otherOrganization = await prisma.organization.create({
      data: { code: 'SCOPE-ORG-B', name: 'Scope Org B' },
    });

    const authority = await prisma.representativeAuthority.create({
      data: {
        organizationId: organization.id,
        identityId: representative.identityId,
        scopeDescription: 'Permitted org A only',
        status: RepresentativeAuthorityStatus.ACTIVE,
        effectiveFrom: new Date('2020-01-01'),
      },
    });

    const application = await prisma.application.create({
      data: {
        applicantIdentityId: applicant.identityId,
        organizationId: otherOrganization.id,
        representativeAuthorityId: authority.id,
        governmentServiceId: fixture.governmentServiceId,
        governmentServiceVersionId: fixture.governmentServiceVersionId,
        formDefinitionId: fixture.formDefinitionId,
        formVersionId: fixture.formVersionId,
        configurationFingerprint: fixture.configurationFingerprint,
        applicantCategory: ApplicantCategory.AUTHORIZED_REPRESENTATIVE,
        status: 'DRAFT',
      },
    });

    const result = await resourceAccess.evaluateWithoutThrow({
      session: representative.session,
      resourceType: ScopedResourceType.APPLICATION,
      resourceId: application.id,
      intent: ScopeAccessIntent.VISIBILITY,
      representativeAuthorityId: authority.id,
    });

    expect(result.allowed).toBe(false);
    expect(result.reason).toBe('cross_organization');
  });

  it('denies inactive representative authority', async () => {
    const applicant = await createCitizenSession('inactive-rep-applicant');
    const representative = await createCitizenSession('inactive-rep');
    const organization = await prisma.organization.create({
      data: { code: 'SCOPE-ORG-INACTIVE', name: 'Inactive Org' },
    });

    const authority = await prisma.representativeAuthority.create({
      data: {
        organizationId: organization.id,
        identityId: representative.identityId,
        scopeDescription: 'Revoked authority',
        status: RepresentativeAuthorityStatus.REVOKED,
        effectiveFrom: new Date('2020-01-01'),
      },
    });

    const application = await prisma.application.create({
      data: {
        applicantIdentityId: applicant.identityId,
        organizationId: organization.id,
        representativeAuthorityId: authority.id,
        governmentServiceId: fixture.governmentServiceId,
        governmentServiceVersionId: fixture.governmentServiceVersionId,
        formDefinitionId: fixture.formDefinitionId,
        formVersionId: fixture.formVersionId,
        configurationFingerprint: fixture.configurationFingerprint,
        applicantCategory: ApplicantCategory.AUTHORIZED_REPRESENTATIVE,
        status: 'DRAFT',
      },
    });

    await expect(
      resourceAccess.evaluateWithoutThrow({
        session: representative.session,
        resourceType: ScopedResourceType.APPLICATION,
        resourceId: application.id,
        intent: ScopeAccessIntent.VISIBILITY,
        representativeAuthorityId: authority.id,
      }),
    ).resolves.toMatchObject({
      allowed: false,
      reason: 'inactive_representative',
    });
  });

  it('denies cross-organization membership access', async () => {
    const member = await createCitizenSession('org-member');
    const holderOrg = await prisma.organization.create({
      data: { code: 'SCOPE-HOLDER-ORG', name: 'Holder Org' },
    });
    await prisma.organizationMembership.create({
      data: {
        organizationId: holderOrg.id,
        identityId: member.identityId,
        status: 'ACTIVE',
        effectiveFrom: new Date('2020-01-01'),
      },
    });

    const otherOrg = await prisma.organization.create({
      data: { code: 'SCOPE-OTHER-ORG', name: 'Other Org' },
    });

    await expect(
      resourceAccess.evaluateWithoutThrow({
        session: member.session,
        resourceType: ScopedResourceType.ORGANIZATION,
        resourceId: otherOrg.id,
        intent: ScopeAccessIntent.VISIBILITY,
      }),
    ).resolves.toMatchObject({
      allowed: false,
      reason: 'raw_uuid_insufficient',
    });
  });

  it('denies raw UUID knowledge without legitimate actor path', async () => {
    const intruder = await createCitizenSession('uuid-intruder');
    const owner = await createCitizenSession('uuid-owner');
    const submitted = await submitApplicationForApplicant(owner.sessionToken);

    await request(app.getHttpServer())
      .get(`/api/v1/applications/${submitted.applicationId}`)
      .set('Authorization', `Bearer ${intruder.sessionToken}`)
      .expect(404);
  });

  it('fails closed when resource ownership is unresolved', async () => {
    const actor = await createCitizenSession('unresolved-owner');
    const dashboard = await prisma.dashboardDefinition.create({
      data: {
        code: 'SCOPE-UNSCOPED',
        name: 'Unscoped Dashboard',
        consoleType: DashboardConsoleType.EXECUTIVE_COMMAND,
        status: DashboardDefinitionStatus.DRAFT,
      },
    });

    await expect(
      resourceAccess.evaluateWithoutThrow({
        session: actor.session,
        resourceType: ScopedResourceType.DASHBOARD,
        resourceId: dashboard.id,
        intent: ScopeAccessIntent.VISIBILITY,
      }),
    ).resolves.toMatchObject({
      allowed: false,
      reason: 'unresolved_ownership',
    });
  });

  it('denies technical administrator substantive government data access', async () => {
    const owner = await createCitizenSession('tech-admin-owner');
    const submitted = await submitApplicationForApplicant(owner.sessionToken);

    const session = await sessionPrincipalForIdentity(prisma, fixture.officialIdentityId);

    await expect(
      resourceAccess.evaluateWithoutThrow({
        session,
        resourceType: ScopedResourceType.CASE,
        resourceId: submitted.case.id,
        intent: ScopeAccessIntent.VISIBILITY,
        isTechnicalAdministrator: true,
      }),
    ).resolves.toMatchObject({
      allowed: false,
      reason: 'technical_admin_substantive_denied',
    });
  });

  it('records structured security audit events for denied scope attempts', async () => {
    const intruder = await createCitizenSession('audit-intruder');
    const owner = await createCitizenSession('audit-owner');
    const submitted = await submitApplicationForApplicant(owner.sessionToken);

    await request(app.getHttpServer())
      .get(`/api/v1/cases/${submitted.case.id}`)
      .set('Authorization', `Bearer ${intruder.sessionToken}`)
      .expect(403);

    const audit = await prisma.securityAuditEvent.findFirst({
      where: {
        eventType: SecurityAuditEventType.SCOPE_ACCESS_DENIED,
        identityId: intruder.identityId,
      },
      orderBy: { createdAt: 'desc' },
    });

    expect(audit).toBeTruthy();
    expect(audit?.metadata).toMatchObject({
      domain: 'institutional-scope',
      resourceType: ScopedResourceType.CASE,
      resourceId: submitted.case.id,
      intent: ScopeAccessIntent.VISIBILITY,
      idorAttempt: true,
    });
  });
});
