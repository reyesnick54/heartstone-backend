import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  FORBIDDEN_SERVICE_CATALOG_BOUNDARY_FIELDS,
  SERVICE_CATALOG_MODEL_NAMES,
  SERVICE_DEPENDENCY_TYPES,
  SERVICE_FEE_CALCULATION_TYPES,
  SERVICE_OUTPUT_TYPES,
  SERVICE_REDRESS_ROUTE_TYPES,
} from './service-catalog-schema.constants';

const SCHEMA_PATH = join(__dirname, '../../prisma/schema.prisma');

function readSchema(): string {
  return readFileSync(SCHEMA_PATH, 'utf-8');
}

function extractModelBlock(schema: string, modelName: string): string {
  const startToken = `model ${modelName}`;
  const startIndex = schema.indexOf(startToken);
  if (startIndex === -1) {
    return '';
  }

  const braceStart = schema.indexOf('{', startIndex);
  if (braceStart === -1) {
    return '';
  }

  let depth = 0;
  for (let index = braceStart; index < schema.length; index += 1) {
    const char = schema[index];
    if (char === '{') {
      depth += 1;
    } else if (char === '}') {
      depth -= 1;
      if (depth === 0) {
        return schema.slice(braceStart + 1, index);
      }
    }
  }

  return '';
}

function extractEnumBlock(schema: string, enumName: string): string {
  const match = new RegExp(`enum ${enumName}\\s*\\{([^}]*)\\}`, 's').exec(schema);
  return match?.[1] ?? '';
}

describe('Service catalog schema coherence (Phase 5E)', () => {
  const schema = readSchema();

  it('defines all canonical service catalog models', () => {
    for (const modelName of SERVICE_CATALOG_MODEL_NAMES) {
      expect(schema).toMatch(new RegExp(`model ${modelName}\\s*\\{`));
    }
  });

  it('defines all supported fee calculation types', () => {
    const block = extractEnumBlock(schema, 'ServiceFeeCalculationType');
    for (const calculationType of SERVICE_FEE_CALCULATION_TYPES) {
      expect(block).toContain(calculationType);
    }
  });

  it('defines all supported dependency types', () => {
    const block = extractEnumBlock(schema, 'ServiceDependencyType');
    for (const dependencyType of SERVICE_DEPENDENCY_TYPES) {
      expect(block).toContain(dependencyType);
    }
  });

  it('defines all supported output types', () => {
    const block = extractEnumBlock(schema, 'ServiceOutputType');
    for (const outputType of SERVICE_OUTPUT_TYPES) {
      expect(block).toContain(outputType);
    }
  });

  it('defines all supported redress route types', () => {
    const block = extractEnumBlock(schema, 'ServiceRedressRouteType');
    for (const routeType of SERVICE_REDRESS_ROUTE_TYPES) {
      expect(block).toContain(routeType);
    }
  });

  it('requires governing source on fee definitions', () => {
    const block = extractModelBlock(schema, 'ServiceFeeDefinition');
    expect(block).toContain('governingSourceId');
    expect(block).toContain('governingSource');
  });

  it('allows optional reference to Phase 4 authority dependency', () => {
    const block = extractModelBlock(schema, 'ServiceDependencyDefinition');
    expect(block).toContain('authorityDependencyId');
    expect(block).toContain('authorityDependency');
  });

  it('does not include payment state fields in Phase 5 service catalog models', () => {
    for (const modelName of SERVICE_CATALOG_MODEL_NAMES) {
      const block = extractModelBlock(schema, modelName);
      for (const forbiddenField of FORBIDDEN_SERVICE_CATALOG_BOUNDARY_FIELDS) {
        expect(block).not.toMatch(new RegExp(`\\b${forbiddenField}\\b`));
      }
    }
  });

  it('supports historical reconstructability via effective dating on fee definitions', () => {
    const block = extractModelBlock(schema, 'ServiceFeeDefinition');
    expect(block).toContain('effectiveFrom');
    expect(block).toContain('effectiveUntil');
    expect(schema).toMatch(/@@unique\(\[serviceVersionId, feeCode, effectiveFrom\]\)/);
  });

  it('supports historical reconstructability via effective dating on SLA targets', () => {
    const block = extractModelBlock(schema, 'ServiceLevelTarget');
    expect(block).toContain('effectiveFrom');
    expect(block).toContain('effectiveUntil');
  });

  it('supports historical reconstructability via effective dating on output definitions', () => {
    const block = extractModelBlock(schema, 'ServiceOutputDefinition');
    expect(block).toContain('effectiveFrom');
    expect(block).toContain('effectiveUntil');
  });
});
