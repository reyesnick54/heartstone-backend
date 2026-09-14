import { computeAnalysisReplayHash } from './analysis-replay-hash.util';

describe('computeAnalysisReplayHash', () => {
  it('produces stable hashes for identical payloads', () => {
    const payload = { question: 'q', method: 'm', assumptions: [] };
    const first = computeAnalysisReplayHash(payload);
    const second = computeAnalysisReplayHash(payload);
    expect(first).toBe(second);
  });

  it('changes hash when payload changes', () => {
    const first = computeAnalysisReplayHash({ question: 'a' });
    const second = computeAnalysisReplayHash({ question: 'b' });
    expect(first).not.toBe(second);
  });
});
