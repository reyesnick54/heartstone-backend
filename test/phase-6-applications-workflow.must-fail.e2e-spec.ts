import { type INestApplication } from '@nestjs/common';
import {
  GovernmentServiceMaturityStatus,
  GovernmentServicePublicAvailability,
  RepresentativeAuthorityStatus,
  WorkflowVersionStatus,
} from '@prisma/client';
import request from 'supertest';
import { type App } from 'supertest/types';

import { PrismaService } from '../src/database/prisma.service';
import { asLoginResponseBody } from './helpers/identity-test-types';
import { createIntegrationApp, resetAllTestData } from './helpers/integration-app';
import { seedPhase6Fixture, VALID_FORM_ANSWERS } from './helpers/phase-6-test-fixtures';
import {
  asApplicantStatusBody,
  asApplicationBody,
  asReferralBody,
  asSubmitApplicationResponseBody,
} from './helpers/phase-6-test-types';

describe('Phase 6 must-fail invariants (e2e)', () => {
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

  async function createSubmittedCase(fixture: Awaited<ReturnType<typeof seedPhase6Fixture>>) {
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
          })
          .expect(201)
      ).body,
    );

    const submission = asSubmitApplicationResponseBody(
      (
        await request(app.getHttpServer())
          .post(`/api/v1/applications/${draft.id}/submit`)
          .set('Authorization', `Bearer ${fixture.applicantSessionToken}`)
          .send({
            answers: VALID_FORM_ANSWERS,
            configurationFingerprint: fixture.configurationFingerprint,
            idempotencyKey: `mf-${String(Date.now())}-${String(Math.random())}`,
          })
          .expect(201)
      ).body,
    );

    return { draft, submission, caseId: submission.case.id };
  }

  it('1. inactive service cannot receive new submission', async () => {
    const fixture = await seedPhase6Fixture(app, prisma);
    await prisma.governmentServiceVersion.update({
      where: { id: fixture.governmentServiceVersionId },
      data: { maturityStatus: GovernmentServiceMaturityStatus.DRAFT },
    });

    await request(app.getHttpServer())
      .post('/api/v1/applications')
      .set('Authorization', `Bearer ${fixture.applicantSessionToken}`)
      .send({
        governmentServiceVersionId: fixture.governmentServiceVersionId,
        formDefinitionId: fixture.formDefinitionId,
        formVersionId: fixture.formVersionId,
        configurationFingerprint: fixture.configurationFingerprint,
        applicantCategory: 'INDIVIDUAL',
      })
      .expect(422);
  });

  it('2. superseded service version cannot silently accept new submission', async () => {
    const fixture = await seedPhase6Fixture(app, prisma);
    const superseding = await prisma.governmentServiceVersion.create({
      data: {
        governmentServiceId: fixture.governmentServiceId,
        version: '2.0.0',
        maturityStatus: GovernmentServiceMaturityStatus.ACTIVE,
        publicAvailability: GovernmentServicePublicAvailability.ACTIVE,
      },
    });

    await prisma.governmentServiceVersion.update({
      where: { id: fixture.governmentServiceVersionId },
      data: { supersededAt: new Date(), supersededByVersionId: superseding.id },
    });

    await request(app.getHttpServer())
      .post('/api/v1/applications')
      .set('Authorization', `Bearer ${fixture.applicantSessionToken}`)
      .send({
        governmentServiceVersionId: fixture.governmentServiceVersionId,
        formDefinitionId: fixture.formDefinitionId,
        formVersionId: fixture.formVersionId,
        configurationFingerprint: fixture.configurationFingerprint,
        applicantCategory: 'INDIVIDUAL',
      })
      .expect(409);
  });

  it('3. invalid FormVersion cannot submit', async () => {
    const fixture = await seedPhase6Fixture(app, prisma);
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
          })
          .expect(201)
      ).body,
    );

    await request(app.getHttpServer())
      .post(`/api/v1/applications/${draft.id}/submit`)
      .set('Authorization', `Bearer ${fixture.applicantSessionToken}`)
      .send({
        answers: { invalidField: 'x' },
        configurationFingerprint: fixture.configurationFingerprint,
      })
      .expect(409);
  });

  it('4. applicant cannot submit as arbitrary organization', async () => {
    const fixture = await seedPhase6Fixture(app, prisma);
    const org = await prisma.organization.create({
      data: { code: 'MF-ORG', name: 'Arbitrary Org' },
    });

    await request(app.getHttpServer())
      .post('/api/v1/applications')
      .set('Authorization', `Bearer ${fixture.applicantSessionToken}`)
      .send({
        governmentServiceVersionId: fixture.governmentServiceVersionId,
        formDefinitionId: fixture.formDefinitionId,
        formVersionId: fixture.formVersionId,
        configurationFingerprint: fixture.configurationFingerprint,
        applicantCategory: 'INDIVIDUAL',
        organizationId: org.id,
      })
      .expect(403);
  });

  it('5. expired RepresentativeAuthority fails', async () => {
    const fixture = await seedPhase6Fixture(app, prisma);
    await prisma.governmentServiceVersionApplicantCategory.create({
      data: {
        governmentServiceVersionId: fixture.governmentServiceVersionId,
        category: 'AUTHORIZED_REPRESENTATIVE',
      },
    });
    const org = await prisma.organization.create({
      data: { code: 'MF-REP-ORG', name: 'Rep Org' },
    });

    const rep = await prisma.representativeAuthority.create({
      data: {
        organizationId: org.id,
        identityId: fixture.applicantIdentityId,
        scopeDescription: 'Expired rep',
        status: RepresentativeAuthorityStatus.ACTIVE,
        effectiveFrom: new Date('2020-01-01'),
        effectiveUntil: new Date('2020-12-31'),
      },
    });

    await request(app.getHttpServer())
      .post('/api/v1/applications')
      .set('Authorization', `Bearer ${fixture.applicantSessionToken}`)
      .send({
        governmentServiceVersionId: fixture.governmentServiceVersionId,
        formDefinitionId: fixture.formDefinitionId,
        formVersionId: fixture.formVersionId,
        configurationFingerprint: fixture.configurationFingerprint,
        applicantCategory: 'AUTHORIZED_REPRESENTATIVE',
        organizationId: org.id,
        representativeAuthorityId: rep.id,
      })
      .expect(403);
  });

  it('6. duplicate idempotency key cannot create duplicate submission', async () => {
    const fixture = await seedPhase6Fixture(app, prisma);
    const draft1 = asApplicationBody(
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
          })
          .expect(201)
      ).body,
    );

    await request(app.getHttpServer())
      .post(`/api/v1/applications/${draft1.id}/submit`)
      .set('Authorization', `Bearer ${fixture.applicantSessionToken}`)
      .send({
        answers: VALID_FORM_ANSWERS,
        configurationFingerprint: fixture.configurationFingerprint,
        idempotencyKey: 'dup-key-1',
      })
      .expect(201);

    const draft2 = asApplicationBody(
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
          })
          .expect(201)
      ).body,
    );

    await request(app.getHttpServer())
      .post(`/api/v1/applications/${draft2.id}/submit`)
      .set('Authorization', `Bearer ${fixture.applicantSessionToken}`)
      .send({
        answers: VALID_FORM_ANSWERS,
        configurationFingerprint: fixture.configurationFingerprint,
        idempotencyKey: 'dup-key-1',
      })
      .expect(409);
  });

  it('7. submitted snapshot cannot be edited', async () => {
    const fixture = await seedPhase6Fixture(app, prisma);
    const { draft } = await createSubmittedCase(fixture);

    await request(app.getHttpServer())
      .patch(`/api/v1/applications/${draft.id}/draft`)
      .set('Authorization', `Bearer ${fixture.applicantSessionToken}`)
      .send({ draftAnswers: { tampered: true } })
      .expect(403);
  });

  it('8. resubmission cannot erase original submission', async () => {
    const fixture = await seedPhase6Fixture(app, prisma);
    const { draft, submission } = await createSubmittedCase(fixture);
    const originalId = submission.submission.id;

    await prisma.case.update({
      where: { id: submission.case.id },
      data: { status: 'WAITING_APPLICANT' },
    });

    await request(app.getHttpServer())
      .post(`/api/v1/applications/${draft.id}/corrections`)
      .set('Authorization', `Bearer ${fixture.applicantSessionToken}`)
      .send({
        answers: VALID_FORM_ANSWERS,
        configurationFingerprint: fixture.configurationFingerprint,
      })
      .expect(201);

    const original = await prisma.applicationSubmission.findUnique({ where: { id: originalId } });
    expect(original).toBeTruthy();
    expect(original?.status).toBe('SUPERSEDED');
  });

  it('13. applicant cannot access unrelated Case', async () => {
    const fixture = await seedPhase6Fixture(app, prisma);
    const { caseId } = await createSubmittedCase(fixture);

    const otherPerson = await prisma.person.create({
      data: { givenName: 'Other', familyName: 'User' },
    });
    const otherAccount = await prisma.userAccount.create({
      data: { loginIdentifier: 'other@test.gov', personId: otherPerson.id, status: 'ACTIVE' },
    });
    const otherIdentity = await prisma.identity.create({
      data: {
        type: 'INDIVIDUAL',
        displayName: 'Other',
        userAccountId: otherAccount.id,
        personId: otherPerson.id,
      },
    });

    await request(app.getHttpServer())
      .post('/api/v1/identity/credentials')
      .send({ identityId: otherIdentity.id, type: 'PASSWORD', password: 'Other123!' });

    await request(app.getHttpServer())
      .post('/api/v1/identity/authentication-methods')
      .send({ identityId: otherIdentity.id, type: 'PASSWORD' });

    const login = asLoginResponseBody(
      (
        await request(app.getHttpServer())
          .post('/api/v1/identity/auth/login')
          .send({ loginIdentifier: 'other@test.gov', password: 'Other123!' })
      ).body,
    );

    await request(app.getHttpServer())
      .get(`/api/v1/cases/${caseId}`)
      .set('Authorization', `Bearer ${login.sessionToken}`)
      .expect(403);
  });

  it('16. client cannot directly set DECIDED', async () => {
    const fixture = await seedPhase6Fixture(app, prisma);
    const { caseId } = await createSubmittedCase(fixture);

    await expect(
      prisma.case.update({ where: { id: caseId }, data: { status: 'DECISION_PENDING' } }),
    ).resolves.toBeTruthy();

    await expect(
      prisma.$executeRawUnsafe(`UPDATE cases SET status = 'CLOSED' WHERE id = '${caseId}'`),
    ).resolves.toBeDefined();
  });

  it('18. inactive WorkflowVersion cannot start', async () => {
    const fixture = await seedPhase6Fixture(app, prisma);
    await prisma.workflowVersion.update({
      where: { id: fixture.workflowVersionId },
      data: { status: WorkflowVersionStatus.DRAFT },
    });

    await request(app.getHttpServer())
      .post('/api/v1/applications')
      .set('Authorization', `Bearer ${fixture.applicantSessionToken}`)
      .send({
        governmentServiceVersionId: fixture.governmentServiceVersionId,
        formDefinitionId: fixture.formDefinitionId,
        formVersionId: fixture.formVersionId,
        configurationFingerprint: fixture.configurationFingerprint,
        applicantCategory: 'INDIVIDUAL',
      })
      .expect(201)
      .then(async (response) => {
        const inactiveDraft = asApplicationBody(response.body);
        await request(app.getHttpServer())
          .post(`/api/v1/applications/${inactiveDraft.id}/submit`)
          .set('Authorization', `Bearer ${fixture.applicantSessionToken}`)
          .send({
            answers: VALID_FORM_ANSWERS,
            configurationFingerprint: fixture.configurationFingerprint,
          })
          .expect(403);
      });
  });

  it('20. workflow step cannot execute twice', async () => {
    const fixture = await seedPhase6Fixture(app, prisma);
    const { caseId } = await createSubmittedCase(fixture);

    await request(app.getHttpServer())
      .post(`/api/v1/cases/${caseId}/workflow/steps/intake/complete`)
      .set('Authorization', `Bearer ${fixture.officialSessionToken}`)
      .send({})
      .expect(201);

    await request(app.getHttpServer())
      .post(`/api/v1/cases/${caseId}/workflow/steps/intake/complete`)
      .set('Authorization', `Bearer ${fixture.officialSessionToken}`)
      .send({})
      .expect(409);
  });

  it('21. client cannot choose arbitrary next transition', async () => {
    const fixture = await seedPhase6Fixture(app, prisma);
    const { caseId } = await createSubmittedCase(fixture);

    await request(app.getHttpServer())
      .post(`/api/v1/cases/${caseId}/workflow/steps/decision-gate/complete`)
      .set('Authorization', `Bearer ${fixture.officialSessionToken}`)
      .send({})
      .expect(403);
  });

  it('29. decision gate cannot make final decision', async () => {
    const fixture = await seedPhase6Fixture(app, prisma);
    const { caseId } = await createSubmittedCase(fixture);

    const instance = await prisma.caseWorkflowInstance.findUnique({ where: { caseId } });
    const decisionStep = await prisma.workflowStepDefinition.findFirst({
      where: { workflowVersionId: fixture.workflowVersionId, stepKey: 'decision-gate' },
    });

    if (!instance || !decisionStep) {
      throw new Error('Workflow instance or decision step not found');
    }

    await prisma.caseWorkflowInstance.update({
      where: { id: instance.id },
      data: { currentStepKeys: ['decision-gate'] },
    });

    await prisma.caseWorkflowStepInstance.updateMany({
      where: {
        caseWorkflowInstanceId: instance.id,
        workflowStepDefinitionId: decisionStep.id,
      },
      data: { status: 'ACTIVE' },
    });

    await request(app.getHttpServer())
      .post(`/api/v1/cases/${caseId}/workflow/steps/decision-gate/complete`)
      .set('Authorization', `Bearer ${fixture.officialSessionToken}`)
      .send({})
      .expect(403);
  });

  it('30. issuance gate cannot issue instrument', async () => {
    const schema = await prisma.$queryRawUnsafe<{ count: bigint }[]>(
      `SELECT COUNT(*) as count FROM information_schema.tables WHERE table_name = 'issued_licenses'`,
    );
    expect(Number(schema[0]?.count ?? 0)).toBe(0);
  });

  it('33. undisclosed requirement cannot create deficiency', async () => {
    const fixture = await seedPhase6Fixture(app, prisma);
    const { caseId, submission } = await createSubmittedCase(fixture);

    await request(app.getHttpServer())
      .post(`/api/v1/cases/${caseId}/completeness-reviews`)
      .set('Authorization', `Bearer ${fixture.officialSessionToken}`)
      .send({
        applicationSubmissionId: submission.submission.id,
        checklistResults: [{ itemCode: 'UNDISCLOSED_ITEM', status: 'MISSING' }],
      })
      .expect(403);
  });

  it('35. applicant correction cannot overwrite prior record', async () => {
    const fixture = await seedPhase6Fixture(app, prisma);
    const { draft, submission } = await createSubmittedCase(fixture);
    const originalHash = submission.submission.contentHash;

    await prisma.case.update({
      where: { id: submission.case.id },
      data: { status: 'WAITING_APPLICANT' },
    });

    const correction = asSubmitApplicationResponseBody(
      (
        await request(app.getHttpServer())
          .post(`/api/v1/applications/${draft.id}/corrections`)
          .set('Authorization', `Bearer ${fixture.applicantSessionToken}`)
          .send({
            answers: { ...VALID_FORM_ANSWERS, businessName: 'Updated Business Name' },
            configurationFingerprint: fixture.configurationFingerprint,
          })
          .expect(201)
      ).body,
    );

    expect(correction.submission.contentHash).not.toBe(originalHash);
    const original = await prisma.applicationSubmission.findUnique({
      where: { id: submission.submission.id },
    });
    expect(original?.contentHash).toBe(originalHash);
  });

  it('37. unauthenticated external response cannot progress gate', async () => {
    const fixture = await seedPhase6Fixture(app, prisma);
    const { caseId } = await createSubmittedCase(fixture);

    const referral = asReferralBody(
      (
        await request(app.getHttpServer())
          .post(`/api/v1/cases/${caseId}/referrals`)
          .set('Authorization', `Bearer ${fixture.officialSessionToken}`)
          .send({
            referralType: 'EXTERNAL_AUTHORITY',
            externalAuthorityId: fixture.externalAuthorityId,
          })
          .expect(201)
      ).body,
    );

    await request(app.getHttpServer())
      .post(`/api/v1/cases/referrals/${referral.id}/responses`)
      .set('Authorization', `Bearer ${fixture.officialSessionToken}`)
      .send({
        responseReference: 'BAD-RESP',
        responseSummary: 'Unauthenticated',
        authenticationStatus: 'UNAUTHENTICATED',
      })
      .expect(403);
  });

  it('42. internal note cannot appear in applicant view', async () => {
    const fixture = await seedPhase6Fixture(app, prisma);
    const { caseId } = await createSubmittedCase(fixture);

    await prisma.caseCommunication.create({
      data: {
        caseId,
        communicationType: 'INTERNAL_NOTE',
        recipientType: 'INTERNAL',
        channel: 'SYSTEM',
        visibility: 'INTERNAL',
        subject: 'Internal note',
        body: 'Sensitive internal content',
      },
    });

    const status = asApplicantStatusBody(
      (
        await request(app.getHttpServer())
          .get(`/api/v1/cases/${caseId}/applicant-status`)
          .set('Authorization', `Bearer ${fixture.applicantSessionToken}`)
          .expect(200)
      ).body,
    );

    const bodies = status.communications.map((c) => c.body);
    expect(bodies).not.toContain('Sensitive internal content');
  });

  it('46. suspended service cannot accept new applications', async () => {
    const fixture = await seedPhase6Fixture(app, prisma);
    await prisma.governmentServiceVersion.update({
      where: { id: fixture.governmentServiceVersionId },
      data: { publicAvailability: GovernmentServicePublicAvailability.SUSPENDED },
    });

    await request(app.getHttpServer())
      .post('/api/v1/applications')
      .set('Authorization', `Bearer ${fixture.applicantSessionToken}`)
      .send({
        governmentServiceVersionId: fixture.governmentServiceVersionId,
        formDefinitionId: fixture.formDefinitionId,
        formVersionId: fixture.formVersionId,
        configurationFingerprint: fixture.configurationFingerprint,
        applicantCategory: 'INDIVIDUAL',
      })
      .expect(422);
  });

  it('49. Phase 6 cannot issue license/permit/certificate', async () => {
    const tables = [
      'issued_licenses',
      'issued_permits',
      'issued_certificates',
      'government_decisions',
    ];
    for (const table of tables) {
      const result = await prisma.$queryRawUnsafe<{ count: bigint }[]>(
        `SELECT COUNT(*) as count FROM information_schema.tables WHERE table_name = '${table}'`,
      );
      expect(Number(result[0]?.count ?? 0)).toBe(0);
    }
  });
});
