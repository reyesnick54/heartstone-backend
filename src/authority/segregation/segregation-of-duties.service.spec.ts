import { Test, type TestingModule } from '@nestjs/testing';

import { GovernmentActionType } from '../domain/government-action.enum';
import { createTestContext } from '../testing/authority-evaluation-test.helpers';
import { SegregationOfDutiesRuleCode } from './segregation-of-duties.rules';
import { SegregationOfDutiesService } from './segregation-of-duties.service';

describe('SegregationOfDutiesService', () => {
  let service: SegregationOfDutiesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SegregationOfDutiesService],
    }).compile();

    service = module.get(SegregationOfDutiesService);
  });

  describe('APPLICANT_VS_VERIFIER', () => {
    it('blocks applicant from verifying', () => {
      const context = createTestContext({
        requestedAction: GovernmentActionType.REVIEW,
        priorActions: [
          {
            action: GovernmentActionType.PREPARE,
            actorIdentityId: 'actor-identity-1',
            performedAt: new Date('2026-05-01T00:00:00.000Z'),
          },
        ],
      });

      const violation = service.evaluateRule(
        SegregationOfDutiesRuleCode.APPLICANT_VS_VERIFIER,
        context,
      );

      expect(violation).not.toBeNull();
      expect(violation?.ruleCode).toBe(SegregationOfDutiesRuleCode.APPLICANT_VS_VERIFIER);
    });

    it('allows independent verifier', () => {
      const context = createTestContext({
        requestedAction: GovernmentActionType.REVIEW,
        priorActions: [
          {
            action: GovernmentActionType.PREPARE,
            actorIdentityId: 'other-identity',
            performedAt: new Date('2026-05-01T00:00:00.000Z'),
          },
        ],
      });

      const violation = service.evaluateRule(
        SegregationOfDutiesRuleCode.APPLICANT_VS_VERIFIER,
        context,
      );

      expect(violation).toBeNull();
    });
  });

  describe('EVIDENCE_VERIFIER_VS_BENEFICIARY', () => {
    it('blocks evidence verifier who is also beneficiary from deciding', () => {
      const context = createTestContext({
        requestedAction: GovernmentActionType.DECIDE,
        priorActions: [
          {
            action: GovernmentActionType.REVIEW,
            actorIdentityId: 'actor-identity-1',
            performedAt: new Date('2026-05-01T00:00:00.000Z'),
          },
        ],
        approvedAttributes: [
          { key: 'beneficiaryIdentityId', value: 'actor-identity-1' },
        ],
      });

      const violation = service.evaluateRule(
        SegregationOfDutiesRuleCode.EVIDENCE_VERIFIER_VS_BENEFICIARY,
        context,
      );

      expect(violation).not.toBeNull();
    });
  });

  describe('ORIGINAL_DECISION_MAKER_VS_APPEAL_REVIEWER', () => {
    it('blocks original decision-maker from reviewing appeal', () => {
      const context = createTestContext({
        requestedAction: GovernmentActionType.REVIEW,
        caseReference: 'CASE-APPEAL-001',
        priorActions: [
          {
            action: GovernmentActionType.DECIDE,
            actorIdentityId: 'actor-identity-1',
            performedAt: new Date('2026-05-01T00:00:00.000Z'),
          },
        ],
      });

      const violation = service.evaluateRule(
        SegregationOfDutiesRuleCode.ORIGINAL_DECISION_MAKER_VS_APPEAL_REVIEWER,
        context,
      );

      expect(violation).not.toBeNull();
    });
  });

  describe('evaluateAllApplicableRules', () => {
    it('returns multiple violations when applicable', () => {
      const context = createTestContext({
        requestedAction: GovernmentActionType.DECIDE,
        priorActions: [
          {
            action: GovernmentActionType.REVIEW,
            actorIdentityId: 'actor-identity-1',
            performedAt: new Date('2026-05-01T00:00:00.000Z'),
          },
        ],
        approvedAttributes: [
          { key: 'workflowAdministratorIdentityId', value: 'actor-identity-1' },
          { key: 'subjectIdentityId', value: 'actor-identity-1' },
        ],
      });

      const violations = service.evaluateAllApplicableRules(context, [
        SegregationOfDutiesRuleCode.REVIEWER_VS_FINAL_DECISION_MAKER,
        SegregationOfDutiesRuleCode.WORKFLOW_ADMINISTRATOR_VS_SELF_APPROVAL,
      ]);

      expect(violations.length).toBe(2);
    });
  });
});
