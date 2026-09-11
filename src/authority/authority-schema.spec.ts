import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { FORBIDDEN_IDENTITY_AUTHORITY_FIELDS } from '../identity/identity-schema.constants';
import {
  AUTHORITY_CLASSIFICATIONS,
  AUTHORITY_MODEL_NAMES,
  CONTROLLED_FUNCTION_CLASSES,
  FORBIDDEN_AUTHORITY_BOUNDARY_FIELDS,
  FUNCTION_AUTHORITY_LIFECYCLE_STATES,
} from './authority-schema.constants';

const SCHEMA_PATH = join(__dirname, '../../prisma/schema.prisma');

function readSchema(): string {
  return readFileSync(SCHEMA_PATH, 'utf-8');
}

function extractModelBlock(schema: string, modelName: string): string {
  const pattern = new RegExp(`model ${modelName}\\s*\\{([^}]*)\\}`, 's');
  const match = pattern.exec(schema);
  return match?.[1] ?? '';
}

function extractEnumBlock(schema: string, enumName: string): string {
  const match = new RegExp(`enum ${enumName}\\s*\\{([^}]*)\\}`, 's').exec(schema);
  return match?.[1] ?? '';
}

describe('Authority schema coherence (Phase 4)', () => {
  const schema = readSchema();

  it('defines all eight canonical authority classifications', () => {
    const block = extractEnumBlock(schema, 'AuthorityClassification');
    for (const classification of AUTHORITY_CLASSIFICATIONS) {
      expect(block).toContain(classification);
    }
  });

  it('defines all canonical function authority lifecycle states', () => {
    const block = extractEnumBlock(schema, 'FunctionAuthorityLifecycleStatus');
    for (const state of FUNCTION_AUTHORITY_LIFECYCLE_STATES) {
      expect(block).toContain(state);
    }
  });

  it('defines all canonical controlled function classes', () => {
    const block = extractEnumBlock(schema, 'ControlledFunctionClass');
    for (const functionClass of CONTROLLED_FUNCTION_CLASSES) {
      expect(block).toContain(functionClass);
    }
  });

  it('defines FunctionAuthorityRecord with unique code constraint', () => {
    expect(schema).toMatch(/model FunctionAuthorityRecord\s*\{/);
    expect(schema).toMatch(/code\s+String\s+@unique/);
  });

  it('relates FunctionAuthorityRecord to institution and optional office', () => {
    const block = extractModelBlock(schema, 'FunctionAuthorityRecord');

    expect(block).toContain('institutionId');
    expect(block).toContain('officeId');
    expect(block).toContain('institution');
    expect(block).toContain('office');
  });

  it('keeps FunctionAuthorityRecord distinct from identity and government actor models', () => {
    const block = extractModelBlock(schema, 'FunctionAuthorityRecord');

    expect(block).not.toMatch(/\buserAccountId\b/);
    expect(block).not.toMatch(/\bidentityId\b/);
    expect(block).not.toMatch(/\bofficeholderId\b/);
    expect(block).not.toMatch(/\bpermission\b/);
    expect(block).not.toMatch(/\broleLabel\b/);
  });

  it('does not add authority-evaluation fields to identity primitives', () => {
    const identityPrimitives = [
      'UserAccount',
      'Identity',
      'Credential',
      'OrganizationMembership',
      'AuthenticationMethod',
      'Session',
    ];

    for (const modelName of identityPrimitives) {
      const block = extractModelBlock(schema, modelName);
      for (const forbiddenField of FORBIDDEN_IDENTITY_AUTHORITY_FIELDS) {
        expect(block).not.toContain(forbiddenField);
      }
      for (const forbiddenField of FORBIDDEN_AUTHORITY_BOUNDARY_FIELDS) {
        expect(block).not.toContain(forbiddenField);
      }
    }
  });

  it('does not duplicate authority models outside the authority domain', () => {
    for (const modelName of AUTHORITY_MODEL_NAMES) {
      const matches = schema.match(new RegExp(`model ${modelName}\\s*\\{`, 'g'));
      expect(matches).toHaveLength(1);
    }
  });
});
