import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  COMPLAINT_CATEGORIES,
  COMPLAINT_FINDING_OUTCOMES,
  COMPLAINT_REMEDY_TYPES,
  COMPLAINT_SAFEGUARD_TYPES,
  PHASE_10C_ENUM_NAMES,
  PHASE_10C_MODEL_NAMES,
  PHASE_10C_SUPPORT_MODEL_NAMES,
} from './redress-schema.constants';

const schemaPath = join(__dirname, '../../prisma/schema.prisma');
const schema = readFileSync(schemaPath, 'utf8');

describe('Phase 10C complaint schema', () => {
  for (const modelName of PHASE_10C_MODEL_NAMES) {
    it(`defines ${modelName} exactly once`, () => {
      const matches = schema.match(new RegExp(`model ${modelName} \\{`, 'g'));
      expect(matches).toHaveLength(1);
    });
  }

  for (const modelName of PHASE_10C_SUPPORT_MODEL_NAMES) {
    it(`defines support model ${modelName} exactly once`, () => {
      const matches = schema.match(new RegExp(`model ${modelName} \\{`, 'g'));
      expect(matches).toHaveLength(1);
    });
  }

  for (const enumName of PHASE_10C_ENUM_NAMES) {
    it(`defines ${enumName}`, () => {
      expect(schema).toContain(`enum ${enumName}`);
    });
  }

  for (const category of COMPLAINT_CATEGORIES) {
    it(`supports complaint category ${category}`, () => {
      expect(schema).toContain(category);
    });
  }

  for (const outcome of COMPLAINT_FINDING_OUTCOMES) {
    it(`supports investigation finding outcome ${outcome}`, () => {
      expect(schema).toContain(outcome);
    });
  }

  for (const remedy of COMPLAINT_REMEDY_TYPES) {
    it(`supports complaint remedy type ${remedy}`, () => {
      expect(schema).toContain(remedy);
    });
  }

  for (const safeguard of COMPLAINT_SAFEGUARD_TYPES) {
    it(`supports complaint safeguard ${safeguard}`, () => {
      expect(schema).toContain(safeguard);
    });
  }

  it('defaults complaint classification isFactualFinding to false', () => {
    const block =
      /model ComplaintClassification \{[\s\S]*?\n\}/m.exec(schema)?.[0] ?? '';
    expect(block).toContain('isFactualFinding        Boolean           @default(false)');
  });

  it('separates complaint finding from substantive appeal outcome', () => {
    const block = /model ComplaintFinding \{[\s\S]*?\n\}/m.exec(schema)?.[0] ?? '';
    expect(block).toContain('isSubstantiveAppealOutcome Boolean');
    expect(block).toContain('@default(false)');
  });

  it('stores retaliation allegations separately from risk score', () => {
    const block =
      /model ComplaintRetaliationAllegation \{[\s\S]*?\n\}/m.exec(schema)?.[0] ?? '';
    expect(block).toContain('preservedSeparately');
    expect(block).toContain('affectsRiskScore');
    expect(block).toContain('@default(false)');
  });

  it('links parallel appeals without auto-close default', () => {
    const block =
      /model ComplaintRelatedMatter \{[\s\S]*?\n\}/m.exec(schema)?.[0] ?? '';
    expect(block).toContain('doesNotAutoClose');
    expect(block).toContain('@default(true)');
  });

  it('preserves evidence and decision history on closure', () => {
    const block = /model ComplaintClosure \{[\s\S]*?\n\}/m.exec(schema)?.[0] ?? '';
    expect(block).toContain('evidencePreserved');
    expect(block).toContain('decisionHistoryPreserved');
  });
});
