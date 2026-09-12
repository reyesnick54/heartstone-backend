import { type INestApplication } from '@nestjs/common';
import {
  ApplicationStatus,
  FormFieldType,
  FormVersionStatus,
  GovernmentServiceMaturityStatus,
  GovernmentServicePublicAvailability,
} from '@prisma/client';
import request from 'supertest';
import { type App } from 'supertest/types';

import { SUBMISSION_RECEIPT_DISCLAIMER } from '../src/applications/common/applications.constants';
import { type PrismaService } from '../src/database/prisma.service';
import { seedApplicationsFixture } from './helpers/applications-test-fixtures';
import {
  asApplicationBody,
  asApplicationSubmissionBody,
  asSubmissionAcknowledgmentBody,
} from './helpers/applications-test-types';
import { createIntegrationApp, resetAllTestData } from './helpers/integration-app';

describe('Phase 6A Applications (integration)', () => {
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

  async function createDraftApplication(fixture: Awaited<ReturnType<typeof seedApplicationsFixture>>) {
    const response = await request(app.getHttpServer())
      .post('/api/v1/applications')
      .set('Authorization', `Bearer ${fixture.applicantSessionToken}`)
      .send({ governmentServiceVersionId: fixture.governmentServiceVersionId })
      .expect(201);

    return asApplicationBody(response.body);
  }

  it('creates an application draft with immutable application number', async () => {
    const fixture = await seedApplicationsFixture(app, prisma);
    const application = await createDraftApplication(fixture);

    expect(application.applicationNumber).toMatch(/^APP-\d{4}-[A-F0-9]{8}$/);
    expect(application.currentStatus).toBe(ApplicationStatus.DRAFT);
    expect(application.applicantIdentityId).toBe(fixture.applicantIdentityId);
    expect(application.governmentServiceVersionId).toBe(fixture.governmentServiceVersionId);
  });

  it('updates draft answers separately from submitted snapshots', async () => {
    const fixture = await seedApplicationsFixture(app, prisma);
    const application = await createDraftApplication(fixture);

    const updated = asApplicationBody(
      (
        await request(app.getHttpServer())
          .patch(`/api/v1/applications/${application.id}/draft`)
          .set('Authorization', `Bearer ${fixture.applicantSessionToken}`)
          .send({
            formVersionId: fixture.formVersionId,
            configurationFingerprint: fixture.configurationFingerprint,
            answers: fixture.validAnswers,
          })
          .expect(200)
      ).body,
    );

    expect(updated.currentStatus).toBe(ApplicationStatus.READY_FOR_SUBMISSION);

    const stored = await prisma.application.findUnique({ where: { id: application.id } });
    expect(stored?.draftAnswersPayload).toEqual(fixture.validAnswers);
  });

  it('submits a valid application with version pinning and acknowledgment disclaimer', async () => {
    const fixture = await seedApplicationsFixture(app, prisma);
    const application = await createDraftApplication(fixture);

    const acknowledgment = asSubmissionAcknowledgmentBody(
      (
        await request(app.getHttpServer())
          .post(`/api/v1/applications/${application.id}/submit`)
          .set('Authorization', `Bearer ${fixture.applicantSessionToken}`)
          .send({
            formVersionId: fixture.formVersionId,
            configurationFingerprint: fixture.configurationFingerprint,
            answers: fixture.validAnswers,
          })
          .expect(201)
      ).body,
    );

    expect(acknowledgment.applicationNumber).toBe(application.applicationNumber);
    expect(acknowledgment.formVersionId).toBe(fixture.formVersionId);
    expect(acknowledgment.configurationFingerprint).toBe(fixture.configurationFingerprint);
    expect(acknowledgment.receiptDisclaimer).toBe(SUBMISSION_RECEIPT_DISCLAIMER);
    expect(acknowledgment.receiptDisclaimer).toContain('does NOT establish');
    expect(acknowledgment.currentStatus).toBe(ApplicationStatus.RECEIVED);

    const submission = await prisma.applicationSubmission.findUnique({
      where: { id: acknowledgment.submissionId },
    });

    expect(submission?.serviceVersionId).toBe(fixture.governmentServiceVersionId);
    expect(submission?.formVersionId).toBe(fixture.formVersionId);
    expect(submission?.answersPayload).toEqual(fixture.validAnswers);
  });

  it('blocks invalid form responses at submission', async () => {
    const fixture = await seedApplicationsFixture(app, prisma);
    const application = await createDraftApplication(fixture);

    await request(app.getHttpServer())
      .post(`/api/v1/applications/${application.id}/submit`)
      .set('Authorization', `Bearer ${fixture.applicantSessionToken}`)
      .send({
        formVersionId: fixture.formVersionId,
        configurationFingerprint: fixture.configurationFingerprint,
        answers: { full_name: 'Jane' },
      })
      .expect(400);

    const submissionCount = await prisma.applicationSubmission.count({
      where: { applicationId: application.id },
    });
    expect(submissionCount).toBe(0);
  });

  it('blocks submission for non-startable services', async () => {
    const fixture = await seedApplicationsFixture(app, prisma);

    await prisma.governmentServiceVersion.update({
      where: { id: fixture.governmentServiceVersionId },
      data: {
        publicAvailability: GovernmentServicePublicAvailability.INFORMATION_ONLY,
      },
    });

    const application = await createDraftApplication(fixture);

    await request(app.getHttpServer())
      .post(`/api/v1/applications/${application.id}/submit`)
      .set('Authorization', `Bearer ${fixture.applicantSessionToken}`)
      .send({
        formVersionId: fixture.formVersionId,
        configurationFingerprint: fixture.configurationFingerprint,
        answers: fixture.validAnswers,
      })
      .expect(422);
  });

  it('blocks submission when configuration fingerprint is superseded', async () => {
    const fixture = await seedApplicationsFixture(app, prisma);
    const application = await createDraftApplication(fixture);

    await request(app.getHttpServer())
      .post(`/api/v1/applications/${application.id}/submit`)
      .set('Authorization', `Bearer ${fixture.applicantSessionToken}`)
      .send({
        formVersionId: fixture.formVersionId,
        configurationFingerprint: 'deadbeef',
        answers: fixture.validAnswers,
      })
      .expect(409);
  });

  it('preserves immutable original submission and creates new sequence on resubmission', async () => {
    const fixture = await seedApplicationsFixture(app, prisma);
    const application = await createDraftApplication(fixture);

    const firstAck = asSubmissionAcknowledgmentBody(
      (
        await request(app.getHttpServer())
          .post(`/api/v1/applications/${application.id}/submit`)
          .set('Authorization', `Bearer ${fixture.applicantSessionToken}`)
          .send({
            formVersionId: fixture.formVersionId,
            configurationFingerprint: fixture.configurationFingerprint,
            answers: fixture.validAnswers,
          })
          .expect(201)
      ).body,
    );

    await prisma.application.update({
      where: { id: application.id },
      data: { currentStatus: ApplicationStatus.CORRECTION_REQUESTED },
    });

    const correctedAnswers = {
      ...fixture.validAnswers,
      business_name: 'Corrected Ventures Ltd',
    };

    const secondAck = asSubmissionAcknowledgmentBody(
      (
        await request(app.getHttpServer())
          .post(`/api/v1/applications/${application.id}/resubmit`)
          .set('Authorization', `Bearer ${fixture.applicantSessionToken}`)
          .send({
            formVersionId: fixture.formVersionId,
            configurationFingerprint: fixture.configurationFingerprint,
            answers: correctedAnswers,
          })
          .expect(201)
      ).body,
    );

    const submissions = (
      await request(app.getHttpServer())
        .get(`/api/v1/applications/${application.id}/submissions`)
        .set('Authorization', `Bearer ${fixture.applicantSessionToken}`)
        .expect(200)
    ).body as unknown[];

    expect(submissions).toHaveLength(2);

    const first = asApplicationSubmissionBody(submissions[0]);
    const second = asApplicationSubmissionBody(submissions[1]);

    expect(first.submissionSequence).toBe(1);
    expect(second.submissionSequence).toBe(2);
    expect(second.supersedesSubmissionId).toBe(first.id);
    expect(firstAck.submissionId).toBe(first.id);
    expect(secondAck.submissionId).toBe(second.id);

    const original = await prisma.applicationSubmission.findUnique({
      where: { id: first.id },
    });
    expect(original?.answersPayload).toEqual(fixture.validAnswers);
  });

  it('blocks representative submission without active representative authority scope', async () => {
    const fixture = await seedApplicationsFixture(app, prisma);

    const response = await request(app.getHttpServer())
      .post('/api/v1/applications')
      .set('Authorization', `Bearer ${fixture.applicantSessionToken}`)
      .send({
        governmentServiceVersionId: fixture.governmentServiceVersionId,
        representativeAuthorityId: fixture.representativeAuthorityId,
        organizationId: fixture.organizationId,
      })
      .expect(201);

    const application = asApplicationBody(response.body);

    await prisma.representativeAuthority.update({
      where: { id: fixture.representativeAuthorityId },
      data: { status: 'REVOKED' },
    });

    await request(app.getHttpServer())
      .post(`/api/v1/applications/${application.id}/submit`)
      .set('Authorization', `Bearer ${fixture.applicantSessionToken}`)
      .send({
        formVersionId: fixture.formVersionId,
        configurationFingerprint: fixture.configurationFingerprint,
        answers: fixture.validAnswers,
        representativeAuthorityId: fixture.representativeAuthorityId,
        submittedCapacity: 'REPRESENTATIVE',
      })
      .expect(403);
  });

  it('prevents duplicate submissions with the same idempotency key', async () => {
    const fixture = await seedApplicationsFixture(app, prisma);
    const application = await createDraftApplication(fixture);
    const idempotencyKey = 'idem-test-key-001';

    const first = asSubmissionAcknowledgmentBody(
      (
        await request(app.getHttpServer())
          .post(`/api/v1/applications/${application.id}/submit`)
          .set('Authorization', `Bearer ${fixture.applicantSessionToken}`)
          .send({
            formVersionId: fixture.formVersionId,
            configurationFingerprint: fixture.configurationFingerprint,
            answers: fixture.validAnswers,
            idempotencyKey,
          })
          .expect(201)
      ).body,
    );

    const second = asSubmissionAcknowledgmentBody(
      (
        await request(app.getHttpServer())
          .post(`/api/v1/applications/${application.id}/submit`)
          .set('Authorization', `Bearer ${fixture.applicantSessionToken}`)
          .send({
            formVersionId: fixture.formVersionId,
            configurationFingerprint: fixture.configurationFingerprint,
            answers: fixture.validAnswers,
            idempotencyKey,
          })
          .expect(201)
      ).body,
    );

    expect(second.submissionId).toBe(first.submissionId);

    const submissionCount = await prisma.applicationSubmission.count({
      where: { applicationId: application.id },
    });
    expect(submissionCount).toBe(1);
  });

  it('accepts payment metadata without creating approval or decision records', async () => {
    const fixture = await seedApplicationsFixture(app, prisma);
    const application = await createDraftApplication(fixture);

    await request(app.getHttpServer())
      .post(`/api/v1/applications/${application.id}/submit`)
      .set('Authorization', `Bearer ${fixture.applicantSessionToken}`)
      .send({
        formVersionId: fixture.formVersionId,
        configurationFingerprint: fixture.configurationFingerprint,
        answers: fixture.validAnswers,
        paymentMetadata: {
          reference: 'PAY-TEST-001',
          amountCents: 5000,
          currency: 'XCD',
        },
      })
      .expect(201);

    const applicationRecord = await prisma.application.findUnique({
      where: { id: application.id },
    });
    expect(applicationRecord?.currentStatus).toBe(ApplicationStatus.RECEIVED);
    expect(applicationRecord?.currentStatus).not.toBe('APPROVED');
  });

  it('denies unauthorized applicants from reading another application', async () => {
    const fixture = await seedApplicationsFixture(app, prisma);
    const application = await createDraftApplication(fixture);

    await request(app.getHttpServer())
      .get(`/api/v1/applications/${application.id}`)
      .set('Authorization', `Bearer ${fixture.otherSessionToken}`)
      .expect(403);
  });

  it('withdraws an application in draft state', async () => {
    const fixture = await seedApplicationsFixture(app, prisma);
    const application = await createDraftApplication(fixture);

    const withdrawn = asApplicationBody(
      (
        await request(app.getHttpServer())
          .post(`/api/v1/applications/${application.id}/withdraw`)
          .set('Authorization', `Bearer ${fixture.applicantSessionToken}`)
          .expect(201)
      ).body,
    );

    expect(withdrawn.currentStatus).toBe(ApplicationStatus.WITHDRAWN);
  });

  it('blocks submission for inactive service versions', async () => {
    const fixture = await seedApplicationsFixture(app, prisma);

    await prisma.governmentServiceVersion.update({
      where: { id: fixture.governmentServiceVersionId },
      data: { maturityStatus: GovernmentServiceMaturityStatus.DRAFT },
    });

    const application = await createDraftApplication(fixture);

    await request(app.getHttpServer())
      .post(`/api/v1/applications/${application.id}/submit`)
      .set('Authorization', `Bearer ${fixture.applicantSessionToken}`)
      .send({
        formVersionId: fixture.formVersionId,
        configurationFingerprint: fixture.configurationFingerprint,
        answers: fixture.validAnswers,
      })
      .expect(400);
  });

  it('does not create government decision or issued instrument records on submission', async () => {
    const fixture = await seedApplicationsFixture(app, prisma);
    const application = await createDraftApplication(fixture);

    await request(app.getHttpServer())
      .post(`/api/v1/applications/${application.id}/submit`)
      .set('Authorization', `Bearer ${fixture.applicantSessionToken}`)
      .send({
        formVersionId: fixture.formVersionId,
        configurationFingerprint: fixture.configurationFingerprint,
        answers: fixture.validAnswers,
      })
      .expect(201);

    const schema = await prisma.$queryRaw<{ table_name: string }[]>`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name IN (
          'government_decisions',
          'issued_licenses',
          'issued_permits',
          'evidence_packets'
        )
    `;

    expect(schema).toHaveLength(0);
  });
});
