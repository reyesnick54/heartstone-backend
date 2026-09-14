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
  PHASE_10H_ENUM_NAMES,
  PHASE_10H_MODEL_NAMES,
  REDRESS_FILING_STATUSES,
  REDRESS_MATTER_STATUSES,
} from './redress-schema.constants';

const SCHEMA_PATH = join(__dirname, '../../prisma/schema.prisma');

function readSchema(): string {
  return readFileSync(SCHEMA_PATH, 'utf-8');
}

function extractEnumBlock(schema: string, enumName: string): string {
  const match = new RegExp(`enum ${enumName}\\s*\\{([^}]*)\\}`, 's').exec(schema);
  return match?.[1] ?? '';
}

describe('Redress schema coherence (Phase 10H)', () => {
  const schema = readSchema();

  it('defines all canonical Phase 10H models exactly once', () => {
    for (const modelName of PHASE_10H_MODEL_NAMES) {
      const matches = schema.match(new RegExp(`model ${modelName}\\s*\\{`, 'g'));
      expect(matches).toHaveLength(1);
    }
  });

  it('defines all canonical Phase 10H enums exactly once', () => {
    for (const enumName of PHASE_10H_ENUM_NAMES) {
      const matches = schema.match(new RegExp(`enum ${enumName}\\s*\\{`, 'g'));
      expect(matches).toHaveLength(1);
    }
  });

  it('defines all redress matter lifecycle statuses', () => {
    const block = extractEnumBlock(schema, 'RedressMatterStatus');
    for (const status of REDRESS_MATTER_STATUSES) {
      expect(block).toContain(status);
    }
  });

  it('defines all redress filing statuses', () => {
    const block = extractEnumBlock(schema, 'RedressFilingStatus');
    for (const status of REDRESS_FILING_STATUSES) {
      expect(block).toContain(status);
    }
  });

  it('links RedressMatter to challenged GovernmentDecision without replacing it', () => {
    const block = /model RedressMatter\s*\{([^}]*)\}/s.exec(schema)?.[1] ?? '';
    expect(block).toContain('challengedDecisionId');
    expect(block).toContain('challengedDecision');
    expect(block).toContain('RedressChallengedDecision');
  });

  it('stores reviewer independence assessment separately from review assignment', () => {
    expect(schema).toContain('model ReviewerIndependenceAssessment');
    expect(schema).toContain('model ReviewAssignment');
  });

  it('models external determination authenticity before implementation', () => {
    const block = /model ExternalReviewDetermination\s*\{([^}]*)\}/s.exec(schema)?.[1] ?? '';
    expect(block).toContain('authenticity');
    expect(block).toContain('ExternalDeterminationAuthenticity');
  });

  it('separates interim relief requests from stay records', () => {
    expect(schema).toContain('model InterimReliefRequest');
    expect(schema).toContain('model ReviewStayRecord');
  });
});
