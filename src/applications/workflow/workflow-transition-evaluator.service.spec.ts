import { WorkflowTransitionConditionType } from '@prisma/client';

import { WorkflowTransitionEvaluatorService } from './workflow-transition-evaluator.service';

describe('WorkflowTransitionEvaluatorService', () => {
  const evaluator = new WorkflowTransitionEvaluatorService();

  it('evaluates ALWAYS transitions', () => {
    const result = evaluator.evaluateTransitions(
      [
        {
          toStepKey: 'NEXT',
          conditionType: WorkflowTransitionConditionType.ALWAYS,
          conditionRules: {},
          isDefault: false,
        },
      ],
      {
        completedStepKey: 'CURRENT',
        joinBranchesComplete: false,
        isCorrectionReturn: false,
        isEscalation: false,
        runtimeFacts: {},
      },
    );

    expect(result).toEqual(['NEXT']);
  });

  it('evaluates join branch completion', () => {
    const result = evaluator.evaluateTransitions(
      [
        {
          toStepKey: 'JOIN',
          conditionType: WorkflowTransitionConditionType.ALL_JOIN_BRANCHES_COMPLETE,
          conditionRules: {},
          isDefault: true,
        },
      ],
      {
        completedStepKey: 'FORK',
        joinBranchesComplete: true,
        isCorrectionReturn: false,
        isEscalation: false,
        runtimeFacts: {},
      },
    );

    expect(result).toEqual(['JOIN']);
  });

  it('does not match join transition when branches incomplete', () => {
    const result = evaluator.evaluateTransitions(
      [
        {
          toStepKey: 'JOIN',
          conditionType: WorkflowTransitionConditionType.ALL_JOIN_BRANCHES_COMPLETE,
          conditionRules: {},
          isDefault: false,
        },
      ],
      {
        completedStepKey: 'FORK',
        joinBranchesComplete: false,
        isCorrectionReturn: false,
        isEscalation: false,
        runtimeFacts: {},
      },
    );

    expect(result).toEqual([]);
  });

  it('falls back to default transition when no conditions match', () => {
    const result = evaluator.evaluateTransitions(
      [
        {
          toStepKey: 'ESCALATED',
          conditionType: WorkflowTransitionConditionType.ESCALATION,
          conditionRules: {},
          isDefault: false,
        },
        {
          toStepKey: 'DEFAULT_NEXT',
          conditionType: WorkflowTransitionConditionType.ALWAYS,
          conditionRules: {},
          isDefault: true,
        },
      ],
      {
        completedStepKey: 'REVIEW',
        joinBranchesComplete: false,
        isCorrectionReturn: false,
        isEscalation: false,
        runtimeFacts: {},
      },
    );

    expect(result).toEqual(['DEFAULT_NEXT']);
  });
});
