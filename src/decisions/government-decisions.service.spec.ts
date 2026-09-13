import { Test, type TestingModule } from '@nestjs/testing';
import {
  AuthorityEvaluationOutcome,
  CaseStatus,
  DecisionAssistanceStatus,
  DecisionConditionType,
  DecisionNoticeStatus,
  GovernmentDecisionOutcome,
  GovernmentDecisionStatus,
} from '@prisma/client';

import { AuthorityEvaluationService } from '../authority/evaluation/authority-evaluation.service';
import { PrismaService } from '../database/prisma.service';
import { DecisionAssistanceService } from './decision-assistance.service';
import { GovernmentDecisionsService } from './government-decisions.service';

describe('GovernmentDecisionsService', () => {
  let service: GovernmentDecisionsService;

  const decisionId = 'decision-1';
  const caseId = 'case-1';
  const serviceVersionId = 'service-version-1';
  const officeholderId = 'officeholder-1';
  const actorId = 'identity-1';
  const functionAuthorityRecordId = 'function-1';

  const baseDecision = {
    id: decisionId,
    decisionNumber: 'DEC-00000001',
    caseId,
    governmentServiceVersionId: serviceVersionId,
    decisionTypeCode: 'PERMIT_DECISION',
    outcome: null,
    status: GovernmentDecisionStatus.DRAFT,
    decisionMakerIdentityId: actorId,
    decisionMakerOfficeholderId: officeholderId,
    functionAuthorityRecordId,
    effectiveFrom: null,
    effectiveUntil: null,
    isFinalAdverse: false,
    finalizedAt: null,
    supersededById: null,
    configurationFingerprint: 'fp-1',
    createdAt: new Date(),
    updatedAt: new Date(),
    findings: [],
    reasons: [],
    conditions: [],
    notices: [],
    assistanceRecords: [],
    case: { id: caseId, status: CaseStatus.DECISION_PENDING },
  };

  const typeDefinition = {
    id: 'type-1',
    governmentServiceVersionId: serviceVersionId,
    decisionTypeCode: 'PERMIT_DECISION',
    label: 'Permit Decision',
    description: null,
    permittedOutcomes: [
      GovernmentDecisionOutcome.APPROVED,
      GovernmentDecisionOutcome.REFUSED,
      GovernmentDecisionOutcome.CONDITIONAL_APPROVAL,
    ],
    requiresFindings: true,
    requiresReasons: true,
    requiresHumanConfirmationForAiDraft: true,
    noticeEffectTiming: 'REQUIRED_AFTER_DECISION',
    supportedNoticeRightCodes: ['INTERNAL_REVIEW'],
    blocksIssuanceOnUnsatisfiedPrecedent: true,
    permitsIssuanceDespiteUnsatisfiedPrecedent: false,
    sortOrder: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const prisma = {
    case: { findUnique: jest.fn() },
    governmentDecision: {
      count: jest.fn(),
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    governmentServiceDecisionTypeDefinition: { findUnique: jest.fn() },
    governmentServiceRedressRoute: { findMany: jest.fn() },
    decisionFinding: { findFirst: jest.fn(), create: jest.fn(), findMany: jest.fn() },
    decisionReason: { findFirst: jest.fn(), create: jest.fn(), findMany: jest.fn() },
    decisionCondition: {
      findFirst: jest.fn(),
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    decisionAssistanceRecord: { findUnique: jest.fn(), findFirst: jest.fn() },
    decisionNotice: {
      count: jest.fn(),
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    decisionNoticeRight: { create: jest.fn() },
    $transaction: jest.fn(),
  };

  const authorityEvaluation = {
    evaluate: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GovernmentDecisionsService,
        DecisionAssistanceService,
        { provide: PrismaService, useValue: prisma },
        { provide: AuthorityEvaluationService, useValue: authorityEvaluation },
      ],
    }).compile();

    service = module.get(GovernmentDecisionsService);
    jest.clearAllMocks();
    prisma.$transaction.mockImplementation(async (fn: (tx: typeof prisma) => Promise<unknown>) =>
      fn(prisma),
    );
    authorityEvaluation.evaluate.mockResolvedValue({ outcome: AuthorityEvaluationOutcome.ALLOW });
    prisma.governmentServiceDecisionTypeDefinition.findUnique.mockResolvedValue(typeDefinition);
    prisma.governmentDecision.findUnique.mockResolvedValue(baseDecision);
    prisma.governmentDecision.count.mockResolvedValue(0);
    prisma.decisionNotice.count.mockResolvedValue(0);
  });

  it('requires reasons before finalization when configured', async () => {
    prisma.decisionReason.findMany.mockResolvedValue([]);

    await expect(
      service.finalizeDecision(
        decisionId,
        actorId,
        officeholderId,
        GovernmentDecisionOutcome.APPROVED,
      ),
    ).rejects.toThrow(/requires institutional reasons/i);
  });

  it('blocks AI-linked reason finalization without accepted assistance', async () => {
    prisma.decisionReason.findMany.mockResolvedValue([
      {
        id: 'reason-1',
        governmentDecisionId: decisionId,
        sequence: 1,
        reasonText: 'Reason text',
        approvedTextHash: 'hash',
        decisionMakerOfficeholderId: officeholderId,
      },
    ]);
    prisma.decisionAssistanceRecord.findFirst.mockResolvedValue({
      id: 'assist-1',
      status: DecisionAssistanceStatus.DRAFT,
    });

    await expect(
      service.finalizeDecision(
        decisionId,
        actorId,
        officeholderId,
        GovernmentDecisionOutcome.APPROVED,
      ),
    ).rejects.toThrow(/human confirmation/i);
  });

  it('blocks issuance when precedent condition remains unsatisfied', async () => {
    prisma.governmentDecision.findUnique.mockResolvedValue({
      ...baseDecision,
      conditions: [
        {
          id: 'cond-1',
          conditionType: DecisionConditionType.PRECEDENT_TO_ISSUANCE,
          status: 'PENDING',
        },
      ],
    });

    await expect(service.assertIssuanceAllowed(decisionId)).rejects.toThrow(/blocks issuance/i);
  });

  it('prevents silent approved condition edits', async () => {
    prisma.decisionCondition.findUnique.mockResolvedValue({
      id: 'cond-1',
      governmentDecisionId: decisionId,
      requiredActionOrRestraint: 'Approved wording',
      approvedTextHash: 'locked-hash',
    });

    await expect(
      service.attemptSilentConditionEdit(decisionId, 'cond-1', 'Changed wording'),
    ).rejects.toThrow(/cannot be silently altered/i);
  });

  it('prepares notice with configured rights only', async () => {
    prisma.governmentDecision.findUnique.mockResolvedValue({
      ...baseDecision,
      status: GovernmentDecisionStatus.REASONS_RECORDED,
      outcome: GovernmentDecisionOutcome.REFUSED,
      reasons: [{ id: 'reason-1', reasonText: 'Failed eligibility criterion 4.2' }],
      conditions: [],
    });
    prisma.governmentServiceRedressRoute.findMany.mockResolvedValue([
      {
        routeCode: 'INTERNAL_REVIEW',
        label: 'Internal Review',
        description: 'Configured route',
        contactReference: 'review@institution.gov',
        sortOrder: 0,
      },
      {
        routeCode: 'UNCONFIGURED_APPEAL',
        label: 'Unconfigured Appeal',
        description: 'Must not appear',
        contactReference: 'x@institution.gov',
        sortOrder: 1,
      },
    ]);
    prisma.decisionNotice.create.mockResolvedValue({
      id: 'notice-1',
      noticeNumber: 'DN-00000001',
      noticeStatus: DecisionNoticeStatus.DRAFT,
    });
    prisma.decisionNotice.findUnique.mockResolvedValue({
      id: 'notice-1',
      rights: [{ routeCode: 'INTERNAL_REVIEW' }],
    });

    const notice = await service.prepareNotice(decisionId, {
      decisionSummary: 'Application refused',
    });

    expect(prisma.decisionNoticeRight.create).toHaveBeenCalledTimes(1);
    expect(prisma.decisionNoticeRight.create).toHaveBeenCalledTimes(1);
    expect(notice).toEqual(
      expect.objectContaining({
        rights: [{ routeCode: 'INTERNAL_REVIEW' }],
      }),
    );
  });

  it('rejects reason attribution to a different officeholder', async () => {
    await expect(
      service.addReason(decisionId, {
        reasonText: 'Institutional rationale',
        decisionMakerOfficeholderId: 'other-officeholder',
      }),
    ).rejects.toThrow(/attributable to the authorized decision-maker/i);
  });

  it('notice finalization remains separate from instrument issuance', async () => {
    prisma.decisionNotice.findUnique.mockResolvedValue({
      id: 'notice-1',
      governmentDecisionId: decisionId,
      noticeStatus: DecisionNoticeStatus.DRAFT,
      effectiveDate: new Date(),
      rights: [],
    });
    prisma.decisionNotice.update.mockResolvedValue({
      id: 'notice-1',
      noticeStatus: DecisionNoticeStatus.FINALIZED,
      rights: [],
    });

    const finalized = await service.finalizeNotice(decisionId, 'notice-1', actorId, officeholderId);
    expect(finalized.noticeStatus).toBe(DecisionNoticeStatus.FINALIZED);
  });
});
