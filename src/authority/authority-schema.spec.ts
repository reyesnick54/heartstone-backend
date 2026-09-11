import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { FORBIDDEN_IDENTITY_AUTHORITY_FIELDS } from '../identity/identity-schema.constants';
import {
  AUTHORITY_CLASSIFICATIONS,
  AUTHORITY_LIFECYCLE_STATES,
  AUTHORITY_MODEL_NAMES,
  CONTROLLED_FUNCTION_CLASSES,
  FORBIDDEN_AUTHORITY_BOUNDARY_FIELDS,
  NON_AUTHORITY_MODEL_NAMES,
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

describe('Authority schema coherence (Phase 4A)', () => {
  const schema = readSchema();

  it('defines all eight canonical authority classifications', () => {
    const block = extractEnumBlock(schema, 'AuthorityClassification');
    for (const classification of AUTHORITY_CLASSIFICATIONS) {
      expect(block).toContain(classification);
    }
  });

  it('defines all canonical authority lifecycle states', () => {
    const block = extractEnumBlock(schema, 'AuthorityLifecycleState');
    for (const state of AUTHORITY_LIFECYCLE_STATES) {
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

  it('relates FunctionAuthorityRecord to institution and optional department', () => {
    const block = extractModelBlock(schema, 'FunctionAuthorityRecord');

    expect(block).toContain('institutionId');
    expect(block).toContain('departmentId');
    expect(block).toContain('institution             Institution');
    expect(block).toContain('department              Department?');
  });

  it('keeps FunctionAuthorityRecord distinct from identity and government actor models', () => {
    const block = extractModelBlock(schema, 'FunctionAuthorityRecord');

    for (const modelName of NON_AUTHORITY_MODEL_NAMES) {
      expect(block).not.toContain(modelName);
    }

    expect(block).not.toContain('userAccountId');
    expect(block).not.toContain('officeholderId');
    expect(block).not.toContain('permission');
    expect(block).not.toContain('roleLabel');
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

  it('does not duplicate authority models outside the authority register', () => {
    for (const modelName of AUTHORITY_MODEL_NAMES) {
      const matches = schema.match(new RegExp(`model ${modelName}\\s*\\{`, 'g'));
      expect(matches).toHaveLength(1);
    }
  });
});
