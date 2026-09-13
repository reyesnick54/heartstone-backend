import { type INestApplication } from '@nestjs/common';
import { CaseStatus, CaseWorkflowInstanceStatus } from '@prisma/client';
import request from 'supertest';
import { type App } from 'supertest/types';

import { PrismaService } from '../src/database/prisma.service';
import { createIntegrationApp, resetAllTestData } from './helpers/integration-app';
import { seedPhase6Fixture, VALID_FORM_ANSWERS } from './helpers/phase-6-test-fixtures';
import {
  asApplicationBody,
  asReferralBody,
  asSubmitApplicationResponseBody,
} from './helpers/phase-6-test-types';
import { asServiceStartPackageBody } from './helpers/public-service-test-types';

describe('Phase 6 Applications, Workflow & Case Management (e2e)', () => {
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

  describe('happy path to DECISION_PENDING', () => {
    it('processes service start through decision pending without issuing instruments', async () => {
      const fixture = await seedPhase6Fixture(app, prisma);

      const startPackage = asServiceStartPackageBody(
        (
          await request(app.getHttpServer())
            .get(`/api/v1/public/services/${fixture.serviceSlug}/start-package`)
            .expect(200)
        ).body,
      );

      expect(startPackage.serviceVersionId).toBe(fixture.governmentServiceVersionId);

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

      const submitResult = asSubmitApplicationResponseBody(
        (
          await request(app.getHttpServer())
            .post(`/api/v1/applications/${draft.id}/submit`)
            .set('Authorization', `Bearer ${fixture.applicantSessionToken}`)
            .send({
              answers: VALID_FORM_ANSWERS,
              configurationFingerprint: fixture.configurationFingerprint,
              idempotencyKey: 'happy-path-1',
            })
            .expect(201)
        ).body,
      );

      expect(submitResult.applicationNumber).toBeDefined();
      expect(submitResult.submission.acknowledgmentReference).toBeDefined();
      expect(submitResult.case.caseNumber).toBeDefined();

      const caseId = submitResult.case.id;

      await request(app.getHttpServer())
        .post(`/api/v1/cases/${caseId}/workflow/steps/intake/complete`)
        .set('Authorization', `Bearer ${fixture.officialSessionToken}`)
        .send({ officeholderId: fixture.officialOfficeholderId })
        .expect(201);

      const submissionId = submitResult.submission.id;

      await request(app.getHttpServer())
        .post(`/api/v1/cases/${caseId}/completeness-reviews`)
        .set('Authorization', `Bearer ${fixture.officialSessionToken}`)
        .send({
          applicationSubmissionId: submissionId,
          checklistResults: fixture.checklistItemCodes.map((code) => ({
            itemCode: code,
            status: 'PRESENT',
          })),
        })
        .expect(201);

      const workflowBeforeSubstantive = await prisma.caseWorkflowInstance.findUnique({
        where: { caseId },
      });
      expect(workflowBeforeSubstantive?.currentStepKeys).toContain('substantive-review');

      const substantiveRes = await request(app.getHttpServer())
        .post(`/api/v1/cases/${caseId}/workflow/steps/substantive-review/complete`)
        .set('Authorization', `Bearer ${fixture.officialSessionToken}`)
        .send({
          officeholderId: fixture.officialOfficeholderId,
          officeId: fixture.officeId,
          appointmentId: fixture.appointmentId,
          institutionId: fixture.institutionId,
        });

      if (substantiveRes.status !== 201) {
        throw new Error(`Substantive review failed: ${JSON.stringify(substantiveRes.body)}`);
      }

      await request(app.getHttpServer())
        .post(`/api/v1/cases/${caseId}/workflow/steps/parallel-review-a/complete`)
        .set('Authorization', `Bearer ${fixture.officialSessionToken}`)
        .send({})
        .expect(201);

      const partialJoin = await prisma.caseWorkflowInstance.findUnique({
        where: { caseId },
      });
      expect(partialJoin?.currentStepKeys).not.toContain('parallel-join');

      await request(app.getHttpServer())
        .post(`/api/v1/cases/${caseId}/workflow/steps/parallel-review-b/complete`)
        .set('Authorization', `Bearer ${fixture.officialSessionToken}`)
        .send({})
        .expect(201);

      const parallelJoinRes = await request(app.getHttpServer())
        .post(`/api/v1/cases/${caseId}/workflow/steps/parallel-join/complete`)
        .set('Authorization', `Bearer ${fixture.officialSessionToken}`)
        .send({});

      if (parallelJoinRes.status !== 201) {
        const wf = await prisma.caseWorkflowInstance.findUnique({ where: { caseId } });
        throw new Error(
          `Parallel join failed: ${JSON.stringify(parallelJoinRes.body)} keys=${JSON.stringify(wf?.currentStepKeys)}`,
        );
      }

      const referral = asReferralBody(
        (
          await request(app.getHttpServer())
            .post(`/api/v1/cases/${caseId}/referrals`)
            .set('Authorization', `Bearer ${fixture.officialSessionToken}`)
            .send({
              referralType: 'EXTERNAL_AUTHORITY',
              externalAuthorityId: fixture.externalAuthorityId,
              authorityDependencyId: fixture.authorityDependencyId,
              referralBasis: 'Regulatory concurrence required',
            })
            .expect(201)
        ).body,
      );

      await request(app.getHttpServer())
        .post(`/api/v1/cases/referrals/${referral.id}/responses`)
        .set('Authorization', `Bearer ${fixture.officialSessionToken}`)
        .send({
          responseReference: 'EXT-RESP-001',
          responseSummary: 'Authenticated concurrence received',
          authenticationStatus: 'AUTHENTICATED',
          satisfiesDependency: true,
        })
        .expect(201);

      await request(app.getHttpServer())
        .post(`/api/v1/cases/${caseId}/workflow/steps/external-referral/complete`)
        .set('Authorization', `Bearer ${fixture.officialSessionToken}`)
        .send({})
        .expect(201);

      const caseRecord = await prisma.case.findUnique({ where: { id: caseId } });
      expect(caseRecord?.status).toBe(CaseStatus.DECISION_PENDING);

      const decisionCount = await prisma.$queryRawUnsafe<{ count: bigint }[]>(
        `SELECT COUNT(*) as count FROM information_schema.tables WHERE table_name = 'government_decisions'`,
      );
      expect(Number(decisionCount[0]?.count ?? 0)).toBe(0);

      const licenseTables = await prisma.$queryRawUnsafe<{ count: bigint }[]>(
        `SELECT COUNT(*) as count FROM information_schema.tables WHERE table_name IN ('issued_licenses', 'issued_permits', 'issued_certificates')`,
      );
      expect(Number(licenseTables[0]?.count ?? 0)).toBe(0);
    });
  });

  describe('incomplete path with deficiency and correction', () => {
    it('issues deficiency, waits for applicant, and accepts correction as new submission', async () => {
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

      const submitResult = asSubmitApplicationResponseBody(
        (
          await request(app.getHttpServer())
            .post(`/api/v1/applications/${draft.id}/submit`)
            .set('Authorization', `Bearer ${fixture.applicantSessionToken}`)
            .send({
              answers: VALID_FORM_ANSWERS,
              configurationFingerprint: fixture.configurationFingerprint,
            })
            .expect(201)
        ).body,
      );

      const caseId = submitResult.case.id;
      const originalSubmissionId = submitResult.submission.id;

      await request(app.getHttpServer())
        .post(`/api/v1/cases/${caseId}/workflow/steps/intake/complete`)
        .set('Authorization', `Bearer ${fixture.officialSessionToken}`)
        .send({})
        .expect(201);

      await request(app.getHttpServer())
        .post(`/api/v1/cases/${caseId}/completeness-reviews`)
        .set('Authorization', `Bearer ${fixture.officialSessionToken}`)
        .send({
          applicationSubmissionId: originalSubmissionId,
          checklistResults: [
            { itemCode: fixture.checklistItemCodes[0], status: 'PRESENT' },
            { itemCode: fixture.checklistItemCodes[1], status: 'MISSING' },
          ],
        })
        .expect(201);

      const caseAfterDeficiency = await prisma.case.findUnique({ where: { id: caseId } });
      expect(caseAfterDeficiency?.status).toBe(CaseStatus.WAITING_APPLICANT);

      const workflow = await prisma.caseWorkflowInstance.findUnique({ where: { caseId } });
      expect(workflow?.status).toBe(CaseWorkflowInstanceStatus.WAITING_APPLICANT);

      const originalSubmission = await prisma.applicationSubmission.findUnique({
        where: { id: originalSubmissionId },
      });
      const originalHash = originalSubmission?.contentHash;

      const correctionResult = asSubmitApplicationResponseBody(
        (
          await request(app.getHttpServer())
            .post(`/api/v1/applications/${draft.id}/corrections`)
            .set('Authorization', `Bearer ${fixture.applicantSessionToken}`)
            .send({
              answers: { ...VALID_FORM_ANSWERS, businessName: 'Corrected Business Ltd' },
              configurationFingerprint: fixture.configurationFingerprint,
            })
            .expect(201)
        ).body,
      );

      const newSubmissionId = correctionResult.submission.id;
      expect(newSubmissionId).not.toBe(originalSubmissionId);

      const originalAfter = await prisma.applicationSubmission.findUnique({
        where: { id: originalSubmissionId },
      });
      expect(originalAfter?.contentHash).toBe(originalHash);
      expect(originalAfter?.status).toBe('SUPERSEDED');
    });
  });

  describe('authority failure safe-halt', () => {
    it('blocks consequential step when appointment ends', async () => {
      const fixture = await seedPhase6Fixture(app, prisma);

      await prisma.appointment.update({
        where: { id: fixture.appointmentId },
        data: { status: 'ENDED', effectiveUntil: new Date('2020-12-31') },
      });

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

      const submitResult = asSubmitApplicationResponseBody(
        (
          await request(app.getHttpServer())
            .post(`/api/v1/applications/${draft.id}/submit`)
            .set('Authorization', `Bearer ${fixture.applicantSessionToken}`)
            .send({
              answers: VALID_FORM_ANSWERS,
              configurationFingerprint: fixture.configurationFingerprint,
            })
            .expect(201)
        ).body,
      );

      const caseId = submitResult.case.id;

      await request(app.getHttpServer())
        .post(`/api/v1/cases/${caseId}/workflow/steps/intake/complete`)
        .set('Authorization', `Bearer ${fixture.officialSessionToken}`)
        .send({})
        .expect(201);

      await request(app.getHttpServer())
        .post(`/api/v1/cases/${caseId}/completeness-reviews`)
        .set('Authorization', `Bearer ${fixture.officialSessionToken}`)
        .send({
          applicationSubmissionId: submitResult.submission.id,
          checklistResults: fixture.checklistItemCodes.map((code) => ({
            itemCode: code,
            status: 'PRESENT',
          })),
        })
        .expect(201);

      await request(app.getHttpServer())
        .post(`/api/v1/cases/${caseId}/workflow/steps/substantive-review/complete`)
        .set('Authorization', `Bearer ${fixture.officialSessionToken}`)
        .send({
          officeholderId: fixture.officialOfficeholderId,
          officeId: fixture.officeId,
          appointmentId: fixture.appointmentId,
        })
        .expect(403);
    });
  });
});
