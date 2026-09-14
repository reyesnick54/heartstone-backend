import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  PHASE_9G_MODEL_NAMES,
  PHASE_9G_STATUS_VALUES,
} from './oversight/compliance-status.constants';

const schemaPath = join(__dirname, '../../prisma/schema.prisma');
const schema = readFileSync(schemaPath, 'utf8');

describe('Phase 9G compliance schema', () => {
  for (const modelName of PHASE_9G_MODEL_NAMES) {
    it(`defines ${modelName} exactly once`, () => {
      const matches = schema.match(new RegExp(`model ${modelName} \\{`, 'g'));
      expect(matches).toHaveLength(1);
    });
  }

  for (const status of PHASE_9G_STATUS_VALUES) {
    it(`supports compliance projection status ${status}`, () => {
      expect(schema).toContain(status);
    });
  }

  it('links projections to underlying assessment and evidence cutoff', () => {
    expect(schema).toContain('underlyingAssessmentId');
    expect(schema).toContain('evidenceCutoffAt');
    expect(schema).toContain('openFindingRefs');
    expect(schema).toContain('openCorrectiveActionRefs');
  });

  it('requires drill-down references on indicators', () => {
    expect(schema).toContain('drillDownReferences');
  });

  it('stores structured monitoring rule config without executable expressions', () => {
    expect(schema).toContain('structuredConfig');
    expect(schema).not.toContain('executableExpression');
  });

  it('marks alerts as non-violation and non-enforcement by default', () => {
    expect(schema).toContain('isViolation');
    expect(schema).toContain('isEnforcementDecision');
    expect(schema).toContain('@default(false)');
  });

  it('records revalidation without renewing instruments', () => {
    expect(schema).toContain('doesNotRenewInstrument');
    expect(schema).toContain('@default(true)');
  });
});
