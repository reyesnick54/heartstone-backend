import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  EVIDENCE_QUALITY_EXPECTATIONS,
  SERVICE_MODEL_NAMES,
  SERVICE_REQUIREMENT_TYPES,
} from './services-schema.constants';

const SCHEMA_PATH = join(__dirname, '../../prisma/schema.prisma');

function readSchema(): string {
  return readFileSync(SCHEMA_PATH, 'utf-8');
}

function extractEnumBlock(schema: string, enumName: string): string {
  const match = new RegExp(`enum ${enumName}\\s*\\{([^}]*)\\}`, 's').exec(schema);
  return match?.[1] ?? '';
}

describe('Services schema coherence (Phase 5D)', () => {
  const schema = readSchema();

  it('defines all canonical service requirement types', () => {
    const block = extractEnumBlock(schema, 'ServiceRequirementType');
    for (const requirementType of SERVICE_REQUIREMENT_TYPES) {
      expect(block).toContain(requirementType);
    }
  });

  it('defines all canonical evidence quality expectations', () => {
    const block = extractEnumBlock(schema, 'EvidenceQualityExpectation');
    for (const expectation of EVIDENCE_QUALITY_EXPECTATIONS) {
      expect(block).toContain(expectation);
    }
  });

  it('defines all canonical service catalog models', () => {
    for (const modelName of SERVICE_MODEL_NAMES) {
      expect(schema).toMatch(new RegExp(`model ${modelName}\\s*\\{`));
    }
  });

  it('ties ServiceRequirement to GovernmentServiceVersion', () => {
    expect(schema).toMatch(/serviceVersionId\s+String/);
    expect(schema).toMatch(/serviceVersion\s+GovernmentServiceVersion/);
  });
});
