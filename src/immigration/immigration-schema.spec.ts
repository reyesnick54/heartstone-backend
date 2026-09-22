import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  IMMIGRATION_FOUNDATION_ENUM_NAMES,
  IMMIGRATION_FOUNDATION_MODEL_NAMES,
} from './immigration-schema.constants';

const schemaPath = join(__dirname, '../../prisma/schema.prisma');
const schema = readFileSync(schemaPath, 'utf8');

describe('Immigration foundation schema', () => {
  for (const modelName of IMMIGRATION_FOUNDATION_MODEL_NAMES) {
    it(`defines ${modelName} exactly once`, () => {
      const matches = schema.match(new RegExp(`model ${modelName} \\{`, 'g'));
      expect(matches).toHaveLength(1);
    });
  }

  for (const enumName of IMMIGRATION_FOUNDATION_ENUM_NAMES) {
    it(`defines ${enumName}`, () => {
      expect(schema).toContain(`enum ${enumName}`);
    });
  }

  it('links visa applications to Case and Application without duplicating them', () => {
    expect(schema.match(/model Case \{/g)).toHaveLength(1);
    expect(schema.match(/model Application \{/g)).toHaveLength(1);
    const block = /model VisaApplicationProfile \{[\s\S]*?\n\}/m.exec(schema)?.[0] ?? '';
    expect(block).toContain('caseId');
    expect(block).toContain('applicationId');
    expect(block).toContain('doesNotIssueVisa');
  });

  it('stores immigration status history separately from status records', () => {
    expect(schema).toContain('model ImmigrationStatusHistory');
    expect(schema).toContain('model ImmigrationStatusRecord');
    expect(schema).toContain('supersededAt');
  });

  it('represents external checks as authenticated dependencies', () => {
    const block = /model ImmigrationExternalCheck \{[\s\S]*?\n\}/m.exec(schema)?.[0] ?? '';
    expect(block).toContain('externalAuthorityId');
    expect(block).toContain('isAuthenticated');
    expect(block).toContain('blocksDecisionWhenRequired');
  });
});
