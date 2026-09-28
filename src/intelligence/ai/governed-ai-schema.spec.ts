import { S20_GOVERNED_AI_MODEL_NAMES } from './governed-ai.constants';

describe('S20 governed AI schema constants', () => {
  it('lists canonical governed-AI Prisma models', () => {
    expect(S20_GOVERNED_AI_MODEL_NAMES).toContain('AiAgentIdentity');
    expect(S20_GOVERNED_AI_MODEL_NAMES).toContain('AiCallRecord');
    expect(S20_GOVERNED_AI_MODEL_NAMES).toContain('AiPolicyDecisionRecord');
    expect(S20_GOVERNED_AI_MODEL_NAMES.length).toBeGreaterThanOrEqual(10);
  });
});
