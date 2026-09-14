import {
  AIEvaluationTestCategory,
  FORBIDDEN_AI_GOVERNMENT_ACTIONS,
} from './intelligence-analytics.constants';
import {
  AI_EVALUATION_TEST_CATEGORIES,
  AI_HUMAN_DISPOSITION_TYPES,
  AI_RISK_CLASSES,
  PHASE_12D_MODEL_NAMES,
} from './intelligence-analytics-schema.constants';

describe('Phase 12D invariants', () => {
  it('defines all canonical governance models', () => {
    expect(PHASE_12D_MODEL_NAMES).toHaveLength(18);
    expect(PHASE_12D_MODEL_NAMES).toContain('AIExecutionRecord');
    expect(PHASE_12D_MODEL_NAMES).toContain('AIHumanDisposition');
  });

  it('covers all required TEVV categories', () => {
    expect(AI_EVALUATION_TEST_CATEGORIES).toEqual(Object.values(AIEvaluationTestCategory));
  });

  it('includes prohibited risk class', () => {
    expect(AI_RISK_CLASSES).toContain('PROHIBITED');
  });

  it('includes assistive acceptance disposition without decision equivalence', () => {
    expect(AI_HUMAN_DISPOSITION_TYPES).toContain('ACCEPTED_FOR_ASSISTIVE_USE');
    expect(AI_HUMAN_DISPOSITION_TYPES).not.toContain('FINAL_DECISION');
  });

  it('lists all forbidden government actions for AI actors', () => {
    expect(FORBIDDEN_AI_GOVERNMENT_ACTIONS).toEqual(
      expect.arrayContaining([
        'APPROVE',
        'REFUSE',
        'SIGN',
        'ISSUE',
        'HEAR_APPEAL',
        'WAIVE',
        'AUTHORIZE_EXPENDITURE',
        'INITIATE_ENFORCEMENT',
        'ALTER_OFFICIAL_RECORD',
      ]),
    );
  });
});
