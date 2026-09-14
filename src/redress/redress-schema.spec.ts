import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  INTERIM_RELIEF_REQUEST_TYPES,
  REDRESS_DECISION_OUTCOMES,
  REDRESS_IMPLEMENTATION_STATUSES,
  REDRESS_REASON_SECTION_TYPES,
  REDRESS_REMEDY_TYPES,
} from './redress.constants';
import {
  PHASE_10E_ENUM_NAMES,
  PHASE_10E_MODEL_NAMES,
  PHASE_10G_ENUM_NAMES,
  PHASE_10G_MODEL_NAMES,
} from './redress-schema.constants';

const schemaPath = join(__dirname, '../../prisma/schema.prisma');
const schema = readFileSync(schemaPath, 'utf8');

describe('Phase 10E schema guard', () => {
  for (const modelName of PHASE_10E_MODEL_NAMES) {
    it(`defines model ${modelName}`, () => {
      expect(schema).toContain(`model ${modelName}`);
    });
  }

  for (const enumName of PHASE_10E_ENUM_NAMES) {
    it(`defines enum ${enumName}`, () => {
      expect(schema).toContain(`enum ${enumName}`);
    });
  }
});

describe('Phase 10G redress schema', () => {
  for (const modelName of PHASE_10G_MODEL_NAMES) {
    it(`defines ${modelName} exactly once`, () => {
      const matches = schema.match(new RegExp(`model ${modelName} \\{`, 'g'));
      expect(matches).toHaveLength(1);
    });
  }

  for (const enumName of PHASE_10G_ENUM_NAMES) {
    it(`defines ${enumName}`, () => {
      expect(schema).toContain(`enum ${enumName}`);
    });
  }

  for (const outcome of REDRESS_DECISION_OUTCOMES) {
    it(`supports redress decision outcome ${outcome}`, () => {
      expect(schema).toContain(outcome);
    });
  }

  for (const remedy of REDRESS_REMEDY_TYPES) {
    it(`supports redress remedy type ${remedy}`, () => {
      expect(schema).toContain(remedy);
    });
  }

  for (const reliefType of INTERIM_RELIEF_REQUEST_TYPES) {
    it(`supports interim relief type ${reliefType}`, () => {
      expect(schema).toContain(reliefType);
    });
  }

  for (const status of REDRESS_IMPLEMENTATION_STATUSES) {
    it(`supports implementation status ${status}`, () => {
      expect(schema).toContain(status);
    });
  }

  for (const section of REDRESS_REASON_SECTION_TYPES) {
    it(`supports reason section ${section}`, () => {
      expect(schema).toContain(section);
    });
  }

  it('stores route-restricted outcomes on RedressRouteVersion', () => {
    const block = /model RedressRouteVersion \{[\s\S]*?\n\}/m.exec(schema)?.[0] ?? '';
    expect(block).toContain('permissibleOutcomes');
    expect(block).toContain('automaticStayOnFiling');
    expect(block).toContain('furtherReviewRights');
  });

  it('preserves original decision on reversal without hard delete fields', () => {
    const block = /model RedressDecision \{[\s\S]*?\n\}/m.exec(schema)?.[0] ?? '';
    expect(block).toContain('supersededDecisionId');
    expect(block).toContain('originalDecisionStatusPreserved');
    expect(block).not.toContain('deletedAt');
  });

  it('represents stay separately from reversal', () => {
    const block = /model ReviewStayRecord \{[\s\S]*?\n\}/m.exec(schema)?.[0] ?? '';
    expect(block).toContain('isReversal');
    expect(block).toContain('status');
  });

  it('keeps Phase 10E and Phase 10G review snapshots distinct', () => {
    expect(schema).toContain('model ReviewRecordSnapshot');
    expect(schema).toContain('model RedressReviewRecordSnapshot');
    expect(schema).toContain('@@map("review_record_snapshots")');
    expect(schema).toContain('@@map("redress_review_record_snapshots")');
  });
});
