import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  AUTHORITATIVE_SOURCE_STATUSES,
  INTEGRATION_ACCEPTANCE_STATES,
  PHASE_11E_ENUM_NAMES,
  PHASE_11E_MODEL_NAMES,
  TECHNOLOGY_DEPENDENCY_CATEGORIES,
} from './integrations-schema.constants';

const schema = readFileSync(join(__dirname, '../../prisma/schema.prisma'), 'utf8');

describe('Phase 11E integrations schema', () => {
  for (const modelName of PHASE_11E_MODEL_NAMES) {
    it(`defines ${modelName} exactly once`, () => {
      const matches = schema.match(new RegExp(`model ${modelName} \\{`, 'g'));
      expect(matches).toHaveLength(1);
    });
  }

  for (const enumName of PHASE_11E_ENUM_NAMES) {
    it(`defines ${enumName} enum`, () => {
      expect(schema).toContain(`enum ${enumName}`);
    });
  }

  it('defaults authoritative source designation to UNVERIFIED not AUTHORITATIVE', () => {
    const designationBlock = (/model AuthoritativeSourceDesignation \{[\s\S]*?\n\}/.exec(schema))?.[0];
    expect(designationBlock).toBeDefined();
    expect(designationBlock).toContain('sourceStatus                  AuthoritativeSourceStatus      @default(UNVERIFIED)');
  });

  it('defaults field authority mapping to UNVERIFIED not AUTHORITATIVE', () => {
    const mappingBlock = (/model FieldAuthorityMapping \{[\s\S]*?\n\}/.exec(schema))?.[0];
    expect(mappingBlock).toBeDefined();
    expect(mappingBlock).toContain('sourceStatus                     AuthoritativeSourceStatus      @default(UNVERIFIED)');
  });

  it('includes all dependency categories', () => {
    for (const category of TECHNOLOGY_DEPENDENCY_CATEGORIES) {
      expect(schema).toContain(category);
    }
  });

  it('includes all authoritative source statuses', () => {
    for (const status of AUTHORITATIVE_SOURCE_STATUSES) {
      expect(schema).toContain(status);
    }
  });

  it('includes all integration acceptance states', () => {
    for (const state of INTEGRATION_ACCEPTANCE_STATES) {
      expect(schema).toContain(state);
    }
  });
});
