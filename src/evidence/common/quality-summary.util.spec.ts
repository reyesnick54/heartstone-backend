import { EvidenceQualityLevel } from '@prisma/client';

import { buildQualitySummary } from './quality-summary.util';

describe('quality-summary.util', () => {
  it('does not generate a false aggregate score', () => {
    const summary = buildQualitySummary([
      {
        qualityLevel: EvidenceQualityLevel.ADEQUATE,
        limitations: null,
        missingElements: [],
      },
      {
        qualityLevel: EvidenceQualityLevel.INSUFFICIENT,
        limitations: 'Missing geotechnical report',
        missingElements: ['geotechnical-report'],
      },
    ]);

    expect(summary).not.toHaveProperty('aggregateScore');
    expect(summary.hasInsufficient).toBe(true);
    expect(summary.criticalMissingElements).toContain('geotechnical-report');
    expect(summary.disclaimer).toContain('does not prove evidence authenticity');
  });
});
