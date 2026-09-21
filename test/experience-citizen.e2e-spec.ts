import { type INestApplication } from '@nestjs/common';
import {
  GovernmentServiceMaturityStatus,
  GovernmentServicePublicAvailability,
} from '@prisma/client';
import request from 'supertest';
import { type App } from 'supertest/types';

import { NON_PRODUCTION_APPLICATION_PROCESSING_FIXTURE_MARKER } from '../src/application-processing/application-processing.constants';
import { PrismaService } from '../src/database/prisma.service';
import {
  asCitizenApplicationBody,
  asCitizenServiceDetailBody,
  asCitizenStartExperienceBody,
} from './helpers/citizen-experience-test-types';
import { createIntegrationApp, resetAllTestData } from './helpers/integration-app';
import { seedPhase6Fixture, VALID_FORM_ANSWERS } from './helpers/phase-6-test-fixtures';
import {
  asPaginatedPublicServicesBody,
  asPublicEligibilityBody,
  asPublicServiceSummaryListBody,
} from './helpers/public-service-test-types';

describe('Citizen Experience API (e2e)', () => {
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

  it('lists active services without requiring department knowledge', async () => {
    const fixture = await seedPhase6Fixture(app, prisma);

    const list = asPaginatedPublicServicesBody(
      (await request(app.getHttpServer()).get('/api/v1/experience/citizen/services').expect(200))
        .body,
    );

    expect(list.items.some((item) => item.slug === fixture.serviceSlug)).toBe(true);
    expect(list.items[0]).not.toHaveProperty('internalNotes');
  });

  it('matches services by citizen need rather than department', async () => {
    const fixture = await seedPhase6Fixture(app, prisma);

    const matches = asPublicServiceSummaryListBody(
      (
        await request(app.getHttpServer())
          .post('/api/v1/experience/citizen/services/match')
          .send({ query: 'business permit', applicantCategory: 'INDIVIDUAL' })
          .expect(201)
      ).body,
    );

    expect(matches.some((item) => item.slug === fixture.serviceSlug)).toBe(true);
    expect(matches[0]?.responsibleDepartmentDisplayName).toBeDefined();
  });

  it('returns citizen-facing service detail with catalog metadata', async () => {
    const fixture = await seedPhase6Fixture(app, prisma);

    const detail = asCitizenServiceDetailBody(
      (
        await request(app.getHttpServer())
          .get(`/api/v1/experience/citizen/services/${fixture.serviceSlug}`)
          .expect(200)
      ).body,
    );

    expect(detail.publicName).toBe('Apply for Business Permit');
    expect(detail.serviceFamilyName).toBeDefined();
    expect(detail.responsibleDepartmentDisplayName).toBeDefined();
    expect(detail.eligibleApplicantCategories).toContain('INDIVIDUAL');
    expect(detail.applicationCapable).toBe(true);
    expect(detail.nonbindingGuidanceDisclaimer).toContain('informational only');
  });

  it('returns nonbinding eligibility guidance', async () => {
    const fixture = await seedPhase6Fixture(app, prisma);

    const eligibility = asPublicEligibilityBody(
      (
        await request(app.getHttpServer())
          .post(`/api/v1/experience/citizen/services/${fixture.serviceSlug}/eligibility`)
          .send({ applicantCategory: 'INDIVIDUAL' })
          .expect(201)
      ).body,
    );

    expect(eligibility.nonbindingDisclaimer).toContain('informational only');
    expect(eligibility.eligible).not.toBeUndefined();
  });

  it('returns a version-pinned start experience with form schema and next step', async () => {
    const fixture = await seedPhase6Fixture(app, prisma);

    const start = asCitizenStartExperienceBody(
      (
        await request(app.getHttpServer())
          .get(`/api/v1/experience/citizen/services/${fixture.serviceSlug}/start`)
          .expect(200)
      ).body,
    );

    expect(start.serviceVersionId).toBe(fixture.governmentServiceVersionId);
    expect(start.formVersionId).toBe(fixture.formVersionId);
    expect(start.configurationFingerprint).toBe(fixture.configurationFingerprint);
    expect(start.formSchema?.formVersionId).toBe(fixture.formVersionId);
    expect(start.requiredFields).toContain('businessName');
    expect(start.conditionalChecklist.length).toBeGreaterThan(0);
    expect(start.expectedNextStep).toContain('submit');
  });

  it('requires refresh when a pinned configuration fingerprint is superseded', async () => {
    const fixture = await seedPhase6Fixture(app, prisma);

    await request(app.getHttpServer())
      .get(`/api/v1/experience/citizen/services/${fixture.serviceSlug}/start`)
      .query({ configurationFingerprint: 'stale-fingerprint' })
      .expect(409);
  });

  it('creates a draft application by service slug without exposing internal UUIDs to the client flow', async () => {
    const fixture = await seedPhase6Fixture(app, prisma);

    const draft = asCitizenApplicationBody(
      (
        await request(app.getHttpServer())
          .post(`/api/v1/experience/citizen/services/${fixture.serviceSlug}/applications`)
          .set('Authorization', `Bearer ${fixture.applicantSessionToken}`)
          .send({
            configurationFingerprint: fixture.configurationFingerprint,
            applicantCategory: 'INDIVIDUAL',
            draftAnswers: VALID_FORM_ANSWERS,
          })
          .expect(201)
      ).body,
    );

    expect(draft.governmentServiceVersionId).toBe(fixture.governmentServiceVersionId);
    expect(draft.formVersionId).toBe(fixture.formVersionId);
    expect(draft.configurationFingerprint).toBe(fixture.configurationFingerprint);
  });

  it('does not leak hidden services in discovery or detail endpoints', async () => {
    const fixture = await seedPhase6Fixture(app, prisma);
    const marker = NON_PRODUCTION_APPLICATION_PROCESSING_FIXTURE_MARKER;

    const hiddenService = await prisma.governmentService.create({
      data: {
        code: `${marker}-HIDDEN`,
        slug: `${marker.toLowerCase()}-hidden-permit`,
        officialName: 'Hidden Permit',
        publicName: 'Hidden Permit',
        responsibleInstitutionId: fixture.institutionId,
        responsibleDepartmentId: fixture.departmentId,
        serviceFamilyId: fixture.serviceFamilyId,
      },
    });

    await prisma.governmentServiceVersion.create({
      data: {
        governmentServiceId: hiddenService.id,
        version: '1.0.0',
        maturityStatus: GovernmentServiceMaturityStatus.ACTIVE,
        publicAvailability: GovernmentServicePublicAvailability.HIDDEN,
      },
    });

    const list = asPaginatedPublicServicesBody(
      (await request(app.getHttpServer()).get('/api/v1/experience/citizen/services').expect(200))
        .body,
    );

    expect(list.items.some((item) => item.slug === hiddenService.slug)).toBe(false);

    await request(app.getHttpServer())
      .get(`/api/v1/experience/citizen/services/${hiddenService.slug}`)
      .expect(404);
  });

  it('blocks start and application creation for suspended services', async () => {
    const fixture = await seedPhase6Fixture(app, prisma);

    await prisma.governmentServiceVersion.update({
      where: { id: fixture.governmentServiceVersionId },
      data: {
        maturityStatus: GovernmentServiceMaturityStatus.SUSPENDED,
        publicAvailability: GovernmentServicePublicAvailability.SUSPENDED,
      },
    });

    await request(app.getHttpServer())
      .get(`/api/v1/experience/citizen/services/${fixture.serviceSlug}/start`)
      .expect(404);

    await request(app.getHttpServer())
      .post(`/api/v1/experience/citizen/services/${fixture.serviceSlug}/applications`)
      .set('Authorization', `Bearer ${fixture.applicantSessionToken}`)
      .send({
        configurationFingerprint: fixture.configurationFingerprint,
        applicantCategory: 'INDIVIDUAL',
      })
      .expect(404);
  });

  it('rejects invalid applicant categories safely', async () => {
    const fixture = await seedPhase6Fixture(app, prisma);

    await request(app.getHttpServer())
      .post(`/api/v1/experience/citizen/services/${fixture.serviceSlug}/applications`)
      .set('Authorization', `Bearer ${fixture.applicantSessionToken}`)
      .send({
        configurationFingerprint: fixture.configurationFingerprint,
        applicantCategory: 'BUSINESS',
      })
      .expect(422);
  });

  it('blocks cross-user application ownership access', async () => {
    const fixture = await seedPhase6Fixture(app, prisma);

    const draft = asCitizenApplicationBody(
      (
        await request(app.getHttpServer())
          .post(`/api/v1/experience/citizen/services/${fixture.serviceSlug}/applications`)
          .set('Authorization', `Bearer ${fixture.applicantSessionToken}`)
          .send({
            configurationFingerprint: fixture.configurationFingerprint,
            applicantCategory: 'INDIVIDUAL',
          })
          .expect(201)
      ).body,
    );

    await request(app.getHttpServer())
      .get(`/api/v1/applications/${draft.id}`)
      .set('Authorization', `Bearer ${fixture.officialSessionToken}`)
      .expect(404);
  });

  it('does not mutate previously submitted applications when service configuration changes', async () => {
    const fixture = await seedPhase6Fixture(app, prisma);

    const draft = asCitizenApplicationBody(
      (
        await request(app.getHttpServer())
          .post(`/api/v1/experience/citizen/services/${fixture.serviceSlug}/applications`)
          .set('Authorization', `Bearer ${fixture.applicantSessionToken}`)
          .send({
            configurationFingerprint: fixture.configurationFingerprint,
            applicantCategory: 'INDIVIDUAL',
            draftAnswers: VALID_FORM_ANSWERS,
          })
          .expect(201)
      ).body,
    );

    const submissionResponse = await request(app.getHttpServer())
      .post(`/api/v1/applications/${draft.id}/submit`)
      .set('Authorization', `Bearer ${fixture.applicantSessionToken}`)
      .send({
        answers: VALID_FORM_ANSWERS,
        configurationFingerprint: fixture.configurationFingerprint,
        idempotencyKey: `citizen-exp-${String(Date.now())}`,
      })
      .expect(201);

    const submitBody = submissionResponse.body as { submission: { id: string } };
    const originalSubmissionId = submitBody.submission.id;
    const originalSubmission = await prisma.applicationSubmission.findUnique({
      where: { id: originalSubmissionId },
    });
    const originalHash = originalSubmission?.contentHash;
    const originalFingerprint = originalSubmission?.configurationFingerprint;

    await prisma.governmentServiceChecklistItem.create({
      data: {
        governmentServiceVersionId: fixture.governmentServiceVersionId,
        itemCode: 'NEW_REQUIREMENT',
        label: 'New Requirement',
        isRequired: true,
        sortOrder: 99,
      },
    });

    const unchangedSubmission = await prisma.applicationSubmission.findUnique({
      where: { id: originalSubmissionId },
    });

    expect(unchangedSubmission?.contentHash).toBe(originalHash);
    expect(unchangedSubmission?.configurationFingerprint).toBe(originalFingerprint);
    expect(unchangedSubmission?.governmentServiceVersionId).toBe(
      fixture.governmentServiceVersionId,
    );
  });
});
