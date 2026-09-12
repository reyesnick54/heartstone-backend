import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  CASE_LEGAL_STATUSES,
  CASE_MODEL_NAMES,
  CASE_RELATIONSHIP_TYPES,
  CASE_STATUSES,
  FORBIDDEN_CASE_LEGAL_STATUS_VALUES,
} from './cases-schema.constants';

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

describe('Cases schema coherence (Phase 6B)', () => {
  const schema = readSchema();

  it('defines all canonical Phase 6B case models', () => {
    for (const modelName of CASE_MODEL_NAMES) {
      expect(schema).toContain(`model ${modelName}`);
    }
  });

  it('defines controlled case lifecycle statuses without decision-engine ownership leakage', () => {
    const block = extractEnumBlock(schema, 'CaseStatus');
    for (const status of CASE_STATUSES) {
      expect(block).toContain(status);
    }
  });

  it('defines legal status values without approval outcomes', () => {
    const block = extractEnumBlock(schema, 'CaseLegalStatus');
    for (const status of CASE_LEGAL_STATUSES) {
      expect(block).toContain(status);
    }

    for (const forbidden of FORBIDDEN_CASE_LEGAL_STATUS_VALUES) {
      expect(block).not.toContain(forbidden);
    }
  });

  it('keeps caseNumber immutable and unique on Case', () => {
    const block = extractModelBlock(schema, 'Case');
    expect(block).toMatch(/caseNumber\s+String\s+@unique/);
  });

  it('pins application and submission references on Case', () => {
    const block = extractModelBlock(schema, 'Case');
    expect(block).toMatch(/applicationId\s+String\s+@unique/);
    expect(block).toMatch(/applicationSubmissionId\s+String\s+@unique/);
    expect(block).toContain('governmentServiceVersionId');
    expect(block).toContain('responsibleInstitutionId');
    expect(block).toContain('responsibleDepartmentId');
  });

  it('records append-only status history with actor attribution', () => {
    const block = extractModelBlock(schema, 'CaseStatusHistory');
    expect(block).toContain('previousStatus');
    expect(block).toContain('newStatus');
    expect(block).toContain('previousLegalStatus');
    expect(block).toContain('newLegalStatus');
    expect(block).toContain('actorIdentityId');
    expect(block).toContain('officeholderId');
    expect(block).toContain('reason');
    expect(block).toContain('correlationId');
  });

  it('supports case relationship types without decision coupling', () => {
    const block = extractEnumBlock(schema, 'CaseRelationshipType');
    for (const relationshipType of CASE_RELATIONSHIP_TYPES) {
      expect(block).toContain(relationshipType);
    }
  });
});
