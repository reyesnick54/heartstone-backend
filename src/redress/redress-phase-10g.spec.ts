import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import {
  AuthorityEvaluationOutcome,
  IdentityType,
  InterimReliefDecisionOutcome,
  InterimReliefRequestType,
  RedressDecisionOutcome,
  RedressImplementationActionStatus,
  RedressReasonSectionType,
  RedressRemedyType,
  RedressRouteVersionStatus,
  ReviewStayStatus,
} from '@prisma/client';

import { AuthorityEvaluationService } from '../authority/evaluation/authority-evaluation.service';
import { InstitutionalActorResolver } from '../authority/institutional-actor/institutional-actor-resolver.service';
import { PrismaService } from '../database/prisma.service';
import { RedressBoundaryService } from './common/redress-boundary.service';
import { RedressDecisionService } from './decisions/redress-decision.service';
import { RedressImplementationService } from './implementation/redress-implementation.service';
import { InterimReliefService } from './interim-relief/interim-relief.service';
import { RedressMatterService } from './matters/redress-matter.service';
import { RedressNoticeService } from './notices/redress-notice.service';
import { TECHNICAL_ADMIN_ROLE_MARKER } from './redress.constants';
import { PHASE_10G_INVARIANTS } from './redress-phase-10g-invariants.constants';

describe('Phase 10G redress disposition', () => {
  let boundary: RedressBoundaryService;
  let matters: RedressMatterService;
  let decisions: RedressDecisionService;
  let interimRelief: InterimReliefService;
  let implementation: RedressImplementationService;
  let notices: RedressNoticeService;

  const prisma: {
    redressRouteVersion: { findUnique: jest.Mock };
    governmentDecision: { findUnique: jest.Mock };
    decisionReviewReference: { create: jest.Mock; update: jest.Mock };
    redressMatter: { create: jest.Mock; findUnique: jest.Mock; update: jest.Mock };
    identity: { findUnique: jest.Mock };
    redressReviewRecordSnapshot: { create: jest.Mock };
    redressDecision: { create: jest.Mock; findUnique: jest.Mock };
    redressImplementationPlan: { create: jest.Mock; findUnique: jest.Mock; update: jest.Mock };
    redressImplementationAction: { findUnique: jest.Mock; update: jest.Mock };
    redressImplementationVerification: { create: jest.Mock };
    interimReliefRequest: { create: jest.Mock; findUnique: jest.Mock; update: jest.Mock };
    interimReliefDecision: { create: jest.Mock };
    reviewStayRecord: { create: jest.Mock };
    redressNotice: { upsert: jest.Mock; findUnique: jest.Mock; update: jest.Mock };
  } = {
    redressRouteVersion: { findUnique: jest.fn() },
    governmentDecision: { findUnique: jest.fn() },
    decisionReviewReference: { create: jest.fn(), update: jest.fn() },
    redressMatter: { create: jest.fn(), findUnique: jest.fn(), update: jest.fn() },
    identity: { findUnique: jest.fn() },
    redressReviewRecordSnapshot: { create: jest.fn() },
    redressDecision: { create: jest.fn(), findUnique: jest.fn() },
    redressImplementationPlan: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    redressImplementationAction: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    redressImplementationVerification: { create: jest.fn() },
    interimReliefRequest: { create: jest.fn(), findUnique: jest.fn(), update: jest.fn() },
    interimReliefDecision: { create: jest.fn() },
    reviewStayRecord: { create: jest.fn() },
    redressNotice: { upsert: jest.fn(), findUnique: jest.fn(), update: jest.fn() },
  };

  const authorityEvaluation = {
    evaluate: jest.fn(),
  };

  const actorResolver = {
    isHumanActor: jest.fn((type: IdentityType) => type === IdentityType.INDIVIDUAL),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RedressBoundaryService,
        RedressMatterService,
        RedressDecisionService,
        InterimReliefService,
        RedressImplementationService,
        RedressNoticeService,
        { provide: PrismaService, useValue: prisma },
        { provide: AuthorityEvaluationService, useValue: authorityEvaluation },
        { provide: InstitutionalActorResolver, useValue: actorResolver },
      ],
    }).compile();

    boundary = module.get(RedressBoundaryService);
    matters = module.get(RedressMatterService);
    decisions = module.get(RedressDecisionService);
    interimRelief = module.get(InterimReliefService);
    implementation = module.get(RedressImplementationService);
    notices = module.get(RedressNoticeService);
    jest.clearAllMocks();
  });

  it('defines Phase 10G invariants', () => {
    expect(PHASE_10G_INVARIANTS).toHaveLength(17);
  });

  describe('boundary invariants', () => {
    it('filing != stay unless route explicitly permits automatic stay', () => {
      expect(() => {
        boundary.assertFilingDoesNotAutoStay(false, true);
      }).toThrow(/automatic stay/i);
      expect(() => {
        boundary.assertFilingDoesNotAutoStay(true, true);
      }).not.toThrow();
    });

    it('stay != reversal', () => {
      expect(() => {
        boundary.assertStayIsNotReversal(true);
      }).toThrow(/not a reversal/i);
    });

    it('rejects AI final decisions', () => {
      expect(() => {
        boundary.assertHumanReviewer('AI_ASSISTANCE');
      }).toThrow(/human officeholders/i);
    });

    it('rejects technical admin creating RedressDecision', () => {
      expect(() => {
        boundary.assertTechnicalAdminCannotCreateDecision(TECHNICAL_ADMIN_ROLE_MARKER);
      }).toThrow(/Technical administrators cannot create RedressDecision/i);
    });

    it('rejects arbitrary remedy types', () => {
      expect(() => {
        boundary.assertRemedyPermittedForRoute(RedressRemedyType.REFUND_IF_AUTHORIZED, [
          'CORRECT_RECORD',
        ]);
      }).toThrow(/not permitted/i);
    });

    it('rejects outcomes not permitted by route', () => {
      expect(() => {
        boundary.assertOutcomePermittedForRoute(RedressDecisionOutcome.REVERSED, ['AFFIRMED']);
      }).toThrow(/not permitted/i);
    });

    it('rejects original reviewer self-review when independence required', () => {
      expect(() => {
        boundary.assertIndependenceRequired(true, 'officeholder-1', 'officeholder-1');
      }).toThrow(/cannot self-review/i);
    });

    it('filters further review rights to configured routes only', () => {
      const rights = boundary.assertFurtherReviewRightsFromConfiguration(
        ['STATUTORY_APPEAL'],
        ['STATUTORY_APPEAL', 'INVENTED_ROUTE'],
      );
      expect(rights).toEqual(['STATUTORY_APPEAL']);
    });

    it('requires Phase 8 lifecycle service for instrument remedies', () => {
      expect(() => {
        boundary.assertInstrumentRemedyUsesLifecycleService(RedressRemedyType.AMEND_INSTRUMENT);
      }).toThrow(/Phase 8 lifecycle services/i);
    });
  });

  describe('matter filing', () => {
    it('does not create automatic stay on filing by default', async () => {
      prisma.redressRouteVersion.findUnique.mockResolvedValue({
        id: 'route-1',
        status: RedressRouteVersionStatus.ACTIVE,
        automaticStayOnFiling: false,
      });
      prisma.governmentDecision.findUnique.mockResolvedValue({
        id: 'decision-1',
        caseId: 'case-1',
        masterAdministrativeFileId: 'maf-1',
        decisionMakerOfficeholderId: 'oh-1',
        decisionStatus: 'RECORDED',
      });
      prisma.decisionReviewReference.create.mockResolvedValue({
        id: 'review-1',
        stayStatus: ReviewStayStatus.NONE,
      });
      prisma.redressMatter.create.mockResolvedValue({ id: 'matter-1' });
      prisma.redressMatter.findUnique.mockResolvedValue({
        id: 'matter-1',
        decisionReviewReference: { stayStatus: ReviewStayStatus.NONE },
      });

      await matters.fileMatter({
        routeVersionId: 'route-1',
        challengedDecisionId: 'decision-1',
        reviewRoute: 'INTERNAL_REVIEW',
        reviewAuthority: 'Dept Head',
      });

      const createCalls = prisma.decisionReviewReference.create.mock.calls as [
        { data: { stayStatus: ReviewStayStatus } },
      ][];
      const createCall = createCalls[0]?.[0];
      if (!createCall) throw new Error('expected review reference create call');
      expect(createCall.data.stayStatus).toBe(ReviewStayStatus.NONE);
      expect(prisma.decisionReviewReference.update).not.toHaveBeenCalled();
    });
  });

  describe('redress decision', () => {
    const baseMatter = {
      id: 'matter-1',
      challengedDecisionId: 'decision-1',
      originalDecisionMakerOfficeholderId: 'oh-original',
      routeVersion: {
        id: 'route-1',
        functionAuthorityRecordId: 'far-1',
        permissibleOutcomes: ['REVERSED', 'AFFIRMED'],
        permissibleRemedies: ['CORRECT_RECORD'],
        requiresReasonedDetermination: true,
        requiresIndependenceFromOriginalReviewer: true,
      },
      challengedDecision: {
        id: 'decision-1',
        decisionStatus: 'RECORDED',
      },
    };

    it('requires fresh authority evaluation and human reviewer', async () => {
      prisma.redressMatter.findUnique.mockResolvedValue(baseMatter);
      prisma.identity.findUnique.mockResolvedValue({
        id: 'identity-1',
        type: IdentityType.INDIVIDUAL,
      });
      authorityEvaluation.evaluate.mockResolvedValue({
        outcome: AuthorityEvaluationOutcome.ALLOW,
        evaluationId: 'eval-1',
      });
      prisma.redressReviewRecordSnapshot.create.mockResolvedValue({ id: 'snapshot-1' });
      prisma.redressDecision.create.mockResolvedValue({ id: 'rd-1' });
      prisma.redressMatter.update.mockResolvedValue({});
      prisma.redressImplementationPlan.create.mockResolvedValue({});

      await decisions.recordDecision({
        redressMatterId: 'matter-1',
        reviewerIdentityId: 'identity-1',
        reviewerOfficeholderId: 'oh-reviewer',
        actorType: IdentityType.INDIVIDUAL,
        outcome: RedressDecisionOutcome.REVERSED,
        decidedAt: new Date(),
        findings: [],
        reasons: [{ sectionType: RedressReasonSectionType.REASONS, content: 'Reasoned outcome' }],
        remedies: [
          {
            remedyType: RedressRemedyType.CORRECT_RECORD,
            description: 'Correct the administrative record',
          },
        ],
      });

      expect(authorityEvaluation.evaluate).toHaveBeenCalled();
    });

    it('rejects AI deciding', async () => {
      await expect(
        decisions.recordDecision({
          redressMatterId: 'matter-1',
          reviewerIdentityId: 'ai-1',
          reviewerOfficeholderId: 'oh-1',
          actorType: IdentityType.SERVICE,
          outcome: RedressDecisionOutcome.AFFIRMED,
          decidedAt: new Date(),
          findings: [],
          reasons: [],
          remedies: [],
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('preserves original decision reference on reversal', async () => {
      prisma.redressMatter.findUnique.mockResolvedValue(baseMatter);
      prisma.identity.findUnique.mockResolvedValue({
        id: 'identity-1',
        type: IdentityType.INDIVIDUAL,
      });
      authorityEvaluation.evaluate.mockResolvedValue({
        outcome: AuthorityEvaluationOutcome.ALLOW,
        evaluationId: 'eval-1',
      });
      prisma.redressReviewRecordSnapshot.create.mockResolvedValue({ id: 'snapshot-1' });
      prisma.redressDecision.create.mockImplementation(
        ({ data }: { data: Record<string, unknown> }) => Promise.resolve(data),
      );
      prisma.redressMatter.update.mockResolvedValue({});
      prisma.redressImplementationPlan.create.mockResolvedValue({});

      await decisions.recordDecision({
        redressMatterId: 'matter-1',
        reviewerIdentityId: 'identity-1',
        reviewerOfficeholderId: 'oh-reviewer',
        actorType: IdentityType.INDIVIDUAL,
        outcome: RedressDecisionOutcome.REVERSED,
        decidedAt: new Date(),
        findings: [],
        reasons: [{ sectionType: RedressReasonSectionType.REASONS, content: 'Reversed on error' }],
        remedies: [
          {
            remedyType: RedressRemedyType.CORRECT_RECORD,
            description: 'Correct record',
          },
        ],
      });

      const reversalCalls = prisma.redressDecision.create.mock.calls as [
        { data: { supersededDecisionId: string; originalDecisionStatusPreserved: string } },
      ][];
      const reversalCall = reversalCalls[0]?.[0];
      if (!reversalCall) throw new Error('expected redress decision create call');
      expect(reversalCall.data.supersededDecisionId).toBe('decision-1');
      expect(reversalCall.data.originalDecisionStatusPreserved).toBe('RECORDED');
    });

    it('preserves remand history fields', async () => {
      const remandMatter = {
        ...baseMatter,
        routeVersion: {
          ...baseMatter.routeVersion,
          permissibleOutcomes: ['RETURNED_OR_REMANDED'],
          permissibleRemedies: ['RECONSIDER'],
        },
      };
      prisma.redressMatter.findUnique.mockResolvedValue(remandMatter);
      prisma.identity.findUnique.mockResolvedValue({
        id: 'identity-1',
        type: IdentityType.INDIVIDUAL,
      });
      authorityEvaluation.evaluate.mockResolvedValue({
        outcome: AuthorityEvaluationOutcome.ALLOW,
        evaluationId: 'eval-1',
      });
      prisma.redressReviewRecordSnapshot.create.mockResolvedValue({ id: 'snapshot-1' });
      prisma.redressDecision.create.mockImplementation(
        ({ data }: { data: Record<string, unknown> }) => Promise.resolve(data),
      );
      prisma.redressMatter.update.mockResolvedValue({});
      prisma.redressImplementationPlan.create.mockResolvedValue({});

      await decisions.recordDecision({
        redressMatterId: 'matter-1',
        reviewerIdentityId: 'identity-1',
        reviewerOfficeholderId: 'oh-reviewer',
        actorType: IdentityType.INDIVIDUAL,
        outcome: RedressDecisionOutcome.RETURNED_OR_REMANDED,
        decidedAt: new Date(),
        findings: [],
        reasons: [{ sectionType: RedressReasonSectionType.REASONS, content: 'Remanded' }],
        remedies: [
          {
            remedyType: RedressRemedyType.RECONSIDER,
            description: 'Reconsider',
          },
        ],
        remand: {
          scope: { limitedTo: 'fees' },
          issues: ['fee calculation'],
          authorityReference: 'delegated-reviewer',
        },
      });

      const remandCalls = prisma.redressDecision.create.mock.calls as [
        { data: { remandIssues: string[]; originalDecisionStatusPreserved: string } },
      ][];
      const remandCall = remandCalls[0]?.[0];
      if (!remandCall) throw new Error('expected remand decision create call');
      expect(remandCall.data.remandIssues).toEqual(['fee calculation']);
      expect(remandCall.data.originalDecisionStatusPreserved).toBe('RECORDED');
    });
  });

  describe('interim relief and stays', () => {
    it('requires explicit decision to authorize stay', async () => {
      prisma.interimReliefRequest.findUnique.mockResolvedValue({
        id: 'request-1',
        requestType: InterimReliefRequestType.STAY,
        groundsSummary: 'Pending review',
        redressMatter: {
          id: 'matter-1',
          challengedDecisionId: 'decision-1',
          challengedInstrumentId: null,
          decisionReviewReferenceId: 'review-1',
          routeVersion: {
            functionAuthorityRecordId: 'far-1',
          },
        },
      });
      prisma.identity.findUnique.mockResolvedValue({
        id: 'identity-1',
        type: IdentityType.INDIVIDUAL,
      });
      authorityEvaluation.evaluate.mockResolvedValue({
        outcome: AuthorityEvaluationOutcome.ALLOW,
        evaluationId: 'eval-1',
      });
      prisma.interimReliefDecision.create.mockResolvedValue({ id: 'decision-1' });
      prisma.interimReliefRequest.update.mockResolvedValue({});
      prisma.reviewStayRecord.create.mockResolvedValue({ id: 'stay-1', isReversal: false });
      prisma.decisionReviewReference.update.mockResolvedValue({});

      const result = await interimRelief.decideInterimRelief({
        interimReliefRequestId: 'request-1',
        outcome: InterimReliefDecisionOutcome.GRANTED,
        reviewerIdentityId: 'identity-1',
        reviewerOfficeholderId: 'oh-1',
        actorType: IdentityType.INDIVIDUAL,
      });

      expect(result.stay).toBeTruthy();
      const stayCalls = prisma.reviewStayRecord.create.mock.calls as [
        { data: { isReversal: boolean } },
      ][];
      const stayCall = stayCalls[0]?.[0];
      if (!stayCall) throw new Error('expected stay record create call');
      expect(stayCall.data.isReversal).toBe(false);
    });
  });

  describe('implementation tracking', () => {
    it('does not show remedy implemented until all actions complete', async () => {
      prisma.redressImplementationPlan.findUnique.mockResolvedValue({
        status: RedressImplementationActionStatus.PENDING,
        actions: [
          { status: RedressImplementationActionStatus.COMPLETED },
          { status: RedressImplementationActionStatus.PENDING },
        ],
      });

      const status = await implementation.getImplementationStatus('decision-1');
      expect(status).not.toBe('COMPLETED');
      expect(await implementation.isRemedyFullyImplemented('decision-1')).toBe(false);
    });

    it('keeps failed implementation visible', async () => {
      prisma.redressImplementationPlan.findUnique.mockResolvedValue({
        status: RedressImplementationActionStatus.FAILED,
        actions: [{ status: RedressImplementationActionStatus.FAILED, errorMessage: 'blocked' }],
      });

      expect(await implementation.getImplementationStatus('decision-1')).toBe('FAILED');
    });

    it('blocks public verification update before implementation completes', async () => {
      prisma.redressImplementationPlan.findUnique.mockResolvedValue({
        status: RedressImplementationActionStatus.PENDING,
        actions: [{ status: RedressImplementationActionStatus.PENDING }],
      });

      await expect(implementation.assertPublicVerificationMayUpdate('decision-1')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('notices', () => {
    it('derives further review rights only from route configuration', async () => {
      prisma.redressDecision.findUnique.mockResolvedValue({
        id: 'decision-1',
        redressMatterId: 'matter-1',
        effectiveAt: new Date(),
        redressMatter: {
          routeVersion: { furtherReviewRights: ['STATUTORY_APPEAL'] },
          reviewStayRecords: [],
        },
      });
      prisma.redressImplementationPlan.findUnique.mockResolvedValue({
        status: RedressImplementationActionStatus.PENDING,
        actions: [],
      });
      prisma.redressNotice.upsert.mockResolvedValue({
        furtherReviewRights: ['STATUTORY_APPEAL'],
      });

      const notice = await notices.prepareNotice({
        redressDecisionId: 'decision-1',
        outcomeSummary: 'Reversed',
        reasonsSummary: 'Error of law',
        remedySummary: 'Correct record',
        requestedFurtherReviewRights: ['STATUTORY_APPEAL', 'INVENTED_ROUTE'],
      });

      expect(notice.furtherReviewRights).toEqual(['STATUTORY_APPEAL']);
    });
  });
});
