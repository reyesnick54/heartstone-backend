import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  METRIC_CATEGORIES,
  METRIC_DEPENDENCY_TIME_CLASSIFICATIONS,
  PERFORMANCE_ATTRIBUTION_CLASSIFICATIONS,
  PERFORMANCE_CLAIM_STATUSES,
  PHASE_12A_MEASUREMENT_ENUM_NAMES,
  PHASE_12A_MEASUREMENT_MODEL_NAMES,
} from './intelligence-schema.constants';

const schema = readFileSync(join(__dirname, '../../prisma/schema.prisma'), 'utf8');

describe('Phase 12A measurement schema', () => {
  for (const modelName of PHASE_12A_MEASUREMENT_MODEL_NAMES) {
    it(`defines ${modelName} exactly once`, () => {
      const matches = schema.match(new RegExp(`model ${modelName} \\{`, 'g'));
      expect(matches).toHaveLength(1);
    });
  }

  for (const enumName of PHASE_12A_MEASUREMENT_ENUM_NAMES) {
    it(`defines ${enumName}`, () => {
      expect(schema).toContain(`enum ${enumName}`);
    });
  }

  for (const category of METRIC_CATEGORIES) {
    it(`supports metric category ${category}`, () => {
      expect(schema).toContain(category);
    });
  }

  for (const classification of METRIC_DEPENDENCY_TIME_CLASSIFICATIONS) {
    it(`supports dependency time classification ${classification}`, () => {
      expect(schema).toContain(classification);
    });
  }

  for (const status of PERFORMANCE_CLAIM_STATUSES) {
    it(`supports performance claim status ${status}`, () => {
      expect(schema).toContain(status);
    });
  }

  for (const attribution of PERFORMANCE_ATTRIBUTION_CLASSIFICATIONS) {
    it(`supports attribution classification ${attribution}`, () => {
      expect(schema).toContain(attribution);
    });
  }

  it('defaults measured performance claim attribution to NOT_ESTABLISHED', () => {
    const block = /model MeasuredPerformanceClaim \{[\s\S]*?\n\}/m.exec(schema)?.[0] ?? '';
    expect(block).toContain(
      'attributionClassification  PerformanceAttributionClassification @default(NOT_ESTABLISHED)',
    );
  });

  it('links measured performance claims to evidence packets', () => {
    expect(schema).toContain('model MeasuredPerformanceClaimEvidenceLink');
    const linkBlock =
      /model MeasuredPerformanceClaimEvidenceLink \{[\s\S]*?\n\}/m.exec(schema)?.[0] ?? '';
    expect(linkBlock).toContain('evidencePacketId');
  });

  it('preserves calculation run integrity hash', () => {
    const block = /model MetricCalculationRun \{[\s\S]*?\n\}/m.exec(schema)?.[0] ?? '';
    expect(block).toContain('integrityHash');
    expect(block).toContain('softwareVersion');
  });

  it('supports BASELINE_UNAVAILABLE quality status', () => {
    expect(schema).toContain('BASELINE_UNAVAILABLE');
  });
});
