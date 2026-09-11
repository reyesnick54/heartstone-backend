import { Test, type TestingModule } from '@nestjs/testing';
import { ConditionFailureBehavior } from '@prisma/client';

import { AuthorityEvaluationOutcome } from '../domain/authority-evaluation-outcome.enum';
import { ConflictStatus, RecusalStatus } from '../domain/conflict-recusal-status.enum';
import { EvidenceRequirementStatus } from '../domain/evidence-requirement-status.enum';
import { GovernmentActionType } from '../domain/government-action.enum';
import { QualificationVerificationStatus } from '../domain/qualification-verification-status.enum';
import { SegregationOfDutiesRuleCode } from '../segregation/segregation-of-duties.rules';
import { SegregationOfDutiesService } from '../segregation/segregation-of-duties.service';
import {
  activationCondition,
  concurrenceCondition,
  conflictCheckCondition,
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

describe('AuthorityConditionEvaluationService', () => {
  let service: AuthorityConditionEvaluationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AuthorityConditionEvaluationService, SegregationOfDutiesService],
    }).compile();

    service = module.get(AuthorityConditionEvaluationService);
  });

  describe('REQUIRED_EVIDENCE', () => {
    it('blocks action when mandatory evidence is missing', () => {
      const condition = evidenceCondition('EVID-001', EvidenceRequirementStatus.VERIFIED);
      const context = createTestContext({ evidenceStatuses: [] });

      const result = service.evaluateCondition(condition, context);

      expect(result.satisfied).toBe(false);
      expect(result.outcome).toBe(AuthorityEvaluationOutcome.BLOCKED);
      expect(result.reason).toContain('missing');
    });

    it('fails when evidence is present but not verified where verification is required', () => {
      const condition = evidenceCondition('EVID-001', EvidenceRequirementStatus.VERIFIED);
      const context = createTestContext({
        evidenceStatuses: [
          { evidenceId: 'EVID-001', status: EvidenceRequirementStatus.PRESENT },
        ],
      });

      const result = service.evaluateCondition(condition, context);

      expect(result.satisfied).toBe(false);
      expect(result.outcome).toBe(AuthorityEvaluationOutcome.BLOCKED);
      expect(result.reason).toContain('PRESENT');
      expect(result.reason).toContain('VERIFIED');
    });

    it('fails when evidence has expired', () => {
      const condition = evidenceCondition('EVID-001', EvidenceRequirementStatus.VERIFIED);
      const context = createTestContext({
        evidenceStatuses: [
          { evidenceId: 'EVID-001', status: EvidenceRequirementStatus.EXPIRED },
        ],
      });

      const result = service.evaluateCondition(condition, context);

      expect(result.satisfied).toBe(false);
      expect(result.reason).toContain('expired');
    });

    it('allows when evidence meets required status', () => {
      const condition = evidenceCondition('EVID-001', EvidenceRequirementStatus.VERIFIED);
      const context = createTestContext({
        evidenceStatuses: [
          { evidenceId: 'EVID-001', status: EvidenceRequirementStatus.VERIFIED },
        ],
      });

      const result = service.evaluateCondition(condition, context);

      expect(result.satisfied).toBe(true);
      expect(result.outcome).toBe(AuthorityEvaluationOutcome.ALLOW);
    });
  });

  describe('REQUIRED_QUALIFICATION', () => {
    it('blocks when required qualification is missing', () => {
      const condition = qualificationCondition('PROF-ENG-001');
      const context = createTestContext({ qualificationStatuses: [] });

      const result = service.evaluateCondition(condition, context);

      expect(result.satisfied).toBe(false);
      expect(result.outcome).toBe(AuthorityEvaluationOutcome.BLOCKED);
    });

    it('allows when qualification is verified', () => {
      const condition = qualificationCondition('PROF-ENG-001');
      const context = createTestContext({
        qualificationStatuses: [
          {
            qualificationCode: 'PROF-ENG-001',
            status: QualificationVerificationStatus.VERIFIED,
          },
        ],
      });

      const result = service.evaluateCondition(condition, context);

      expect(result.satisfied).toBe(true);
      expect(result.outcome).toBe(AuthorityEvaluationOutcome.ALLOW);
    });
  });

  describe('TRANSACTION_LIMIT', () => {
    it('blocks when transaction limit is exceeded', () => {
      const condition = transactionLimitCondition(10000);
      const context = createTestContext({ transactionAmount: 15000 });

      const result = service.evaluateCondition(condition, context);

      expect(result.satisfied).toBe(false);
      expect(result.outcome).toBe(AuthorityEvaluationOutcome.BLOCKED);
      expect(result.reason).toContain('exceeds limit');
    });

    it('allows when transaction is within limit', () => {
      const condition = transactionLimitCondition(10000);
      const context = createTestContext({ transactionAmount: 5000 });

      const result = service.evaluateCondition(condition, context);

      expect(result.satisfied).toBe(true);
    });
  });

  describe('JURISDICTION_LIMIT', () => {
    it('blocks on jurisdiction mismatch', () => {
      const condition = jurisdictionLimitCondition(['jurisdiction-a']);
      const context = createTestContext({ jurisdictionId: 'jurisdiction-b' });

      const result = service.evaluateCondition(condition, context);

      expect(result.satisfied).toBe(false);
      expect(result.outcome).toBe(AuthorityEvaluationOutcome.BLOCKED);
      expect(result.reason).toContain('not within authorized scope');
    });

    it('allows when jurisdiction matches', () => {
      const condition = jurisdictionLimitCondition(['jurisdiction-a', 'jurisdiction-b']);
      const context = createTestContext({ jurisdictionId: 'jurisdiction-a' });

      const result = service.evaluateCondition(condition, context);

      expect(result.satisfied).toBe(true);
    });
  });

  describe('CONFLICT_CHECK', () => {
    it('blocks when actor has active disqualifying conflict', () => {
      const condition = conflictCheckCondition();
      const context = createTestContext({
        conflictStatus: ConflictStatus.ACTIVE_DISQUALIFYING,
      });

      const result = service.evaluateCondition(condition, context);

      expect(result.satisfied).toBe(false);
      expect(result.outcome).toBe(AuthorityEvaluationOutcome.BLOCKED);
      expect(result.reason).toContain('conflict');
    });
  });

  describe('RECUSAL_CHECK', () => {
    it('blocks when actor is formally recused', () => {
      const condition = recusalCheckCondition();
      const context = createTestContext({
        recusalStatus: RecusalStatus.FORMALLY_RECUSED,
      });

      const result = service.evaluateCondition(condition, context);

      expect(result.satisfied).toBe(false);
      expect(result.outcome).toBe(AuthorityEvaluationOutcome.BLOCKED);
      expect(result.reason).toContain('recused');
    });
  });

  describe('SEGREGATION_OF_DUTIES', () => {
    it('blocks self-approval by workflow administrator', () => {
      const condition = sodCondition(
        SegregationOfDutiesRuleCode.WORKFLOW_ADMINISTRATOR_VS_SELF_APPROVAL,
      );
      const context = createTestContext({
        requestedAction: GovernmentActionType.DECIDE,
        approvedAttributes: [
          { key: 'workflowAdministratorIdentityId', value: 'actor-identity-1' },
          { key: 'subjectIdentityId', value: 'actor-identity-1' },
        ],
      });

      const result = service.evaluateCondition(condition, context);

      expect(result.satisfied).toBe(false);
      expect(result.outcome).toBe(AuthorityEvaluationOutcome.BLOCKED);
    });

    it('blocks reviewer from being final decision-maker', () => {
      const condition = sodCondition(
        SegregationOfDutiesRuleCode.REVIEWER_VS_FINAL_DECISION_MAKER,
      );
      const context = createTestContext({
        requestedAction: GovernmentActionType.DECIDE,
        priorActions: [
          {
            action: GovernmentActionType.REVIEW,
            actorIdentityId: 'actor-identity-1',
            performedAt: new Date('2026-05-01T00:00:00.000Z'),
          },
        ],
      });

      const result = service.evaluateCondition(condition, context);

      expect(result.satisfied).toBe(false);
      expect(result.reason).toContain('Reviewer cannot be the independent final decision-maker');
    });

    it('blocks decision-maker from issuing', () => {
      const condition = sodCondition(
        SegregationOfDutiesRuleCode.DECISION_MAKER_VS_ISSUANCE_ADMINISTRATOR,
      );
      const context = createTestContext({
        requestedAction: GovernmentActionType.ISSUE,
        priorActions: [
          {
            action: GovernmentActionType.DECIDE,
            actorIdentityId: 'actor-identity-1',
            performedAt: new Date('2026-05-01T00:00:00.000Z'),
          },
        ],
      });

      const result = service.evaluateCondition(condition, context);

      expect(result.satisfied).toBe(false);
      expect(result.reason).toContain('Decision-maker cannot issue');
    });
  });

  describe('SECOND_APPROVAL', () => {
    it('blocks when second approval is missing', () => {
      const condition = secondApprovalCondition(1);
      const context = createTestContext({ secondApprovalIdentityIds: [] });

      const result = service.evaluateCondition(condition, context);

      expect(result.satisfied).toBe(false);
      expect(result.outcome).toBe(AuthorityEvaluationOutcome.BLOCKED);
      expect(result.reason).toContain('Second approval missing');
    });

    it('allows when independent second approval is present', () => {
      const condition = secondApprovalCondition(1);
      const context = createTestContext({
        secondApprovalIdentityIds: ['approver-identity-2'],
      });

      const result = service.evaluateCondition(condition, context);

      expect(result.satisfied).toBe(true);
    });
  });

  describe('ACTIVATION_REQUIRED', () => {
    it('blocks when activation is not active', () => {
      const condition = activationCondition();
      const context = createTestContext({ activationStatus: 'PENDING' });

      const result = service.evaluateCondition(condition, context);

      expect(result.satisfied).toBe(false);
      expect(result.outcome).toBe(AuthorityEvaluationOutcome.BLOCKED);
    });

    it('allows when activation is active', () => {
      const condition = activationCondition();
      const context = createTestContext({ activationStatus: 'ACTIVE' });

      const result = service.evaluateCondition(condition, context);

      expect(result.satisfied).toBe(true);
    });
  });

  describe('REQUIRED_CONCURRENCE', () => {
    it('blocks when concurrence is insufficient', () => {
      const condition = concurrenceCondition('BOARD_APPROVAL', 2);
      const context = createTestContext({
        concurrenceStatuses: [
          { concurrenceKey: 'BOARD_APPROVAL', approvalCount: 1, approverIdentityIds: ['a1'] },
        ],
      });

      const result = service.evaluateCondition(condition, context);

      expect(result.satisfied).toBe(false);
      expect(result.outcome).toBe(AuthorityEvaluationOutcome.BLOCKED);
    });
  });

  describe('failure behavior mapping', () => {
    it('maps REQUIRE_REVIEW failure behavior correctly', () => {
      const condition = evidenceCondition('EVID-001', EvidenceRequirementStatus.VERIFIED, {
        failureBehavior: ConditionFailureBehavior.REQUIRE_REVIEW,
      });
      const context = createTestContext({ evidenceStatuses: [] });

      const result = service.evaluateCondition(condition, context);

      expect(result.outcome).toBe(AuthorityEvaluationOutcome.REQUIRES_REVIEW);
    });

    it('maps SAFE_HALT failure behavior correctly', () => {
      const condition = evidenceCondition('EVID-001', EvidenceRequirementStatus.VERIFIED, {
        failureBehavior: ConditionFailureBehavior.SAFE_HALT,
      });
      const context = createTestContext({ evidenceStatuses: [] });

      const result = service.evaluateCondition(condition, context);

      expect(result.outcome).toBe(AuthorityEvaluationOutcome.SAFE_HALT);
    });
  });
});
