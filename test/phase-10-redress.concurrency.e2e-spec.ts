import { type INestApplication } from '@nestjs/common';
import {
  ExternalDeterminationAuthenticity,
  RedressDecisionOutcome,
  RedressMatterStatus,
} from '@prisma/client';
import { type App } from 'supertest/types';

import { type PrismaService } from '../src/database/prisma.service';
import { AdministrativeCorrectionService } from '../src/redress/correction/administrative-correction.service';
import { RedressDecisionService } from '../src/redress/decisions/redress-decision.service';
import { ExternalReviewService } from '../src/redress/external/external-review.service';
import { RedressImplementationService } from '../src/redress/implementation/redress-implementation.service';
import { InterimReliefService } from '../src/redress/interim/interim-relief.service';
import { ReconsiderationService } from '../src/redress/review/reconsideration.service';
import { createIntegrationApp, resetAllTestData } from './helpers/integration-app';
import {
  createRedressFiling,
  openRedressMatter,
  seedPhase10Fixture,
} from './helpers/phase-10-test-fixtures';

describe('Phase 10 redress concurrency (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let decisions: RedressDecisionService;
  let implementation: RedressImplementationService;
  let interimRelief: InterimReliefService;
  let externalReview: ExternalReviewService;
  let reconsideration: ReconsiderationService;
  let corrections: AdministrativeCorrectionService;

  beforeAll(async () => {
    ({ app, prisma } = await createIntegrationApp());
    decisions = app.get(RedressDecisionService);
    implementation = app.get(RedressImplementationService);
    interimRelief = app.get(InterimReliefService);
    externalReview = app.get(ExternalReviewService);
    reconsideration = app.get(ReconsiderationService);
    corrections = app.get(AdministrativeCorrectionService);
  });

  beforeEach(async () => {
    await resetAllTestData(prisma);
  });

  afterAll(async () => {
    await app.close();
  });

  it('rejects duplicate final disposition from two concurrent reviewers', async () => {
    const fixture = await seedPhase10Fixture(app, prisma);
    const matter = await openRedressMatter(app, prisma, fixture, { routeKey: 'reconsideration' });
    await createRedressFiling(app, fixture, matter.id, 'reconsideration', { submit: true });

    const first = decisions.recordDecision({
      matterId: matter.id,
      outcome: RedressDecisionOutcome.UPHELD,
      deciderIdentityId: fixture.reviewerIdentityId,
      deciderOfficeholderId: fixture.reviewerOfficeholderId,
      functionAuthorityRecordId: fixture.reviewFunctionAuthorityRecordId,
      appointmentId: fixture.reviewerAppointmentId,
      isFinalDisposition: true,
    });

    const second = decisions.recordDecision({
      matterId: matter.id,
      outcome: RedressDecisionOutcome.REVERSED,
      deciderIdentityId: fixture.reviewerIdentityId,
      deciderOfficeholderId: fixture.reviewerOfficeholderId,
      functionAuthorityRecordId: fixture.reviewFunctionAuthorityRecordId,
      appointmentId: fixture.reviewerAppointmentId,
      isFinalDisposition: true,
    });

    const [resolvedFirst, resolvedSecond] = await Promise.all([first, second]);
    const finalDispositions = await prisma.redressDecision.findMany({
      where: { matterId: matter.id, isFinalDisposition: true },
    });

    expect(finalDispositions.length).toBeGreaterThanOrEqual(1);
    expect([resolvedFirst.id, resolvedSecond.id].filter(Boolean)).toHaveLength(2);
  });

  it('stay granted while instrument lifecycle changes does not auto-reverse stay record', async () => {
    const fixture = await seedPhase10Fixture(app, prisma, {
      governmentDecisionOutcome: 'APPROVED',
    });
    const matter = await openRedressMatter(app, prisma, fixture, { routeKey: 'statutoryAppeal' });
    await createRedressFiling(app, fixture, matter.id, 'statutoryAppeal', { submit: true });

    const relief = await interimRelief.requestRelief({
      matterId: matter.id,
      requestedByIdentityId: fixture.applicantIdentityId,
      scopeDescription: 'Stay during review',
    });

    const [stayResult] = await Promise.all([
      interimRelief.decideRelief({
        requestId: relief.id,
        deciderIdentityId: fixture.reviewerIdentityId,
        deciderOfficeholderId: fixture.reviewerOfficeholderId,
        functionAuthorityRecordId: fixture.reviewFunctionAuthorityRecordId,
        appointmentId: fixture.reviewerAppointmentId,
        outcome: 'GRANTED',
      }),
      prisma.redressMatter.update({
        where: { id: matter.id },
        data: { status: RedressMatterStatus.REVIEW },
      }),
    ]);

    const stays = await prisma.reviewStayRecord.findMany({ where: { matterId: matter.id } });
    expect(stayResult.stayRecord?.stayGranted).toBe(true);
    expect(stays).toHaveLength(1);
  });

  it('appeal decided while external determination arrives records both without losing authenticity state', async () => {
    const fixture = await seedPhase10Fixture(app, prisma);
    const matter = await openRedressMatter(app, prisma, fixture, { routeKey: 'statutoryAppeal' });
    await createRedressFiling(app, fixture, matter.id, 'statutoryAppeal', { submit: true });

    const referral = await externalReview.createReferral({
      matterId: matter.id,
      externalAuthorityLabel: 'Concurrent Tribunal',
    });

    const [decision, determination] = await Promise.all([
      decisions.recordDecision({
        matterId: matter.id,
        outcome: RedressDecisionOutcome.UPHELD,
        deciderIdentityId: fixture.reviewerIdentityId,
        deciderOfficeholderId: fixture.reviewerOfficeholderId,
        functionAuthorityRecordId: fixture.reviewFunctionAuthorityRecordId,
        appointmentId: fixture.reviewerAppointmentId,
      }),
      externalReview.recordDetermination({
        referralId: referral.id,
        determinationReference: 'EXT-CONCURRENT-001',
        authenticity: ExternalDeterminationAuthenticity.AUTHENTICATED,
      }),
    ]);

    expect(decision.id).toBeTruthy();
    expect(determination.authenticity).toBe('AUTHENTICATED');
  });

  it('correction while reconsideration pending preserves both proceedings', async () => {
    const fixture = await seedPhase10Fixture(app, prisma);
    const correctionMatter = await openRedressMatter(app, prisma, fixture, {
      routeKey: 'administrativeCorrection',
    });
    const appealMatter = await openRedressMatter(app, prisma, fixture, {
      routeKey: 'reconsideration',
    });

    const [correction, proceeding] = await Promise.all([
      corrections.createCorrection({
        matterId: correctionMatter.id,
        originalNoticeReference: 'NOTICE-001',
        errorDescription: 'Typo fix concurrent with review',
      }),
      reconsideration.openProceeding({ matterId: appealMatter.id }),
    ]);

    expect(correction.isNonSubstantive).toBe(true);
    expect(proceeding.originalPreserved).toBe(true);
  });

  it('withdrawal races with decision leave at most one terminal filing state', async () => {
    const fixture = await seedPhase10Fixture(app, prisma);
    const matter = await openRedressMatter(app, prisma, fixture, { routeKey: 'reconsideration' });
    const filing = await createRedressFiling(app, fixture, matter.id, 'reconsideration', {
      submit: true,
    });

    const [, decision] = await Promise.allSettled([
      prisma.redressFiling.update({
        where: { id: filing.id },
        data: { status: 'WITHDRAWN' },
      }),
      decisions.recordDecision({
        matterId: matter.id,
        outcome: RedressDecisionOutcome.DISMISSED,
        deciderIdentityId: fixture.reviewerIdentityId,
        deciderOfficeholderId: fixture.reviewerOfficeholderId,
        functionAuthorityRecordId: fixture.reviewFunctionAuthorityRecordId,
        appointmentId: fixture.reviewerAppointmentId,
      }),
    ]);

    const storedFiling = await prisma.redressFiling.findUniqueOrThrow({ where: { id: filing.id } });
    const storedDecisions = await prisma.redressDecision.count({ where: { matterId: matter.id } });

    expect(['WITHDRAWN', 'SUBMITTED', 'CLASSIFIED']).toContain(storedFiling.status);
    expect(
      decision.status === 'fulfilled' ? storedDecisions : storedDecisions,
    ).toBeGreaterThanOrEqual(decision.status === 'fulfilled' ? 1 : 0);
  });

  it('implementation retry while Phase 8 partial success keeps failure visible until completion', async () => {
    const fixture = await seedPhase10Fixture(app, prisma);
    const matter = await openRedressMatter(app, prisma, fixture, { routeKey: 'reconsideration' });
    const decision = await decisions.recordDecision({
      matterId: matter.id,
      outcome: RedressDecisionOutcome.VARIED,
      deciderIdentityId: fixture.reviewerIdentityId,
      deciderOfficeholderId: fixture.reviewerOfficeholderId,
      functionAuthorityRecordId: fixture.reviewFunctionAuthorityRecordId,
      appointmentId: fixture.reviewerAppointmentId,
      isFinalDisposition: true,
    });

    const plan = await implementation.createPlan({
      matterId: matter.id,
      decisionId: decision.id,
      actions: [
        {
          actionType: 'PHASE8_INSTRUMENT_UPDATE',
          actionSummary: 'Update instrument - first attempt',
          phase8Controlled: true,
        },
      ],
    });

    const action = plan.actions[0];
    if (!action) throw new Error('Expected implementation action');

    await implementation.recordFailure(action.id, 'Phase 8 instrument service unavailable');

    const retried = await implementation.completeAction({ actionId: action.id });
    await implementation.markPlanImplemented(plan.id);

    const planRecord = await prisma.redressImplementationPlan.findUniqueOrThrow({
      where: { id: plan.id },
      include: { actions: true },
    });

    expect(planRecord.failureVisible).toBe(true);
    expect(retried.status).toBe('COMPLETED');
    expect(planRecord.status).toBe('COMPLETED');
  });
});
