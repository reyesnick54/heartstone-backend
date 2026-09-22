import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { LABOUR_INVARIANTS } from './labour.constants';
import {
  LABOUR_FOUNDATION_ENUM_NAMES,
  LABOUR_FOUNDATION_MODEL_NAMES,
} from './labour-schema.constants';

const schemaPath = join(__dirname, '../../prisma/schema.prisma');
const schema = readFileSync(schemaPath, 'utf8');

describe('Labour schema guard', () => {
  for (const modelName of LABOUR_FOUNDATION_MODEL_NAMES) {
    it(`defines model ${modelName} exactly once`, () => {
      const matches = schema.match(new RegExp(`model ${modelName} \\{`, 'g'));
      expect(matches).toHaveLength(1);
    });
  }

  for (const enumName of LABOUR_FOUNDATION_ENUM_NAMES) {
    it(`defines enum ${enumName}`, () => {
      expect(schema).toContain(`enum ${enumName}`);
    });
  }

  it('keeps employment contract references distinct from work permits', () => {
    expect(schema).toMatch(
      /model EmploymentContractReference[\s\S]*doesNotIssueWorkPermit\s+Boolean\s+@default\(true\)/,
    );
  });

  it('keeps work permit application profiles from issuing permits at link time', () => {
    expect(schema).toMatch(
      /model WorkPermitApplicationProfile[\s\S]*doesNotIssueWorkPermit\s+Boolean\s+@default\(true\)/,
    );
  });

  it('preserves employment relationship history as append-only rows', () => {
    expect(schema).toContain('model EmploymentRelationshipHistory');
  });

  it('coordinates immigration residency without collapsing domains', () => {
    expect(schema).toContain('linkedResidencyPermitRecordId');
    expect(schema).toMatch(
      /model WorkPermitRecord[\s\S]*doesNotCreateResidency\s+Boolean\s+@default\(true\)/,
    );
  });

  it('documents labour invariants in constants', () => {
    expect(LABOUR_INVARIANTS.workPermitNotResidency).toBe(true);
    expect(LABOUR_INVARIANTS.complaintNotViolation).toBe(true);
  });
});
