import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  FORBIDDEN_FORM_BOUNDARY_FIELDS,
  FORM_CONDITIONAL_ACTIONS,
  FORM_FIELD_TYPES,
  FORM_VERSION_STATUSES,
  SERVICE_CATALOG_MODEL_NAMES,
} from './service-catalog-schema.constants';

const SCHEMA_PATH = join(__dirname, '../../prisma/schema.prisma');

function readSchema(): string {
  return readFileSync(SCHEMA_PATH, 'utf-8');
}

function extractModelBlock(schema: string, modelName: string): string {
  const pattern = new RegExp(`model ${modelName}\\s*\\{([^}]*)\\}`, 's');
  const match = schema.match(pattern);
  return match?.[1] ?? '';
}

describe('Service catalog schema coherence', () => {
  const schema = readSchema();

  it('defines all canonical service catalog and forms models', () => {
    for (const modelName of SERVICE_CATALOG_MODEL_NAMES) {
      expect(schema).toMatch(new RegExp(`model ${modelName}\\s*\\{`));
    }
  });

  it('defines all required form field types', () => {
    const enumMatch = /enum FormFieldType\s*\{([^}]*)\}/s.exec(schema);
    const enumBlock = enumMatch?.[1] ?? '';

    for (const fieldType of FORM_FIELD_TYPES) {
      expect(enumBlock).toContain(fieldType);
    }
  });

  it('defines conditional actions for deterministic behavior', () => {
    const enumMatch = /enum FormConditionalAction\s*\{([^}]*)\}/s.exec(schema);
    const enumBlock = enumMatch?.[1] ?? '';

    for (const action of FORM_CONDITIONAL_ACTIONS) {
      expect(enumBlock).toContain(action);
    }
  });

  it('defines form version lifecycle statuses including published immutability states', () => {
    const enumMatch = /enum FormVersionStatus\s*\{([^}]*)\}/s.exec(schema);
    const enumBlock = enumMatch?.[1] ?? '';

    for (const status of FORM_VERSION_STATUSES) {
      expect(enumBlock).toContain(status);
    }
  });

  it('links form definitions to government service versions', () => {
    const formDefinitionBlock = extractModelBlock(schema, 'FormDefinition');
    expect(formDefinitionBlock).toContain('governmentServiceVersionId');
    expect(formDefinitionBlock).toContain('GovernmentServiceVersion');
  });

  it('does not add application or case boundary fields to form models', () => {
    for (const modelName of ['FormDefinition', 'FormVersion', 'FormField']) {
      const block = extractModelBlock(schema, modelName);
      for (const forbiddenField of FORBIDDEN_FORM_BOUNDARY_FIELDS) {
        expect(block).not.toContain(forbiddenField);
      }
    }
  });
});
