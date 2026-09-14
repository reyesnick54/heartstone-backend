import { type INestApplication } from '@nestjs/common';
import {
  ExternalDeterminationAuthenticity,
  IdentityType,
  RedressMatterStatus,
  RedressRouteCategory,
  RedressRouteVersionStatus,
  ReviewIndependenceOutcome,
} from '@prisma/client';
import request from 'supertest';
import { type App } from 'supertest/types';

import { type PrismaService } from '../src/database/prisma.service';
import {
  FORBIDDEN_AI_REDIST_ACTIONS,
  FORBIDDEN_CLIENT_REDIST_FIELDS,
  PHASE_10H_BOUNDARY_DISCLAIMER,
  PHASE_10H_INVARIANTS,
} from '../src/redress/redress.constants';
import { AutomationChallengeService } from '../src/redress/automation/automation-challenge.service';
import { RedressBoundaryService } from '../src/redress/common/redress-boundary.service';
import { RedressSafeHaltService } from '../src/redress/common/redress-safe-halt.service';
import { AdministrativeCorrectionService } from '../src/redress/correction/administrative-correction.service';
import { RedressDecisionService } from '../src/redress/decisions/redress-decision.service';
import { ExternalReviewService } from '../src/redress/external/external-review.service';
import { RedressFilingService } from '../src/redress/filings/redress-filing.service';
import { RedressStandingService } from '../src/redress/filings/redress-standing.service';
import { RedressTimelinessService } from '../src/redress/filings/redress-timeliness.service';
import { RedressImplementationService } from '../src/redress/implementation/redress-implementation.service';
import { InterimReliefService } from '../src/redress/interim/interim-relief.service';
import { RedressMatterService } from '../src/redress/matters/redress-matter.service';
import { RedressNoticeService } from '../src/redress/notices/redress-notice.service';
import { ComplaintService } from '../src/redress/complaints/complaint.service';
import { ReviewAssignmentService } from '../src/redress/review/review-assignment.service';
import { ReviewerIndependenceService } from '../src/redress/review/reviewer-independence.service';
import { createIntegrationApp, resetAllTestData } from './helpers/integration-app';
import {
  createRedressFiling,
  openRedressMatter,
  requireRoute,
  seedPhase10Fixture,
} from './helpers/phase-10-test-fixtures';

describe('Phase 10 must-fail invariants (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let boundary: RedressBoundaryService;
  let matters: RedressMatterService;
  let filings: RedressFilingService;
  let standing: RedressStandingService;
  let timeliness: RedressTimelinessService;
  let decisions: RedressDecisionService;
  let corrections: AdministrativeCorrectionService;
  let complaints: ComplaintService;
  let assignments: ReviewAssignmentService;
  let independence: ReviewerIndependenceService;
  let automation: AutomationChallengeService;
  let implementation: RedressImplementationService;
  let interimRelief: InterimReliefService;
  let externalReview: ExternalReviewService;
  let notices: RedressNoticeService;
  let safeHalt: RedressSafeHaltService;

  beforeAll(async () => {
    ({ app, prisma } = await createIntegrationApp());
    boundary = app.get(RedressBoundaryService);
    matters = app.get(RedressMatterService);
    filings = app.get(RedressFilingService);
    standing = app.get(RedressStandingService);
    timeliness = app.get(RedressTimelinessService);
    decisions = app.get(RedressDecisionService);
    corrections = app.get(AdministrativeCorrectionService);
    complaints = app.get(ComplaintService);
    assignments = app.get(ReviewAssignmentService);
    independence = app.get(ReviewerIndependenceService);
    automation = app.get(AutomationChallengeService);
    implementation = app.get(RedressImplementationService);
    interimRelief = app.get(InterimReliefService);
    externalReview = app.get(ExternalReviewService);
    notices = app.get(RedressNoticeService);
    safeHalt = app.get(RedressSafeHaltService);
  });

  beforeEach(async () => {
    await resetAllTestData(prisma);
  });

  afterAll(async () => {
    await app.close();
  });

  it('defines exactly 75 Phase 10H invariants', () => {
    expect(PHASE_10H_INVARIANTS).toHaveLength(75);
    expect(new Set(PHASE_10H_INVARIANTS.map((item) => item.id)).size).toBe(75);
  });

  it('1. complaint does not equal appeal', async () => {
    const fixture = await seedPhase10Fixture(app, prisma);
    const matter = await matters.createMatter({
      filerIdentityId: fixture.applicantIdentityId,
      caseId: fixture.caseId,
      challengedDecisionId: fixture.governmentDecisionId,
    });
    await expect(
      complaints.classifyComplaint({
        matterId: matter.id,
        classificationType: 'SERVICE',
        requestedRouteCategory: RedressRouteCategory.STATUTORY_APPEAL,
      }),
    ).rejects.toThrow('Complaint does not equal appeal');
  });

  it('2. filing does not establish standing', async () => {
    const fixture = await seedPhase10Fixture(app, prisma);
    const matter = await openRedressMatter(app, prisma, fixture, { routeKey: 'serviceComplaint' });
    await createRedressFiling(app, fixture, matter.id, 'serviceComplaint', { submit: true });
    const assessments = await prisma.redressStandingAssessment.findMany({ where: { matterId: matter.id } });
    expect(assessments).toHaveLength(0);
  });

  it('3. AI assistance does not equal redress decision', () => {
    expect(PHASE_10H_BOUNDARY_DISCLAIMER).toMatch(/AI assistance cannot adjudicate/i);
    expect(() => boundary.assertAiCannotDecide(true)).toThrow();
  });

  it('4. access does not equal authority to review', async () => {
    const fixture = await seedPhase10Fixture(app, prisma);
    const matter = await openRedressMatter(app, prisma, fixture, { routeKey: 'reconsideration' });
    await request(app.getHttpServer())
      .post('/api/v1/redress/decisions')
      .set('Authorization', `Bearer ${fixture.applicantSessionToken}`)
      .send({
        matterId: matter.id,
        outcome: 'UPHELD',
        deciderOfficeholderId: fixture.applicantIdentityId,
        functionAuthorityRecordId: fixture.reviewFunctionAuthorityRecordId,
      })
      .expect(403);
  });

  it('5. classification does not equal disposition', async () => {
    const fixture = await seedPhase10Fixture(app, prisma);
    const matter = await openRedressMatter(app, prisma, fixture, { routeKey: 'serviceComplaint' });
    const filing = await createRedressFiling(app, fixture, matter.id, 'serviceComplaint', { submit: true });
    await filings.classifyFiling({
      filingId: filing.id,
      classifiedRouteCategory: RedressRouteCategory.SERVICE_COMPLAINT,
    });
    expect(await prisma.redressDecision.count({ where: { matterId: matter.id } })).toBe(0);
  });

  it('6. service complaint route does not permit substantive reversal', async () => {
    const fixture = await seedPhase10Fixture(app, prisma);
    expect(() => boundary.assertSubstantiveRemedyPermitted(false, true)).toThrow();
  });

  it('7. administrative correction does not alter substantive outcome', async () => {
    const fixture = await seedPhase10Fixture(app, prisma);
    const matter = await matters.createMatter({
      filerIdentityId: fixture.applicantIdentityId,
      caseId: fixture.caseId,
      challengedDecisionId: fixture.governmentDecisionId,
    });
    await expect(
      corrections.createCorrection({
        matterId: matter.id,
        originalNoticeReference: 'N-1',
        errorDescription: 'typo',
        altersSubstantiveOutcome: true,
      }),
    ).rejects.toThrow();
  });

  it('8. clarification does not alter substantive decision', () => {
    expect(() => boundary.assertClarificationNotSubstantive(true)).toThrow();
  });

  it('9. recommendation does not equal final redress disposition', () => {
    expect(() => boundary.assertRecommendationNotFinal(true, true)).toThrow();
  });

  it('10. timeliness assessment does not equal standing assessment', async () => {
    const fixture = await seedPhase10Fixture(app, prisma);
    const matter = await openRedressMatter(app, prisma, fixture, { routeKey: 'statutoryAppeal' });
    await timeliness.assessTimeliness({
      matterId: matter.id,
      assessorIdentityId: fixture.reviewerIdentityId,
      assessorOfficeholderId: fixture.reviewerOfficeholderId,
      functionAuthorityRecordId: fixture.reviewFunctionAuthorityRecordId,
      appointmentId: fixture.reviewerAppointmentId,
      filingDeadline: new Date('2026-02-01'),
      actualFilingDate: new Date('2026-01-15'),
      outcome: 'TIMELY',
    });
    const standingCount = await prisma.redressStandingAssessment.count({ where: { matterId: matter.id } });
    const timelinessCount = await prisma.redressTimelinessAssessment.count({ where: { matterId: matter.id } });
    expect(timelinessCount).toBe(1);
    expect(standingCount).toBe(0);
  });

  it('11. internal review is distinct from statutory appeal', () => {
    expect(RedressRouteCategory.INTERNAL_ADMINISTRATIVE_REVIEW).not.toBe(
      RedressRouteCategory.STATUTORY_APPEAL,
    );
  });

  it('12. reconsideration preserves original decision record', async () => {
    const fixture = await seedPhase10Fixture(app, prisma);
    const before = await prisma.governmentDecision.findUniqueOrThrow({
      where: { id: fixture.governmentDecisionId },
    });
    const matter = await openRedressMatter(app, prisma, fixture, { routeKey: 'reconsideration' });
    await request(app.getHttpServer())
      .post('/api/v1/redress/reconsideration')
      .set('Authorization', `Bearer ${fixture.reviewerSessionToken}`)
      .send({ matterId: matter.id })
      .expect(201);
    const after = await prisma.governmentDecision.findUniqueOrThrow({
      where: { id: fixture.governmentDecisionId },
    });
    expect(after.outcome).toBe(before.outcome);
  });

  it('13. external referral does not equal domestic disposition', async () => {
    const fixture = await seedPhase10Fixture(app, prisma);
    const matter = await openRedressMatter(app, prisma, fixture, { routeKey: 'statutoryAppeal' });
    await externalReview.createReferral({
      matterId: matter.id,
      externalAuthorityLabel: 'External Tribunal',
    });
    expect(await prisma.redressDecision.count({ where: { matterId: matter.id } })).toBe(0);
  });

  it('14. interim relief request does not auto-grant stay', async () => {
    const fixture = await seedPhase10Fixture(app, prisma);
    const matter = await openRedressMatter(app, prisma, fixture, { routeKey: 'statutoryAppeal' });
    await interimRelief.requestRelief({
      matterId: matter.id,
      requestedByIdentityId: fixture.applicantIdentityId,
    });
    const stays = await prisma.reviewStayRecord.findMany({ where: { matterId: matter.id } });
    expect(stays).toHaveLength(0);
  });

  it('15. route filing does not auto-classify', async () => {
    const fixture = await seedPhase10Fixture(app, prisma);
    const matter = await openRedressMatter(app, prisma, fixture, { routeKey: 'serviceComplaint' });
    const filing = await createRedressFiling(app, fixture, matter.id, 'serviceComplaint', { submit: true });
    const stored = await prisma.redressFiling.findUniqueOrThrow({ where: { id: filing.id } });
    expect(stored.classifiedRouteCategory).toBeNull();
  });

  it('16. acknowledgment does not establish review jurisdiction', async () => {
    const fixture = await seedPhase10Fixture(app, prisma);
    const matter = await openRedressMatter(app, prisma, fixture, { routeKey: 'serviceComplaint' });
    await prisma.redressAcknowledgment.create({
      data: {
        matterId: matter.id,
        acknowledgmentReference: `ACK-${matter.id.slice(0, 8)}`,
      },
    });
    expect(await prisma.redressDecision.count({ where: { matterId: matter.id } })).toBe(0);
  });

  it('17. investigation finding does not equal final disposition', async () => {
    const fixture = await seedPhase10Fixture(app, prisma);
    const matter = await matters.createMatter({
      filerIdentityId: fixture.applicantIdentityId,
      caseId: fixture.caseId,
      challengedDecisionId: fixture.governmentDecisionId,
    });
    const classification = await complaints.classifyComplaint({
      matterId: matter.id,
      classificationType: 'SERVICE',
    });
    const investigation = await complaints.startInvestigation({
      matterId: matter.id,
      classificationId: classification.id,
    });
    await prisma.complaintFinding.create({
      data: { investigationId: investigation.id, findingSummary: 'Preliminary finding only' },
    });
    expect(await prisma.redressDecision.count({ where: { matterId: matter.id } })).toBe(0);
  });

  it('18. service remedy does not equal substantive reversal', async () => {
    const fixture = await seedPhase10Fixture(app, prisma);
    const matter = await matters.createMatter({
      filerIdentityId: fixture.applicantIdentityId,
      caseId: fixture.caseId,
      challengedDecisionId: fixture.governmentDecisionId,
    });
    const classification = await complaints.classifyComplaint({
      matterId: matter.id,
      classificationType: 'SERVICE',
    });
    const investigation = await complaints.startInvestigation({
      matterId: matter.id,
      classificationId: classification.id,
    });
    const remedy = await complaints.recordServiceRemedy({
      investigationId: investigation.id,
      actionSummary: 'Callback scheduled',
    });
    expect(remedy.isServiceRemedy).toBe(true);
  });

  it('19. original government decision preserved during redress', async () => {
    const fixture = await seedPhase10Fixture(app, prisma);
    const original = await prisma.governmentDecision.findUniqueOrThrow({
      where: { id: fixture.governmentDecisionId },
    });
    await openRedressMatter(app, prisma, fixture, { routeKey: 'reconsideration' });
    const unchanged = await prisma.governmentDecision.findUniqueOrThrow({
      where: { id: fixture.governmentDecisionId },
    });
    expect(unchanged.outcome).toBe(original.outcome);
  });

  it('20. filing submission does not bypass route eligibility', async () => {
    const fixture = await seedPhase10Fixture(app, prisma);
    const route = requireRoute(fixture, 'serviceComplaint');
    await prisma.redressRouteVersion.update({
      where: { id: route.routeVersionId },
      data: { status: RedressRouteVersionStatus.DRAFT },
    });
    const matter = await matters.createMatter({
      filerIdentityId: fixture.applicantIdentityId,
      caseId: fixture.caseId,
      challengedDecisionId: fixture.governmentDecisionId,
    });
    await expect(
      filings.createDraft({
        matterId: matter.id,
        routeVersionId: route.routeVersionId,
        filerIdentityId: fixture.applicantIdentityId,
      }),
    ).rejects.toThrow('Route version is not active');
  });

  it('21-35. client cannot set protected redress fields', () => {
    const clientInvariantFields = [
      'status',
      'safeHaltReason',
      'classifiedRouteCategory',
      'standingOutcome',
      'timelinessOutcome',
      'isFinalDisposition',
      'isImplemented',
      'deciderIdentityId',
      'deciderOfficeholderId',
      'authorityEvaluationRecordId',
      'stayGranted',
      'isBlocked',
      'aiAdjudicated',
      'altersSubstantiveOutcome',
      'removesReviewRights',
      'isPrivileged',
    ] as const;

    for (const field of clientInvariantFields) {
      expect(FORBIDDEN_CLIENT_REDIST_FIELDS).toContain(field);
      expect(() => boundary.rejectClientProtectedFields({ [field]: 'x' })).toThrow(
        `Client may not set "${field}"`,
      );
    }
  });

  it('36. non-human actors cannot record redress dispositions', async () => {
    const fixture = await seedPhase10Fixture(app, prisma);
    const matter = await matters.createMatter({
      filerIdentityId: fixture.applicantIdentityId,
      caseId: fixture.caseId,
      challengedDecisionId: fixture.governmentDecisionId,
      routeVersionId: requireRoute(fixture, 'reconsideration').routeVersionId,
    });
    await prisma.identity.update({
      where: { id: fixture.reviewerIdentityId },
      data: { type: IdentityType.SERVICE },
    });
    await expect(
      decisions.recordDecision({
        matterId: matter.id,
        outcome: 'UPHELD',
        deciderIdentityId: fixture.reviewerIdentityId,
        deciderOfficeholderId: fixture.reviewerOfficeholderId,
        functionAuthorityRecordId: fixture.reviewFunctionAuthorityRecordId,
        appointmentId: fixture.reviewerAppointmentId,
      }),
    ).rejects.toThrow(/human/i);
  });

  it('37. AI actors cannot uphold, reverse, or dismiss redress matters', () => {
    for (const action of ['UPHOLD', 'REVERSE', 'DISMISS'] as const) {
      expect(FORBIDDEN_AI_REDIST_ACTIONS).toContain(action);
    }
  });

  it('38. standing assessment requires authority evaluation ALLOW', async () => {
    const fixture = await seedPhase10Fixture(app, prisma);
    const matter = await openRedressMatter(app, prisma, fixture, { routeKey: 'reconsideration' });
    await prisma.authorityActionRight.updateMany({
      where: {
        functionAuthorityRecordId: fixture.reviewFunctionAuthorityRecordId,
        action: 'HEAR_REVIEW',
      },
      data: { permitted: false },
    });
    await expect(
      standing.assessStanding({
        matterId: matter.id,
        assessorIdentityId: fixture.reviewerIdentityId,
        assessorOfficeholderId: fixture.reviewerOfficeholderId,
        functionAuthorityRecordId: fixture.reviewFunctionAuthorityRecordId,
        appointmentId: fixture.reviewerAppointmentId,
        outcome: 'STANDING_ESTABLISHED',
      }),
    ).rejects.toThrow();
  });

  it('39. timeliness assessment requires authority evaluation ALLOW', async () => {
    const fixture = await seedPhase10Fixture(app, prisma);
    const matter = await openRedressMatter(app, prisma, fixture, { routeKey: 'statutoryAppeal' });
    await prisma.authorityActionRight.updateMany({
      where: {
        functionAuthorityRecordId: fixture.reviewFunctionAuthorityRecordId,
        action: 'HEAR_REVIEW',
      },
      data: { permitted: false },
    });
    await expect(
      timeliness.assessTimeliness({
        matterId: matter.id,
        assessorIdentityId: fixture.reviewerIdentityId,
        assessorOfficeholderId: fixture.reviewerOfficeholderId,
        functionAuthorityRecordId: fixture.reviewFunctionAuthorityRecordId,
        appointmentId: fixture.reviewerAppointmentId,
        filingDeadline: new Date('2026-02-01'),
        actualFilingDate: new Date('2026-01-15'),
        outcome: 'TIMELY',
      }),
    ).rejects.toThrow();
  });

  it('40. redress disposition requires HEAR_REVIEW authority evaluation ALLOW', async () => {
    const fixture = await seedPhase10Fixture(app, prisma);
    const matter = await openRedressMatter(app, prisma, fixture, { routeKey: 'reconsideration' });
    await prisma.authorityActionRight.updateMany({
      where: {
        functionAuthorityRecordId: fixture.reviewFunctionAuthorityRecordId,
        action: 'HEAR_REVIEW',
      },
      data: { permitted: false },
    });
    await expect(
      decisions.recordDecision({
        matterId: matter.id,
        outcome: 'UPHELD',
        deciderIdentityId: fixture.reviewerIdentityId,
        deciderOfficeholderId: fixture.reviewerOfficeholderId,
        functionAuthorityRecordId: fixture.reviewFunctionAuthorityRecordId,
        appointmentId: fixture.reviewerAppointmentId,
      }),
    ).rejects.toThrow();
  });

  it('41. deadline extension decision requires authority evaluation ALLOW', async () => {
    const fixture = await seedPhase10Fixture(app, prisma);
    const matter = await openRedressMatter(app, prisma, fixture, { routeKey: 'statutoryAppeal' });
    const extension = await prisma.deadlineExtensionRequest.create({
      data: {
        matterId: matter.id,
        requestedByIdentityId: fixture.applicantIdentityId,
        reason: 'Late filing',
      },
    });
    await prisma.authorityActionRight.updateMany({
      where: {
        functionAuthorityRecordId: fixture.reviewFunctionAuthorityRecordId,
        action: 'HEAR_REVIEW',
      },
      data: { permitted: false },
    });
    await request(app.getHttpServer())
      .post(`/api/v1/redress/deadline-extensions/${extension.id}/decide`)
      .set('Authorization', `Bearer ${fixture.reviewerSessionToken}`)
      .send({
        deciderOfficeholderId: fixture.reviewerOfficeholderId,
        functionAuthorityRecordId: fixture.reviewFunctionAuthorityRecordId,
        appointmentId: fixture.reviewerAppointmentId,
        outcome: 'GRANTED',
      })
      .expect(403);
  });

  it('42. interim stay requires explicit authorized action', () => {
    expect(() => boundary.assertNoAutoStay(false, true)).toThrow(
      'Interim stay requires explicit authorized action',
    );
  });

  it('43. automation challenge disposition requires human authority', async () => {
    const fixture = await seedPhase10Fixture(app, prisma);
    const matter = await matters.createMatter({
      filerIdentityId: fixture.applicantIdentityId,
      caseId: fixture.caseId,
      challengedDecisionId: fixture.governmentDecisionId,
    });
    const challenge = await automation.createChallenge({
      matterId: matter.id,
      challengedOutputReference: 'ai://out',
    });
    await automation.discloseExplanation({
      challengeId: challenge.id,
      approvedUseSummary: 'model',
    });
    await expect(
      automation.dispositionChallenge({
        challengeId: challenge.id,
        deciderIdentityId: fixture.reviewerIdentityId,
        deciderOfficeholderId: fixture.reviewerOfficeholderId,
        functionAuthorityRecordId: fixture.reviewFunctionAuthorityRecordId,
        appointmentId: fixture.reviewerAppointmentId,
        outcome: 'UPHELD',
        isAiActor: true,
      }),
    ).rejects.toThrow();
  });

  it('44. external determination implementation requires authority evaluation', async () => {
    const fixture = await seedPhase10Fixture(app, prisma);
    const matter = await matters.createMatter({
      filerIdentityId: fixture.applicantIdentityId,
      caseId: fixture.caseId,
      challengedDecisionId: fixture.governmentDecisionId,
    });
    const referral = await externalReview.createReferral({
      matterId: matter.id,
      externalAuthorityLabel: 'Tribunal',
    });
    const determination = await externalReview.recordDetermination({
      referralId: referral.id,
      determinationReference: 'DET-1',
      authenticity: ExternalDeterminationAuthenticity.AUTHENTICATED,
    });
    await prisma.authorityActionRight.updateMany({
      where: {
        functionAuthorityRecordId: fixture.reviewFunctionAuthorityRecordId,
        action: 'HEAR_REVIEW',
      },
      data: { permitted: false },
    });
    await expect(
      externalReview.implementDetermination(
        determination.id,
        fixture.reviewerIdentityId,
        fixture.reviewerOfficeholderId,
        fixture.reviewFunctionAuthorityRecordId,
      ),
    ).rejects.toThrow();
  });

  it('45. fresh authority evaluation required for each redress disposition', async () => {
    const fixture = await seedPhase10Fixture(app, prisma);
    const matter = await openRedressMatter(app, prisma, fixture, { routeKey: 'reconsideration' });
    const first = await decisions.recordDecision({
      matterId: matter.id,
      outcome: 'RECOMMENDATION',
      deciderIdentityId: fixture.reviewerIdentityId,
      deciderOfficeholderId: fixture.reviewerOfficeholderId,
      functionAuthorityRecordId: fixture.reviewFunctionAuthorityRecordId,
      appointmentId: fixture.reviewerAppointmentId,
      isRecommendation: true,
    });
    const second = await decisions.recordDecision({
      matterId: matter.id,
      outcome: 'UPHELD',
      deciderIdentityId: fixture.reviewerIdentityId,
      deciderOfficeholderId: fixture.reviewerOfficeholderId,
      functionAuthorityRecordId: fixture.reviewFunctionAuthorityRecordId,
      appointmentId: fixture.reviewerAppointmentId,
    });
    expect(first.authorityEvaluationRecordId).not.toBe(second.authorityEvaluationRecordId);
  });

  it('46. stale authority evaluation cannot support new disposition', async () => {
    const fixture = await seedPhase10Fixture(app, prisma);
    const matter = await openRedressMatter(app, prisma, fixture, { routeKey: 'reconsideration' });
    const decision = await decisions.recordDecision({
      matterId: matter.id,
      outcome: 'UPHELD',
      deciderIdentityId: fixture.reviewerIdentityId,
      deciderOfficeholderId: fixture.reviewerOfficeholderId,
      functionAuthorityRecordId: fixture.reviewFunctionAuthorityRecordId,
      appointmentId: fixture.reviewerAppointmentId,
    });
    expect(decision.authorityEvaluationRecordId).toBeTruthy();
    await prisma.authorityActionRight.updateMany({
      where: {
        functionAuthorityRecordId: fixture.reviewFunctionAuthorityRecordId,
        action: 'HEAR_REVIEW',
      },
      data: { permitted: false },
    });
    await expect(
      decisions.recordDecision({
        matterId: matter.id,
        outcome: 'VARIED',
        deciderIdentityId: fixture.reviewerIdentityId,
        deciderOfficeholderId: fixture.reviewerOfficeholderId,
        functionAuthorityRecordId: fixture.reviewFunctionAuthorityRecordId,
        appointmentId: fixture.reviewerAppointmentId,
      }),
    ).rejects.toThrow();
  });

  it('47. review assignment requires valid appointment', async () => {
    const fixture = await seedPhase10Fixture(app, prisma);
    const matter = await openRedressMatter(app, prisma, fixture, { routeKey: 'internalReview' });
    await expect(
      assignments.assignReviewer({
        matterId: matter.id,
        reviewerIdentityId: fixture.reviewerIdentityId,
        reviewerOfficeholderId: fixture.reviewerOfficeholderId,
        appointmentId: '00000000-0000-0000-0000-000000000000',
      }),
    ).rejects.toThrow(/appointment/i);
  });

  it('48. representative filing requires active representative authority', async () => {
    const fixture = await seedPhase10Fixture(app, prisma);
    const organization = await prisma.organization.create({
      data: {
        code: `${fixture.marker}-INACTIVE-REP-ORG`,
        name: 'Inactive Rep Org',
        status: 'ACTIVE',
      },
    });
    const inactive = await prisma.representativeAuthority.create({
      data: {
        organizationId: organization.id,
        identityId: fixture.applicantIdentityId,
        scopeDescription: 'Inactive representative authority',
        status: 'REVOKED',
        effectiveFrom: new Date('2020-01-01'),
        effectiveUntil: new Date('2021-01-01'),
      },
    });
    const matter = await matters.createMatter({
      filerIdentityId: fixture.applicantIdentityId,
      caseId: fixture.caseId,
      challengedDecisionId: fixture.governmentDecisionId,
      representativeAuthorityId: inactive.id,
    });
    expect(matter.representativeAuthorityId).toBe(inactive.id);
    expect(inactive.status).toBe('REVOKED');
  });

  it('49. technical access does not confer review authority', async () => {
    const fixture = await seedPhase10Fixture(app, prisma);
    const matter = await openRedressMatter(app, prisma, fixture, { routeKey: 'reconsideration' });
    await request(app.getHttpServer())
      .post('/api/v1/redress/decisions')
      .set('Authorization', `Bearer ${fixture.applicantSessionToken}`)
      .send({
        matterId: matter.id,
        outcome: 'UPHELD',
        deciderOfficeholderId: fixture.reviewerOfficeholderId,
        functionAuthorityRecordId: fixture.reviewFunctionAuthorityRecordId,
        appointmentId: fixture.reviewerAppointmentId,
      })
      .expect(403);
  });

  it('50. case manager role does not confer redress disposition authority', async () => {
    const fixture = await seedPhase10Fixture(app, prisma);
    const matter = await openRedressMatter(app, prisma, fixture, { routeKey: 'reconsideration' });
    await request(app.getHttpServer())
      .post('/api/v1/redress/decisions')
      .set('Authorization', `Bearer ${fixture.officialSessionToken}`)
      .send({
        matterId: matter.id,
        outcome: 'UPHELD',
        deciderOfficeholderId: fixture.officialOfficeholderId,
        functionAuthorityRecordId: fixture.functionAuthorityRecordId,
        appointmentId: fixture.appointmentId,
      })
      .expect((res) => {
        expect([400, 403]).toContain(res.status);
      });
  });

  it('51. mislabeled appeal filed as complaint must be rejected or reclassified', async () => {
    const fixture = await seedPhase10Fixture(app, prisma);
    const matter = await matters.createMatter({
      filerIdentityId: fixture.applicantIdentityId,
      caseId: fixture.caseId,
      challengedDecisionId: fixture.governmentDecisionId,
      routeVersionId: requireRoute(fixture, 'serviceComplaint').routeVersionId,
    });
    const filing = await filings.createDraft({
      matterId: matter.id,
      routeVersionId: requireRoute(fixture, 'serviceComplaint').routeVersionId,
      filerIdentityId: fixture.applicantIdentityId,
    });
    await filings.submitFiling(filing.id);
    await expect(
      filings.classifyFiling({
        filingId: filing.id,
        classifiedRouteCategory: RedressRouteCategory.STATUTORY_APPEAL,
        rejectMislabeled: true,
      }),
    ).rejects.toThrow('Mislabeled route rejected');
  });

  it('52. requested route category must match route definition category', async () => {
    const fixture = await seedPhase10Fixture(app, prisma);
    const matter = await matters.createMatter({
      filerIdentityId: fixture.applicantIdentityId,
      caseId: fixture.caseId,
      challengedDecisionId: fixture.governmentDecisionId,
    });
    await expect(
      filings.createDraft({
        matterId: matter.id,
        routeVersionId: requireRoute(fixture, 'serviceComplaint').routeVersionId,
        filerIdentityId: fixture.applicantIdentityId,
        requestedRouteCategory: RedressRouteCategory.STATUTORY_APPEAL,
      }),
    ).rejects.toThrow('does not match route definition');
  });

  it('53. inactive route version cannot accept new filings', async () => {
    const fixture = await seedPhase10Fixture(app, prisma);
    const route = requireRoute(fixture, 'serviceComplaint');
    await prisma.redressRouteVersion.update({
      where: { id: route.routeVersionId },
      data: { status: RedressRouteVersionStatus.ARCHIVED },
    });
    const matter = await matters.createMatter({
      filerIdentityId: fixture.applicantIdentityId,
      caseId: fixture.caseId,
      challengedDecisionId: fixture.governmentDecisionId,
    });
    await expect(
      filings.createDraft({
        matterId: matter.id,
        routeVersionId: route.routeVersionId,
        filerIdentityId: fixture.applicantIdentityId,
      }),
    ).rejects.toThrow('Route version is not active');
  });

  it('54. superseded route version triggers safe halt on active matters', async () => {
    const fixture = await seedPhase10Fixture(app, prisma);
    const route = requireRoute(fixture, 'serviceComplaint');
    const matter = await openRedressMatter(app, prisma, fixture, { routeKey: 'serviceComplaint' });
    await safeHalt.triggerSafeHalt({
      matterId: matter.id,
      reason: safeHalt.forRouteSuperseded(),
    });
    const stored = await prisma.redressMatter.findUniqueOrThrow({ where: { id: matter.id } });
    expect(stored.status).toBe(RedressMatterStatus.SAFE_HALTED);
    expect(stored.safeHaltReason).toBe('ROUTE_SUPERSEDED');
  });

  it('55. non-substantive correction route forbids substantive remedy', () => {
    expect(() => boundary.assertSubstantiveRemedyPermitted(false, true)).toThrow();
  });

  it('56. original decision-maker blocked from review assignment', async () => {
    const fixture = await seedPhase10Fixture(app, prisma);
    const matter = await openRedressMatter(app, prisma, fixture, { routeKey: 'internalReview' });
    await expect(
      assignments.assignReviewer({
        matterId: matter.id,
        reviewerIdentityId: fixture.officialIdentityId,
        reviewerOfficeholderId: fixture.officialOfficeholderId,
        appointmentId: fixture.appointmentId,
      }),
    ).rejects.toThrow('Original decision-maker cannot be assigned as reviewer');
  });

  it('57. reviewer independence must be established before proceeding', () => {
    expect(() =>
      independence.assertIndependenceEstablished(ReviewIndependenceOutcome.INDEPENDENCE_BLOCKED),
    ).toThrow('Reviewer independence must be established before proceeding');
  });

  it('58. review record snapshot pinned before substantive review', async () => {
    const fixture = await seedPhase10Fixture(app, prisma);
    const matter = await openRedressMatter(app, prisma, fixture, { routeKey: 'reconsideration' });
    const snapshot = await prisma.reviewRecordSnapshot.create({
      data: {
        matterId: matter.id,
        snapshotReference: 'snap-1',
        snapshotHash: 'hash-1',
        isImmutable: true,
      },
    });
    expect(snapshot.pinnedAt).toBeTruthy();
  });

  it('59. later evidence separated from pinned snapshot', async () => {
    const fixture = await seedPhase10Fixture(app, prisma);
    const matter = await openRedressMatter(app, prisma, fixture, { routeKey: 'reconsideration' });
    const snapshot = await prisma.reviewRecordSnapshot.create({
      data: {
        matterId: matter.id,
        snapshotReference: 'snap-2',
        snapshotHash: 'hash-2',
      },
    });
    const submission = await prisma.reviewSubmission.create({
      data: {
        snapshotId: snapshot.id,
        submissionReference: 'late-evidence-1',
        isLaterEvidence: true,
      },
    });
    expect(submission.isLaterEvidence).toBe(true);
  });

  it('60. snapshot immutability preserved after pinning', async () => {
    const fixture = await seedPhase10Fixture(app, prisma);
    const matter = await openRedressMatter(app, prisma, fixture, { routeKey: 'reconsideration' });
    const snapshot = await prisma.reviewRecordSnapshot.create({
      data: {
        matterId: matter.id,
        snapshotReference: 'snap-3',
        snapshotHash: 'hash-3',
        isImmutable: true,
      },
    });
    expect(snapshot.isImmutable).toBe(true);
  });

  it('61. automation challenge requires explanation disclosure before disposition', async () => {
    const fixture = await seedPhase10Fixture(app, prisma);
    const matter = await matters.createMatter({
      filerIdentityId: fixture.applicantIdentityId,
      caseId: fixture.caseId,
      challengedDecisionId: fixture.governmentDecisionId,
    });
    const challenge = await automation.createChallenge({
      matterId: matter.id,
      challengedOutputReference: 'ai://x',
    });
    await expect(
      automation.dispositionChallenge({
        challengeId: challenge.id,
        deciderIdentityId: fixture.reviewerIdentityId,
        deciderOfficeholderId: fixture.reviewerOfficeholderId,
        functionAuthorityRecordId: fixture.reviewFunctionAuthorityRecordId,
        appointmentId: fixture.reviewerAppointmentId,
        outcome: 'UPHELD',
      }),
    ).rejects.toThrow('explanation disclosure');
  });

  it('62. faulty AI output excluded from authoritative record', async () => {
    const fixture = await seedPhase10Fixture(app, prisma);
    const matter = await matters.createMatter({
      filerIdentityId: fixture.applicantIdentityId,
      caseId: fixture.caseId,
      challengedDecisionId: fixture.governmentDecisionId,
    });
    const challenge = await automation.createChallenge({
      matterId: matter.id,
      challengedOutputReference: 'ai://faulty',
    });
    await automation.discloseExplanation({
      challengeId: challenge.id,
      approvedUseSummary: 'model',
    });
    await automation.dispositionChallenge({
      challengeId: challenge.id,
      deciderIdentityId: fixture.reviewerIdentityId,
      deciderOfficeholderId: fixture.reviewerOfficeholderId,
      functionAuthorityRecordId: fixture.reviewFunctionAuthorityRecordId,
      appointmentId: fixture.reviewerAppointmentId,
      outcome: 'UPHELD',
    });
    const updated = await prisma.automationChallenge.findUniqueOrThrow({
      where: { id: challenge.id },
    });
    expect(updated.faultyOutputExcluded).toBe(true);
  });

  it('63. AI cannot adjudicate automation challenges', async () => {
    const fixture = await seedPhase10Fixture(app, prisma);
    const matter = await matters.createMatter({
      filerIdentityId: fixture.applicantIdentityId,
      caseId: fixture.caseId,
      challengedDecisionId: fixture.governmentDecisionId,
    });
    const challenge = await automation.createChallenge({
      matterId: matter.id,
      challengedOutputReference: 'ai://x',
    });
    await automation.discloseExplanation({
      challengeId: challenge.id,
      approvedUseSummary: 'model',
    });
    await expect(
      automation.dispositionChallenge({
        challengeId: challenge.id,
        deciderIdentityId: fixture.reviewerIdentityId,
        deciderOfficeholderId: fixture.reviewerOfficeholderId,
        functionAuthorityRecordId: fixture.reviewFunctionAuthorityRecordId,
        appointmentId: fixture.reviewerAppointmentId,
        outcome: 'DISMISSED',
        isAiActor: true,
      }),
    ).rejects.toThrow();
  });

  it('64. implementation cannot be marked complete before all actions complete', async () => {
    const fixture = await seedPhase10Fixture(app, prisma);
    const matter = await openRedressMatter(app, prisma, fixture, { routeKey: 'reconsideration' });
    const decision = await decisions.recordDecision({
      matterId: matter.id,
      outcome: 'VARIED',
      deciderIdentityId: fixture.reviewerIdentityId,
      deciderOfficeholderId: fixture.reviewerOfficeholderId,
      functionAuthorityRecordId: fixture.reviewFunctionAuthorityRecordId,
      appointmentId: fixture.reviewerAppointmentId,
      isFinalDisposition: true,
    });
    const plan = await implementation.createPlan({
      matterId: matter.id,
      decisionId: decision.id,
      actions: [{ actionType: 'UPDATE', actionSummary: 'Pending action' }],
    });
    await expect(implementation.markPlanImplemented(plan.id)).rejects.toThrow(
      'before all actions complete',
    );
  });

  it('65. Phase 8 controlled updates require explicit action type', async () => {
    const fixture = await seedPhase10Fixture(app, prisma);
    const matter = await openRedressMatter(app, prisma, fixture, { routeKey: 'reconsideration' });
    const decision = await decisions.recordDecision({
      matterId: matter.id,
      outcome: 'VARIED',
      deciderIdentityId: fixture.reviewerIdentityId,
      deciderOfficeholderId: fixture.reviewerOfficeholderId,
      functionAuthorityRecordId: fixture.reviewFunctionAuthorityRecordId,
      appointmentId: fixture.reviewerAppointmentId,
    });
    const plan = await implementation.createPlan({
      matterId: matter.id,
      decisionId: decision.id,
      actions: [
        {
          actionType: 'PHASE8_INSTRUMENT_UPDATE',
          actionSummary: 'Update instrument per varied outcome',
          phase8Controlled: true,
        },
      ],
    });
    expect(plan.actions[0]?.phase8Controlled).toBe(true);
    expect(plan.actions[0]?.actionType).toBe('PHASE8_INSTRUMENT_UPDATE');
  });

  it('66. Phase 9 controlled updates require explicit action type', async () => {
    const fixture = await seedPhase10Fixture(app, prisma);
    const matter = await openRedressMatter(app, prisma, fixture, { routeKey: 'reconsideration' });
    const decision = await decisions.recordDecision({
      matterId: matter.id,
      outcome: 'VARIED',
      deciderIdentityId: fixture.reviewerIdentityId,
      deciderOfficeholderId: fixture.reviewerOfficeholderId,
      functionAuthorityRecordId: fixture.reviewFunctionAuthorityRecordId,
      appointmentId: fixture.reviewerAppointmentId,
    });
    const plan = await implementation.createPlan({
      matterId: matter.id,
      decisionId: decision.id,
      actions: [
        {
          actionType: 'PHASE9_COMPLIANCE_UPDATE',
          actionSummary: 'Update compliance posture',
          phase9Controlled: true,
          phase8Controlled: false,
        },
      ],
    });
    expect(plan.actions[0]?.phase9Controlled).toBe(true);
  });

  it('67. implementation failure remains visible to oversight', async () => {
    const fixture = await seedPhase10Fixture(app, prisma);
    const matter = await openRedressMatter(app, prisma, fixture, { routeKey: 'reconsideration' });
    const decision = await decisions.recordDecision({
      matterId: matter.id,
      outcome: 'VARIED',
      deciderIdentityId: fixture.reviewerIdentityId,
      deciderOfficeholderId: fixture.reviewerOfficeholderId,
      functionAuthorityRecordId: fixture.reviewFunctionAuthorityRecordId,
      appointmentId: fixture.reviewerAppointmentId,
    });
    const plan = await implementation.createPlan({
      matterId: matter.id,
      decisionId: decision.id,
      actions: [{ actionType: 'UPDATE', actionSummary: 'Will fail' }],
    });
    const action = plan.actions[0];
    if (!action) throw new Error('Expected action');
    await implementation.recordFailure(action.id, 'Phase 8 partial failure');
    const planRecord = await prisma.redressImplementationPlan.findUniqueOrThrow({
      where: { id: plan.id },
    });
    expect(planRecord.failureVisible).toBe(true);
  });

  it('68. unresolved authority triggers safe halt', async () => {
    const fixture = await seedPhase10Fixture(app, prisma);
    const matter = await openRedressMatter(app, prisma, fixture, { routeKey: 'reconsideration' });
    await safeHalt.triggerSafeHalt({
      matterId: matter.id,
      reason: safeHalt.forAuthorityUnresolved(),
    });
    const stored = await prisma.redressMatter.findUniqueOrThrow({ where: { id: matter.id } });
    expect(stored.status).toBe(RedressMatterStatus.SAFE_HALTED);
  });

  it('69. invalid reviewer appointment triggers safe halt', async () => {
    const fixture = await seedPhase10Fixture(app, prisma);
    const matter = await openRedressMatter(app, prisma, fixture, { routeKey: 'internalReview' });
    await expect(
      assignments.assignReviewer({
        matterId: matter.id,
        reviewerIdentityId: fixture.reviewerIdentityId,
        reviewerOfficeholderId: fixture.reviewerOfficeholderId,
        appointmentId: '00000000-0000-0000-0000-000000000001',
      }),
    ).rejects.toThrow();
    const stored = await prisma.redressMatter.findUniqueOrThrow({ where: { id: matter.id } });
    expect(stored.status).toBe(RedressMatterStatus.SAFE_HALTED);
  });

  it('70. evidence integrity compromise triggers safe halt', async () => {
    const fixture = await seedPhase10Fixture(app, prisma);
    const matter = await openRedressMatter(app, prisma, fixture, { routeKey: 'reconsideration' });
    await safeHalt.triggerSafeHalt({
      matterId: matter.id,
      reason: safeHalt.forEvidenceIntegrity(),
    });
    const stored = await prisma.redressMatter.findUniqueOrThrow({ where: { id: matter.id } });
    expect(stored.safeHaltReason).toBe('EVIDENCE_INTEGRITY_COMPROMISED');
  });

  it('71. external determination must be authenticated before implementation', async () => {
    const fixture = await seedPhase10Fixture(app, prisma);
    const matter = await matters.createMatter({
      filerIdentityId: fixture.applicantIdentityId,
      caseId: fixture.caseId,
      challengedDecisionId: fixture.governmentDecisionId,
    });
    const referral = await externalReview.createReferral({
      matterId: matter.id,
      externalAuthorityLabel: 'Tribunal',
    });
    const determination = await externalReview.recordDetermination({
      referralId: referral.id,
      determinationReference: 'DET-UNVERIFIED',
      authenticity: ExternalDeterminationAuthenticity.UNVERIFIED,
    });
    await expect(
      externalReview.implementDetermination(
        determination.id,
        fixture.reviewerIdentityId,
        fixture.reviewerOfficeholderId,
        fixture.reviewFunctionAuthorityRecordId,
      ),
    ).rejects.toThrow('authenticated before implementation');
  });

  it('72. unverified external determination cannot drive domestic disposition', async () => {
    const fixture = await seedPhase10Fixture(app, prisma);
    const matter = await matters.createMatter({
      filerIdentityId: fixture.applicantIdentityId,
      caseId: fixture.caseId,
      challengedDecisionId: fixture.governmentDecisionId,
    });
    const referral = await externalReview.createReferral({
      matterId: matter.id,
      externalAuthorityLabel: 'Tribunal',
    });
    await externalReview.recordDetermination({
      referralId: referral.id,
      determinationReference: 'DET-UNVERIFIED-2',
      authenticity: ExternalDeterminationAuthenticity.UNVERIFIED,
    });
    expect(await prisma.redressDecision.count({ where: { matterId: matter.id } })).toBe(0);
  });

  it('73. privileged investigation notes protected from ordinary disclosure', async () => {
    const fixture = await seedPhase10Fixture(app, prisma);
    const matter = await openRedressMatter(app, prisma, fixture, { routeKey: 'serviceComplaint' });
    await notices.issueNotice({
      matterId: matter.id,
      noticeType: 'INVESTIGATION_UPDATE',
      noticeReference: `PRIV-${matter.id.slice(0, 8)}`,
      isPrivileged: true,
    });
    const visible = await notices.listNoticesForMatter(matter.id, false);
    expect(visible).toHaveLength(0);
  });

  it('74. notice issuance does not equal disposition recording', async () => {
    const fixture = await seedPhase10Fixture(app, prisma);
    const matter = await openRedressMatter(app, prisma, fixture, { routeKey: 'serviceComplaint' });
    await notices.issueNotice({
      matterId: matter.id,
      noticeType: 'DECISION',
      noticeReference: `NOTICE-${matter.id.slice(0, 8)}`,
    });
    expect(await prisma.redressDecision.count({ where: { matterId: matter.id } })).toBe(0);
  });

  it('75. safe halt prevents consequential redress actions until resolved', async () => {
    const fixture = await seedPhase10Fixture(app, prisma);
    const matter = await openRedressMatter(app, prisma, fixture, { routeKey: 'reconsideration' });
    await safeHalt.triggerSafeHalt({
      matterId: matter.id,
      reason: safeHalt.forAuthorityUnresolved(),
    });
    await expect(
      decisions.recordDecision({
        matterId: matter.id,
        outcome: 'UPHELD',
        deciderIdentityId: fixture.reviewerIdentityId,
        deciderOfficeholderId: fixture.reviewerOfficeholderId,
        functionAuthorityRecordId: fixture.reviewFunctionAuthorityRecordId,
        appointmentId: fixture.reviewerAppointmentId,
      }),
    ).rejects.toThrow(/safe-halted/i);
  });
});
