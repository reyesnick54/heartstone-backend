import { EvidenceQualityRating } from '@prisma/client';

import { buildQualitySummary } from './quality-summary.util';

describe('quality-summary.util', () => {
  it('does not generate a false aggregate score', () => {
    const summary = buildQualitySummary([
      {
        criterion: 'RELEVANCE',
        rating: EvidenceQualityRating.ADEQUATE,
        limitations: null,
        notes: null,
      },
      {
        criterion: 'COMPLETENESS',
        rating: EvidenceQualityRating.INSUFFICIENT,
        limitations: 'Missing geotechnical report',
        notes: null,
      },
    ]);

    expect(summary).not.toHaveProperty('aggregateScore');
    expect(summary.hasInsufficient).toBe(true);
    expect(summary.disclaimer).toContain('does not prove evidence authenticity');
  });
});
