import { type INestApplication } from '@nestjs/common';
import {
  AccountStatus,
  AppointmentStatus,
  AuthorityActionType,
  AuthorityConditionType,
  CaseAssignmentStatus,
  DelegationStatus,
  FunctionAuthorityLifecycleStatus,
  IdentityOfficeholderLinkStatus,
  IdentityType,
  SodRuleType,
} from '@prisma/client';
import request from 'supertest';
import { type App } from 'supertest/types';

import { AUTHORITY_EVALUATION_EXPLANATION_CODES } from '../src/authority/authority.constants';
import { PrismaService } from '../src/database/prisma.service';
import { hashToken } from '../src/identity/common/crypto.util';
import {
  createPasswordAuthenticationMethodViaPrisma,
  createPasswordCredentialViaPrisma,
  loginAndGetSessionToken,
} from './helpers/identity-provisioning.fixture';
import { createIntegrationApp, resetAllTestData } from './helpers/integration-app';
import {
  asOfficialAvailableActionsBody,
  asOfficialCasesListBody,
  asOfficialMeBody,
  asOfficialWorkQueueBody,
} from './helpers/official-experience-test-types';
import { seedPhase6Fixture, VALID_FORM_ANSWERS } from './helpers/phase-6-test-fixtures';
import { asApplicationBody, asSubmitApplicationResponseBody } from './helpers/phase-6-test-types';
import { asServiceStartPackageBody } from './helpers/public-service-test-types';

describe('Official Experience API (e2e)', () => {
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

    const idempotencyKey = `official-exp-${String(Date.now())}`;
    const submitRes = await request(app.getHttpServer())
      .post(`/api/v1/applications/${draft.id}/submit`)
      .set('Authorization', `Bearer ${fixture.applicantSessionToken}`)
      .send({
        answers: VALID_FORM_ANSWERS,
        configurationFingerprint: fixture.configurationFingerprint,
        idempotencyKey,
      })
      .expect(201);

    return asSubmitApplicationResponseBody(submitRes.body);
  }

  it('denies citizen access to official workspace endpoints', async () => {
    const fixture = await seedPhase6Fixture(app, prisma);

    await request(app.getHttpServer())
      .get('/api/v1/experience/official/me')
      .set('Authorization', `Bearer ${fixture.applicantSessionToken}`)
      .expect(403);

    await request(app.getHttpServer())
      .get('/api/v1/experience/official/workspace')
      .set('Authorization', `Bearer ${fixture.applicantSessionToken}`)
      .expect(403);

    await request(app.getHttpServer())
      .get('/api/v1/experience/official/work-queue')
      .set('Authorization', `Bearer ${fixture.applicantSessionToken}`)
      .expect(403);
  });

  it('denies substantive queue access when official has no active appointment', async () => {
    const fixture = await seedPhase6Fixture(app, prisma);

    await prisma.appointment.update({
      where: { id: fixture.appointmentId },
      data: {
        status: AppointmentStatus.ENDED,
        effectiveUntil: new Date('2021-01-01'),
      },
    });

    const me = asOfficialMeBody(
      (
        await request(app.getHttpServer())
          .get('/api/v1/experience/official/me')
          .set('Authorization', `Bearer ${fixture.officialSessionToken}`)
          .expect(200)
      ).body,
    );

    expect(me.technicalCapabilities.hasActiveAppointment).toBe(false);
    expect(me.technicalCapabilities.substantiveAccessAllowed).toBe(false);
    expect(me.hasUniversalAuthority).toBe(false);

    await request(app.getHttpServer())
      .get('/api/v1/experience/official/work-queue')
      .set('Authorization', `Bearer ${fixture.officialSessionToken}`)
      .expect(403);
  });

  it('scopes cases to official department and hides other departments', async () => {
    const fixture = await seedPhase6Fixture(app, prisma);
    const submitResult = await submitCase(fixture);

    const otherDepartment = await prisma.department.create({
      data: {
        institutionId: fixture.institutionId,
        code: 'OTHER-DEPT',
        name: 'Other Department',
      },
    });

    await prisma.case.update({
      where: { id: submitResult.case.id },
      data: { responsibleDepartmentId: otherDepartment.id },
    });

    const cases = asOfficialCasesListBody(
      (
        await request(app.getHttpServer())
          .get('/api/v1/experience/official/cases')
          .set('Authorization', `Bearer ${fixture.officialSessionToken}`)
          .expect(200)
      ).body,
    );

    expect(cases.items.some((item) => item.caseId === submitResult.case.id)).toBe(false);
  });

  it('enforces case assignment restrictions for assigned cases', async () => {
    const fixture = await seedPhase6Fixture(app, prisma);
    const submitResult = await submitCase(fixture);

    const otherPerson = await prisma.person.create({
      data: { givenName: 'Other', familyName: 'Official' },
    });
    const otherAccount = await prisma.userAccount.create({
      data: {
        loginIdentifier: 'other.official@test.gov',
        personId: otherPerson.id,
        status: AccountStatus.ACTIVE,
      },
    });
    const otherIdentity = await prisma.identity.create({
      data: {
        type: IdentityType.INDIVIDUAL,
        displayName: 'Other Official',
        userAccountId: otherAccount.id,
        personId: otherPerson.id,
      },
    });
    const otherOfficeholder = await prisma.officeholder.create({
      data: { code: 'OTHER-OH', name: 'Other Official' },
    });
    await prisma.identityOfficeholderLink.create({
      data: {
        identityId: otherIdentity.id,
        officeholderId: otherOfficeholder.id,
        status: IdentityOfficeholderLinkStatus.ACTIVE,
      },
    });
    await prisma.appointment.create({
      data: {
        officeId: fixture.officeId,
        officeholderId: otherOfficeholder.id,
        status: AppointmentStatus.ACTIVE,
        effectiveFrom: new Date('2020-01-01'),
      },
    });
    await createPasswordCredentialViaPrisma(prisma, otherIdentity.id, 'OtherOfficial123!');
    await createPasswordAuthenticationMethodViaPrisma(prisma, otherIdentity.id);
    const otherSessionToken = await loginAndGetSessionToken(
      app,
      'other.official@test.gov',
      'OtherOfficial123!',
    );
    const otherLogin = { sessionToken: otherSessionToken };

    await prisma.caseAssignment.create({
      data: {
        caseId: submitResult.case.id,
        assigneeIdentityId: fixture.officialIdentityId,
        assigneeOfficeholderId: fixture.officialOfficeholderId,
        assignmentRole: 'CASE_WORKER',
        status: CaseAssignmentStatus.ACTIVE,
      },
    });

    await request(app.getHttpServer())
      .get(`/api/v1/experience/official/cases/${submitResult.case.id}`)
      .set('Authorization', `Bearer ${otherLogin.sessionToken}`)
      .expect(403);
  });

  it('removes consequential actions when authority function is suspended', async () => {
    const fixture = await seedPhase6Fixture(app, prisma);
    const submitResult = await submitCase(fixture);

    await request(app.getHttpServer())
      .post(`/api/v1/cases/${submitResult.case.id}/workflow/steps/intake/complete`)
      .set('Authorization', `Bearer ${fixture.officialSessionToken}`)
      .send({ officeholderId: fixture.officialOfficeholderId })
      .expect(201);

    await prisma.functionAuthorityRecord.update({
      where: { id: fixture.functionAuthorityRecordId },
      data: { lifecycleStatus: FunctionAuthorityLifecycleStatus.SUSPENDED },
    });

    const actions = asOfficialAvailableActionsBody(
      (
        await request(app.getHttpServer())
          .get(`/api/v1/experience/official/cases/${submitResult.case.id}/available-actions`)
          .set('Authorization', `Bearer ${fixture.officialSessionToken}`)
          .expect(200)
      ).body,
    );

    const consequential = actions.actions.filter((action) => action.isConsequential);
    expect(consequential.every((action) => !action.available)).toBe(true);
    expect(consequential.some((action) => action.unavailableReason?.includes('suspended'))).toBe(
      true,
    );
  });

  it('blocks consequential actions when delegation is expired', async () => {
    const fixture = await seedPhase6Fixture(app, prisma);
    const submitResult = await submitCase(fixture);

    await prisma.functionAuthorityRecord.update({
      where: { id: fixture.functionAuthorityRecordId },
      data: { requiresDelegation: true },
    });

    const delegation = await prisma.delegation.create({
      data: {
        institutionId: fixture.institutionId,
        recipientOfficeholderId: fixture.officialOfficeholderId,
        recipientOfficeId: fixture.officeId,
        scopeDescription: 'Review delegation',
        status: DelegationStatus.ACTIVE,
        effectiveFrom: new Date('2020-01-01'),
        effectiveUntil: new Date('2021-01-01'),
      },
    });

    await request(app.getHttpServer())
      .post(`/api/v1/cases/${submitResult.case.id}/workflow/steps/intake/complete`)
      .set('Authorization', `Bearer ${fixture.officialSessionToken}`)
      .send({
        officeholderId: fixture.officialOfficeholderId,
        appointmentId: fixture.appointmentId,
        delegationId: delegation.id,
      })
      .expect(201);

    const actions = asOfficialAvailableActionsBody(
      (
        await request(app.getHttpServer())
          .get(`/api/v1/experience/official/cases/${submitResult.case.id}/available-actions`)
          .set('Authorization', `Bearer ${fixture.officialSessionToken}`)
          .expect(200)
      ).body,
    );

    const reviewAction = actions.actions.find(
      (action) => action.actionKey === 'complete-workflow-step' && action.isConsequential,
    );
    expect(reviewAction?.available).toBe(false);
    expect(reviewAction?.unavailableReason).toBeTruthy();
  });

  it('represents SoD conflicts as unavailable actions', async () => {
    const fixture = await seedPhase6Fixture(app, prisma);
    const submitResult = await submitCase(fixture);

    await prisma.segregationOfDutyRule.create({
      data: {
        functionAuthorityRecordId: fixture.functionAuthorityRecordId,
        ruleType: SodRuleType.MISSING_SECOND_APPROVAL,
      },
    });

    await request(app.getHttpServer())
      .post(`/api/v1/cases/${submitResult.case.id}/workflow/steps/intake/complete`)
      .set('Authorization', `Bearer ${fixture.officialSessionToken}`)
      .send({ officeholderId: fixture.officialOfficeholderId })
      .expect(201);

    const actions = asOfficialAvailableActionsBody(
      (
        await request(app.getHttpServer())
          .get(`/api/v1/experience/official/cases/${submitResult.case.id}/available-actions`)
          .set('Authorization', `Bearer ${fixture.officialSessionToken}`)
          .expect(200)
      ).body,
    );

    const blocked = actions.actions.find(
      (action) => action.actionKey === 'complete-workflow-step' && action.isConsequential,
    );
    expect(blocked?.available).toBe(false);
    expect(blocked?.available).toBe(false);
    expect(blocked?.unavailableReason).toContain(
      AUTHORITY_EVALUATION_EXPLANATION_CODES.MISSING_SECOND_APPROVAL,
    );
  });

  it('represents missing second approval requirements in available actions', async () => {
    const fixture = await seedPhase6Fixture(app, prisma);
    const submitResult = await submitCase(fixture);

    await prisma.functionAuthorityRecord.update({
      where: { id: fixture.functionAuthorityRecordId },
      data: {
        conditions: {
          create: {
            conditionType: AuthorityConditionType.SECOND_APPROVAL_REQUIRED,
          },
        },
        actionRights: {
          create: [
            { action: AuthorityActionType.APPROVE, permitted: true, requiresHumanActor: true },
          ],
        },
      },
    });

    await request(app.getHttpServer())
      .post(`/api/v1/cases/${submitResult.case.id}/workflow/steps/intake/complete`)
      .set('Authorization', `Bearer ${fixture.officialSessionToken}`)
      .send({ officeholderId: fixture.officialOfficeholderId })
      .expect(201);

    const actions = asOfficialAvailableActionsBody(
      (
        await request(app.getHttpServer())
          .get(`/api/v1/experience/official/cases/${submitResult.case.id}/available-actions`)
          .set('Authorization', `Bearer ${fixture.officialSessionToken}`)
          .expect(200)
      ).body,
    );

    const blockedAction = actions.actions.find(
      (action) => action.isConsequential && !action.available,
    );
    expect(blockedAction).toBeDefined();
    expect(blockedAction?.unavailableReason).toContain(
      AUTHORITY_EVALUATION_EXPLANATION_CODES.MISSING_SECOND_APPROVAL,
    );
  });

  it('does not expose unavailable actions as executable and requires execution-time revalidation', async () => {
    const fixture = await seedPhase6Fixture(app, prisma);
    const submitResult = await submitCase(fixture);

    await prisma.functionAuthorityRecord.update({
      where: { id: fixture.functionAuthorityRecordId },
      data: { lifecycleStatus: FunctionAuthorityLifecycleStatus.SUSPENDED },
    });

    const actions = asOfficialAvailableActionsBody(
      (
        await request(app.getHttpServer())
          .get(`/api/v1/experience/official/cases/${submitResult.case.id}/available-actions`)
          .set('Authorization', `Bearer ${fixture.officialSessionToken}`)
          .expect(200)
      ).body,
    );

    expect(actions.executionRequiresAuthorityRevalidation).toBe(true);
    for (const action of actions.actions) {
      expect(action.requiresExecutionTimeRevalidation).toBe(true);
      if (!action.available && action.isConsequential) {
        await request(app.getHttpServer())
          .post(`/api/v1/cases/${submitResult.case.id}/workflow/steps/substantive-review/complete`)
          .set('Authorization', `Bearer ${fixture.officialSessionToken}`)
          .send({
            officeholderId: fixture.officialOfficeholderId,
            appointmentId: fixture.appointmentId,
          })
          .expect((res) => {
            expect([403, 400, 422]).toContain(res.status);
          });
      }
    }
  });

  it('denies service identity access to human official workspace', async () => {
    const fixture = await seedPhase6Fixture(app, prisma);

    const serviceIdentity = await prisma.identity.create({
      data: { type: IdentityType.SERVICE, displayName: 'Automation Service' },
    });
    await prisma.identityOfficeholderLink.create({
      data: {
        identityId: serviceIdentity.id,
        officeholderId: fixture.officialOfficeholderId,
        status: IdentityOfficeholderLinkStatus.ACTIVE,
      },
    });

    const token = `service-${String(Date.now())}`;
    await prisma.session.create({
      data: {
        identityId: serviceIdentity.id,
        tokenHash: hashToken(token),
        expiresAt: new Date(Date.now() + 3600000),
      },
    });

    await request(app.getHttpServer())
      .get('/api/v1/experience/official/me')
      .set('Authorization', `Bearer ${token}`)
      .expect(403);
  });

  it('does not grant substantive case access to technical admin without appointment', async () => {
    const fixture = await seedPhase6Fixture(app, prisma);
    await submitCase(fixture);

    const adminPerson = await prisma.person.create({
      data: { givenName: 'Tech', familyName: 'Admin' },
    });
    const adminAccount = await prisma.userAccount.create({
      data: {
        loginIdentifier: 'tech.admin@test.gov',
        personId: adminPerson.id,
        status: AccountStatus.ACTIVE,
      },
    });
    const adminIdentity = await prisma.identity.create({
      data: {
        type: IdentityType.INDIVIDUAL,
        displayName: 'Technical Admin',
        userAccountId: adminAccount.id,
        personId: adminPerson.id,
      },
    });
    await createPasswordCredentialViaPrisma(prisma, adminIdentity.id, 'TechAdmin123!');
    await createPasswordAuthenticationMethodViaPrisma(prisma, adminIdentity.id);
    const adminSessionToken = await loginAndGetSessionToken(
      app,
      'tech.admin@test.gov',
      'TechAdmin123!',
    );
    const adminLogin = { sessionToken: adminSessionToken };

    await request(app.getHttpServer())
      .get('/api/v1/experience/official/me')
      .set('Authorization', `Bearer ${adminLogin.sessionToken}`)
      .expect(403);

    await request(app.getHttpServer())
      .get('/api/v1/experience/official/cases')
      .set('Authorization', `Bearer ${adminLogin.sessionToken}`)
      .expect(403);
  });

  it('returns official me without universal authority and provides work queue for appointed official', async () => {
    const fixture = await seedPhase6Fixture(app, prisma);
    const submitResult = await submitCase(fixture);

    const me = asOfficialMeBody(
      (
        await request(app.getHttpServer())
          .get('/api/v1/experience/official/me')
          .set('Authorization', `Bearer ${fixture.officialSessionToken}`)
          .expect(200)
      ).body,
    );

    expect(me.hasUniversalAuthority).toBe(false);
    expect(me.authorityDisclaimer).toContain('do not confer universal government authority');
    expect(me.technicalCapabilities.substantiveAccessAllowed).toBe(true);

    const workspaceBody = (
      await request(app.getHttpServer())
        .get('/api/v1/experience/official/workspace')
        .set('Authorization', `Bearer ${fixture.officialSessionToken}`)
        .expect(200)
    ).body as { assignmentDoesNotImplyAuthority: boolean };

    expect(workspaceBody.assignmentDoesNotImplyAuthority).toBe(true);

    const queue = asOfficialWorkQueueBody(
      (
        await request(app.getHttpServer())
          .get('/api/v1/experience/official/work-queue')
          .set('Authorization', `Bearer ${fixture.officialSessionToken}`)
          .expect(200)
      ).body,
    );

    expect(queue.totalCount).toBeGreaterThan(0);
    expect(queue.items.some((item) => item.caseId === submitResult.case.id)).toBe(true);
  });
});
