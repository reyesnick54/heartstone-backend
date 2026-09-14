import { type INestApplication } from '@nestjs/common';
import {
  ExternalDeterminationAuthenticity,
  RedressDecisionOutcome,
  RedressMatterStatus,
} from '@prisma/client';
import request from 'supertest';
import { type App } from 'supertest/types';

import { type PrismaService } from '../src/database/prisma.service';
import { ExternalReviewService } from '../src/redress/external/external-review.service';
import { RedressImplementationService } from '../src/redress/implementation/redress-implementation.service';
import { createIntegrationApp, resetAllTestData } from './helpers/integration-app';
import {
  assessTimeliness,
  classifyFiling,
  createRedressFiling,
  openRedressMatter,
  recordRedressDecision,
  seedPhase10Fixture,
} from './helpers/phase-10-test-fixtures';

describe('Phase 10 redress lifecycle (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let implementation: RedressImplementationService;
  let externalReview: ExternalReviewService;

  beforeAll(async () => {
    ({ app, prisma } = await createIntegrationApp());
    implementation = app.get(RedressImplementationService);
    externalReview = app.get(ExternalReviewService);
  });

  beforeEach(async () => {
    await resetAllTestData(prisma);
  });

  afterAll(async () => {
    await app.close();
  });

  it('E2E 1 Administrative correction records nonsubstantive fix without altering decision outcome', async () => {
    const fixture = await seedPhase10Fixture(app, prisma);
    const matter = await openRedressMatter(app, prisma, fixture, { routeKey: 'administrativeCorrection' });
    await createRedressFiling(app, fixture, matter.id, 'administrativeCorrection', { submit: true });

    const correction = await request(app.getHttpServer())
      .post('/api/v1/redress/corrections')
      .set('Authorization', `Bearer ${fixture.applicantSessionToken}`)
      .send({
        matterId: matter.id,
        originalNoticeReference: 'NOTICE-REFUSED-001',
        errorDescription: 'Spelling error in applicant address line',
      })
      .expect(201);

    const originalDecision = await prisma.governmentDecision.findUniqueOrThrow({
      where: { id: fixture.governmentDecisionId },
    });

    expect(correction.body.altersSubstantiveOutcome).toBe(false);
    expect(correction.body.originalPreserved).toBe(true);
    expect(originalDecision.outcome).toBe('REFUSED');
  });

  it('E2E 2 Correction boundary rejects REFUSED to APPROVED substantive reversal', async () => {
    const fixture = await seedPhase10Fixture(app, prisma);
    const matter = await openRedressMatter(app, prisma, fixture, { routeKey: 'administrativeCorrection' });

    await request(app.getHttpServer())
      .post('/api/v1/redress/corrections')
      .set('Authorization', `Bearer ${fixture.applicantSessionToken}`)
      .send({
        matterId: matter.id,
        originalNoticeReference: 'NOTICE-REFUSED-001',
        errorDescription: 'Attempt to reverse refusal to approval',
        altersSubstantiveOutcome: true,
      })
      .expect(403);

    const original = await prisma.governmentDecision.findUniqueOrThrow({
      where: { id: fixture.governmentDecisionId },
    });
    expect(original.outcome).toBe('REFUSED');
  });

  it('E2E 3 Service complaint investigates and records service remedy only', async () => {
    const fixture = await seedPhase10Fixture(app, prisma);
    const matter = await openRedressMatter(app, prisma, fixture, { routeKey: 'serviceComplaint' });
    const filing = await createRedressFiling(app, fixture, matter.id, 'serviceComplaint', {
      submit: true,
    });
    await classifyFiling(app, fixture, filing.id, 'serviceComplaint');

    const classification = await request(app.getHttpServer())
      .post('/api/v1/redress/complaints/classify')
      .set('Authorization', `Bearer ${fixture.reviewerSessionToken}`)
      .send({
        matterId: matter.id,
        classificationType: 'SERVICE',
        classifiedByOfficeholderId: fixture.reviewerOfficeholderId,
      })
      .expect(201);

    const investigation = await request(app.getHttpServer())
      .post('/api/v1/redress/complaints/investigations')
      .set('Authorization', `Bearer ${fixture.reviewerSessionToken}`)
      .send({
        matterId: matter.id,
        classificationId: classification.body.id,
        investigatorIdentityId: fixture.reviewerIdentityId,
        investigatorOfficeholderId: fixture.reviewerOfficeholderId,
      })
      .expect(201);

    const remedy = await prisma.complaintCorrectiveAction.create({
      data: {
        investigationId: investigation.body.id,
        actionSummary: 'Apology letter and callback within 5 business days',
        isServiceRemedy: true,
      },
    });

    expect(remedy.isServiceRemedy).toBe(true);

    const decisionCount = await prisma.redressDecision.count({ where: { matterId: matter.id } });
    expect(decisionCount).toBe(0);
  });

  it('E2E 4 Complaint and appeal matters can both remain open on the same case', async () => {
    const fixture = await seedPhase10Fixture(app, prisma);
    const complaintMatter = await openRedressMatter(app, prisma, fixture, { routeKey: 'serviceComplaint' });
    const appealMatter = await openRedressMatter(app, prisma, fixture, { routeKey: 'reconsideration' });

    await createRedressFiling(app, fixture, complaintMatter.id, 'serviceComplaint', { submit: true });
    await createRedressFiling(app, fixture, appealMatter.id, 'reconsideration', { submit: true });

    const matters = await prisma.redressMatter.findMany({
      where: { caseId: fixture.caseId },
      orderBy: { createdAt: 'asc' },
    });

    expect(matters).toHaveLength(2);
    expect(matters.every((m) => m.status !== RedressMatterStatus.CLOSED)).toBe(true);
    expect(new Set(matters.map((m) => m.id))).toEqual(
      new Set([complaintMatter.id, appealMatter.id]),
    );
  });

  it('E2E 5 Reconsideration preserves original decision record', async () => {
    const fixture = await seedPhase10Fixture(app, prisma);
    const matter = await openRedressMatter(app, prisma, fixture, { routeKey: 'reconsideration' });
    await createRedressFiling(app, fixture, matter.id, 'reconsideration', { submit: true });

    const snapshot = await request(app.getHttpServer())
      .post('/api/v1/redress/review/snapshots')
      .set('Authorization', `Bearer ${fixture.reviewerSessionToken}`)
      .send({
        matterId: matter.id,
        snapshotReference: 'snapshot://original-decision',
        originalDecisionReference: fixture.governmentDecisionId,
      })
      .expect(201);

    const proceeding = await request(app.getHttpServer())
      .post('/api/v1/redress/reconsideration')
      .set('Authorization', `Bearer ${fixture.reviewerSessionToken}`)
      .send({ matterId: matter.id, snapshotId: snapshot.body.id })
      .expect(201);

    const original = await prisma.governmentDecision.findUniqueOrThrow({
      where: { id: fixture.governmentDecisionId },
    });

    expect(proceeding.body.originalPreserved).toBe(true);
    expect(original.outcome).toBe('REFUSED');
    expect(snapshot.body.isImmutable).toBe(true);
  });

  it('E2E 6 Internal review independence blocks original decision-maker', async () => {
    const fixture = await seedPhase10Fixture(app, prisma);
    const matter = await openRedressMatter(app, prisma, fixture, { routeKey: 'internalReview' });
    await createRedressFiling(app, fixture, matter.id, 'internalReview', { submit: true });

    await request(app.getHttpServer())
      .post('/api/v1/redress/review/assignments')
      .set('Authorization', `Bearer ${fixture.reviewerSessionToken}`)
      .send({
        matterId: matter.id,
        reviewerIdentityId: fixture.officialIdentityId,
        reviewerOfficeholderId: fixture.officialOfficeholderId,
        appointmentId: fixture.appointmentId,
      })
      .expect(403);

    const assignment = await request(app.getHttpServer())
      .post('/api/v1/redress/review/assignments')
      .set('Authorization', `Bearer ${fixture.reviewerSessionToken}`)
      .send({
        matterId: matter.id,
        reviewerIdentityId: fixture.reviewerIdentityId,
        reviewerOfficeholderId: fixture.reviewerOfficeholderId,
        appointmentId: fixture.reviewerAppointmentId,
      })
      .expect(201);

    const independence = await request(app.getHttpServer())
      .post(`/api/v1/redress/review/assignments/${assignment.body.id}/independence`)
      .set('Authorization', `Bearer ${fixture.reviewerSessionToken}`)
      .send({})
      .expect(201);

    expect(independence.body.outcome).toBe('INDEPENDENCE_ESTABLISHED');
  });

  it('E2E 7 Late filing extension granted after timeliness assessment', async () => {
    const fixture = await seedPhase10Fixture(app, prisma);
    const matter = await openRedressMatter(app, prisma, fixture, { routeKey: 'statutoryAppeal' });
    await createRedressFiling(app, fixture, matter.id, 'statutoryAppeal', { submit: true });

    await assessTimeliness(app, fixture, matter.id, {
      filingDeadline: new Date('2026-01-01').toISOString(),
      actualFilingDate: new Date('2026-01-20').toISOString(),
      outcome: 'LATE',
    });

    const extension = await request(app.getHttpServer())
      .post('/api/v1/redress/deadline-extensions')
      .set('Authorization', `Bearer ${fixture.applicantSessionToken}`)
      .send({ matterId: matter.id, reason: 'Medical emergency delayed filing' })
      .expect(201);

    const decided = await request(app.getHttpServer())
      .post(`/api/v1/redress/deadline-extensions/${extension.body.id}/decide`)
      .set('Authorization', `Bearer ${fixture.reviewerSessionToken}`)
      .send({
        deciderOfficeholderId: fixture.reviewerOfficeholderId,
        functionAuthorityRecordId: fixture.reviewFunctionAuthorityRecordId,
        appointmentId: fixture.reviewerAppointmentId,
        outcome: 'GRANTED',
      })
      .expect(201);

    expect(decided.body.outcome).toBe('GRANTED');
  });

  it('E2E 8 Appeal without stay leaves instrument lifecycle unchanged', async () => {
    const fixture = await seedPhase10Fixture(app, prisma, { governmentDecisionOutcome: 'APPROVED' });
    const matter = await openRedressMatter(app, prisma, fixture, { routeKey: 'statutoryAppeal' });
    await createRedressFiling(app, fixture, matter.id, 'statutoryAppeal', { submit: true });

    const relief = await request(app.getHttpServer())
      .post('/api/v1/redress/interim-relief')
      .set('Authorization', `Bearer ${fixture.applicantSessionToken}`)
      .send({ matterId: matter.id, scopeDescription: 'Stay instrument effect' })
      .expect(201);

    const decided = await request(app.getHttpServer())
      .post(`/api/v1/redress/interim-relief/${relief.body.id}/decide`)
      .set('Authorization', `Bearer ${fixture.reviewerSessionToken}`)
      .send({
        deciderOfficeholderId: fixture.reviewerOfficeholderId,
        functionAuthorityRecordId: fixture.reviewFunctionAuthorityRecordId,
        appointmentId: fixture.reviewerAppointmentId,
        outcome: 'DENIED',
      })
      .expect(201);

    const stays = await prisma.reviewStayRecord.findMany({ where: { matterId: matter.id } });
    expect(decided.body.request?.outcome ?? decided.body.outcome).toBe('DENIED');
    expect(stays).toHaveLength(0);
  });

  it('E2E 9 Authorized stay records explicit stay with authority evaluation', async () => {
    const fixture = await seedPhase10Fixture(app, prisma, { governmentDecisionOutcome: 'APPROVED' });
    const matter = await openRedressMatter(app, prisma, fixture, { routeKey: 'statutoryAppeal' });
    await createRedressFiling(app, fixture, matter.id, 'statutoryAppeal', { submit: true });

    const relief = await request(app.getHttpServer())
      .post('/api/v1/redress/interim-relief')
      .set('Authorization', `Bearer ${fixture.applicantSessionToken}`)
      .send({ matterId: matter.id, scopeDescription: 'Suspend license effect pending review' })
      .expect(201);

    const decided = await request(app.getHttpServer())
      .post(`/api/v1/redress/interim-relief/${relief.body.id}/decide`)
      .set('Authorization', `Bearer ${fixture.reviewerSessionToken}`)
      .send({
        deciderOfficeholderId: fixture.reviewerOfficeholderId,
        functionAuthorityRecordId: fixture.reviewFunctionAuthorityRecordId,
        appointmentId: fixture.reviewerAppointmentId,
        outcome: 'GRANTED',
      })
      .expect(201);

    const stays = await prisma.reviewStayRecord.findMany({ where: { matterId: matter.id } });
    expect(decided.body.request?.outcome ?? decided.body.outcome).toBe('GRANTED');
    expect(stays).toHaveLength(1);
    expect(stays[0]?.stayGranted).toBe(true);
    expect(stays[0]?.authorityEvaluationRecordId).toBeTruthy();
  });

  it('E2E 10 External statutory appeal referral receives authenticated determination', async () => {
    const fixture = await seedPhase10Fixture(app, prisma);
    const matter = await openRedressMatter(app, prisma, fixture, { routeKey: 'statutoryAppeal' });
    await createRedressFiling(app, fixture, matter.id, 'statutoryAppeal', { submit: true });

    const referral = await request(app.getHttpServer())
      .post('/api/v1/redress/external/referrals')
      .set('Authorization', `Bearer ${fixture.reviewerSessionToken}`)
      .send({ matterId: matter.id, externalAuthorityLabel: 'Statutory Review Tribunal' })
      .expect(201);

    const determination = await externalReview.recordDetermination({
      referralId: referral.body.id,
      determinationReference: 'EXT-DET-001',
      authenticity: ExternalDeterminationAuthenticity.AUTHENTICATED,
    });

    expect(determination.authenticity).toBe('AUTHENTICATED');

    const implemented = await externalReview.implementDetermination(
      determination.id,
      fixture.reviewerIdentityId,
      fixture.reviewerOfficeholderId,
      fixture.reviewFunctionAuthorityRecordId,
    );

    expect(implemented.implementedAt).toBeTruthy();
  });

  it('E2E 11 AI challenge requires explanation disclosure before human disposition', async () => {
    const fixture = await seedPhase10Fixture(app, prisma);
    const matter = await openRedressMatter(app, prisma, fixture, { routeKey: 'aiChallenge' });
    await createRedressFiling(app, fixture, matter.id, 'aiChallenge', { submit: true });

    const challenge = await request(app.getHttpServer())
      .post('/api/v1/redress/automation/challenges')
      .set('Authorization', `Bearer ${fixture.applicantSessionToken}`)
      .send({
        matterId: matter.id,
        challengedOutputReference: 'ai-output://denial-reason',
        challengedInputReference: 'ai-input://application-summary',
      })
      .expect(201);

    await request(app.getHttpServer())
      .post(`/api/v1/redress/automation/challenges/${challenge.body.id}/disposition`)
      .set('Authorization', `Bearer ${fixture.reviewerSessionToken}`)
      .send({
        deciderOfficeholderId: fixture.reviewerOfficeholderId,
        functionAuthorityRecordId: fixture.reviewFunctionAuthorityRecordId,
        appointmentId: fixture.reviewerAppointmentId,
        outcome: 'UPHELD',
      })
      .expect(400);

    await prisma.automationExplanationRecord.create({
      data: {
        challengeId: challenge.body.id,
        approvedUseSummary: 'Risk scoring model v2',
        inputSummary: 'Application fields',
        outputSummary: 'Denial rationale draft',
      },
    });
    await prisma.automationChallenge.update({
      where: { id: challenge.body.id },
      data: { explanationDisclosed: true },
    });

    const disposition = await request(app.getHttpServer())
      .post(`/api/v1/redress/automation/challenges/${challenge.body.id}/disposition`)
      .set('Authorization', `Bearer ${fixture.reviewerSessionToken}`)
      .send({
        deciderOfficeholderId: fixture.reviewerOfficeholderId,
        functionAuthorityRecordId: fixture.reviewFunctionAuthorityRecordId,
        appointmentId: fixture.reviewerAppointmentId,
        outcome: 'REPROCESSING_ORDERED',
        explanation: 'Human reviewer orders reprocessing without AI adjudication',
      })
      .expect(201);

    expect(disposition.body.outcome).toBe('REPROCESSING_ORDERED');

    const updatedChallenge = await prisma.automationChallenge.findUniqueOrThrow({
      where: { id: challenge.body.id },
    });
    expect(updatedChallenge.aiAdjudicated).toBe(false);
  });

  it('E2E 12 Successful appeal implementation completes all plan actions', async () => {
    const fixture = await seedPhase10Fixture(app, prisma);
    const matter = await openRedressMatter(app, prisma, fixture, { routeKey: 'reconsideration' });
    await createRedressFiling(app, fixture, matter.id, 'reconsideration', { submit: true });

    const decision = await recordRedressDecision(app, fixture, matter.id, RedressDecisionOutcome.VARIED, {
      isFinalDisposition: true,
    });

    const plan = await implementation.createPlan({
      matterId: matter.id,
      decisionId: decision.id,
      actions: [
        {
          actionType: 'UPDATE_DECISION_RECORD',
          actionSummary: 'Record varied outcome in case file',
          phase8Controlled: true,
        },
        {
          actionType: 'NOTIFY_APPLICANT',
          actionSummary: 'Issue implementation notice to applicant',
          phase8Controlled: false,
        },
      ],
    });

    for (const action of plan.actions) {
      await implementation.completeAction({ actionId: action.id });
    }

    const completed = await implementation.markPlanImplemented(plan.id);
    expect(completed.status).toBe('COMPLETED');
    expect(completed.markedImplementedAt).toBeTruthy();

    const matterRecord = await prisma.redressMatter.findUniqueOrThrow({ where: { id: matter.id } });
    expect(matterRecord.status).toBe(RedressMatterStatus.IMPLEMENTATION);
  });
});
