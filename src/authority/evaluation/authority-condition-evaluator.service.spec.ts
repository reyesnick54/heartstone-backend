import { Test, type TestingModule } from '@nestjs/testing';
import { AuthorityConditionStatus } from '@prisma/client';

import { AuthorityEvaluationOutcome } from '../domain/authority-evaluation-outcome.enum';
import { ConflictStatus, RecusalStatus } from '../domain/conflict-recusal-status.enum';
import { EvidenceRequirementStatus } from '../domain/evidence-requirement-status.enum';
import { GovernmentActionType } from '../domain/government-action.enum';
import { QualificationVerificationStatus } from '../domain/qualification-verification-status.enum';
import { SegregationOfDutiesRuleCode } from '../segregation/segregation-of-duties.rules';
import { SegregationOfDutiesService } from '../segregation/segregation-of-duties.service';
import {
  activationCondition,
  conflictCheckCondition,
  createTestCondition,
  createTestContext,
  evidenceCondition,
  jurisdictionLimitCondition,
  qualificationCondition,
  recusalCheckCondition,
  secondApprovalCondition,
  sodCondition,
  transactionLimitCondition,
} from '../testing/authority-evaluation-test.helpers';
import { AuthorityConditionEvaluationService } from './authority-condition-evaluation.service';
import { AuthorityConditionEvaluatorService } from './authority-condition-evaluator.service';

describe('AuthorityConditionEvaluatorService', () => {
  let evaluator: AuthorityConditionEvaluatorService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthorityConditionEvaluatorService,
        AuthorityConditionEvaluationService,
        SegregationOfDutiesService,
      ],
    }).compile();

    evaluator = module.get(AuthorityConditionEvaluatorService);
  });

  it('allows progression when all active conditions are satisfied', () => {
    const conditions = [
      evidenceCondition('EVID-001', EvidenceRequirementStatus.VERIFIED),
      qualificationCondition('PROF-001'),
      activationCondition(),
    ];
    const context = createTestContext({
      evidenceStatuses: [
        { evidenceId: 'EVID-001', status: EvidenceRequirementStatus.VERIFIED },
      ],
      qualificationStatuses: [
        { qualificationCode: 'PROF-001', status: QualificationVerificationStatus.VERIFIED },
      ],
      activationStatus: 'ACTIVE',
    });

    const result = evaluator.evaluateConditions(conditions, context);

    expect(result.allowed).toBe(true);
    expect(result.outcome).toBe(AuthorityEvaluationOutcome.ALLOW);
    expect(result.conditionDetails.every((d) => d.satisfied)).toBe(true);
    expect(result.reasons).toHaveLength(0);
  });

  it('blocks when any mandatory condition fails', () => {
    const conditions = [
      evidenceCondition('EVID-001', EvidenceRequirementStatus.VERIFIED),
      qualificationCondition('PROF-001'),
    ];
    const context = createTestContext({
      evidenceStatuses: [
        { evidenceId: 'EVID-001', status: EvidenceRequirementStatus.VERIFIED },
      ],
      qualificationStatuses: [],
    });

    const result = evaluator.evaluateConditions(conditions, context);

    expect(result.allowed).toBe(false);
    expect(result.outcome).toBe(AuthorityEvaluationOutcome.BLOCKED);
    expect(result.reasons.length).toBeGreaterThan(0);
  });

  it('does not label blocked authorization as applicant refusal — uses BLOCKED outcome', () => {
    const conditions = [evidenceCondition('EVID-001', EvidenceRequirementStatus.VERIFIED)];
    const context = createTestContext({ evidenceStatuses: [] });

    const result = evaluator.evaluateConditions(conditions, context);

    expect(result.outcome).toBe(AuthorityEvaluationOutcome.BLOCKED);
    expect(result.outcome).not.toBe('REFUSED');
    expect(result.outcome).not.toBe('DENIED');
  });

  it('evaluates conflict, recusal, transaction, jurisdiction, SoD, and second approval together', () => {
    const conditions = [
      conflictCheckCondition(),
      recusalCheckCondition(),
      transactionLimitCondition(5000),
      jurisdictionLimitCondition(['jurisdiction-authorized']),
      sodCondition(SegregationOfDutiesRuleCode.REVIEWER_VS_FINAL_DECISION_MAKER),
      secondApprovalCondition(1),
    ];
    const context = createTestContext({
      requestedAction: GovernmentActionType.DECIDE,
      conflictStatus: ConflictStatus.NONE,
      recusalStatus: RecusalStatus.NONE,
      transactionAmount: 3000,
      jurisdictionId: 'jurisdiction-authorized',
      priorActions: [],
      secondApprovalIdentityIds: ['independent-approver'],
    });

    const result = evaluator.evaluateConditions(conditions, context);

    expect(result.allowed).toBe(true);
    expect(result.outcome).toBe(AuthorityEvaluationOutcome.ALLOW);
  });

  it('fails closed when conflict is active', () => {
    const conditions = [conflictCheckCondition()];
    const context = createTestContext({
      conflictStatus: ConflictStatus.ACTIVE_DISQUALIFYING,
    });

    const result = evaluator.evaluateConditions(conditions, context);

    expect(result.allowed).toBe(false);
    expect(result.outcome).toBe(AuthorityEvaluationOutcome.BLOCKED);
  });

  it('fails closed when actor is recused', () => {
    const conditions = [recusalCheckCondition()];
    const context = createTestContext({
      recusalStatus: RecusalStatus.FORMALLY_RECUSED,
    });

    const result = evaluator.evaluateConditions(conditions, context);

    expect(result.allowed).toBe(false);
    expect(result.outcome).toBe(AuthorityEvaluationOutcome.BLOCKED);
  });

  it('filters conditions by required action', () => {
    const conditions = [
      createTestCondition({
        id: 'cond-decide',
        conditionType: 'REQUIRED_EVIDENCE' as const,
        configuration: { evidenceId: 'EVID-001', requiredStatus: 'VERIFIED' },
        requiredAction: 'DECIDE' as const,
      }),
      createTestCondition({
        id: 'cond-issue',
        conditionType: 'REQUIRED_EVIDENCE' as const,
        configuration: { evidenceId: 'EVID-002', requiredStatus: 'VERIFIED' },
        requiredAction: 'ISSUE' as const,
      }),
    ];
    const context = createTestContext({
      requestedAction: GovernmentActionType.DECIDE,
    });

    const applicable = evaluator.filterApplicableConditions(conditions, context);

    expect(applicable).toHaveLength(1);
    expect(applicable[0]?.id).toBe('cond-decide');
  });

  it('ignores inactive conditions', () => {
    const conditions = [
      evidenceCondition('EVID-001', EvidenceRequirementStatus.VERIFIED, {
        status: AuthorityConditionStatus.SUSPENDED,
      }),
    ];
    const context = createTestContext({ evidenceStatuses: [] });

    const result = evaluator.evaluateConditions(conditions, context);

    expect(result.allowed).toBe(true);
    expect(result.outcome).toBe(AuthorityEvaluationOutcome.ALLOW);
  });

  it('ignores conditions outside effective period', () => {
    const conditions = [
      evidenceCondition('EVID-001', EvidenceRequirementStatus.VERIFIED, {
        effectiveUntil: new Date('2026-01-01T00:00:00.000Z'),
      }),
    ];
    const context = createTestContext({
      evaluatedAt: new Date('2026-06-01T12:00:00.000Z'),
      evidenceStatuses: [],
    });

    const result = evaluator.evaluateConditions(conditions, context);

    expect(result.allowed).toBe(true);
  });

  it('resolves worst outcome when multiple conditions fail', () => {
    const conditions = [
      evidenceCondition('EVID-001', EvidenceRequirementStatus.VERIFIED, {
        failureBehavior: 'REQUIRE_REVIEW' as const,
      }),
      conflictCheckCondition({
        failureBehavior: 'SAFE_HALT' as const,
      }),
    ];
    const context = createTestContext({
      evidenceStatuses: [],
      conflictStatus: ConflictStatus.ACTIVE_DISQUALIFYING,
    });

    const result = evaluator.evaluateConditions(conditions, context);

    expect(result.allowed).toBe(false);
    expect(result.outcome).toBe(AuthorityEvaluationOutcome.SAFE_HALT);
  });
});
