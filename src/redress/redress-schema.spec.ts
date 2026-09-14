import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import {
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
