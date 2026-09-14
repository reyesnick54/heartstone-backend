import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  AI_EVALUATION_TEST_CATEGORIES,
  AI_HUMAN_DISPOSITION_TYPES,
  AI_RISK_CLASSES,
  PHASE_12D_ENUM_NAMES,
  PHASE_12D_MODEL_NAMES,
} from './intelligence-analytics-schema.constants';

const schema = readFileSync(join(__dirname, '../../prisma/schema.prisma'), 'utf8');

describe('Phase 12D intelligence analytics schema', () => {
  for (const modelName of PHASE_12D_MODEL_NAMES) {
    it(`defines ${modelName} exactly once`, () => {
      const matches = schema.match(new RegExp(`model ${modelName} \\{`, 'g'));
      expect(matches).toHaveLength(1);
    });
  }

  for (const enumName of PHASE_12D_ENUM_NAMES) {
    it(`defines ${enumName} enum`, () => {
      expect(schema).toContain(`enum ${enumName}`);
    });
  }

  it('defaults autonomous final decision to false on AI use cases', () => {
    const block = /model AIUseCase \{[\s\S]*?\n\}/.exec(schema)?.[0];
    expect(block).toBeDefined();
    expect(block).toContain('allowsAutonomousFinalDecision Boolean       @default(false)');
  });

  it('requires evidence gate default on output contracts', () => {
    const block = /model AIOutputContract \{[\s\S]*?\n\}/.exec(schema)?.[0];
    expect(block).toBeDefined();
    expect(block).toContain('evidenceGateRequired   Boolean                @default(true)');
  });

  it('marks prompt policies as treating documents as untrusted content', () => {
    const block = /model AIPromptPolicy \{[\s\S]*?\n\}/.exec(schema)?.[0];
    expect(block).toBeDefined();
    expect(block).toContain('treatsDocumentsAsUntrustedContent Boolean @default(true)');
  });

  it('includes all AI risk classes', () => {
    for (const riskClass of AI_RISK_CLASSES) {
      expect(schema).toContain(riskClass);
    }
  });

  it('includes all human disposition types', () => {
    for (const disposition of AI_HUMAN_DISPOSITION_TYPES) {
      expect(schema).toContain(disposition);
    }
  });

  it('includes all TEVV evaluation test categories', () => {
    for (const category of AI_EVALUATION_TEST_CATEGORIES) {
      expect(schema).toContain(category);
    }
  });
});
